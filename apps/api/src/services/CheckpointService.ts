import { supabaseAdmin } from '../config/supabase.js';
import type { PaginatedResult, PaginationParams } from '../utils/pagination.js';

interface CheckpointInput {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  order: number;
  map?: string | null;
  info?: string | null;
}

type CheckpointUpdateInput = Partial<CheckpointInput>;

export class CheckpointService {
  async getAllCheckpoints() {
    const { data, error } = await supabaseAdmin
      .from('checkpoints')
      .select('id, name, description, latitude, longitude, map, info')
      .order('order', { ascending: true });

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
      .select('id, created_at, name, description, latitude, longitude, order, map, info', {
        count: 'exact'
      })
      .order('order', { ascending: true })
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

  async createCheckpoint(input: CheckpointInput) {
    validateCheckpointInput(input);

    const { data, error } = await supabaseAdmin
      .from('checkpoints')
      .insert([input])
      .select('id, created_at, name, description, latitude, longitude, order, map, info')
      .single();

    if (error) {
      throw new Error(`Erro ao criar checkpoint: ${error.message}`);
    }

    return data;
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
      .select('id, created_at, name, description, latitude, longitude, order, map, info')
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
}
