'use client';

import { useAuth } from '@/components/AuthProvider';
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
    newToday: undefined,
    mine: undefined,
  };
}

export function ConversationFilters({ filters, onChange }: ConversationFiltersProps) {
  const { isAdmin } = useAuth();
  const allActive = isAllFiltersActive(filters);

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

      {isAdmin && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() =>
              onChange({
                search: filters.search,
                status: filters.status,
                unread: filters.unread,
                groups: filters.groups,
                mine: true,
              })
            }
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              filters.mine
                ? 'bg-whatsapp text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            My Conversations
          </button>
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
          <button
            type="button"
            onClick={() =>
              onChange({
                search: filters.search,
                status: filters.status,
                unread: filters.unread,
                groups: filters.groups,
                newToday: true,
              })
            }
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              filters.newToday
                ? 'bg-whatsapp text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            New Today
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
