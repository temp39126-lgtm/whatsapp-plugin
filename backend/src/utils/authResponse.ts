import { Response } from 'express';
import { attachAuthCookie } from '../services/auth/authCookie';

export function sendAuthPayload<T extends { token?: string }>(
  res: Response,
  payload: T,
  status = 200,
  options?: { keepSignedIn?: boolean }
): void {
  attachAuthCookie(res, payload, options?.keepSignedIn ?? true);
  const { token: _token, ...publicPayload } = payload;
  res.status(status).json(publicPayload);
}
