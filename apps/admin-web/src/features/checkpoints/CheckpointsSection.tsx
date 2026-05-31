import type { AdminCheckpoint } from '@ciclorota/shared';
import type { ChangeEventHandler, FormEventHandler } from 'react';
import type { CheckpointFormState } from '../../types/admin';

export function CheckpointsSection(props: {
  checkpointDirectory: AdminCheckpoint[];
  currentCheckpoint: AdminCheckpoint | null;
  checkpointForm: CheckpointFormState;
  editingCheckpointId: string | null;
  loadingDirectory: boolean;
  savingCheckpoint: boolean;
  uploadingImages: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onFormChange: (field: keyof CheckpointFormState, value: string) => void;
  onStartEdit: (checkpoint: AdminCheckpoint) => void;
  onNewCheckpoint: () => void;
  onUploadImages: (files: File[]) => void;
  onDeleteImage: (imageId: string) => void;
}) {
  const images = props.currentCheckpoint?.images ?? [];

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
    </section>
  );
}
