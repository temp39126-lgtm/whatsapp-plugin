'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Check, Film, Music, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getWhatsAppMediaUrl, resolveMediaUrl } from '@/lib/api';
import type { MessageDTO } from '@/types';

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultMediaLabel(type: string): string {
  if (type === 'VOICE' || type === 'AUDIO') return 'Voice message';
  if (type === 'VIDEO') return 'Video';
  if (type === 'IMAGE') return 'Image';
  if (type === 'INTERACTIVE') return 'Message';
  return 'Attachment';
}

function MediaIcon({ type }: { type: string }) {
  if (type === 'VIDEO') return <Film className="h-5 w-5 shrink-0 text-whatsapp-dark" />;
  if (type === 'AUDIO' || type === 'VOICE') return <Music className="h-5 w-5 shrink-0 text-whatsapp-dark" />;
  return <FileText className="h-5 w-5 shrink-0 text-whatsapp-dark" />;
}

export function MessageMediaContent({ message }: { message: MessageDTO }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(
    () =>
      typeof window !== 'undefined' &&
      sessionStorage.getItem(`chat-downloaded:${message._id}`) === '1'
  );
  const content = (message.content && typeof message.content === 'object'
    ? message.content
    : {}) as {
    caption?: string;
    fileName?: string;
    text?: string;
    templateName?: string;
    preview?: string;
  };
  const fileName =
    message.media?.fileName ?? content.fileName ?? defaultMediaLabel(message.type);
  const caption = content.caption?.trim();
  const mediaPath = message.media?.url ?? getWhatsAppMediaUrl(message._id);

  useEffect(() => {
    if (message.type === 'TEXT' || message.type === 'TEMPLATE') return;

    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadMedia() {
      try {
        const response = await fetch(resolveMediaUrl(mediaPath), {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (!response.ok) return;
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setBlobUrl(null);
      }
    }

    loadMedia();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [message._id, message.type, mediaPath]);

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
      <p className="whitespace-pre-wrap break-words text-sm">{content.text ?? ''}</p>
    );
  }

  if (message.type === 'INTERACTIVE') {
    return (
      <p className="text-sm text-muted-foreground">
        Interactive or system message (not shown as a file download).
      </p>
    );
  }

  if ((message.type === 'VOICE' || message.type === 'AUDIO') && blobUrl) {
    return (
      <div className="space-y-2">
        <audio controls src={blobUrl} className="max-w-full" preload="metadata">
          <track kind="captions" />
        </audio>
        {caption ? <p className="whitespace-pre-wrap break-words text-sm">{caption}</p> : null}
      </div>
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

  if (message.type === 'IMAGE') {
    return (
      <div className="space-y-2">
        {blobUrl ? (
          <img src={blobUrl} alt={fileName} className="max-h-48 max-w-full rounded object-cover" />
        ) : (
          <div className="flex h-24 items-center justify-center rounded bg-black/5 text-xs text-muted-foreground">
            Loading image...
          </div>
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
