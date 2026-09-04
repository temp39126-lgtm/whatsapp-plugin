import { User } from '../../models/User';
import { AppError } from '../../types';

export async function assertActiveTenantUser(tenantId: string, userId: string): Promise<void> {
  const count = await User.countDocuments({
    _id: userId,
    tenantId,
    isActive: true,
  });

  if (count === 0) {
    throw new AppError(400, 'Assignee not found');
  }
}
