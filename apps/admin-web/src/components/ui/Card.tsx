import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`rounded-xl border border-zinc-800 bg-zinc-900 ${className}`}
    />
  );
}

export function CardHeader(props: { eyebrow?: string; title: string; meta?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-zinc-800 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        {props.eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{props.eyebrow}</p>
        ) : null}
        <h2 className="mt-0.5 text-base font-semibold text-zinc-100">{props.title}</h2>
      </div>
      {props.meta ? <div className="shrink-0 text-xs text-zinc-400">{props.meta}</div> : null}
    </div>
  );
}
