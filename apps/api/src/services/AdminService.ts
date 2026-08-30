import { canChangeRole, canManageRole, isAdminRole, type AppRole, resolveRoleFromMetadata } from '../config/admin.js';
import { supabaseAdmin } from '../config/supabase.js';
import type { AuthContext } from '../types/auth.js';
import { escapeIlikePattern, mapAdminListUsersRow, type AdminListUsersRpcRow } from '../utils/adminUsers.js';
import { HttpError } from '../utils/httpError.js';
import type { PaginatedResult, PaginationParams } from '../utils/pagination.js';
import { CertificateService } from './CertificateService.js';
import { CheckpointService } from './CheckpointService.js';
import { ProfileService } from './ProfileService.js';

interface AuthDirectoryUser {
  id: string;
  email: string | null;
  created_at: string;
  role: AppRole;
  is_admin: boolean;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

interface AdminUserPatchInput {
  role?: AppRole;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface AdminUsersQuery extends PaginationParams {
  role?: AppRole;
  search?: string;
}

interface AdminCheckinsQuery extends PaginationParams {
  userId?: string;
  checkpointId?: string;
}

interface AdminCertificatesQuery extends PaginationParams {
  userId?: string;
}

export class AdminService {
  private readonly checkpointService = new CheckpointService();
  private readonly certificateService = new CertificateService();
  private readonly profileService = new ProfileService();

  async getOverview() {
    const [summary, users, recentCheckins, checkpoints] = await Promise.all([
      this.getSummary(),
      this.listUsers({ page: 1, limit: 12 }),
      this.listRecentCheckins({ page: 1, limit: 12 }),
      this.checkpointService.getAdminCheckpoints({ page: 1, limit: 100 })
    ]);

    return {
      summary,
      users: users.items,
      recent_checkins: recentCheckins.items,
      checkpoints: checkpoints.items
    };
  }

  async listUsers(query: AdminUsersQuery): Promise<PaginatedResult<any>> {
    const trimmedSearch = query.search?.trim();
    const searchPattern = trimmedSearch ? `%${escapeIlikePattern(trimmedSearch)}%` : null;

    const { data, error } = await supabaseAdmin.rpc('admin_list_users', {
      p_search_pattern: searchPattern,
      p_role: query.role ?? null,
      p_limit: query.limit,
      p_offset: (query.page - 1) * query.limit
    });

    if (error) {
      throw new HttpError(500, `Erro ao listar usuários: ${error.message}`);
    }

    const rows = (data?.items ?? []) as AdminListUsersRpcRow[];

    return {
      items: rows.map(mapAdminListUsersRow),
      page: query.page,
      limit: query.limit,
      total: data?.total ?? 0
    };
  }

  async getUserById(userId: string) {
    const authUser = await this.getAuthUserById(userId);
    const [users] = await Promise.all([this.enrichUsers([authUser])]);

    if (!users[0]) {
      throw new Error('Usuário não encontrado.');
    }

    return users[0];
  }

  async updateUser(actor: AuthContext, userId: string, input: AdminUserPatchInput) {
    const authUser = await this.getAuthUserById(userId);

    if (!canManageRole(actor.role, authUser.role)) {
      throw new HttpError(403, 'Seu nível de acesso não permite editar este usuário.');
    }

    if (input.role !== undefined && input.role !== authUser.role) {
      if (!canChangeRole(actor.role)) {
        throw new HttpError(403, 'Somente superadmins podem alterar roles de usuários.');
      }

      if (actor.userId === userId) {
        throw new HttpError(403, 'Você não pode alterar a sua própria role por esta rota.');
      }
    }

    if (input.role) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...authUser.app_metadata,
          role: input.role
        },
        user_metadata: {
          ...authUser.user_metadata,
          role: input.role
        }
      });

