import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  env: {
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DEFAULT_TENANT_ID: 'tenant-001',
    JWT_SECRET: 'test-secret',
    JWT_ALGORITHM: 'HS256',
    JWT_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:3000',
    PASSWORD_RESET_EXPIRES_MINUTES: 60,
    OTP_EXPIRES_MINUTES: 10,
  },
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import { TenantSettings } from '../src/models/TenantSettings';
import { encrypt } from '../src/utils/encryption';
import { loginWithPassword, registerUser } from '../src/services/auth/authService';
import { verifyOtpChallenge } from '../src/services/auth/otpService';
import { completeLoginAfterOtp, completeSignupAfterOtp } from '../src/services/auth/authService';

describe('Email OTP auth', () => {
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
      email: 'user@example.com',
      passwordHash: await bcrypt.hash('user123', 10),
      name: 'Support User',
      role: 'USER',
      tenantId: 'tenant-001',
      isActive: true,
    });
    await TenantSettings.create({
      tenantId: 'tenant-001',
      notifications: {
        enabled: true,
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: 'mailer@example.com',
        encryptedSmtpPassword: encrypt('secret'),
        fromEmail: 'mailer@example.com',
        fromName: 'WhatsApp CRM',
        emailOnAssignment: true,
        notifyAdminOnUnassigned: false,
        adminAlertEmail: '',
        dailyDigestEnabled: false,
      },
    });
  });

  it('requires OTP after login when SMTP is configured', async () => {
    const result = await loginWithPassword('user@example.com', 'user123');
    expect('requiresOtp' in result).toBe(true);
    if ('requiresOtp' in result) {
      expect(result.challengeId).toBeTruthy();
      expect(result.devOtpCode).toMatch(/^\d{6}$/);
    }
  });

  it('completes login after OTP verification', async () => {
    const challenge = await loginWithPassword('user@example.com', 'user123');
    if (!('requiresOtp' in challenge) || !challenge.devOtpCode) {
      throw new Error('Expected OTP challenge');
    }

    const verified = await verifyOtpChallenge(challenge.challengeId, challenge.devOtpCode);
    const result = await completeLoginAfterOtp(verified);
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('user@example.com');
  });

  it('requires OTP during signup when SMTP is configured', async () => {
    const result = await registerUser('New User', 'newuser@example.com', 'password123');
    expect('requiresOtp' in result).toBe(true);
    if ('requiresOtp' in result) {
      const verified = await verifyOtpChallenge(result.challengeId, result.devOtpCode!);
      const created = await completeSignupAfterOtp(verified);
      expect(created.user.email).toBe('newuser@example.com');
    }
  });
});
