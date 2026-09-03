import { Types } from 'mongoose';
import { Conversation, IConversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { AuthUser } from '../../types';
import { isDuplicateKeyError } from '../../utils/mongo';
import { logActivity } from '../rbac/activityLog';
import {
  buildInboxHref,
  notifyTenantAdmins,
} from '../notifications/notificationService';
import { emitToAuthorizedUsers } from '../realtime/socketService';

const ACTIVE_STATUSES = ['OPEN', 'PENDING'] as const;
const REOPENABLE_STATUSES = ['RESOLVED', 'CLOSED'] as const;

export async function dedupeContactConversations(
  tenantId: string,
  contactId: Types.ObjectId
): Promise<void> {
  const conversations = await Conversation.find({
    tenantId,
    contactId,
    groupId: { $exists: false },
  })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .select('_id');

  if (conversations.length <= 1) {
    return;
  }

  const duplicateIds = conversations.slice(1).map((conversation) => conversation._id);
  await Conversation.deleteMany({ _id: { $in: duplicateIds } });
}

export async function getOrCreateContactConversation(params: {
  tenantId: string;
  whatsappAccountId: Types.ObjectId;
  contactId: Types.ObjectId;
  assignedUserId?: string;
  notifyNew?: boolean;
  contactLabel?: string;
}): Promise<{ conversation: IConversation; created: boolean; reopened: boolean }> {
  await dedupeContactConversations(params.tenantId, params.contactId);

  let conversation = await Conversation.findOne({
    tenantId: params.tenantId,
    contactId: params.contactId,
    groupId: { $exists: false },
    status: { $in: ACTIVE_STATUSES },
  }).sort({ lastMessageAt: -1 });

  if (conversation) {
    return { conversation, created: false, reopened: false };
  }

  conversation = await Conversation.findOne({
    tenantId: params.tenantId,
    contactId: params.contactId,
    groupId: { $exists: false },
    status: { $in: REOPENABLE_STATUSES },
  }).sort({ lastMessageAt: -1 });

  if (conversation) {
    conversation.status = 'OPEN';
    await conversation.save();

    await emitToAuthorizedUsers(params.tenantId, conversation._id.toString(), 'conversation.updated', {
      conversationId: conversation._id.toString(),
      status: 'OPEN',
    });

    return { conversation, created: false, reopened: true };
  }

  try {
    conversation = await Conversation.create({
      tenantId: params.tenantId,
      whatsappAccountId: params.whatsappAccountId,
      contactId: params.contactId,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      ...(params.assignedUserId ? { assignedUserId: params.assignedUserId } : {}),
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    conversation = await Conversation.findOne({
      tenantId: params.tenantId,
      contactId: params.contactId,
      groupId: { $exists: false },
    }).sort({ lastMessageAt: -1 });

    if (!conversation) {
      throw error;
    }

    return { conversation, created: false, reopened: false };
  }

  if (params.notifyNew) {
    await emitToAuthorizedUsers(params.tenantId, conversation._id.toString(), 'conversation.created', {
      conversation: conversation.toObject(),
    });

    void notifyTenantAdmins({
      tenantId: params.tenantId,
      type: 'unassigned',
      title: 'New unassigned conversation',
      body: `${params.contactLabel ?? 'A customer'} started a new chat`,
      href: buildInboxHref(conversation._id.toString()),
      conversationId: conversation._id.toString(),
    }).catch(() => undefined);

    const { sendUnassignedAlertEmail } = await import('../email/emailService');
    void sendUnassignedAlertEmail({
      tenantId: params.tenantId,
      conversationLabel: params.contactLabel ?? 'New customer',
    }).catch(() => undefined);
  }

  return { conversation, created: true, reopened: false };
}

export async function atomicClaimConversation(
  user: AuthUser,
  conversationId: string
): Promise<IConversation | null> {
  const updated = await Conversation.findOneAndUpdate(
    {
      _id: conversationId,
      tenantId: user.tenantId,
      $or: [{ assignedUserId: { $exists: false } }, { assignedUserId: null }],
    },
    { $set: { assignedUserId: user.userId } },
    { new: true }
  );

  if (!updated) {
    return null;
  }

  if (updated.contactId) {
    await Contact.updateOne(
      { _id: updated.contactId, tenantId: user.tenantId },
      { $set: { assignedUserId: user.userId } }
    );
  }

  await logActivity(user, 'conversation.assigned', 'conversation', updated._id.toString(), {
    assignedUserId: user.userId,
    selfAssigned: true,
  });

  await emitToAuthorizedUsers(user.tenantId, updated._id.toString(), 'conversation.assigned', {
    conversationId: updated._id.toString(),
    assignedUserId: user.userId,
    selfAssigned: true,
  });

  return updated;
}
