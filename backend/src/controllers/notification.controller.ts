import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import * as notificationService from '../services/notifications/notificationService';

export async function listNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await notificationService.listNotifications(req.user!);
    const unreadCount = await notificationService.getUnreadNotificationCount(req.user!);
    res.json({ data: notifications, unreadCount });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const notification = await notificationService.markNotificationRead(
      req.user!,
      req.params.id
    );
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    const unreadCount = await notificationService.getUnreadNotificationCount(req.user!);
    res.json({ notification, unreadCount });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await notificationService.markAllNotificationsRead(req.user!);
    res.json({ unreadCount: 0 });
  } catch (error) {
    next(error);
  }
}
