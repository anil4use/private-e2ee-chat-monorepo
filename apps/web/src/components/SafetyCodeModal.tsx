'use client';

import React from 'react';
import { KeyRound, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SafetyCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  safetyCode: string;
  hostFingerprint: string;
  guestFingerprint?: string;
  isVerified: boolean;
  onToggleVerify: () => void;
}

export const SafetyCodeModal: React.FC<SafetyCodeModalProps> = ({
  isOpen, onClose, safetyCode, hostFingerprint, guestFingerprint, isVerified, onToggleVerify
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="w-full sm:max-w-lg glass-panel rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 pb-8 sm:pb-6 shadow-2xl"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/25">
                    <KeyRound className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Safety Verification</h3>
                    <p className="text-[11px] text-slate-500">Compare this code out-of-band</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Safety code display */}
              <div className="my-4 py-6 px-4 bg-gradient-to-br from-violet-950/60 via-slate-900 to-cyan-950/60 rounded-2xl border border-white/8 text-center">
                <span className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold block mb-3">
                  Cryptographic Fingerprint
                </span>
                <div
                  className="text-2xl sm:text-3xl font-extrabold tracking-widest font-mono text-cyan-300"
                  style={{ textShadow: '0 0 20px rgba(6,182,212,0.5)' }}
                >
                  {safetyCode || 'COMPUTING...'}
                </div>
                <p className="mt-3 text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  If this matches on both devices, your channel is secure against eavesdropping.
                </p>
              </div>

              {/* Fingerprints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/6">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Host Key</span>
                  <code className="text-xs font-mono text-violet-300 break-all">{hostFingerprint || 'N/A'}</code>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/6">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Guest Key</span>
                  <code className="text-xs font-mono text-cyan-300 break-all">{guestFingerprint || 'Waiting...'}</code>
                </div>
              </div>

              {/* Verify toggle */}
              <button
                onClick={onToggleVerify}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
                  isVerified
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                    : 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${isVerified ? 'text-emerald-400' : 'text-slate-500'}`} />
                {isVerified ? 'Marked as Verified' : 'Mark as Verified'}
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
