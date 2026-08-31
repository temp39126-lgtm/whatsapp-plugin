import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthUser } from '../../types';
import { ADMIN_PERMISSIONS } from '../../constants/permissions';

async function resolveJwtUser(token: string): Promise<AuthUser> {
  const payload = jwt.verify(token, env.JWT_SECRET) as Record<string, unknown>;
  return {
    userId: String(payload.sub ?? payload.userId),
    tenantId: String(payload.tenantId),
    role: (payload.role as AuthUser['role']) ?? 'AGENT',
    permissions: (payload.permissions as string[]) ?? [],
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
  };
}

async function resolveSessionUser(cookie: string): Promise<AuthUser> {
  if (!env.SESSION_INTROSPECTION_URL) {
    throw new Error('SESSION_INTROSPECTION_URL not configured');
  }
  const response = await fetch(env.SESSION_INTROSPECTION_URL, {
    headers: { Cookie: cookie },
  });
  if (!response.ok) throw new Error('Session introspection failed');
  const data = (await response.json()) as Record<string, unknown>;
  return {
    userId: String(data.userId ?? data.id),
    tenantId: String(data.tenantId),
    role: (data.role as AuthUser['role']) ?? 'AGENT',
    permissions: (data.permissions as string[]) ?? [],
    email: data.email as string | undefined,
    name: data.name as string | undefined,
  };
}

function resolveMockUser(): AuthUser {
  if (env.NODE_ENV === 'production') {
    throw new Error('Mock auth is not allowed in production');
  }
  return {
    userId: env.MOCK_USER_ID,
    tenantId: env.MOCK_TENANT_ID,
    role: env.MOCK_USER_ROLE,
    permissions: env.MOCK_USER_ROLE === 'ADMIN' ? [...ADMIN_PERMISSIONS] : [],
    email: env.MOCK_USER_EMAIL,
    name: env.MOCK_USER_NAME,
  };
}

export async function resolveAuthUser(
  authorization?: string,
  cookie?: string
): Promise<AuthUser> {
  switch (env.AUTH_ADAPTER) {
    case 'jwt': {
      if (!authorization?.startsWith('Bearer ')) {
        throw new Error('Missing bearer token');
      }
      return resolveJwtUser(authorization.slice(7));
    }
    case 'session': {
      if (!cookie) throw new Error('Missing session cookie');
      return resolveSessionUser(cookie);
    }
    case 'mock':
    default:
      return resolveMockUser();
  }
}
