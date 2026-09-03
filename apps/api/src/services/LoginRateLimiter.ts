// Proteção simples contra força-bruta no login: bloqueia por e-mail depois de
// algumas tentativas seguidas com senha errada. Estado em memória (por
// processo) — suficiente para o painel admin, que tem poucos usuários
// conhecidos; reinicia a cada deploy/restart do servidor.
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_MS = 60_000;

interface AttemptState {
  failCount: number;
  lockedUntil: number | null;
}

export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptState>();

  /** Retorna quantos ms faltam para desbloquear, ou null se não está bloqueado. */
  checkLocked(key: string): number | null {
    const state = this.attempts.get(key);

    if (!state?.lockedUntil) {
      return null;
    }

    const remainingMs = state.lockedUntil - Date.now();

    if (remainingMs <= 0) {
      this.attempts.delete(key);
      return null;
    }

    return remainingMs;
  }

  registerFailure(key: string): void {
    const state = this.attempts.get(key) ?? { failCount: 0, lockedUntil: null };
    state.failCount += 1;

    if (state.failCount >= MAX_FAILED_ATTEMPTS) {
      state.lockedUntil = Date.now() + LOCKOUT_MS;
      state.failCount = 0;
    }

    this.attempts.set(key, state);
  }

  registerSuccess(key: string): void {
    this.attempts.delete(key);
  }
}

export function normalizeLoginRateLimitKey(email: string): string {
  return email.trim().toLowerCase();
}
