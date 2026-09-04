import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Contact } from '../src/models/Contact';
import { User } from '../src/models/User';
import { deleteContact, getContactAvatar } from '../src/services/contacts/contactService';
import { enforceActiveSession } from '../src/services/auth/sessionService';
import { logoutUser, signAuthToken, userToAuthUser } from '../src/services/auth/authService';
import { storeAvatar } from '../src/services/avatars/avatarService';
import { AppError } from '../src/types';
import type { AuthUser } from '../src/types';

describe('Security audit fixes', () => {
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

  it('rejects contact delete for non-admin users', async () => {
    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      name: 'Customer',
      phone: '+15551234567',
      whatsappId: '15551234567',
      tags: [],
    });

    const agent: AuthUser = {
      userId: new mongoose.Types.ObjectId().toString(),
      tenantId: 'tenant-001',
      role: 'USER',
      permissions: [],
      email: 'agent@example.com',
      name: 'Agent',
    };

    await expect(deleteContact(agent, contact._id.toString())).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('denies contact avatar access for contacts assigned to another user', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const otherUserId = new mongoose.Types.ObjectId().toString();
    const storageKey = await storeAvatar(
      'tenant-001',
      'contacts',
      new mongoose.Types.ObjectId().toString(),
      'avatar.png',
      Buffer.from('fake-image'),
      'image/png'
    );

    const contact = await Contact.create({
      tenantId: 'tenant-001',
      whatsappAccountId: new mongoose.Types.ObjectId(),
      name: 'Private Customer',
      phone: '+15559876543',
      whatsappId: '15559876543',
      assignedUserId: ownerId,
      profileImage: storageKey,
      tags: [],
    });

    const intruder: AuthUser = {
      userId: otherUserId,
      tenantId: 'tenant-001',
      role: 'USER',
      permissions: [],
      email: 'other@example.com',
      name: 'Other',
    };

    await expect(getContactAvatar(intruder, contact._id.toString())).rejects.toBeInstanceOf(AppError);
  });

  it('uses the database role instead of a stale admin role in JWT', async () => {
    const user = await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('secret123', 10),
      name: 'Admin',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
      tokenVersion: 0,
    });

    const staleAdminToken = signAuthToken(
      {
        userId: user._id.toString(),
        tenantId: 'tenant-001',
        role: 'ADMIN',
        permissions: ['manage_settings'],
        email: user.email,
        name: user.name,
      },
      0
    );

    const hydrated = await enforceActiveSession(`Bearer ${staleAdminToken}`, {
      userId: user._id.toString(),
      tenantId: 'tenant-001',
      role: 'ADMIN',
      permissions: ['manage_settings'],
      email: user.email,
      name: user.name,
    });

    expect(hydrated.role).toBe('USER');
  });

  it('invalidates JWT after logout', async () => {
    const user = await User.create({
      email: 'agent@example.com',
      passwordHash: await bcrypt.hash('secret123', 10),
      name: 'Agent',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
      tokenVersion: 0,
    });

    const authUser = userToAuthUser(user);
    const token = signAuthToken(authUser, 0);

    await logoutUser(user._id.toString());

    await expect(enforceActiveSession(`Bearer ${token}`, authUser)).rejects.toMatchObject({
      statusCode: 401,
    });

    const decoded = jwt.decode(token) as { tv?: number };
    expect(decoded.tv).toBe(0);
  });
});
