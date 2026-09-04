import type { AuthRoleChoice } from '@/components/auth/RoleSelector';

const DEV_DEMO_CREDENTIALS: Record<
  AuthRoleChoice,
  { email: string; password: string; label: string }
> = {
  USER: {
    email: 'user@example.com',
    password: 'user123',
    label: 'User',
  },
  ADMIN: {
    email: 'admin@example.com',
    password: 'admin123',
    label: 'Admin',
  },
};

const EMPTY_DEMO_CREDENTIALS: Record<
  AuthRoleChoice,
  { email: string; password: string; label: string }
> = {
  USER: {
    email: '',
    password: '',
    label: 'User',
  },
  ADMIN: {
    email: '',
    password: '',
    label: 'Admin',
  },
};

export function isDemoAuthEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function getDemoCredentials(): Record<
  AuthRoleChoice,
  { email: string; password: string; label: string }
> {
  return isDemoAuthEnabled() ? DEV_DEMO_CREDENTIALS : EMPTY_DEMO_CREDENTIALS;
}

/** @deprecated Use getDemoCredentials() so production builds do not ship demo passwords. */
export const DEMO_CREDENTIALS = getDemoCredentials();
