import { AuthUser } from '../../types';
import { Message, IMessage } from '../../models/Message';
import { MessageMedia } from '../../models/MessageMedia';
import { MessageReaction } from '../../models/MessageReaction';
import { IConversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { WhatsAppAccount } from '../../models/WhatsAppAccount';
import { sendOutgoingMessage } from '../whatsapp/whatsappService';
import { getMessageMediaPath, readMediaFile } from '../media/mediaService';
import { getAccessibleConversation } from '../rbac/conversationAccess';
import { emitToAuthorizedUsers } from '../realtime/socketService';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { AppError } from '../../types';

export type EnrichedMessage = Record<string, unknown>;

async function enrichMessageRecord(message: Record<string, unknown>): Promise<EnrichedMessage> {
  if (message.deletedForEveryone) {
    return {
      ...message,
      type: 'TEXT',
      content: { text: 'This message was deleted' },
      media: undefined,
      reactions: [],
      isPinned: false,
    };
  }

  const media = await MessageMedia.findOne({ messageId: message._id }).lean();
  const reactions = await MessageReaction.find({ messageId: message._id }).lean();
  return {
    ...message,
    media: media
      ? {
          ...media,
          url: getMessageMediaPath(String(message._id)),
        }
      : undefined,
    reactions,
  };
}

function messageListFilter(tenantId: string, conversationId: string) {
  return {
    tenantId,
    conversationId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }, { deletedForEveryone: true }],
  };
}

export async function listMessages(
  user: AuthUser,
  conversationId: string,
  page = 1,
  limit = 50
): Promise<ReturnType<typeof paginatedResponse>> {
  const { skip, limit: lim } = getPagination({ page, limit });

  const messages = await Message.find(messageListFilter(user.tenantId, conversationId))
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(lim)
    .lean();

  const enriched = await Promise.all(messages.map((msg) => enrichMessageRecord(msg)));

  const total = await Message.countDocuments(messageListFilter(user.tenantId, conversationId));
  return paginatedResponse(enriched.reverse(), total, page, lim);
}

export async function createMessage(
  user: AuthUser,
  conversation: IConversation,
  data: {
    type: string;
    content: unknown;
    replyToMessageId?: string;
    mediaBuffer?: Buffer;
    mimeType?: string;
    fileName?: string;
  }
): Promise<EnrichedMessage> {
  const [account, contact] = await Promise.all([
    WhatsAppAccount.findById(conversation.whatsappAccountId),
    Contact.findById(conversation.contactId),
  ]);

  if (!account || !contact) throw new AppError(404, 'Account or contact not found');

  let replyToMetaMessageId: string | undefined;
  if (data.replyToMessageId) {
    const replyMsg = await Message.findById(data.replyToMessageId);
    replyToMetaMessageId = replyMsg?.metaMessageId;
  }

  const message = await sendOutgoingMessage(account, conversation, contact, {
    ...data,
    sentByUserId: user.userId,
    replyToMessageId: data.replyToMessageId,
    replyToMetaMessageId,
  });

  return enrichMessageRecord(message.toObject());
}

export async function addReaction(
  user: AuthUser,
  message: IMessage,
  emoji: string
) {
  const reaction = await MessageReaction.findOneAndUpdate(
    { tenantId: user.tenantId, messageId: message._id, reactedBy: user.userId },
    { emoji, reactedAt: new Date() },
    { upsert: true, new: true }
  );

  await emitToAuthorizedUsers(
    user.tenantId,
    message.conversationId.toString(),
    'message.updated',
    { messageId: message._id.toString(), reaction }
  );

  return reaction;
}

export async function togglePin(user: AuthUser, message: IMessage) {
  if (message.deletedForEveryone) {
    throw new AppError(400, 'Deleted messages cannot be pinned');
  }
  message.isPinned = !message.isPinned;
  await message.save();

  await emitToAuthorizedUsers(
    user.tenantId,
    message.conversationId.toString(),
    'message.updated',
    { messageId: message._id.toString(), isPinned: message.isPinned }
  );

  return enrichMessageRecord(message.toObject());
}

export async function toggleStar(user: AuthUser, message: IMessage) {
  if (message.deletedForEveryone) {
    throw new AppError(400, 'Deleted messages cannot be starred');
  }
  message.isStarred = !message.isStarred;
  await message.save();
  return enrichMessageRecord(message.toObject());
}

const DELETE_FOR_EVERYONE_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function deleteMessage(user: AuthUser, message: IMessage, scope: 'me' | 'everyone') {
  if (message.deletedForEveryone) {
    throw new AppError(400, 'Message is already deleted for everyone');
  }

  if (scope === 'everyone') {
    if (message.direction !== 'OUTGOING') {
      throw new AppError(400, 'Only outgoing messages can be deleted for everyone');
    }

    const ageMs = Date.now() - message.createdAt.getTime();
    if (ageMs > DELETE_FOR_EVERYONE_WINDOW_MS) {
      throw new AppError(400, 'Messages can only be deleted for everyone within 48 hours');
    }

    message.deletedForEveryone = true;
    message.deletedAt = new Date();
    message.deletedByUserId = user.userId;
    message.isPinned = false;
    message.isStarred = false;
    message.content = { text: 'This message was deleted' };
    await message.save();

    await emitToAuthorizedUsers(
      user.tenantId,
      message.conversationId.toString(),
      'message.updated',
      { messageId: message._id.toString(), deletedForEveryone: true }
    );

    return enrichMessageRecord(message.toObject());
  }

  message.deletedAt = new Date();
  message.deletedByUserId = user.userId;
  await message.save();

  await emitToAuthorizedUsers(
    user.tenantId,
    message.conversationId.toString(),
    'message.deleted',
    { messageId: message._id.toString() }
  );

  return { deleted: true };
}

export async function retryMessage(
  user: AuthUser,
  message: IMessage
): Promise<EnrichedMessage> {
  if (message.status !== 'FAILED') throw new AppError(400, 'Only failed messages can be retried');

  const conversation = await getAccessibleConversation(
    user,
    message.conversationId.toString()
  );

  return createMessage(user, conversation, {
    type: message.type,
    content: message.content,
  });
}

export async function getPinnedMessages(user: AuthUser, conversationId: string) {
  return Message.find({
    ...messageListFilter(user.tenantId, conversationId),
    isPinned: true,
    deletedForEveryone: { $ne: true },
  }).sort({
    createdAt: -1,
  });
}

export async function getStarredMessages(user: AuthUser, conversationId: string) {
  return Message.find({
    ...messageListFilter(user.tenantId, conversationId),
    isStarred: true,
    deletedForEveryone: { $ne: true },
  }).sort({
    createdAt: -1,
  });
}

export async function getMessageById(user: AuthUser, messageId: string): Promise<IMessage> {
  const message = await Message.findOne({ _id: messageId, tenantId: user.tenantId });
  if (!message) throw new AppError(404, 'Message not found');
  await getAccessibleConversation(user, message.conversationId.toString());
  return message;
}

export async function downloadMessageMedia(user: AuthUser, messageId: string) {
  const message = await getMessageById(user, messageId);
  await getAccessibleConversation(user, message.conversationId.toString());

  const media = await MessageMedia.findOne({ messageId: message._id });
  if (!media) throw new AppError(404, 'Media not found');

  const { body, mimeType } = await readMediaFile(media.storageKey);
  return {
    body,
    mimeType: media.mimeType || mimeType,
    fileName: media.fileName ?? 'download',
  };
}
