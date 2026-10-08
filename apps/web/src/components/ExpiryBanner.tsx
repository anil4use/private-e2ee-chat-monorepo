'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { SelfDestructTimer } from '@e2ee-chat/shared';

interface ExpiryBannerProps {
  timer: SelfDestructTimer;
}

export const ExpiryBanner: React.FC<ExpiryBannerProps> = ({ timer }) => {
  if (timer === 'never') return null;

  const getTimerLabel = (t: SelfDestructTimer) => {
    switch (t) {
      case '10s': return 'Self-destructs 10s after read';
      case '1m': return 'Self-destructs 1m after read';
      case '5m': return 'Self-destructs 5m after read';
      case '1h': return 'Self-destructs 1h after read';
      case '24h': return 'Self-destructs 24h after read';
      default: return `Self-destruct mode (${t})`;
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border-b border-cyan-500/20 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] text-cyan-400 font-mono backdrop-blur-md">
      <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
      <span>{getTimerLabel(timer)}</span>
    </div>
  );
};
