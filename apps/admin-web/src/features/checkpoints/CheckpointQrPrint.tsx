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

  useEffect(() => {
    if (!checkpointId || !session?.accessToken) {
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    setLoading(true);
    setError(null);

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

  // Dispara o print nativo do navegador uma vez que o QR e os dados
  // terminaram de carregar. Atraso curto para o layout renderizar.
  useEffect(() => {
    if (!loading && checkpoint && qrUrl && !error) {
      const timer = window.setTimeout(() => window.print(), 350);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [loading, checkpoint, qrUrl, error]);

  if (restoring || loading) {
    return (
      <div className="print-shell">
        <p className="muted-text">Preparando impressão...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="print-shell">
        <p className="error-text">
          Sessão não encontrada. Entre no painel admin e tente novamente.
        </p>
      </div>
    );
  }

  if (error || !checkpoint || !qrUrl) {
    return (
      <div className="print-shell">
        <p className="error-text">{error ?? 'Não foi possível carregar o QR Code.'}</p>
      </div>
    );
  }

  return (
    <div className="print-shell">
      <div className="print-card">
        <p className="print-kicker">CICLOROTA — TRECHO {String(checkpoint.order).padStart(2, '0')}</p>
        <h1 className="print-title">{checkpoint.name}</h1>

        <img className="print-qr" src={qrUrl} alt={`QR Code de ${checkpoint.name}`} />

        <p className="print-footer">
          Escaneie pelo aplicativo Ciclorota para registrar sua visita neste checkpoint.
        </p>
      </div>

      <button className="print-button" type="button" onClick={() => window.print()}>
        Imprimir novamente
      </button>
    </div>
  );
}
