'use client';

import { formatDistanceToNow } from 'date-fns';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import type { ConversationDTO } from '@/types';
import { formatLastMessagePreview } from '@/lib/message-preview';

interface ConversationListProps {
  conversations: ConversationDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  const { canViewAllConversations } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        No conversations found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const contact = conversation.contact as ConversationDTO['contact'];
        const group = conversation.group;
        const isGroup = Boolean(group);
        const name = group?.name ?? contact?.name ?? 'Unknown';
        const isSelected = selectedId === conversation._id;

        return (
          <button
            key={conversation._id}
            onClick={() => onSelect(conversation._id)}
            className={cn(
              'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50',
              isSelected && 'bg-whatsapp-light'
            )}
          >
            <ProfileAvatar
              name={name}
              imageUrl={group?.profileImage ?? contact?.profileImage}
              size="md"
              isGroup={isGroup}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1 truncate font-medium">
                  {conversation.isPinned ? (
                    <Pin
                      className="h-3.5 w-3.5 shrink-0 text-whatsapp"
                      aria-label="Pinned chat"
                    />
                  ) : null}
                  <span className="truncate">{name}</span>
                </span>
                {conversation.lastMessageAt && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-muted-foreground">
                  {isGroup && group
                    ? formatLastMessagePreview(
                        conversation.lastMessage ?? `${group.memberCount} participants`
                      )
                    : formatLastMessagePreview(conversation.lastMessage)}
                </p>
                {conversation.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-whatsapp px-1.5 text-xs font-medium text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {canViewAllConversations && conversation.assignedUser?.name ? (
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                    {conversation.assignedUser.name}
                  </span>
                ) : null}
                {isGroup && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                    Group
                  </span>
                )}
                {conversation.tags?.slice(0, 2).map((tag) => (
                  <span
                    key={tag._id}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag.name}
                  </span>
                ))}
                {conversation.priority === 'HIGH' || conversation.priority === 'URGENT' ? (
                  <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-600 bg-orange-50">
                    {conversation.priority}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
