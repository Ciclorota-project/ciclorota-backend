import type { User } from '@supabase/supabase-js';

export type AppRole = 'user' | 'admin' | 'superadmin';

// A role NUNCA pode ser lida de user_metadata: esse campo é editável pelo
// próprio usuário via Supabase Auth (auth.updateUser), então confiar nele
// permitiria qualquer usuário se autopromover a admin/superadmin. Só
// app_metadata é confiável, pois só o service role (backend) pode alterá-lo.
export function resolveRoleFromUser(user: Pick<User, 'app_metadata'>) {
  return normalizeRole(user.app_metadata?.role) ?? 'user';
}

export function resolveRoleFromMetadata(metadata: { app_metadata?: Record<string, unknown> }) {
  return normalizeRole(metadata.app_metadata?.role) ?? 'user';
}

export function isAdminRole(role: AppRole) {
  return role === 'admin' || role === 'superadmin';
}

export function isSuperAdminRole(role: AppRole) {
  return role === 'superadmin';
}

export function canManageRole(actorRole: AppRole, targetRole: AppRole) {
  if (actorRole === 'superadmin') {
    return true;
  }

  return actorRole === 'admin' && targetRole === 'user';
}

export function canChangeRole(actorRole: AppRole) {
  return actorRole === 'superadmin';
}

function normalizeRole(value: unknown): AppRole | null {
  if (value === 'user' || value === 'admin' || value === 'superadmin') {
    return value;
  }

  return null;
}
