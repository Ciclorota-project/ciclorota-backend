import { randomUUID } from 'node:crypto';
import { imageSize } from 'image-size';
import { supabaseAdmin } from '../config/supabase.js';
import { CHECKPOINT_IMAGES_BUCKET } from '../config/upload.js';

const IMAGE_COLUMNS = 'id, url, position, width, height';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
}

export class CheckpointImageService {
  async listByCheckpoint(checkpointId: string) {
    const { data, error } = await supabaseAdmin
      .from('checkpoint_images')
      .select(IMAGE_COLUMNS)
      .eq('checkpoint_id', checkpointId)
      .order('position', { ascending: true });

    if (error) {
      throw new Error('Erro ao buscar as imagens do checkpoint.');
    }

    return data ?? [];
  }

  async addImages(checkpointId: string, files: UploadedFile[]) {
    await this.assertCheckpointExists(checkpointId);

    if (!files || files.length === 0) {
      throw new Error('Nenhuma imagem foi enviada.');
    }

    let nextPosition = await this.getNextPosition(checkpointId);
    const created = [] as Array<Record<string, unknown>>;

    for (const file of files) {
      const dimensions = readImageDimensions(file.buffer);
      const extension = MIME_EXTENSIONS[file.mimetype] ?? 'jpg';
      const storagePath = `${checkpointId}/${randomUUID()}.${extension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(CHECKPOINT_IMAGES_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Erro ao enviar a imagem para o storage: ${uploadError.message}`);
      }

      const {
        data: { publicUrl }
      } = supabaseAdmin.storage.from(CHECKPOINT_IMAGES_BUCKET).getPublicUrl(storagePath);

      const { data, error } = await supabaseAdmin
        .from('checkpoint_images')
        .insert([
          {
            checkpoint_id: checkpointId,
            url: publicUrl,
            storage_path: storagePath,
            position: nextPosition,
            width: dimensions.width,
            height: dimensions.height
          }
        ])
        .select(IMAGE_COLUMNS)
        .single();

      if (error) {
        // Evita órfãos: remove o arquivo recém-enviado se o insert falhar.
        await supabaseAdmin.storage.from(CHECKPOINT_IMAGES_BUCKET).remove([storagePath]);
        throw new Error(`Erro ao registrar a imagem: ${error.message}`);
      }

      created.push(data);
      nextPosition += 1;
    }

    return created;
  }

  async deleteImage(checkpointId: string, imageId: string) {
    const { data: image, error: fetchError } = await supabaseAdmin
      .from('checkpoint_images')
      .select('id, storage_path')
      .eq('id', imageId)
      .eq('checkpoint_id', checkpointId)
      .maybeSingle();

    if (fetchError) {
      throw new Error('Erro ao localizar a imagem do checkpoint.');
    }

    if (!image) {
      throw new Error('Imagem não encontrada para este checkpoint.');
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from(CHECKPOINT_IMAGES_BUCKET)
      .remove([image.storage_path]);

    if (storageError) {
      throw new Error(`Erro ao remover o arquivo do storage: ${storageError.message}`);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('checkpoint_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) {
      throw new Error(`Erro ao remover a imagem: ${deleteError.message}`);
    }
  }

  private async assertCheckpointExists(checkpointId: string) {
    const { data, error } = await supabaseAdmin
      .from('checkpoints')
      .select('id')
      .eq('id', checkpointId)
      .maybeSingle();

    if (error) {
      throw new Error('Erro ao validar o checkpoint.');
    }

    if (!data) {
      throw new Error('Checkpoint não encontrado.');
    }
  }

  private async getNextPosition(checkpointId: string) {
    const { data, error } = await supabaseAdmin
      .from('checkpoint_images')
      .select('position')
      .eq('checkpoint_id', checkpointId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error('Erro ao calcular a ordem da imagem.');
    }

    return data ? Number(data.position) + 1 : 0;
  }
}

function readImageDimensions(buffer: Buffer): { width: number | null; height: number | null } {
  try {
    const result = imageSize(buffer);
    return {
      width: typeof result.width === 'number' ? result.width : null,
      height: typeof result.height === 'number' ? result.height : null
    };
  } catch {
    // Mantém o upload mesmo se as dimensões não puderem ser lidas; apenas não as registramos.
    return { width: null, height: null };
  }
}
