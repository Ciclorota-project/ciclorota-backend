import type { AdminCheckpoint, AdminCheckpointInput } from '@ciclorota/shared';
import type { CheckpointFormState, UserDraftState } from '../types/admin';

export const DEFAULT_PAGE_SIZE = 8;
// O backend limita `limit` a 100 por request (apps/api/src/utils/pagination.ts);
// pedir mais que isso era silenciosamente cortado para 100.
export const DIRECTORY_CHECKPOINTS_LIMIT = 100;
export const OVERVIEW_CERTIFICATES_LIMIT = 5;

export function createEmptyUserDraft(): UserDraftState {
  return {
    full_name: '',
    avatar_url: '',
    role: 'user'
  };
}

export function createEmptyCheckpointForm(): CheckpointFormState {
  return {
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    order: '',
    map: '',
    info: '',
    geofenceRadiusEnabled: false,
    geofenceRadiusMeters: ''
  };
}

export function toCheckpointForm(checkpoint: AdminCheckpoint): CheckpointFormState {
  const hasCustomRadius = checkpoint.geofence_radius_meters !== null && checkpoint.geofence_radius_meters !== undefined;

  return {
    name: checkpoint.name,
    description: checkpoint.description,
    latitude: String(checkpoint.latitude),
    longitude: String(checkpoint.longitude),
    order: String(checkpoint.order),
    map: checkpoint.map ?? '',
    info: checkpoint.info ?? '',
    geofenceRadiusEnabled: hasCustomRadius,
    geofenceRadiusMeters: hasCustomRadius ? String(checkpoint.geofence_radius_meters) : ''
  };
}

export function toCheckpointPayload(form: CheckpointFormState): AdminCheckpointInput {
  const name = form.name.trim();
  const description = form.description.trim();
  const map = form.map.trim();
  const info = form.info.trim();
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const order = Number(form.order);

  if (!name || !description) {
    throw new Error('Nome e descricao sao obrigatorios.');
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Latitude e longitude precisam ser numericas.');
  }

  if (!Number.isInteger(order) || order <= 0) {
    throw new Error('A ordem precisa ser um numero inteiro positivo.');
  }

  let geofenceRadiusMeters: number | null = null;

  if (form.geofenceRadiusEnabled) {
    geofenceRadiusMeters = Number(form.geofenceRadiusMeters);

    if (!Number.isFinite(geofenceRadiusMeters) || geofenceRadiusMeters <= 0) {
      throw new Error('O raio do geofence precisa ser um número positivo (em metros).');
    }
  }

  return {
    name,
    description,
    latitude,
    longitude,
    order,
    map: map || null,
    info: info || null,
    geofence_radius_meters: geofenceRadiusMeters
  };
}
