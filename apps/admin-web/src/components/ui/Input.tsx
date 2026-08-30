import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const FIELD_CLASSES =
  'w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

export function Field(props: { label: string; children: ReactNode; className?: string } & LabelHTMLAttributesLike) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm text-zinc-400 ${props.className ?? ''}`}>
      {props.label}
      {props.children}
    </label>
  );
}

type LabelHTMLAttributesLike = Omit<LabelHTMLAttributes<HTMLLabelElement>, 'className'>;

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${FIELD_CLASSES} ${className}`} />;
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${FIELD_CLASSES} min-h-[88px] resize-y ${className}`} />;
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${FIELD_CLASSES} ${className}`}>
      {children}
    </select>
  );
}
