import { type Request, type Response } from 'express';
import { canAccessUser } from '../middleware/auth.js';
import { ProfileService } from '../services/ProfileService.js';
import { getErrorMessage, getErrorStatus, HttpError } from '../utils/httpError.js';
import { isHttpUrl, isUuid, normalizeOptionalTrimmedString } from '../utils/validation.js';

export class ProfileController {
  private readonly profileService = new ProfileService();

  async show(request: Request, response: Response): Promise<void> {
    const userId = normalizeRouteParam(request.params.userId);
    await this.respondWithProfile(request, response, userId);
  }

  async showMe(request: Request, response: Response): Promise<void> {
    await this.respondWithProfile(request, response, request.auth?.userId);
  }

  async update(request: Request, response: Response): Promise<void> {
    const userId = normalizeRouteParam(request.params.userId);
    await this.updateProfile(request, response, userId);
  }

  async updateMe(request: Request, response: Response): Promise<void> {
    await this.updateProfile(request, response, request.auth?.userId);
  }

  async uploadMyAvatar(request: Request, response: Response): Promise<void> {
    try {
      const userId = request.auth?.userId;
      if (!userId) {
        response.status(401).json({ error: 'Sessão inválida.' });
        return;
      }
      if (!isUuid(userId)) {
        response.status(400).json({ error: 'O ID do usuário precisa ser um UUID válido.' });
        return;
      }

      const file = request.file;
      if (!file) {
        response.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
        return;
      }

      const updated = await this.profileService.replaceAvatar(userId, {
        buffer: file.buffer,
        mimetype: file.mimetype
      });

      response.json(updated);
    } catch (error: any) {
      response
        .status(getErrorStatus(error, 500))
        .json({ error: getErrorMessage(error, 'Erro ao atualizar a foto de perfil.') });
    }
  }

  private async respondWithProfile(request: Request, response: Response, userId?: string): Promise<void> {
    try {
      if (!userId) {
        response.status(400).json({ error: 'O ID do usuário é obrigatório.' });
        return;
      }

      if (!isUuid(userId)) {
        response.status(400).json({ error: 'O ID do usuário precisa ser um UUID válido.' });
        return;
      }

      if (!canAccessUser(request, userId)) {
        response.status(403).json({ error: 'Você não pode visualizar o perfil de outro usuário.' });
        return;
      }

      const profileData = await this.profileService.getUserProfile(userId);
      response.json(profileData);
    } catch (error: any) {
      response.status(404).json({ error: error.message || 'Erro ao buscar o perfil.' });
    }
  }

  private async updateProfile(request: Request, response: Response, userId?: string): Promise<void> {
    try {
      const normalizedProfile = normalizeProfileUpdatePayload(request.body ?? {});

      if (!userId) {
        response.status(400).json({ error: 'O ID do usuário é obrigatório.' });
        return;
      }

      if (!isUuid(userId)) {
        response.status(400).json({ error: 'O ID do usuário precisa ser um UUID válido.' });
        return;
      }

      if (!canAccessUser(request, userId)) {
        response.status(403).json({ error: 'Você não pode atualizar o perfil de outro usuário.' });
        return;
      }

      // upsert para que contas recém-criadas (sem linha em `profiles`) consigam
      // gravar nome/avatar logo no primeiro acesso (fluxo de complete profile).
      const updatedProfile = await this.profileService.upsertProfile(userId, normalizedProfile);

      response.json(updatedProfile);
    } catch (error: any) {
      response.status(getErrorStatus(error, 500)).json({ error: getErrorMessage(error, 'Erro ao atualizar o perfil.') });
    }
  }
}

function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeProfileUpdatePayload(payload: Record<string, unknown>) {
  const fullName = normalizeOptionalTrimmedString(payload.full_name);
  const avatarUrl = payload.avatar_url === null ? null : normalizeOptionalTrimmedString(payload.avatar_url);

  if (fullName !== undefined && fullName.length > 120) {
    throw new HttpError(400, 'O campo full_name aceita no máximo 120 caracteres.');
  }

  if (avatarUrl !== undefined && avatarUrl !== '' && avatarUrl !== null && !isHttpUrl(avatarUrl)) {
    throw new HttpError(400, 'O campo avatar_url precisa ser uma URL http(s) válida ou null.');
  }

  const normalizedPayload = {
    ...(fullName !== undefined ? { full_name: fullName || null } : {}),
    ...(avatarUrl !== undefined ? { avatar_url: avatarUrl || null } : {})
  };

  if (Object.keys(normalizedPayload).length === 0) {
    throw new HttpError(400, 'Nenhum campo válido foi enviado para atualização.');
  }

  return normalizedPayload;
}
