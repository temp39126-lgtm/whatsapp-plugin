export const CONVERSATION_STATUSES = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const CONVERSATION_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type ConversationPriority = (typeof CONVERSATION_PRIORITIES)[number];

export const DEFAULT_TAGS = [
  'VIP',
  'New Customer',
  'Refund',
  'Urgent',
  'Order',
  'Lead',
  'Payment',
  'Complaint',
] as const;
