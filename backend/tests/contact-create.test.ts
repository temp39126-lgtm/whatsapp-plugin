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

  it('denies agents opening unassigned contacts from the contacts page', async () => {
    const agent = { ...user, userId: 'agent-id', role: 'USER' as const, name: 'Agent User' };
    const contact = await createContact(user, {
      name: 'Legacy Customer',
      phone: '+15557654321',
    });

    await expect(
      import('../src/services/contacts/contactService').then((mod) =>
        mod.openContactConversation(agent, contact._id.toString())
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('reuses the same contact when phone matches after normalization', async () => {
    const first = await createContact(user, { name: 'First', phone: '+15551234567' });
    const second = await createContact(user, { name: 'Second', phone: '15551234567' });
    expect(second._id.toString()).toBe(first._id.toString());
    expect(second.name).toBe('Second');
    expect(await Contact.countDocuments({ tenantId: 'tenant-001' })).toBe(1);
  });

  it('merges an India 10-digit save with an existing 91-digit webhook contact', async () => {
    const account = await WhatsAppAccount.findOne({ tenantId: 'tenant-001' });
    const { findOrCreateContact } = await import('../src/services/whatsapp/whatsappService');

    await findOrCreateContact(account!, '918860916437', 'naveen');

    const saved = await createContact(user, {
      name: 'Naveen Sinha',
      phone: '8860916437',
    });

    expect(saved.whatsappId).toBe('918860916437');
    expect(saved.name).toBe('Naveen Sinha');
    expect(await Contact.countDocuments({ tenantId: 'tenant-001' })).toBe(1);
    expect(await Conversation.countDocuments({ tenantId: 'tenant-001' })).toBe(1);
  });
});
