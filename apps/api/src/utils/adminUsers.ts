import { isAdminRole, type AppRole } from '../config/admin.js';

/**
 * Escapa os curingas do ILIKE (%, _, \) antes de embutir um termo de busca
 * livre num padrão '%...%'. Sem isso, um usuário buscando por "50%" ou
 * "a_b" teria o caractere tratado como curinga em vez de literal.
 */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export interface AdminListUsersRpcRow {
  id: string;
  email: string | null;
  created_at: string;
  role: AppRole;
  full_name: string | null;
  avatar_url: string | null;
  total_checkins: number;
  certificate_issued_at: string | null;
}

/**
 * Mapeia uma linha crua devolvida por admin_list_users (função SQL) para o
 * mesmo formato de usuário que o frontend sempre recebeu de AdminService.
 */
export function mapAdminListUsersRow(row: AdminListUsersRpcRow) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    total_checkins: row.total_checkins,
    has_certificate: row.certificate_issued_at !== null,
    certificate_issued_at: row.certificate_issued_at,
    is_admin: isAdminRole(row.role)
  };
}
