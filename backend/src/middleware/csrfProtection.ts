import { Request, Response, NextFunction } from 'express';
import { isAllowedOrigin } from '../config/cors';
import { AUTH_COOKIE_NAME, parseCookies } from '../services/auth/authCookie';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originFromReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (req.path === '/health' || req.path.startsWith('/whatsapp/webhook')) {
    next();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  if (!cookies[AUTH_COOKIE_NAME]) {
    next();
    return;
  }

  const origin = req.headers.origin ?? originFromReferer(req.headers.referer);
  if (isAllowedOrigin(origin)) {
    next();
    return;
  }

  res.status(403).json({ error: 'Cross-site request blocked' });
}
