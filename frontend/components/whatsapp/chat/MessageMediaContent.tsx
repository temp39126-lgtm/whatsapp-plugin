'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Film, Music } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getWhatsAppMediaUrl, resolveMediaUrl } from '@/lib/api';
import type { MessageDTO } from '@/types';

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaIcon({ type }: { type: string }) {
  if (type === 'VIDEO') return <Film className="h-5 w-5 shrink-0 text-whatsapp-dark" />;
  if (type === 'AUDIO' || type === 'VOICE') return <Music className="h-5 w-5 shrink-0 text-whatsapp-dark" />;
  return <FileText className="h-5 w-5 shrink-0 text-whatsapp-dark" />;
}

export function MessageMediaContent({ message }: { message: MessageDTO }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const content = message.content as { caption?: string; fileName?: string; text?: string };
  const fileName = message.media?.fileName ?? content.fileName ?? 'Attachment';
  const caption = content.caption?.trim();
  const mediaPath = message.media?.url ?? getWhatsAppMediaUrl(message._id);

  useEffect(() => {
    if (message.type === 'TEXT') return;

    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadMedia() {
      try {
        const response = await fetch(resolveMediaUrl(mediaPath), {
          headers: getAuthHeaders(),
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

  if (message.type === 'TEXT') {
    return <p className="whitespace-pre-wrap break-words text-sm">{content.text}</p>;
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
    const response = await fetch(resolveMediaUrl(mediaPath), { headers: getAuthHeaders() });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDownload}
        className="flex w-full min-w-0 max-w-full items-center gap-3 rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-left transition-colors hover:bg-white"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-whatsapp-light">
          <MediaIcon type={message.type} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {message.media?.mimeType?.split('/').pop()?.toUpperCase() ?? message.type}
            {message.media?.fileSize ? ` · ${formatFileSize(message.media.fileSize)}` : ''}
          </p>
        </div>
        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {caption ? <p className="whitespace-pre-wrap break-words text-sm">{caption}</p> : null}
    </div>
  );
}
