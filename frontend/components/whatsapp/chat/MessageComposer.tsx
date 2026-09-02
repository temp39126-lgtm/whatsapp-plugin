'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Send, Paperclip, Smile, X, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MessageDTO } from '@/types';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface MessageComposerProps {
  onSend: (text: string, replyTo?: string) => void;
  onSendMedia?: (file: File, caption?: string, replyTo?: string) => void;
  replyTo?: MessageDTO | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export function MessageComposer({
  onSend,
  onSendMedia,
  replyTo,
  onCancelReply,
  disabled,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (selectedFile && onSendMedia) {
      onSendMedia(selectedFile, text.trim() || undefined, replyTo?._id);
      setSelectedFile(null);
      setText('');
      onCancelReply?.();
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  return (
    <div className="border-t bg-background p-3 shrink-0">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded bg-muted px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            Replying to:{' '}
            {replyTo.type === 'TEXT'
              ? (replyTo.content as { text?: string })?.text
              : replyTo.media?.fileName ??
                (replyTo.content as { fileName?: string })?.fileName ??
                replyTo.type.toLowerCase()}
          </span>
          <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="mb-2 flex items-center justify-between rounded border border-whatsapp/30 bg-whatsapp-light px-3 py-2 text-sm">
          <div className="flex items-center gap-2 truncate">
            {selectedFile.type.startsWith('image/') ? (
              <ImageIcon className="h-4 w-4 shrink-0 text-whatsapp-dark" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-whatsapp-dark" />
            )}
            <span className="truncate">{selectedFile.name}</span>
          </div>
          <button
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <div className="relative min-w-0 flex-1">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedFile ? 'Add a caption (optional)...' : 'Type a message...'}
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
            <div className="absolute bottom-12 left-0 right-0 z-10 flex justify-center sm:left-auto sm:right-0 sm:justify-end">
              <div className="max-w-[min(100vw-1.5rem,350px)] overflow-hidden rounded-lg shadow-lg [&_.EmojiPickerReact]:!w-full">
                <EmojiPicker
                  width={Math.min(350, typeof window !== 'undefined' ? window.innerWidth - 24 : 350)}
                  onEmojiClick={(emoji) => {
                    setText((prev) => prev + emoji.emoji);
                    inputRef.current?.focus();
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <Button
          variant="whatsapp"
          size="icon"
          onClick={handleSend}
          disabled={(!text.trim() && !selectedFile) || disabled}
          className="shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
