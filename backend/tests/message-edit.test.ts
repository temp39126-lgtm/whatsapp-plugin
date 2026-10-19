import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Message } from '../src/models/Message';
import { Conversation } from '../src/models/Conversation';
import { Contact } from '../src/models/Contact';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import {
  EDIT_MESSAGE_WINDOW_MS,
  editMessage,
} from '../src/services/messages/messageService';
import { AppError } from '../src/types';

describe('editMessage', () => {
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

  it('updates outgoing text within the edit window', async () => {
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
      lastMessage: 'hello',
    });
    const message = await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'OUTGOING',
      type: 'TEXT',
      content: { text: 'hello' },
      status: 'SENT',
      sentByUserId: user.userId,
    });

    const updated = await editMessage(user, message, 'hello updated');

    expect(updated.content).toEqual({ text: 'hello updated' });
    expect(updated.isEdited).toBe(true);
    expect(updated.editedAt).toBeTruthy();

    const storedConversation = await Conversation.findById(conversation._id);
    expect(storedConversation?.lastMessage).toBe('hello updated');
  });

  it('rejects editing failed messages', async () => {
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
    const message = await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'OUTGOING',
      type: 'TEXT',
      content: { text: 'failed' },
      status: 'FAILED',
      sentByUserId: user.userId,
    });

    await expect(editMessage(user, message, 'new text')).rejects.toBeInstanceOf(AppError);
  });

  it('rejects editing after the time window', async () => {
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
    const message = await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'OUTGOING',
      type: 'TEXT',
      content: { text: 'old' },
      status: 'SENT',
      sentByUserId: user.userId,
      createdAt: new Date(Date.now() - EDIT_MESSAGE_WINDOW_MS - 1000),
    });

    await expect(editMessage(user, message, 'new text')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
