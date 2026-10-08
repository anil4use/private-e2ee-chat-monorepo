'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import {
  generateECDHKeyPair,
  exportPublicKeyHex,
  computeLinkHmac,
  deriveWrappingKey,
  wrapRoomKey,
  unwrapRoomKey,
  computeSafetyCode,
  getRoomKeyFromIDB,
  importRoomKeyRaw,
  hexToBuffer,
  saveRoomKeyToIDB
} from '@e2ee-chat/crypto';
import { Message, Participant, RoomStatus, SelfDestructTimer } from '@e2ee-chat/shared';
import { Navbar } from '@/components/Navbar';
import { SplitChatView } from '@/components/SplitChatView';
import { WaitingRoom } from '@/components/WaitingRoom';
import { HostApprovalModal } from '@/components/HostApprovalModal';
import { ShareLinkModal } from '@/components/ShareLinkModal';
import { SafetyCodeModal } from '@/components/SafetyCodeModal';
import { MediaLightboxModal } from '@/components/MediaLightboxModal';
import { PanicModal } from '@/components/PanicModal';
import { ExpiryBanner } from '@/components/ExpiryBanner';
import { sounds } from '@/lib/sound';
import confetti from 'canvas-confetti';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [slot, setSlot] = useState<'owner' | 'guest'>('guest');
  const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('waiting');
  const [timer, setTimer] = useState<SelfDestructTimer>('5m');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingSlot, setTypingSlot] = useState<'owner' | 'guest' | null>(null);

  // ECDH Keys & Fingerprints
  const ecdhKeyPairRef = useRef<CryptoKeyPair | null>(null);
  const ownPubKeyHexRef = useRef<string>('');
  const peerPubKeyHexRef = useRef<string>('');
  const [ownFingerprint, setOwnFingerprint] = useState<string>('');
  const [peerFingerprint, setPeerFingerprint] = useState<string>('');
  const [safetyCode, setSafetyCode] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Pending approval modal for Host
  const [pendingApproval, setPendingApproval] = useState<{
    guestSocketId: string;
    ecdhPublicKeyHex: string;
    fingerprint: string;
  } | null>(null);

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isPanicModalOpen, setIsPanicModalOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; name: string } | null>(null);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  // Main Socket & Crypto Initialization
  useEffect(() => {
    let mounted = true;
    const socket = getSocket();
    const linkSecret = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    const ownerToken = typeof window !== 'undefined' ? localStorage.getItem(`owner_token_${roomId}`) : null;

    async function init() {
      // 1. Generate local ECDH Key Pair
      const keyPair = await generateECDHKeyPair();
      ecdhKeyPairRef.current = keyPair;
      const pubKeyHex = await exportPublicKeyHex(keyPair.publicKey);
      ownPubKeyHexRef.current = pubKeyHex;

      const myFingerprint = pubKeyHex.substring(0, 12).toUpperCase();
      if (mounted) setOwnFingerprint(myFingerprint);

      socket.connect();

      if (ownerToken) {
        // --- I AM THE ROOM OWNER ---
        if (mounted) {
          setSlot('owner');
          setIsApproved(true);
        }

        // Retrieve AES Room Key from IndexedDB
        const rawKeyHex = await getRoomKeyFromIDB(roomId);
        if (rawKeyHex) {
          const importedKey = await importRoomKeyRaw(hexToBuffer(rawKeyHex));
          if (mounted) setRoomKey(importedKey);
        }

        socket.emit(
          'room:register-owner',
          { roomId, ownerToken, ecdhPublicKeyHex: pubKeyHex, fingerprint: myFingerprint },
          (res: any) => {
            if (res.success) {
              if (res.timer) setTimer(res.timer as SelfDestructTimer);
              if (res.messages) setMessages(res.messages);
            }
          }
        );
      } else {
        // --- I AM A GUEST ---
        if (mounted) setSlot('guest');

        const hmacSig = await computeLinkHmac(linkSecret || 'default_secret', pubKeyHex);

        socket.emit(
          'room:join-request',
          { roomId, ecdhPublicKeyHex: pubKeyHex, hmacSignature: hmacSig },
          (res: any) => {
            if (!res.success) {
              alert(res.message || 'Failed to join room');
            }
          }
        );
      }
    }

    init();

    // SOCKET LISTENERS

    // Host receives join request from guest
    socket.on('room:join-requested', (data: { guestSocketId: string; ecdhPublicKeyHex: string; fingerprint: string }) => {
      peerPubKeyHexRef.current = data.ecdhPublicKeyHex;
      setPeerFingerprint(data.fingerprint);
      // Only owner should trigger approval modal
      const isOwner = !!localStorage.getItem(`owner_token_${roomId}`);
      if (isOwner) {
        setPendingApproval(data);
      }
    });

    // Guest receives approval from host
    socket.on(
      'room:approved',
      async (data: { wrappedRoomKeyHex: string; ivHex: string; ownerEcdhPublicKeyHex: string; ownerFingerprint: string; timer?: SelfDestructTimer }) => {
        try {
          peerPubKeyHexRef.current = data.ownerEcdhPublicKeyHex;
          setPeerFingerprint(data.ownerFingerprint);
          if (data.timer) setTimer(data.timer);

          // Derive wrapping key & unwrap room key
          if (ecdhKeyPairRef.current) {
            const wrappingKey = await deriveWrappingKey(ecdhKeyPairRef.current.privateKey, data.ownerEcdhPublicKeyHex);
            const unwrappedKey = await unwrapRoomKey(data.wrappedRoomKeyHex, data.ivHex, wrappingKey);

            setRoomKey(unwrappedKey);
            setIsApproved(true);

            // Compute Safety Verification Code
            const code = await computeSafetyCode(ownPubKeyHexRef.current, data.ownerEcdhPublicKeyHex);
            setSafetyCode(code);

            // Trigger celebration confetti on guest entry!
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          }
        } catch (err) {
          console.error('Guest unwrapping room key failed:', err);
        }
      }
    );

    socket.on('room:rejected', (data: { reason: string }) => {
      alert(data.reason || 'Room owner rejected your request.');
    });

    socket.on('room:status-changed', (data: { status: RoomStatus; isLocked: boolean }) => {
      setRoomStatus(data.status);
    });

    socket.on('room:destroyed', () => {
      alert('Room owner has destroyed this session. All data has been wiped.');
      window.location.href = '/';
    });

    socket.on('presence:update', (data: { participants: Participant[] }) => {
      setParticipants(data.participants);
    });

    socket.on('typing:update', (data: { slot: 'owner' | 'guest'; isTyping: boolean }) => {
      setTypingSlot(data.isTyping ? data.slot : null);
    });

    // Message events
    socket.on('msg:new', (newMsg: Message) => {
      setMessages((prev) => [...prev, newMsg]);
      sounds.playReceive();
    });

    socket.on('msg:status-updated', (data: { messageId: string; status: any; readAt?: number; expiresAt?: number }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, status: data.status, readAt: data.readAt, expiresAt: data.expiresAt }
            : m
        )
      );
    });

    socket.on('msg:edited', (data: { messageId: string; newEncryptedData: any }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, encryptedData: data.newEncryptedData } : m))
      );
    });

    socket.on('msg:deleted', (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    socket.on('msg:reaction-updated', (data: { messageId: string; reactions: Record<string, string[]> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    });

    socket.on('msg:expired', (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    return () => {
      mounted = false;
      socket.off('room:join-requested');
      socket.off('room:approved');
      socket.off('room:rejected');
      socket.off('room:status-changed');
      socket.off('room:destroyed');
      socket.off('presence:update');
      socket.off('typing:update');
      socket.off('msg:new');
      socket.off('msg:status-updated');
      socket.off('msg:edited');
      socket.off('msg:deleted');
      socket.off('msg:reaction-updated');
      socket.off('msg:expired');
    };
  }, [roomId]);

  // Host approves guest request
  const handleHostApprove = async () => {
    if (!pendingApproval || !roomKey || !ecdhKeyPairRef.current) return;
    try {
      const socket = getSocket();
      const wrappingKey = await deriveWrappingKey(ecdhKeyPairRef.current.privateKey, pendingApproval.ecdhPublicKeyHex);
      const { wrappedRoomKeyHex, ivHex } = await wrapRoomKey(roomKey, wrappingKey);

      socket.emit('room:approve', {
        roomId,
        guestSocketId: pendingApproval.guestSocketId,
        wrappedRoomKeyHex,
        ivHex,
        ownerEcdhPublicKeyHex: ownPubKeyHexRef.current
      });

      // Compute Safety Code
      const code = await computeSafetyCode(ownPubKeyHexRef.current, pendingApproval.ecdhPublicKeyHex);
      setSafetyCode(code);
      setPendingApproval(null);

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Approve guest error:', err);
    }
  };

  const handleHostReject = () => {
    if (!pendingApproval) return;
    const socket = getSocket();
    socket.emit('room:reject', { roomId, guestSocketId: pendingApproval.guestSocketId });
    setPendingApproval(null);
  };

  // Chat message handlers
  const handleSendMessage = (encryptedData: any, replyToId?: string) => {
    const socket = getSocket();
    socket.emit('msg:send', { roomId, encryptedData, replyToId }, (res: any) => {
      if (!res.success) console.warn('Message send error:', res.message);
    });
  };

  const handleReadMessage = (messageId: string) => {
    const socket = getSocket();
    socket.emit('msg:read', { roomId, messageId });
  };

  const handleEditMessage = (messageId: string, newEncryptedData: any) => {
    const socket = getSocket();
    socket.emit('msg:edit', { roomId, messageId, newEncryptedData });
  };

  const handleDeleteMessage = (messageId: string) => {
    const socket = getSocket();
    socket.emit('msg:delete', { roomId, messageId });
  };

  const handleReactMessage = (messageId: string, emoji: string) => {
    const socket = getSocket();
    socket.emit('msg:react', { roomId, messageId, emoji });
  };

  const handleTypingStart = () => {
    getSocket().emit('typing:start', { roomId });
  };

  const handleTypingStop = () => {
    getSocket().emit('typing:stop', { roomId });
  };

  const handleLockRoom = () => {
    getSocket().emit('room:lock', { roomId });
  };

  const handleDestroyRoom = () => {
    if (confirm('Are you sure you want to destroy this room? All encrypted messages will be deleted permanently.')) {
      getSocket().emit('room:destroy', { roomId });
    }
  };

  const handlePanicWipe = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`owner_token_${roomId}`);
        const socket = getSocket();
        socket.disconnect();
      }
    } catch {
      // Ignore
    } finally {
      window.location.href = '/';
    }
  };

  if (!isApproved && slot === 'guest') {
    return <WaitingRoom guestFingerprint={ownFingerprint} shareUrl={shareUrl} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-mesh-gradient">
      <Navbar
        roomId={roomId}
        isOwner={slot === 'owner'}
        timer={timer}
        roomStatus={roomStatus}
        isVerified={isVerified}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenSafetyCode={() => setIsSafetyModalOpen(true)}
        onLockRoom={handleLockRoom}
        onDestroyRoom={handleDestroyRoom}
        onTriggerPanic={() => setIsPanicModalOpen(true)}
      />

      <ExpiryBanner timer={timer} />

      <main className="flex-1">
        <SplitChatView
          roomId={roomId}
          roomKey={roomKey}
          currentSlot={slot}
          participants={participants}
          messages={messages}
          typingSlot={typingSlot}
          onSendMessage={handleSendMessage}
          onReadMessage={handleReadMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onReactMessage={handleReactMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          onOpenMedia={(url, name) => setLightboxMedia({ url, name })}
        />
      </main>

      {/* Modals */}
      <HostApprovalModal
        isOpen={slot === 'owner' && !!pendingApproval}
        guestFingerprint={pendingApproval?.fingerprint || ''}
        onApprove={handleHostApprove}
        onReject={handleHostReject}
      />

      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
      />

      <SafetyCodeModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        safetyCode={safetyCode}
        hostFingerprint={slot === 'owner' ? ownFingerprint : peerFingerprint}
        guestFingerprint={slot === 'guest' ? ownFingerprint : peerFingerprint}
        isVerified={isVerified}
        onToggleVerify={() => setIsVerified(!isVerified)}
      />

      <MediaLightboxModal
        isOpen={!!lightboxMedia}
        onClose={() => setLightboxMedia(null)}
        imageUrl={lightboxMedia?.url || null}
        fileName={lightboxMedia?.name || ''}
      />

      <PanicModal
        isOpen={isPanicModalOpen}
        onClose={() => setIsPanicModalOpen(false)}
        onConfirmWipe={handlePanicWipe}
      />
    </div>
  );
}
