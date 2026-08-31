'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MessageDTO } from '@/types';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface MessageComposerProps {
  onSend: (text: string, replyTo?: string) => void;
  replyTo?: MessageDTO | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export function MessageComposer({
  onSend,
  replyTo,
  onCancelReply,
  disabled,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim(), replyTo?._id);
    setText('');
    onCancelReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-3">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded bg-muted px-3 py-2 text-sm">
          <span className="truncate text-muted-foreground">
            Replying to: {(replyTo.content as { text?: string })?.text ?? `[${replyTo.type}]`}
          </span>
          <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" disabled={disabled}>
          <Paperclip className="h-5 w-5" />
        </Button>

        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <Smile className="h-5 w-5" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-12 right-0 z-10">
              <EmojiPicker
                onEmojiClick={(emoji) => {
                  setText((prev) => prev + emoji.emoji);
                  inputRef.current?.focus();
                }}
              />
            </div>
          )}
        </div>

        <Button
          variant="whatsapp"
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
