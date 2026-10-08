'use client';

import React from 'react';
import { ShieldCheck, Clock, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface WaitingRoomProps {
  guestFingerprint: string;
  shareUrl: string;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ guestFingerprint, shareUrl }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-mesh-gradient">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
        {/* Animated lock icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-3xl bg-cyan-500/20 blur-xl"
            />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 border border-white/10 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-cyan-400" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">Waiting for Host</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          Your join request has been sent. The host will approve your entry shortly.
        </p>

        {/* Animated dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-cyan-500"
              animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Fingerprint card */}
        <div className="glass-panel rounded-2xl border border-white/10 p-4 mb-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Your Key Fingerprint</span>
          </div>
          <code className="text-sm font-mono text-cyan-300 break-all">{guestFingerprint || 'Generating...'}</code>
          <p className="text-[10px] text-slate-600 mt-2">Share this with the host to verify your identity out-of-band.</p>
        </div>

        {/* Copy invite link */}
        {shareUrl && (
          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-slate-300 border border-white/8 hover:bg-white/8'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </button>
        )}
      </motion.div>
    </div>
  );
};
