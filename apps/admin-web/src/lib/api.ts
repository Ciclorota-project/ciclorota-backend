import type { PaginationMeta } from '@ciclorota/shared';
import { API_URL } from './env';
import { ApiRequestError } from './errors';
import { parsePaginationHeaders } from './pagination';

export interface ApiResponse<T> {
  data: T;
  pagination: PaginationMeta | null;
}

export async function requestJson<T>(
  path: string,
  options?: {
    method?: string;
    accessToken?: string;
    body?: unknown;
  }
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  if (options?.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  // Para FormData o browser define o Content-Type (com boundary) automaticamente.
  if (options?.body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options?.method ?? 'GET',
    headers,
    ...(options?.body !== undefined
      ? { body: isFormData ? (options.body as FormData) : JSON.stringify(options.body) }
      : {})
  });

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Falha ao carregar dados (${response.status}).`;

    throw new ApiRequestError(response.status, message);
  }

  return {
    data: payload as T,
    pagination: parsePaginationHeaders(response.headers)
  };
}
