import { api } from '@/lib/api';
import type { MessageDTO } from '@/types';

const MEDIA_TYPES = new Set(['IMAGE', 'VIDEO', 'STICKER', 'DOCUMENT', 'AUDIO', 'VOICE']);

function isMediaMessage(message: MessageDTO): boolean {
  return MEDIA_TYPES.has(message.type) || Boolean(message.media?.url);
}

export function getCopyableMessageText(message: MessageDTO): string | null {
  if (message.deletedForEveryone) return null;

  const content = message.content as Record<string, unknown> | null | undefined;

  if (message.type === 'TEXT' && typeof content?.text === 'string') {
    const text = content.text.trim();
    if (text && !text.includes('/messages/') && !text.includes('/media')) {
      return text;
    }
    return null;
  }

  if (message.type === 'TEMPLATE') {
    if (typeof content?.preview === 'string' && content.preview.trim()) {
      return content.preview.trim();
    }
    if (typeof content?.text === 'string' && content.text.trim()) {
      return content.text.trim();
    }
    if (typeof content?.templateName === 'string' && content.templateName.trim()) {
      return `Template: ${content.templateName.trim()}`;
    }
    return null;
  }

  const caption = typeof content?.caption === 'string' ? content.caption.trim() : '';
  if (caption) return caption;

  if (isMediaMessage(message)) {
    return null;
  }

  const fileName =
    (typeof content?.fileName === 'string' && content.fileName) ||
    message.media?.fileName ||
    undefined;

  const typeLabels: Record<string, string> = {
    CALL: '[Call]',
    DOCUMENT: fileName ? `[Document] ${fileName}` : '[Document]',
  };

  return typeLabels[message.type] ?? null;
}

async function fetchMessageMediaBlob(message: MessageDTO): Promise<Blob | null> {
  if (!message.media?.url && !message._id) return null;
  try {
    const { blob } = await api.download(`/messages/${message._id}/media`);
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

export type CopyMessageResult = 'text' | 'media' | 'none';

export async function copyMessageToClipboard(message: MessageDTO): Promise<CopyMessageResult> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return 'none';
  }

  if (isMediaMessage(message)) {
    const blob = await fetchMessageMediaBlob(message);
    if (blob && typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      const type = blob.type || (message.type === 'STICKER' ? 'image/webp' : 'image/png');
      try {
        await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
        return 'media';
      } catch {
        /* fall through to caption text */
      }
    }
  }

  const text = getCopyableMessageText(message);
  if (!text) return 'none';

  await navigator.clipboard.writeText(text);
  return 'text';
}

export function isInternalMediaUrl(text: string): boolean {
  return /\/api\/whatsapp\/messages\/[a-f0-9]{24}\/media/i.test(text.trim());
}