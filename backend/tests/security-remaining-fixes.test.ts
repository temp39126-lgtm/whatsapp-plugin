import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import type { Response } from 'express';
import {
  AUTH_COOKIE_NAME,
  extractBearerOrCookieToken,
  getAuthCookieOptions,
  parseCookies,
} from '../src/services/auth/authCookie';
import { sendAuthPayload } from '../src/utils/authResponse';
import { verifyWebhookSignature } from '../src/utils/encryption';

vi.mock('../src/config/env', () => ({
  env: {
    META_APP_SECRET: 'meta-test-secret',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    NODE_ENV: 'test',
    AUTH_COOKIE_CROSS_SITE: false,
    CORS_ORIGIN: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

describe('Auth cookie helpers', () => {
  it('prefers Authorization header over session cookie when both are present', () => {
    const cookieHeader = `${AUTH_COOKIE_NAME}=cookie-token; other=value`;
    expect(extractBearerOrCookieToken('Bearer header-token', cookieHeader)).toBe('header-token');
  });

  it('falls back to Authorization header when cookie is absent', () => {
    expect(extractBearerOrCookieToken('Bearer header-token', undefined)).toBe('header-token');
  });

  it('parses cookie values with encoded characters', () => {
    expect(parseCookies('whatsapp_crm_session=abc%2B123')).toEqual({
      whatsapp_crm_session: 'abc+123',
    });
  });

  it('uses cross-site cookie settings when AUTH_COOKIE_CROSS_SITE is enabled', async () => {
    vi.resetModules();
    vi.doMock('../src/config/env', () => ({
      env: {
        NODE_ENV: 'development',
        AUTH_COOKIE_CROSS_SITE: true,
        CORS_ORIGIN: 'https://frontend.trycloudflare.com',
        FRONTEND_URL: 'https://frontend.trycloudflare.com',
      },
    }));

    const { getAuthCookieOptions: getCrossSiteOptions } = await import('../src/services/auth/authCookie');
    expect(getCrossSiteOptions(true)).toMatchObject({
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });
});

describe('Auth response payload', () => {
  it('sets the session cookie but omits token from JSON body', () => {
    const json = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json,
      cookie: vi.fn(),
    } as unknown as Response;

    sendAuthPayload(res, {
      token: 'secret-jwt',
      user: { userId: 'user-001', tenantId: 'tenant-001', role: 'USER', permissions: [] },
    });

    expect(res.cookie).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({
      user: { userId: 'user-001', tenantId: 'tenant-001', role: 'USER', permissions: [] },
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
