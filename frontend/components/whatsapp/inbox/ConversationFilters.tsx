'use client';

import { useAuth } from '@/components/AuthProvider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ConversationFiltersProps {
  filters: Record<string, string | boolean | undefined>;
  onChange: (filters: Record<string, string | boolean | undefined>) => void;
}

const adminFilters = [
  { key: 'all', label: 'All', value: {} },
  { key: 'mine', label: 'My Conversations', value: { mine: true } },
  { key: 'unassigned', label: 'Unassigned', value: { unassigned: true } },
];

const statusFilters = [
  { key: 'OPEN', label: 'Open' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
];

export function ConversationFilters({ filters, onChange }: ConversationFiltersProps) {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-3 border-b p-3">
      <Input
        placeholder="Search conversations..."
        value={(filters.search as string) || ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="h-9"
      />

      {isAdmin && (
        <div className="flex flex-wrap gap-1">
          {adminFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => onChange({ search: filters.search, ...f.value })}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                JSON.stringify(filters) === JSON.stringify({ search: filters.search, ...f.value })
                  ? 'bg-whatsapp text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() =>
              onChange({
                ...filters,
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
        <button
          onClick={() =>
            onChange({ ...filters, unread: filters.unread ? undefined : true })
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
      </div>
    </div>
  );
}
