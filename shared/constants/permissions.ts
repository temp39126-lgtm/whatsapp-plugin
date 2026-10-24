export const ROLES = ['ADMIN', 'USER'] as const;
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

export const USER_PERMISSIONS: Permission[] = [];

export const ASSIGNABLE_PERMISSIONS: Permission[] = [...ADMIN_PERMISSIONS];

export type PermissionGroup = {
  title: string;
  description?: string;
  permissions: Permission[];
};

/** Admin UI: grouped checkboxes when creating or editing team users. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'Inbox',
    description: 'WhatsApp conversations and assignment',
    permissions: [PERMISSIONS.VIEW_ALL_CONVERSATIONS, PERMISSIONS.ASSIGN_CONVERSATIONS],
  },
  {
    title: 'Contacts & tags',
    permissions: [PERMISSIONS.MANAGE_TAGS],
  },
  {
    title: 'Reporting',
    permissions: [PERMISSIONS.VIEW_ANALYTICS],
  },
  {
    title: 'Administration',
    permissions: [PERMISSIONS.MANAGE_TEAM, PERMISSIONS.MANAGE_SETTINGS],
  },
];

export const PERMISSION_LABELS: Record<
  Permission,
  { label: string; description: string }
> = {
  [PERMISSIONS.VIEW_ALL_CONVERSATIONS]: {
    label: 'View all conversations',
    description: 'See every chat in the inbox, not only assigned or shared chats.',
  },
  [PERMISSIONS.ASSIGN_CONVERSATIONS]: {
    label: 'Assign conversations',
    description: 'Assign chats to users and manage shared access on conversations.',
  },
  [PERMISSIONS.MANAGE_TAGS]: {
    label: 'Manage tags',
    description: 'Create, edit, and delete conversation tags.',
  },
  [PERMISSIONS.VIEW_ANALYTICS]: {
    label: 'View analytics',
    description: 'Open the analytics dashboard and reports.',
  },
  [PERMISSIONS.MANAGE_TEAM]: {
    label: 'Manage team',
    description: 'Create and delete user accounts and view team workload.',
  },
  [PERMISSIONS.MANAGE_SETTINGS]: {
    label: 'Manage settings',
    description: 'Meta Cloud API, webhooks, and tenant email (SMTP) settings.',
  },
};
