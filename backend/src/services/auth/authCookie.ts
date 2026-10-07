import { CookieOptions, Response } from 'express';
import { env } from '../../config/env';

export const AUTH_COOKIE_NAME = 'whatsapp_crm_session';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  const cookies = parseCookies(cookieHeader);
  if (cookies[AUTH_COOKIE_NAME]) {
    return cookies[AUTH_COOKIE_NAME];
  }

  return undefined;
}

function publicOrigins(): string[] {
  return [env.FRONTEND_URL, env.CORS_ORIGIN]
    .flatMap((value) => String(value ?? '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function isPublicHttps(): boolean {
  return publicOrigins().some((origin) => origin.startsWith('https://'));
}

function usesCrossSiteCookies(): boolean {
  if (publicOrigins().some((origin) => /trycloudflare\.com|ngrok/i.test(origin))) {
    return true;
  }
  // SameSite=None requires Secure, which browsers reject on plain HTTP (IP:port deploys).
  if (env.AUTH_COOKIE_CROSS_SITE) {
    return isPublicHttps();
  }
  return false;
}

function cookieSecurity(): Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite' | 'path'> {
  const crossSite = usesCrossSiteCookies();
  return {
    httpOnly: true,
    secure: isPublicHttps() || crossSite,
    sameSite: crossSite ? 'none' : 'lax',
    path: '/',
  };
}

export function getAuthCookieOptions(keepSignedIn = true): CookieOptions {
  const options: CookieOptions = cookieSecurity();

  if (keepSignedIn) {
    options.maxAge = SEVEN_DAYS_MS;
  }

  return options;
}

export function setAuthCookie(res: Response, token: string, keepSignedIn = true): void {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(keepSignedIn));
}

export function refreshAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...getAuthCookieOptions(true),
    maxAge: THIRTY_DAYS_MS,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, cookieSecurity());
}

export function attachAuthCookie<T extends { token?: string }>(
  res: Response,
  payload: T,
  keepSignedIn = true
): T {
  if (payload.token) {
    setAuthCookie(res, payload.token, keepSignedIn);
  }
  return payload;
}
