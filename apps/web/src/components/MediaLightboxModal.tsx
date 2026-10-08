'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn } from 'lucide-react';

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  fileName: string;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  fileName,
}) => {
  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = fileName || 'decrypted-media';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative z-10 max-w-4xl max-h-[85vh] flex flex-col items-center justify-center bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="w-full flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-950/60">
            <div className="flex items-center gap-2 text-slate-300 font-mono text-xs truncate max-w-[250px] sm:max-w-md">
              <ZoomIn className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/25 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Media View */}
          <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh]">
            <img
              src={imageUrl}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
