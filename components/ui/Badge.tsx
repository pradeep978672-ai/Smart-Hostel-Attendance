import React from 'react';

interface BadgeProps {
  variant?: 'present' | 'absent' | 'not_submitted' | 'open' | 'closed' | 'info' | 'webauthn' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  const styles = {
    present: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    absent: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    not_submitted: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    open: 'bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse',
    closed: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    info: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    webauthn: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
