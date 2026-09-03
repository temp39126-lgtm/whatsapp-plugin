import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import {
  getUserProfile,
  updateUserPreferences,
} from '../src/services/users/userProfileService';
import type { AuthUser } from '../src/types';

describe('User notification preferences', () => {
  let mongo: MongoMemoryServer;
  const authUser: AuthUser = {
    userId: '',
    tenantId: 'tenant-001',
    role: 'USER',
    permissions: [],
    email: 'agent@example.com',
    name: 'Support User',
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
    const user = await User.create({
      email: 'agent@example.com',
      passwordHash: await bcrypt.hash('secret', 10),
      name: 'Support User',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
    });
    authUser.userId = user._id.toString();
  });

  it('returns default notification preferences for a new user', async () => {
    const profile = await getUserProfile(authUser);
    expect(profile.preferences.notifications.messageAlerts).toBe(true);
    expect(profile.preferences.notifications.sound).toBe(true);
    expect(profile.preferences.notifications.desktopNotifications).toBe(true);
    expect(profile.preferences.notifications.emailOnAssignment).toBe(true);
    expect(profile.preferences.notifications.emailSummary).toBe(false);
  });

  it('persists notification preference updates', async () => {
    const updated = await updateUserPreferences(authUser, {
      notifications: {
        messageAlerts: false,
        sound: false,
        desktopNotifications: true,
        emailSummary: true,
        emailOnAssignment: false,
      },
    });

    expect(updated.preferences.notifications.messageAlerts).toBe(false);
    expect(updated.preferences.notifications.sound).toBe(false);
    expect(updated.preferences.notifications.emailSummary).toBe(true);
    expect(updated.preferences.notifications.emailOnAssignment).toBe(false);

    const profile = await getUserProfile(authUser);
    expect(profile.preferences.notifications.messageAlerts).toBe(false);
    expect(profile.preferences.notifications.emailSummary).toBe(true);
  });
});
