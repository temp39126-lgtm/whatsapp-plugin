import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppError, hasPermission } from '../types';

export function requireAnyPermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Unauthorized'));
      return;
    }
    const allowed = permissions.some((permission) => hasPermission(req.user!, permission));
    if (!allowed) {
      next(new AppError(403, 'Insufficient permissions'));
      return;
    }
    next();
  };
}
