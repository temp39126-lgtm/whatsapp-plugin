import type { MessageDTO } from '@/types';

export function messageMediaMimeType(message: MessageDTO): string {
  return message.media?.mimeType?.toLowerCase() ?? '';
}

/** Show inline preview for photos, stickers, and image files sent as documents. */
export function isDisplayableImageMessage(message: MessageDTO): boolean {
  if (message.type === 'IMAGE' || message.type === 'STICKER') return true;
  const mime = messageMediaMimeType(message);
  return mime.startsWith('image/');
}

export function isDisplayableVideoMessage(message: MessageDTO): boolean {
  if (message.type === 'VIDEO') return true;
  return messageMediaMimeType(message).startsWith('video/');
}

export function shouldLoadMessageBlob(message: MessageDTO): boolean {
  if (message.type === 'TEXT' || message.type === 'TEMPLATE' || message.type === 'CALL') {
    return false;
  }
  return (
    isDisplayableImageMessage(message) ||
    isDisplayableVideoMessage(message) ||
    message.type === 'VOICE' ||
    message.type === 'AUDIO' ||
    message.type === 'DOCUMENT' ||
    message.type === 'STICKER' ||
    message.type === 'INTERACTIVE'
  );
}