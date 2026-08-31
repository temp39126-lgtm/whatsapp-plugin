import { describe, it, expect, vi } from 'vitest';
import { mapPayloadToUser, normalizeRole } from '../src/services/rbac/authAdapter';

vi.mock('../src/config/env', () => ({
  env: {
    JWT_USER_ID_CLAIM: 'sub',
    JWT_TENANT_ID_CLAIM: 'tenantId',
    JWT_ROLE_CLAIM: 'role',
    JWT_PERMISSIONS_CLAIM: 'permissions',
    JWT_SECRET: 'test-secret',
    JWT_ALGORITHM: 'HS256',
    JWT_ISSUER: 'host-saas',
    JWT_AUDIENCE: 'whatsapp-crm',
    JWT_INTROSPECTION_URL: undefined,
    AUTH_ADAPTER: 'jwt',
    NODE_ENV: 'test',
  },
}));

describe('JWT auth mapping', () => {
  it('normalizes roles to ADMIN or USER', () => {
    expect(normalizeRole('admin')).toBe('ADMIN');
    expect(normalizeRole('user')).toBe('USER');
    expect(normalizeRole('agent')).toBe('USER');
    expect(normalizeRole('AGENT')).toBe('USER');
    expect(normalizeRole('ADMIN')).toBe('ADMIN');
  });

  it('maps standard JWT claims to AuthUser', () => {
    const user = mapPayloadToUser({
      sub: 'user-123',
      tenantId: 'tenant-456',
      role: 'admin',
      permissions: ['manage_tags'],
      email: 'admin@example.com',
      name: 'Test Admin',
    });

    expect(user).toEqual({
      userId: 'user-123',
      tenantId: 'tenant-456',
      role: 'ADMIN',
      permissions: ['manage_tags'],
      email: 'admin@example.com',
      name: 'Test Admin',
    });
  });

  it('assigns default user permissions when omitted', () => {
    const user = mapPayloadToUser({
      sub: 'user-123',
      tenantId: 'tenant-456',
      role: 'USER',
    });

    expect(user.permissions).toEqual([]);
  });
});

describe('JWT claim validation', () => {
  it('throws when tenantId is missing', () => {
    expect(() =>
      mapPayloadToUser({
        sub: 'user-123',
        role: 'USER',
      })
    ).toThrow('JWT missing required userId or tenantId claims');
  });
});
