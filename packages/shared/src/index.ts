export type AppRole = 'user' | 'admin' | 'superadmin';

export interface ApiRootResponse {
  mensagem: string;
}

export interface ApiErrorResponse {
  error: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  role: AppRole;
  is_admin: boolean;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  expires_in: number | null;
  token_type: string;
}

export interface CheckpointImage {
  id: string;
  url: string;
  position: number;
  width: number | null;
  height: number | null;
}

export interface Checkpoint {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  map: string | null;
  info?: string | null;
  images?: CheckpointImage[];
}

export interface AdminCheckpoint extends Checkpoint {
  created_at: string;
  order: number;
  map: string | null;
  info?: string | null;
  geofence_radius_meters: number | null;
}

export interface CheckinPayload {
  checkpoint_id: string;
  scanned_at: string;
}

export interface ProgressCheckpoint {
  id: string;
  name: string;
  description: string;
}

export interface ProgressEntry {
  id: string;
  scanned_at: string;
  checkpoints: ProgressCheckpoint;
}

export interface ProgressResponse {
  total_visitados: number;
  historico: ProgressEntry[];
}

export interface UserStatistics {
  total_pontos_visitados: number;
  possui_certificado: boolean;
  data_certificado: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  estatisticas: UserStatistics;
}

export interface ProfileUpdateInput {
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface Certificate {
  user_id: string;
  issued_at?: string;
}

export interface AuthSessionPayload {
  user: AuthUser;
  profile: UserProfile | null;
}

export interface AuthLoginResponse extends AuthSessionPayload {
  session: AuthSession;
}

export interface AdminSummary {
  users: number;
  checkpoints: number;
  checkins: number;
  certificates: number;
}

export interface AdminUserRecord {
  id: string;
  email: string | null;
  role: AppRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  total_checkins: number;
  has_certificate: boolean;
  certificate_issued_at: string | null;
  is_admin: boolean;
}

export interface AdminRecentCheckin {
  id: string;
  user_id: string;
  user_email: string | null;
  full_name: string | null;
  scanned_at: string;
  checkpoint_name: string;
  checkpoint_description: string | null;
}

export interface AdminCertificateRecord {
  user_id: string;
  issued_at: string;
  verification_code: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface AdminOverviewResponse {
  summary: AdminSummary;
  users: AdminUserRecord[];
  recent_checkins: AdminRecentCheckin[];
  checkpoints: AdminCheckpoint[];
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  role?: AppRole;
  search?: string;
}

export interface AdminCheckinsQuery {
  page?: number;
  limit?: number;
  userId?: string;
  checkpointId?: string;
}

export interface AdminCertificatesQuery {
  page?: number;
  limit?: number;
  userId?: string;
}

export interface AdminUserPatchInput {
  role?: AppRole;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface AdminCheckpointInput {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  order: number;
  map?: string | null;
  info?: string | null;
  geofence_radius_meters?: number | null;
}

export type AdminCheckpointPatchInput = Partial<AdminCheckpointInput>;

export interface AdminSettings {
  geofence_disabled: boolean;
}

export type AdminSettingsPatchInput = Partial<AdminSettings>;

export interface AdminCertificateIssueResponse {
  mensagem: string;
  certificado: {
    id: string;
    user_id: string;
    issued_at: string;
  };
}
