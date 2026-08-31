export const CALL_DIRECTIONS = ['INCOMING', 'OUTGOING'] as const;
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

export const CALL_STATUSES = [
  'INITIATING',
  'RINGING',
  'CONNECTED',
  'ENDED',
  'MISSED',
  'REJECTED',
  'FAILED',
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export interface CallDTO {
  _id: string;
  tenantId: string;
  whatsappAccountId: string;
  conversationId: string;
  contactId: string;
  initiatedByUserId?: string;
  direction: CallDirection;
  status: CallStatus;
  metaCallId?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}
