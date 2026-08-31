'use client';

import { formatDistanceToNow } from 'date-fns';
import { cn, getInitials } from '@/lib/utils';
import type { ConversationDTO } from '@/types';

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
        const name = contact?.name ?? 'Unknown';
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-whatsapp text-sm font-semibold text-white">
              {getInitials(name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{name}</span>
                {conversation.lastMessageAt && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-muted-foreground">
                  {conversation.lastMessage ?? 'No messages'}
                </p>
                {conversation.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-whatsapp px-1.5 text-xs font-medium text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              {conversation.priority === 'HIGH' || conversation.priority === 'URGENT' ? (
                <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-600 bg-orange-50">
                  {conversation.priority}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
