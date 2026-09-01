import { Types } from 'mongoose';
import { AuthUser } from '../../types';
import { Group, IGroup } from '../../models/Group';
import { Conversation } from '../../models/Conversation';
import { WhatsAppAccount } from '../../models/WhatsAppAccount';
import { AppError } from '../../types';

async function getTenantWhatsAppAccount(tenantId: string) {
  const account = await WhatsAppAccount.findOne({ tenantId });
  if (!account) {
    throw new AppError(400, 'WhatsApp account is not configured for this workspace');
  }
  return account;
}

export async function createGroupInboxConversation(
  user: AuthUser,
  group: Pick<IGroup, '_id' | 'name' | 'createdBy' | 'createdAt'>
) {
  const existing = await Conversation.findOne({
    tenantId: user.tenantId,
    groupId: group._id,
  });

  if (existing) return existing;

  const account = await getTenantWhatsAppAccount(user.tenantId);

  return Conversation.create({
    tenantId: user.tenantId,
    whatsappAccountId: account._id,
    groupId: group._id,
    assignedUserId: group.createdBy,
    permittedUsers: [],
    status: 'OPEN',
    priority: 'NORMAL',
    tags: [],
    unreadCount: 0,
    lastMessage: `You created group "${group.name}"`,
    lastMessageAt: group.createdAt ?? new Date(),
  });
}

export async function syncGroupInboxConversations(user: AuthUser) {
  const account = await WhatsAppAccount.findOne({ tenantId: user.tenantId });
  if (!account) return;

  const groups = await Group.find({ tenantId: user.tenantId }).lean();
  await Promise.all(
    groups.map((group) =>
      createGroupInboxConversation(user, {
        _id: group._id as Types.ObjectId,
        name: group.name,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
      })
    )
  );
}
