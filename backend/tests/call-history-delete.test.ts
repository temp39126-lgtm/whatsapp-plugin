import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Call } from '../src/models/Call';
import { CallEvent } from '../src/models/CallEvent';
import { Message } from '../src/models/Message';
import { Conversation } from '../src/models/Conversation';
import { Contact } from '../src/models/Contact';
import {
  clearCallHistory,
  deleteCallFromHistory,
} from '../src/services/calls/callService';
import type { AuthUser } from '../src/types';

describe('Call history deletion', () => {
  let mongo: MongoMemoryServer;

  const admin: AuthUser = {
    userId: 'admin-1',
    tenantId: 'tenant-001',
    role: 'ADMIN',
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
  });

  it('deletes a completed call and its timeline message', async () => {
    const accountId = new mongoose.Types.ObjectId();
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Customer',
      phone: '+15551234567',
      whatsappId: '15551234567',
      tags: [],
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
      lastMessage: 'Outgoing call failed',
    });
    const call = await Call.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'OUTGOING',
      status: 'FAILED',
      startedAt: new Date(),
    });
    await CallEvent.create({
      tenantId: 'tenant-001',
      callId: call._id,
      eventType: 'call.failed',
    });
    await Message.create({
      tenantId: 'tenant-001',
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'OUTGOING',
      type: 'CALL',
      content: { callId: call._id.toString(), label: 'Outgoing call failed' },
      status: 'DELIVERED',
    });

    await deleteCallFromHistory(admin, call._id.toString());

    expect(await Call.countDocuments()).toBe(0);
    expect(await CallEvent.countDocuments()).toBe(0);
    expect(await Message.countDocuments({ type: 'CALL' })).toBe(0);
  });

  it('clears only terminal calls from history', async () => {
    const accountId = new mongoose.Types.ObjectId();
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Customer',
      phone: '+15551234568',
      whatsappId: '15551234568',
      tags: [],
    });
    const conversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    await Call.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'OUTGOING',
      status: 'ENDED',
      startedAt: new Date(),
    });
    await Call.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      conversationId: conversation._id,
      contactId: contact._id,
      direction: 'INCOMING',
      status: 'RINGING',
      startedAt: new Date(),
    });

    const result = await clearCallHistory(admin);
    expect(result.deleted).toBe(1);
    expect(await Call.countDocuments()).toBe(1);
    const remaining = await Call.findOne();
    expect(remaining?.status).toBe('RINGING');
  });
});
