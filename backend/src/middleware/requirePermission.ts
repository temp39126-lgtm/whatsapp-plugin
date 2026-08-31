import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppError, hasPermission } from '../types';

export function requirePermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Unauthorized'));
      return;
    }
    const allowed = permissions.some((p) => hasPermission(req.user!, p));
    if (!allowed) {
      next(new AppError(403, 'Insufficient permissions'));
      return;
    }
    next();
  };
}
