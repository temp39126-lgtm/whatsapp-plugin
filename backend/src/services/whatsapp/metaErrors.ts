import { AppError } from '../../types';
import { MetaApiError } from './metaApi';

export function metaFailureToAppError(error: unknown, fallbackMessage: string): never {
  if (error instanceof MetaApiError) {
    if (error.code === 190) {
      throw new AppError(
        502,
        'Invalid WhatsApp access token. Open Settings → Meta Cloud API and save a valid permanent token from Meta Business Manager.'
      );
    }
    throw new AppError(502, error.details ?? error.message);
  }

  if (error instanceof Error) {
    const redacted = error.message.replace(/Bearer\s+\S+/gi, '[redacted]');
    try {
      const payload = JSON.parse(redacted) as {
        error?: { code?: number; message?: string };
      };
      if (payload.error?.code === 190) {
        throw new AppError(
          502,
          'Invalid WhatsApp access token. Open Settings → Meta Cloud API and save a valid permanent token from Meta Business Manager.'
        );
      }
      if (payload.error?.message) {
        throw new AppError(502, payload.error.message);
      }
    } catch (parseError) {
      if (parseError instanceof AppError) throw parseError;
    }
    throw new AppError(502, redacted);
  }

  throw new AppError(502, fallbackMessage);
}
