import { useEffect, useState } from 'react';
import type { UserProfile } from '@ciclorota/shared';
import { toAdminSessionState } from '../lib/auth';
import { hasSupabaseConfig, supabase } from '../lib/env';
import { ApiRequestError, toErrorMessage } from '../lib/errors';
import { fetchAuthMe, loginAdmin } from '../services/auth';
import type { AdminSessionState } from '../types/admin';

export function useAdminSession() {
  const [session, setSession] = useState<AdminSessionState | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function bootstrapSession() {
      if (!supabase) {
        setRestoring(false);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
        setRestoring(false);
        return;
      }

      setSession(data.session ? toAdminSessionState(data.session) : null);
      setRestoring(false);
    }

    void bootstrapSession();

    if (!supabase) {
      return undefined;
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession ? toAdminSessionState(nextSession) : null);

      if (!nextSession) {
        setProfile(null);
      }

      setRestoring(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      setProfile(null);
      return;
    }

    let active = true;
    const accessToken = session.accessToken;

    async function validateSession() {
      try {
        setValidating(true);
        setError(null);

        const payload = await fetchAuthMe(accessToken);

        if (!active) {
          return;
        }

        setSession((currentValue) =>
          currentValue
            ? {
                ...currentValue,
                user: payload.data.user
              }
            : currentValue
        );
        setProfile(payload.data.profile);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        if (caughtError instanceof ApiRequestError && caughtError.status === 401) {
          if (supabase) {
            await supabase.auth.signOut();
          }

          setSession(null);
          setProfile(null);
          setError('Sua sessao expirou. Entre novamente para continuar.');
          return;
        }

        setError(toErrorMessage(caughtError));
      } finally {
        if (active) {
          setValidating(false);
        }
      }
    }

    void validateSession();

    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  async function signIn(email: string, password: string) {
    if (!supabase) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para autenticar o admin web.');
      return false;
    }

    try {
      setBusy(true);
      setError(null);

      const { data: loginPayload } = await loginAdmin(email, password);

      // Injeta a sessão retornada pela API no client Supabase para manter a
      // persistência local e o refresh automático de sempre — sem isso, um
      // reload da página perderia a sessão mesmo com o login tendo funcionado.
      const { data, error: setSessionError } = await supabase.auth.setSession({
        access_token: loginPayload.session.access_token,
        refresh_token: loginPayload.session.refresh_token
      });

      if (setSessionError) {
        throw setSessionError;
      }

      if (!data.session) {
        throw new Error('Nao foi possivel recuperar a sessao do Supabase.');
      }

      setSession(toAdminSessionState(data.session));
      return true;
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setSession(null);
    setProfile(null);
    setError(null);
  }

  function clearError() {
    setError(null);
  }

  return {
    hasSupabaseConfig,
    session,
    profile,
    restoring: restoring || validating,
    busy,
    error,
    clearError,
    signIn,
    signOut
  };
}
