import type {
  AdminCertificateIssueResponse,
  AdminCertificateRecord,
  AdminCertificatesQuery,
  AdminCheckpoint,
  AdminCheckpointInput,
  AdminCheckpointPatchInput,
  CheckpointImage,
  AdminCheckinsQuery,
  AdminOverviewResponse,
  AdminRecentCheckin,
  AdminUserPatchInput,
  AdminUserRecord,
  AdminUsersQuery
} from '@ciclorota/shared';
import { API_URL } from '../lib/env';
import { requestJson } from '../lib/api';
import { buildCertificatesQueryString, buildCheckinsQueryString, buildUsersQueryString } from '../lib/query';

export function fetchAdminOverview(accessToken: string) {
  return requestJson<AdminOverviewResponse>('/admin/overview', { accessToken });
}

export function fetchAdminUsers(accessToken: string, query: AdminUsersQuery) {
  return requestJson<AdminUserRecord[]>(`/admin/users?${buildUsersQueryString(query)}`, { accessToken });
}

export function fetchAdminUser(accessToken: string, userId: string) {
  return requestJson<AdminUserRecord>(`/admin/users/${userId}`, { accessToken });
}

export function fetchAdminCheckpoints(accessToken: string, options: { page: number; limit: number }) {
  return requestJson<AdminCheckpoint[]>(`/admin/checkpoints?page=${options.page}&limit=${options.limit}`, {
    accessToken
  });
}

export function fetchAdminCheckins(accessToken: string, query: AdminCheckinsQuery) {
  return requestJson<AdminRecentCheckin[]>(`/admin/checkins?${buildCheckinsQueryString(query)}`, {
    accessToken
  });
}

export function fetchAdminCertificates(accessToken: string, query: AdminCertificatesQuery) {
  return requestJson<AdminCertificateRecord[]>(`/admin/certificates?${buildCertificatesQueryString(query)}`, {
    accessToken
  });
}

export async function fetchAdminDirectories(accessToken: string, options: { usersLimit: number; checkpointsLimit: number }) {
  const [usersPayload, checkpointsPayload] = await Promise.all([
    fetchAdminUsers(accessToken, { page: 1, limit: options.usersLimit }),
    fetchAdminCheckpoints(accessToken, { page: 1, limit: options.checkpointsLimit })
  ]);

  return {
    users: usersPayload.data,
    checkpoints: checkpointsPayload.data
  };
}

export function updateAdminUser(accessToken: string, userId: string, payload: AdminUserPatchInput) {
  return requestJson<AdminUserRecord>(`/admin/users/${userId}`, {
    method: 'PATCH',
    accessToken,
    body: payload
  });
}

export function createAdminCheckpoint(accessToken: string, payload: AdminCheckpointInput) {
  return requestJson<AdminCheckpoint>('/admin/checkpoints', {
    method: 'POST',
    accessToken,
    body: payload
  });
}

export function updateAdminCheckpoint(accessToken: string, checkpointId: string, payload: AdminCheckpointPatchInput) {
  return requestJson<AdminCheckpoint>(`/admin/checkpoints/${checkpointId}`, {
    method: 'PATCH',
    accessToken,
    body: payload
  });
}

export function deleteAdminCheckpoint(accessToken: string, checkpointId: string) {
  return requestJson<void>(`/admin/checkpoints/${checkpointId}`, {
    method: 'DELETE',
    accessToken
  });
}

export function uploadCheckpointImages(accessToken: string, checkpointId: string, files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));

  return requestJson<CheckpointImage[]>(`/admin/checkpoints/${checkpointId}/images`, {
    method: 'POST',
    accessToken,
    body: form
  });
}

/**
 * Baixa o PNG do QR Code do checkpoint via Bearer e devolve uma object URL
 * (use URL.revokeObjectURL no cleanup para liberar memória).
 */
export async function loadCheckpointQrImage(accessToken: string, checkpointId: string): Promise<string> {
  const response = await fetch(`${API_URL}/admin/checkpoints/${checkpointId}/qr.png`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Não foi possível carregar o QR Code (HTTP ${response.status}).`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function deleteCheckpointImage(accessToken: string, checkpointId: string, imageId: string) {
  return requestJson<void>(`/admin/checkpoints/${checkpointId}/images/${imageId}`, {
    method: 'DELETE',
    accessToken
  });
}

export function issueAdminCertificate(accessToken: string, userId: string) {
  return requestJson<AdminCertificateIssueResponse>(`/admin/certificates/${userId}/issue`, {
    method: 'POST',
    accessToken
  });
}