      if (error) {
        throw new HttpError(400, `Erro ao atualizar role do usuário: ${error.message}`);
      }
    }

    if (input.full_name !== undefined || input.avatar_url !== undefined) {
      await this.profileService.upsertProfile(userId, {
        ...(input.full_name !== undefined ? { full_name: input.full_name } : {}),
        ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url } : {})
      });
    }

    return this.getUserById(userId);
  }

  async listRecentCheckins(query: AdminCheckinsQuery): Promise<PaginatedResult<any>> {
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;

    let request = supabaseAdmin
      .from('checkins')
      .select(`
        id,
        user_id,
        checkpoint_id,
        scanned_at,
        checkpoints (
          id,
          name,
          description
        )
      `, {
        count: 'exact'
      })
      .order('scanned_at', { ascending: false });

    if (query.userId) {
      request = request.eq('user_id', query.userId);
    }

    if (query.checkpointId) {
      request = request.eq('checkpoint_id', query.checkpointId);
    }

    const { data, error, count } = await request.range(from, to);

    if (error) {
      throw new Error(`Erro ao listar check-ins recentes: ${error.message}`);
    }

    const userIds = [...new Set((data ?? []).map((entry) => entry.user_id))];
    const [profiles, authUsers] = await Promise.all([
      this.profileService.getProfilesByIds(userIds),
      this.listAuthUsersByIds(userIds)
    ]);

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const authUserMap = new Map(authUsers.map((user) => [user.id, user]));

    const items = (data ?? []).map((entry) => {
      const checkpoint = Array.isArray(entry.checkpoints) ? entry.checkpoints[0] : entry.checkpoints;

      return {
        id: entry.id,
        user_id: entry.user_id,
        user_email: authUserMap.get(entry.user_id)?.email ?? null,
        full_name: profileMap.get(entry.user_id)?.full_name ?? null,
        scanned_at: entry.scanned_at,
        checkpoint_name: checkpoint?.name ?? 'Checkpoint',
        checkpoint_description: checkpoint?.description ?? null
      };
    });

    return {
      items,
      page: query.page,
      limit: query.limit,
      total: count ?? 0
    };
  }

  async listCertificates(query: AdminCertificatesQuery) {
    return this.certificateService.listCertificates(query);
  }

  private async getSummary() {
    const [usersCount, checkpointsCount, checkinsCount, certificatesCount] = await Promise.all([
      this.countAuthUsers(),
      this.countRows('checkpoints'),
      this.countRows('checkins'),
      this.countRows('certificates')
    ]);

    return {
      users: usersCount,
      checkpoints: checkpointsCount,
      checkins: checkinsCount,
      certificates: certificatesCount
    };
  }

  private async countAuthUsers() {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (error) {
      throw new HttpError(500, `Erro ao contar usuários de autenticação: ${error.message}`);
    }

    return data.total ?? data.users.length ?? 0;
  }

  private async countRows(table: 'profiles' | 'checkpoints' | 'checkins' | 'certificates') {
    const { count, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });

    if (error) {
      throw new HttpError(500, `Erro ao contar registros de ${table}: ${error.message}`);
    }

    return count ?? 0;
  }

  private async enrichUsers(authUsers: AuthDirectoryUser[]) {
    const userIds = authUsers.map((user) => user.id);
    const [profiles, checkins, certificates] = await Promise.all([
      this.profileService.getProfilesByIds(userIds),
      this.listCheckinsForUsers(userIds),
      this.listCertificatesForUsers(userIds)
    ]);

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const certificateMap = new Map(certificates.map((certificate) => [certificate.user_id, certificate]));
    const totalCheckinsByUser = new Map<string, number>();

    for (const checkin of checkins) {
      totalCheckinsByUser.set(checkin.user_id, (totalCheckinsByUser.get(checkin.user_id) ?? 0) + 1);
    }

    return authUsers.map((user) => {
      const profile = profileMap.get(user.id);
      const certificate = certificateMap.get(user.id);

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        created_at: user.created_at,
        total_checkins: totalCheckinsByUser.get(user.id) ?? 0,
        has_certificate: Boolean(certificate),
        certificate_issued_at: certificate?.issued_at ?? null,
        is_admin: user.is_admin
      };
    });
  }

  private async getAuthUserById(userId: string): Promise<AuthDirectoryUser> {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !data.user) {
      throw new HttpError(404, 'Usuário não encontrado.');
    }

    const email = data.user.email ?? data.user.user_metadata.email ?? null;
    const role = resolveRoleFromMetadata({
      app_metadata: data.user.app_metadata,
      user_metadata: data.user.user_metadata
    });

    return {
      id: data.user.id,
      email,
      created_at: data.user.created_at,
      role,
      is_admin: isAdminRole(role),
      app_metadata: data.user.app_metadata,
      user_metadata: data.user.user_metadata
    };
  }

  private async listCheckinsForUsers(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('checkins')
      .select('user_id')
      .in('user_id', userIds);

    if (error) {
      throw new HttpError(500, `Erro ao listar check-ins por usuário: ${error.message}`);
    }

    return data ?? [];
  }

  private async listAuthUsersByIds(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin.rpc('admin_users_by_ids', { p_ids: userIds });

    if (error) {
      throw new HttpError(500, `Erro ao listar usuários de autenticação: ${error.message}`);
    }

    return ((data ?? []) as Array<{ id: string; email: string | null }>).map((user) => ({
      id: user.id,
      email: user.email
    }));
  }

  private async listCertificatesForUsers(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('user_id, issued_at')
      .in('user_id', userIds);

    if (error) {
      throw new HttpError(500, `Erro ao listar certificados por usuário: ${error.message}`);
    }

    return data ?? [];
  }
}
