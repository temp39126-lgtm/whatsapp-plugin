import type { AuthUser } from '@shared/types/user';
import type { ConversationDTO } from '@shared/types/conversation';
import type { MessageDTO } from '@shared/types/message';
import type { CallDTO } from '@shared/types/call';

export type { AuthUser, ConversationDTO, MessageDTO, CallDTO };

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ContactDTO {
  _id: string;
  tenantId: string;
  name: string;
  phone: string;
  whatsappId: string;
  profileImage?: string;
  assignedUserId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TagDTO {
  _id: string;
  tenantId: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface InternalNoteDTO {
  _id: string;
  tenantId: string;
  conversationId: string;
  content: string;
  createdBy: string;
  author?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TeamUserDTO {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

export interface AnalyticsConversations {
  total: number;
  newToday: number;
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  unread: number;
}

export interface WhatsAppAccountSettings {
  configured: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  displayPhoneNumber?: string;
  connectionStatus?: string;
  webhookConfigured?: boolean;
  callingEnabled?: boolean;
}

export interface GroupDTO {
  _id: string;
  tenantId: string;
  name: string;
  contactIds: ContactDTO[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityDTO {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  groupIds: Array<{ _id: string; name: string }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
