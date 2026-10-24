import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../src/services/email/emailService', () => ({
  sendTeamUserWelcomeEmail: vi.fn().mockResolvedValue(true),
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import {
  createTeamUser,
  updateTeamUserPermissions,
} from '../src/services/users/teamUserService';

describe('team user permissions', () => {
  let mongo: MongoMemoryServer;

  function adminAuth(userId: string) {
    return {
      userId,
      tenantId: 'tenant-001',
      role: 'ADMIN' as const,
      permissions: ['manage_team'],
      email: 'admin@example.com',
      name: 'Admin User',
    };
  }

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
    await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });
  });

  it('stores selected permissions when creating a user', async () => {
    const admin = await User.findOne({ email: 'admin@example.com' });
    const created = await createTeamUser(adminAuth(admin!._id.toString()), {
      name: 'Agent',
      email: 'agent@example.com',
      password: 'password123',
      permissions: ['view_analytics', 'assign_conversations'],
    });

    expect(created.permissions).toEqual(
      expect.arrayContaining(['view_analytics', 'assign_conversations'])
    );

    const stored = await User.findOne({ email: 'agent@example.com' });
    expect(stored?.permissions).toEqual(
      expect.arrayContaining(['view_analytics', 'assign_conversations'])
    );
  });

  it('updates permissions for an existing user', async () => {
    const admin = await User.findOne({ email: 'admin@example.com' });
    const adminUser = adminAuth(admin!._id.toString());
    const created = await createTeamUser(adminUser, {
      name: 'Agent',
      email: 'agent@example.com',
      password: 'password123',
      permissions: [],
    });

    const updated = await updateTeamUserPermissions(adminUser, created._id, [
      'view_all_conversations',
    ]);

    expect(updated.permissions).toContain('view_all_conversations');
  });
});
