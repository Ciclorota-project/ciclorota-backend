import type { AdminCheckpoint } from '@ciclorota/shared';
import { useEffect, useState, type ChangeEventHandler, type FormEventHandler } from 'react';
import { loadCheckpointQrImage } from '../../services/admin';
import type { CheckpointFormState } from '../../types/admin';

export function CheckpointsSection(props: {
  checkpointDirectory: AdminCheckpoint[];
  currentCheckpoint: AdminCheckpoint | null;
  checkpointForm: CheckpointFormState;
  editingCheckpointId: string | null;
  loadingDirectory: boolean;
  savingCheckpoint: boolean;
  uploadingImages: boolean;
  deletingCheckpoint: boolean;
  accessToken: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onFormChange: (field: keyof CheckpointFormState, value: string) => void;
  onStartEdit: (checkpoint: AdminCheckpoint) => void;
  onNewCheckpoint: () => void;
  onUploadImages: (files: File[]) => void;
  onDeleteImage: (imageId: string) => void;
  onDeleteCheckpoint: () => void;
}) {
  const images = props.currentCheckpoint?.images ?? [];

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrTokenVisible, setQrTokenVisible] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const editingCheckpointId = props.editingCheckpointId;
  const accessToken = props.accessToken;
  // Conteúdo do QR == UUID do checkpoint.
  const qrToken = props.currentCheckpoint?.id ?? '';

  useEffect(() => {
    if (!editingCheckpointId || !accessToken) {
      setQrImageUrl(null);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    setQrLoading(true);
    setQrError(null);

    loadCheckpointQrImage(accessToken, editingCheckpointId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setQrImageUrl(url);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setQrError(error.message || 'Não foi possível carregar o QR Code.');
        }
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [editingCheckpointId, accessToken]);

  // Reseta a visibilidade do token toda vez que o checkpoint muda.
  useEffect(() => {
    setQrTokenVisible(false);
    setCopyFeedback(null);
  }, [editingCheckpointId]);

  const handleCopyToken = async () => {
    if (!qrToken) return;
    try {
      await navigator.clipboard.writeText(qrToken);
      setCopyFeedback('Copiado!');
      setTimeout(() => setCopyFeedback(null), 1800);
    } catch {
      setCopyFeedback('Falhou ao copiar.');
    }
  };

  const handlePrintQr = () => {
    if (!editingCheckpointId) return;
    window.open(`/print/checkpoints/${editingCheckpointId}`, '_blank', 'noopener');
  };

  const handleFilesSelected: ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      props.onUploadImages(files);
    }
    event.target.value = '';
  };

  const handleSelectChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    const selectedId = event.target.value;

    if (selectedId === '') {
      props.onNewCheckpoint();
      return;
    }

    const checkpoint = props.checkpointDirectory.find((item) => item.id === selectedId);
    if (checkpoint) {
      props.onStartEdit(checkpoint);
    }
  };

  const sortedCheckpoints = [...props.checkpointDirectory].sort((a, b) => a.order - b.order);

  return (
    <section className="panel">
      <div className="panel-heading inline">
        <div>
          <p className="eyebrow">Editor de checkpoint</p>
          <h2>{props.editingCheckpointId ? 'Atualizar checkpoint existente' : 'Criar novo checkpoint'}</h2>
        </div>
        <span className="muted-badge">
          {props.loadingDirectory ? 'Carregando...' : `${sortedCheckpoints.length} registros`}
        </span>
      </div>

      <div className="checkpoint-picker">
        <label>
          Selecionar checkpoint
          <select
            value={props.editingCheckpointId ?? ''}
            onChange={handleSelectChange}
            disabled={props.loadingDirectory}
          >
            <option value="">— Criar novo checkpoint —</option>
            {sortedCheckpoints.map((checkpoint) => (
              <option key={checkpoint.id} value={checkpoint.id}>
                {String(checkpoint.order).padStart(2, '0')} — {checkpoint.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form className="editor-form" onSubmit={props.onSubmit}>
        <label>
          Nome
          <input
            type="text"
            value={props.checkpointForm.name}
            onChange={(event) => props.onFormChange('name', event.target.value)}
            placeholder="Ex.: Mirante Norte"
          />
        </label>

        <label>
          Descricao
          <textarea
            value={props.checkpointForm.description}
            onChange={(event) => props.onFormChange('description', event.target.value)}
            placeholder="Contexto operacional do checkpoint"
          />
        </label>

        <label>
          Ordem
          <input
            type="text"
            value={props.checkpointForm.order}
            onChange={(event) => props.onFormChange('order', event.target.value)}
            inputMode="numeric"
            placeholder="1"
          />
        </label>

        <div className="form-grid">
          <label>
            Latitude
            <input
              type="text"
              value={props.checkpointForm.latitude}
              onChange={(event) => props.onFormChange('latitude', event.target.value)}
              inputMode="decimal"
              placeholder="-23.123456"
            />
          </label>
          <label>
            Longitude
            <input
              type="text"
              value={props.checkpointForm.longitude}
              onChange={(event) => props.onFormChange('longitude', event.target.value)}
              inputMode="decimal"
              placeholder="-45.123456"
            />
          </label>
        </div>

        <label>
          Link do mapa
          <input
            type="text"
            value={props.checkpointForm.map}
            onChange={(event) => props.onFormChange('map', event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label style={{ marginTop: '16px' }}>
          Link do Wikiloc
          <input
            type="text"
            value={props.checkpointForm.info}
            onChange={(event) => props.onFormChange('info', event.target.value)}
            placeholder="https://wikiloc.com/..."
          />
        </label>

        <div className="editor-actions">
          <button type="submit" disabled={props.savingCheckpoint}>
            {props.savingCheckpoint
              ? 'Salvando...'
              : props.editingCheckpointId
                ? 'Atualizar checkpoint'
                : 'Criar checkpoint'}
          </button>
          {props.editingCheckpointId ? (
            <button type="button" className="secondary-button" onClick={props.onNewCheckpoint}>
              Cancelar edicao
            </button>
          ) : null}
          {props.editingCheckpointId ? (
            <button
              type="button"
              className="danger-button"
              disabled={props.deletingCheckpoint}
              onClick={props.onDeleteCheckpoint}
            >
              {props.deletingCheckpoint ? 'Excluindo...' : 'Excluir checkpoint'}
            </button>
          ) : null}
        </div>
      </form>

      <div className="checkpoint-images">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Carrossel</p>
            <h3>Imagens (Full HD)</h3>
          </div>
        </div>

        {props.editingCheckpointId ? (
          <>
            <p className="muted-text">Fotos recomendadas em alta resolucao (1920x1080). JPEG, PNG ou WebP, ate 12 MB cada.</p>

            <div className="image-grid">
              {images.map((image) => (
                <div key={image.id} className="image-thumb">
                  <img src={image.url} alt="Imagem do checkpoint" loading="lazy" />
                  <button
                    type="button"
                    className="image-remove"
                    aria-label="Remover imagem"
                    disabled={props.uploadingImages}
                    onClick={() => props.onDeleteImage(image.id)}
                  >
                    &times;
                  </button>
                </div>
              ))}

              {images.length === 0 ? (
                <p className="muted-text">Nenhuma imagem cadastrada ainda.</p>
              ) : null}
            </div>

            <label className="image-upload">
              <span>{props.uploadingImages ? 'Enviando...' : 'Adicionar imagens'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={props.uploadingImages}
                onChange={handleFilesSelected}
              />
            </label>
          </>
        ) : (
          <p className="muted-text">Salve o checkpoint antes de adicionar imagens.</p>
        )}
      </div>

      <div className="checkpoint-qr">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Identificação</p>
            <h3>QR Code do trecho</h3>
          </div>
        </div>

        {props.editingCheckpointId ? (
          <>
            <p className="muted-text">
              Imprima e fixe no ponto físico do checkpoint. Quando um ciclista escanear pelo app,
              este código é o que valida o check-in.
            </p>

            <div className="qr-card">
              <div className="qr-image-wrap">
                {qrLoading ? (
                  <span className="muted-text">Carregando QR...</span>
                ) : qrError ? (
                  <span className="error-text">{qrError}</span>
                ) : qrImageUrl ? (
                  <img src={qrImageUrl} alt={`QR Code do checkpoint ${props.currentCheckpoint?.name ?? ''}`} />
                ) : null}
              </div>

              <div className={`qr-token${qrTokenVisible ? '' : ' qr-token-hidden'}`}>
                <code aria-hidden={!qrTokenVisible}>{qrToken}</code>

                <button
                  type="button"
                  className="qr-token-eye"
                  onClick={() => setQrTokenVisible((value) => !value)}
                  aria-label={qrTokenVisible ? 'Ocultar conteúdo do QR' : 'Mostrar conteúdo do QR'}
                  title={qrTokenVisible ? 'Ocultar conteúdo' : 'Mostrar conteúdo'}
                >
                  {qrTokenVisible ? (
                    // eye-off
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    // eye
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>

                {qrTokenVisible ? (
                  <button
                    type="button"
                    className="qr-token-copy"
                    onClick={handleCopyToken}
                    aria-label="Copiar código"
                  >
                    {copyFeedback ?? 'Copiar'}
                  </button>
                ) : null}
              </div>

              <div className="qr-actions">
                <button type="button" className="qr-print-button" onClick={handlePrintQr}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Imprimir QR Code
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="muted-text">Salve o checkpoint para gerar o QR Code.</p>
        )}
      </div>
    </section>
  );
}
