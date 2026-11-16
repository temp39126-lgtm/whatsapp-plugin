import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { Message } from '../src/models/Message';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { createMessage, forwardMessageToConversation } from '../src/services/messages/messageService';

describe('forwardMessageToConversation', () => {
  let mongo: MongoMemoryServer;

  const admin = {
    userId: 'admin-id',
    tenantId: 'tenant-001',
    role: 'ADMIN' as const,
    permissions: [],
    email: 'admin@example.com',
    name: 'Admin',
  };

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
    await WhatsAppAccount.create({
      tenantId: 'tenant-001',
      phoneNumberId: 'demo-phone-number-id',
      businessAccountId: 'demo-business',
      displayPhoneNumber: '+15550001111',
      encryptedAccessToken: 'encrypted-token',
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });
  });

  it('forwards text into another individual chat', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const sourceContact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Source',
      phone: '+15551110001',
      whatsappId: '15551110001',
      tags: [],
    });
    const targetContact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Target',
      phone: '+15551110002',
      whatsappId: '15551110002',
      tags: [],
    });
    const sourceConversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: sourceContact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      permittedUsers: [],
      tags: [],
      unreadCount: 0,
    });
    const targetConversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: targetContact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      permittedUsers: [],
      tags: [],
      unreadCount: 0,
    });

    const source = await createMessage(admin, sourceConversation, {
      type: 'TEXT',
      content: { text: 'Hello there' },
    });

    const forwarded = await forwardMessageToConversation(
      admin,
      (await Message.findById(source._id))!,
      targetConversation._id.toString()
    );

    expect(forwarded.type).toBe('TEXT');
    expect((forwarded.content as { text?: string }).text).toBe('Hello there');
    expect(await Message.countDocuments({ conversationId: targetConversation._id })).toBe(1);
  });
});