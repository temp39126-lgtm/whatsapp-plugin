import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/User';
import { loginWithPassword, registerUser } from '../src/services/auth/authService';
import bcrypt from 'bcryptjs';
import { AppError } from '../src/types';

describe('Local auth login service', () => {
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
    await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: 'tenant-001',
      isActive: true,
    });
    await User.create({
      email: 'user@example.com',
      passwordHash: await bcrypt.hash('user123', 10),
      name: 'Support User',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
    });
  });

  it('logs in admin and returns JWT', async () => {
    const result = await loginWithPassword('admin@example.com', 'admin123');
    expect(result.token).toBeTruthy();
    expect(result.user.role).toBe('ADMIN');
    expect(result.user.email).toBe('admin@example.com');
  });

  it('logs in user role account', async () => {
    const result = await loginWithPassword('user@example.com', 'user123');
    expect(result.user.role).toBe('USER');
  });

  it('rejects duplicate signup email', async () => {
    await expect(registerUser('Another User', 'admin@example.com', 'password123')).rejects.toBeInstanceOf(
      AppError
    );
  });

  it('creates a new user account', async () => {
    const result = await registerUser('New User', 'newuser@example.com', 'password123');
    expect(result.user.role).toBe('USER');
    expect(result.user.email).toBe('newuser@example.com');
    expect(result.token).toBeTruthy();
  });
});
