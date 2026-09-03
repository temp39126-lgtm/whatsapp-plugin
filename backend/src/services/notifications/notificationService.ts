import { Notification, NotificationType } from '../../models/Notification';
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

export async function listNotifications(user: AuthUser, limit = 30): Promise<NotificationDTO[]> {
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
