import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { User } from '../../models/User';
import { AppError } from '../../types';

export async function validateActiveSession(authorization?: string): Promise<void> {
  if (env.AUTH_ADAPTER !== 'local' && env.AUTH_ADAPTER !== 'jwt') {
    return;
  }

  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) {
    return;
  }

  const decoded = jwt.decode(token) as {
    sub?: string;
    tenantId?: string;
    tv?: number;
  } | null;

  if (!decoded?.sub || !decoded.tenantId) {
    throw new AppError(401, 'Invalid token');
  }

  const record = await User.findOne({
    _id: decoded.sub,
    tenantId: decoded.tenantId,
  }).select('isActive tokenVersion');

  if (!record?.isActive) {
    throw new AppError(401, 'Account is inactive');
  }

  const tokenVersion = decoded.tv ?? 0;
  if (tokenVersion < (record.tokenVersion ?? 0)) {
    throw new AppError(401, 'Session expired. Please sign in again.');
  }
}
