import { PERMISSIONS, type Permission } from '@shared/constants/permissions';

export type TeamUserRolePresetId = 'agent' | 'supervisor' | 'manager' | 'custom';

export type TeamUserRolePreset = {
  id: TeamUserRolePresetId;
  label: string;
  description: string;
  permissions: Permission[] | null;
};

export const TEAM_USER_ROLE_PRESETS: TeamUserRolePreset[] = [
  {
    id: 'agent',
    label: 'Agent',
    description: 'Assigned and shared chats only',
    permissions: [],
  },
  {
    id: 'supervisor',
    label: 'Supervisor',
    description: 'All conversations and analytics',
    permissions: [PERMISSIONS.VIEW_ALL_CONVERSATIONS, PERMISSIONS.VIEW_ANALYTICS],
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Supervisor access plus tags and settings',
    permissions: [
      PERMISSIONS.VIEW_ALL_CONVERSATIONS,
      PERMISSIONS.VIEW_ANALYTICS,
      PERMISSIONS.MANAGE_TAGS,
      PERMISSIONS.MANAGE_SETTINGS,
    ],
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Choose individual permissions',
    permissions: null,
  },
];

export function permissionsForPreset(id: TeamUserRolePresetId): Permission[] {
  const preset = TEAM_USER_ROLE_PRESETS.find((entry) => entry.id === id);
  return preset?.permissions ? [...preset.permissions] : [];
}