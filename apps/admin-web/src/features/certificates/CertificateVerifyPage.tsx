import { Award, Loader2, MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InfoPill } from '../../components/admin-ui';
import { API_URL } from '../../lib/env';
import { formatDateTime } from '../../lib/format';

interface VerifiedCertificate {
  id: string;
  verification_code: string;
  issued_at: string;
  holder_name: string | null;
  total_checkpoints: number;
}

type VerifyState =
  | { status: 'loading' }
  | { status: 'valid'; certificate: VerifiedCertificate }
  | { status: 'invalid' }
  | { status: 'error'; message: string };

// Página pública (sem autenticação) para verificar a autenticidade de um
// certificado pelo código impresso no PDF/QR. Registrada fora da árvore do
// AdminApp em App.tsx, então não exige sessão Supabase — quem escaneia o
// selo não tem login algum no painel.
export function CertificateVerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [state, setState] = useState<VerifyState>({ status: 'loading' });

  useEffect(() => {
    if (!code) {
      setState({ status: 'invalid' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    fetch(`${API_URL}/certificates/verify/${encodeURIComponent(code)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (cancelled) return;

        if (payload?.valid && payload.certificate) {
          setState({ status: 'valid', certificate: payload.certificate });
        } else {
          setState({ status: 'invalid' });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error', message: 'Não foi possível conectar ao servidor de verificação. Tente novamente.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 px-4 py-12">
      <p className="mb-10 text-base font-semibold tracking-tight text-zinc-100">
        Cicloro<span className="text-emerald-400">ta</span>
      </p>

      {state.status === 'loading' ? (
        <div className="flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center shadow-2xl">
          <Loader2 size={28} className="animate-spin text-zinc-500" />
          <p className="text-sm text-zinc-400">Verificando certificado...</p>
        </div>
      ) : null}

      {state.status === 'valid' ? (
        <div className="w-full max-w-lg rounded-2xl border border-emerald-500/20 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-4 ring-emerald-500/10">
            <ShieldCheck size={40} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Certificado Autêntico</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-100">
            {state.certificate.holder_name || 'Ciclista Ciclorota'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Concluiu com sucesso todos os {state.certificate.total_checkpoints} checkpoints da rota oficial da
            Ciclorota.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <InfoPill label="Emitido em" value={formatDateTime(state.certificate.issued_at)} />
            <InfoPill label="Checkpoints concluídos" value={String(state.certificate.total_checkpoints)} />
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-left">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Award size={13} />
              Código de verificação
            </span>
            <code className="mt-1 block break-all font-mono text-sm tracking-widest text-zinc-100">
              {state.certificate.verification_code}
            </code>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-600">
            <MapPin size={12} />
            Este selo confirma que o certificado foi emitido oficialmente pela Ciclorota e é genuíno.
          </p>
        </div>
      ) : null}

      {state.status === 'invalid' ? (
        <div className="w-full max-w-lg rounded-2xl border border-rose-500/20 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 ring-4 ring-rose-500/10">
            <ShieldAlert size={40} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">Certificado não encontrado</p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-100">Não foi possível verificar este código</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            O código <code className="font-mono text-zinc-300">{code}</code> não corresponde a nenhum certificado
            emitido pela Ciclorota. Verifique se digitou corretamente ou entre em contato com a organização.
          </p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 ring-4 ring-amber-500/10">
            <ShieldAlert size={40} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Erro na verificação</p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-100">Algo deu errado</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{state.message}</p>
        </div>
      ) : null}
    </div>
  );
}
