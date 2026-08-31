import { Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AuthenticatedRequest, AppError } from '../types';

export function validateBody(schema: ZodSchema) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(400, result.error.errors[0].message));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new AppError(400, result.error.errors[0].message));
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
