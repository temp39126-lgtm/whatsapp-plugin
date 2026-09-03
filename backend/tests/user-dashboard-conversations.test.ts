import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { ConversationAssignment } from '../src/models/ConversationAssignment';
import '../src/models/Tag';
import { listConversations } from '../src/services/conversations/conversationService';
import type { AuthUser } from '../src/types';

describe('User dashboard conversation filters', () => {
  let mongo: MongoMemoryServer;
  const userId = new mongoose.Types.ObjectId().toString();

  const user: AuthUser = {
    userId,
    tenantId: 'tenant-001',
    role: 'USER',
    permissions: [],
    email: 'agent@example.com',
    name: 'praddy',
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
  });

  it('excludes own contacts from assignedByAdmin dashboard counts', async () => {
    const accountId = new mongoose.Types.ObjectId();

    const ownContact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'rohan',
      phone: '+15551110001',
      whatsappId: '15551110001',
      assignedUserId: user.userId,
      tags: [],
    });

    const teamContact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Sarah Johnson',
      phone: '+15551110002',
      whatsappId: '15551110002',
      tags: [],
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: ownContact._id,
      assignedUserId: user.userId,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: teamContact._id,
      assignedUserId: user.userId,
      status: 'PENDING',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    const allMine = await listConversations(user, { mine: true });
    expect(allMine.data).toHaveLength(2);

    const adminAssigned = await listConversations(user, { mine: true, assignedByAdmin: true });
    expect(adminAssigned.data).toHaveLength(1);
    expect(adminAssigned.data[0].contact?.name).toBe('Sarah Johnson');
  });

  it('includes conversations explicitly assigned by an admin', async () => {
    const accountId = new mongoose.Types.ObjectId();

    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Carlos Rivera',
      phone: '+15551110003',
      whatsappId: '15551110003',
      assignedUserId: user.userId,
      tags: [],
    });

    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: contact._id,
      assignedUserId: user.userId,
      status: 'PENDING',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    await ConversationAssignment.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      assignedUserId: user.userId,
      assignedBy: new mongoose.Types.ObjectId().toString(),
    });

    const adminAssigned = await listConversations(user, { mine: true, assignedByAdmin: true });
    expect(adminAssigned.data).toHaveLength(1);
    expect(adminAssigned.data[0].contact?.name).toBe('Carlos Rivera');
  });

  it('filters assigned conversations by contact search for users', async () => {
    const accountId = new mongoose.Types.ObjectId();

    const sarah = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Sarah Johnson',
      phone: '+15551110004',
      whatsappId: '15551110004',
      tags: [],
    });

    const carlos = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Carlos Rivera',
      phone: '+15551110005',
      whatsappId: '15551110005',
      tags: [],
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: sarah._id,
      assignedUserId: userId,
      status: 'PENDING',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: carlos._id,
      assignedUserId: userId,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    const results = await listConversations(user, {
      mine: true,
      assignedByAdmin: true,
      search: 'sarah',
    });

    expect(results.data).toHaveLength(1);
    expect(results.data[0].contact?.name).toBe('Sarah Johnson');
  });
});
