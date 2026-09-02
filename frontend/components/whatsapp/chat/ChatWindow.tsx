'use client';

import { ArrowLeft, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { WhatsAppOverflowMenu } from '@/components/whatsapp/inbox/WhatsAppOverflowMenu';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import {
  useMessages,
  useSendMessage,
  useSendMediaMessage,
  useTogglePin,
  useToggleStar,
  useRetryMessage,
  useDeleteMessage,
  usePinnedMessages,
} from '@/hooks/useMessages';
import { useMarkConversationRead } from '@/hooks/useConversations';
import type { ConversationDTO, MessageDTO } from '@/types';
import { useState, useEffect, useRef } from 'react';

interface ChatWindowProps {
  conversation: ConversationDTO | null;
  onStartCall?: () => void;
  callDisabled?: boolean;
  onBack?: () => void;
}

export function ChatWindow({ conversation, onStartCall, callDisabled = false, onBack }: ChatWindowProps) {
  const [replyTo, setReplyTo] = useState<MessageDTO | null>(null);
  const [sendError, setSendError] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);

  const { data: messagesData, isLoading } = useMessages(conversation?._id ?? null);
  const sendMessage = useSendMessage();
  const sendMediaMessage = useSendMediaMessage();
  const togglePin = useTogglePin();
  const toggleStar = useToggleStar();
  const retryMessage = useRetryMessage();
  const deleteMessage = useDeleteMessage();
  const markRead = useMarkConversationRead();

  const { data: pinnedMessages = [] } = usePinnedMessages(conversation?._id ?? null);

  const messages = messagesData?.data ?? [];
  const contact = conversation?.contact;
  const group = conversation?.group;
  const isGroup = Boolean(group);
  const headerName = group?.name ?? contact?.name ?? 'Unknown';
  const headerSubtitle = isGroup
    ? `${group?.memberCount ?? 0} participants`
    : contact?.phone;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (conversation?._id && conversation.unreadCount > 0) {
      markRead.mutate(conversation._id);
    }
  }, [conversation?._id, conversation?.unreadCount]);

  useEffect(() => {
    setShowMembers(false);
  }, [conversation?._id]);

  useEffect(() => {
    if (!showMembers) return;

    function handleClickOutside(event: MouseEvent) {
      if (membersRef.current && !membersRef.current.contains(event.target as Node)) {
        setShowMembers(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMembers]);

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-chat-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-whatsapp-light">
            <Phone className="h-10 w-10 text-whatsapp" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">WhatsApp CRM</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  const handleSend = (text: string, replyToMessageId?: string) => {
    setSendError('');
    sendMessage.mutate(
      {
        conversationId: conversation._id,
        text,
        replyToMessageId,
      },
      {
        onError: (error) => {
          setSendError(error instanceof Error ? error.message : 'Failed to send message');
        },
        onSuccess: () => setReplyTo(null),
      }
    );
  };

  const handleSendMedia = (file: File, caption?: string, replyToMessageId?: string) => {
    setSendError('');
    sendMediaMessage.mutate(
      {
        conversationId: conversation._id,
        file,
        caption,
        replyToMessageId,
      },
      {
        onError: (error) => {
          setSendError(error instanceof Error ? error.message : 'Failed to send media');
        },
        onSuccess: () => setReplyTo(null),
      }
    );
  };

  return (
    <div className="flex flex-1 flex-col bg-chat-bg">
      <header className="relative flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to conversations">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <ProfileAvatar
            name={headerName}
            imageUrl={group?.profileImage ?? contact?.profileImage}
            size="sm"
            isGroup={isGroup}
          />
          <div className="min-w-0" ref={membersRef}>
            <h2 className="truncate font-medium">{headerName}</h2>
            {isGroup ? (
              <button
                type="button"
                onClick={() => setShowMembers((current) => !current)}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                {headerSubtitle} · tap to view members
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
            )}

            {isGroup && showMembers && group?.members && (
              <div className="absolute left-16 top-full z-20 mt-1 max-h-64 w-72 overflow-y-auto rounded-lg border bg-background shadow-lg">
                <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Group members
                </div>
                {group.members.map((member) => (
                  <div key={member._id} className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
                    <ProfileAvatar name={member.name} imageUrl={member.profileImage} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onStartCall}
            disabled={!onStartCall || callDisabled}
            title={onStartCall ? 'Start voice call' : 'Voice calling unavailable'}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <WhatsAppOverflowMenu />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pinnedMessages.length > 0 && (
          <div className="rounded-lg border border-whatsapp/30 bg-whatsapp-light/40 px-3 py-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-whatsapp-dark">
              Pinned messages
            </p>
            <div className="space-y-1">
              {pinnedMessages.slice(0, 3).map((pinned) => (
                <p key={pinned._id} className="truncate text-sm text-muted-foreground">
                  {(pinned.content as { text?: string })?.text ?? `[${pinned.type}]`}
                </p>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              onReply={setReplyTo}
              onPin={(id) => togglePin.mutate(id)}
              onStar={(id) => toggleStar.mutate(id)}
              onDelete={(id) => deleteMessage.mutate({ messageId: id, scope: 'me' })}
              onDeleteForEveryone={(id) => {
                const confirmed = window.confirm(
                  'Delete this message for everyone in this conversation?'
                );
                if (confirmed) deleteMessage.mutate({ messageId: id, scope: 'everyone' });
              }}
              onRetry={(id) => retryMessage.mutate(id)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageComposer
        onSend={handleSend}
        onSendMedia={handleSendMedia}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={sendMessage.isPending || sendMediaMessage.isPending}
      />
      {sendError && (
        <div className="border-t bg-red-50 px-4 py-2 text-sm text-red-700">{sendError}</div>
      )}
    </div>
  );
}
