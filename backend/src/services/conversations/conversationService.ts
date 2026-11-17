import { AuthUser, AppError } from '../../types';
import { Conversation, IConversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { User } from '../../models/User';
import { ConversationAssignment } from '../../models/ConversationAssignment';
import { buildConversationFilter } from '../rbac/conversationAccess';
import { logActivity } from '../rbac/activityLog';
import { emitToAuthorizedUsers, emitToUser } from '../realtime/socketService';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { enrichConversations } from './conversationEnrichment';
import { syncGroupInboxConversations } from '../groups/groupInboxService';
import { Group } from '../../models/Group';
import { sendAssignmentNotificationEmail } from '../email/emailService';
import {
  buildInboxHref,
  createUserNotification,
} from '../notifications/notificationService';
import { sendContactAssignmentNotice } from './assignmentContactNotice';
import { saveConversationWithVersion } from './conversationLock';
import { escapeRegExp } from '../../utils/regex';
import { assertActiveTenantUser } from '../users/assigneeValidation';
import { ConversationRead } from '../../models/ConversationRead';
import { InternalNote } from '../../models/InternalNote';
import mongoose from 'mongoose';

const MAX_PINNED_CHATS = 3;

interface ConversationFilters {
  status?: string;
  /** Open + pending conversations (excludes resolved/closed). */
  active?: boolean;
  assignedUserId?: string;
  unassigned?: boolean;
  assigned?: boolean;
  newToday?: boolean;
  unread?: boolean;
  priority?: string;
  tagId?: string;
  search?: string;
  mine?: boolean;
  groups?: boolean;
  assignedByAdmin?: boolean;
  hasNotes?: boolean;
  fromDate?: string;
  toDate?: string;
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

async function buildAssignedByAdminClause(tenantId: string, targetUserId: string) {
  const adminAssignments = await ConversationAssignment.find({
    tenantId,
    assignedUserId: targetUserId,
    $expr: { $ne: ['$assignedBy', '$assignedUserId'] },
  })
    .select('conversationId')
    .lean();
  const adminAssignedIds = adminAssignments.map((assignment) => assignment.conversationId);

  const ownContacts = await Contact.find({
    tenantId,
    assignedUserId: targetUserId,
  })
    .select('_id')
    .lean();
  const ownContactIds = ownContacts.map((contact) => contact._id);

  return {
    $or: [
      { _id: { $in: adminAssignedIds } },
      {
        assignedUserId: targetUserId,
        $or: [
          { contactId: { $exists: false } },
          { contactId: null },
          { contactId: { $nin: ownContactIds } },
        ],
      },
    ],
  };
}

/** Count of active conversations assigned to each user by an admin (or team inbox), not self-created contacts. */
export async function getAdminAssignedCountsByUser(
  tenantId: string
): Promise<Map<string, number>> {
  const conversations = await Conversation.find({
    tenantId,
    assignedUserId: { $exists: true, $ne: null },
  })
    .select('_id assignedUserId contactId')
    .lean();

  if (conversations.length === 0) return new Map();

  const assigneeIds = [...new Set(conversations.map((entry) => entry.assignedUserId as string))];

  const ownContacts = await Contact.find({
    tenantId,
    assignedUserId: { $in: assigneeIds },
  })
    .select('_id assignedUserId')
    .lean();

  const ownContactIdsByUser = new Map<string, Set<string>>();
  for (const contact of ownContacts) {
    const uid = contact.assignedUserId!;
    const set = ownContactIdsByUser.get(uid) ?? new Set<string>();
    set.add(contact._id.toString());
    ownContactIdsByUser.set(uid, set);
  }

  const adminAssignments = await ConversationAssignment.find({
    tenantId,
    assignedUserId: { $in: assigneeIds },
    $expr: { $ne: ['$assignedBy', '$assignedUserId'] },
  })
    .select('conversationId assignedUserId')
    .lean();

  const adminConvIdsByUser = new Map<string, Set<string>>();
  for (const row of adminAssignments) {
    const uid = row.assignedUserId;
    const set = adminConvIdsByUser.get(uid) ?? new Set<string>();
    set.add(row.conversationId.toString());
    adminConvIdsByUser.set(uid, set);
  }

  const counts = new Map<string, number>();
  for (const conv of conversations) {
    const uid = conv.assignedUserId!;
    const convId = conv._id.toString();
    const contactId = conv.contactId?.toString();
    const ownContactSet = ownContactIdsByUser.get(uid);
    const adminConvSet = adminConvIdsByUser.get(uid);

    const explicitlyByAdmin = adminConvSet?.has(convId) ?? false;
    const notOwnContact = !contactId || !ownContactSet?.has(contactId);

    if (explicitlyByAdmin || notOwnContact) {
      counts.set(uid, (counts.get(uid) ?? 0) + 1);
    }
  }

  return counts;
}

async function loadPinnedConversationIds(user: AuthUser): Promise<{ id: string; pinnedAt: Date }[]> {
  const reads = await ConversationRead.find({
    tenantId: user.tenantId,
    userId: user.userId,
    isPinned: true,
  })
    .sort({ pinnedAt: -1 })
    .select('conversationId pinnedAt')
    .lean();

  return reads
    .filter((read) => read.conversationId && read.pinnedAt)
    .map((read) => ({
      id: read.conversationId.toString(),
      pinnedAt: read.pinnedAt as Date,
    }));
}

async function attachPinStateToConversations<T extends { _id?: unknown }>(
  user: AuthUser,
  conversations: T[]
): Promise<Array<T & { isPinned: boolean; pinnedAt?: string }>> {
  if (conversations.length === 0) return [];

  const ids = conversations.map((conversation) =>
    typeof conversation._id === 'object' && conversation._id !== null && 'toString' in conversation._id
      ? (conversation._id as { toString(): string }).toString()
      : String(conversation._id)
  );

  const reads = await ConversationRead.find({
    tenantId: user.tenantId,
    userId: user.userId,
    conversationId: { $in: ids },
    isPinned: true,
  })
    .select('conversationId pinnedAt')
    .lean();

  const pinMap = new Map(
    reads.map((read) => [read.conversationId.toString(), read.pinnedAt?.toISOString()])
  );

  return conversations.map((conversation) => {
    const id =
      typeof conversation._id === 'object' && conversation._id !== null && 'toString' in conversation._id
        ? (conversation._id as { toString(): string }).toString()
        : String(conversation._id);
    const pinnedAt = pinMap.get(id);
    return {
      ...conversation,
      isPinned: Boolean(pinnedAt),
      pinnedAt,
    };
  });
}

type LeanConversationRow = Record<string, unknown>;

async function queryConversations(
  filter: Record<string, unknown>,
  options: { sort?: Record<string, 1 | -1>; skip?: number; limit?: number }
): Promise<LeanConversationRow[]> {
  let query = Conversation.find(filter)
    .populate('contactId', 'name phone whatsappId profileImage')
    .populate('groupId', 'name contactIds profileImage')
    .populate('tags', 'name');

  if (options.sort) {
    query = query.sort(options.sort);
  }
  if (options.skip) {
    query = query.skip(options.skip);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query.lean() as Promise<LeanConversationRow[]>;
}

function orderPinnedConversations(
  rows: LeanConversationRow[],
  pinnedOrder: { id: string }[]
): LeanConversationRow[] {
  const order = new Map(pinnedOrder.map((entry, index) => [entry.id, index]));
  return [...rows].sort((left, right) => {
    const leftId = String(left._id);
    const rightId = String(right._id);
    return (order.get(leftId) ?? 999) - (order.get(rightId) ?? 999);
  });
}

export async function listConversations(
  user: AuthUser,
  filters: ConversationFilters,
  page = 1,
  limit = 20
): Promise<ReturnType<typeof paginatedResponse>> {
  await syncGroupInboxConversations(user);

  const query: Record<string, unknown> = {};

  if (filters.active) {
    query.status = { $in: ['OPEN', 'PENDING'] };
  } else if (filters.status) {
    query.status = filters.status;
  }
  if (filters.priority) query.priority = filters.priority;
  if (filters.unassigned) {
    query.$or = [{ assignedUserId: { $exists: false } }, { assignedUserId: null }];
  }
  if (filters.assigned) {
    query.assignedUserId = { $exists: true, $ne: null };
  }
  if (filters.newToday) {
    query.createdAt = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
  }
  if (filters.mine) query.assignedUserId = user.userId;
  if (filters.assignedUserId) query.assignedUserId = filters.assignedUserId;
  if (filters.unread) query.unreadCount = { $gt: 0 };
  if (filters.groups) query.groupId = { $exists: true, $ne: null };

  if (filters.tagId) {
    if (!mongoose.Types.ObjectId.isValid(filters.tagId)) {
      throw new AppError(400, 'Invalid tag');
    }
    query.tags = filters.tagId;
  }

  if (filters.fromDate || filters.toDate) {
    const lastMessageAt: Record<string, Date> = {};
    if (filters.fromDate) {
      lastMessageAt.$gte = new Date(`${filters.fromDate}T00:00:00.000Z`);
    }
    if (filters.toDate) {
      const end = new Date(`${filters.toDate}T00:00:00.000Z`);
      end.setUTCHours(23, 59, 59, 999);
      lastMessageAt.$lte = end;
    }
    query.lastMessageAt = lastMessageAt;
  }

  if (filters.hasNotes) {
    const conversationIds = await InternalNote.distinct('conversationId', {
      tenantId: user.tenantId,
    });
    query._id = { $in: conversationIds };
  }

  if (filters.assignedByAdmin) {
    const targetUserId =
      filters.assignedUserId && user.role === 'ADMIN'
        ? filters.assignedUserId
        : user.userId;
    const assignedByAdminClause = await buildAssignedByAdminClause(user.tenantId, targetUserId);
    query.$and = [...((query.$and as unknown[]) ?? []), assignedByAdminClause];
  }

  if (filters.search) {
    const safeSearch = escapeRegExp(filters.search);
    const matchingContacts = await Contact.find({
      tenantId: user.tenantId,
      $or: [
        { name: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
      ],
    }).select('_id');
    const matchingGroups = await Group.find({
      tenantId: user.tenantId,
      name: { $regex: safeSearch, $options: 'i' },
    }).select('_id');
    query.$or = [
      { contactId: { $in: matchingContacts.map((contact) => contact._id) } },
      { groupId: { $in: matchingGroups.map((group) => group._id) } },
    ];
  }

  const filter = buildConversationFilter(user, query);
  const { skip, limit: lim } = getPagination({ page, limit });
  const pinnedOrder = await loadPinnedConversationIds(user);
  const pinnedIds = pinnedOrder.map((entry) => entry.id);

  let conversations: LeanConversationRow[];

  if (pinnedIds.length > 0) {
    const pinnedFilter = buildConversationFilter(user, {
      ...query,
      _id: { $in: pinnedIds },
    });
    const pinnedRows = orderPinnedConversations(
      await queryConversations(pinnedFilter, {}),
      pinnedOrder
    );
    const pinnedMatchingCount = await Conversation.countDocuments(pinnedFilter);

    if (page === 1) {
      const remaining = Math.max(0, lim - pinnedRows.length);
      const unpinnedFilter = buildConversationFilter(user, {
        ...query,
        _id: { $nin: pinnedIds },
      });
      const unpinnedRows =
        remaining > 0
          ? await queryConversations(unpinnedFilter, {
              sort: { lastMessageAt: -1 },
              limit: remaining,
            })
          : [];
      conversations = [...pinnedRows, ...unpinnedRows];
    } else {
      const unpinnedFilter = buildConversationFilter(user, {
        ...query,
        _id: { $nin: pinnedIds },
      });
      const unpinnedSkip = Math.max(0, skip - pinnedMatchingCount);
      conversations = await queryConversations(unpinnedFilter, {
        sort: { lastMessageAt: -1 },
        skip: unpinnedSkip,
        limit: lim,
      });
    }
  } else {
    conversations = await queryConversations(filter, {
      sort: { lastMessageAt: -1 },
      skip,
      limit: lim,
    });
  }

  const total = await Conversation.countDocuments(filter);
  const withPin = await attachPinStateToConversations(user, conversations);
  const enriched = await enrichConversations(
    withPin.map((conversation) => {
      return {
        ...conversation,
        contact: mapPopulatedContact(conversation.contactId),
        group: mapPopulatedGroup(conversation.groupId),
      };
    })
  );

  return paginatedResponse(enriched, total, page, lim);
}

export async function toggleConversationPin(user: AuthUser, conversation: IConversation) {
  const existing = await ConversationRead.findOne({
    tenantId: user.tenantId,
    conversationId: conversation._id,
    userId: user.userId,
  });

  const currentlyPinned = Boolean(existing?.isPinned);

  if (currentlyPinned) {
    await ConversationRead.findOneAndUpdate(
      { tenantId: user.tenantId, conversationId: conversation._id, userId: user.userId },
      { $set: { isPinned: false }, $unset: { pinnedAt: '' } },
      { upsert: true }
    );
    await logActivity(user, 'conversation.unpinned', 'conversation', conversation._id.toString());
    return { isPinned: false };
  }

  const pinnedCount = await ConversationRead.countDocuments({
    tenantId: user.tenantId,
    userId: user.userId,
    isPinned: true,
    conversationId: { $ne: conversation._id },
  });
  if (pinnedCount >= MAX_PINNED_CHATS) {
    throw new AppError(
      400,
      `You can pin up to ${MAX_PINNED_CHATS} chats. Unpin another chat first.`
    );
  }

  const pinnedAt = new Date();
  await ConversationRead.findOneAndUpdate(
    { tenantId: user.tenantId, conversationId: conversation._id, userId: user.userId },
    { $set: { isPinned: true, pinnedAt, lastReadAt: existing?.lastReadAt ?? pinnedAt } },
    { upsert: true }
  );
  await logActivity(user, 'conversation.pinned', 'conversation', conversation._id.toString());
  return { isPinned: true, pinnedAt: pinnedAt.toISOString() };
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
  const [withPin] = await attachPinStateToConversations(user, [obj]);
  const [enriched] = await enrichConversations([
    {
      ...withPin,
      contact: mapPopulatedContact(obj.contactId),
      group: mapPopulatedGroup(obj.groupId, true),
    },
  ]);

  return enriched;
}

export async function assignConversation(
  user: AuthUser,
  conversation: IConversation,
  assignedUserId: string | null,
  expectedVersion?: number
) {
  const previousAssignee = conversation.assignedUserId;

  if (assignedUserId !== null && previousAssignee === assignedUserId) {
    return getConversation(user, conversation._id.toString());
  }

  if (assignedUserId === null) {
    await saveConversationWithVersion(conversation, expectedVersion, () => {
      conversation.set('assignedUserId', undefined, { strict: false });
    });

    if (conversation.contactId && previousAssignee) {
      await Contact.updateOne(
        {
          _id: conversation.contactId,
          tenantId: user.tenantId,
          assignedUserId: previousAssignee,
        },
        { $unset: { assignedUserId: 1 } }
      );
    }

    await logActivity(user, 'conversation.unassigned', 'conversation', conversation._id.toString(), {
      previousAssignee,
    });

    const unassignedPayload = {
      conversationId: conversation._id.toString(),
      previousAssignee,
    };
    await emitToAuthorizedUsers(
      user.tenantId,
      conversation._id.toString(),
      'conversation.unassigned',
      unassignedPayload
    );
    if (previousAssignee) {
      emitToUser(previousAssignee, 'conversation.unassigned', unassignedPayload);
    }

    return getConversation(user, conversation._id.toString());
  }

  await assertActiveTenantUser(user.tenantId, assignedUserId);

  await saveConversationWithVersion(conversation, expectedVersion, () => {
    conversation.assignedUserId = assignedUserId;
  });

  if (conversation.contactId) {
    await Contact.updateOne(
      { _id: conversation.contactId, tenantId: user.tenantId },
      { $set: { assignedUserId } }
    );
  }

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

  const contact = conversation.contactId
    ? await Contact.findById(conversation.contactId).lean()
    : null;
  const conversationLabel = contact?.name ?? 'Customer conversation';

  await emitToAuthorizedUsers(user.tenantId, conversation._id.toString(), 'conversation.assigned', {
    conversationId: conversation._id.toString(),
    assignedUserId,
    conversationLabel,
    assignedByName: user.name ?? 'Admin',
  });

  if (previousAssignee && previousAssignee !== assignedUserId) {
    emitToUser(previousAssignee, 'conversation.unassigned', {
      conversationId: conversation._id.toString(),
      previousAssignee,
    });
  }

  if (assignedUserId !== user.userId && previousAssignee !== assignedUserId) {
    void createUserNotification({
      tenantId: user.tenantId,
      userId: assignedUserId,
      type: 'assignment',
      title: 'Conversation assigned to you',
      body: `${user.name ?? 'Admin'} assigned you: ${conversationLabel}`,
      href: buildInboxHref(conversation._id.toString()),
      conversationId: conversation._id.toString(),
    }).catch(() => undefined);

    void sendAssignmentNotificationEmail({
      tenantId: user.tenantId,
      assigneeUserId: assignedUserId,
      conversationLabel,
      assignedByName: user.name ?? 'Admin',
    }).catch(() => undefined);

    await sendContactAssignmentNotice({
      conversation,
      assigneeUserId: assignedUserId,
      assignedByUserId: user.userId,
    });
  }

  return getConversation(user, conversation._id.toString());
}

export async function updateConversationStatus(
  user: AuthUser,
  conversation: IConversation,
  status: string,
  expectedVersion?: number
) {
  await saveConversationWithVersion(conversation, expectedVersion, () => {
    conversation.status = status as IConversation['status'];
  });

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
  priority: string,
  expectedVersion?: number
) {
  await saveConversationWithVersion(conversation, expectedVersion, () => {
    conversation.priority = priority as IConversation['priority'];
  });

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
  tagIds: string[],
  expectedVersion?: number
) {
  await saveConversationWithVersion(conversation, expectedVersion, () => {
    conversation.tags = tagIds as unknown as IConversation['tags'];
  });

  if (conversation.contactId) {
    await Contact.updateOne(
      { _id: conversation.contactId, tenantId: user.tenantId },
      { $set: { tags: tagIds } }
    );
  }

  await logActivity(user, 'conversation.tags_updated', 'conversation', conversation._id.toString(), {
    tagIds,
  });

  await emitToAuthorizedUsers(user.tenantId, conversation._id.toString(), 'conversation.updated', {
    conversationId: conversation._id.toString(),
    tagIds,
  });

  return getConversation(user, conversation._id.toString());
}

export async function updatePermittedUsers(
  user: AuthUser,
  conversation: IConversation,
  userIds: string[],
  expectedVersion?: number
) {
  if (user.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can manage shared access');
  }

  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length > 0) {
    const validCount = await User.countDocuments({
      _id: { $in: uniqueUserIds },
      tenantId: user.tenantId,
      isActive: true,
    });
    if (validCount !== uniqueUserIds.length) {
      throw new AppError(400, 'One or more selected users are invalid');
    }
  }

  await saveConversationWithVersion(conversation, expectedVersion, () => {
    conversation.permittedUsers = uniqueUserIds;
  });

  await logActivity(user, 'conversation.permitted_users_updated', 'conversation', conversation._id.toString(), {
    userIds: uniqueUserIds,
  });

  await emitToAuthorizedUsers(user.tenantId, conversation._id.toString(), 'conversation.updated', {
    conversationId: conversation._id.toString(),
    permittedUsers: uniqueUserIds,
  });

  return getConversation(user, conversation._id.toString());
}

export async function markConversationRead(
  user: AuthUser,
  conversation: IConversation,
  lastReadMessageId?: string
) {
  await Conversation.findOneAndUpdate(
    { _id: conversation._id, tenantId: user.tenantId },
    { $set: { unreadCount: 0 } }
  );

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
