import type { Permission } from '@shared/constants/permissions';
import type { AuthUser } from '@/types';

export function hasPermission(
  user: AuthUser | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}
