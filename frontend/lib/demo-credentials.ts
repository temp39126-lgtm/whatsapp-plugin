import type { AuthRoleChoice } from '@/components/auth/RoleSelector';

export const DEMO_CREDENTIALS: Record<
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
