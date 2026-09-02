import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import {
  loginWithPassword,
  requestPasswordReset,
  resetPasswordWithToken,
} from '../src/services/auth/authService';
import { AppError } from '../src/types';

vi.mock('../src/services/email/emailService', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(false),
  isTenantEmailConfigured: vi.fn().mockResolvedValue(false),
}));

describe('Password reset service', () => {
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
  });

  it('returns generic message for unknown email', async () => {
    const result = await requestPasswordReset('missing@example.com');
    expect(result.message).toContain('If an account exists');
    expect(result.resetUrl).toBeUndefined();
  });

  it('creates reset token and returns dev reset URL', async () => {
    const result = await requestPasswordReset('user@example.com');
    expect(result.message).toContain('could not send the reset email');
    expect(result.resetUrl).toMatch(/reset-password\?token=/);

    const user = await User.findOne({ email: 'user@example.com' }).select(
      '+passwordResetToken +passwordResetExpires'
    );
    expect(user?.passwordResetToken).toBeTruthy();
    expect(user?.passwordResetExpires).toBeTruthy();
  });

  it('resets password with valid token', async () => {
    const result = await requestPasswordReset('user@example.com');
    if (!('resetUrl' in result) || !result.resetUrl) {
      throw new Error('Expected reset URL');
    }
    const token = new URL(result.resetUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    const resetResult = await resetPasswordWithToken(token!, 'newpassword123');
    expect(resetResult.message).toContain('Password updated');

    await expect(loginWithPassword('user@example.com', 'user123')).rejects.toBeInstanceOf(AppError);
    const loginResult = await loginWithPassword('user@example.com', 'newpassword123');
    if ('requiresOtp' in loginResult) {
      throw new Error('Expected direct login without OTP in this test');
    }
    expect(loginResult.user.email).toBe('user@example.com');
  });

  it('rejects invalid reset token', async () => {
    await expect(resetPasswordWithToken('invalid-token-value', 'newpassword123')).rejects.toBeInstanceOf(
      AppError
    );
  });
});
