import { AuthUser } from '../../types';
import { Group } from '../../models/Group';
import { Contact } from '../../models/Contact';
import { Conversation } from '../../models/Conversation';
import { Community } from '../../models/Community';
import { AppError } from '../../types';
import { logActivity } from '../rbac/activityLog';
import { createGroupInboxConversation } from './groupInboxService';
import { storeAvatar } from '../avatars/avatarService';
import { assertActiveTenantUser } from '../users/assigneeValidation';

const memberFields = 'name phone whatsappId profileImage';

export async function listGroups(user: AuthUser) {
  const query: Record<string, unknown> = { tenantId: user.tenantId };

  if (user.role !== 'ADMIN') {
    const assignedContacts = await Contact.find({
      tenantId: user.tenantId,
      assignedUserId: user.userId,
    }).select('_id');
    const contactIds = assignedContacts.map((contact) => contact._id);
    if (contactIds.length === 0) {
      return [];
    }
    query.contactIds = { $in: contactIds };
  }

  return Group.find(query)
    .sort({ createdAt: -1 })
    .populate('contactIds', memberFields)
    .lean();
}

export async function getGroup(user: AuthUser, groupId: string) {
  const group = await Group.findOne({ _id: groupId, tenantId: user.tenantId })
    .populate('contactIds', memberFields)
    .lean();

  if (!group) throw new AppError(404, 'Group not found');

  if (user.role !== 'ADMIN') {
    const contactIds = (group.contactIds as Array<{ _id?: unknown } | string>).map((contact) =>
      typeof contact === 'object' && contact && '_id' in contact ? contact._id : contact
    );

    const assignedContacts = await Contact.countDocuments({
      tenantId: user.tenantId,
      assignedUserId: user.userId,
      _id: { $in: contactIds },
    });

    if (assignedContacts === 0) {
      throw new AppError(403, 'Access denied to this group');
    }
  }

  return group;
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

  return Group.findById(group._id).populate('contactIds', memberFields).lean();
}

export async function deleteGroup(user: AuthUser, groupId: string) {
  const group = await Group.findOne({ _id: groupId, tenantId: user.tenantId });
  if (!group) throw new AppError(404, 'Group not found');

  await Promise.all([
    Conversation.deleteMany({ tenantId: user.tenantId, groupId: group._id }),
    Community.updateMany(
      { tenantId: user.tenantId, groupIds: group._id },
      { $pull: { groupIds: group._id } }
    ),
  ]);

  await Group.deleteOne({ _id: group._id });

  await logActivity(user, 'group.deleted', 'group', groupId, { name: group.name });

  return { deleted: true };
}

export async function uploadGroupAvatar(
  user: AuthUser,
  groupId: string,
  file: Express.Multer.File
) {
  const group = await Group.findOne({ _id: groupId, tenantId: user.tenantId });
  if (!group) throw new AppError(404, 'Group not found');

  const storageKey = await storeAvatar(
    user.tenantId,
    'groups',
    groupId,
    file.originalname,
    file.buffer,
    file.mimetype
  );

  group.profileImage = storageKey;
  await group.save();

  return {
    profileImage: `/api/whatsapp/groups/${groupId}/avatar`,
  };
}
