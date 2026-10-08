'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Flame, ShieldAlert } from 'lucide-react';
import { sounds } from '@/lib/sound';

interface PanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmWipe: () => void;
}

export const PanicModal: React.FC<PanicModalProps> = ({ isOpen, onClose, onConfirmWipe }) => {
  if (!isOpen) return null;

  const handleWipe = () => {
    sounds.playPanic();
    onConfirmWipe();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="relative w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl shadow-rose-950/40 text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <Flame className="w-7 h-7 text-rose-500 animate-pulse" />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">Emergency Session Wipe</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            This will immediately purge all encryption keys from IndexedDB, destroy session storage, and disconnect you from this room permanently.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleWipe}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold shadow-lg shadow-rose-600/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Wipe Room Now</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
