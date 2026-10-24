import { ADMIN_PERMISSIONS } from '../constants/permissions';

const ASSIGNABLE = new Set<string>(ADMIN_PERMISSIONS);

export function sanitizeStoredPermissions(
  role: 'ADMIN' | 'USER',
  permissions?: string[] | null
): string[] {
  if (role === 'ADMIN') {
    return [...ADMIN_PERMISSIONS];
  }
  if (!Array.isArray(permissions)) {
    return [];
  }
  return [...new Set(permissions.filter((entry) => ASSIGNABLE.has(entry)))];
}
