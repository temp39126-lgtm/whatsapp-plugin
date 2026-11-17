import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Message } from '../src/models/Message';
import { Conversation } from '../src/models/Conversation';
import { Contact } from '../src/models/Contact';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { listMessages } from '../src/services/messages/messageService';

describe('listMessages search and date filters', () => {
  let mongo: MongoMemoryServer;

  const user = {
    userId: 'admin-id',
    tenantId: 'tenant-001',
    role: 'ADMIN' as const,
    permissions: [],
    email: 'admin@example.com',
    name: 'Admin User',
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
      phoneNumberId: 'phone-id',
      businessAccountId: 'waba',
      displayPhoneNumber: '+15550001111',
      encryptedAccessToken: 'token',
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });
  });

  it('filters by search text and date range', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      name: 'Customer',
      phone: '+15551234567',
      whatsappId: '15551234567',
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account!._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });

    const day1 = new Date('2025-01-10T12:00:00.000Z');
    const day2 = new Date('2025-01-15T12:00:00.000Z');

    await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      metaMessageId: 'wamid-1',
      direction: 'INCOMING',
      type: 'TEXT',
      content: { text: 'hello invoice' },
      status: 'DELIVERED',
      createdAt: day1,
    });
    await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      metaMessageId: 'wamid-2',
      direction: 'INCOMING',
      type: 'TEXT',
      content: { text: 'other message' },
      status: 'DELIVERED',
      createdAt: day2,
    });

    const searched = await listMessages(user, String(conversation._id), 1, 50, undefined, {
      search: 'invoice',
    });
    expect(searched.data).toHaveLength(1);
    expect((searched.data[0] as { content: { text: string } }).content.text).toBe('hello invoice');

    const ranged = await listMessages(user, String(conversation._id), 1, 50, undefined, {
      fromDate: '2025-01-14',
      toDate: '2025-01-15',
    });
    expect(ranged.data).toHaveLength(1);
    expect((ranged.data[0] as { content: { text: string } }).content.text).toBe('other message');
  });
});