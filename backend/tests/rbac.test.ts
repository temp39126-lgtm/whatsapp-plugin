import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Conversation } from '../src/models/Conversation';
import {
  canAccessConversation,
  getAccessibleConversation,
  buildConversationFilter,
} from '../src/services/rbac/conversationAccess';
import { AuthUser } from '../src/types';

describe('RBAC conversation access', () => {
  const admin: AuthUser = {
    userId: 'admin-1',
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['view_all_conversations'],
  };

  const agent: AuthUser = {
    userId: 'agent-1',
    tenantId: 'tenant-a',
    role: 'USER',
    permissions: [],
  };

  const otherAgent: AuthUser = {
    userId: 'agent-2',
    tenantId: 'tenant-a',
    role: 'USER',
    permissions: [],
  };

  const conversation = {
    tenantId: 'tenant-a',
    assignedUserId: 'agent-1',
    permittedUsers: ['agent-3'],
  } as Parameters<typeof canAccessConversation>[1];

  it('allows admin for same tenant', () => {
    expect(canAccessConversation(admin, conversation)).toBe(true);
  });

  it('allows assigned agent', () => {
    expect(canAccessConversation(agent, conversation)).toBe(true);
  });

  it('allows explicitly permitted agent', () => {
    expect(
      canAccessConversation(
        { ...otherAgent, userId: 'agent-3' },
        conversation
      )
    ).toBe(true);
  });

  it('denies unassigned agent without permission', () => {
    expect(canAccessConversation(otherAgent, conversation)).toBe(false);
  });

  it('denies cross-tenant access', () => {
    expect(
      canAccessConversation(
        { ...admin, tenantId: 'tenant-b' },
        conversation
      )
    ).toBe(false);
  });

  it('builds agent filter with assignment constraints', () => {
    const filter = buildConversationFilter(agent, { status: 'OPEN' });
    expect(filter.tenantId).toBe('tenant-a');
    expect(filter.status).toBe('OPEN');
    expect(filter.$and).toEqual([
      {
        $or: [{ assignedUserId: 'agent-1' }, { permittedUsers: 'agent-1' }],
      },
    ]);
  });

  it('combines agent access with search filters', () => {
    const filter = buildConversationFilter(agent, {
      $or: [{ contactId: 'contact-1' }],
    });

    expect(filter.$and).toEqual([
      {
        $or: [{ assignedUserId: 'agent-1' }, { permittedUsers: 'agent-1' }],
      },
      {
        $or: [{ contactId: 'contact-1' }],
      },
    ]);
  });

  it('builds admin filter without assignment constraints', () => {
    const filter = buildConversationFilter(admin, { status: 'OPEN' });
    expect(filter).toEqual({ tenantId: 'tenant-a', status: 'OPEN' });
    expect(filter.$or).toBeUndefined();
  });
});

describe('Tenant isolation with database', () => {
  let mongo: MongoMemoryServer;

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

  it('returns 403 for agent accessing unassigned conversation', async () => {
    const created = await Conversation.create({
      tenantId: 'tenant-a',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      contactId: new mongoose.Types.ObjectId(),
      assignedUserId: 'agent-1',
      status: 'OPEN',
      priority: 'NORMAL',
      permittedUsers: [],
      unreadCount: 0,
    });

    const agent: AuthUser = {
      userId: 'agent-2',
      tenantId: 'tenant-a',
      role: 'USER',
      permissions: [],
    };

    await expect(getAccessibleConversation(agent, created._id.toString())).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('returns 404 for cross-tenant lookup', async () => {
    const created = await Conversation.create({
      tenantId: 'tenant-a',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      contactId: new mongoose.Types.ObjectId(),
      status: 'OPEN',
      priority: 'NORMAL',
      permittedUsers: [],
      unreadCount: 0,
    });

    const otherTenantAdmin: AuthUser = {
      userId: 'admin-2',
      tenantId: 'tenant-b',
      role: 'ADMIN',
      permissions: [],
    };

    await expect(
      getAccessibleConversation(otherTenantAdmin, created._id.toString())
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('allows admin to access tenant conversation', async () => {
    const created = await Conversation.create({
      tenantId: 'tenant-a',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      contactId: new mongoose.Types.ObjectId(),
      status: 'OPEN',
      priority: 'NORMAL',
      permittedUsers: [],
      unreadCount: 0,
    });

    const admin: AuthUser = {
      userId: 'admin-1',
      tenantId: 'tenant-a',
      role: 'ADMIN',
      permissions: [],
    };

    const result = await getAccessibleConversation(admin, created._id.toString());
    expect(result._id.toString()).toBe(created._id.toString());
  });
});
