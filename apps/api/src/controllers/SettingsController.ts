import { type Request, type Response } from 'express';
import { SettingsService } from '../services/SettingsService.js';

export class SettingsController {
  private readonly settingsService = new SettingsService();

  async show(request: Request, response: Response): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();
      response.json(settings);
    } catch (error: any) {
      response.status(500).json({ error: error.message || 'Erro ao buscar configurações do app.' });
    }
  }

  async update(request: Request, response: Response): Promise<void> {
    try {
      if (request.body?.geofence_disabled !== undefined && typeof request.body.geofence_disabled !== 'boolean') {
        response.status(400).json({ error: 'O campo geofence_disabled precisa ser booleano.' });
        return;
      }

      const settings = await this.settingsService.updateSettings({
        ...(request.body?.geofence_disabled !== undefined ? { geofence_disabled: request.body.geofence_disabled } : {})
      });

      response.json(settings);
    } catch (error: any) {
      response.status(400).json({ error: error.message || 'Erro ao atualizar configurações do app.' });
    }
  }
}
