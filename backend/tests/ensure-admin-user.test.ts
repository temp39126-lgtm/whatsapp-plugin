import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  env: {
    NODE_ENV: 'production',
    DEFAULT_TENANT_ID: 'tenant-001',
    ADMIN_EMAIL: 'sahil.verma@tech2globe.net',
    ADMIN_PASSWORD: 'Te%t(Pass1',
    ADMIN_NAME: 'Sahil Verma',
  },
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import { ensureAdminUserFromEnv } from '../src/services/auth/authService';

describe('ensureAdminUserFromEnv', () => {
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

  it('creates admin when missing', async () => {
    await ensureAdminUserFromEnv('tenant-001');
    const user = await User.findOne({ email: 'sahil.verma@tech2globe.net' });
    expect(user?.role).toBe('ADMIN');
    expect(user?.name).toBe('Sahil Verma');
    expect(await bcrypt.compare('Te%t(Pass1', user!.passwordHash)).toBe(true);
  });

  it('updates password and role without bumping tokenVersion when password unchanged', async () => {
    await User.create({
      email: 'sahil.verma@tech2globe.net',
      passwordHash: await bcrypt.hash('Te%t(Pass1', 10),
      name: 'Old Name',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
      tokenVersion: 3,
    });

    await ensureAdminUserFromEnv('tenant-001');
    const user = await User.findOne({ email: 'sahil.verma@tech2globe.net' });
    expect(user?.role).toBe('ADMIN');
    expect(user?.name).toBe('Sahil Verma');
    expect(user?.tokenVersion).toBe(3);
  });

  it('bumps tokenVersion when password changes', async () => {
    await User.create({
      email: 'sahil.verma@tech2globe.net',
      passwordHash: await bcrypt.hash('old-password', 10),
      name: 'Admin',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
      tokenVersion: 1,
    });

    await ensureAdminUserFromEnv('tenant-001');
    const user = await User.findOne({ email: 'sahil.verma@tech2globe.net' });
    expect(user?.tokenVersion).toBe(2);
    expect(await bcrypt.compare('Te%t(Pass1', user!.passwordHash)).toBe(true);
  });
});
