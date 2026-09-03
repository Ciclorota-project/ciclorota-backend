import { type Request, type Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { LoginRateLimiter, normalizeLoginRateLimitKey } from '../services/LoginRateLimiter.js';

export class AuthController {
  private readonly authService = new AuthService();
  private readonly loginRateLimiter = new LoginRateLimiter();

  async login(request: Request, response: Response): Promise<void> {
    const { email, password } = request.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      response.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      return;
    }

    const rateLimitKey = normalizeLoginRateLimitKey(email);
    const lockedForMs = this.loginRateLimiter.checkLocked(rateLimitKey);

    if (lockedForMs !== null) {
      const retryAfterSeconds = Math.ceil(lockedForMs / 1000);
      response.status(429).json({
        error: `Muitas tentativas de login com este e-mail. Tente novamente em ${retryAfterSeconds}s.`,
        retry_after_seconds: retryAfterSeconds
      });
      return;
    }

    try {
      const payload = await this.authService.login(email, password);
      this.loginRateLimiter.registerSuccess(rateLimitKey);
      response.json(payload);
    } catch (error: any) {
      this.loginRateLimiter.registerFailure(rateLimitKey);
      response.status(401).json({ error: error.message || 'Falha ao autenticar usuário.' });
    }
  }

  async refresh(request: Request, response: Response): Promise<void> {
    try {
      const { refreshToken } = request.body ?? {};

      if (typeof refreshToken !== 'string' || !refreshToken) {
        response.status(400).json({ error: 'O refresh token é obrigatório.' });
        return;
      }

      const payload = await this.authService.refresh(refreshToken);
      response.json(payload);
    } catch (error: any) {
      response.status(401).json({ error: error.message || 'Falha ao renovar a sessão.' });
    }
  }

  async me(request: Request, response: Response): Promise<void> {
    try {
      if (!request.auth?.accessToken) {
        response.status(401).json({ error: 'Sessão não encontrada.' });
        return;
      }

      const payload = await this.authService.getCurrentSession(request.auth.accessToken);
      response.json(payload);
    } catch (error: any) {
      response.status(401).json({ error: error.message || 'Falha ao carregar a sessão atual.' });
    }
  }

  async deleteMyAccount(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.auth?.userId;

      if (!userId) {
        response.status(401).json({ error: 'Sessão inválida.' });
        return;
      }

      await this.authService.deleteAccount(userId);
      response.status(204).send();
    } catch (error: any) {
      response.status(500).json({ error: error.message || 'Não foi possível excluir a conta.' });
    }
  }
}
