import { WhatsAppAccount, IWhatsAppAccount } from '../../models/WhatsAppAccount';
import { Contact, IContact } from '../../models/Contact';
import { Conversation, IConversation } from '../../models/Conversation';
import { Message, IMessage } from '../../models/Message';
import { MessageMedia } from '../../models/MessageMedia';
import { encrypt } from '../../utils/encryption';
import {
  sendTextMessage,
  sendMediaMessage,
  downloadMetaMedia,
  markMessageAsRead,
} from './metaApi';
import {
  uploadToS3,
  downloadFromUrl,
  generateStorageKey,
  getPresignedUrl,
} from '../media/mediaService';
import { emitToAuthorizedUsers } from '../realtime/socketService';
import { logger } from '../../config/logger';
import { decrypt } from '../../utils/encryption';

interface IncomingTextMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type?: string };
  video?: { id: string; caption?: string; mime_type?: string };
  audio?: { id: string; mime_type?: string };
  document?: { id: string; filename?: string; mime_type?: string };
  sticker?: { id: string; mime_type?: string };
  reaction?: { message_id: string; emoji: string };
  context?: { id: string };
}

export function isDemoWhatsAppAccount(account: IWhatsAppAccount): boolean {
  return account.phoneNumberId === 'demo-phone-number-id';
}

export async function findAccountByPhoneNumberId(
  phoneNumberId: string
): Promise<IWhatsAppAccount | null> {
  return WhatsAppAccount.findOne({ phoneNumberId });
}

export async function findOrCreateContact(
  account: IWhatsAppAccount,
  whatsappId: string,
  name?: string
): Promise<IContact> {
  let contact = await Contact.findOne({
    tenantId: account.tenantId,
    whatsappId,
  });

  if (!contact) {
    contact = await Contact.create({
      tenantId: account.tenantId,
      whatsappAccountId: account._id,
      name: name ?? whatsappId,
      phone: whatsappId,
      whatsappId,
    });
  }

  return contact;
}

export async function findOrCreateConversation(
  account: IWhatsAppAccount,
  contact: IContact
): Promise<IConversation> {
  let conversation = await Conversation.findOne({
    tenantId: account.tenantId,
    contactId: contact._id,
    status: { $in: ['OPEN', 'PENDING'] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      tenantId: account.tenantId,
      whatsappAccountId: account._id,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
    });

    await emitToAuthorizedUsers(account.tenantId, conversation._id.toString(), 'conversation.created', {
      conversation: conversation.toObject(),
    });
  }

  return conversation;
}

async function processMediaMessage(
  account: IWhatsAppAccount,
  message: IMessage,
  mediaId: string,
  mediaType: string,
  mimeType: string,
  fileName?: string
): Promise<void> {
  try {
    const { url, mimeType: metaMime } = await downloadMetaMedia(mediaId, account);
    const token = decrypt(account.encryptedAccessToken);
    const buffer = await downloadFromUrl(url, token);
    const storageKey = generateStorageKey(
      account.tenantId,
      account._id.toString(),
      fileName ?? `${mediaId}.bin`
    );
    await uploadToS3(storageKey, buffer, mimeType || metaMime);
    await MessageMedia.create({
      tenantId: account.tenantId,
      messageId: message._id,
      metaMediaId: mediaId,
      mediaType,
      mimeType: mimeType || metaMime,
      fileName,
      fileSize: buffer.length,
      storageKey,
    });
  } catch (error) {
    logger.error({ error, mediaId }, 'Failed to process incoming media');
  }
}

export async function processIncomingMessage(
  account: IWhatsAppAccount,
  incoming: IncomingTextMessage,
  contactName?: string
): Promise<void> {
  const contact = await findOrCreateContact(account, incoming.from, contactName);
  const conversation = await findOrCreateConversation(account, contact);

  let content: unknown = {};
  let type = incoming.type.toUpperCase();
  let mediaId: string | undefined;
  let mimeType: string | undefined;
  let fileName: string | undefined;

  switch (incoming.type) {
    case 'text':
      content = { text: incoming.text?.body ?? '' };
      type = 'TEXT';
      break;
    case 'image':
      content = { caption: incoming.image?.caption };
      mediaId = incoming.image?.id;
      mimeType = incoming.image?.mime_type;
      type = 'IMAGE';
      break;
    case 'video':
      content = { caption: incoming.video?.caption };
      mediaId = incoming.video?.id;
      mimeType = incoming.video?.mime_type;
      type = 'VIDEO';
      break;
    case 'audio':
      mediaId = incoming.audio?.id;
      mimeType = incoming.audio?.mime_type;
      type = 'VOICE';
      break;
    case 'document':
      content = { fileName: incoming.document?.filename };
      mediaId = incoming.document?.id;
      mimeType = incoming.document?.mime_type;
      fileName = incoming.document?.filename;
      type = 'DOCUMENT';
      break;
    case 'sticker':
      mediaId = incoming.sticker?.id;
      mimeType = incoming.sticker?.mime_type;
      type = 'STICKER';
      break;
    default:
      content = { raw: incoming };
      type = 'INTERACTIVE';
  }

  const message = await Message.create({
    tenantId: account.tenantId,
    conversationId: conversation._id,
    contactId: contact._id,
    metaMessageId: incoming.id,
    direction: 'INCOMING',
    type,
    content,
    status: 'DELIVERED',
  });

  if (mediaId) {
    await processMediaMessage(account, message, mediaId, type, mimeType ?? 'application/octet-stream', fileName);
  }

  const preview =
    type === 'TEXT'
      ? (content as { text: string }).text
      : `[${type}]`;

  await Conversation.findByIdAndUpdate(conversation._id, {
    lastMessage: preview,
    lastMessageAt: new Date(),
    $inc: { unreadCount: 1 },
  });

  await markMessageAsRead(account.phoneNumberId, incoming.id, account).catch(() => {});

  await emitToAuthorizedUsers(account.tenantId, conversation._id.toString(), 'message.created', {
    message: message.toObject(),
    conversationId: conversation._id.toString(),
  });

  await emitToAuthorizedUsers(account.tenantId, conversation._id.toString(), 'conversation.updated', {
    conversationId: conversation._id.toString(),
    lastMessage: preview,
    unreadCount: conversation.unreadCount + 1,
  });
}

