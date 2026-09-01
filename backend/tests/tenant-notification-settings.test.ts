import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  env: {
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  getTenantNotificationSettings,
  updateTenantNotificationSettings,
} from '../src/services/settings/tenantSettingsService';

describe('Tenant notification settings', () => {
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

  it('returns defaults when tenant settings do not exist', async () => {
    const settings = await getTenantNotificationSettings('tenant-001');
    expect(settings.enabled).toBe(false);
    expect(settings.emailOnAssignment).toBe(true);
    expect(settings.smtpPasswordConfigured).toBe(false);
  });

  it('updates tenant notification settings', async () => {
    const updated = await updateTenantNotificationSettings('tenant-001', {
      enabled: true,
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'mailer',
      smtpPassword: 'secret',
      fromEmail: 'noreply@example.com',
      emailOnAssignment: true,
      adminAlertEmail: 'admin@example.com',
    });

    expect(updated.enabled).toBe(true);
    expect(updated.smtpHost).toBe('smtp.example.com');
    expect(updated.smtpPasswordConfigured).toBe(true);
    expect(updated.adminAlertEmail).toBe('admin@example.com');
  });
});
