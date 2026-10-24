import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Conversation } from '../src/models/Conversation';
import { Contact } from '../src/models/Contact';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { Message } from '../src/models/Message';
import { buildConversationExportText } from '../src/services/conversations/conversationExportService';
import type { AuthUser } from '../src/types';

describe('conversation export', () => {
  let mongo: MongoMemoryServer;

  const admin: AuthUser = {
    userId: 'admin-1',
    tenantId: 'tenant-export',
    role: 'ADMIN',
    email: 'admin@test.com',
    name: 'Admin',
    permissions: ['view_all_conversations'],
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
    await mongoose.connection.dropDatabase();
  });

  it('builds WhatsApp-style text export for accessible conversation', async () => {
    const account = await WhatsAppAccount.create({
      tenantId: 'tenant-export',
      phoneNumberId: 'phone-1',
      displayPhoneNumber: '+10000000000',
      businessAccountId: 'biz-1',
      encryptedAccessToken: 'token',
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    });
    const contact = await Contact.create({
      tenantId: 'tenant-export',
      whatsappAccountId: account._id,
      name: 'Alice',
      phone: '+15551234567',
      whatsappId: '15551234567',
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-export',
      whatsappAccountId: account._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });
    await Message.create({
      tenantId: 'tenant-export',
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'INCOMING',
      type: 'TEXT',
      content: { text: 'Hello from Alice' },
      status: 'DELIVERED',
      metaMessageId: 'meta-in-1',
    });
    await Message.create({
      tenantId: 'tenant-export',
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'OUTGOING',
      type: 'TEXT',
      content: { text: 'Hi Alice' },
      status: 'READ',
      sentByUserId: 'admin-1',
      metaMessageId: 'meta-out-1',
    });

    const { title, text } = await buildConversationExportText(admin, conversation, {
      includeMediaReferences: false,
    });

    expect(title).toBe('Alice');
    expect(text).toContain('WhatsApp chat export — Alice');
    expect(text).toContain('Alice: Hello from Alice');
    expect(text).toContain('You: Hi Alice');
  });
});
