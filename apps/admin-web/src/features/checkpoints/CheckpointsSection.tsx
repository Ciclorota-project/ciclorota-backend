import type { AdminCheckpoint, PaginationMeta } from '@ciclorota/shared';
import type { FormEventHandler } from 'react';
import { PaginationControls } from '../../components/admin-ui';
import type { CheckpointFormState } from '../../types/admin';

export function CheckpointsSection(props: {
  checkpoints: AdminCheckpoint[];
  currentCheckpoint: AdminCheckpoint | null;
  checkpointsPagination: PaginationMeta;
  checkpointForm: CheckpointFormState;
  editingCheckpointId: string | null;
  loadingCheckpoints: boolean;
  savingCheckpoint: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onFormChange: (field: keyof CheckpointFormState, value: string) => void;
  onStartEdit: (checkpoint: AdminCheckpoint) => void;
  onNewCheckpoint: () => void;
  onChangePage: (page: number) => void;
}) {
  return (
    <div className="split-layout">
      {/* Esquerda: Catalogo (checkpoints publicados na plataforma) */}
      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Catalogo</p>
            <h2>Checkpoints publicados na plataforma</h2>
          </div>
          <span className="muted-badge">
            {props.loadingCheckpoints ? 'Carregando...' : `${props.checkpointsPagination.total_count} registros`}
          </span>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Checkpoint</th>
              </tr>
            </thead>
            <tbody>
              {props.checkpoints.map((checkpoint) => (
                <tr
                  key={checkpoint.id}
                  className={props.currentCheckpoint?.id === checkpoint.id ? 'active-row' : ''}
                  onClick={() => props.onStartEdit(checkpoint)}
                >
                  <td>{String(checkpoint.order).padStart(2, '0')}</td>
                  <td>
                    <strong>{checkpoint.name}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationControls pagination={props.checkpointsPagination} onChange={props.onChangePage} />
      </section>

      {/* Direita: Editor (Criar / Atualizar checkpoints existentes) */}
      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Editor de checkpoint</p>
            <h2>{props.editingCheckpointId ? 'Atualizar checkpoint existente' : 'Criar novo checkpoint'}</h2>
          </div>
          <button type="button" className="secondary-button" onClick={props.onNewCheckpoint}>
            Novo checkpoint
          </button>
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
      </section>
    </div>
  );
}