export async function processStatusUpdate(
  account: IWhatsAppAccount,
  metaMessageId: string,
  status: string
): Promise<void> {
  const statusMap: Record<string, string> = {
    sent: 'SENT',
    delivered: 'DELIVERED',
    read: 'READ',
    failed: 'FAILED',
  };

  const mappedStatus = statusMap[status];
  if (!mappedStatus) return;

  const message = await Message.findOneAndUpdate(
    { tenantId: account.tenantId, metaMessageId },
    { status: mappedStatus },
    { new: true }
  );

  if (message) {
    await emitToAuthorizedUsers(
      account.tenantId,
      message.conversationId.toString(),
      'message.status.updated',
      {
        messageId: message._id.toString(),
        conversationId: message.conversationId.toString(),
        status: mappedStatus,
      }
    );
  }
}

export async function sendOutgoingMessage(
  account: IWhatsAppAccount,
  conversation: IConversation,
  contact: IContact,
  params: {
    type: string;
    content: unknown;
    sentByUserId: string;
    replyToMessageId?: string;
    replyToMetaMessageId?: string;
    mediaBuffer?: Buffer;
    mimeType?: string;
    fileName?: string;
  }
): Promise<IMessage> {
  const message = await Message.create({
    tenantId: account.tenantId,
    conversationId: conversation._id,
    contactId: contact._id,
    metaMessageId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    direction: 'OUTGOING',
    type: params.type,
    content: params.content,
    status: 'SENDING',
    sentByUserId: params.sentByUserId,
    replyToMessageId: params.replyToMessageId,
  });

  const preview =
    params.type === 'TEXT'
      ? (params.content as { text: string }).text
      : `[${params.type}]`;

  async function finalizeMessage(status: IMessage['status'], metaMessageId?: string) {
    message.status = status;
    if (metaMessageId) message.metaMessageId = metaMessageId;
    await message.save();

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: preview,
      lastMessageAt: new Date(),
    });

    await emitToAuthorizedUsers(account.tenantId, conversation._id.toString(), 'message.created', {
      message: message.toObject(),
      conversationId: conversation._id.toString(),
    });

    await emitToAuthorizedUsers(account.tenantId, conversation._id.toString(), 'conversation.updated', {
      conversationId: conversation._id.toString(),
      lastMessage: preview,
    });

    return message;
  }

  if (isDemoWhatsAppAccount(account)) {
    return finalizeMessage('READ', `demo-out-${message._id}`);
  }

  try {
    let metaResponse: { messages: Array<{ id: string }> };

    if (params.type === 'TEXT') {
      metaResponse = await sendTextMessage(
        account.phoneNumberId,
        contact.whatsappId,
        (params.content as { text: string }).text,
        params.replyToMetaMessageId,
        account
      );
    } else if (params.mediaBuffer && params.mimeType) {
      const { uploadMediaToMeta } = await import('./metaApi');
      const { id: mediaId } = await uploadMediaToMeta(
        account.phoneNumberId,
        params.mediaBuffer,
        params.mimeType,
        account
      );
      const mediaType = params.type.toLowerCase();
      metaResponse = await sendMediaMessage(
        account.phoneNumberId,
        contact.whatsappId,
        mediaType,
        mediaId,
        (params.content as { caption?: string }).caption,
        account
      );

      const storageKey = generateStorageKey(
        account.tenantId,
        account._id.toString(),
        params.fileName ?? 'media'
      );
      await uploadToS3(storageKey, params.mediaBuffer, params.mimeType);
      await MessageMedia.create({
        tenantId: account.tenantId,
        messageId: message._id,
        metaMediaId: mediaId,
        mediaType: params.type,
        mimeType: params.mimeType,
        fileName: params.fileName,
        fileSize: params.mediaBuffer.length,
        storageKey,
      });
    } else {
      throw new Error('Unsupported message type');
    }

    message.metaMessageId = metaResponse.messages[0].id;
    return finalizeMessage('SENT');
  } catch (error) {
    message.status = 'FAILED';
    await message.save();
    throw error;
  }
}

export async function saveWhatsAppAccount(
  tenantId: string,
  data: {
    phoneNumberId: string;
    businessAccountId: string;
    displayPhoneNumber: string;
    accessToken: string;
  }
): Promise<IWhatsAppAccount> {
  const encryptedAccessToken = encrypt(data.accessToken);
  return WhatsAppAccount.findOneAndUpdate(
    { tenantId, phoneNumberId: data.phoneNumberId },
    {
      tenantId,
      phoneNumberId: data.phoneNumberId,
      businessAccountId: data.businessAccountId,
      displayPhoneNumber: data.displayPhoneNumber,
      encryptedAccessToken,
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    },
    { upsert: true, new: true }
  );
}

export { getPresignedUrl };
