import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { Contact } from '../src/models/Contact';
import { Conversation } from '../src/models/Conversation';
import { ConversationAssignment } from '../src/models/ConversationAssignment';
import { User } from '../src/models/User';
import { getTeamWorkload } from '../src/services/analytics/analyticsService';
import type { AuthUser } from '../src/types';

describe('Team workload admin-assigned counts', () => {
  let mongo: MongoMemoryServer;
  let agentId: string;
  let adminId: string;

  const admin: AuthUser = {
    userId: '',
    tenantId: 'tenant-001',
    role: 'ADMIN',
    permissions: ['manage_team'],
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

    const agent = await User.create({
      email: 'agent@example.com',
      passwordHash: await bcrypt.hash('pass', 10),
      name: 'Agent',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
    });
    const adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('pass', 10),
      name: 'Admin',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });
    agentId = agent._id.toString();
    adminId = adminUser._id.toString();
    admin.userId = adminId;

    const accountId = new mongoose.Types.ObjectId();

    const ownContact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Own lead',
      phone: '+15550000001',
      whatsappId: '15550000001',
      assignedUserId: agentId,
      tags: [],
    });

    const teamContact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      name: 'Team lead',
      phone: '+15550000002',
      whatsappId: '15550000002',
      tags: [],
    });

    await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: ownContact._id,
      assignedUserId: agentId,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    const teamConversation = await Conversation.create({
      tenantId: 'tenant-001',
      whatsappAccountId: accountId,
      contactId: teamContact._id,
      assignedUserId: agentId,
      status: 'PENDING',
      priority: 'NORMAL',
      unreadCount: 0,
      permittedUsers: [],
    });

    await ConversationAssignment.create({
      tenantId: 'tenant-001',
      conversationId: teamConversation._id,
      assignedUserId: agentId,
      assignedBy: adminId,
    });
  });

  it('reports assignedByAdmin separately from total assigned per user', async () => {
    const workload = await getTeamWorkload(admin);
    const agent = workload.find((row) => row._id === agentId);
    expect(agent).toBeTruthy();
    expect(agent!.total).toBe(2);
    expect(agent!.assignedByAdmin).toBe(1);
  });
});
