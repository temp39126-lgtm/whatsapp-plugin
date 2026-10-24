import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import '../src/models/Tag';
import '../src/models/Group';
import { User } from '../src/models/User';
import bcrypt from 'bcryptjs';
import { listContacts } from '../src/services/contacts/contactService';
import { buildConversationFilter } from '../src/services/rbac/conversationAccess';
import { Conversation } from '../src/models/Conversation';
import { AuthUser } from '../src/types';

describe('view_all_conversations permission scope', () => {
  let mongo: MongoMemoryServer;
  let accountId: mongoose.Types.ObjectId;
  let contactA: mongoose.Types.ObjectId;
  let contactB: mongoose.Types.ObjectId;
  let limitedUserId: string;
  let otherUserId: string;

  const limitedUser: AuthUser = {
    userId: '',
    tenantId: 'tenant-001',
    role: 'USER',
    permissions: [],
    email: 'limited@example.com',
    name: 'Limited User',
  };

  let powerUser: AuthUser;

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
    limitedUserId = new mongoose.Types.ObjectId().toString();
    otherUserId = new mongoose.Types.ObjectId().toString();
    limitedUser.userId = limitedUserId;
    const powerUserId = new mongoose.Types.ObjectId().toString();
    powerUser = {
      userId: powerUserId,
      tenantId: 'tenant-001',
      role: 'USER',
      permissions: ['view_all_conversations'],
      email: 'power@example.com',
      name: 'Power User',
    };

    const passwordHash = await bcrypt.hash('secret', 10);
    await User.create([
      {
        _id: limitedUserId,
        email: 'limited@example.com',
        passwordHash,
        name: 'Limited User',
        role: 'USER',
        tenantId: 'tenant-001',
        isActive: true,
      },
      {
        _id: otherUserId,
        email: 'other@example.com',
        passwordHash,
        name: 'Other User',
        role: 'USER',
        tenantId: 'tenant-001',
        isActive: true,
      },
      {
        _id: powerUserId,
        email: 'power@example.com',
        passwordHash,
        name: 'Power User',
        role: 'USER',
        tenantId: 'tenant-001',
        isActive: true,
        permissions: ['view_all_conversations'],
      },
    ]);

    const account = await WhatsAppAccount.create({
      tenantId: 'tenant-001',
      phoneNumberId: 'phone-1',
      businessAccountId: 'biz-1',
      displayPhoneNumber: '+15550001111',
      encryptedAccessToken: 'token',
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });
    accountId = account._id;

    const a = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Contact A',
      phone: '+15551111111',
      whatsappId: '15551111111',
      assignedUserId: limitedUserId,
    });
    const b = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Contact B',
      phone: '+15552222222',
      whatsappId: '15552222222',
      assignedUserId: otherUserId,
    });
    contactA = a._id;
    contactB = b._id;

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: contactA,
      assignedUserId: limitedUserId,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      lastMessageAt: new Date(),
      permittedUsers: [],
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: contactB,
      assignedUserId: otherUserId,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      lastMessageAt: new Date(),
      permittedUsers: [],
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: contactB,
      assignedUserId: otherUserId,
      permittedUsers: [limitedUserId],
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      lastMessageAt: new Date(),
    });
  });

  it('limits inbox query to assigned and shared chats without view_all', async () => {
    const count = await Conversation.countDocuments(buildConversationFilter(limitedUser));
    expect(count).toBe(2);
  });

  it('includes every inbox chat with view_all_conversations', async () => {
    const count = await Conversation.countDocuments(buildConversationFilter(powerUser));
    expect(count).toBe(3);
  });

  it('limits contacts list to assigned contacts without view_all', async () => {
    const result = await listContacts(limitedUser);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Contact A');
  });

  it('shows all contacts with view_all_conversations', async () => {
    const result = await listContacts(powerUser);
    expect(result.data).toHaveLength(2);
  });
});
