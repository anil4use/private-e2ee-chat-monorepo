'use client';

import React from 'react';
import { ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HostApprovalModalProps {
  isOpen: boolean;
  guestFingerprint: string;
  onApprove: () => void;
  onReject: () => void;
}

export const HostApprovalModal: React.FC<HostApprovalModalProps> = ({ isOpen, guestFingerprint, onApprove, onReject }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
          />

          {/* Bottom sheet on mobile, centered modal on sm+ */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="w-full sm:max-w-md glass-panel rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 pb-8 sm:pb-6 shadow-2xl"
            >
              {/* Handle bar (mobile) */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5 sm:hidden" />

              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Guest Join Request</h3>
                  <p className="text-xs text-slate-400">Verify fingerprint before approving</p>
                </div>
              </div>

              <div className="mb-5 p-4 rounded-2xl bg-slate-900/80 border border-white/8">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Guest Key Fingerprint
                </span>
                <code className="text-sm font-mono text-cyan-300 break-all">{guestFingerprint || 'Unknown'}</code>
                <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                  Only approve if you trust this fingerprint matches the person you intended to invite.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onReject}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm border border-red-500/20 transition-all active:scale-95"
                >
                  <UserX className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={onApprove}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all active:scale-95"
                  style={{ boxShadow: '0 0 20px -4px rgba(16,185,129,0.5)' }}
                >
                  <UserCheck className="w-4 h-4" /> Approve
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
