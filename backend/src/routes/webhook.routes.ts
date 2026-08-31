import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { verifyWebhookSignature } from '../utils/encryption';
import {
  findAccountByPhoneNumberId,
  processIncomingMessage,
  processStatusUpdate,
} from '../services/whatsapp/whatsappService';
import { processIncomingCallWebhook } from '../services/calls/callService';
import { webhookRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../config/logger';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN) {
    logger.info('Webhook verified');
    res.status(200).send(challenge);
    return;
  }

  res.status(403).send('Forbidden');
});

router.post('/', webhookRateLimiter, async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = JSON.stringify(req.body);

  if (env.META_APP_SECRET && signature) {
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature');
      res.status(401).send('Invalid signature');
      return;
    }
  }

  res.status(200).send('OK');

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return;

    const phoneNumberId = value.metadata?.phone_number_id;
    if (!phoneNumberId) return;

    const account = await findAccountByPhoneNumberId(phoneNumberId);
    if (!account) {
      logger.warn({ phoneNumberId }, 'No WhatsApp account found for phone number');
      return;
    }

    if (value.messages) {
      for (const message of value.messages) {
        const contactName = value.contacts?.[0]?.profile?.name;
        await processIncomingMessage(account, message, contactName);
      }
    }

    if (value.statuses) {
      for (const status of value.statuses) {
        await processStatusUpdate(account, status.id, status.status);
      }
    }

    if (value.calls) {
      for (const call of value.calls) {
        await processIncomingCallWebhook(account.tenantId, {
          callId: call.id,
          from: call.from,
          phoneNumberId,
        });
      }
    }
  } catch (error) {
    logger.error({ error }, 'Webhook processing error');
  }
});

export default router;
