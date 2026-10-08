'use client';

import React, { useState } from 'react';
import { SelfDestructTimer } from '@e2ee-chat/shared';
import { ShieldCheck, Lock, Clock, KeyRound, ArrowRight, EyeOff, FileKey, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onCreateRoom: (timer: SelfDestructTimer) => void;
  isCreating: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, isCreating }) => {
  const [selectedTimer, setSelectedTimer] = useState<SelfDestructTimer>('5m');

  const timerOptions: { id: SelfDestructTimer; label: string; desc: string }[] = [
    { id: '10s', label: '10s', desc: 'Ultra ephemeral' },
    { id: '1m',  label: '1m',  desc: 'Quick burn' },
    { id: '5m',  label: '5m',  desc: 'Recommended' },
    { id: '1h',  label: '1h',  desc: 'Short session' },
    { id: '24h', label: '24h', desc: 'Daily' },
    { id: 'never', label: 'Never', desc: 'Persistent' },
  ];

  const features = [
    { icon: EyeOff,   color: 'cyan',    title: 'No Accounts',     desc: 'Anonymous. No sign-up needed.' },
    { icon: FileKey,  color: 'violet',  title: 'File Encryption', desc: 'Files encrypted before upload.' },
    { icon: KeyRound, color: 'emerald', title: 'Safety Codes',    desc: 'Verify against MITM attacks.' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-mesh-gradient relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-cyan-500/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/8 rounded-full blur-[160px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg z-10"
      >
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" /> ECDH P-256 + AES-256-GCM
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Private E2EE Chat
          </h1>
          <p className="mt-2 text-xl sm:text-3xl font-black bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Zero Knowledge. Instant Discard.
          </p>
          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
            Encryption keys are generated in your browser and never leave your device. No servers ever see your messages.
          </p>
        </div>

        {/* Room creation card */}
        <div className="glass-panel rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-white/6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Self-Destruct Timer
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Starts on read</span>
            </div>
          </div>

          <div className="px-5 sm:px-6 py-4">
            {/* Timer grid — 3 cols on all sizes */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
              {timerOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedTimer(opt.id)}
                  className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all active:scale-95 ${
                    selectedTimer === opt.id
                      ? 'bg-cyan-500/20 border-cyan-400/60 shadow-[0_0_16px_-4px_rgba(6,182,212,0.4)]'
                      : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/12'
                  }`}
                >
                  <div className={`text-sm font-extrabold flex items-center justify-between ${selectedTimer === opt.id ? 'text-cyan-300' : 'text-white'}`}>
                    {opt.label}
                    {selectedTimer === opt.id && <Sparkles className="w-3 h-3 text-cyan-400" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* CTA */}
            <motion.button
              onClick={() => onCreateRoom(selectedTimer)}
              disabled={isCreating}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70"
              style={{ boxShadow: '0 0 32px -8px rgba(6,182,212,0.5)' }}
            >
              {isCreating ? (
                <><ShieldCheck className="w-5 h-5 animate-spin" /> Generating Keys...</>
              ) : (
                <><Lock className="w-4 h-4" /> Create Secure Room <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 sm:mt-8">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/4 border border-white/6 flex flex-col gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                color === 'cyan' ? 'bg-cyan-500/15 text-cyan-400' :
                color === 'violet' ? 'bg-violet-500/15 text-violet-400' :
                'bg-emerald-500/15 text-emerald-400'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">{title}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
