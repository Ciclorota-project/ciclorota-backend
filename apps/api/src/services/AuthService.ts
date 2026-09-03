import type { Session, User } from '@supabase/supabase-js';
import { isAdminRole, resolveRoleFromUser } from '../config/admin.js';
import { createSupabaseAuthClient } from '../config/supabase.js';
import type { AuthContext, AuthSessionResponse, AuthUserResponse } from '../types/auth.js';
import { ProfileService } from './ProfileService.js';

export class AuthService {
  private readonly profileService = new ProfileService();

  async login(email: string, password: string) {
    const authClient = createSupabaseAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(`Falha no login: ${error.message}`);
    }

    if (!data.session || !data.user) {
      throw new Error('O Supabase não retornou uma sessão válida.');
    }

    return {
      session: this.serializeSession(data.session),
      user: this.serializeUser(data.user),
      profile: await this.getProfileSafely(data.user.id)
    };
  }

  async refresh(refreshToken: string) {
    const authClient = createSupabaseAuthClient();
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      throw new Error(`Falha ao renovar a sessão: ${error.message}`);
    }

    if (!data.session || !data.user) {
      throw new Error('O Supabase não retornou uma sessão renovada.');
    }

    return {
      session: this.serializeSession(data.session),
      user: this.serializeUser(data.user),
      profile: await this.getProfileSafely(data.user.id)
    };
  }

  async getAuthContext(accessToken: string): Promise<AuthContext> {
    const authClient = createSupabaseAuthClient();
    const { data, error } = await authClient.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new Error('Token inválido ou expirado.');
    }

    return this.toAuthContext(data.user, accessToken);
  }

  async getCurrentSession(accessToken: string) {
    const auth = await this.getAuthContext(accessToken);

    return {
      user: this.serializeAuthContext(auth),
      profile: await this.getProfileSafely(auth.userId)
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.profileService.deleteAccount(userId);
  }

  private serializeSession(session: Session): AuthSessionResponse {
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? null,
      expires_in: session.expires_in ?? null,
      token_type: session.token_type
    };
  }

  private serializeUser(user: User): AuthUserResponse {
    const email = this.getUserEmail(user);
    const role = resolveRoleFromUser(user);

    return {
      id: user.id,
      email,
      role,
      is_admin: isAdminRole(role)
    };
  }

  private serializeAuthContext(auth: AuthContext): AuthUserResponse {
    return {
      id: auth.userId,
      email: auth.email,
      role: auth.role,
      is_admin: auth.isAdmin
    };
  }

  private toAuthContext(user: User, accessToken: string): AuthContext {
    const email = this.getUserEmail(user);
    const role = resolveRoleFromUser(user);

    return {
      userId: user.id,
      email,
      accessToken,
      role,
      isAdmin: isAdminRole(role)
    };
  }

  private getUserEmail(user: User) {
    return user.email ?? user.user_metadata.email ?? null;
  }

  private async getProfileSafely(userId: string) {
    try {
      return await this.profileService.getUserProfile(userId);
    } catch {
      return null;
    }
  }
}
