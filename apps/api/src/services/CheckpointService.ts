import { supabaseAdmin } from '../config/supabase.js';
import { CHECKPOINT_IMAGES_BUCKET } from '../config/upload.js';
import type { PaginatedResult, PaginationParams } from '../utils/pagination.js';

interface CheckpointInput {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  order: number;
  map?: string | null;
  info?: string | null;
  geofence_radius_meters?: number | null;
}

type CheckpointUpdateInput = Partial<CheckpointInput>;

export class CheckpointService {
  async getAllCheckpoints() {
    const { data, error } = await supabaseAdmin
      .from('checkpoints')
      .select(
        'id, name, description, latitude, longitude, map, info, images:checkpoint_images(id, url, position, width, height)'
      )
      .order('order', { ascending: true })
      .order('position', { referencedTable: 'checkpoint_images', ascending: true });

    if (error) {
      throw new Error('Erro ao buscar checkpoints.');
    }

    return data;
  }

  async getAdminCheckpoints(pagination?: PaginationParams): Promise<PaginatedResult<any>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 100;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseAdmin
      .from('checkpoints')
      .select(
        'id, created_at, name, description, latitude, longitude, order, map, info, geofence_radius_meters, images:checkpoint_images(id, url, position, width, height)',
        {
          count: 'exact'
        }
      )
      .order('order', { ascending: true })
      .order('position', { referencedTable: 'checkpoint_images', ascending: true })
      .range(from, to);

    if (error) {
      throw new Error('Erro ao buscar checkpoints para o admin.');
    }

    return {
      items: data ?? [],
      page,
      limit,
      total: count ?? 0
    };
  }

  async getCheckpointById(checkpointId: string) {
    const { data, error } = await supabaseAdmin
      .from('checkpoints')
      .select('id, name')
      .eq('id', checkpointId)
      .maybeSingle();

    if (error) {
      throw new Error('Erro ao buscar checkpoint.');
    }

    return data;
  }

  async createCheckpoint(input: CheckpointInput) {
    validateCheckpointInput(input);

    const { data, error } = await supabaseAdmin
      .from('checkpoints')
      .insert([input])
      .select('id, created_at, name, description, latitude, longitude, order, map, info, geofence_radius_meters')
      .single();

    if (error) {
      throw new Error(`Erro ao criar checkpoint: ${error.message}`);
    }

    return data;
  }

  async deleteCheckpoint(checkpointId: string) {
    // Limpeza explícita das dependências. Funciona mesmo em bancos cuja
    // FK não esteja configurada com `ON DELETE CASCADE` (a baseline
    // declara, mas alguns ambientes divergiram). A migração 20260601_5
    // recria as FKs com cascade — esta limpeza dá margem extra de segurança
    // e cobre os arquivos de Storage que o cascade não toca.

    // 1) Arquivos das imagens no Storage (FK do DB não consegue tocar).
    const { data: images, error: imagesError } = await supabaseAdmin
      .from('checkpoint_images')
      .select('storage_path')
      .eq('checkpoint_id', checkpointId);

    if (imagesError) {
      throw new Error('Erro ao listar imagens do checkpoint para exclusão.');
    }

    if (images && images.length > 0) {
      const paths = images.map((image) => image.storage_path).filter(Boolean);
      if (paths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from(CHECKPOINT_IMAGES_BUCKET)
          .remove(paths);
        if (storageError) {
          throw new Error(`Erro ao limpar imagens do checkpoint: ${storageError.message}`);
        }
      }
    }

    // 2) Rows da tabela `checkpoint_images`.
    const { error: deleteImagesError } = await supabaseAdmin
      .from('checkpoint_images')
      .delete()
      .eq('checkpoint_id', checkpointId);

    if (deleteImagesError) {
      throw new Error(`Erro ao remover imagens vinculadas: ${deleteImagesError.message}`);
    }

    // 3) Check-ins dos usuários vinculados (causa do FK violation).
    const { error: deleteCheckinsError } = await supabaseAdmin
      .from('checkins')
      .delete()
      .eq('checkpoint_id', checkpointId);

    if (deleteCheckinsError) {
      throw new Error(`Erro ao remover check-ins vinculados: ${deleteCheckinsError.message}`);
    }

    // 4) O checkpoint em si.
    const { error } = await supabaseAdmin
      .from('checkpoints')
      .delete()
      .eq('id', checkpointId);

    if (error) {
      throw new Error(`Erro ao excluir checkpoint: ${error.message}`);
    }
  }

  async updateCheckpoint(checkpointId: string, input: CheckpointUpdateInput) {
    const payload = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined)
    ) as CheckpointUpdateInput;

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhum campo válido foi enviado para atualizar o checkpoint.');
    }

    validateCheckpointInput(payload, true);

    const { data, error } = await supabaseAdmin
      .from('checkpoints')
      .update(payload)
      .eq('id', checkpointId)
      .select('id, created_at, name, description, latitude, longitude, order, map, info, geofence_radius_meters')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar checkpoint: ${error.message}`);
    }

    return data;
  }
}

function validateCheckpointInput(input: CheckpointUpdateInput, partial = false) {
  const requiredKeys: Array<keyof CheckpointInput> = ['name', 'description', 'latitude', 'longitude', 'order'];

  if (!partial) {
    for (const key of requiredKeys) {
      if (input[key] === undefined || input[key] === null || input[key] === '') {
        throw new Error(`O campo ${key} é obrigatório.`);
      }
    }
  }

  if (input.name !== undefined && typeof input.name !== 'string') {
    throw new Error('O campo name precisa ser texto.');
  }

  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new Error('O campo description precisa ser texto.');
  }



  if (input.map !== undefined && input.map !== null && typeof input.map !== 'string') {
    throw new Error('O campo map precisa ser texto ou null.');
  }

  if (input.info !== undefined && input.info !== null && typeof input.info !== 'string') {
    throw new Error('O campo info precisa ser texto ou null.');
  }

  if (input.latitude !== undefined && typeof input.latitude !== 'number') {
    throw new Error('O campo latitude precisa ser numérico.');
  }

  if (input.longitude !== undefined && typeof input.longitude !== 'number') {
    throw new Error('O campo longitude precisa ser numérico.');
  }

  if (input.order !== undefined && (!Number.isInteger(input.order) || input.order <= 0)) {
    throw new Error('O campo order precisa ser um inteiro positivo.');
  }

  if (
    input.geofence_radius_meters !== undefined &&
    input.geofence_radius_meters !== null &&
    (typeof input.geofence_radius_meters !== 'number' || !Number.isFinite(input.geofence_radius_meters) || input.geofence_radius_meters <= 0)
  ) {
    throw new Error('O campo geofence_radius_meters precisa ser um número positivo ou null.');
  }
}
