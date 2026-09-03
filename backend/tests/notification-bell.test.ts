import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import { Conversation } from '../src/models/Conversation';
import { Contact } from '../src/models/Contact';
import {
  createUserNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../src/services/notifications/notificationService';
import type { AuthUser } from '../src/types';

describe('In-app notifications', () => {
  let mongo: MongoMemoryServer;
  let authUser: AuthUser;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    const user = await User.create({
      email: 'agent@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      name: 'Support User',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
    });

    authUser = {
      userId: user._id.toString(),
      tenantId: 'tenant-001',
      role: 'USER',
      permissions: [],
      email: 'agent@example.com',
      name: 'Support User',
    };
  });

  it('creates and lists notifications for a user', async () => {
    await createUserNotification({
      tenantId: 'tenant-001',
      userId: authUser.userId,
      type: 'assignment',
      title: 'Conversation assigned to you',
      body: 'Admin assigned you: Jane Customer',
      href: '/whatsapp/inbox?conversation=abc',
      conversationId: 'abc',
    });

    const notifications = await listNotifications(authUser);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Conversation assigned to you');
    expect(await getUnreadNotificationCount(authUser)).toBe(1);
  });

  it('does not backfill notifications for self-assigned conversations', async () => {
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      name: 'Jane Customer',
      phone: '+15551234567',
      whatsappId: '15551234567',
      tags: [],
      assignedUserId: authUser.userId,
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      contactId: contact._id,
      assignedUserId: authUser.userId,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    const notifications = await listNotifications(authUser);
    expect(notifications).toHaveLength(0);
  });

  it('backfills assignment notifications when assigned by another user', async () => {
    const admin = await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });

    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      name: 'Jane Customer',
      phone: '+15559876543',
      whatsappId: '15559876543',
      tags: [],
    });

    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      contactId: contact._id,
      assignedUserId: authUser.userId,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    await import('../src/models/ConversationAssignment').then(({ ConversationAssignment }) =>
      ConversationAssignment.create({
        tenantId: 'tenant-001',
        conversationId: conversation._id,
        assignedUserId: authUser.userId,
        assignedBy: admin._id.toString(),
      })
    );

    const notifications = await listNotifications(authUser);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('assignment');
    expect(notifications[0].body).toContain('Admin User assigned you: Jane Customer');
    expect(await getUnreadNotificationCount(authUser)).toBe(1);
  });

  it('does not create assignment notifications for admin users', async () => {
    const adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      name: 'Praduman Singh',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });

    const result = await createUserNotification({
      tenantId: 'tenant-001',
      userId: adminUser._id.toString(),
      type: 'assignment',
      title: 'Conversation assigned to you',
      body: 'Admin User assigned you: James Brown',
      href: '/whatsapp/inbox',
    });

    expect(result).toBeNull();
    expect(await getUnreadNotificationCount({
      userId: adminUser._id.toString(),
      tenantId: 'tenant-001',
      role: 'ADMIN',
      permissions: [],
      email: 'admin@example.com',
      name: 'Praduman Singh',
    })).toBe(0);
  });

  it('marks a notification as read and supports mark all read', async () => {
    const first = await createUserNotification({
      tenantId: 'tenant-001',
      userId: authUser.userId,
      type: 'message',
      title: 'New message',
      body: 'Hello',
      href: '/whatsapp/inbox',
    });
    await createUserNotification({
      tenantId: 'tenant-001',
      userId: authUser.userId,
      type: 'message',
      title: 'Another message',
      body: 'Hi again',
      href: '/whatsapp/inbox',
    });

    expect(first).toBeTruthy();
    const updated = await markNotificationRead(authUser, first!._id);
    expect(updated?.read).toBe(true);
    expect(await getUnreadNotificationCount(authUser)).toBe(1);

    const cleared = await markAllNotificationsRead(authUser);
    expect(cleared).toBe(1);
    expect(await getUnreadNotificationCount(authUser)).toBe(0);
  });
});
