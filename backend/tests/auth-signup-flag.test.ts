import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  env: {
    PUBLIC_USER_SIGNUP_ENABLED: false,
    DEFAULT_TENANT_ID: 'tenant-001',
  },
}));

import { registerUser } from '../src/services/auth/authService';
import { AppError } from '../src/types';

describe('PUBLIC_USER_SIGNUP_ENABLED', () => {
  it('rejects public signup when disabled', async () => {
    await expect(
      registerUser('New User', 'new@example.com', 'password123')
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      registerUser('New User', 'new@example.com', 'password123')
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
