import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedText: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  const [ivHex, authTagHex, dataHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!env.META_APP_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', env.META_APP_SECRET)
    .update(payload)
    .digest('hex');
  const received = signature.replace('sha256=', '');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
