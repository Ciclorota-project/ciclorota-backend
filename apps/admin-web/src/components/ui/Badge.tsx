import type { ReactNode } from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  danger: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  neutral: 'text-zinc-400 bg-zinc-800/60 border-zinc-700'
};

export function StatusBadge(props: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[props.tone]}`}
    >
      {props.children}
    </span>
  );
}
