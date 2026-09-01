import { Request } from 'express';
import type { IConversation } from '../models/Conversation';
import type { ICall } from '../models/Call';

export interface AuthUser {
  userId: string;
  tenantId: string;
  role: 'ADMIN' | 'USER';
  permissions: string[];
  email?: string;
  name?: string;
  profileImage?: string;
}

export interface UserProfile extends AuthUser {
  about?: string;
  preferences: import('./preferences').UserPreferences;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  conversation?: IConversation;
  call?: ICall;
}

export function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN';
}

export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes(permission) || isAdmin(user);
}
