import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import { enforceActiveSession } from '../src/services/auth/sessionService';
import { signAuthToken } from '../src/services/auth/authService';

describe('Session permission hydration', () => {
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

  it('loads stored permissions from the database for API requests', async () => {
    const user = await User.create({
      email: 'agent@example.com',
      passwordHash: await bcrypt.hash('secret123', 10),
      name: 'Agent',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
      permissions: ['view_all_conversations'],
      tokenVersion: 0,
    });

    const token = signAuthToken(
      {
        userId: user._id.toString(),
        tenantId: 'tenant-001',
        role: 'USER',
        permissions: [],
        email: user.email,
        name: user.name,
      },
      0
    );

    const hydrated = await enforceActiveSession(`Bearer ${token}`, {
      userId: user._id.toString(),
      tenantId: 'tenant-001',
      role: 'USER',
      permissions: [],
      email: user.email,
      name: user.name,
    });

    expect(hydrated.permissions).toContain('view_all_conversations');
  });
});
