import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { Message } from '../src/models/Message';
import { User } from '../src/models/User';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import '../src/models/Tag';
import { assignConversation } from '../src/services/conversations/conversationService';
import type { AuthUser } from '../src/types';

describe('Contact assignment notice', () => {
  let mongo: MongoMemoryServer;
  let accountId: mongoose.Types.ObjectId;
  let admin: AuthUser;
  let agentId: string;

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
      phoneNumberId: 'demo-phone-number-id',
      businessAccountId: 'demo-business',
      displayPhoneNumber: '+15550001111',
      encryptedAccessToken: 'encrypted-token',
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });
    accountId = account._id;

    const adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      name: 'Praduman Singh',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });

    const agentUser = await User.create({
      email: 'agent@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      name: 'praddy',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
    });
    agentId = agentUser._id.toString();

    admin = {
      userId: adminUser._id.toString(),
      tenantId: 'tenant-001',
      role: 'ADMIN',
      permissions: [],
      email: 'admin@example.com',
      name: 'Praduman Singh',
    };
  });

  it('sends a WhatsApp notice to the contact when assigned to another user', async () => {
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Sarah Johnson',
      phone: '+15559876543',
      whatsappId: '15559876543',
      tags: [],
    });

    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: contact._id,
      status: 'PENDING',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    await assignConversation(admin, conversation, agentId);

    const messages = await Message.find({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      direction: 'OUTGOING',
    }).lean();

    expect(messages).toHaveLength(1);
    expect((messages[0].content as { text: string }).text).toBe(
      'Hi Sarah, your chat has been assigned to praddy. They will assist you shortly.'
    );
  });
});
