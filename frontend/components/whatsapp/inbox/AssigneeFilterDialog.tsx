'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import type { ConversationDTO, PaginatedResponse, TeamAgentWorkloadDTO } from '@/types';

export type AssigneeFilterChoice =
  | { type: 'all' }
  | { type: 'unassigned' }
  | { type: 'user'; userId: string };

interface AssigneeFilterDialogProps {
  open: boolean;
  activeUserId?: string;
  unassignedActive?: boolean;
  onClose: () => void;
  onSelect: (choice: AssigneeFilterChoice) => void;
}

function WorkloadRow({
  name,
  email,
  profileImage,
  total,
  selected,
  onClick,
}: {
  name: string;
  email: string;
  profileImage?: string;
  total?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${
        selected ? 'bg-whatsapp-light/60' : ''
      }`}
    >
      <ProfileAvatar name={name} imageUrl={profileImage} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      {typeof total === 'number' ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {total}
        </span>
      ) : null}
    </button>
  );
}

export function AssigneeFilterDialog({
  open,
  activeUserId,
  unassignedActive,
  onClose,
  onSelect,
}: AssigneeFilterDialogProps) {
  const { canViewAllConversations } = usePermissions();

  const { data: workload = [], isLoading: loading } = useQuery({
    queryKey: ['team-workload'],
    queryFn: () => api.get<TeamAgentWorkloadDTO[]>('/team/workload'),
    enabled: open && canViewAllConversations,
  });

  const { data: unassignedPage } = useQuery({
    queryKey: ['conversations', { unassigned: true, limit: 1 }],
    queryFn: () =>
      api.get<PaginatedResponse<ConversationDTO>>('/conversations', {
        unassigned: true,
        limit: 1,
      }),
    enabled: open && canViewAllConversations,
  });

  if (!open) return null;

  const unassignedTotal = unassignedPage?.pagination.total;
  const allUsers = workload;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="flex max-h-[min(32rem,85vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-background shadow-xl"
        role="dialog"
        aria-labelledby="assignee-filter-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id="assignee-filter-title" className="text-base font-semibold">
            Filter by assignee
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="border-b px-4 py-2 text-xs text-muted-foreground">
          Show conversations assigned to a team member, or unassigned chats.
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => onSelect({ type: 'all' })}
            className={`flex w-full px-4 py-3 text-left text-sm font-medium hover:bg-muted ${
              !activeUserId && !unassignedActive ? 'bg-whatsapp-light/60 text-whatsapp-dark' : ''
            }`}
          >
            All conversations
          </button>
          <button
            type="button"
            onClick={() => onSelect({ type: 'unassigned' })}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted ${
              unassignedActive ? 'bg-whatsapp-light/60 text-whatsapp-dark' : ''
            }`}
          >
            <span>Unassigned</span>
            {typeof unassignedTotal === 'number' ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {unassignedTotal}
              </span>
            ) : null}
          </button>

          <div className="border-t px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Team members
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
            </div>
          ) : allUsers.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No team users found.</p>
          ) : (
            allUsers.map((user) => (
              <WorkloadRow
                key={user._id}
                name={user.name}
                email={user.email}
                profileImage={user.profileImage}
                total={user.total}
                selected={activeUserId === user._id}
                onClick={() => onSelect({ type: 'user', userId: user._id })}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
