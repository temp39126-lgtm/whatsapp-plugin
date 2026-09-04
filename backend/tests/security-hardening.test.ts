import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { Message } from '../src/models/Message';
import { listContacts } from '../src/services/contacts/contactService';
import { getMessageById } from '../src/services/messages/messageService';
import { listGroups, getGroup } from '../src/services/groups/groupService';
import { Group } from '../src/models/Group';
import { AppError } from '../src/types';
import type { AuthUser } from '../src/types';
import '../src/models/Tag';

describe('Security hardening', () => {
  let mongo: MongoMemoryServer;
  const userId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();

  const user: AuthUser = {
    userId,
    tenantId: 'tenant-001',
    role: 'USER',
    permissions: [],
    email: 'agent@example.com',
    name: 'Agent',
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

  it('does not expose contacts assigned to other users when searching', async () => {
    const accountId = new mongoose.Types.ObjectId();

    await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Secret Customer',
      phone: '+15559990001',
      whatsappId: '15559990001',
      assignedUserId: otherUserId,
      tags: [],
    });

    await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'My Customer',
      phone: '+15559990002',
      whatsappId: '15559990002',
      assignedUserId: userId,
      tags: [],
    });

    const results = await listContacts(user, 1, 20, 'Customer');
    expect(results.data).toHaveLength(1);
    expect(results.data[0].name).toBe('My Customer');
  });

  it('does not expose unassigned contacts to agents', async () => {
    const accountId = new mongoose.Types.ObjectId();

    await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Unassigned Lead',
      phone: '+15559990004',
      whatsappId: '15559990004',
      tags: [],
    });

    await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'My Customer',
      phone: '+15559990005',
      whatsappId: '15559990005',
      assignedUserId: userId,
      tags: [],
    });

    const results = await listContacts(user, 1, 20);
    expect(results.data).toHaveLength(1);
    expect(results.data[0].name).toBe('My Customer');
  });

  it('denies message actions on conversations assigned to another user', async () => {
    const accountId = new mongoose.Types.ObjectId();
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Other Customer',
      phone: '+15559990003',
      whatsappId: '15559990003',
      tags: [],
    });

    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: contact._id,
      assignedUserId: otherUserId,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    const message = await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'INCOMING',
      type: 'TEXT',
      content: { text: 'hello' },
      status: 'DELIVERED',
    });

    await expect(getMessageById(user, message._id.toString())).rejects.toBeInstanceOf(AppError);
  });

  it('does not expose groups without assigned contacts to agents', async () => {
    const accountId = new mongoose.Types.ObjectId();
    const assignedContact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'My Customer',
      phone: '+15559990006',
      whatsappId: '15559990006',
      assignedUserId: userId,
      tags: [],
    });
    const otherContact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Other Customer',
      phone: '+15559990007',
      whatsappId: '15559990007',
      assignedUserId: otherUserId,
      tags: [],
    });

    await Group.create({
      tenantId: 'tenant-001',
      name: 'Visible Group',
      contactIds: [assignedContact._id],
      createdBy: userId,
    });
    const hiddenGroup = await Group.create({
      tenantId: 'tenant-001',
      name: 'Hidden Group',
      contactIds: [otherContact._id],
      createdBy: otherUserId,
    });

    const groups = await listGroups(user);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Visible Group');

    await expect(getGroup(user, hiddenGroup._id.toString())).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
