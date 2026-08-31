import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest, AppError } from '../types';
import { resolveAuthUser } from '../services/rbac/authAdapter';
import { logger } from '../config/logger';

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authorization = req.headers.authorization;
    const cookie = req.headers.cookie;
    req.user = await resolveAuthUser(authorization, cookie);
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
