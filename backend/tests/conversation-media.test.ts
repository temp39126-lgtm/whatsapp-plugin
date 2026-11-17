import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Message } from '../src/models/Message';
import { Conversation } from '../src/models/Conversation';
import { Contact } from '../src/models/Contact';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import {
  getConversationMediaSummary,
  listConversationMedia,
} from '../src/services/conversations/conversationMediaService';

describe('conversation media history', () => {
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

  it('returns counts and lists items by category', async () => {
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

    await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      metaMessageId: 'wamid.image-1',
      direction: 'INCOMING',
      type: 'IMAGE',
      content: {},
      status: 'DELIVERED',
    });
    await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      metaMessageId: 'wamid.doc-1',
      direction: 'OUTGOING',
      type: 'DOCUMENT',
      content: { fileName: 'quote.pdf' },
      status: 'SENT',
    });
    await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      metaMessageId: 'wamid.deleted-1',
      direction: 'OUTGOING',
      type: 'TEXT',
      content: { text: 'deleted' },
      status: 'SENT',
      deletedForEveryone: true,
    });

    const summary = await getConversationMediaSummary(user, String(conversation._id));
    expect(summary.images).toBe(1);
    expect(summary.files).toBe(1);

    const images = await listConversationMedia(user, String(conversation._id), 'images', 1, 10);
    expect(images.data).toHaveLength(1);
    expect(images.data[0].type).toBe('IMAGE');
  });
});