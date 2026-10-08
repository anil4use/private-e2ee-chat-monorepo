'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message } from '@e2ee-chat/shared';
import { decryptMessageText, decryptFileBuffer } from '@e2ee-chat/crypto';
import { Check, CheckCheck, Clock, Download, FileText, Reply, Smile, Trash2, Edit2, ShieldCheck, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageBubbleProps {
  message: Message;
  roomKey: CryptoKey | null;
  currentSlot: 'owner' | 'guest';
  onRead: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, currentText: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onOpenMedia?: (url: string, name: string) => void;
}

const quickEmojis = ['❤️', '👍', '🔥', '😮', '😂', '🎉'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  roomKey,
  currentSlot,
  onRead,
  onReply,
  onDelete,
  onEdit,
  onReact,
  onOpenMedia
}) => {
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(true);
  const [decryptedFileUrl, setDecryptedFileUrl] = useState<string | null>(null);
  const [isDecryptionError, setIsDecryptionError] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);

  const isSelf = message.senderSlot === currentSlot;

  // Close reaction picker on outside click
  useEffect(() => {
    if (!showReactions) return;
    const handler = (e: MouseEvent) => {
      if (reactionRef.current && !reactionRef.current.contains(e.target as Node)) {
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showReactions]);

  // Decrypt message
  useEffect(() => {
    let mounted = true;
    setIsDecrypting(true);

    async function decrypt() {
      if (!roomKey) return;
      try {
        const text = await decryptMessageText(message.encryptedData, roomKey);
        if (mounted) {
          setDecryptedText(text);
          setIsDecryptionError(false);
          setIsDecrypting(false);
        }

        if (message.encryptedData.fileMetadata && !decryptedFileUrl) {
          const meta = message.encryptedData.fileMetadata;
          const res = await fetch(meta.downloadUrl);
          const encryptedBuffer = await res.arrayBuffer();
          const rawFileKey = await decryptMessageText(
            { ciphertext: meta.fileKeyEncrypted, iv: meta.fileKeyIv, aad: meta.fileKeyAad },
            roomKey
          );
          const decryptedBuffer = await decryptFileBuffer(encryptedBuffer, meta.ivHex, rawFileKey);
          const blob = new Blob([decryptedBuffer]);
          const url = URL.createObjectURL(blob);
          if (mounted) setDecryptedFileUrl(url);
        }
      } catch {
        if (mounted) {
          setDecryptedText('Decryption failed');
          setIsDecryptionError(true);
          setIsDecrypting(false);
        }
      }
    }

    decrypt();
    return () => { mounted = false; };
  }, [message, roomKey]);

  // Intersection observer for read receipts
  useEffect(() => {
    if (isSelf || message.status === 'read' || !bubbleRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onRead(message.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(bubbleRef.current);
    return () => observer.disconnect();
  }, [isSelf, message.status, message.id, onRead]);

  // Self-destruct countdown
  useEffect(() => {
    if (!message.expiresAt) return;
    const update = () => {
      setTimeLeftSeconds(Math.max(0, Math.ceil((message.expiresAt! - Date.now()) / 1000)));
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [message.expiresAt]);

  const timeStr = new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      ref={bubbleRef}
      layout
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88, y: -8, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      className={`group relative flex flex-col my-1 max-w-[78%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
    >
      {/* Sender label */}
      <span className="text-[10px] text-slate-500 font-mono mb-1 px-1 tracking-wide uppercase select-none">
        {isSelf ? 'You' : (message.senderSlot === 'owner' ? 'Host' : 'Guest')}
      </span>

      {/* Bubble */}
      <div
        className={`relative px-4 py-2.5 shadow-xl transition-all duration-200 ${
          isSelf
            ? 'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white rounded-2xl rounded-br-md'
            : 'bg-slate-800/90 border border-white/8 text-slate-100 rounded-2xl rounded-bl-md'
        }`}
        style={isSelf
          ? { boxShadow: '0 4px 24px -4px rgba(6,182,212,0.35), 0 1px 4px rgba(0,0,0,0.4)' }
          : { boxShadow: '0 4px 16px -4px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)' }
        }
      >
        {/* Reply Quote */}
        {message.replyToId && (
          <div className={`mb-2.5 px-2.5 py-1.5 rounded-lg text-xs italic opacity-75 border-l-2 ${
            isSelf ? 'bg-black/20 border-white/40 text-white/80' : 'bg-black/20 border-cyan-400/60 text-slate-300'
          }`}>
            Replied to message #{message.replyToId.substring(0, 8)}
          </div>
        )}

        {/* Decrypting shimmer / text */}
        {isDecrypting ? (
          <div className="flex items-center gap-2 py-0.5">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:100ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:200ms]" />
            </div>
            <span className="text-xs opacity-50 italic">decrypting...</span>
          </div>
        ) : (
          <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isDecryptionError ? 'text-red-300 italic opacity-80' : ''
          }`}>
            {isDecryptionError ? '⚠️ ' + decryptedText : decryptedText}
          </p>
        )}

        {/* File attachment */}
        {message.encryptedData.fileMetadata && (
          <div className={`mt-2.5 p-2.5 rounded-xl border flex items-center gap-3 ${
            isSelf ? 'bg-black/20 border-white/15' : 'bg-black/30 border-white/10'
          }`}>
            {decryptedFileUrl ? (
              decryptedFileUrl && message.encryptedData.fileMetadata.mimeTypeEncrypted.startsWith('image/') ? (
                <img
                  src={decryptedFileUrl}
                  alt="attachment"
                  onClick={() => onOpenMedia && onOpenMedia(decryptedFileUrl, message.encryptedData.fileMetadata?.fileNameEncrypted || 'Image')}
                  className="max-h-56 w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${isSelf ? 'bg-white/20' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {message.encryptedData.fileMetadata.fileNameEncrypted}
                    </div>
                    <div className="text-[10px] opacity-60">
                      {(message.encryptedData.fileMetadata.fileSize / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <a href={decryptedFileUrl} download className={`p-1.5 rounded-lg transition-colors ${isSelf ? 'bg-white/20 hover:bg-white/30' : 'bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400'}`}>
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2 text-xs opacity-60">
                <Lock className="w-3.5 h-3.5 animate-pulse" />
                Decrypting file...
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className={`mt-1.5 flex items-center gap-1.5 ${isSelf ? 'justify-end' : 'justify-start'}`}>
          {timeLeftSeconds !== null && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex items-center gap-1 text-[10px] text-amber-300 font-semibold"
            >
              <Clock className="w-3 h-3" />
              {timeLeftSeconds}s
            </motion.div>
          )}
          <span className={`text-[10px] ${isSelf ? 'text-white/50' : 'text-slate-500'}`}>{timeStr}</span>
          {isSelf && (
            <motion.span
              key={message.status}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-white/40" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white/30" />
              )}
            </motion.span>
          )}
        </div>

        {/* Reactions */}
        <AnimatePresence>
          {Object.keys(message.reactions || {}).length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mt-2 flex flex-wrap gap-1"
            >
              {Object.entries(message.reactions).map(([emoji, slots]) => (
                <button
                  key={emoji}
                  onClick={() => onReact && onReact(message.id, emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-all active:scale-90 ${
                    slots.includes(currentSlot)
                      ? 'bg-cyan-500/30 border-cyan-400/50 text-white font-semibold'
                      : 'bg-white/8 border-white/12 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] opacity-70">{slots.length}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hover action toolbar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        whileHover={{ opacity: 1, scale: 1 }}
        className={`absolute -top-3 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center gap-0.5 bg-slate-900 border border-white/12 px-1.5 py-1 rounded-xl shadow-xl z-20 ${
          isSelf ? 'right-0' : 'left-0'
        }`}
      >
        {/* Emoji reaction button */}
        <div ref={reactionRef} className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/8 rounded-lg transition-colors"
            title="React"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`absolute bottom-full mb-2 flex items-center gap-1 p-1.5 bg-slate-900 border border-white/12 rounded-2xl shadow-2xl z-40 ${
                  isSelf ? 'right-0' : 'left-0'
                }`}
              >
                {quickEmojis.map((emoji, i) => (
                  <motion.button
                    key={emoji}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ scale: 1.35 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { onReact && onReact(message.id, emoji); setShowReactions(false); }}
                    className="text-lg p-1 leading-none"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {onReply && (
          <button
            onClick={() => onReply(message.id)}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/8 rounded-lg transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        )}
        {isSelf && onEdit && (
          <button
            onClick={() => onEdit(message.id, decryptedText)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/8 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
        {isSelf && onDelete && (
          <button
            onClick={() => onDelete(message.id)}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};
