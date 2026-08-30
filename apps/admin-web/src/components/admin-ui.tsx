import type { AdminUserRecord, PaginationMeta } from '@ciclorota/shared';
import { AlertTriangle, CheckCircle2, ChevronDown, Search, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { fetchAdminUser, fetchAdminUsers } from '../services/admin';
import { Button, Card, Input } from './ui';

export function MetricCard(props: { label: string; value: number; icon: LucideIcon; description?: string; accent?: boolean }) {
  const Icon = props.icon;

  return (
    <Card className={`p-5 ${props.accent ? 'border-emerald-500/30' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400">{props.label}</span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            props.accent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <strong className="text-3xl font-semibold text-zinc-100">{props.value}</strong>
        {props.description ? <span className="text-xs text-zinc-500">{props.description}</span> : null}
      </div>
    </Card>
  );
}

export function PaginationControls(props: { pagination: PaginationMeta; onChange: (page: number) => void }) {
  const { pagination, onChange } = props;

  if (pagination.total_pages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button
        variant="secondary"
        type="button"
        disabled={pagination.page <= 1}
        onClick={() => onChange(pagination.page - 1)}
      >
        Anterior
      </Button>
      <span className="text-sm text-zinc-400">
        Página {pagination.page} de {pagination.total_pages}
      </span>
      <Button
        variant="secondary"
        type="button"
        disabled={pagination.page >= pagination.total_pages}
        onClick={() => onChange(pagination.page + 1)}
      >
        Próxima
      </Button>
    </div>
  );
}

export function InfoPill(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      <span className="block text-xs text-zinc-500">{props.label}</span>
      <strong className="mt-0.5 block truncate text-sm font-medium text-zinc-100">{props.value}</strong>
    </div>
  );
}

export function EmptyState(props: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 px-6 py-10 text-center">
      <strong className="block text-sm font-medium text-zinc-200">{props.title}</strong>
      <p className="mt-1 text-sm text-zinc-500">{props.message}</p>
    </div>
  );
}

export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  message: string;
  highlight?: string;
  bullets?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!props.open) return null;

  const variant = props.variant ?? 'default';
  const confirmLabel = props.confirmLabel ?? 'Confirmar';
  const cancelLabel = props.cancelLabel ?? 'Cancelar';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!props.busy) props.onCancel();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            variant === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}
          aria-hidden
        >
          {variant === 'danger' ? <AlertTriangle size={26} /> : <CheckCircle2 size={26} />}
        </div>

        <h2 className="mt-4 text-base font-semibold text-zinc-100">{props.title}</h2>

        {props.highlight ? <p className="mt-2 font-medium text-zinc-200">{props.highlight}</p> : null}

        <p className="mt-2 text-sm text-zinc-400">{props.message}</p>

        {props.bullets && props.bullets.length > 0 ? (
          <ul className="mt-3 list-inside list-disc space-y-1 text-left text-sm text-zinc-400">
            {props.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" type="button" onClick={props.onCancel} disabled={props.busy}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} type="button" onClick={props.onConfirm} disabled={props.busy}>
            {props.busy ? 'Processando...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ScrollableList(props: { children: ReactNode }) {
  return <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">{props.children}</div>;
}

const PICKER_PAGE_SIZE = 8;

/**
 * Busca de ciclista com debounce server-side (mesmo padrão de UsersSection),
 * em vez de despejar um <select> com o diretório inteiro de usuários — não
 * escala além de algumas dezenas de contas.
 */
export function UserPicker(props: {
  accessToken: string;
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { accessToken, value, onChange } = props;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUserRecord[]>([]);
  const [selected, setSelected] = useState<AdminUserRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve o nome de exibição quando o pai já traz um userId pronto
  // (ex.: filtro vindo de outra navegação) e ainda não temos o registro.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }

    if (selected?.id === value) {
      return;
    }

    let cancelled = false;

    fetchAdminUser(accessToken, value)
      .then((payload) => {
        if (!cancelled) setSelected(payload.data);
      })
      .catch(() => {
        if (!cancelled) setSelected(null);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, accessToken]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const handler = setTimeout(() => {
      setLoading(true);
      fetchAdminUsers(accessToken, { page: 1, limit: PICKER_PAGE_SIZE, ...(query ? { search: query } : {}) })
        .then((payload) => {
          if (!cancelled) {
            setResults(payload.data);
            setHighlightedIndex(0);
          }
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [query, open, accessToken]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectUser(user: AdminUserRecord) {
    setSelected(user);
    onChange(user.id);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        setOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const user = results[highlightedIndex];
      if (user) selectUser(user);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const displayValue = open ? query : selected ? selected.full_name || selected.email || selected.id : '';

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input
          type="text"
          className="cursor-text pl-9 pr-8"
          value={displayValue}
          placeholder={props.placeholder ?? 'Buscar ciclista por nome ou e-mail'}
          disabled={props.disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
      </div>

      {open ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl">
          {selected && !query ? (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between border-b border-zinc-800 px-3 py-2 text-left text-xs text-zinc-500 hover:bg-zinc-800/60"
              onClick={() => {
                setSelected(null);
                onChange('');
                setOpen(false);
              }}
            >
              Limpar seleção
            </button>
          ) : null}

          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {loading ? <li className="px-3 py-3 text-sm text-zinc-500">Buscando...</li> : null}

            {!loading && results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-zinc-500">Nenhum usuário encontrado.</li>
            ) : null}

            {!loading &&
              results.map((user, index) => (
                <li key={user.id} role="option" aria-selected={value === user.id}>
                  <button
                    type="button"
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                      index === highlightedIndex ? 'bg-emerald-500/10' : 'hover:bg-zinc-800/60'
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectUser(user)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-100">
                        {user.full_name || 'Sem nome cadastrado'}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">{user.email ?? user.id}</span>
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">{user.total_checkins} check-ins</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
