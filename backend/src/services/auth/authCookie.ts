import { CookieOptions, Response } from 'express';
import { env } from '../../config/env';

export const AUTH_COOKIE_NAME = 'whatsapp_crm_session';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};

  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator === -1) {
          return [part, ''];
        }
        const key = part.slice(0, separator);
        const value = part.slice(separator + 1);
        return [key, decodeURIComponent(value)];
      })
  );
}

export function extractBearerOrCookieToken(
  authorization?: string,
  cookieHeader?: string
): string | undefined {
  const cookies = parseCookies(cookieHeader);
  if (cookies[AUTH_COOKIE_NAME]) {
    return cookies[AUTH_COOKIE_NAME];
  }

  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  return undefined;
}

function getAuthCookieOptions(): CookieOptions {
  const isProduction = env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: '/',
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
}

export function attachAuthCookie<T extends { token?: string }>(
  res: Response,
  payload: T
): T {
  if (payload.token) {
    setAuthCookie(res, payload.token);
  }
  return payload;
}
