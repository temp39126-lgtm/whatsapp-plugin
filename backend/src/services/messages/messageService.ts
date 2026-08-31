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

async function enrichMessageRecord(message: Record<string, unknown>) {
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

export async function listMessages(
  user: AuthUser,
  conversationId: string,
  page = 1,
  limit = 50
): Promise<ReturnType<typeof paginatedResponse>> {
  const { skip, limit: lim } = getPagination({ page, limit });

  const messages = await Message.find({ tenantId: user.tenantId, conversationId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(lim)
    .lean();

  const enriched = await Promise.all(messages.map((msg) => enrichMessageRecord(msg)));

  const total = await Message.countDocuments({ tenantId: user.tenantId, conversationId });
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
) {
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
  message.isPinned = !message.isPinned;
  await message.save();
  return message;
}

export async function toggleStar(user: AuthUser, message: IMessage) {
  message.isStarred = !message.isStarred;
  await message.save();
  return message;
}

export async function retryMessage(user: AuthUser, message: IMessage) {
  if (message.status !== 'FAILED') throw new AppError(400, 'Only failed messages can be retried');

  const conversation = await import('../../models/Conversation').then((m) =>
    m.Conversation.findById(message.conversationId)
  );
  if (!conversation) throw new AppError(404, 'Conversation not found');

  return createMessage(user, conversation, {
    type: message.type,
    content: message.content,
  });
}

export async function getPinnedMessages(user: AuthUser, conversationId: string) {
  return Message.find({ tenantId: user.tenantId, conversationId, isPinned: true }).sort({
    createdAt: -1,
  });
}

export async function getStarredMessages(user: AuthUser, conversationId: string) {
  return Message.find({ tenantId: user.tenantId, conversationId, isStarred: true }).sort({
    createdAt: -1,
  });
}

export async function getMessageById(user: AuthUser, messageId: string): Promise<IMessage> {
  const message = await Message.findOne({ _id: messageId, tenantId: user.tenantId });
  if (!message) throw new AppError(404, 'Message not found');
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
