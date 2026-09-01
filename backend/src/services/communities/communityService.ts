import { AuthUser } from '../../types';
import { Community } from '../../models/Community';
import { Group } from '../../models/Group';
import { AppError } from '../../types';
import { logActivity } from '../rbac/activityLog';

export async function listCommunities(user: AuthUser) {
  return Community.find({ tenantId: user.tenantId })
    .sort({ createdAt: -1 })
    .populate('groupIds', 'name')
    .lean();
}

export async function createCommunity(
  user: AuthUser,
  data: { name: string; description?: string; groupIds?: string[] }
) {
  const groupIds = [...new Set(data.groupIds ?? [])];
  if (groupIds.length > 0) {
    const groups = await Group.find({
      _id: { $in: groupIds },
      tenantId: user.tenantId,
    });
    if (groups.length !== groupIds.length) {
      throw new AppError(400, 'One or more groups were not found');
    }
  }

  const community = await Community.create({
    tenantId: user.tenantId,
    name: data.name.trim(),
    description: data.description?.trim(),
    groupIds,
    createdBy: user.userId,
  });

  await logActivity(user, 'community.created', 'community', community._id.toString(), {
    name: community.name,
    groupCount: groupIds.length,
  });

  return Community.findById(community._id).populate('groupIds', 'name').lean();
}
