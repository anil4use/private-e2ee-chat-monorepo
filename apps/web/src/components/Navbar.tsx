'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, Share2, KeyRound, LockKeyhole, Trash2, Clock, MoreVertical, X } from 'lucide-react';
import { SelfDestructTimer, RoomStatus } from '@e2ee-chat/shared';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  roomId: string;
  isOwner: boolean;
  timer: SelfDestructTimer;
  roomStatus: RoomStatus;
  isVerified: boolean;
  onOpenShare: () => void;
  onOpenSafetyCode: () => void;
  onLockRoom?: () => void;
  onDestroyRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomId, isOwner, timer, roomStatus, isVerified,
  onOpenShare, onOpenSafetyCode, onLockRoom, onDestroyRoom
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10">
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3">

        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-none">VAULT E2EE</h1>
              <span className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] sm:text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest shrink-0">
                <ShieldCheck className="w-2.5 h-2.5" /> Encrypted
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono truncate max-w-[120px] sm:max-w-none">
              <span className="text-cyan-400">{roomId ? roomId.substring(0, 8) + '...' : '...'}</span>
            </p>
          </div>
        </div>

        {/* Center timer — hidden on small screens */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Self-Destruct:</span>
          <span className="font-bold text-cyan-300 uppercase">{timer} (on read)</span>
        </div>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={onOpenSafetyCode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isVerified
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                : 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border-violet-500/30'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{isVerified ? 'Verified' : 'Safety Code'}</span>
          </button>

          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-md transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite Link</span>
          </button>

          {isOwner && (
            <div className="flex items-center gap-1 ml-1 pl-2 border-l border-white/10">
              {onLockRoom && roomStatus !== 'locked' && (
                <button onClick={onLockRoom} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Lock Room">
                  <LockKeyhole className="w-4 h-4" />
                </button>
              )}
              {onDestroyRoom && (
                <button onClick={onDestroyRoom} className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Destroy Room">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile: quick invite + overflow menu */}
        <div className="flex sm:hidden items-center gap-1.5">
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-md transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile overflow sheet */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="fixed bottom-0 inset-x-0 z-50 glass-panel rounded-t-3xl border-t border-white/10 p-5 pb-8 space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">Room Controls</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Timer info */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Self-Destruct: <strong className="text-cyan-300 uppercase">{timer} on read</strong></span>
              </div>

              <button
                onClick={() => { onOpenSafetyCode(); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                  isVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                {isVerified ? 'Verified Safety Code' : 'Check Safety Code'}
              </button>

              {isOwner && onLockRoom && roomStatus !== 'locked' && (
                <button
                  onClick={() => { onLockRoom(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-semibold border border-white/8 transition-all"
                >
                  <LockKeyhole className="w-4 h-4 text-slate-400" />
                  Lock Room
                </button>
              )}

              {isOwner && onDestroyRoom && (
                <button
                  onClick={() => { onDestroyRoom(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/20 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Destroy Room & Wipe Data
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
