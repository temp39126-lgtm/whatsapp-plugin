import multer from 'multer';
import { env } from '../config/env';
import { ALLOWED_MIME_TYPES } from '../utils/mediaType';
import { isAvatarMimeType } from '../services/avatars/avatarService';

const maxSize = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxSize },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

export const avatarUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAvatarMimeType(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Avatar must be a JPEG, PNG, WebP, or GIF image'));
  },
});
