import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Conversation } from '../src/models/Conversation';
import { Contact } from '../src/models/Contact';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { Notification } from '../src/models/Notification';
import { User } from '../src/models/User';
import { createUserNotification } from '../src/services/notifications/notificationService';
import {
  updateConversationStatus,
  updatePermittedUsers,
} from '../src/services/conversations/conversationService';
import type { AuthUser } from '../src/types';
import '../src/models/Tag';

describe('Remaining edge case fixes', () => {
  let mongo: MongoMemoryServer;
  let admin: AuthUser;
  let conversation: Awaited<ReturnType<typeof Conversation.create>>;

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

    const account = await WhatsAppAccount.create({
      tenantId: 'tenant-001',
      metaAppId: 'app',
      encryptedAppSecret: 'secret',
      phoneNumberId: 'demo-phone-number-id',
      businessAccountId: 'biz',
      displayPhoneNumber: '+10000000000',
      encryptedAccessToken: 'token',
      webhookVerifyToken: 'verify',
      metaApiVersion: 'v20.0',
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });

    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account._id,
      name: 'Customer',
      phone: '+919999999999',
      whatsappId: '919999999999',
    });

    conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    await User.create({
      email: 'admin@example.com',
      passwordHash: 'hash',
      name: 'Admin',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });

    await User.create({
      email: 'user@example.com',
      passwordHash: 'hash',
      name: 'User',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
    });

    admin = {
      userId: new mongoose.Types.ObjectId().toString(),
      tenantId: 'tenant-001',
      role: 'ADMIN',
      permissions: ['assign_conversations'],
      email: 'admin@example.com',
      name: 'Admin',
    };
  });

  it('throttles unread message notifications per conversation', async () => {
    const user = await User.findOne({ email: 'user@example.com' });
    const userId = user!._id.toString();

    await createUserNotification({
      tenantId: 'tenant-001',
      userId,
      type: 'message',
      title: 'First',
      body: 'hello',
      href: '/whatsapp/inbox',
      conversationId: conversation._id.toString(),
    });

    await createUserNotification({
      tenantId: 'tenant-001',
      userId,
      type: 'message',
      title: 'Second',
      body: 'hello again',
      href: '/whatsapp/inbox',
      conversationId: conversation._id.toString(),
    });

    const count = await Notification.countDocuments({
      tenantId: 'tenant-001',
      userId,
      type: 'message',
      conversationId: conversation._id.toString(),
    });
    expect(count).toBe(1);

    const stored = await Notification.findOne({ userId, type: 'message' });
    expect(stored?.body).toBe('hello again');
  });

  it('rejects stale conversation updates with version conflict', async () => {
    await expect(
      updateConversationStatus(admin, conversation, 'PENDING', 999)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('lets admins manage permitted users on a conversation', async () => {
    const sharedUser = await User.findOne({ email: 'user@example.com' });
    const updated = await updatePermittedUsers(admin, conversation, [
      sharedUser!._id.toString(),
    ]);

    expect(updated?.permittedUsers).toContain(sharedUser!._id.toString());
  });
});
