import { AuthUser } from '../../types';
import { Group } from '../../models/Group';
import { Contact } from '../../models/Contact';
import { AppError } from '../../types';
import { logActivity } from '../rbac/activityLog';
import { createGroupInboxConversation } from './groupInboxService';

export async function listGroups(user: AuthUser) {
  return Group.find({ tenantId: user.tenantId })
    .sort({ createdAt: -1 })
    .populate('contactIds', 'name phone whatsappId')
    .lean();
}

export async function createGroup(
  user: AuthUser,
  data: { name: string; contactIds: string[] }
) {
  const uniqueContactIds = [...new Set(data.contactIds)];
  const contacts = await Contact.find({
    _id: { $in: uniqueContactIds },
    tenantId: user.tenantId,
  });

  if (contacts.length !== uniqueContactIds.length) {
    throw new AppError(400, 'One or more contacts were not found');
  }

  if (contacts.length === 0) {
    throw new AppError(400, 'Select at least one contact for the group');
  }

  const group = await Group.create({
    tenantId: user.tenantId,
    name: data.name.trim(),
    contactIds: contacts.map((contact) => contact._id),
    createdBy: user.userId,
  });

  await logActivity(user, 'group.created', 'group', group._id.toString(), {
    name: group.name,
    memberCount: contacts.length,
  });

  await createGroupInboxConversation(user, group);

  return Group.findById(group._id).populate('contactIds', 'name phone whatsappId').lean();
}
