import { AuthUser, AppError } from '../../types';
import { Conversation, IConversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { User } from '../../models/User';
import { ConversationAssignment } from '../../models/ConversationAssignment';
import { buildConversationFilter } from '../rbac/conversationAccess';
import { logActivity } from '../rbac/activityLog';
import { emitToAuthorizedUsers } from '../realtime/socketService';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { enrichConversations } from './conversationEnrichment';
import { syncGroupInboxConversations } from '../groups/groupInboxService';
import { Group } from '../../models/Group';
import {
  sendConversationAssignmentEmail,
  isEmailConfigured,
  type EmailSendResult,
} from '../email/emailService';
import { DEFAULT_USER_PREFERENCES } from '../../types/preferences';

interface ConversationFilters {
  status?: string;
  assignedUserId?: string;
  unassigned?: boolean;
  unread?: boolean;
  priority?: string;
  tag?: string;
  search?: string;
  mine?: boolean;
  groups?: boolean;
}

type PopulatedGroupMember = {
  _id: { toString(): string };
  name: string;
  phone: string;
  whatsappId: string;
  profileImage?: string;
};

type PopulatedGroup = {
  _id: { toString(): string };
  name: string;
  profileImage?: string;
  contactIds?: Array<PopulatedGroupMember | { toString(): string }>;
};

function mapPopulatedGroup(groupId: unknown, includeMembers = false) {
  if (typeof groupId !== 'object' || groupId === null || !('name' in groupId)) {
    return undefined;
  }

  const group = groupId as PopulatedGroup;
  const groupIdStr = group._id.toString();
  const members =
    includeMembers && Array.isArray(group.contactIds)
      ? group.contactIds
          .filter(
            (member): member is PopulatedGroupMember =>
              typeof member === 'object' && member !== null && 'name' in member
          )
          .map((member) => ({
            _id: member._id.toString(),
            name: member.name,
            phone: member.phone,
            whatsappId: member.whatsappId,
            profileImage: member.profileImage
              ? `/api/whatsapp/contacts/${member._id.toString()}/avatar`
              : undefined,
          }))
      : undefined;

  return {
    _id: groupIdStr,
    name: group.name,
    memberCount: Array.isArray(group.contactIds) ? group.contactIds.length : 0,
    profileImage: group.profileImage ? `/api/whatsapp/groups/${groupIdStr}/avatar` : undefined,
    members,
  };
}

function mapPopulatedContact(contactId: unknown) {
  if (typeof contactId !== 'object' || contactId === null || !('name' in contactId)) {
    return undefined;
  }

  const contact = contactId as {
    _id: { toString(): string };
    name: string;
    phone: string;
    whatsappId: string;
    profileImage?: string;
  };

  return {
    ...contact,
    _id: contact._id.toString(),
    profileImage: contact.profileImage
      ? `/api/whatsapp/contacts/${contact._id.toString()}/avatar`
      : undefined,
  };
}

export async function listConversations(
  user: AuthUser,
  filters: ConversationFilters,
  page = 1,
  limit = 20
): Promise<ReturnType<typeof paginatedResponse>> {
  await syncGroupInboxConversations(user);

  const query: Record<string, unknown> = {};

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.unassigned) query.assignedUserId = { $exists: false };
  if (filters.mine) query.assignedUserId = user.userId;
  if (filters.assignedUserId) query.assignedUserId = filters.assignedUserId;
  if (filters.unread) query.unreadCount = { $gt: 0 };
  if (filters.groups) query.groupId = { $exists: true, $ne: null };

  if (filters.search) {
    const matchingContacts = await Contact.find({
      tenantId: user.tenantId,
      $or: [
        { name: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
      ],
    }).select('_id');
    const matchingGroups = await Group.find({
      tenantId: user.tenantId,
      name: { $regex: filters.search, $options: 'i' },
    }).select('_id');
    query.$or = [
      { contactId: { $in: matchingContacts.map((contact) => contact._id) } },
      { groupId: { $in: matchingGroups.map((group) => group._id) } },
    ];
  }

  const filter = buildConversationFilter(user, query);
  const { skip, limit: lim } = getPagination({ page, limit });

  const conversations = await Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(lim)
    .populate('contactId', 'name phone whatsappId profileImage')
    .populate('groupId', 'name contactIds profileImage')
    .populate('tags', 'name')
    .lean();

  const total = await Conversation.countDocuments(filter);
  const enriched = await enrichConversations(
    conversations.map((conversation) => {
      return {
        ...conversation,
        contact: mapPopulatedContact(conversation.contactId),
        group: mapPopulatedGroup(conversation.groupId),
      };
    })
  );

  return paginatedResponse(enriched, total, page, lim);
}

export async function getConversation(user: AuthUser, conversationId: string) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId: user.tenantId,
  })
    .populate('contactId')
    .populate({
      path: 'groupId',
      select: 'name contactIds profileImage',
      populate: { path: 'contactIds', select: 'name phone whatsappId profileImage' },
    })
    .populate('tags', 'name');

  if (!conversation) return null;

  const obj = conversation.toObject();
  const [enriched] = await enrichConversations([
    {
      ...obj,
      contact: mapPopulatedContact(obj.contactId),
      group: mapPopulatedGroup(obj.groupId, true),
    },
  ]);

  return enriched;
}

