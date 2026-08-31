import jwt, { JwtPayload, VerifyOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthUser } from '../../types';
import { ADMIN_PERMISSIONS } from '../../constants/permissions';

function getNestedClaim(payload: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, payload);
}

function normalizeRole(role: unknown): AuthUser['role'] {
  const value = String(role ?? 'USER').toUpperCase();
  if (value === 'ADMIN') return 'ADMIN';
  // Backward compatibility for older tokens/host SaaS payloads
  if (value === 'AGENT' || value === 'USER') return 'USER';
  return 'USER';
}

function normalizePermissions(
  permissions: unknown,
  role: AuthUser['role']
): string[] {
  if (Array.isArray(permissions)) {
    return permissions.map(String);
  }
  return role === 'ADMIN' ? [...ADMIN_PERMISSIONS] : [];
}

function mapPayloadToUser(payload: Record<string, unknown>): AuthUser {
  const userId = getNestedClaim(payload, env.JWT_USER_ID_CLAIM);
  const tenantId = getNestedClaim(payload, env.JWT_TENANT_ID_CLAIM);
  const role = normalizeRole(getNestedClaim(payload, env.JWT_ROLE_CLAIM));
  const permissions = normalizePermissions(
    getNestedClaim(payload, env.JWT_PERMISSIONS_CLAIM),
    role
  );

  if (!userId || !tenantId) {
    throw new Error('JWT missing required userId or tenantId claims');
  }

  return {
    userId: String(userId),
    tenantId: String(tenantId),
    role,
    permissions,
    email: payload.email as string | undefined,
    name: (payload.name as string | undefined) ?? (payload.fullName as string | undefined),
  };
}

function getVerifyOptions(): VerifyOptions {
  const options: VerifyOptions = { algorithms: [env.JWT_ALGORITHM] };
  if (env.JWT_ISSUER) options.issuer = env.JWT_ISSUER;
  if (env.JWT_AUDIENCE) options.audience = env.JWT_AUDIENCE;
  return options;
}

function getVerificationKey(): string {
  if (env.JWT_ALGORITHM === 'RS256') {
    if (!env.JWT_PUBLIC_KEY) {
      throw new Error('JWT_PUBLIC_KEY is required for RS256');
    }
    return env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
  }
  return env.JWT_SECRET;
}

async function resolveJwtUser(token: string): Promise<AuthUser> {
  if (env.JWT_INTROSPECTION_URL) {
    return resolveJwtViaIntrospection(token);
  }

  const payload = jwt.verify(token, getVerificationKey(), getVerifyOptions()) as JwtPayload;
  return mapPayloadToUser(payload as Record<string, unknown>);
}

async function resolveJwtViaIntrospection(token: string): Promise<AuthUser> {
  const response = await fetch(env.JWT_INTROSPECTION_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error('JWT introspection failed');
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (data.active === false) {
    throw new Error('JWT token is not active');
  }

  return mapPayloadToUser(data);
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
  const role = normalizeRole(data.role);
  return {
    userId: String(data.userId ?? data.id),
    tenantId: String(data.tenantId),
    role,
    permissions: normalizePermissions(data.permissions, role),
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
    case 'jwt':
    case 'local': {
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
      return resolveMockUser();
    default:
      throw new Error(`Unknown auth adapter: ${env.AUTH_ADAPTER}`);
  }
}

export { mapPayloadToUser, normalizeRole };
