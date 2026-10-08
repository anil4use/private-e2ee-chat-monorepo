import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import {
  TIMER_SECONDS_MAP,
  UNUSED_ROOM_EXPIRY_MS,
  CreateRoomSchema,
  JoinRequestSchema,
  SendMessageSchema,
  EditMessageSchema,
  ReactMessageSchema,
  SelfDestructTimer,
  MessageStatus
} from '@e2ee-chat/shared';

const PORT = process.env.PORT || 4000;
const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for encrypted file blobs
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueId}.bin`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

app.use(cors({ origin: '*' }));
app.use(express.json());

// REST Endpoint: Create Room
app.post('/api/rooms', async (req, res) => {
  try {
    const parseRes = CreateRoomSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({ error: 'Invalid room creation parameters' });
    }
    const { timer } = parseRes.data;

    // Generate 128-bit random base64url Room ID
    const roomId = crypto.randomBytes(16).toString('base64url');
    // Generate 256-bit random owner token
    const ownerToken = crypto.randomBytes(32).toString('hex');
    const ownerTokenHash = crypto.createHash('sha256').update(ownerToken).digest('hex');

    await prisma.room.create({
      data: {
        id: roomId,
        ownerTokenHash,
        timer,
        status: 'waiting'
      }
    });

    return res.json({ roomId, ownerToken });
  } catch (err) {
    console.error('Create room error:', err);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

// REST Endpoint: Encrypted File Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileId = req.file.filename;
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const downloadUrl = `${baseUrl}/api/files/${fileId}`;
  return res.json({ fileId, downloadUrl });
});

// REST Endpoint: Download Encrypted File Blob
app.get('/api/files/:fileId', (req, res) => {
  const filePath = path.join(uploadDir, req.params.fileId);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  return res.sendFile(filePath);
});

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory socket mapping & rate limiting
interface ActiveSocket {
  socketId: string;
  roomId: string;
  slot: 'owner' | 'guest';
  fingerprint?: string;
  ecdhPublicKeyHex?: string;
}

const activeSockets = new Map<string, ActiveSocket>();
const pendingRequests = new Map<string, { socketId: string; roomId: string; ecdhPublicKeyHex: string; fingerprint: string }>();

// Simple rate limiter per socket
const messageRates = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const rate = messageRates.get(socketId) || { count: 0, resetAt: now + 10000 };
  if (now > rate.resetAt) {
    rate.count = 0;
    rate.resetAt = now + 10000;
  }
  rate.count += 1;
  messageRates.set(socketId, rate);
  return rate.count <= 20; // 20 events per 10s
}

io.on('connection', (socket: Socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Reconnection or initial join check
  socket.on('room:join-request', async (data, cb) => {
    try {
      const parseRes = JoinRequestSchema.safeParse(data);
      if (!parseRes.success) {
        return cb({ success: false, message: 'Invalid join request payload' });
      }

      const { roomId, ecdhPublicKeyHex, hmacSignature } = parseRes.data;
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { participants: true }
      });

      if (!room || room.status === 'destroyed') {
        return cb({ success: false, message: 'Room not found or expired' });
      }

      if (room.isLocked || room.participants.length >= 2) {
        return cb({ success: false, message: 'Room is locked or full (Max 2 participants)' });
      }

      // Compute guest public key fingerprint (first 12 chars of SHA256)
      const fingerprint = crypto.createHash('sha256').update(ecdhPublicKeyHex).digest('hex').substring(0, 12).toUpperCase();

      // Store pending request
      pendingRequests.set(socket.id, {
        socketId: socket.id,
        roomId,
        ecdhPublicKeyHex,
        fingerprint
      });

      // Join socket room for this roomId
      socket.join(roomId);

      // Notify owner in this room if owner is connected
      let ownerNotified = false;
      for (const [sId, active] of activeSockets.entries()) {
        if (active.roomId === roomId && active.slot === 'owner') {
          io.to(sId).emit('room:join-requested', {
            guestSocketId: socket.id,
            ecdhPublicKeyHex,
            fingerprint
          });
          ownerNotified = true;
        }
      }

      // Fallback: if owner activeSockets entry not mapped yet, send to room excluding sender
      if (!ownerNotified) {
        socket.to(roomId).emit('room:join-requested', {
          guestSocketId: socket.id,
          ecdhPublicKeyHex,
          fingerprint
        });
      }

      return cb({ success: true, message: 'Waiting for room owner approval...' });
    } catch (err) {
      console.error('Join request error:', err);
      return cb({ success: false, message: 'Server error processing join request' });
    }
  });

  // Owner connects & registers as Owner
  socket.on('room:register-owner', async (data: { roomId: string; ownerToken: string; ecdhPublicKeyHex: string; fingerprint: string }, cb) => {
    try {
      const { roomId, ownerToken, ecdhPublicKeyHex, fingerprint } = data;
      const ownerTokenHash = crypto.createHash('sha256').update(ownerToken).digest('hex');

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room || room.ownerTokenHash !== ownerTokenHash) {
        return cb({ success: false, message: 'Unauthorized owner token' });
      }

      socket.join(roomId);

      activeSockets.set(socket.id, {
        socketId: socket.id,
        roomId,
        slot: 'owner',
        fingerprint,
        ecdhPublicKeyHex
      });

      // Save/Update owner participant in DB
      await prisma.participant.upsert({
        where: { id: `${roomId}-owner` },
        update: { socketId: socket.id, ecdhPublicKeyHex, fingerprint },
        create: {
          id: `${roomId}-owner`,
          roomId,
          socketId: socket.id,
          slot: 'owner',
          ecdhPublicKeyHex,
          fingerprint
        }
      });

      // Check if there are pending join requests for this room
      for (const [pendingSocketId, req] of pendingRequests.entries()) {
        if (req.roomId === roomId) {
          socket.emit('room:join-requested', {
            guestSocketId: req.socketId,
            ecdhPublicKeyHex: req.ecdhPublicKeyHex,
            fingerprint: req.fingerprint
          });
        }
      }

      // Fetch existing messages for room
      const messages = await prisma.message.findMany({
        where: { roomId },
        orderBy: { sentAt: 'asc' }
      });

      cb({
        success: true,
        timer: room.timer,
        messages: messages.map((m: any) => ({
          id: m.id,
          roomId: m.roomId,
          senderSlot: m.senderSlot as 'owner' | 'guest',
          encryptedData: {
            ciphertext: m.ciphertext,
            iv: m.iv,
            aad: m.aad,
            fileMetadata: m.fileMetadata ? JSON.parse(m.fileMetadata) : undefined
          },
          sentAt: m.sentAt.getTime(),
          readAt: m.readAt ? m.readAt.getTime() : undefined,
          expiresAt: m.expiresAt ? m.expiresAt.getTime() : undefined,
          ttlSeconds: m.ttlSeconds ?? undefined,
          status: m.status as MessageStatus,
          replyToId: m.replyToId ?? undefined,
          reactions: JSON.parse(m.reactionsJson)
        }))
      });
    } catch (err) {
      console.error('Owner register error:', err);
      cb({ success: false, message: 'Failed to register owner' });
    }
  });

  // Owner approves guest
  socket.on('room:approve', async (data) => {
    try {
      const { roomId, guestSocketId, wrappedRoomKeyHex, ivHex, ownerEcdhPublicKeyHex } = data;
      const active = activeSockets.get(socket.id);
      if (!active || active.roomId !== roomId || active.slot !== 'owner') {
        return;
      }

      const pending = pendingRequests.get(guestSocketId);
      if (!pending || pending.roomId !== roomId) return;

      const guestToken = crypto.randomBytes(32).toString('hex');

      // Save guest in DB
      await prisma.participant.upsert({
        where: { id: `${roomId}-guest` },
        update: {
          socketId: guestSocketId,
          token: guestToken,
          ecdhPublicKeyHex: pending.ecdhPublicKeyHex,
          fingerprint: pending.fingerprint
        },
        create: {
          id: `${roomId}-guest`,
          roomId,
          socketId: guestSocketId,
          slot: 'guest',
          token: guestToken,
          ecdhPublicKeyHex: pending.ecdhPublicKeyHex,
          fingerprint: pending.fingerprint
        }
      });

      // Update room status and retrieve timer for notifying the guest
      const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: { status: 'active', isLocked: true }
      });

      activeSockets.set(guestSocketId, {
        socketId: guestSocketId,
        roomId,
        slot: 'guest',
        fingerprint: pending.fingerprint,
        ecdhPublicKeyHex: pending.ecdhPublicKeyHex
      });

      pendingRequests.delete(guestSocketId);

      // Notify guest socket with wrapped key, owner details & room timer
      io.to(guestSocketId).emit('room:approved', {
        wrappedRoomKeyHex,
        ivHex,
        ownerEcdhPublicKeyHex,
        ownerFingerprint: active.fingerprint || '',
        timer: updatedRoom.timer as SelfDestructTimer
      });

      // Notify room of status change & presence
      io.to(roomId).emit('room:status-changed', { status: 'active', isLocked: true });

      sendPresenceUpdate(roomId);
    } catch (err) {
      console.error('Approve error:', err);
    }
  });

  // Owner rejects guest
  socket.on('room:reject', async (data) => {
    const { roomId, guestSocketId } = data;
    const active = activeSockets.get(socket.id);
    if (!active || active.roomId !== roomId || active.slot !== 'owner') return;

    pendingRequests.delete(guestSocketId);
    io.to(guestSocketId).emit('room:rejected', { reason: 'Host rejected your join request' });
  });

  // Owner locks room
  socket.on('room:lock', async (data) => {
    const { roomId } = data;
    const active = activeSockets.get(socket.id);
    if (!active || active.roomId !== roomId || active.slot !== 'owner') return;

    await prisma.room.update({ where: { id: roomId }, data: { isLocked: true } });
    io.to(roomId).emit('room:status-changed', { status: 'locked', isLocked: true });
  });

  // Owner destroys room (Immediate wipe)
  socket.on('room:destroy', async (data) => {
    const { roomId } = data;
    const active = activeSockets.get(socket.id);
    if (!active || active.roomId !== roomId || active.slot !== 'owner') return;

    await prisma.room.delete({ where: { id: roomId } });
    io.to(roomId).emit('room:destroyed');
    io.in(roomId).socketsLeave(roomId);
  });

  // Send Message
  socket.on('msg:send', async (data, cb) => {
    try {
      if (!checkRateLimit(socket.id)) {
        return cb({ success: false, message: 'Rate limit exceeded' });
      }

      const parseRes = SendMessageSchema.safeParse(data);
      if (!parseRes.success) {
        return cb({ success: false, message: 'Invalid message payload' });
      }

      const { roomId, encryptedData, replyToId, ttlSeconds } = parseRes.data;
      const active = activeSockets.get(socket.id);
      if (!active || active.roomId !== roomId) {
        return cb({ success: false, message: 'Unauthorized socket for room' });
      }

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) return cb({ success: false, message: 'Room not found' });

      // Determine TTL seconds from room settings if not explicitly passed
      const roomTtl = TIMER_SECONDS_MAP[room.timer as SelfDestructTimer] ?? undefined;
      const effectiveTtl = ttlSeconds ?? roomTtl;

      const messageId = crypto.randomUUID();
      const message = await prisma.message.create({
        data: {
          id: messageId,
          roomId,
          senderSlot: active.slot,
          ciphertext: encryptedData.ciphertext,
          iv: encryptedData.iv,
          aad: encryptedData.aad,
          fileMetadata: encryptedData.fileMetadata ? JSON.stringify(encryptedData.fileMetadata) : null,
          ttlSeconds: effectiveTtl ?? null,
          replyToId,
          status: 'sent'
        }
      });

      const messagePayload = {
        id: message.id,
        roomId: message.roomId,
        senderSlot: message.senderSlot as 'owner' | 'guest',
        encryptedData: {
          ciphertext: message.ciphertext,
          iv: message.iv,
          aad: message.aad,
          fileMetadata: message.fileMetadata ? JSON.parse(message.fileMetadata) : undefined
        },
        sentAt: message.sentAt.getTime(),
        ttlSeconds: message.ttlSeconds ?? undefined,
        status: message.status as any,
        replyToId: message.replyToId ?? undefined,
        reactions: {}
      };

      // Broadcast new message to room
      io.to(roomId).emit('msg:new', messagePayload);

      return cb({ success: true, messageId: message.id });
    } catch (err) {
      console.error('Send message error:', err);
      return cb({ success: false, message: 'Server failed to send message' });
    }
  });

  // Delivered Ack
  socket.on('msg:delivered', async (data) => {
    const { roomId, messageId } = data;
    const active = activeSockets.get(socket.id);
    if (!active || active.roomId !== roomId) return;

    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (msg && msg.status === 'sent') {
      await prisma.message.update({ where: { id: messageId }, data: { status: 'delivered' } });
      io.to(roomId).emit('msg:status-updated', { messageId, status: 'delivered' });
    }
  });

  // Read Ack (Triggers self-destruct countdown timer!)
  socket.on('msg:read', async (data) => {
    const { roomId, messageId } = data;
    const active = activeSockets.get(socket.id);
    if (!active || active.roomId !== roomId) return;

    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (msg && msg.status !== 'read') {
      const readAt = new Date();
      let expiresAt: Date | undefined = undefined;

      if (msg.ttlSeconds && msg.ttlSeconds > 0) {
        expiresAt = new Date(readAt.getTime() + msg.ttlSeconds * 1000);
      }

      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'read',
          readAt,
          expiresAt
        }
      });

      io.to(roomId).emit('msg:status-updated', {
        messageId,
        status: 'read',
        readAt: readAt.getTime(),
        expiresAt: expiresAt ? expiresAt.getTime() : undefined
      });
    }
  });

  // Edit Message
  socket.on('msg:edit', async (data) => {
    const parseRes = EditMessageSchema.safeParse(data);
    if (!parseRes.success) return;

    const { roomId, messageId, newEncryptedData } = parseRes.data;
    const active = activeSockets.get(socket.id);
    if (!active || active.roomId !== roomId) return;

    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (msg && msg.senderSlot === active.slot) {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          ciphertext: newEncryptedData.ciphertext,
          iv: newEncryptedData.iv,
          aad: newEncryptedData.aad
        }
      });

      io.to(roomId).emit('msg:edited', { messageId, newEncryptedData });
    }
  });

  // Delete Message
  socket.on('msg:delete', async (data: { roomId: string; messageId: string }) => {
    const { roomId, messageId } = data;
    const active = activeSockets.get(socket.id);
    if (!active || active.roomId !== roomId) return;

    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (msg && msg.senderSlot === active.slot) {
      await prisma.message.delete({ where: { id: messageId } });
      io.to(roomId).emit('msg:deleted', { messageId });
    }
  });

  // React to Message
  socket.on('msg:react', async (data) => {
    const parseRes = ReactMessageSchema.safeParse(data);
    if (!parseRes.success) return;

    const { roomId, messageId, emoji } = parseRes.data;
    const active = activeSockets.get(socket.id);
    if (!active || active.roomId !== roomId) return;

    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (msg) {
      const reactions: Record<string, string[]> = JSON.parse(msg.reactionsJson || '{}');
      const list = reactions[emoji] || [];

      if (list.includes(active.slot)) {
        // Remove reaction
        reactions[emoji] = list.filter((s) => s !== active.slot);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        // Add reaction
        reactions[emoji] = [...list, active.slot];
      }

      await prisma.message.update({
        where: { id: messageId },
        data: { reactionsJson: JSON.stringify(reactions) }
      });

      io.to(roomId).emit('msg:reaction-updated', { messageId, reactions });
    }
  });

  // Typing signals
  socket.on('typing:start', (data: { roomId: string }) => {
    const active = activeSockets.get(socket.id);
    if (active && active.roomId === data.roomId) {
      socket.to(data.roomId).emit('typing:update', { slot: active.slot, isTyping: true });
    }
  });

  socket.on('typing:stop', (data: { roomId: string }) => {
    const active = activeSockets.get(socket.id);
    if (active && active.roomId === data.roomId) {
      socket.to(data.roomId).emit('typing:update', { slot: active.slot, isTyping: false });
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    const active = activeSockets.get(socket.id);
    if (active) {
      activeSockets.delete(socket.id);
      sendPresenceUpdate(active.roomId);
    }
    pendingRequests.delete(socket.id);
  });
});

async function sendPresenceUpdate(roomId: string) {
  const participantsInDb = await prisma.participant.findMany({ where: { roomId } });
  const activeSocketsInRoom = Array.from(activeSockets.values()).filter((s) => s.roomId === roomId);

  const participantsList = participantsInDb.map((p: any) => {
    const isOnline = activeSocketsInRoom.some((s: any) => s.slot === p.slot);
    return {
      id: p.id,
      role: p.slot === 'owner' ? ('owner' as const) : ('guest' as const),
      slot: p.slot as 'owner' | 'guest',
      joinedAt: p.joinedAt.getTime(),
      ecdhPublicKeyHex: p.ecdhPublicKeyHex,
      isOnline,
      fingerprint: p.fingerprint
    };
  });

  io.to(roomId).emit('presence:update', { participants: participantsList });
}

// Background self-destruct message sweeper (runs every 1000ms)
setInterval(async () => {
  try {
    const now = new Date();
    const expiredMessages = await prisma.message.findMany({
      where: {
        expiresAt: { lte: now }
      }
    });

    for (const msg of expiredMessages) {
      // Delete message from database
      await prisma.message.delete({ where: { id: msg.id } });
      // Broadcast expired event to room sockets
      io.to(msg.roomId).emit('msg:expired', { messageId: msg.id });
    }

    // Clean up empty rooms older than UNUSED_ROOM_EXPIRY_MS
    const cutoff = new Date(Date.now() - UNUSED_ROOM_EXPIRY_MS);
    const staleRooms = await prisma.room.findMany({
      where: {
        createdAt: { lte: cutoff },
        participants: { none: {} }
      }
    });

    for (const room of staleRooms) {
      await prisma.room.delete({ where: { id: room.id } });
    }
  } catch (err: any) {
    if (err?.code !== 'P2021') {
      console.error('Sweeper error:', err);
    }
  }
}, 1000);

server.listen(PORT, () => {
  console.log(`[E2EE Realtime Socket.IO Server] Running on http://localhost:${PORT}`);
});
