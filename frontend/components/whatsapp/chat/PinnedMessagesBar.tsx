'use client';

import { Pin } from 'lucide-react';
import type { MessageDTO } from '@/types';

function previewText(message: MessageDTO): string {
  const text = (message.content as { text?: string })?.text?.trim();
  if (text) return text;
  return `[${message.type}]`;
}

interface PinnedMessagesBarProps {
  messages: MessageDTO[];
  onSelect?: (messageId: string) => void;
}

export function PinnedMessagesBar({ messages, onSelect }: PinnedMessagesBarProps) {
  if (messages.length === 0) return null;

  const visible = messages.slice(0, 3);

  return (
    <div className="shrink-0 border-b border-whatsapp/25 bg-whatsapp-light/50 px-3 py-2 sm:px-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-whatsapp-dark">
        <Pin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Pinned messages
      </div>
      <div className="mt-1 space-y-0.5">
        {visible.map((message) => (
          <button
            key={message._id}
            type="button"
            className="block w-full truncate text-left text-sm text-foreground hover:underline"
            onClick={() => onSelect?.(message._id)}
          >
            {previewText(message)}
          </button>
        ))}
      </div>
    </div>
  );
}