import type { ConversationPriority, ConversationStatus } from '../constants/conversationStatus';

export interface ConversationDTO {
  _id: string;
  tenantId: string;
  whatsappAccountId: string;
  contactId: string;
  assignedUserId?: string;
  permittedUsers: string[];
  status: ConversationStatus;
  priority: ConversationPriority;
  tags: string[];
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  contact?: {
    _id: string;
    name: string;
    phone: string;
    whatsappId: string;
    profileImage?: string;
  };
}
