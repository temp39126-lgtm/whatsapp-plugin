import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppError } from '../types';

export function requireRole(...roles: Array<'ADMIN' | 'USER'>) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError(403, 'Insufficient role permissions'));
      return;
    }
    next();
  };
}
