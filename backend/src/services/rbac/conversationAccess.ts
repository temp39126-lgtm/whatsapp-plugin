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

export function filterAccessibleConversationIds(
  user: AuthUser,
  tenantId: string,
  conversations: Array<{
    _id: { toString(): string };
    assignedUserId?: string;
    permittedUsers?: string[];
  }>
): string[] {
  return conversations
    .filter((conversation) =>
      canAccessConversation(user, {
        tenantId,
        assignedUserId: conversation.assignedUserId,
        permittedUsers: conversation.permittedUsers ?? [],
      } as IConversation)
    )
    .map((conversation) => conversation._id.toString());
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
  const { $or: filterOr, $and: filterAnd, ...rest } = filters;
  const base: Record<string, unknown> = { tenantId: user.tenantId, ...rest };

  if (user.role === 'ADMIN') {
    if (filterOr) base.$or = filterOr;
    if (filterAnd) base.$and = filterAnd;
    return base;
  }

  const andClauses: Record<string, unknown>[] = [
    {
      $or: [
        { assignedUserId: user.userId },
        { permittedUsers: user.userId },
      ],
    },
  ];

  if (filterOr) {
    andClauses.push({ $or: filterOr });
  }

  if (filterAnd) {
    const extraClauses = Array.isArray(filterAnd) ? filterAnd : [filterAnd];
    andClauses.push(...extraClauses);
  }

  return {
    ...base,
    $and: andClauses,
  };
}
