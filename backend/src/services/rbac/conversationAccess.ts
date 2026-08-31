import { AuthUser } from '../../types';
import { Conversation, IConversation } from '../../models/Conversation';
import { AppError } from '../../types';

export function canAccessConversation(user: AuthUser, conversation: IConversation): boolean {
  if (conversation.tenantId !== user.tenantId) return false;
  if (user.role === 'ADMIN') return true;
  if (conversation.assignedUserId === user.userId) return true;
  if (conversation.permittedUsers.includes(user.userId)) return true;
  return false;
}

export async function getAccessibleConversation(
  user: AuthUser,
  conversationId: string
): Promise<IConversation> {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId: user.tenantId,
  });

  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  if (!canAccessConversation(user, conversation)) {
    throw new AppError(403, 'Access denied to this conversation');
  }

  return conversation;
}

export function buildConversationFilter(user: AuthUser, filters: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = { tenantId: user.tenantId, ...filters };

  if (user.role === 'ADMIN') {
    return base;
  }

  return {
    ...base,
    $or: [
      { assignedUserId: user.userId },
      { permittedUsers: user.userId },
    ],
  };
}
