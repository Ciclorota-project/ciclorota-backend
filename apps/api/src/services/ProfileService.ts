import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { PROFILE_AVATARS_BUCKET } from '../config/upload.js';

interface ProfileUpdateData {
  full_name?: string | null;
  avatar_url?: string | null;
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export class ProfileService {
  async getUserProfile(userId: string) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error('Perfil não encontrado no sistema.');
    }

    const { count: checkinsCount } = await supabaseAdmin
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: certificate } = await supabaseAdmin
      .from('certificates')
      .select('issued_at')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      ...profile,
      estatisticas: {
        total_pontos_visitados: checkinsCount || 0,
        possui_certificado: !!certificate,
        data_certificado: certificate?.issued_at || null
      }
    };
  }

  async updateProfile(userId: string, data: ProfileUpdateData) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    ) as ProfileUpdateData;

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhum campo válido foi enviado para atualização.');
    }

    const { data: updatedData, error } = await supabaseAdmin
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('id, full_name, avatar_url')
      .single();

    if (error) {
      throw new Error('Erro ao atualizar perfil: ' + error.message);
    }

    return updatedData;
  }

  async upsertProfile(userId: string, data: ProfileUpdateData) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    ) as ProfileUpdateData;

    if (Object.keys(payload).length === 0) {
      throw new Error('Nenhum campo válido foi enviado para atualização.');
    }

    const { data: updatedData, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          ...payload
        },
        {
          onConflict: 'id'
        }
      )
      .select('id, full_name, avatar_url')
      .single();

    if (error) {
      throw new Error('Erro ao fazer upsert do perfil: ' + error.message);
    }

    return updatedData;
  }

  async replaceAvatar(userId: string, file: { buffer: Buffer; mimetype: string }) {
    // Limpa avatares antigos do usuário (qualquer extensão), depois faz upload
    // novo com um nome único para evitar cache stale do CDN.
    const { data: existing, error: listError } = await supabaseAdmin.storage
      .from(PROFILE_AVATARS_BUCKET)
      .list(userId, { limit: 100 });

    if (listError) {
      throw new Error(`Erro ao listar avatares anteriores: ${listError.message}`);
    }

    if (existing && existing.length > 0) {
      const oldPaths = existing.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await supabaseAdmin.storage
        .from(PROFILE_AVATARS_BUCKET)
        .remove(oldPaths);
      if (removeError) {
        throw new Error(`Erro ao remover avatares antigos: ${removeError.message}`);
      }
    }

    const extension = MIME_EXTENSIONS[file.mimetype] ?? 'jpg';
    const storagePath = `${userId}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PROFILE_AVATARS_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erro ao enviar a foto de perfil: ${uploadError.message}`);
    }

    const {
      data: { publicUrl }
    } = supabaseAdmin.storage.from(PROFILE_AVATARS_BUCKET).getPublicUrl(storagePath);

    // Upsert para suportar o caso de conta nova sem linha em profiles ainda.
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, avatar_url: publicUrl }, { onConflict: 'id' })
      .select('id, full_name, avatar_url')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar perfil com novo avatar: ${error.message}`);
    }

    return data;
  }

  async getProfilesByIds(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, updated_at')
      .in('id', userIds);

    if (error) {
      throw new Error('Erro ao buscar perfis por lista de IDs.');
    }

    return data ?? [];
  }
}
