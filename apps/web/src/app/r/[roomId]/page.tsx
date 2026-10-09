'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { Toast } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { sounds } from '@/lib/sound';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldOff, Wifi, WifiOff } from 'lucide-react';

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
  const [isSocketConnected, setIsSocketConnected] = useState(true);
  const [isDestroyed, setIsDestroyed] = useState(false);

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
  const [isDestroyConfirmOpen, setIsDestroyConfirmOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; name: string } | null>(null);
  const [shareUrl, setShareUrl] = useState('');

  const { toasts, addToast, dismissToast } = useToast();

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
            } else {
              addToast('error', 'Room Access Denied', res.message || 'Could not register as room owner.');
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
              addToast('error', 'Cannot Join Room', res.message || 'Failed to join room');
            }
          }
        );
      }
    }

    init();

    // SOCKET LISTENERS

    // Connection state
    socket.on('connect', () => {
      if (mounted) setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      if (mounted) setIsSocketConnected(false);
    });

    // Host receives join request from guest
    socket.on('room:join-requested', (data: { guestSocketId: string; ecdhPublicKeyHex: string; fingerprint: string }) => {
      peerPubKeyHexRef.current = data.ecdhPublicKeyHex;
      setPeerFingerprint(data.fingerprint);
      // Only owner should trigger approval modal
      const isOwner = !!localStorage.getItem(`owner_token_${roomId}`);
      if (isOwner) {
        setPendingApproval(data);
        sounds.playReceive();
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
            addToast('success', 'Secure Channel Open', 'You are now connected with end-to-end encryption.');
          }
        } catch (err) {
          console.error('Guest unwrapping room key failed:', err);
          addToast('error', 'Key Exchange Failed', 'Could not establish encrypted channel. Please refresh and try again.');
        }
      }
    );

    socket.on('room:rejected', (data: { reason: string }) => {
      addToast('warning', 'Access Denied', data.reason || 'Room owner rejected your join request.');
    });

    socket.on('room:status-changed', (data: { status: RoomStatus; isLocked: boolean }) => {
      setRoomStatus(data.status);
    });

    socket.on('room:destroyed', () => {
      if (mounted) setIsDestroyed(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 4000);
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
      socket.off('connect');
      socket.off('disconnect');
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
        ownerEcdhPublicKeyHex: ownPubKeyHexRef.current,
        ownerFingerprint: ownFingerprint
      });

      // Compute Safety Code
      const code = await computeSafetyCode(ownPubKeyHexRef.current, pendingApproval.ecdhPublicKeyHex);
      setSafetyCode(code);
      setPeerFingerprint(pendingApproval.fingerprint);
      setPendingApproval(null);

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      addToast('success', 'Guest Admitted', 'Secure session started with your guest.');
    } catch (err) {
      console.error('Approve guest error:', err);
      addToast('error', 'Approval Failed', 'Could not complete key exchange with guest.');
    }
  };

  const handleHostReject = () => {
    if (!pendingApproval) return;
    const socket = getSocket();
    socket.emit('room:reject', { roomId, guestSocketId: pendingApproval.guestSocketId });
    setPendingApproval(null);
    addToast('info', 'Request Rejected', 'Guest join request was denied.');
  };

  // Chat message handlers
  const handleSendMessage = (encryptedData: any, replyToId?: string) => {
    const socket = getSocket();
    socket.emit('msg:send', { roomId, encryptedData, replyToId }, (res: any) => {
      if (!res.success) {
        console.warn('Message send error:', res.message);
        addToast('error', 'Send Failed', res.message || 'Message could not be delivered.');
      }
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
    addToast('info', 'Room Locked', 'No new guests can join this session.');
  };

  const handleDestroyRoom = () => {
    setIsDestroyConfirmOpen(true);
  };

  const handleConfirmDestroy = () => {
    setIsDestroyConfirmOpen(false);
    getSocket().emit('room:destroy', { roomId });
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

  // Room destroyed overlay
  if (isDestroyed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mesh-gradient px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-6">
            <ShieldOff className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Session Destroyed</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            The room owner has terminated this session. All encrypted messages have been permanently wiped.
          </p>
          <p className="text-slate-600 text-xs mt-4">Redirecting to home in a moment...</p>
          <div className="flex justify-center gap-1 mt-4">
            {[0,1,2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-red-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isApproved && slot === 'guest') {
    return (
      <>
        <WaitingRoom guestFingerprint={ownFingerprint} shareUrl={shareUrl} />
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </>
    );
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

      {/* Disconnection banner */}
      <AnimatePresence>
        {!isSocketConnected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              Reconnecting to server...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Destroy Room Confirmation Modal */}
      <AnimatePresence>
        {isDestroyConfirmOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
              onClick={() => setIsDestroyConfirmOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="w-full sm:max-w-md glass-panel rounded-t-3xl sm:rounded-3xl border border-red-500/20 p-6 pb-8 sm:pb-6 shadow-2xl"
              >
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5 sm:hidden" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                    <ShieldOff className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Destroy Room?</h3>
                    <p className="text-xs text-slate-400">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                  All encrypted messages and participant data will be <span className="text-red-400 font-semibold">permanently deleted</span> from the server. Both parties will be disconnected immediately.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsDestroyConfirmOpen(false)}
                    className="py-3.5 rounded-2xl bg-white/8 hover:bg-white/12 text-slate-300 font-bold text-sm border border-white/10 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDestroy}
                    className="py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition-all active:scale-95"
                    style={{ boxShadow: '0 0 20px -4px rgba(239,68,68,0.5)' }}
                  >
                    Destroy Room
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
