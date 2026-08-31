export const ROLES = ['ADMIN', 'AGENT'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  VIEW_ALL_CONVERSATIONS: 'view_all_conversations',
  MANAGE_TEAM: 'manage_team',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_TAGS: 'manage_tags',
  VIEW_ANALYTICS: 'view_analytics',
  ASSIGN_CONVERSATIONS: 'assign_conversations',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ADMIN_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const AGENT_PERMISSIONS: Permission[] = [];
