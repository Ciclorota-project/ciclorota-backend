import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface ToastItem {
  id: string;
  type: 'error' | 'success';
  message: string;
}

const TOAST_DURATION_MS = 5000;

export function ToastStack(props: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (props.toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3">
      {props.toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={props.onDismiss} />
      ))}
    </div>
  );
}

function ToastCard(props: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { toast, onDismiss } = props;

  // Guarda a versão mais recente de onDismiss em um ref para que o timer de
  // cada card seja disparado uma única vez, mesmo que o pai passe uma nova
  // referência de função a cada re-render (evita reiniciar a contagem de
  // 5s de outros toasts já na tela quando um novo toast chega).
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id]);

  const isError = toast.type === 'error';

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative animate-toast-in rounded-lg border px-4 py-3 pr-9 text-sm shadow-lg shadow-black/40 ${
        isError ? 'border-rose-500/20 bg-rose-500/10 text-rose-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      {toast.message}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
        className="absolute right-2 top-2 rounded p-1 text-current opacity-70 transition-opacity hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}
