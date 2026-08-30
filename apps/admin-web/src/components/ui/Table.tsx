import type { ReactNode, ThHTMLAttributes } from 'react';

export function Table(props: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">{props.children}</table>
    </div>
  );
}

export function TableHead(props: { children: ReactNode }) {
  return <thead className="bg-zinc-950/60">{props.children}</thead>;
}

export function TableBody(props: { children: ReactNode }) {
  return <tbody className="divide-y divide-zinc-800">{props.children}</tbody>;
}

export function Th(props: ThHTMLAttributes<HTMLTableCellElement>) {
  const { className = '', children, ...rest } = props;
  return (
    <th
      {...rest}
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td(props: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-zinc-300 ${props.className ?? ''}`}>{props.children}</td>;
}
