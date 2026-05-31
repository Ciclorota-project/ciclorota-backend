import type { CorsOptions } from 'cors';
import { HttpError } from '../utils/httpError.js';
import { loadEnvironment } from './loadEnv.js';

loadEnvironment();

const EXPOSED_HEADERS = ['X-Page', 'X-Per-Page', 'X-Total-Count', 'X-Total-Pages'];
const ALLOWED_HEADERS = ['Authorization', 'Content-Type'];
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export function createCorsOptions(): CorsOptions {
  const allowedOrigins = getAllowedOrigins();

  return {
    credentials: true,
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: EXPOSED_HEADERS,
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new HttpError(403, 'Origem não permitida pelo CORS.'));
    }
  };
}

export function getAllowedOrigins(rawOrigins = process.env.CORS_ALLOWED_ORIGINS) {
  return (rawOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins = getAllowedOrigins()) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.length === 0) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

export function getCorsConfigSnapshot() {
  const allowedOrigins = getAllowedOrigins();

  return {
    mode: allowedOrigins.length > 0 ? 'restricted' : 'open',
    allowed_origins: allowedOrigins,
    exposed_headers: EXPOSED_HEADERS
  };
}

export function getHealthPayload() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime())
  };
}

export function getReadinessPayload() {
  const checks = {
    supabase_url: Boolean(process.env.SUPABASE_URL),
    supabase_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabase_anon_key: Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  };

  const isReady = Object.values(checks).every(Boolean);

  return {
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
    cors: getCorsConfigSnapshot()
  };
}
