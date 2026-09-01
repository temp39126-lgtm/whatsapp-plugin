'use client';

import { Phone, Users } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
} from '@/hooks/useMessages';
import { useMarkConversationRead } from '@/hooks/useConversations';
import type { ConversationDTO, MessageDTO } from '@/types';
import { useState, useEffect, useRef } from 'react';

interface ChatWindowProps {
  conversation: ConversationDTO | null;
  onStartCall?: () => void;
}

export function ChatWindow({ conversation, onStartCall }: ChatWindowProps) {
  const [replyTo, setReplyTo] = useState<MessageDTO | null>(null);
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messagesData, isLoading } = useMessages(conversation?._id ?? null);
  const sendMessage = useSendMessage();
  const sendMediaMessage = useSendMediaMessage();
  const togglePin = useTogglePin();
  const toggleStar = useToggleStar();
  const retryMessage = useRetryMessage();
  const markRead = useMarkConversationRead();

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
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${
              isGroup ? 'bg-emerald-700' : 'bg-whatsapp'
            }`}
          >
            {isGroup ? <Users className="h-5 w-5" /> : getInitials(headerName)}
          </div>
          <div>
            <h2 className="font-medium">{headerName}</h2>
            <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onStartCall} disabled={!onStartCall}>
            <Phone className="h-5 w-5" />
          </Button>
          <WhatsAppOverflowMenu />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
