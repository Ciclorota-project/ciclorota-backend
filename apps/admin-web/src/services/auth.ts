import type { AuthLoginResponse, AuthSessionPayload } from '@ciclorota/shared';
import { requestJson } from '../lib/api';

export function fetchAuthMe(accessToken: string) {
  return requestJson<AuthSessionPayload>('/auth/me', { accessToken });
}

// Login passa pelo backend (em vez de supabase.auth.signInWithPassword direto
// no browser) para que a API aplique o bloqueio por tentativas falhas antes
// de consultar o Supabase. Depois do sucesso, a sessão retornada é injetada
// no client Supabase via supabase.auth.setSession para manter a persistência
// e o refresh automático de sempre.
export function loginAdmin(email: string, password: string) {
  return requestJson<AuthLoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
}
