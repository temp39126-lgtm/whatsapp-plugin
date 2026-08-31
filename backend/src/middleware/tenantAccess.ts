import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppError } from '../types';

export function tenantAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user?.tenantId) {
    next(new AppError(401, 'Tenant context missing'));
    return;
  }
  next();
}
