import { AuthUser } from '../../types';
import { Conversation, IConversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { ConversationAssignment } from '../../models/ConversationAssignment';
import { buildConversationFilter } from '../rbac/conversationAccess';
import { logActivity } from '../rbac/activityLog';
import { emitToAuthorizedUsers } from '../realtime/socketService';
import { getPagination, paginatedResponse } from '../../utils/pagination';

interface ConversationFilters {
  status?: string;
  assignedUserId?: string;
  unassigned?: boolean;
  unread?: boolean;
  priority?: string;
  tag?: string;
  search?: string;
  mine?: boolean;
}

export async function listConversations(
  user: AuthUser,
  filters: ConversationFilters,
  page = 1,
  limit = 20
): Promise<ReturnType<typeof paginatedResponse>> {
  const query: Record<string, unknown> = {};

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.unassigned) query.assignedUserId = { $exists: false };
  if (filters.mine) query.assignedUserId = user.userId;
  if (filters.assignedUserId) query.assignedUserId = filters.assignedUserId;
  if (filters.unread) query.unreadCount = { $gt: 0 };

  const filter = buildConversationFilter(user, query);
  const { skip, limit: lim } = getPagination({ page, limit });

  let conversations = await Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(lim)
    .populate('contactId', 'name phone whatsappId profileImage')
    .lean();

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    conversations = conversations.filter((c) => {
      const contact = c.contactId as { name?: string; phone?: string } | undefined;
      return (
        contact?.name?.toLowerCase().includes(searchLower) ||
        contact?.phone?.includes(filters.search!)
      );
    });
  }

  const total = await Conversation.countDocuments(filter);
  const enriched = conversations.map((c) => ({
    ...c,
    contact: typeof c.contactId === 'object' && c.contactId !== null ? c.contactId : undefined,
  }));

  return paginatedResponse(enriched, total, page, lim);
}

export async function getConversation(user: AuthUser, conversationId: string) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId: user.tenantId,
  }).populate('contactId');

  if (!conversation) return null;

  const obj = conversation.toObject();
  return {
    ...obj,
    contact: typeof obj.contactId === 'object' && obj.contactId !== null ? obj.contactId : undefined,
  };
}

export async function assignConversation(
  user: AuthUser,
  conversation: IConversation,
  assignedUserId: string
) {
  const previousAssignee = conversation.assignedUserId;
  conversation.assignedUserId = assignedUserId;
  await conversation.save();

  await ConversationAssignment.create({
    tenantId: user.tenantId,
    conversationId: conversation._id,
    assignedUserId,
    assignedBy: user.userId,
  });

  await logActivity(user, 'conversation.assigned', 'conversation', conversation._id.toString(), {
    assignedUserId,
    previousAssignee,
  });

  await emitToAuthorizedUsers(user.tenantId, conversation._id.toString(), 'conversation.assigned', {
    conversationId: conversation._id.toString(),
    assignedUserId,
  });

  return conversation;
}

export async function updateConversationStatus(
  user: AuthUser,
  conversation: IConversation,
  status: string
) {
  conversation.status = status as IConversation['status'];
  await conversation.save();

  await logActivity(user, 'conversation.status_changed', 'conversation', conversation._id.toString(), {
    status,
  });

  await emitToAuthorizedUsers(user.tenantId, conversation._id.toString(), 'conversation.updated', {
    conversationId: conversation._id.toString(),
    status,
  });

  return conversation;
}

export async function updateConversationPriority(
  user: AuthUser,
  conversation: IConversation,
  priority: string
) {
  conversation.priority = priority as IConversation['priority'];
  await conversation.save();

  await logActivity(user, 'conversation.priority_changed', 'conversation', conversation._id.toString(), {
    priority,
  });

  return conversation;
}

export async function updateConversationTags(
  user: AuthUser,
  conversation: IConversation,
  tagIds: string[]
) {
  conversation.tags = tagIds as unknown as IConversation['tags'];
  await conversation.save();

  await logActivity(user, 'conversation.tags_updated', 'conversation', conversation._id.toString(), {
    tagIds,
  });

  return conversation;
}

export async function markConversationRead(
  user: AuthUser,
  conversation: IConversation,
  lastReadMessageId?: string
) {
  conversation.unreadCount = 0;
  await conversation.save();

  const { ConversationRead } = await import('../../models/ConversationRead');
  await ConversationRead.findOneAndUpdate(
    { tenantId: user.tenantId, conversationId: conversation._id, userId: user.userId },
    { lastReadMessageId, lastReadAt: new Date() },
    { upsert: true }
  );

  return conversation;
}
