import type { Permission, Role } from '../constants/permissions';
import type { UserPreferences } from './preferences';

export interface AuthUser {
  userId: string;
  tenantId: string;
  role: Role;
  permissions: Permission[];
  email?: string;
  name?: string;
  profileImage?: string;
}

export interface UserProfile extends AuthUser {
  about?: string;
  preferences: UserPreferences;
}
