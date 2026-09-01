import type { ConversationPriority, ConversationStatus } from '../constants/conversationStatus';

export interface ConversationDTO {
  _id: string;
  tenantId: string;
  whatsappAccountId: string;
  contactId?: string;
  groupId?: string;
  assignedUserId?: string;
  assignedUser?: {
    _id: string;
    name: string;
    email: string;
  };
  permittedUsers: string[];
  status: ConversationStatus;
  priority: ConversationPriority;
  tags: Array<{ _id: string; name: string }>;
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
  group?: {
    _id: string;
    name: string;
    memberCount: number;
  };
}
