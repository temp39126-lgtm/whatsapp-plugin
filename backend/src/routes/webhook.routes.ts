import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { decrypt, verifyWebhookSignature } from '../utils/encryption';
import { WhatsAppAccount } from '../models/WhatsAppAccount';
import {
  findAccountByPhoneNumberId,
  isDemoWhatsAppAccount,
  processIncomingMessage,
  processStatusUpdate,
} from '../services/whatsapp/whatsappService';
import { processCallWebhook } from '../services/calls/callService';
import { webhookRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../config/logger';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe' || typeof token !== 'string') {
    res.status(403).send('Forbidden');
    return;
  }

  if (token === env.META_VERIFY_TOKEN) {
    logger.info('Webhook verified using environment token');
    res.status(200).send(challenge);
    return;
  }

  const account = await WhatsAppAccount.findOne({ webhookVerifyToken: token });
  if (account) {
    logger.info({ tenantId: account.tenantId }, 'Webhook verified using tenant token');
    res.status(200).send(challenge);
    return;
  }

  res.status(403).send('Forbidden');
});

async function resolveWebhookAppSecret(phoneNumberId?: string): Promise<{
  appSecret: string | null;
  isDemoAccount: boolean;
}> {
  let appSecret = env.META_APP_SECRET || null;
  let isDemoAccount = false;

  if (phoneNumberId) {
    const account = await findAccountByPhoneNumberId(phoneNumberId);
    if (account) {
      isDemoAccount = isDemoWhatsAppAccount(account);
      if (account.encryptedAppSecret) {
        appSecret = decrypt(account.encryptedAppSecret);
      }
    }
  }

  return { appSecret, isDemoAccount };
}

router.post('/', webhookRateLimiter, async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = JSON.stringify(req.body);

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const phoneNumberId = value?.metadata?.phone_number_id;

    const { appSecret, isDemoAccount } = await resolveWebhookAppSecret(phoneNumberId);

    if (!isDemoAccount) {
      if (!signature) {
        logger.warn({ phoneNumberId }, 'Webhook rejected: missing signature');
        res.status(401).send('Missing signature');
        return;
      }

      if (!appSecret) {
        logger.warn({ phoneNumberId }, 'Webhook rejected: app secret not configured');
        res.status(401).send('Webhook app secret not configured');
        return;
      }

      if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
        logger.warn({ phoneNumberId }, 'Invalid webhook signature');
        res.status(401).send('Invalid signature');
        return;
      }
    }

    res.status(200).send('OK');

    if (!value || !phoneNumberId) return;

    const account = await findAccountByPhoneNumberId(phoneNumberId);
    if (!account) {
      logger.warn({ phoneNumberId }, 'No WhatsApp account found for phone number');
      return;
    }

    if (value.messages) {
      const contactNameById = new Map<string, string>();
      for (const entry of value.contacts ?? []) {
        if (entry.wa_id && entry.profile?.name) {
          contactNameById.set(entry.wa_id, entry.profile.name);
          contactNameById.set(entry.wa_id.replace(/\D/g, ''), entry.profile.name);
        }
      }

      for (const message of value.messages) {
        const contactName =
          contactNameById.get(message.from) ??
          contactNameById.get(String(message.from).replace(/\D/g, '')) ??
          value.contacts?.[0]?.profile?.name;
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
        await processCallWebhook(account.tenantId, {
          callId: call.id,
          from: call.from,
          to: call.to,
          phoneNumberId,
          event: call.event,
          direction: call.direction,
          session: call.session,
        });
      }
    }
  } catch (error) {
    logger.error({ error }, 'Webhook processing error');
    if (!res.headersSent) {
      res.status(500).send('Error');
    }
  }
});

export default router;
