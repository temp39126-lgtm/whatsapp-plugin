import { Response } from 'express';
import { attachAuthCookie } from '../services/auth/authCookie';

export function sendAuthPayload<T extends { token?: string }>(
  res: Response,
  payload: T,
  status = 200
): void {
  attachAuthCookie(res, payload);
  res.status(status).json(payload);
}
