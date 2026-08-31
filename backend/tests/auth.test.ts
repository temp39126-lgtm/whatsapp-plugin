import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
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
  it('normalizes host SaaS roles', () => {
    expect(normalizeRole('admin')).toBe('ADMIN');
    expect(normalizeRole('agent')).toBe('AGENT');
    expect(normalizeRole('ADMIN')).toBe('ADMIN');
  });

  it('maps standard JWT claims to AuthUser', () => {
    const user = mapPayloadToUser({
      sub: 'user-123',
      tenantId: 'tenant-456',
      role: 'admin',
      permissions: ['manage_tags'],
      email: 'agent@example.com',
      name: 'Test Agent',
    });

    expect(user).toEqual({
      userId: 'user-123',
      tenantId: 'tenant-456',
      role: 'ADMIN',
      permissions: ['manage_tags'],
      email: 'agent@example.com',
      name: 'Test Agent',
    });
  });

  it('assigns default agent permissions when omitted', () => {
    const user = mapPayloadToUser({
      sub: 'user-123',
      tenantId: 'tenant-456',
      role: 'AGENT',
    });

    expect(user.permissions).toEqual([]);
  });

  it('verifies HS256 tokens from host SaaS', () => {
    const token = jwt.sign(
      {
        sub: 'saas-user-1',
        tenantId: 'saas-tenant-1',
        role: 'AGENT',
        permissions: [],
      },
      'test-secret',
      { issuer: 'host-saas', audience: 'whatsapp-crm' }
    );

    const payload = jwt.verify(token, 'test-secret', {
      issuer: 'host-saas',
      audience: 'whatsapp-crm',
    }) as Record<string, unknown>;

    const user = mapPayloadToUser(payload);
    expect(user.userId).toBe('saas-user-1');
    expect(user.tenantId).toBe('saas-tenant-1');
  });
});

describe('JWT claim validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws when tenantId is missing', () => {
    expect(() =>
      mapPayloadToUser({
        sub: 'user-123',
        role: 'AGENT',
      })
    ).toThrow('JWT missing required userId or tenantId claims');
  });
});
