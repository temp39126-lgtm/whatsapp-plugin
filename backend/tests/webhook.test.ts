import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { verifyWebhookSignature } from '../src/utils/encryption';

vi.mock('../src/config/env', () => ({
  env: {
    META_APP_SECRET: 'meta-test-secret',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
}));

describe('Webhook signature verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts valid Meta webhook signatures', () => {
    const payload = JSON.stringify({ entry: [{ changes: [] }] });
    const signature = crypto
      .createHmac('sha256', 'meta-test-secret')
      .update(payload)
      .digest('hex');

    expect(verifyWebhookSignature(payload, `sha256=${signature}`)).toBe(true);
  });

  it('rejects tampered payloads', () => {
    const payload = JSON.stringify({ entry: [{ changes: [] }] });
    const signature = crypto
      .createHmac('sha256', 'meta-test-secret')
      .update(payload)
      .digest('hex');

    expect(
      verifyWebhookSignature(payload + 'tampered', `sha256=${signature}`)
    ).toBe(false);
  });

  it('rejects invalid signatures', () => {
    const payload = JSON.stringify({ test: true });
    expect(verifyWebhookSignature(payload, 'sha256=invalid')).toBe(false);
  });
});

describe('Encryption utilities', () => {
  it('encrypts and decrypts WhatsApp tokens', async () => {
    const { encrypt, decrypt } = await import('../src/utils/encryption');
    const original = 'EAAtest-whatsapp-access-token';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(decrypt(encrypted)).toBe(original);
  });
});
