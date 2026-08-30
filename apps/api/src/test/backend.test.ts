import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';

process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-role-key';
process.env.SUPABASE_ANON_KEY ??= 'anon-key';

const { canChangeRole, canManageRole, resolveRoleFromMetadata } = await import('../config/admin.js');
const { createCorsOptions, getAllowedOrigins, getHealthPayload, getReadinessPayload, isOriginAllowed } = await import('../config/http.js');
const { errorHandler, notFoundHandler } = await import('../middleware/errors.js');
const { HttpError } = await import('../utils/httpError.js');
const { parsePaginationQuery } = await import('../utils/pagination.js');
const { isHttpUrl, isIsoDateString, isUuid } = await import('../utils/validation.js');
const { escapeIlikePattern, mapAdminListUsersRow } = await import('../utils/adminUsers.js');

test('resolveRoleFromMetadata prioriza app_metadata quando disponível', () => {
  assert.equal(
    resolveRoleFromMetadata({
      app_metadata: { role: 'superadmin' },
      user_metadata: { role: 'admin' }
    }),
    'superadmin'
  );
});

test('regras de governança de role respeitam admin e superadmin', () => {
  assert.equal(canManageRole('admin', 'user'), true);
  assert.equal(canManageRole('admin', 'admin'), false);
  assert.equal(canManageRole('superadmin', 'admin'), true);
  assert.equal(canChangeRole('admin'), false);
  assert.equal(canChangeRole('superadmin'), true);
});

test('helpers de validação aceitam apenas formatos esperados', () => {
  assert.equal(isUuid('9f8d8d2b-6be6-4d1a-89b3-0c18860778ea'), true);
  assert.equal(isUuid('invalido'), false);
  assert.equal(isIsoDateString('2026-04-08T18:30:00.000Z'), true);
  assert.equal(isIsoDateString('2026-04-08 18:30:00'), false);
  assert.equal(isHttpUrl('https://ciclorota.app/mapa'), true);
  assert.equal(isHttpUrl('ftp://ciclorota.app/mapa'), false);
});

test('parsePaginationQuery aplica defaults e limita o máximo', () => {
  assert.deepEqual(parsePaginationQuery(undefined, undefined), { page: 1, limit: 20 });
  assert.deepEqual(parsePaginationQuery('3', '999'), { page: 3, limit: 100 });
});

test('escapeIlikePattern escapa os curingas do ILIKE antes de virar padrão', () => {
  assert.equal(escapeIlikePattern('50%'), '50\\%');
  assert.equal(escapeIlikePattern('a_b'), 'a\\_b');
  assert.equal(escapeIlikePattern('c:\\path'), 'c:\\\\path');
  assert.equal(escapeIlikePattern('luis arantes'), 'luis arantes');
});

test('mapAdminListUsersRow converte a linha da RPC no formato AdminUserRecord', () => {
  const withCertificate = mapAdminListUsersRow({
    id: '9f8d8d2b-6be6-4d1a-89b3-0c18860778ea',
    email: 'luis@example.com',
    created_at: '2026-08-27T00:35:03.156Z',
    role: 'admin',
    full_name: 'Luis Arantes',
    avatar_url: null,
    total_checkins: 5,
    certificate_issued_at: '2026-08-29T23:56:24.000Z'
  });

  assert.equal(withCertificate.has_certificate, true);
  assert.equal(withCertificate.is_admin, true);
  assert.equal(withCertificate.certificate_issued_at, '2026-08-29T23:56:24.000Z');

  const withoutCertificate = mapAdminListUsersRow({
    id: '11111111-1111-1111-1111-111111111111',
    email: null,
    created_at: '2026-08-27T00:35:03.156Z',
    role: 'user',
    full_name: null,
    avatar_url: null,
    total_checkins: 0,
    certificate_issued_at: null
  });

  assert.equal(withoutCertificate.has_certificate, false);
  assert.equal(withoutCertificate.is_admin, false);
});

test('configuração de CORS respeita a allowlist quando presente', () => {
  const allowedOrigins = getAllowedOrigins('https://admin.ciclorota.app, https://ops.ciclorota.app');

  assert.deepEqual(allowedOrigins, ['https://admin.ciclorota.app', 'https://ops.ciclorota.app']);
  assert.equal(isOriginAllowed('https://admin.ciclorota.app', allowedOrigins), true);
  assert.equal(isOriginAllowed('https://intruso.ciclorota.app', allowedOrigins), false);
  assert.equal(isOriginAllowed(undefined, allowedOrigins), true);
});

test('ready payload expõe checks de ambiente e modo de CORS', () => {
  const previousCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;

  process.env.CORS_ALLOWED_ORIGINS = 'https://admin.ciclorota.app';

  const payload = getReadinessPayload();

  assert.equal(payload.status, 'ready');
  assert.equal(payload.checks.supabase_url, true);
  assert.equal(payload.cors.mode, 'restricted');
  assert.deepEqual(payload.cors.allowed_origins, ['https://admin.ciclorota.app']);

  process.env.CORS_ALLOWED_ORIGINS = previousCorsOrigins;
});

test('health payload expõe status e uptime', () => {
  const payload = getHealthPayload();

  assert.equal(payload.status, 'ok');
  assert.equal(typeof payload.uptime_seconds, 'number');
});

test('notFoundHandler retorna 404 em JSON', () => {
  const response = createMockResponse();

  notFoundHandler({} as Request, response as unknown as Response);

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { error: 'Rota não encontrada.' });
});

test('errorHandler trata JSON inválido com 400 padronizado', () => {
  const response = createMockResponse();

  errorHandler({ type: 'entity.parse.failed' }, {} as Request, response as unknown as Response, noopNext);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'JSON inválido no corpo da requisição.' });
});

test('errorHandler respeita HttpError para respostas padronizadas', () => {
  const response = createMockResponse();

  errorHandler(
    new HttpError(403, 'Origem não permitida pelo CORS.'),
    {} as Request,
    response as unknown as Response,
    noopNext
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: 'Origem não permitida pelo CORS.' });
});

test('CORS restrito bloqueia origem não permitida com 403', async () => {
  const previousCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;
  process.env.CORS_ALLOWED_ORIGINS = 'https://admin.ciclorota.app';

  const corsOptions = createCorsOptions();

  await assert.rejects(
    () =>
      new Promise<void>((resolve, reject) => {
        if (typeof corsOptions.origin !== 'function') {
          reject(new Error('origin callback não configurado.'));
          return;
        }

        corsOptions.origin('https://intruso.ciclorota.app', (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    (error: unknown) => error instanceof HttpError && error.statusCode === 403
  );

  process.env.CORS_ALLOWED_ORIGINS = previousCorsOrigins;
});

test('CORS restrito permite origem autorizada e expõe os headers de paginação', async () => {
  const previousCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;
  process.env.CORS_ALLOWED_ORIGINS = 'https://admin.ciclorota.app';

  const corsOptions = createCorsOptions();
  const allowOrigin = await new Promise<unknown>((resolve, reject) => {
    if (typeof corsOptions.origin !== 'function') {
      reject(new Error('origin callback não configurado.'));
      return;
    }

    corsOptions.origin('https://admin.ciclorota.app', (error, value) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(value);
    });
  });

  assert.equal(allowOrigin, true);
  assert.deepEqual(corsOptions.exposedHeaders, ['X-Page', 'X-Per-Page', 'X-Total-Count', 'X-Total-Pages']);

  process.env.CORS_ALLOWED_ORIGINS = previousCorsOrigins;
});

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.headersSent = true;
      return this;
    }
  };
}

const noopNext: NextFunction = () => undefined;
