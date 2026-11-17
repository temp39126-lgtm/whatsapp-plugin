'use client';

import { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/usePermissions';
import { useTags, useTeamUsers } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

export type ConversationFilterDraft = {
  assignedUserId?: string;
  unassigned?: boolean;
  tagId?: string;
  fromDate?: string;
  toDate?: string;
  hasNotes?: boolean;
};

interface ConversationFilterDialogProps {
  open: boolean;
  active: ConversationFilterDraft;
  onClose: () => void;
  onApply: (filters: ConversationFilterDraft) => void;
  onReset: () => void;
}

export function ConversationFilterDialog({
  open,
  active,
  onClose,
  onApply,
  onReset,
}: ConversationFilterDialogProps) {
  const { canViewAllConversations } = usePermissions();
  const { data: teamUsers = [] } = useTeamUsers(canViewAllConversations);
  const { data: tags = [] } = useTags();

  const [agentKey, setAgentKey] = useState('all');
  const [tagId, setTagId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hasNotes, setHasNotes] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (active.unassigned) setAgentKey('unassigned');
    else if (active.assignedUserId) setAgentKey(active.assignedUserId);
    else setAgentKey('all');
    setTagId(active.tagId ?? '');
    setFromDate(active.fromDate ?? '');
    setToDate(active.toDate ?? '');
    setHasNotes(Boolean(active.hasNotes));
  }, [open, active]);

  if (!open) return null;

  function buildDraft(): ConversationFilterDraft {
    const draft: ConversationFilterDraft = {
      tagId: tagId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      hasNotes: hasNotes || undefined,
    };
    if (agentKey === 'unassigned') {
      draft.unassigned = true;
    } else if (agentKey !== 'all') {
      draft.assignedUserId = agentKey;
    }
    return draft;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl border bg-background shadow-2xl"
        role="dialog"
        aria-labelledby="conversation-filter-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2
            id="conversation-filter-title"
            className="flex items-center gap-2 text-lg font-semibold text-whatsapp-dark"
          >
            <Filter className="h-5 w-5" />
            Filter Conversations
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {canViewAllConversations ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="filter-agent">
                Agents
              </label>
              <select
                id="filter-agent"
                value={agentKey}
                onChange={(event) => setAgentKey(event.target.value)}
                className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All Agents</option>
                <option value="unassigned">Unassigned</option>
                {teamUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.role === 'ADMIN' ? 'Admin' : 'User'})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="filter-tag">
              Tags
            </label>
            <select
              id="filter-tag"
              value={tagId}
              onChange={(event) => setTagId(event.target.value)}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All Tags</option>
              {tags.map((tag) => (
                <option key={tag._id} value={tag._id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="filter-from">
                Start date
              </label>
              <Input
                id="filter-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="filter-to">
                End date
              </label>
              <Input
                id="filter-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-3">
            <span className="text-sm font-medium">Has Notes Only</span>
            <button
              type="button"
              role="switch"
              aria-checked={hasNotes}
              onClick={() => setHasNotes((current) => !current)}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                hasNotes ? 'bg-whatsapp' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
                  hasNotes ? 'left-[22px]' : 'left-0.5'
                )}
              />
            </button>
          </label>
        </div>

        <div className="flex gap-2 border-t p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => {
              onReset();
              onClose();
            }}
          >
            Reset Filters
          </Button>
          <Button
            type="button"
            variant="whatsapp"
            className="flex-[2]"
            onClick={() => {
              onApply(buildDraft());
              onClose();
            }}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}

export function conversationAdvancedFiltersActive(
  filters: Record<string, string | boolean | undefined>
): boolean {
  return Boolean(
    filters.assignedUserId ||
      filters.unassigned ||
      filters.tagId ||
      filters.fromDate ||
      filters.toDate ||
      filters.hasNotes
  );
}