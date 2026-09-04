'use client';

import { format } from 'date-fns';
import { ChevronDown, Pin, Star, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { DeliveryStatus } from './DeliveryStatus';
import { MessageMediaContent } from './MessageMediaContent';
import { Button } from '@/components/ui/button';
import type { MessageDTO } from '@/types';

interface MessageBubbleProps {
  message: MessageDTO;
  onReply?: (message: MessageDTO) => void;
  onPin?: (messageId: string) => void;
  onStar?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
}

const DELETE_FOR_EVERYONE_WINDOW_MS = 48 * 60 * 60 * 1000;

export function MessageBubble({
  message,
  onReply,
  onPin,
  onStar,
  onDelete,
  onDeleteForEveryone,
  onRetry,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOutgoing = message.direction === 'OUTGOING';
  const isDeletedForEveryone = Boolean(message.deletedForEveryone);
  const canDeleteForEveryone =
    isOutgoing &&
    !isDeletedForEveryone &&
    Date.now() - new Date(message.createdAt).getTime() <= DELETE_FOR_EVERYONE_WINDOW_MS;

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  return (
    <div className={cn('group flex w-full', isOutgoing ? 'justify-end' : 'justify-start')}>
      <div className="relative max-w-[min(75%,32rem)]" ref={menuRef}>
        <div
          className={cn(
            'relative rounded-lg px-3 py-2 shadow-sm',
            isOutgoing ? 'bg-chat-outgoing rounded-tr-none' : 'bg-chat-incoming rounded-tl-none',
            isDeletedForEveryone && 'bg-muted/60 italic text-muted-foreground'
          )}
        >
          {message.isPinned && !isDeletedForEveryone && (
            <Pin className="absolute -top-2 -right-2 h-3 w-3 text-whatsapp" />
          )}

          {isDeletedForEveryone ? (
            <p className="text-sm">This message was deleted</p>
          ) : (
            <MessageMediaContent message={message} />
          )}

          <div className="mt-1 flex items-center justify-end gap-1">
            {message.isStarred && !isDeletedForEveryone && (
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
            {isOutgoing && !isDeletedForEveryone && <DeliveryStatus status={message.status} />}
          </div>

          {message.status === 'FAILED' && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 text-xs text-destructive"
              onClick={() => onRetry(message._id)}
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Retry
            </Button>
          )}
        </div>

        {!isDeletedForEveryone && (
          <button
            type="button"
            aria-label="Message actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            className={cn(
              'absolute top-1 rounded-full p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              isOutgoing ? 'left-1 lg:-left-7' : 'right-1 lg:-right-7',
              menuOpen ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {menuOpen && (
          <div
            className={cn(
              'absolute z-20 min-w-[180px] overflow-hidden rounded-lg border bg-background py-1 shadow-lg',
              isOutgoing ? 'right-0 bottom-full mb-1' : 'left-0 bottom-full mb-1'
            )}
          >
            {onReply && (
              <button
                type="button"
                className="flex w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onReply(message);
                  setMenuOpen(false);
                }}
              >
                Reply
              </button>
            )}
            {onPin && (
              <button
                type="button"
                className="flex w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onPin(message._id);
                  setMenuOpen(false);
                }}
              >
                {message.isPinned ? 'Unpin' : 'Pin'}
              </button>
            )}
            {onStar && (
              <button
                type="button"
                className="flex w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onStar(message._id);
                  setMenuOpen(false);
                }}
              >
                {message.isStarred ? 'Unstar' : 'Star'}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="flex w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onDelete(message._id);
                  setMenuOpen(false);
                }}
              >
                Delete message
              </button>
            )}
            {canDeleteForEveryone && onDeleteForEveryone && (
              <button
                type="button"
                className="flex w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  onDeleteForEveryone(message._id);
                  setMenuOpen(false);
                }}
              >
                Delete for everyone
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
