'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TeamAgentWorkloadDTO } from '@/types';

interface ConversationFiltersProps {
  filters: Record<string, string | boolean | undefined>;
  onChange: (filters: Record<string, string | boolean | undefined>) => void;
}

const statusFilters = [
  { key: 'OPEN', label: 'Open' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
];

function isAllFiltersActive(filters: Record<string, string | boolean | undefined>) {
  return (
    !filters.status &&
    !filters.assignedUserId &&
    !filters.unread &&
    !filters.groups &&
    !filters.mine &&
    !filters.unassigned &&
    !filters.assigned &&
    !filters.newToday
  );
}

function clearAssignmentFilters(filters: Record<string, string | boolean | undefined>) {
  return {
    unassigned: undefined,
    assigned: undefined,
    assignedUserId: undefined,
    newToday: undefined,
    mine: undefined,
  };
}

export function ConversationFilters({ filters, onChange }: ConversationFiltersProps) {
  const { canViewAllConversations } = usePermissions();
  const allActive = isAllFiltersActive(filters);
  const assignedUserId = filters.assignedUserId as string | undefined;
  const unassignedActive = Boolean(filters.unassigned);

  const { data: workload = [] } = useQuery({
    queryKey: ['team-workload'],
    queryFn: () => api.get<TeamAgentWorkloadDTO[]>('/team/workload'),
    enabled: canViewAllConversations && (Boolean(assignedUserId) || unassignedActive),
  });

  const assigneeLabel = unassignedActive
    ? 'Unassigned'
    : assignedUserId
      ? (workload.find((row) => row._id === assignedUserId)?.name ?? 'Selected user')
      : undefined;

  function showAllConversations() {
    onChange({ search: filters.search });
  }

  return (
    <div className="space-y-3 border-b p-3">
      <Input
        placeholder="Search conversations..."
        value={(filters.search as string) || ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="h-9"
      />

      {assigneeLabel ? (
        <div className="flex items-center gap-2 rounded-lg border border-whatsapp/30 bg-whatsapp-light/40 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate">
            Assignee: <span className="font-medium">{assigneeLabel}</span>
          </span>
          <button
            type="button"
            aria-label="Clear assignee filter"
            onClick={() =>
              onChange({
                ...filters,
                assignedUserId: undefined,
                unassigned: undefined,
                assigned: undefined,
              })
            }
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={showAllConversations}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
            allActive
              ? 'bg-whatsapp text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          All
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...filters,
              ...clearAssignmentFilters(filters),
              unread: filters.unread ? undefined : true,
            })
          }
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
            filters.unread
              ? 'bg-whatsapp text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          Unread
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...filters,
              ...clearAssignmentFilters(filters),
              groups: filters.groups ? undefined : true,
            })
          }
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
            filters.groups
              ? 'bg-emerald-700 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          Groups
        </button>
      </div>

      {canViewAllConversations && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() =>
              onChange({
                search: filters.search,
                status: filters.status,
                unread: filters.unread,
                groups: filters.groups,
                assigned: true,
              })
            }
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              filters.assigned
                ? 'bg-whatsapp text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Assigned
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                search: filters.search,
                status: filters.status,
                unread: filters.unread,
                groups: filters.groups,
                unassigned: true,
              })
            }
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              filters.unassigned
                ? 'bg-whatsapp text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            Unassigned
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                ...clearAssignmentFilters(filters),
                status: filters.status === f.key ? undefined : f.key,
              })
            }
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              filters.status === f.key
                ? 'bg-whatsapp text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
