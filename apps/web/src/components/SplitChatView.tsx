'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Participant } from '@e2ee-chat/shared';
import { encryptMessageText, encryptFileBuffer } from '@e2ee-chat/crypto';
import { MessageBubble } from './MessageBubble';
import { Send, Paperclip, ShieldCheck, Lock, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplitChatViewProps {
  roomId: string;
  roomKey: CryptoKey | null;
  currentSlot: 'owner' | 'guest';
  participants: Participant[];
  messages: Message[];
  typingSlot: 'owner' | 'guest' | null;
  onSendMessage: (encryptedData: any, replyToId?: string) => void;
  onReadMessage: (messageId: string) => void;
  onEditMessage: (messageId: string, newEncryptedData: any) => void;
  onDeleteMessage: (messageId: string) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

export const SplitChatView: React.FC<SplitChatViewProps> = ({
  roomId,
  roomKey,
  currentSlot,
  participants,
  messages,
  typingSlot,
  onSendMessage,
  onReadMessage,
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
  onTypingStart,
  onTypingStop,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyToId, setReplyToId] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const peerSlot: 'owner' | 'guest' = currentSlot === 'owner' ? 'guest' : 'owner';
  const peerParticipant = participants.find((p) => p.slot === peerSlot);
  const peerLabel = peerSlot === 'owner' ? 'Host' : 'Guest';
  const replyToMessage = replyToId ? messages.find((m) => m.id === replyToId) : undefined;
  const peerTyping = typingSlot === peerSlot;
  const accentIsCyan = currentSlot === 'owner';

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((instant = false) => {
    bottomRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(false); }, [messages, peerTyping]);

  // Input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTypingStart();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => onTypingStop(), 2000);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !roomKey || isSending) return;
    setIsSending(true);
    try {
      const aad = `AAD:${currentSlot}:${roomId}:${Date.now()}`;
      const encryptedData = await encryptMessageText(text, roomKey, aad);
      onSendMessage(encryptedData, replyToId);
      setInputText('');
      setReplyToId(undefined);
      onTypingStop();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    } catch (err) {
      console.error('Encrypt failed:', err);
    } finally {
      setTimeout(() => setIsSending(false), 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') setReplyToId(undefined);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomKey) return;
    try {
      setIsUploading(true);
      const buffer = await file.arrayBuffer();
      const { encryptedBuffer, ivHex, rawFileKeyHex } = await encryptFileBuffer(buffer);
      const blob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
      const formData = new FormData();
      formData.append('file', blob, 'encrypted.bin');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.downloadUrl) {
        const fileKeyPayload = await encryptMessageText(rawFileKeyHex, roomKey, `FILEKEY:${file.name}`);
        const fileMetadata = {
          fileId: data.fileId,
          fileNameEncrypted: file.name,
          fileSize: file.size,
          mimeTypeEncrypted: file.type || 'application/octet-stream',
          fileKeyEncrypted: fileKeyPayload.ciphertext,
          fileKeyIv: fileKeyPayload.iv,
          fileKeyAad: fileKeyPayload.aad,
          ivHex,
          downloadUrl: data.downloadUrl,
        };
        const aad = `AAD:${currentSlot}:${roomId}:${Date.now()}`;
        const payload = await encryptMessageText(`Sent: ${file.name}`, roomKey, aad);
        payload.fileMetadata = fileMetadata;
        onSendMessage(payload, replyToId);
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-2xl mx-auto w-full">

      {/* ── Peer Header ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-slate-950/80 backdrop-blur-xl">
        <div className="relative">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
            peerSlot === 'owner'
              ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-700/20 border border-cyan-500/30 text-cyan-300'
              : 'bg-gradient-to-br from-violet-500/30 to-violet-700/20 border border-violet-500/30 text-violet-300'
          }`}>
            {peerLabel[0]}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
            peerParticipant?.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{peerLabel}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              peerParticipant?.isOnline
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-slate-700/50 text-slate-500'
            }`}>
              {peerParticipant?.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono truncate">
            {peerParticipant?.fingerprint ? `ID: ${peerParticipant.fingerprint}` : 'Waiting to connect...'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/8 border border-cyan-500/15">
          <ShieldCheck className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] text-cyan-500 font-semibold tracking-wide">E2EE</span>
        </div>
      </div>

      {/* ── Message Timeline ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-0.5"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full min-h-[50vh] flex flex-col items-center justify-center gap-4 select-none"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-white/8 flex items-center justify-center">
                  <Lock className="w-9 h-9 text-slate-700" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-300 mb-1">Zero-knowledge channel active</p>
                <p className="text-xs text-slate-600 max-w-[22ch] leading-relaxed">
                  Messages are end-to-end encrypted. Only you and your peer can read them.
                </p>
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                roomKey={roomKey}
                currentSlot={currentSlot}
                onRead={onReadMessage}
                onReply={(id) => { setReplyToId(id); inputRef.current?.focus(); }}
                onDelete={onDeleteMessage}
                onEdit={onEditMessage}
                onReact={onReactMessage}
              />
            ))
          )}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {peerTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="flex items-end gap-2 mt-2"
            >
              <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-bold bg-violet-500/20 border border-violet-500/25 text-violet-400">
                {peerLabel[0]}
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-white/8 px-4 py-2.5 rounded-2xl rounded-bl-md" style={{ boxShadow: '0 4px 16px -4px rgba(0,0,0,0.5)' }}>
                {[0, 150, 300].map((delay) => (
                  <motion.span
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-slate-400"
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: delay / 1000, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Reply preview bar ── */}
      <AnimatePresence>
        {replyToMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="flex-shrink-0 mx-4 mb-2 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/90 border-l-[3px] border-cyan-400 border border-white/8">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block mb-0.5">
                  Replying to {replyToMessage.senderSlot === currentSlot ? 'yourself' : peerLabel}
                </span>
                <span className="text-xs text-slate-400 font-mono truncate block">
                  msg #{replyToMessage.id.substring(0, 8)}
                </span>
              </div>
              <button
                onClick={() => setReplyToId(undefined)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors text-sm font-bold"
              >
                x
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Compose Bar ── */}
      <div className="flex-shrink-0 px-4 pb-4 pt-1">
        <motion.div
          className={`flex items-center gap-2 rounded-2xl px-3 py-2 border bg-slate-900/90 backdrop-blur-md transition-colors duration-200 ${
            accentIsCyan
              ? 'border-cyan-500/25 focus-within:border-cyan-500/55 focus-within:shadow-[0_0_20px_-4px_rgba(6,182,212,0.2)]'
              : 'border-violet-500/25 focus-within:border-violet-500/55 focus-within:shadow-[0_0_20px_-4px_rgba(139,92,246,0.2)]'
          }`}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

          {/* Attach */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !roomKey}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/6 rounded-xl transition-all active:scale-90 disabled:opacity-30"
            title="Attach file"
          >
            {isUploading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Paperclip className="w-4.5 h-4.5 text-cyan-400" /></motion.div>
              : <Paperclip className="w-4.5 h-4.5" />
            }
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={!roomKey}
            placeholder={roomKey ? 'Encrypt and send...' : 'Waiting for room key...'}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-slate-600 disabled:opacity-40"
          />

          {/* Send button with animation */}
          <motion.button
            onClick={handleSend}
            disabled={!inputText.trim() || !roomKey || isSending}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            animate={isSending ? { scale: [1, 0.88, 1.05, 1] } : {}}
            transition={{ duration: 0.35 }}
            className={`relative p-2.5 rounded-xl font-bold transition-all duration-200 overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed ${
              accentIsCyan
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_16px_-2px_rgba(6,182,212,0.5)]'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_16px_-2px_rgba(139,92,246,0.5)]'
            }`}
          >
            <AnimatePresence mode="wait">
              {isSending ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="flex items-center justify-center"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <motion.path
                      d="M3 8l3.5 3.5L13 4.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </svg>
                </motion.div>
              ) : (
                <motion.div key="send" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Send className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>

        {/* Encryption badge */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <ShieldCheck className="w-2.5 h-2.5 text-slate-600" />
          <span className="text-[10px] text-slate-600 tracking-wide">AES-256-GCM End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
};
