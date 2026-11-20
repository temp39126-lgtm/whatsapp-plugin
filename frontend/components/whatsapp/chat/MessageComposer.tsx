'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Image as ImageIcon,
  FileText,
  Film,
  Mic,
  Trash2,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MessageDTO } from '@/types';
import {
  formatRecordingDuration,
  startVoiceNoteRecording,
  type VoiceNoteRecorder,
} from '@/lib/voiceNote/recorder';
import { isInternalMediaUrl } from '@/lib/message-copy';
import { composeMediaPreviewKind } from '@/lib/compose-media-preview';
import { toastError } from '@/lib/toast';

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
  /** Meta 24h window closed — only templates can reach the customer on WhatsApp. */
  requiresTemplate?: boolean;
  sessionTimeRemaining?: string | null;
  onOpenTemplates?: () => void;
}

export function MessageComposer({
  onSend,
  onSendMedia,
  replyTo,
  onCancelReply,
  disabled,
  requiresTemplate = false,
  sessionTimeRemaining = null,
  onOpenTemplates,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [composePreviewUrl, setComposePreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [canPauseRecording, setCanPauseRecording] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const voiceRecorderRef = useRef<VoiceNoteRecorder | null>(null);

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData('text/plain').trim();
    if (pastedText && isInternalMediaUrl(pastedText)) {
      event.preventDefault();
      toastError('Use Forward on the message to send media — do not paste the link');
      return;
    }

    const items = event.clipboardData.items;
    for (const item of items) {
      if (!item.type.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (!file || !onSendMedia) continue;
      event.preventDefault();
      setSelectedFile(file);
      return;
    }
  };

  const composerBlocked = disabled || requiresTemplate;
  const canSendTextOrMedia = Boolean(text.trim() || selectedFile);
  const showVoiceNoteButton =
    Boolean(onSendMedia) && !canSendTextOrMedia && !isRecording && !composerBlocked;

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
      setRecordingPaused(false);
      return;
    }

    const interval = window.setInterval(() => {
      const recorder = voiceRecorderRef.current;
      if (!recorder) return;
      setRecordingSeconds(Math.floor(recorder.getElapsedMs() / 1000));
      setRecordingPaused(recorder.getIsPaused());
    }, 200);

    return () => window.clearInterval(interval);
  }, [isRecording]);

  const cancelVoiceRecording = useCallback(() => {
    voiceRecorderRef.current?.cancel();
    voiceRecorderRef.current = null;
    setIsRecording(false);
    setRecordingPaused(false);
    setRecordingSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      voiceRecorderRef.current?.cancel();
      voiceRecorderRef.current = null;
    };
  }, []);

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setComposePreviewUrl(null);
      return;
    }
    const kind = composeMediaPreviewKind(selectedFile);
    if (kind === 'file') {
      setComposePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setComposePreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const handleSend = () => {
    if (selectedFile && onSendMedia) {
      onSendMedia(selectedFile, text.trim() || undefined, replyTo?._id);
      clearSelectedFile();
      setText('');
      onCancelReply?.();
      return;
    }

    if (!text.trim() || disabled) return;
    if (isInternalMediaUrl(text.trim())) {
      toastError('Use Forward on the message to send media — do not paste the link');
      return;
    }
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
      setCanPauseRecording(recorder.supportsPause);
      setRecordingPaused(false);
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
      {requiresTemplate ? (
        <div
          className="mb-2 flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-xs leading-relaxed sm:text-sm">
            The 24-hour WhatsApp messaging window is closed. Send an approved template to message
            this customer (free text and media will fail).
          </p>
          {onOpenTemplates ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-400 bg-white hover:bg-amber-100"
              onClick={onOpenTemplates}
            >
              Send template
            </Button>
          ) : null}
        </div>
      ) : sessionTimeRemaining ? (
        <p className="mb-2 text-center text-[11px] text-muted-foreground" role="status">
          Free WhatsApp replies for about{' '}
          <span className="font-medium text-foreground">{sessionTimeRemaining}</span>
        </p>
      ) : null}

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

      {selectedFile ? (
        <div className="mb-2 overflow-hidden rounded-lg border border-whatsapp/30 bg-whatsapp-light/40">
          {composeMediaPreviewKind(selectedFile) === 'image' && composePreviewUrl ? (
            <div className="relative bg-black/5">
              <img
                src={composePreviewUrl}
                alt={selectedFile.name}
                className="mx-auto block max-h-[min(45vh,22rem)] w-auto max-w-full object-contain"
              />
            </div>
          ) : composeMediaPreviewKind(selectedFile) === 'video' && composePreviewUrl ? (
            <div className="relative bg-black">
              <video
                src={composePreviewUrl}
                controls
                playsInline
                preload="metadata"
                className="mx-auto block max-h-[min(45vh,22rem)] w-auto max-w-full bg-black"
              />
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-whatsapp/20 bg-whatsapp-light px-3 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              {composeMediaPreviewKind(selectedFile) === 'image' ? (
                <ImageIcon className="h-4 w-4 shrink-0 text-whatsapp-dark" />
              ) : composeMediaPreviewKind(selectedFile) === 'video' ? (
                <Film className="h-4 w-4 shrink-0 text-whatsapp-dark" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-whatsapp-dark" />
              )}
              <span className="truncate font-medium">{selectedFile.name}</span>
            </div>
            <button
              type="button"
              onClick={clearSelectedFile}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground"
              aria-label="Remove attachment"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {voiceError ? (
        <p className="mb-2 text-sm text-destructive" role="alert">
          {voiceError}
        </p>
      ) : null}

      {isRecording ? (
        <div className="flex flex-col gap-2">
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
            <div
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                recordingPaused
                  ? 'border-whatsapp/30 bg-whatsapp-light text-foreground'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              {!recordingPaused ? (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                </span>
              ) : (
                <Mic className="h-4 w-4 shrink-0 text-whatsapp-dark" aria-hidden />
              )}
              <span className="font-medium tabular-nums">{formatRecordingDuration(recordingSeconds)}</span>
              <span className="truncate opacity-80">
                {recordingPaused ? 'Paused — tap Resume to continue' : 'Recording voice note…'}
              </span>
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
          {canPauseRecording ? (
            <Button
              type="button"
              variant="whatsapp"
              className="h-11 w-full gap-2 rounded-full"
              disabled={isProcessingVoice}
              onClick={() => {
                const recorder = voiceRecorderRef.current;
                if (!recorder) return;
                if (recordingPaused) {
                  recorder.resume();
                  setRecordingPaused(false);
                } else {
                  recorder.pause();
                  setRecordingPaused(true);
                }
              }}
            >
              {recordingPaused ? (
                <>
                  <Mic className="h-5 w-5" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-5 w-5" />
                  Pause
                </>
              )}
            </Button>
          ) : null}
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
            disabled={composerBlocked}
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
              onPaste={handlePaste}
              placeholder={
                requiresTemplate
                  ? 'Use Send template above to message this customer'
                  : selectedFile
                    ? 'Add a caption (optional)...'
                    : 'Type a message...'
              }
              disabled={composerBlocked}
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
              disabled={(!text.trim() && !selectedFile) || composerBlocked}
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
