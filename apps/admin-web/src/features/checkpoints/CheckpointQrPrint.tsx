import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AdminCheckpoint } from '@ciclorota/shared';
import { useAdminSession } from '../../hooks/useAdminSession';
import { fetchAdminCheckpoints, loadCheckpointQrImage } from '../../services/admin';
import { DIRECTORY_CHECKPOINTS_LIMIT } from '../../lib/admin-state';

// Página dedicada para impressão do QR Code de um checkpoint.
// Aberta em nova aba via /print/checkpoints/:checkpointId. Sem header/sidebar
// do admin — só o cartão centralizado e a chamada automática de window.print
// quando os dados terminam de carregar.
export function CheckpointQrPrint() {
  const { checkpointId } = useParams<{ checkpointId: string }>();
  const { session, restoring } = useAdminSession();
  const [checkpoint, setCheckpoint] = useState<AdminCheckpoint | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrImageReady, setQrImageReady] = useState(false);

  useEffect(() => {
    if (!checkpointId || !session?.accessToken) {
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    setLoading(true);
    setError(null);
    setQrImageReady(false);

    Promise.all([
      // Reaproveita o diretório já paginado em 250 — é o caminho mais barato
      // de obter o objeto completo do checkpoint sem novo endpoint.
      fetchAdminCheckpoints(session.accessToken, { page: 1, limit: DIRECTORY_CHECKPOINTS_LIMIT }),
      loadCheckpointQrImage(session.accessToken, checkpointId)
    ])
      .then(([directory, url]) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        const found = directory.data.find((item) => item.id === checkpointId) ?? null;
        if (!found) {
          setError('Checkpoint não encontrado.');
        } else {
          setCheckpoint(found);
        }
        createdUrl = url;
        setQrUrl(url);
      })
      .catch((caught: Error) => {
        if (!cancelled) {
          setError(caught.message || 'Falha ao carregar o QR Code.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [checkpointId, session?.accessToken]);

  // Dispara o print nativo só depois que a imagem do QR terminou de
  // decodificar (evento onLoad, não um tempo arbitrário) e o navegador já
  // pintou esse frame (dois requestAnimationFrame). Chamar window.print()
  // cedo demais captura o frame anterior ("Preparando impressão...") em vez
  // do cartão final — por isso não usamos setTimeout como gatilho principal.
  useEffect(() => {
    if (!qrImageReady) {
      return undefined;
    }

    let frame1 = 0;
    let frame2 = 0;

    frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        window.print();
      });
    });

    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
    };
  }, [qrImageReady]);

  if (restoring || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <p className="text-sm text-zinc-500">Preparando impressão...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <p className="text-sm text-rose-600">Sessão não encontrada. Entre no painel admin e tente novamente.</p>
      </div>
    );
  }

  if (error || !checkpoint || !qrUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <p className="text-sm text-rose-600">{error ?? 'Não foi possível carregar o QR Code.'}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-6 print:h-screen print:w-screen print:gap-0 print:p-0">
      <div className="flex w-full max-w-[520px] flex-col items-center rounded-3xl border-2 border-zinc-900 p-6 text-center sm:p-10 print:h-full print:w-full print:max-w-none print:justify-between print:rounded-none print:border-black print:p-12 print:shadow-none">
        <div className="print:shrink-0">
          <p className="text-[22px] font-bold uppercase tracking-[0.18em] text-emerald-600">
            CICLOROTA — TRECHO {String(checkpoint.order).padStart(2, '0')}
          </p>
          <h1 className="mt-3 mb-7 text-4xl leading-tight text-zinc-900 print:mb-0 print:text-4xl">
            {checkpoint.name}
          </h1>
        </div>

        <div className="flex items-center justify-center print:my-6 print:min-h-0 print:w-full print:flex-1">
          <img
            className="mx-auto mb-5 block h-80 w-80 max-w-full print:m-0 print:h-full print:w-full print:object-contain"
            src={qrUrl}
            alt={`QR Code de ${checkpoint.name}`}
            onLoad={() => setQrImageReady(true)}
            onError={() => setQrImageReady(true)}
          />
        </div>

        <p className="text-sm leading-relaxed text-zinc-500 print:shrink-0 print:text-base">
          Escaneie pelo aplicativo Ciclorota para registrar sua visita neste checkpoint.
        </p>
      </div>

      <button
        className="cursor-pointer rounded-full bg-emerald-600 px-7 py-3 text-sm font-medium text-white hover:bg-emerald-500 print:hidden"
        type="button"
        onClick={() => window.print()}
      >
        Imprimir novamente
      </button>
    </div>
  );
}
