import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { WhatsAppAccount } from '../src/models/WhatsAppAccount';
import { createContact } from '../src/services/contacts/contactService';
import { AppError } from '../src/types';

describe('Contact service create', () => {
  let mongo: MongoMemoryServer;
  let accountId: mongoose.Types.ObjectId;

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
  });

  it('creates a contact and inbox conversation', async () => {
    const contact = await createContact(user, {
      name: 'New Customer',
      phone: '+15551234567',
    });

    expect(contact.name).toBe('New Customer');
    expect(contact.phone).toBe('+15551234567');
    expect(contact.whatsappId).toBe('15551234567');

    const stored = await Contact.findById(contact._id);
    expect(stored?.whatsappAccountId.toString()).toBe(accountId.toString());

    const conversation = await Conversation.findOne({ contactId: contact._id });
    expect(conversation).toBeTruthy();
    expect(conversation?.assignedUserId).toBeUndefined();
  });

  it('assigns new conversations to the user who created the contact', async () => {
    const agent = { ...user, userId: 'agent-id', role: 'USER' as const, name: 'Agent User' };
    const contact = await createContact(agent, {
      name: 'Agent Customer',
      phone: '+15559876543',
    });

    const conversation = await Conversation.findOne({ contactId: contact._id });
    expect(conversation?.assignedUserId).toBe('agent-id');

    const stored = await Contact.findById(contact._id);
    expect(stored?.assignedUserId).toBe('agent-id');
  });

  it('opens and claims an unassigned conversation for a user', async () => {
    const agent = { ...user, userId: 'agent-id', role: 'USER' as const, name: 'Agent User' };
    const contact = await createContact(user, {
      name: 'Legacy Customer',
      phone: '+15557654321',
    });

    const result = await import('../src/services/contacts/contactService').then((mod) =>
      mod.openContactConversation(agent, contact._id.toString())
    );

    const conversation = await Conversation.findOne({ contactId: contact._id });
    expect(result.conversationId).toBe(conversation?._id.toString());
    expect(conversation?.assignedUserId).toBe('agent-id');
  });

  it('rejects duplicate phone numbers', async () => {
    await createContact(user, { name: 'First', phone: '+15551234567' });
    await expect(
      createContact(user, { name: 'Second', phone: '15551234567' })
    ).rejects.toBeInstanceOf(AppError);
  });
});
