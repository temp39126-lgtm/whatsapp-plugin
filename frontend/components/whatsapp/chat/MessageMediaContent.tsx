'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Download, Check, Film, Music, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getWhatsAppMediaUrl, resolveMediaUrl } from '@/lib/api';
import {
  isDisplayableImageMessage,
  isDisplayableVideoMessage,
  shouldLoadMessageBlob,
} from '@/lib/message-media';
import type { MessageDTO } from '@/types';
import { HighlightedText } from '@/lib/highlight-text';
import { ChatMediaLightbox } from '@/components/whatsapp/chat/ChatMediaLightbox';

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultMediaLabel(type: string): string {
  if (type === 'VOICE' || type === 'AUDIO') return 'Voice message';
  if (type === 'VIDEO') return 'Video';
  if (type === 'IMAGE' || type === 'STICKER') return 'Image';
  if (type === 'INTERACTIVE') return 'Message';
  return 'Attachment';
}

function MediaIcon({ type }: { type: string }) {
  if (type === 'VIDEO') return <Film className="h-5 w-5 shrink-0 text-whatsapp-dark" />;
  if (type === 'AUDIO' || type === 'VOICE') return <Music className="h-5 w-5 shrink-0 text-whatsapp-dark" />;
  return <FileText className="h-5 w-5 shrink-0 text-whatsapp-dark" />;
}

