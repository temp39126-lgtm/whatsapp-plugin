import type { AssigneeFilterChoice } from '@/components/whatsapp/inbox/AssigneeFilterDialog';

export function applyAssigneeFilterChoice(
  filters: Record<string, string | boolean | undefined>,
  choice: AssigneeFilterChoice
): Record<string, string | boolean | undefined> {
  const base = {
    ...filters,
    mine: undefined,
    assigned: undefined,
    unassigned: undefined,
    assignedUserId: undefined,
    assignedByAdmin: undefined,
  };

  if (choice.type === 'all') {
    return base;
  }

  if (choice.type === 'unassigned') {
    return { ...base, unassigned: true };
  }

  return { ...base, assignedUserId: choice.userId };
}
