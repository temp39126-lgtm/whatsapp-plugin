import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest, AppError } from '../types';
import { AUTH_COOKIE_NAME, extractBearerOrCookieToken, refreshAuthCookie } from '../services/auth/authCookie';
import { resolveAuthUser } from '../services/rbac/authAdapter';
import { enforceActiveSession } from '../services/auth/sessionService';
import { logger } from '../config/logger';

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authorization = req.headers.authorization;
    const cookie = req.headers.cookie;
    const token = extractBearerOrCookieToken(authorization, cookie);
    const bearerAuthorization = token ? `Bearer ${token}` : undefined;
    const tokenUser = await resolveAuthUser(bearerAuthorization, cookie);
    req.user = await enforceActiveSession(bearerAuthorization, tokenUser);

    if (token && cookie?.includes(`${AUTH_COOKIE_NAME}=`)) {
      refreshAuthCookie(res, token);
    }

    next();
  } catch (error) {
    logger.warn({ error }, 'Authentication failed');
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing authentication' });
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
