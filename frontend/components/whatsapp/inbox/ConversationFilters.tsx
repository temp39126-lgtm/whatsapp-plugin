'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ConversationFilterDialog,
  conversationAdvancedFiltersActive,
} from '@/components/whatsapp/inbox/ConversationFilterDialog';
import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
    !filters.newToday &&
    !filters.tagId &&
    !filters.fromDate &&
    !filters.toDate &&
    !filters.hasNotes
  );
}

const pillClass = (active: boolean) =>
  cn(
    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
    active
      ? 'bg-whatsapp text-white shadow-sm'
      : 'bg-muted/90 text-foreground/75 hover:bg-muted'
  );

function clearAdvancedFilters(filters: Record<string, string | boolean | undefined>) {
  return {
    ...filters,
    assignedUserId: undefined,
    unassigned: undefined,
    assigned: undefined,
    tagId: undefined,
    fromDate: undefined,
    toDate: undefined,
    hasNotes: undefined,
  };
}

export function ConversationFilters({ filters, onChange }: ConversationFiltersProps) {
  const { canViewAllConversations } = usePermissions();
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const advancedActive = conversationAdvancedFiltersActive(filters);
  const allActive = isAllFiltersActive(filters);
  const assignedUserId = filters.assignedUserId as string | undefined;

  function showAllConversations() {
    onChange(filters.search ? { search: filters.search } : {});
  }

  return (
    <div className="space-y-3 border-b p-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search conversations..."
          value={(filters.search as string) || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-9 min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-9 w-9 shrink-0 rounded-md border bg-background',
            advancedActive && 'border-whatsapp/40 bg-whatsapp-light text-whatsapp-dark'
          )}
          aria-label="Filter conversations"
          onClick={() => setFilterDialogOpen(true)}
        >
          <Filter className="h-4 w-4" />
          {advancedActive ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-whatsapp" />
          ) : null}
        </Button>
      </div>

      <ConversationFilterDialog
        open={filterDialogOpen}
        active={{
          assignedUserId: filters.assignedUserId as string | undefined,
          unassigned: Boolean(filters.unassigned),
          tagId: filters.tagId as string | undefined,
          fromDate: filters.fromDate as string | undefined,
          toDate: filters.toDate as string | undefined,
          hasNotes: Boolean(filters.hasNotes),
        }}
        onClose={() => setFilterDialogOpen(false)}
        onApply={(draft) =>
          onChange({
            ...clearAdvancedFilters(filters),
            assignedUserId: draft.assignedUserId,
            unassigned: draft.unassigned,
            tagId: draft.tagId,
            fromDate: draft.fromDate,
            toDate: draft.toDate,
            hasNotes: draft.hasNotes,
          })
        }
        onReset={() => onChange(clearAdvancedFilters(filters))}
      />

      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={showAllConversations} className={pillClass(allActive)}>
          All
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...(filters.search ? { search: filters.search } : {}),
              ...clearAdvancedFilters(filters),
              unread: filters.unread ? undefined : true,
            })
          }
          className={pillClass(Boolean(filters.unread))}
        >
          Unread
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...(filters.search ? { search: filters.search } : {}),
              ...clearAdvancedFilters(filters),
              groups: filters.groups ? undefined : true,
            })
          }
          className={pillClass(Boolean(filters.groups))}
        >
          Groups
        </button>
      </div>

      {canViewAllConversations ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              const nextAssigned = filters.assigned ? undefined : true;
              onChange({
                ...(filters.search ? { search: filters.search } : {}),
                ...(filters.status ? { status: filters.status as string } : {}),
                ...(filters.unread ? { unread: true } : {}),
                ...(filters.groups ? { groups: true } : {}),
                ...clearAdvancedFilters(filters),
                assigned: nextAssigned,
                unassigned: undefined,
                assignedUserId: undefined,
              });
            }}
            className={pillClass(Boolean(filters.assigned || assignedUserId))}
          >
            Assigned
          </button>
          <button
            type="button"
            onClick={() => {
              const nextUnassigned = filters.unassigned ? undefined : true;
              onChange({
                ...(filters.search ? { search: filters.search } : {}),
                ...(filters.status ? { status: filters.status as string } : {}),
                ...(filters.unread ? { unread: true } : {}),
                ...(filters.groups ? { groups: true } : {}),
                ...clearAdvancedFilters(filters),
                unassigned: nextUnassigned,
                assigned: undefined,
                assignedUserId: undefined,
              });
            }}
            className={pillClass(Boolean(filters.unassigned && !assignedUserId))}
          >
            Unassigned
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() =>
              onChange({
                ...(filters.search ? { search: filters.search } : {}),
                ...(filters.unread ? { unread: true } : {}),
                ...(filters.groups ? { groups: true } : {}),
                ...(filters.assigned ? { assigned: true } : {}),
                ...(filters.unassigned ? { unassigned: true } : {}),
                ...(filters.assignedUserId
                  ? { assignedUserId: filters.assignedUserId as string }
                  : {}),
                status: filters.status === f.key ? undefined : f.key,
              })
            }
            className={pillClass(filters.status === f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
