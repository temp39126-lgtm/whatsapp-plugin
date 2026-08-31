export const MESSAGE_TYPES = [
  'TEXT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'VOICE',
  'DOCUMENT',
  'STICKER',
  'LOCATION',
  'CONTACT',
  'INTERACTIVE',
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_DIRECTIONS = ['INCOMING', 'OUTGOING'] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

export const MESSAGE_STATUSES = ['SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
