'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { useConversations } from '@/hooks/useConversations';
import type { ConversationDTO } from '@/types';

interface ForwardMessageDialogProps {
  open: boolean;
  currentConversationId: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onForward: (targetConversationId: string) => void;
}

function conversationLabel(conversation: ConversationDTO): string {
  return conversation.contact?.name ?? conversation.group?.name ?? 'Unknown';
}

export function ForwardMessageDialog({
  open,
  currentConversationId,
  isSubmitting,
  onClose,
  onForward,
}: ForwardMessageDialogProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useConversations({ limit: 100, search: search.trim() || undefined });

  const targets = useMemo(() => {
    const rows = data?.data ?? [];
    return rows.filter(
      (conversation) =>
        !conversation.group &&
        conversation.contactId &&
        conversation._id !== currentConversationId
    );
  }, [currentConversationId, data?.data]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[min(80vh,520px)] w-full max-w-md flex-col rounded-2xl border bg-background shadow-2xl"
        role="dialog"
        aria-labelledby="forward-message-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id="forward-message-title" className="text-lg font-semibold">
            Forward message
          </h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts…"
              className="pl-9"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading chats…</p>
          ) : targets.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No individual chats available to forward to.
            </p>
          ) : (
            targets.map((conversation) => {
              const name = conversationLabel(conversation);
              return (
                <button
                  key={conversation._id}
                  type="button"
                  disabled={isSubmitting}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted disabled:opacity-50"
                  onClick={() => onForward(conversation._id)}
                >
                  <ProfileAvatar
                    name={name}
                    imageUrl={conversation.contact?.profileImage}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    {conversation.contact?.phone ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {conversation.contact.phone}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}