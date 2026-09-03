import { Loader2, MailCheck, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/env';

type ConfirmState = { status: 'loading' } | { status: 'success' } | { status: 'error'; message: string };

function readErrorDescription(): string | null {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);

  const raw =
    hashParams.get('error_description') ??
    searchParams.get('error_description') ??
    hashParams.get('error') ??
    searchParams.get('error');

  return raw ? raw.replace(/\+/g, ' ') : null;
}

// Página pública (sem autenticação) para onde o e-mail de confirmação de
// cadastro do app redireciona. Registrada fora da árvore do AdminApp em
// App.tsx — quem confirma o e-mail não tem login algum no painel.
export function EmailConfirmedPage() {
  const [state, setState] = useState<ConfirmState>({ status: 'loading' });

  useEffect(() => {
    const errorDescription = readErrorDescription();

    if (errorDescription) {
      setState({ status: 'error', message: errorDescription });
      return;
    }

    if (!supabase) {
      setState({
        status: 'error',
        message: 'Não foi possível confirmar automaticamente. Tente abrir o link do e-mail novamente.'
      });
      return;
    }

    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;

        if (data.session) {
          setState({ status: 'success' });
        } else {
          setState({
            status: 'error',
            message: 'Não encontramos uma confirmação válida neste link.'
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: 'Não foi possível confirmar automaticamente. Tente abrir o link do e-mail novamente.'
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 px-4 py-12">
      <p className="mb-10 text-base font-semibold tracking-tight text-zinc-100">
        Cicloro<span className="text-emerald-400">ta</span>
      </p>

      {state.status === 'loading' ? (
        <div className="flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center shadow-2xl">
          <Loader2 size={28} className="animate-spin text-zinc-500" />
          <p className="text-sm text-zinc-400">Confirmando seu e-mail...</p>
        </div>
      ) : null}

      {state.status === 'success' ? (
        <div className="w-full max-w-lg rounded-2xl border border-emerald-500/20 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-4 ring-emerald-500/10">
            <MailCheck size={40} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">E-mail confirmado</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-100">Sua conta está pronta</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Seu cadastro na Ciclorota foi confirmado com sucesso. Volte para o aplicativo e faça login com o e-mail e a
            senha que você acabou de criar.
          </p>

          <p className="mt-6 text-xs text-zinc-600">Você já pode fechar esta página.</p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="w-full max-w-lg rounded-2xl border border-rose-500/20 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 ring-4 ring-rose-500/10">
            <ShieldAlert size={40} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">Não foi possível confirmar</p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-100">Este link não é mais válido</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{state.message}</p>

          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Isso costuma acontecer quando o link já foi usado ou expirou. Volte para o aplicativo e tente fazer login —
            se sua conta ainda não estiver confirmada, você pode se cadastrar novamente para receber um novo e-mail de
            confirmação.
          </p>
        </div>
      ) : null}
    </div>
  );
}
