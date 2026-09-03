import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import {
  changeUserEmail,
  changeUserPassword,
} from '../src/services/users/userProfileService';
import type { AuthUser } from '../src/types';

describe('User profile credentials', () => {
  let mongo: MongoMemoryServer;
  let authUser: AuthUser;

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
    const user = await User.create({
      email: 'agent@example.com',
      passwordHash: await bcrypt.hash('secret123', 10),
      name: 'Support User',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
    });

    authUser = {
      userId: user._id.toString(),
      tenantId: 'tenant-001',
      role: 'USER',
      permissions: [],
      email: 'agent@example.com',
      name: 'Support User',
    };
  });

  it('changes password when current password is correct', async () => {
    const result = await changeUserPassword(authUser, 'secret123', 'newpassword456');
    expect(result.profile.email).toBe('agent@example.com');
    expect(result.token).toBeTruthy();

    const stored = await User.findById(authUser.userId).select('+passwordHash');
    const matches = await bcrypt.compare('newpassword456', stored!.passwordHash);
    expect(matches).toBe(true);
  });

  it('rejects password change with wrong current password', async () => {
    await expect(changeUserPassword(authUser, 'wrong', 'newpassword456')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('changes email when password is correct', async () => {
    const result = await changeUserEmail(authUser, 'newemail@example.com', 'secret123');
    expect(result.profile.email).toBe('newemail@example.com');
    expect(result.token).toBeTruthy();
  });

  it('rejects duplicate email in tenant', async () => {
    await User.create({
      email: 'taken@example.com',
      passwordHash: await bcrypt.hash('other123', 10),
      name: 'Other User',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
    });

    await expect(changeUserEmail(authUser, 'taken@example.com', 'secret123')).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
