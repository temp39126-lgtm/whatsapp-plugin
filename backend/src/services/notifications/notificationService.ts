import { Notification, NotificationType } from '../../models/Notification';
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
  const assignedConversations = await Conversation.find({
    tenantId: user.tenantId,
    assignedUserId: user.userId,
  })
    .select('_id contactId')
    .lean();

  if (assignedConversations.length === 0) return;

  const conversationIds = assignedConversations.map((conversation) =>
    conversation._id.toString()
  );

  const existing = await Notification.find({
    tenantId: user.tenantId,
    userId: user.userId,
    type: 'assignment',
    conversationId: { $in: conversationIds },
  })
    .select('conversationId')
    .lean();

  const existingIds = new Set(existing.map((item) => item.conversationId).filter(Boolean));
  const missing = assignedConversations.filter(
    (conversation) => !existingIds.has(conversation._id.toString())
  );

  if (missing.length === 0) return;

  const contactIds = missing
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

  await Promise.all(
    missing.map((conversation) => {
      const conversationId = conversation._id.toString();
      const contactName = conversation.contactId
        ? contactNames.get(conversation.contactId.toString())
        : undefined;

      return createUserNotification({
        tenantId: user.tenantId,
        userId: user.userId,
        type: 'assignment',
        title: 'Conversation assigned to you',
        body: `You were assigned: ${contactName ?? 'Customer conversation'}`,
        href: buildInboxHref(conversationId),
        conversationId,
      });
    })
  );
}

export async function listNotifications(user: AuthUser, limit = 30): Promise<NotificationDTO[]> {
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
