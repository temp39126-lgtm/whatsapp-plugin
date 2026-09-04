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

function readWebhookRawBody(req: Request): string {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') {
    return req.body;
  }
  return JSON.stringify(req.body);
}

function parseWebhookBody(rawBody: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

router.post('/', webhookRateLimiter, async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = readWebhookRawBody(req);
  const body = parseWebhookBody(rawBody);

  if (!body) {
    res.status(400).send('Invalid JSON');
    return;
  }

  try {
    const entry = (body.entry as Array<Record<string, unknown>> | undefined)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>> | undefined)?.[0];
    const value = changes?.value as Record<string, unknown> | undefined;
    const metadata = value?.metadata as Record<string, unknown> | undefined;
    const phoneNumberId = metadata?.phone_number_id as string | undefined;

    const { appSecret, isDemoAccount } = await resolveWebhookAppSecret(phoneNumberId);
    const skipSignatureVerification =
      isDemoAccount && env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test';

    if (!skipSignatureVerification) {
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
      for (const contactEntry of (value.contacts as Array<Record<string, unknown>> | undefined) ?? []) {
        const waId = contactEntry.wa_id as string | undefined;
        const profile = contactEntry.profile as Record<string, unknown> | undefined;
        if (waId && typeof profile?.name === 'string') {
          contactNameById.set(waId, profile.name);
          contactNameById.set(waId.replace(/\D/g, ''), profile.name);
        }
      }

      for (const message of value.messages as Array<Record<string, unknown>>) {
        const contactName =
          contactNameById.get(String(message.from)) ??
          contactNameById.get(String(message.from).replace(/\D/g, '')) ??
          ((value.contacts as Array<Record<string, unknown>> | undefined)?.[0]?.profile as
            | Record<string, unknown>
            | undefined)?.name;
        await processIncomingMessage(account, message as never, contactName as string | undefined);
      }
    }

    if (value.statuses) {
      for (const status of value.statuses as Array<Record<string, unknown>>) {
        await processStatusUpdate(account, String(status.id), String(status.status));
      }
    }

    if (value.calls) {
      for (const call of value.calls as Array<Record<string, unknown>>) {
        await processCallWebhook(account.tenantId, {
          callId: String(call.id),
          from: String(call.from),
          to: String(call.to),
          phoneNumberId,
          event: String(call.event),
          direction: String(call.direction),
          session: call.session as { sdp_type: string; sdp: string } | undefined,
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
