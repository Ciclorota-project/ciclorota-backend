import { type Request, type Response } from 'express';
import { CheckpointService } from '../services/CheckpointService.js';
import { CheckpointImageService } from '../services/CheckpointImageService.js';
import { applyPaginationHeaders, parsePaginationQuery } from '../utils/pagination.js';
import { isUuid } from '../utils/validation.js';

export class CheckpointController {
  private readonly checkpointService = new CheckpointService();
  private readonly checkpointImageService = new CheckpointImageService();

  async index(request: Request, response: Response): Promise<void> {
    try {
      const checkpoints = await this.checkpointService.getAllCheckpoints();
      response.json(checkpoints);
    } catch (error: any) {
      response.status(500).json({ error: error.message || 'Erro ao listar checkpoints.' });
    }
  }

  async adminIndex(request: Request, response: Response): Promise<void> {
    try {
      const pagination = parsePaginationQuery(request.query.page, request.query.limit, {
        defaultLimit: 100,
        maxLimit: 250
      });
      const payload = await this.checkpointService.getAdminCheckpoints(pagination);
      applyPaginationHeaders(response, payload);
      response.json(payload.items);
    } catch (error: any) {
      response.status(500).json({ error: error.message || 'Erro ao listar checkpoints do admin.' });
    }
  }

  async store(request: Request, response: Response): Promise<void> {
    try {
      const checkpoint = await this.checkpointService.createCheckpoint({
        name: request.body?.name,
        description: request.body?.description,
        latitude: request.body?.latitude,
        longitude: request.body?.longitude,
        order: request.body?.order,
        map: request.body?.map ?? null,
        info: request.body?.info ?? null
      });

      response.status(201).json(checkpoint);
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Erro ao criar checkpoint.' });
    }
  }

  async update(request: Request, response: Response): Promise<void> {
    try {
      const checkpointId = normalizeRouteParam(request.params.checkpointId);

      if (!checkpointId || !isUuid(checkpointId)) {
        response.status(400).json({ error: 'O checkpointId precisa ser um UUID válido.' });
        return;
      }

      const checkpoint = await this.checkpointService.updateCheckpoint(checkpointId, {
        ...(request.body?.name !== undefined ? { name: request.body.name } : {}),
        ...(request.body?.description !== undefined ? { description: request.body.description } : {}),
        ...(request.body?.latitude !== undefined ? { latitude: request.body.latitude } : {}),
        ...(request.body?.longitude !== undefined ? { longitude: request.body.longitude } : {}),
        ...(request.body?.order !== undefined ? { order: request.body.order } : {}),
        ...(request.body?.map !== undefined ? { map: request.body.map } : {}),
        ...(request.body?.info !== undefined ? { info: request.body.info } : {})
      });

      response.json(checkpoint);
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Erro ao atualizar checkpoint.' });
    }
  }

  async listImages(request: Request, response: Response): Promise<void> {
    try {
      const checkpointId = normalizeRouteParam(request.params.checkpointId);

      if (!checkpointId || !isUuid(checkpointId)) {
        response.status(400).json({ error: 'O checkpointId precisa ser um UUID válido.' });
        return;
      }

      const images = await this.checkpointImageService.listByCheckpoint(checkpointId);
      response.json(images);
    } catch (error: any) {
      response.status(500).json({ error: error.message || 'Erro ao listar imagens do checkpoint.' });
    }
  }

  async addImages(request: Request, response: Response): Promise<void> {
    try {
      const checkpointId = normalizeRouteParam(request.params.checkpointId);

      if (!checkpointId || !isUuid(checkpointId)) {
        response.status(400).json({ error: 'O checkpointId precisa ser um UUID válido.' });
        return;
      }

      const files = Array.isArray(request.files) ? request.files : [];

      const images = await this.checkpointImageService.addImages(checkpointId, files);
      response.status(201).json(images);
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Erro ao enviar imagens do checkpoint.' });
    }
  }

  async deleteImage(request: Request, response: Response): Promise<void> {
    try {
      const checkpointId = normalizeRouteParam(request.params.checkpointId);
      const imageId = normalizeRouteParam(request.params.imageId);

      if (!checkpointId || !isUuid(checkpointId)) {
        response.status(400).json({ error: 'O checkpointId precisa ser um UUID válido.' });
        return;
      }

      if (!imageId || !isUuid(imageId)) {
        response.status(400).json({ error: 'O imageId precisa ser um UUID válido.' });
        return;
      }

      await this.checkpointImageService.deleteImage(checkpointId, imageId);
      response.status(204).send();
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Erro ao remover imagem do checkpoint.' });
    }
  }
}

function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
