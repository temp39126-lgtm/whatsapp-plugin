import type { Permission, Role } from '../constants/permissions';

export interface AuthUser {
  userId: string;
  tenantId: string;
  role: Role;
  permissions: Permission[];
  email?: string;
  name?: string;
  profileImage?: string;
}
