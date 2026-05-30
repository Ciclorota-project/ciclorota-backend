import { type Request, type Response } from 'express';
import { CheckinService } from '../services/CheckinService.js';
import { getErrorMessage, getErrorStatus, HttpError } from '../utils/httpError.js';
import { isIsoDateString, normalizeOptionalTrimmedString } from '../utils/validation.js';

export class CheckinController {
  private readonly checkinService = new CheckinService();

  async store(request: Request, response: Response): Promise<void> {
    try {
      if (!request.auth?.userId) {
        response.status(401).json({ error: 'Sessão não encontrada.' });
        return;
      }

      const checkins = request.body;

      if (!Array.isArray(checkins) || checkins.length === 0) {
        response.status(400).json({ error: 'Nenhum dado de check-in foi enviado ou o formato é inválido.' });
        return;
      }

      if (checkins.length > 100) {
        response.status(400).json({ error: 'Envie no máximo 100 check-ins por sincronização.' });
        return;
      }

      const normalizedCheckins = checkins.map(normalizeCheckinPayload);

      const data = await this.checkinService.createCheckinsForUser(request.auth.userId, normalizedCheckins);

      response.status(201).json({
        mensagem: 'Check-ins sincronizados com sucesso na Mata Atlântica!',
        dados: data
      });
    } catch (error: any) {
      handleCheckinError(response, error);
    }
  }

  async storeMe(request: Request, response: Response): Promise<void> {
    return this.store(request, response);
  }
}

function handleCheckinError(response: Response, error: any) {
  if (error.code === '23505') {
    response.status(409).json({ error: 'Um ou mais pontos já foram visitados por este utilizador!' });
    return;
  }

  response.status(getErrorStatus(error, 400)).json({ error: getErrorMessage(error, 'Erro interno no servidor.') });
}

function normalizeCheckinPayload(checkin: any) {
  const checkpointId = normalizeOptionalTrimmedString(checkin?.checkpoint_id);
  const scannedAt = normalizeOptionalTrimmedString(checkin?.scanned_at);
  const latitudeScanned = checkin?.latitude_scanned != null ? Number(checkin.latitude_scanned) : null;
  const longitudeScanned = checkin?.longitude_scanned != null ? Number(checkin.longitude_scanned) : null;

  if (!checkpointId) {
    throw new HttpError(400, 'Cada check-in precisa informar checkpoint_id.');
  }

  if (!scannedAt || !isIsoDateString(scannedAt)) {
    throw new HttpError(400, 'Cada check-in precisa informar scanned_at em formato ISO-8601 válido.');
  }

  if (latitudeScanned !== null && (isNaN(latitudeScanned) || latitudeScanned < -90 || latitudeScanned > 90)) {
    throw new HttpError(400, 'A latitude do scan enviada é inválida.');
  }

  if (longitudeScanned !== null && (isNaN(longitudeScanned) || longitudeScanned < -180 || longitudeScanned > 180)) {
    throw new HttpError(400, 'A longitude do scan enviada é inválida.');
  }

  return {
    checkpoint_id: checkpointId,
    scanned_at: scannedAt,
    latitude_scanned: latitudeScanned,
    longitude_scanned: longitudeScanned
  };
}
