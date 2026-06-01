import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

export const CHECKPOINT_IMAGES_BUCKET = 'checkpoint-images';
export const PROFILE_AVATARS_BUCKET = 'profile-avatars';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB — espaço suficiente para fotos Full HD.
const MAX_FILES_PER_REQUEST = 10;
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB para avatar (já vem cropado do app).

const storage = multer.memoryStorage();

const uploader = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_REQUEST
  },
  fileFilter(_request, file, callback) {
    if ((ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error('Formato inválido. Envie imagens JPEG, PNG ou WebP.'));
  }
});

const uploadFilesMiddleware = uploader.array('files', MAX_FILES_PER_REQUEST);

// Uploader separado para avatar — single file, limite menor.
const avatarUploader = multer({
  storage,
  limits: { fileSize: AVATAR_MAX_SIZE_BYTES, files: 1 },
  fileFilter(_request, file, callback) {
    if ((ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error('Formato inválido. Envie JPEG, PNG ou WebP.'));
  }
});

const uploadAvatarMiddleware = avatarUploader.single('file');

export function uploadProfileAvatar(request: Request, response: Response, next: NextFunction): void {
  uploadAvatarMiddleware(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'A foto de perfil deve ter no máximo 5 MB.'
          : 'Falha ao processar o upload da foto.';
      response.status(400).json({ error: message });
      return;
    }

    response.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao processar a foto de perfil.'
    });
  });
}

// Traduz erros do multer (tamanho/limite/formato) em respostas 400 limpas.
export function uploadCheckpointImages(request: Request, response: Response, next: NextFunction): void {
  uploadFilesMiddleware(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Cada imagem deve ter no máximo 12 MB.'
          : error.code === 'LIMIT_FILE_COUNT'
            ? `Envie no máximo ${MAX_FILES_PER_REQUEST} imagens por vez.`
            : 'Falha ao processar o upload das imagens.';
      response.status(400).json({ error: message });
      return;
    }

    response.status(400).json({
      error: error instanceof Error ? error.message : 'Falha ao processar o upload das imagens.'
    });
  });
}
