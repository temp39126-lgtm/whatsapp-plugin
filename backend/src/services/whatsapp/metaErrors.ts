import { AppError } from '../../types';
import { META_TOKEN_INVALID_USER_MESSAGE, MetaApiError } from './metaApi';

export function metaFailureToAppError(error: unknown, fallbackMessage: string): never {
  if (error instanceof MetaApiError) {
    if (error.code === 190) {
      throw new AppError(502, META_TOKEN_INVALID_USER_MESSAGE);
    }
    if (error.code === 100) {
      throw new AppError(
        502,
        'Meta denied this action. Use a System User token with whatsapp_business_management, assigned to your WhatsApp Business Account in Business Manager — then delete templates here without opening Business Suite.'
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
        throw new AppError(502, META_TOKEN_INVALID_USER_MESSAGE);
      }
      if (payload.error?.code === 100) {
        throw new AppError(
          502,
          'Meta denied this action. Use a System User token with whatsapp_business_management, assigned to your WhatsApp Business Account in Business Manager — then delete templates here without opening Business Suite.'
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
