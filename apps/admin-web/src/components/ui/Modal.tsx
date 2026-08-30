import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Modal(props: {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  meta?: ReactNode;
  children: ReactNode;
  widthClassName?: string;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/80 backdrop-blur-sm"
      onClick={props.onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-full items-start justify-center p-4 py-10">
        <div
          className={`relative w-full ${props.widthClassName ?? 'max-w-xl'} rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl`}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="absolute right-4 top-4 cursor-pointer rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            onClick={props.onClose}
            aria-label="Fechar"
          >
              <X size={18} />
          </button>

          {props.title ? (
            <div className="mb-6 pr-8">
              {props.eyebrow ? (
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{props.eyebrow}</p>
              ) : null}
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-zinc-100">{props.title}</h2>
                {props.meta}
              </div>
            </div>
          ) : null}

          {props.children}
        </div>
      </div>
    </div>
  );
}
