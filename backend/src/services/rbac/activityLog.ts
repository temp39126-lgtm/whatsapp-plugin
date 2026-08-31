import { AuthUser } from '../../types';
import { ActivityLog } from '../../models/ActivityLog';
import { logger } from '../../config/logger';

export async function logActivity(
  user: AuthUser,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await ActivityLog.create({
      tenantId: user.tenantId,
      userId: user.userId,
      action,
      resourceType,
      resourceId,
      metadata,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to write activity log');
  }
}
