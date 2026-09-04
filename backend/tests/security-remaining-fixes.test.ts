import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import {
  AUTH_COOKIE_NAME,
  extractBearerOrCookieToken,
  parseCookies,
} from '../src/services/auth/authCookie';
import { verifyWebhookSignature } from '../src/utils/encryption';

vi.mock('../src/config/env', () => ({
  env: {
    META_APP_SECRET: 'meta-test-secret',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    NODE_ENV: 'test',
  },
}));

describe('Auth cookie helpers', () => {
  it('prefers the HttpOnly session cookie over Authorization header', () => {
    const cookieHeader = `${AUTH_COOKIE_NAME}=cookie-token; other=value`;
    expect(extractBearerOrCookieToken('Bearer header-token', cookieHeader)).toBe('cookie-token');
  });

  it('falls back to Authorization header when cookie is absent', () => {
    expect(extractBearerOrCookieToken('Bearer header-token', undefined)).toBe('header-token');
  });

  it('parses cookie values with encoded characters', () => {
    expect(parseCookies('whatsapp_crm_session=abc%2B123')).toEqual({
      whatsapp_crm_session: 'abc+123',
    });
  });
});

describe('Webhook raw payload verification', () => {
  it('validates signatures against the exact raw request bytes', () => {
    const canonicalBody = JSON.stringify({ entry: [{ changes: [] }] });
    const rawBody = `{ "entry": [ { "changes": [] } ] }`;
    const signature = crypto
      .createHmac('sha256', 'meta-test-secret')
      .update(rawBody)
      .digest('hex');

    expect(verifyWebhookSignature(canonicalBody, `sha256=${signature}`)).toBe(false);
    expect(verifyWebhookSignature(rawBody, `sha256=${signature}`)).toBe(true);
  });
});
