import type { MessageDTO } from '@/types';
import { WHATSAPP_SESSION_WINDOW_MS } from '@shared/constants/whatsappSession';

export { WHATSAPP_SESSION_WINDOW_MS };

export function getLastIncomingCustomerMessageAt(messages: MessageDTO[]): Date | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.direction !== 'INCOMING' || msg.deletedForEveryone) continue;
    return new Date(msg.createdAt);
  }
  return null;
}

export function isWhatsappSessionOpen(lastIncomingAt: Date | null, nowMs = Date.now()): boolean {
  if (!lastIncomingAt) return false;
  return nowMs - lastIncomingAt.getTime() < WHATSAPP_SESSION_WINDOW_MS;
}

export function formatSessionTimeRemaining(lastIncomingAt: Date | null, nowMs = Date.now()): string | null {
  if (!lastIncomingAt) return null;
  const endsAt = lastIncomingAt.getTime() + WHATSAPP_SESSION_WINDOW_MS;
  const remainingMs = endsAt - nowMs;
  if (remainingMs <= 0) return null;

  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}