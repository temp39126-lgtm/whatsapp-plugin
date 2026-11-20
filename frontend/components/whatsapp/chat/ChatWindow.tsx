'use client';

import { ArrowLeft, Filter, PanelRightOpen, Phone, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ChatMessageFilterDialog } from '@/components/whatsapp/chat/ChatMessageFilterDialog';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { ChatConversationMenu } from '@/components/whatsapp/chat/ChatConversationMenu';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { EditMessageDialog } from './EditMessageDialog';
import { TemplateSendDialog } from './TemplateSendDialog';
import { PinnedMessagesBar } from './PinnedMessagesBar';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import {
  useMessages,
  useSendMessage,
  useSendMediaMessage,
  useForwardMessage,
  useTogglePin,
  useToggleStar,
  useRetryMessage,
  useDeleteMessage,
  useEditMessage,
  usePinnedMessages,
  useAddReaction,
} from '@/hooks/useMessages';
import { toastError, toastSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { canEditMessage, getEditableMessageText } from '@/lib/message-edit';
import { useMarkConversationRead } from '@/hooks/useConversations';
import type { ConversationDTO, MessageDTO } from '@/types';
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import {
  formatSessionTimeRemaining,
  getLastIncomingCustomerMessageAt,
  isWhatsappSessionOpen,
} from '@/lib/whatsapp-session';

interface ChatWindowProps {
  conversation: ConversationDTO | null;
  scrollToMessageId?: string | null;
  onScrollToMessageHandled?: () => void;
  onStartCall?: () => void;
  callDisabled?: boolean;
  onBack?: () => void;
  onShowDetails?: () => void;
}

export function ChatWindow({
  conversation,
  scrollToMessageId = null,
  onScrollToMessageHandled,
  onStartCall,
  callDisabled = false,
  onBack,
  onShowDetails,
}: ChatWindowProps) {
  const [replyTo, setReplyTo] = useState<MessageDTO | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageDTO | null>(null);
  const [sendError, setSendError] = useState('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<MessageDTO | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [messageAnchorId, setMessageAnchorId] = useState<string | null>(null);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchInput, setChatSearchInput] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const membersRef = useRef<HTMLDivElement>(null);
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const jumpScrollAttemptsRef = useRef(0);

  const hasMessageFilters = Boolean(
    chatSearchQuery.trim() || filterFromDate || filterToDate
  );

  const scrollAnchorId = jumpTargetId ?? messageAnchorId;
  const { data: messagesData, isLoading, isFetching } = useMessages(conversation?._id ?? null, {
    anchorMessageId: hasMessageFilters ? null : scrollAnchorId ?? undefined,
    search: chatSearchQuery || undefined,
    fromDate: filterFromDate || undefined,
    toDate: filterToDate || undefined,
    limit: scrollAnchorId && !hasMessageFilters ? 100 : hasMessageFilters ? 100 : undefined,
  });
  const sendMessage = useSendMessage();
  const sendMediaMessage = useSendMediaMessage();
  const togglePin = useTogglePin();
  const toggleStar = useToggleStar();
  const retryMessage = useRetryMessage();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const addReaction = useAddReaction();
  const forwardMessage = useForwardMessage();
  const markRead = useMarkConversationRead();

  const { data: pinnedMessages = [] } = usePinnedMessages(conversation?._id ?? null);

  const messages = messagesData?.data ?? [];
  const messagesById = useMemo(() => {
    const map = new Map<string, MessageDTO>();
    for (const msg of messages) {
      map.set(msg._id, msg);
    }
    return map;
  }, [messages]);

  const contact = conversation?.contact;
  const group = conversation?.group;
  const isGroup = Boolean(group);

  const lastIncomingAt = useMemo(() => getLastIncomingCustomerMessageAt(messages), [messages]);
  const whatsappSessionOpen = isWhatsappSessionOpen(lastIncomingAt);
  const sessionTimeRemaining = whatsappSessionOpen ? formatSessionTimeRemaining(lastIncomingAt) : null;
  const requiresTemplate = !isGroup && !whatsappSessionOpen;
  const headerName = group?.name ?? contact?.name ?? 'Unknown';
  const headerSubtitle = isGroup
    ? `${group?.memberCount ?? 0} participants`
    : contact?.phone;

  useEffect(() => {
    setMessageAnchorId(null);
    setJumpTargetId(null);
    jumpScrollAttemptsRef.current = 0;
    setShowChatSearch(false);
    setChatSearchInput('');
    setChatSearchQuery('');
    setFilterFromDate('');
    setFilterToDate('');
  }, [conversation?._id]);

  useEffect(() => {
    if (scrollToMessageId) {
      setJumpTargetId(scrollToMessageId);
      setMessageAnchorId(scrollToMessageId);
      setHighlightMessageId(null);
      jumpScrollAttemptsRef.current = 0;
    }
  }, [scrollToMessageId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setChatSearchQuery(chatSearchInput);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [chatSearchInput]);

  useEffect(() => {
    if (jumpTargetId || messageAnchorId || scrollToMessageId || hasMessageFilters) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, scrollToMessageId, hasMessageFilters, jumpTargetId, messageAnchorId]);

  const dateFilterActive = Boolean(filterFromDate || filterToDate);

  useLayoutEffect(() => {
    if (!jumpTargetId) return;

    const targetId = String(jumpTargetId);
    const inList = messages.some((message) => String(message._id) === targetId);
    if (!inList) {
      if (!isFetching) {
        toastError('Could not load this message in the chat.');
        setJumpTargetId(null);
        setMessageAnchorId(null);
        onScrollToMessageHandled?.();
      }
      return;
    }

    const resolveNode = (): HTMLDivElement | null => {
      const refNode = messageRefs.current[targetId];
      if (refNode) return refNode;
      return messagesScrollRef.current?.querySelector(
        `[data-message-id="${targetId}"]`
      ) as HTMLDivElement | null;
    };

    const tryScroll = () => {
      const node = resolveNode();
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightMessageId(targetId);
        window.setTimeout(() => setHighlightMessageId(null), 2000);
        setJumpTargetId(null);
        jumpScrollAttemptsRef.current = 0;
        onScrollToMessageHandled?.();
        return;
      }
      jumpScrollAttemptsRef.current += 1;
      if (jumpScrollAttemptsRef.current < 40) {
        requestAnimationFrame(tryScroll);
      } else {
        toastError('Could not scroll to this message.');
        setJumpTargetId(null);
        onScrollToMessageHandled?.();
      }
    };

    tryScroll();
  }, [jumpTargetId, messages, isFetching, onScrollToMessageHandled]);

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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-chat-bg">
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

  const handleSendMedia = (
    file: File,
    caption?: string,
    replyToMessageId?: string,
    options?: { voiceNote?: boolean }
  ) => {
    setSendError('');
    sendMediaMessage.mutate(
      {
        conversationId: conversation._id,
        file,
        caption,
        replyToMessageId,
        voiceNote: options?.voiceNote,
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
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-chat-bg">
      <header className="relative flex shrink-0 items-center gap-1 border-b bg-background px-2 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="Back to conversations"
              className="shrink-0 lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <ProfileAvatar
            name={headerName}
            imageUrl={group?.profileImage ?? contact?.profileImage}
            size="sm"
            isGroup={isGroup}
          />
          <div className="min-w-0 flex-1" ref={membersRef}>
            <h2 className="truncate text-sm font-medium sm:text-base">{headerName}</h2>
            {isGroup ? (
              <button
                type="button"
                onClick={() => setShowMembers((current) => !current)}
                className="hidden truncate text-xs text-muted-foreground hover:text-foreground hover:underline sm:block"
              >
                {headerSubtitle} · tap to view members
              </button>
            ) : (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{headerSubtitle}</p>
            )}

            {isGroup && showMembers && group?.members && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-background shadow-lg sm:left-0 sm:right-auto sm:w-72">
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
        <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={showChatSearch ? 'Close chat search' : 'Search in chat'}
            aria-pressed={showChatSearch}
            className={cn(
              'h-9 w-9 sm:h-10 sm:w-10',
              showChatSearch ? 'bg-whatsapp-light text-whatsapp-dark' : undefined
            )}
            onClick={() => setShowChatSearch((current) => !current)}
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Filter messages by date"
            aria-pressed={dateFilterActive}
            className={cn(
              'hidden h-9 w-9 sm:inline-flex sm:h-10 sm:w-10',
              dateFilterActive ? 'bg-whatsapp-light text-whatsapp-dark' : undefined
            )}
            onClick={() => setShowFilterDialog(true)}
          >
            <Filter className="h-5 w-5" />
          </Button>
          {onShowDetails && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onShowDetails}
              className="h-9 w-9 xl:hidden sm:h-10 sm:w-10"
              aria-label="View contact details"
            >
              <PanelRightOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onStartCall}
            disabled={!onStartCall || callDisabled}
            title={onStartCall ? 'Start voice call' : 'Voice calling unavailable'}
            className="h-9 w-9 sm:h-10 sm:w-10"
          >
            <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <ChatConversationMenu
            conversationId={conversation._id}
            isPinned={conversation.isPinned}
          />
        </div>
      </header>

      {showChatSearch ? (
        <div className="flex shrink-0 items-center gap-2 border-b bg-background px-3 py-2 sm:px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            value={chatSearchInput}
            onChange={(event) => setChatSearchInput(event.target.value)}
            placeholder="Search in this chat"
            className="h-9 border-0 bg-muted/50 shadow-none focus-visible:ring-whatsapp"
            autoFocus
          />
          {chatSearchInput ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Clear search"
              onClick={() => {
                setChatSearchInput('');
                setChatSearchQuery('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}

      {hasMessageFilters ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-3 py-2 text-xs text-amber-950 sm:px-4">
          <span>
            {chatSearchQuery ? `Search: "${chatSearchQuery}"` : null}
            {chatSearchQuery && dateFilterActive ? ' · ' : null}
            {dateFilterActive
              ? `Dates: ${filterFromDate || '…'} → ${filterToDate || '…'}`
              : null}
            {messagesData?.pagination.total != null
              ? ` (${messagesData.pagination.total} message${messagesData.pagination.total === 1 ? '' : 's'})`
              : null}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setChatSearchInput('');
              setChatSearchQuery('');
              setFilterFromDate('');
              setFilterToDate('');
            }}
          >
            Clear all
          </Button>
        </div>
      ) : null}

      <PinnedMessagesBar
        messages={pinnedMessages}
        onSelect={(messageId) => {
          messageRefs.current[messageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      <div
        ref={messagesScrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto px-3 py-4 sm:space-y-3 sm:px-4"
      >
        {isLoading && messages.length === 0 && !jumpTargetId ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
          </div>
        ) : jumpTargetId && messages.length === 0 && isFetching ? (
          <div className="flex justify-center py-8 text-sm text-muted-foreground">Loading message…</div>
        ) : messages.length === 0 && hasMessageFilters ? (
          <div className="flex justify-center py-10 text-sm text-muted-foreground">
            No messages match your search or filters.
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              data-message-id={message._id}
              ref={(node) => {
                messageRefs.current[String(message._id)] = node;
              }}
              className={cn(
                'rounded-lg transition-shadow',
                highlightMessageId === String(message._id) && 'ring-2 ring-whatsapp ring-offset-2'
              )}
            >
              <MessageBubble
                message={message}
                highlightQuery={chatSearchQuery || undefined}
                quotedMessage={
                  message.replyToMessageId
                    ? messagesById.get(message.replyToMessageId) ?? null
                    : null
                }
                onScrollToQuotedMessage={(messageId) => {
                  messageRefs.current[messageId]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }}
                onReact={(messageId, emoji) => addReaction.mutate({ messageId, emoji })}
                onReply={setReplyTo}
                canEdit={canEditMessage(message)}
                onEdit={setEditingMessage}
                onPin={(id) =>
                  togglePin.mutate({ messageId: id, conversationId: conversation._id })
                }
                onStar={(id) => toggleStar.mutate(id)}
                onDelete={(id) => {
                  const confirmed = window.confirm(
                    'Remove this message from the CRM for your team?\n\nIt may still appear for agents who have not removed it, and on WhatsApp it is unchanged.'
                  );
                  if (confirmed) deleteMessage.mutate({ messageId: id, scope: 'me' });
                }}
                onDeleteForEveryone={(id) => {
                  const confirmed = window.confirm(
                    'Remove this message for everyone in the CRM?\n\nThis does not delete it on the customer\'s WhatsApp — only replaces it here with "This message was deleted."'
                  );
                  if (confirmed) deleteMessage.mutate({ messageId: id, scope: 'everyone' });
                }}
                onRetry={(id) => retryMessage.mutate(id)}
                onSendTemplate={() => setShowTemplateDialog(true)}
                onForward={(message) => setForwardingMessage(message)}
              />
            </div>
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
        requiresTemplate={requiresTemplate}
        sessionTimeRemaining={sessionTimeRemaining}
        onOpenTemplates={() => setShowTemplateDialog(true)}
      />
      {sendError && (
        <div className="border-t bg-red-50 px-4 py-2 text-sm text-red-700">{sendError}</div>
      )}
      <TemplateSendDialog
        open={showTemplateDialog}
        conversationId={conversation?._id ?? ''}
        onClose={() => setShowTemplateDialog(false)}
      />
      <ForwardMessageDialog
        open={Boolean(forwardingMessage)}
        currentConversationId={conversation._id}
        isSubmitting={forwardMessage.isPending}
        onClose={() => setForwardingMessage(null)}
        onForward={(targetConversationId) => {
          if (!forwardingMessage) return;
          forwardMessage.mutate(
            {
              messageId: forwardingMessage._id,
              conversationId: targetConversationId,
              sourceConversationId: conversation._id,
            },
            {
              onSuccess: () => {
                setForwardingMessage(null);
                toastSuccess('Message forwarded');
              },
              onError: (error) => {
                toastError(error instanceof Error ? error.message : 'Failed to forward message');
              },
            }
          );
        }}
      />
      <ChatMessageFilterDialog
        open={showFilterDialog}
        fromDate={filterFromDate}
        toDate={filterToDate}
        onClose={() => setShowFilterDialog(false)}
        onApply={(from, to) => {
          setFilterFromDate(from);
          setFilterToDate(to);
        }}
        onReset={() => {
          setFilterFromDate('');
          setFilterToDate('');
        }}
      />

      <EditMessageDialog
        open={Boolean(editingMessage)}
        initialText={editingMessage ? getEditableMessageText(editingMessage) : ''}
        isPending={editMessage.isPending}
        allowSendCorrection={!isGroup}
        onClose={() => setEditingMessage(null)}
        onSave={(text, sendCorrectionToWhatsApp) => {
          if (!editingMessage) return;
          editMessage.mutate(
            { messageId: editingMessage._id, text, sendCorrectionToWhatsApp },
            {
              onSuccess: (result) => {
                setEditingMessage(null);
                if (result.correctionMessage) {
                  setSendError('');
                } else if (result.correctionError) {
                  setSendError(
                    `CRM message updated, but WhatsApp correction failed: ${result.correctionError}`
                  );
                }
              },
              onError: (error) => {
                setSendError(error instanceof Error ? error.message : 'Failed to edit message');
                setEditingMessage(null);
              },
            }
          );
        }}
      />
    </div>
  );
}
