import { User } from '../../models/User';

type AssignedUserSummary = {
  _id: string;
  name: string;
  email: string;
};

type TagSummary = {
  _id: string;
  name: string;
};

export async function enrichConversations<T extends Record<string, unknown>>(
  conversations: T[]
): Promise<Array<T & { assignedUser?: AssignedUserSummary; tags: TagSummary[] }>> {
  if (conversations.length === 0) return [];

  const userIds = [
    ...new Set(
      conversations
        .map((conversation) => conversation.assignedUserId as string | undefined)
        .filter(Boolean)
    ),
  ];

  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }, 'name email').lean()
    : [];
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  return conversations.map((conversation) => {
    const assignedUserId = conversation.assignedUserId as string | undefined;
    const rawTags = (conversation.tags as Array<{ _id?: { toString(): string }; name?: string } | string>) ?? [];
    const tags = rawTags
      .map((tag) => {
        if (typeof tag === 'string') return null;
        if (tag && typeof tag === 'object' && tag.name) {
          return {
            _id: tag._id?.toString?.() ?? String(tag._id),
            name: tag.name,
          };
        }
        return null;
      })
      .filter(Boolean) as TagSummary[];

    return {
      ...conversation,
      tags,
      assignedUser: assignedUserId
        ? {
            _id: assignedUserId,
            name: userMap.get(assignedUserId)?.name ?? 'Unknown Agent',
            email: userMap.get(assignedUserId)?.email ?? '',
          }
        : undefined,
    };
  });
}
