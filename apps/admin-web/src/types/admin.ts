import type { AppRole, AuthUser } from '@ciclorota/shared';

export type AdminView = 'overview' | 'users' | 'checkpoints' | 'checkins' | 'certificates';

export interface AdminSessionState {
  accessToken: string;
  user: AuthUser;
}

export interface UsersFilterState {
  search: string;
  role: 'all' | AppRole;
}

export interface CheckinsFilterState {
  userId: string;
  checkpointId: string;
}

export interface CertificatesFilterState {
  userId: string;
}

export interface UserDraftState {
  full_name: string;
  avatar_url: string;
  role: AppRole;
}

export interface CheckpointFormState {
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  order: string;
  map: string;
  info: string;
  geofenceRadiusEnabled: boolean;
  geofenceRadiusMeters: string;
}
