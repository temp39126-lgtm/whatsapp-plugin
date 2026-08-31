'use client';

import { format } from 'date-fns';
import { Pin, Star, RotateCcw } from 'lucide-react';
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
  onRetry?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  onReply,
  onPin,
  onStar,
  onRetry,
}: MessageBubbleProps) {
  const isOutgoing = message.direction === 'OUTGOING';

  return (
    <div className={cn('group flex', isOutgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[75%] rounded-lg px-3 py-2 shadow-sm',
          isOutgoing ? 'bg-chat-outgoing rounded-tr-none' : 'bg-chat-incoming rounded-tl-none'
        )}
      >
        {message.isPinned && (
          <Pin className="absolute -top-2 -right-2 h-3 w-3 text-whatsapp" />
        )}

        <MessageMediaContent message={message} />

        <div className="mt-1 flex items-center justify-end gap-1">
          {message.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {isOutgoing && <DeliveryStatus status={message.status} />}
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

        <div className="absolute -top-8 right-0 hidden gap-0.5 rounded bg-white shadow group-hover:flex">
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="rounded px-2 py-1 text-xs hover:bg-muted"
            >
              Reply
            </button>
          )}
          {onPin && (
            <button
              onClick={() => onPin(message._id)}
              className="rounded px-2 py-1 text-xs hover:bg-muted"
            >
              Pin
            </button>
          )}
          {onStar && (
            <button
              onClick={() => onStar(message._id)}
              className="rounded px-2 py-1 text-xs hover:bg-muted"
            >
              Star
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
