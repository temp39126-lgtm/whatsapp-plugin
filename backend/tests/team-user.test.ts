import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/User';
import { createTeamUser } from '../src/services/users/teamUserService';
import { AppError } from '../src/types';
import bcrypt from 'bcryptjs';

describe('Team user service', () => {
  let mongo: MongoMemoryServer;

  const adminUser = {
    userId: 'admin-id',
    tenantId: 'tenant-001',
    role: 'ADMIN' as const,
    permissions: ['manage_team'],
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
    await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });
  });

  it('creates an agent account in the admin tenant', async () => {
    const user = await createTeamUser(adminUser, {
      name: 'New Agent',
      email: 'agent@example.com',
      password: 'password123',
    });

    expect(user.name).toBe('New Agent');
    expect(user.email).toBe('agent@example.com');
    expect(user.role).toBe('USER');

    const stored = await User.findOne({ email: 'agent@example.com' });
    expect(stored?.tenantId).toBe('tenant-001');
  });

  it('rejects duplicate email in tenant', async () => {
    await createTeamUser(adminUser, {
      name: 'Agent One',
      email: 'agent@example.com',
      password: 'password123',
    });

    await expect(
      createTeamUser(adminUser, {
        name: 'Agent Two',
        email: 'agent@example.com',
        password: 'password456',
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
