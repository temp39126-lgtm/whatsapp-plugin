'use client';

import { useAuth } from '@/components/AuthProvider';
import { hasAnyPermission, hasPermission } from '@/lib/permissions';
import type { Permission } from '@shared/constants/permissions';

export function usePermissions() {
  const { user, isAdmin } = useAuth();

  return {
    user,
    isAdmin,
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    canViewAllConversations: hasPermission(user, 'view_all_conversations'),
    canAssignConversations: hasPermission(user, 'assign_conversations'),
    canManageTags: hasPermission(user, 'manage_tags'),
    canViewAnalytics: hasPermission(user, 'view_analytics'),
    canManageTeam: hasPermission(user, 'manage_team'),
    canManageSettings: hasPermission(user, 'manage_settings'),
  };
}