export async function assignConversation(
  user: AuthUser,
  conversation: IConversation,
  assignedUserId: string
) {
  const assignee = await User.findOne({
    _id: assignedUserId,
    tenantId: user.tenantId,
    isActive: true,
  });

  if (!assignee) {
    throw new AppError(404, 'Assigned user not found');
  }

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

  const emailNotification = await notifyAssigneeByEmail(user, conversation, assignee);

  const enriched = await getConversation(user, conversation._id.toString());

  return { conversation: enriched, emailNotification };
}

async function notifyAssigneeByEmail(
  assigner: AuthUser,
  conversation: IConversation,
  assignee: {
    _id: { toString(): string };
    email: string;
    name: string;
    preferences?: { notifications?: { emailOnAssignment?: boolean } };
  }
): Promise<EmailSendResult> {
  const wantsEmail =
    assignee.preferences?.notifications?.emailOnAssignment ??
    DEFAULT_USER_PREFERENCES.notifications.emailOnAssignment;

  if (!wantsEmail) {
    return { sent: false, reason: 'disabled_by_user' };
  }

  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not_configured' };
  }

  const populated = await Conversation.findById(conversation._id)
    .populate('contactId', 'name phone')
    .populate('groupId', 'name')
    .lean();

  const contact = populated?.contactId as { name?: string; phone?: string } | undefined;
  const group = populated?.groupId as { name?: string } | undefined;
  const conversationLabel =
    group?.name ?? contact?.name ?? contact?.phone ?? `Conversation ${conversation._id.toString()}`;

  return sendConversationAssignmentEmail({
    toEmail: assignee.email,
    toName: assignee.name,
    assignedByName: assigner.name ?? 'An admin',
    conversationLabel,
    conversationId: conversation._id.toString(),
  });
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

  return getConversation(user, conversation._id.toString());
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

  await emitToAuthorizedUsers(user.tenantId, conversation._id.toString(), 'conversation.updated', {
    conversationId: conversation._id.toString(),
    priority,
  });

  return getConversation(user, conversation._id.toString());
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

  await emitToAuthorizedUsers(user.tenantId, conversation._id.toString(), 'conversation.updated', {
    conversationId: conversation._id.toString(),
    tagIds,
  });

  return getConversation(user, conversation._id.toString());
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

  return getConversation(user, conversation._id.toString());
}

export async function markAllConversationsRead(user: AuthUser) {
  const filter = buildConversationFilter(user, { unreadCount: { $gt: 0 } });
  const conversations = await Conversation.find(filter).select('_id');

  if (conversations.length === 0) {
    return { markedCount: 0 };
  }

  await Conversation.updateMany(filter, { unreadCount: 0 });

  const { ConversationRead } = await import('../../models/ConversationRead');
  const now = new Date();
  await Promise.all(
    conversations.map((conversation) =>
      ConversationRead.findOneAndUpdate(
        {
          tenantId: user.tenantId,
          conversationId: conversation._id,
          userId: user.userId,
        },
        { lastReadAt: now },
        { upsert: true }
      )
    )
  );

  await logActivity(user, 'conversations.read_all', 'tenant', user.tenantId, {
    markedCount: conversations.length,
  });

  return { markedCount: conversations.length };
}
