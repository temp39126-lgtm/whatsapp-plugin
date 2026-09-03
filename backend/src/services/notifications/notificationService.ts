import { Notification, NotificationType } from '../../models/Notification';
import { ConversationAssignment } from '../../models/ConversationAssignment';
import { Conversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { User } from '../../models/User';
import { AuthUser } from '../../types';
import { emitToUser } from '../realtime/socketService';

export interface NotificationDTO {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  conversationId?: string;
  read: boolean;
  createdAt: string;
}

function toDTO(notification: {
  _id: { toString(): string };
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  conversationId?: string;
  read: boolean;
  createdAt: Date;
}): NotificationDTO {
  return {
    _id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    conversationId: notification.conversationId,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function createUserNotification(params: {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  conversationId?: string;
}): Promise<NotificationDTO | null> {
  const user = await User.findOne({
    _id: params.userId,
    tenantId: params.tenantId,
    isActive: true,
  }).lean();

  if (!user) return null;

  if (params.type === 'assignment' && user.role === 'ADMIN') {
    return null;
  }

  if (params.type === 'message' && params.conversationId) {
    const recent = await Notification.findOne({
      tenantId: params.tenantId,
      userId: params.userId,
      type: 'message',
      conversationId: params.conversationId,
      read: false,
      createdAt: { $gte: new Date(Date.now() - 60_000) },
    });

    if (recent) {
      recent.title = params.title;
      recent.body = params.body;
      recent.href = params.href;
      await recent.save();
      const dto = toDTO(recent);
      emitToUser(params.userId, 'notification.updated', dto);
      return dto;
    }
  }

  const notification = await Notification.create({
    tenantId: params.tenantId,
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    href: params.href,
    conversationId: params.conversationId,
    read: false,
  });

  const dto = toDTO(notification);
  emitToUser(params.userId, 'notification.created', dto);
  return dto;
}

export async function notifyTenantAdmins(params: {
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  conversationId?: string;
}): Promise<void> {
  const admins = await User.find({
    tenantId: params.tenantId,
    role: 'ADMIN',
    isActive: true,
  }).lean();

  await Promise.all(
    admins.map((admin) =>
      createUserNotification({
        tenantId: params.tenantId,
        userId: admin._id.toString(),
        type: params.type,
        title: params.title,
        body: params.body,
        href: params.href,
        conversationId: params.conversationId,
      })
    )
  );
}

export async function syncMissingAssignmentNotifications(user: AuthUser): Promise<void> {
  if (user.role === 'ADMIN') return;

  const assignments = await ConversationAssignment.find({
    tenantId: user.tenantId,
    assignedUserId: user.userId,
    $expr: { $ne: ['$assignedBy', '$assignedUserId'] },
  })
    .sort({ assignedAt: -1 })
    .lean();

  if (assignments.length === 0) return;

  const conversationIds = assignments.map((assignment) => assignment.conversationId.toString());

  const existing = await Notification.find({
    tenantId: user.tenantId,
    userId: user.userId,
    type: 'assignment',
    conversationId: { $in: conversationIds },
  })
    .select('conversationId')
    .lean();

  const existingIds = new Set(existing.map((item) => item.conversationId).filter(Boolean));
  const missing = assignments.filter(
    (assignment) => !existingIds.has(assignment.conversationId.toString())
  );

  if (missing.length === 0) return;

  const assignerIds = [...new Set(missing.map((assignment) => assignment.assignedBy))];
  const assigners = await User.find({ _id: { $in: assignerIds } })
    .select('_id name')
    .lean();
  const assignerNames = new Map(
    assigners.map((assigner) => [assigner._id.toString(), assigner.name])
  );

  const conversationContactIds = await Conversation.find({
    _id: { $in: missing.map((assignment) => assignment.conversationId) },
  })
    .select('_id contactId')
    .lean();

  const contactIds = conversationContactIds
    .map((conversation) => conversation.contactId)
    .filter(Boolean);
  const contacts = contactIds.length
    ? await Contact.find({ _id: { $in: contactIds } })
        .select('_id name')
        .lean()
    : [];
  const contactNames = new Map(
    contacts.map((contact) => [contact._id.toString(), contact.name])
  );
  const conversationContacts = new Map(
    conversationContactIds.map((conversation) => [
      conversation._id.toString(),
      conversation.contactId?.toString(),
    ])
  );

  await Promise.all(
    missing.map((assignment) => {
      const conversationId = assignment.conversationId.toString();
      const contactId = conversationContacts.get(conversationId);
      const contactName = contactId ? contactNames.get(contactId) : undefined;
      const assignerName = assignerNames.get(assignment.assignedBy) ?? 'Admin';

      return createUserNotification({
        tenantId: user.tenantId,
        userId: user.userId,
        type: 'assignment',
        title: 'Conversation assigned to you',
        body: `${assignerName} assigned you: ${contactName ?? 'Customer conversation'}`,
        href: buildInboxHref(conversationId),
        conversationId,
      });
    })
  );
}

export async function listNotifications(user: AuthUser, limit = 30): Promise<NotificationDTO[]> {
  if (user.role === 'ADMIN') {
    await Notification.deleteMany({
      tenantId: user.tenantId,
      userId: user.userId,
      type: 'assignment',
    });
  } else {
    await Notification.deleteMany({
      tenantId: user.tenantId,
      userId: user.userId,
      type: 'assignment',
      body: { $regex: /^You were assigned:/ },
    });
  }

  await syncMissingAssignmentNotifications(user);

  const notifications = await Notification.find({
    tenantId: user.tenantId,
    userId: user.userId,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return notifications.map((notification) =>
    toDTO({
      ...notification,
      _id: { toString: () => notification._id.toString() },
      createdAt: notification.createdAt,
    })
  );
}

export async function getUnreadNotificationCount(user: AuthUser): Promise<number> {
  return Notification.countDocuments({
    tenantId: user.tenantId,
    userId: user.userId,
    read: false,
  });
}

export async function markNotificationRead(
  user: AuthUser,
  notificationId: string
): Promise<NotificationDTO | null> {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, tenantId: user.tenantId, userId: user.userId },
    { read: true },
    { new: true }
  );

  if (!notification) return null;
  return toDTO(notification);
}

export async function markAllNotificationsRead(user: AuthUser): Promise<number> {
  const result = await Notification.updateMany(
    { tenantId: user.tenantId, userId: user.userId, read: false },
    { read: true }
  );
  return result.modifiedCount;
}

export function buildInboxHref(conversationId?: string): string {
  return conversationId
    ? `/whatsapp/inbox?conversation=${conversationId}`
    : '/whatsapp/inbox';
}