function VoiceMessagePlayer({
  mediaPath,
  fileName,
  caption,
  messageId,
}: {
  mediaPath: string;
  fileName: string;
  caption?: string;
  messageId: string;
}) {
  const [retryToken, setRetryToken] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);

  const streamUrl = useMemo(() => {
    const base = resolveMediaUrl(mediaPath);
    if (!retryToken) return base;
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}retry=${retryToken}`;
  }, [mediaPath, retryToken]);

  const downloadVoice = useCallback(async () => {
    try {
      const response = await fetch(resolveMediaUrl(mediaPath), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) return;
      const mime =
        response.headers.get('content-type')?.split(';')[0]?.trim() || 'audio/ogg';
      const blob = await response.blob();
      const typed = blob.type ? blob : new Blob([blob], { type: mime });
      const url = URL.createObjectURL(typed);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      sessionStorage.setItem(`chat-downloaded:${messageId}`, '1');
    } catch {
      /* ignore */
    }
  }, [fileName, mediaPath, messageId]);

  return (
    <div className="min-w-[12rem] max-w-sm space-y-2">
      {!playbackError ? (
        <audio
          key={streamUrl}
          controls
          preload="metadata"
          className="h-10 w-full min-w-[12rem]"
          src={streamUrl}
          onError={() => setPlaybackError(true)}
          onLoadedData={() => setPlaybackError(false)}
        >
          <track kind="captions" />
        </audio>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-2">
          <Music className="h-4 w-4 shrink-0 text-whatsapp-dark" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">Couldn&apos;t play audio</span>
          <button
            type="button"
            className="text-sm font-medium text-whatsapp-dark hover:underline"
            onClick={() => {
              setPlaybackError(false);
              setRetryToken((token) => token + 1);
            }}
          >
            Retry
          </button>
          <button
            type="button"
            className="text-sm font-medium text-whatsapp-dark hover:underline"
            onClick={() => void downloadVoice()}
          >
            Download
          </button>
        </div>
      )}
      {caption ? <p className="whitespace-pre-wrap break-words text-sm">{caption}</p> : null}
    </div>
  );
}

export function MessageMediaContent({
  message,
  highlightQuery,
}: {
  message: MessageDTO;
  highlightQuery?: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mediaLoadState, setMediaLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [downloaded, setDownloaded] = useState(
    () =>
      typeof window !== 'undefined' &&
      sessionStorage.getItem(`chat-downloaded:${message._id}`) === '1'
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const content = (message.content && typeof message.content === 'object'
    ? message.content
    : {}) as {
    caption?: string;
    fileName?: string;
    text?: string;
    templateName?: string;
    preview?: string;
  };
  const showAsImage = isDisplayableImageMessage(message);
  const showAsVideo = isDisplayableVideoMessage(message);
  const isVoiceMessage = message.type === 'VOICE' || message.type === 'AUDIO';
  const needsBlob = shouldLoadMessageBlob(message) && !isVoiceMessage;

  const fileName =
    message.media?.fileName ?? content.fileName ?? defaultMediaLabel(message.type);
  const caption = content.caption?.trim();
  const mediaPath = message.media?.url ?? getWhatsAppMediaUrl(message._id);

  useEffect(() => {
    if (!needsBlob) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadMedia() {
      if (!cancelled) setMediaLoadState('loading');
      try {
        const response = await fetch(resolveMediaUrl(mediaPath), {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (!response.ok) {
          if (!cancelled) setMediaLoadState('error');
          return;
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setBlobUrl(objectUrl);
          setMediaLoadState('ready');
        }
      } catch {
        if (!cancelled) {
          setBlobUrl(null);
          setMediaLoadState('error');
        }
      }
    }

    loadMedia();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [message._id, mediaPath, needsBlob]);

  if (message.type === 'CALL') {
    const callContent = content as {
      label?: string;
      direction?: string;
      status?: string;
      duration?: number;
    };
    const isOutgoing =
      callContent.direction === 'OUTGOING' || message.direction === 'OUTGOING';
    const Icon = isOutgoing ? PhoneOutgoing : PhoneIncoming;
    return (
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 shrink-0 text-whatsapp-dark" aria-hidden="true" />
        <span>{callContent.label ?? (isOutgoing ? 'Outgoing call' : 'Incoming call')}</span>
      </div>
    );
  }

  if (message.type === 'TEXT') {
    return (
      <p className="whitespace-pre-wrap break-words text-sm">
        <HighlightedText text={content.text ?? ''} highlight={highlightQuery} />
      </p>
    );
  }

  if (message.type === 'INTERACTIVE') {
    return (
      <p className="text-sm text-muted-foreground">
        Interactive or system message (not shown as a file download).
      </p>
    );
  }

  if (isVoiceMessage) {
    return (
      <VoiceMessagePlayer
        mediaPath={mediaPath}
        fileName={fileName}
        caption={caption}
        messageId={message._id}
      />
    );
  }

  if (message.type === 'TEMPLATE') {
    const body = content.preview ?? content.text ?? '';
    return (
      <div className="space-y-1">
        {content.templateName ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Template · {content.templateName}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap break-words text-sm">{body}</p>
      </div>
    );
  }

  if (showAsImage) {
    const imageAlt = caption || fileName;
    return (
      <div className="space-y-2">
        {blobUrl ? (
          <>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block w-full cursor-zoom-in rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp/50"
              aria-label="View full image"
            >
              <img
                src={blobUrl}
                alt={imageAlt}
                className="block max-h-[min(70vh,32rem)] w-auto max-w-full rounded-md object-contain"
              />
            </button>
            <ChatMediaLightbox
              open={lightboxOpen}
              src={blobUrl}
              alt={imageAlt}
              onClose={() => setLightboxOpen(false)}
            />
          </>
        ) : mediaLoadState === 'loading' ? (
          <div className="flex min-h-[8rem] min-w-[10rem] items-center justify-center rounded-md bg-black/5 text-xs text-muted-foreground">
            Loading image…
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Image unavailable.</p>
        )}
        {caption ? <p className="whitespace-pre-wrap break-words text-sm">{caption}</p> : null}
      </div>
    );
  }

  if (showAsVideo) {
    return (
      <div className="space-y-2">
        {blobUrl ? (
          <video
            src={blobUrl}
            controls
            playsInline
            preload="metadata"
            className="block max-h-[min(70vh,32rem)] w-auto max-w-full rounded-md bg-black"
          />
        ) : mediaLoadState === 'loading' ? (
          <div className="flex min-h-[8rem] items-center justify-center rounded-md bg-black/5 text-xs text-muted-foreground">
            Loading video…
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Video unavailable.</p>
        )}
        {caption ? <p className="whitespace-pre-wrap break-words text-sm">{caption}</p> : null}
      </div>
    );
  }

  async function handleDownload() {
    try {
      if (blobUrl) {
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = fileName;
        anchor.click();
      } else {
        const response = await fetch(resolveMediaUrl(mediaPath), {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (!response.ok) return;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      }

      setDownloaded(true);
      sessionStorage.setItem(`chat-downloaded:${message._id}`, '1');
    } catch {
      // Keep download icon if the save failed.
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDownload}
        aria-label={downloaded ? `${fileName} downloaded` : `Download ${fileName}`}
        className="flex w-full min-w-0 max-w-full items-center gap-3 rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-left transition-colors hover:bg-white"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-whatsapp-light">
          <MediaIcon type={message.type} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {downloaded
              ? 'Downloaded'
              : `${message.media?.mimeType?.split('/').pop()?.toUpperCase() ?? message.type}${
                  message.media?.fileSize ? ` · ${formatFileSize(message.media.fileSize)}` : ''
                }`}
          </p>
        </div>
        {downloaded ? (
          <Check className="h-4 w-4 shrink-0 text-whatsapp" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {caption ? <p className="whitespace-pre-wrap break-words text-sm">{caption}</p> : null}
    </div>
  );
}