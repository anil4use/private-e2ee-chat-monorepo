'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose, shareUrl }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="w-full sm:max-w-md glass-panel rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 pb-8 sm:pb-5 shadow-2xl"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Invite Guest</h3>
                    <p className="text-[11px] text-slate-500">One-time E2EE invite link</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center py-5 my-3 bg-white/4 rounded-2xl border border-white/6">
                <div className="p-3 bg-white rounded-xl shadow-lg">
                  <QRCodeSVG value={shareUrl || 'https://example.com'} size={150} level="H" includeMargin />
                </div>
                <p className="mt-3 text-xs text-slate-500 text-center">Scan or share the link below</p>
              </div>

              {/* Copy field */}
              <div className="flex items-center gap-2 p-2 bg-slate-900/80 rounded-xl border border-white/10 mt-4">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent px-2 text-xs text-cyan-300 font-mono focus:outline-none min-w-0 truncate"
                />
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all shrink-0 ${
                    copied ? 'bg-emerald-500 text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  }`}
                >
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>

              {/* Security notice */}
              <div className="mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/15 flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-cyan-200 leading-relaxed">
                  The <code className="text-cyan-300 bg-cyan-900/40 px-1 rounded">#fragment</code> is never sent to servers — your key exchange is 100% private.
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
