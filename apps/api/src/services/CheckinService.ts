import { supabaseAdmin } from '../config/supabase.js';
import { HttpError } from '../utils/httpError.js';
import { SettingsService } from './SettingsService.js';

// Flag para desligar a validação Haversine em ambiente de teste/dev.
// Defina CHECKIN_DISABLE_GEOFENCE=true no .env do backend para permitir
// check-ins fora do raio do checkpoint (ex.: testar QR de casa). O painel
// admin controla o mesmo comportamento em produção via app_settings
// (tabela lida por SettingsService) — qualquer um dos dois desliga a validação.
const GEOFENCE_DISABLED_BY_ENV = (process.env.CHECKIN_DISABLE_GEOFENCE ?? '').toLowerCase() === 'true';

// Raio padrão (metros) usado quando o checkpoint não tem um valor customizado.
const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

interface CheckinInput {
  user_id: string;
  checkpoint_id: string;
  scanned_at: string;
  latitude_scanned?: number | null | undefined;
  longitude_scanned?: number | null | undefined;
}

interface UserCheckinInput {
  checkpoint_id: string;
  scanned_at: string;
  latitude_scanned?: number | null | undefined;
  longitude_scanned?: number | null | undefined;
}

function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Raio médio da Terra em metros
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distância em metros
}

export class CheckinService {
  private readonly settingsService = new SettingsService();

  async createCheckins(checkins: CheckinInput[]) {
    for (const checkin of checkins) {
      if (!checkin.user_id || !checkin.checkpoint_id || !checkin.scanned_at) {
        throw new Error('Todos os check-ins precisam informar checkpoint_id e scanned_at válidos.');
      }
    }

    const { geofence_disabled: geofenceDisabledInSettings } = await this.settingsService.getSettings();
    const geofenceDisabled = GEOFENCE_DISABLED_BY_ENV || geofenceDisabledInSettings;

    // O `checkpoint_id` que chega aqui é o UUID do checkpoint, lido
    // diretamente do conteúdo do QR Code escaneado pelo app.
    const checkpointReferences = checkins.map((checkin) => checkin.checkpoint_id);

    const { data: checkpointsData, error: fetchError } = await supabaseAdmin
      .from('checkpoints')
      .select('id, name, latitude, longitude, geofence_radius_meters')
      .or(buildCheckpointLookupFilter(checkpointReferences));

    if (fetchError) {
      throw new Error('Erro ao buscar os pontos da trilha no banco.');
    }

    const checkinsToInsert = checkins.map((checkin) => {
      const checkpointFound = checkpointsData?.find(
        (checkpoint) => checkpoint.id === checkin.checkpoint_id
      );

      if (!checkpointFound) {
        throw new Error(`Checkpoint não reconhecido pelo sistema: ${checkin.checkpoint_id}`);
      }

      // Validação de Geolocalização (Haversine) se as coordenadas do scan foram recebidas
      let distanceMeters: number | null = null;
      if (
        checkin.latitude_scanned !== undefined && checkin.latitude_scanned !== null &&
        checkin.longitude_scanned !== undefined && checkin.longitude_scanned !== null
      ) {
        if (checkpointFound.latitude !== null && checkpointFound.longitude !== null) {
          distanceMeters = calculateDistanceInMeters(
            checkpointFound.latitude,
            checkpointFound.longitude,
            checkin.latitude_scanned,
            checkin.longitude_scanned
          );

          // Se a distância for maior que o raio permitido, rejeita o check-in
          // por fraude! O raio pode ser customizado por checkpoint (admin);
          // sem customização, usa o padrão de 100m. Desligar a validação
          // (env var de teste ou toggle global no admin) mantém o cálculo da
          // distância (para registrar/auditar), mas não bloqueia.
          const allowedRadiusMeters = checkpointFound.geofence_radius_meters ?? DEFAULT_GEOFENCE_RADIUS_METERS;

          if (distanceMeters > allowedRadiusMeters && !geofenceDisabled) {
            throw new HttpError(
              400,
              `Validação de localização falhou para o ponto "${checkpointFound.name}". Você está muito longe do local correto (distância calculada: ${Math.round(distanceMeters)}m, limite permitido: ${Math.round(allowedRadiusMeters)}m).`
            );
          }
        }
      }

      return {
        user_id: checkin.user_id,
        checkpoint_id: checkpointFound.id,
        scanned_at: checkin.scanned_at,
        latitude_scanned: checkin.latitude_scanned ?? null,
        longitude_scanned: checkin.longitude_scanned ?? null,
        distance_meters: distanceMeters !== null ? Math.round(distanceMeters * 100) / 100 : null
      };
    });

    const repeatedCheckpointIds = findRepeatedCheckpointIds(checkinsToInsert.map((checkin) => checkin.checkpoint_id));

    if (repeatedCheckpointIds.length > 0) {
      throw new HttpError(409, 'O mesmo checkpoint foi enviado mais de uma vez na mesma sincronização.');
    }

    const { data, error } = await supabaseAdmin
      .from('checkins')
      .insert(checkinsToInsert)
      .select();

    if (error) {
      throw error;
    }

    return data;
  }

  async createCheckinsForUser(userId: string, checkins: UserCheckinInput[]) {
    return this.createCheckins(
      checkins.map((checkin) => ({
        user_id: userId,
        checkpoint_id: checkin.checkpoint_id,
        scanned_at: checkin.scanned_at,
        latitude_scanned: checkin.latitude_scanned ?? null,
        longitude_scanned: checkin.longitude_scanned ?? null
      }))
    );
  }
}

function buildCheckpointLookupFilter(references: string[]) {
  const escapedReferences = references
    .filter((reference) => typeof reference === 'string' && reference.length > 0)
    .map((reference) => reference.replace(/,/g, '\\,'));

  return `id.in.(${escapedReferences.join(',')})`;
}

function findRepeatedCheckpointIds(checkpointIds: string[]) {
  const seenIds = new Set<string>();
  const repeatedIds = new Set<string>();

  for (const checkpointId of checkpointIds) {
    if (seenIds.has(checkpointId)) {
      repeatedIds.add(checkpointId);
      continue;
    }

    seenIds.add(checkpointId);
  }

  return [...repeatedIds];
}
