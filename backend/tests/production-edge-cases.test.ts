import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { Message } from '../src/models/Message';
import { User } from '../src/models/User';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { findOrCreateContact, findOrCreateConversation, processIncomingMessage, processStatusUpdate } from '../src/services/whatsapp/whatsappService';
import { atomicClaimConversation } from '../src/services/contacts/contactConversationService';
import { shouldApplyMessageStatus } from '../src/utils/messageStatus';
import type { AuthUser } from '../src/types';
import '../src/models/Tag';

describe('Production edge cases', () => {
  let mongo: MongoMemoryServer;
  let account: Awaited<ReturnType<typeof WhatsAppAccount.create>>;
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

    account = await WhatsAppAccount.create({
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

    const user = await User.create({
      email: 'agent@example.com',
      passwordHash: await bcrypt.hash('secret123', 10),
      name: 'Agent',
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
      name: 'Agent',
    };
  });

  it('normalizes duplicate whatsapp IDs across formats', async () => {
    const first = await findOrCreateContact(account, '+919876543210', 'Rohan');
    const second = await findOrCreateContact(account, '919876543210', 'Rohan');

    expect(first._id.toString()).toBe(second._id.toString());
    expect(await Contact.countDocuments({ tenantId: 'tenant-001' })).toBe(1);
  });

  it('reopens a closed conversation instead of creating a duplicate thread', async () => {
    const contact = await findOrCreateContact(account, '919111111111', 'Customer');
    const first = await findOrCreateConversation(account, contact);
    first.status = 'CLOSED';
    await first.save();

    const reopened = await findOrCreateConversation(account, contact);

    expect(reopened._id.toString()).toBe(first._id.toString());
    expect(reopened.status).toBe('OPEN');
    expect(await Conversation.countDocuments({ tenantId: 'tenant-001', contactId: contact._id })).toBe(1);
  });

  it('ignores duplicate webhook messages with the same metaMessageId', async () => {
    const contact = await findOrCreateContact(account, '919222222222', 'Customer');
    await findOrCreateConversation(account, contact);

    const incoming = {
      from: '919222222222',
      id: 'wamid.duplicate-test',
      timestamp: '1700000000',
      type: 'text',
      text: { body: 'hello' },
    };

    await processIncomingMessage(account, incoming);
    await processIncomingMessage(account, incoming);

    expect(await Message.countDocuments({ tenantId: 'tenant-001', metaMessageId: 'wamid.duplicate-test' })).toBe(1);
  });

  it('only advances message status forward', () => {
    expect(shouldApplyMessageStatus('READ', 'DELIVERED')).toBe(false);
    expect(shouldApplyMessageStatus('DELIVERED', 'READ')).toBe(true);
    expect(shouldApplyMessageStatus('SENT', 'FAILED')).toBe(true);
  });

  it('applies monotonic status updates from webhooks', async () => {
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account._id,
      name: 'Status Customer',
      phone: '+919333333333',
      whatsappId: '919333333333',
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });
    await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      metaMessageId: 'wamid.status-test',
      direction: 'OUTGOING',
      type: 'TEXT',
      content: { text: 'hi' },
      status: 'READ',
    });

    await processStatusUpdate(account, 'wamid.status-test', 'delivered');

    const message = await Message.findOne({ metaMessageId: 'wamid.status-test' });
    expect(message?.status).toBe('READ');
  });

  it('allows only one agent to atomically claim an unassigned conversation', async () => {
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account._id,
      name: 'Claim Customer',
      phone: '+919444444444',
      whatsappId: '919444444444',
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: account._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });

    const otherUser: AuthUser = {
      ...authUser,
      userId: new mongoose.Types.ObjectId().toString(),
      email: 'other@example.com',
      name: 'Other',
    };

    const firstClaim = await atomicClaimConversation(authUser, conversation._id.toString());
    const secondClaim = await atomicClaimConversation(otherUser, conversation._id.toString());

    expect(firstClaim?.assignedUserId).toBe(authUser.userId);
    expect(secondClaim).toBeNull();
  });
});
