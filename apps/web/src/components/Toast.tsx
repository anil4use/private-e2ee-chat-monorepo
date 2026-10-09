'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  warning: <ShieldAlert className="w-4 h-4 text-amber-400" />,
  info: <Info className="w-4 h-4 text-cyan-400" />,
};

const colors: Record<ToastType, string> = {
  success: 'border-emerald-500/30 bg-emerald-950/60',
  error: 'border-red-500/30 bg-red-950/60',
  warning: 'border-amber-500/30 bg-amber-950/60',
  info: 'border-cyan-500/30 bg-cyan-950/60',
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.88, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className={`relative flex items-start gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl max-w-sm w-full ${colors[toast.type]}`}
    >
      <div className="mt-0.5 shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
