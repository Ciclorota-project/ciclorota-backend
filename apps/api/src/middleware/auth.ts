import type { NextFunction, Request, Response } from 'express';
import { isSuperAdminRole } from '../config/admin.js';
import { AuthService } from '../services/AuthService.js';

const authService = new AuthService();

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    request.auth = await authenticateRequest(request);
    next();
  } catch (error) {
    response.status(401).json({ error: toErrorMessage(error, 'Token ausente, inválido ou expirado.') });
  }
}

export async function requireAdmin(request: Request, response: Response, next: NextFunction) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.isAdmin) {
      response.status(403).json({ error: 'Acesso restrito a administradores.' });
      return;
    }

    request.auth = auth;
    next();
  } catch (error) {
    response.status(401).json({ error: toErrorMessage(error, 'Token ausente, inválido ou expirado.') });
  }
}

export async function requireSuperAdmin(request: Request, response: Response, next: NextFunction) {
  try {
    const auth = await authenticateRequest(request);

    if (!isSuperAdminRole(auth.role)) {
      response.status(403).json({ error: 'Acesso restrito a superadmins.' });
      return;
    }

    request.auth = auth;
    next();
  } catch (error) {
    response.status(401).json({ error: toErrorMessage(error, 'Token ausente, inválido ou expirado.') });
  }
}

export function canAccessUser(request: Request, userId: string) {
  return request.auth?.isAdmin || request.auth?.userId === userId;
}

async function authenticateRequest(request: Request) {
  if (request.auth) {
    return request.auth;
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    throw new Error('Cabeçalho Authorization ausente.');
  }

  return authService.getAuthContext(accessToken);
}

function getBearerToken(request: Request) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
