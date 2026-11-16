import type { MessageDTO } from '@/types';

export function getCopyableMessageText(message: MessageDTO): string | null {
  if (message.deletedForEveryone) return null;

  const content = message.content as Record<string, unknown> | null | undefined;

  if (message.type === 'TEXT' && typeof content?.text === 'string') {
    const text = content.text.trim();
    return text || null;
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

  const fileName =
    (typeof content?.fileName === 'string' && content.fileName) ||
    message.media?.fileName ||
    undefined;

  if (message.media?.url) {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(message.media.url, window.location.origin);
        return fileName ? `${fileName}\n${url.href}` : url.href;
      } catch {
        return message.media.url;
      }
    }
    return message.media.url;
  }

  const typeLabels: Record<string, string> = {
    IMAGE: '[Image]',
    VIDEO: '[Video]',
    VOICE: '[Voice message]',
    AUDIO: '[Audio]',
    DOCUMENT: fileName ? `[Document] ${fileName}` : '[Document]',
    STICKER: '[Sticker]',
    CALL: '[Call]',
  };

  return typeLabels[message.type] ?? null;
}

export async function copyMessageToClipboard(message: MessageDTO): Promise<boolean> {
  const text = getCopyableMessageText(message);
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  return false;
}