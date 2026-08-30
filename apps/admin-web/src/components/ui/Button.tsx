import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-600 hover:bg-emerald-500 text-white border border-transparent',
  secondary: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white border border-transparent',
  ghost: 'bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-transparent'
};

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...rest}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
