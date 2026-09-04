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

let capturedResetUrl = '';

vi.mock('../src/services/email/emailService', () => ({
  sendPasswordResetEmail: vi.fn().mockImplementation(async (params: { resetUrl: string }) => {
    capturedResetUrl = params.resetUrl;
    return false;
  }),
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
    capturedResetUrl = '';
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
    expect('resetUrl' in result).toBe(false);
  });

  it('creates reset token without exposing reset URL in API response', async () => {
    const result = await requestPasswordReset('user@example.com');
    expect(result.message).toContain('could not send the reset email');
    expect('resetUrl' in result).toBe(false);
    expect(capturedResetUrl).toMatch(/reset-password\?token=/);

    const user = await User.findOne({ email: 'user@example.com' }).select(
      '+passwordResetToken +passwordResetExpires'
    );
    expect(user?.passwordResetToken).toBeTruthy();
    expect(user?.passwordResetExpires).toBeTruthy();
  });

  it('resets password with valid token', async () => {
    await requestPasswordReset('user@example.com');
    expect(capturedResetUrl).toMatch(/reset-password\?token=/);
    const token = new URL(capturedResetUrl).searchParams.get('token');
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
