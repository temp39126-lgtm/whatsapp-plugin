import type { MessageDirection, MessageStatus, MessageType } from '../constants/messageTypes';

export interface MessageDTO {
  _id: string;
  tenantId: string;
  conversationId: string;
  contactId: string;
  metaMessageId?: string;
  direction: MessageDirection;
  type: MessageType;
  content: unknown;
  replyToMessageId?: string;
  status: MessageStatus;
  sentByUserId?: string;
  isPinned: boolean;
  isStarred: boolean;
  deletedForEveryone?: boolean;
  createdAt: string;
  updatedAt: string;
  media?: {
    _id: string;
    mediaType: string;
    mimeType: string;
    fileName?: string;
    fileSize?: number;
    url?: string;
  };
  reactions?: Array<{
    emoji: string;
    reactedBy: string;
    reactedAt: string;
  }>;
}
