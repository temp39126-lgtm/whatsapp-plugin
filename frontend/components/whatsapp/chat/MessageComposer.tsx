'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Send, Paperclip, Smile, X, Image as ImageIcon, FileText, Mic, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MessageDTO } from '@/types';
import {
  formatRecordingDuration,
  startVoiceNoteRecording,
  type VoiceNoteRecorder,
} from '@/lib/voiceNote/recorder';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface MessageComposerProps {
  onSend: (text: string, replyTo?: string) => void;
  onSendMedia?: (
    file: File,
    caption?: string,
    replyTo?: string,
    options?: { voiceNote?: boolean }
  ) => void;
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const voiceRecorderRef = useRef<VoiceNoteRecorder | null>(null);

  const canSendTextOrMedia = Boolean(text.trim() || selectedFile);
  const showVoiceNoteButton = Boolean(onSendMedia) && !canSendTextOrMedia && !isRecording && !disabled;

  useEffect(() => {
    if (!showEmoji) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        emojiPickerRef.current?.contains(target) ||
        emojiButtonRef.current?.contains(target)
      ) {
        return;
      }
      setShowEmoji(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      setRecordingSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRecording]);

  const cancelVoiceRecording = useCallback(() => {
    voiceRecorderRef.current?.cancel();
    voiceRecorderRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      voiceRecorderRef.current?.cancel();
      voiceRecorderRef.current = null;
    };
  }, []);

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
    setShowEmoji(false);
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

  const startRecording = async () => {
    if (!onSendMedia || disabled || isProcessingVoice) return;
    setVoiceError('');
    try {
      const recorder = await startVoiceNoteRecording();
      voiceRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Could not start voice recording');
    }
  };

  const finishRecording = async () => {
    const recorder = voiceRecorderRef.current;
    if (!recorder || !onSendMedia) return;

    setIsProcessingVoice(true);
    setVoiceError('');
    try {
      const { file } = await recorder.stop();
      voiceRecorderRef.current = null;
      setIsRecording(false);
      onSendMedia(file, undefined, replyTo?._id, { voiceNote: true });
      onCancelReply?.();
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Failed to send voice note');
      voiceRecorderRef.current = null;
      setIsRecording(false);
    } finally {
      setIsProcessingVoice(false);
    }
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

      {voiceError ? (
        <p className="mb-2 text-sm text-destructive" role="alert">
          {voiceError}
        </p>
      ) : null}

      {isRecording ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-destructive hover:text-destructive"
            disabled={isProcessingVoice}
            onClick={cancelVoiceRecording}
            aria-label="Cancel voice recording"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
            </span>
            <span className="font-medium tabular-nums">{formatRecordingDuration(recordingSeconds)}</span>
            <span className="truncate text-red-800/80">Recording voice note…</span>
          </div>
          <Button
            type="button"
            variant="whatsapp"
            size="icon"
            className="shrink-0"
            disabled={isProcessingVoice}
            onClick={() => void finishRecording()}
            aria-label="Send voice note"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      ) : (
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
              ref={emojiButtonRef}
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showEmoji ? 'Close emoji picker' : 'Open emoji picker'}
              aria-expanded={showEmoji}
            >
              <Smile className="h-5 w-5" />
            </button>
            {showEmoji && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-12 left-0 right-0 z-10 flex justify-center sm:left-auto sm:right-0 sm:justify-end"
              >
                <div className="max-w-[min(100vw-1.5rem,350px)] overflow-hidden rounded-lg border bg-background shadow-lg [&_.EmojiPickerReact]:!w-full">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-sm font-medium text-muted-foreground">Emoji</span>
                    <button
                      type="button"
                      onClick={() => setShowEmoji(false)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Close emoji picker"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <EmojiPicker
                    width={Math.min(350, typeof window !== 'undefined' ? window.innerWidth - 24 : 350)}
                    onEmojiClick={(emoji) => {
                      setText((prev) => prev + emoji.emoji);
                      setShowEmoji(false);
                      inputRef.current?.focus();
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {showVoiceNoteButton ? (
            <Button
              type="button"
              variant="whatsapp"
              size="icon"
              onClick={() => void startRecording()}
              className="shrink-0"
              aria-label="Record voice note"
            >
              <Mic className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="whatsapp"
              size="icon"
              onClick={handleSend}
              disabled={(!text.trim() && !selectedFile) || disabled}
              className="shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
