import type { MessageDTO } from '@/types';

const EDIT_MESSAGE_WINDOW_MS = 15 * 60 * 1000;

export function canEditMessage(message: MessageDTO): boolean {
  if (message.direction !== 'OUTGOING' || message.deletedForEveryone) {
    return false;
  }
  if (!['SENT', 'DELIVERED', 'READ'].includes(message.status)) {
    return false;
  }
  if (!['TEXT', 'TEMPLATE', 'IMAGE', 'VIDEO', 'DOCUMENT'].includes(message.type)) {
    return false;
  }
  return Date.now() - new Date(message.createdAt).getTime() <= EDIT_MESSAGE_WINDOW_MS;
}

export function getEditableMessageText(message: MessageDTO): string {
  const content = (message.content && typeof message.content === 'object'
    ? message.content
    : {}) as { text?: string; preview?: string; caption?: string };
  if (message.type === 'TEXT') return content.text ?? '';
  if (message.type === 'TEMPLATE') return content.text ?? content.preview ?? '';
  return content.caption ?? '';
}
