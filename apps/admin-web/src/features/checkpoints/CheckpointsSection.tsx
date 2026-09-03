import type { AdminCheckpoint } from '@ciclorota/shared';
import { Copy, Eye, EyeOff, MapPin, Plus, Printer, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState, type ChangeEventHandler, type FormEventHandler } from 'react';
import { loadCheckpointQrImage } from '../../services/admin';
import { EmptyState } from '../../components/admin-ui';
import { Button, Card, CardHeader, Field, Input, Modal, StatusBadge, Switch, Table, TableBody, TableHead, Td, Textarea, Th } from '../../components/ui';
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
  geofenceDisabled: boolean;
  savingGeofenceSetting: boolean;
  isSuperAdmin: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onFormChange: (field: keyof CheckpointFormState, value: string | boolean) => void;
  onStartEdit: (checkpoint: AdminCheckpoint) => void;
  onNewCheckpoint: () => void;
  onUploadImages: (files: File[]) => void;
  onDeleteImage: (imageId: string) => void;
  onDeleteCheckpoint: () => void;
  onToggleGeofence: (disabled: boolean) => void;
  onRefresh: () => void;
}) {
  const images = props.currentCheckpoint?.images ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrTokenVisible, setQrTokenVisible] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const editingCheckpointId = props.editingCheckpointId;
  const accessToken = props.accessToken;
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

  const openCreateModal = () => {
    props.onNewCheckpoint();
    setModalOpen(true);
  };

  const openEditModal = (checkpoint: AdminCheckpoint) => {
    props.onStartEdit(checkpoint);
    setModalOpen(true);
  };

  const sortedCheckpoints = [...props.checkpointDirectory].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">Checkpoints</h1>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={props.onRefresh} disabled={props.loadingDirectory}>
            <RefreshCw size={16} className={props.loadingDirectory ? 'animate-spin' : ''} />
            Atualizar
          </Button>
          <Button type="button" onClick={openCreateModal}>
            <Plus size={16} />
            Adicionar Checkpoint
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          eyebrow="Validação"
          title="Geofence dos check-ins"
          meta="Controle global"
        />

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Switch
            checked={!props.geofenceDisabled}
            disabled={props.savingGeofenceSetting || !props.isSuperAdmin}
            offTone="danger"
            onChange={(enabled) => props.onToggleGeofence(!enabled)}
            label="Validação de distância dos check-ins"
            description={
              props.geofenceDisabled
                ? 'Check-ins são aceitos em qualquer distância do checkpoint, em toda a rota.'
                : 'Check-ins fora do raio permitido de cada checkpoint são rejeitados (padrão: 100m).'
            }
          />

          <StatusBadge tone={props.geofenceDisabled ? 'danger' : 'success'}>
            {props.geofenceDisabled ? 'Geofence desligado' : 'Geofence ligado'}
          </StatusBadge>
        </div>

        {!props.isSuperAdmin ? (
          <p className="px-4 pb-4 text-xs text-zinc-500">
            Apenas contas `superadmin` podem ligar ou desligar o geofence global.
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          eyebrow="Rotas"
          title="Pontos cadastrados"
          meta={props.loadingDirectory ? 'Carregando...' : `${sortedCheckpoints.length} registros`}
        />

        <div className="p-4">
          <Table>
            <TableHead>
              <tr>
                <Th>Nome</Th>
                <Th className="hidden md:table-cell">Coordenadas</Th>
                <Th>Validação</Th>
                <Th className="hidden sm:table-cell">Imagens</Th>
                <Th>Ações</Th>
              </tr>
            </TableHead>
            <TableBody>
              {sortedCheckpoints.map((checkpoint) => (
                <tr
                  key={checkpoint.id}
                  className="cursor-pointer transition-colors hover:bg-zinc-800/40"
                  onClick={() => openEditModal(checkpoint)}
                >
                  <Td className="font-medium text-zinc-100">
                    <span className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                        <MapPin size={15} />
                      </span>
                      {String(checkpoint.order).padStart(2, '0')} — {checkpoint.name}
                    </span>
                  </Td>
                  <Td className="hidden whitespace-nowrap text-zinc-400 md:table-cell">
                    {checkpoint.latitude.toFixed(5)}, {checkpoint.longitude.toFixed(5)}
                  </Td>
                  <Td>
                    <StatusBadge tone="success">
                      <QrCode size={12} />
                      QR Code
                    </StatusBadge>
                  </Td>
                  <Td className="hidden sm:table-cell">{checkpoint.images?.length ?? 0}</Td>
                  <Td>
                    <Button
                      variant="ghost"
                      type="button"
                      className="px-2 py-1"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(checkpoint);
                      }}
                    >
                      Editar
                    </Button>
                  </Td>
                </tr>
              ))}
            </TableBody>
          </Table>

          {sortedCheckpoints.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Nenhum checkpoint cadastrado" message="Adicione o primeiro ponto da rota." />
            </div>
          ) : null}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        widthClassName="max-w-2xl"
        eyebrow="Editor de checkpoint"
        title={props.editingCheckpointId ? 'Atualizar checkpoint existente' : 'Criar novo checkpoint'}
      >
        <form className="flex flex-col gap-4" onSubmit={props.onSubmit}>
          <Field label="Nome">
            <Input
              type="text"
              value={props.checkpointForm.name}
              onChange={(event) => props.onFormChange('name', event.target.value)}
              placeholder="Ex.: Mirante Norte"
            />
          </Field>

          <Field label="Descrição">
            <Textarea
              value={props.checkpointForm.description}
              onChange={(event) => props.onFormChange('description', event.target.value)}
              placeholder="Contexto operacional do checkpoint"
            />
          </Field>

          <Field label="Ordem">
            <Input
              type="text"
              value={props.checkpointForm.order}
              onChange={(event) => props.onFormChange('order', event.target.value)}
              inputMode="numeric"
              placeholder="1"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Latitude">
              <Input
                type="text"
                value={props.checkpointForm.latitude}
                onChange={(event) => props.onFormChange('latitude', event.target.value)}
                inputMode="decimal"
                placeholder="-23.123456"
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="text"
                value={props.checkpointForm.longitude}
                onChange={(event) => props.onFormChange('longitude', event.target.value)}
                inputMode="decimal"
                placeholder="-45.123456"
              />
            </Field>
          </div>

          <div className="rounded-lg border border-zinc-800 p-3">
            <Switch
              checked={props.checkpointForm.geofenceRadiusEnabled}
              onChange={(checked) => props.onFormChange('geofenceRadiusEnabled', checked)}
              label="Raio de geofence customizado"
              description="Desligado usa o padrão de 100m para este checkpoint."
            />

            {props.checkpointForm.geofenceRadiusEnabled ? (
              <div className="mt-3">
                <Field label="Raio permitido (metros)">
                  <Input
                    type="text"
                    value={props.checkpointForm.geofenceRadiusMeters}
                    onChange={(event) => props.onFormChange('geofenceRadiusMeters', event.target.value)}
                    inputMode="decimal"
                    placeholder="100"
                  />
                </Field>
              </div>
            ) : null}
          </div>

          <Field label="Link do mapa">
            <Input
              type="text"
              value={props.checkpointForm.map}
              onChange={(event) => props.onFormChange('map', event.target.value)}
              placeholder="https://..."
            />
          </Field>

          <Field label="Link do Wikiloc">
            <Input
              type="text"
              value={props.checkpointForm.info}
              onChange={(event) => props.onFormChange('info', event.target.value)}
              placeholder="https://wikiloc.com/..."
            />
          </Field>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={props.savingCheckpoint}>
              {props.savingCheckpoint ? 'Salvando...' : props.editingCheckpointId ? 'Atualizar checkpoint' : 'Criar checkpoint'}
            </Button>
            {props.editingCheckpointId ? (
              <Button
                type="button"
                variant="danger"
                disabled={props.deletingCheckpoint}
                onClick={props.onDeleteCheckpoint}
              >
                <Trash2 size={16} />
                {props.deletingCheckpoint ? 'Excluindo...' : 'Excluir checkpoint'}
              </Button>
            ) : null}
          </div>
        </form>

        <div className="mt-6 border-t border-zinc-800 pt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Carrossel</p>
          <h3 className="mt-0.5 text-sm font-semibold text-zinc-100">Imagens (Full HD)</h3>

          {props.editingCheckpointId ? (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                Fotos recomendadas em alta resolução (1920x1080). JPEG, PNG ou WebP, até 12 MB cada.
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((image) => (
                  <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-800">
                    <img src={image.url} alt="Imagem do checkpoint" loading="lazy" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remover imagem"
                      disabled={props.uploadingImages}
                      onClick={() => props.onDeleteImage(image.id)}
                      className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-rose-600/90 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              {images.length === 0 ? <p className="mt-2 text-xs text-zinc-500">Nenhuma imagem cadastrada ainda.</p> : null}

              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400">
                <span>{props.uploadingImages ? 'Enviando...' : 'Adicionar imagens'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={props.uploadingImages}
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </label>
            </>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">Salve o checkpoint antes de adicionar imagens.</p>
          )}
        </div>

        <div className="mt-6 border-t border-zinc-800 pt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Identificação</p>
          <h3 className="mt-0.5 text-sm font-semibold text-zinc-100">QR Code do trecho</h3>

          {props.editingCheckpointId ? (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                Imprima e fixe no ponto físico do checkpoint. Quando um ciclista escanear pelo app, este código é o
                que valida o check-in.
              </p>

              <div className="mt-3 flex flex-col items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex h-40 w-40 items-center justify-center">
                  {qrLoading ? (
                    <span className="text-xs text-zinc-500">Carregando QR...</span>
                  ) : qrError ? (
                    <span className="text-xs text-rose-400">{qrError}</span>
                  ) : qrImageUrl ? (
                    <img src={qrImageUrl} alt={`QR Code do checkpoint ${props.currentCheckpoint?.name ?? ''}`} className="h-full w-full" />
                  ) : null}
                </div>

                <div className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                  <code className={`flex-1 truncate text-xs text-zinc-300 ${qrTokenVisible ? '' : 'blur-sm select-none'}`}>
                    {qrToken}
                  </code>

                  <button
                    type="button"
                    onClick={() => setQrTokenVisible((value) => !value)}
                    aria-label={qrTokenVisible ? 'Ocultar conteúdo do QR' : 'Mostrar conteúdo do QR'}
                    className="shrink-0 cursor-pointer text-zinc-500 hover:text-zinc-200"
                  >
                    {qrTokenVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>

                  {qrTokenVisible ? (
                    <button
                      type="button"
                      onClick={() => void handleCopyToken()}
                      aria-label="Copiar código"
                      className="shrink-0 cursor-pointer text-zinc-500 hover:text-zinc-200"
                    >
                      <Copy size={16} />
                    </button>
                  ) : null}
                  {copyFeedback ? <span className="shrink-0 text-xs text-emerald-400">{copyFeedback}</span> : null}
                </div>

                <Button type="button" variant="secondary" onClick={handlePrintQr}>
                  <Printer size={16} />
                  Imprimir QR Code
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">Salve o checkpoint para gerar o QR Code.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
