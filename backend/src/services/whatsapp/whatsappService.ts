import { WhatsAppAccount, IWhatsAppAccount } from '../../models/WhatsAppAccount';
import { Contact, IContact } from '../../models/Contact';
import { Conversation, IConversation } from '../../models/Conversation';
import { Message, IMessage } from '../../models/Message';
import { MessageMedia } from '../../models/MessageMedia';
import { encrypt } from '../../utils/encryption';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
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
  storeMediaFile,
} from '../media/mediaService';
import { emitToAuthorizedUsers } from '../realtime/socketService';
import {
  buildInboxHref,
  createUserNotification,
  notifyTenantAdmins,
} from '../notifications/notificationService';
import { decrypt } from '../../utils/encryption';
import { normalizeWhatsAppId, formatPhoneDisplay } from '../../utils/phone';
import { isDuplicateKeyError } from '../../utils/mongo';
import { shouldApplyMessageStatus } from '../../utils/messageStatus';
import { getOrCreateContactConversation } from '../contacts/contactConversationService';

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
  const normalizedId = normalizeWhatsAppId(whatsappId);
  if (!normalizedId) {
    throw new Error('Invalid WhatsApp ID');
  }

  const displayPhone = formatPhoneDisplay(normalizedId);
  const contactName = name?.trim() || displayPhone;

  try {
    const contact = await Contact.findOneAndUpdate(
      { tenantId: account.tenantId, whatsappId: normalizedId },
      {
        $setOnInsert: {
          tenantId: account.tenantId,
          whatsappAccountId: account._id,
          whatsappId: normalizedId,
          phone: displayPhone,
          name: contactName,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (name?.trim() && contact.name !== name.trim()) {
      contact.name = name.trim();
      await contact.save();
    }

    return contact;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const existing = await Contact.findOne({
      tenantId: account.tenantId,
      whatsappId: normalizedId,
    });
    if (!existing) {
      throw error;
    }
    return existing;
  }
}

export async function findOrCreateConversation(
  account: IWhatsAppAccount,
  contact: IContact
): Promise<IConversation> {
  const { conversation } = await getOrCreateContactConversation({
    tenantId: account.tenantId,
    whatsappAccountId: account._id,
    contactId: contact._id,
    notifyNew: true,
    contactLabel: contact.name ?? contact.phone ?? 'A customer',
  });

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

  const existingMessage = await Message.findOne({
    tenantId: account.tenantId,
    metaMessageId: incoming.id,
  });
  if (existingMessage) {
    return;
  }

  let message: IMessage;
  try {
    message = await Message.create({
      tenantId: account.tenantId,
      conversationId: conversation._id,
      contactId: contact._id,
      metaMessageId: incoming.id,
      direction: 'INCOMING',
      type,
      content,
      status: 'DELIVERED',
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return;
    }
    throw error;
  }

  if (mediaId) {
    await processMediaMessage(account, message, mediaId, type, mimeType ?? 'application/octet-stream', fileName);
  }

  const preview =
    type === 'TEXT'
      ? (content as { text: string }).text
      : `[${type}]`;

  const updatedConversation = await Conversation.findByIdAndUpdate(
    conversation._id,
    {
      lastMessage: preview,
      lastMessageAt: new Date(),
      $inc: { unreadCount: 1 },
    },
    { new: true }
  );

  await markMessageAsRead(account.phoneNumberId, incoming.id, account).catch(() => {});

  await emitToAuthorizedUsers(account.tenantId, conversation._id.toString(), 'message.created', {
    message: message.toObject(),
    conversationId: conversation._id.toString(),
  });

  await emitToAuthorizedUsers(account.tenantId, conversation._id.toString(), 'conversation.updated', {
    conversationId: conversation._id.toString(),
    lastMessage: preview,
    unreadCount: updatedConversation?.unreadCount ?? conversation.unreadCount + 1,
  });

  const senderLabel = contact.name ?? contact.phone ?? 'Customer';
  const conversationId = conversation._id.toString();
  const href = buildInboxHref(conversationId);

  if (conversation.assignedUserId) {
    void createUserNotification({
      tenantId: account.tenantId,
      userId: conversation.assignedUserId,
      type: 'message',
      title: `New message from ${senderLabel}`,
      body: preview,
      href,
      conversationId,
    }).catch(() => undefined);
  } else {
    void notifyTenantAdmins({
      tenantId: account.tenantId,
      type: 'message',
      title: `New message from ${senderLabel}`,
      body: preview,
      href,
      conversationId,
    }).catch(() => undefined);
  }
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

  const existing = await Message.findOne({ tenantId: account.tenantId, metaMessageId });
  if (!existing || !shouldApplyMessageStatus(existing.status, mappedStatus)) {
    return;
  }

  const message = await Message.findOneAndUpdate(
    { _id: existing._id },
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
      : params.fileName
        ? `📎 ${params.fileName}`
        : `[${params.type}]`;

  async function persistMediaAttachment() {
    if (!params.mediaBuffer || !params.mimeType) return;

    const storageKey = generateStorageKey(
      account.tenantId,
      account._id.toString(),
      params.fileName ?? 'media'
    );
    await storeMediaFile(storageKey, params.mediaBuffer, params.mimeType);
    await MessageMedia.create({
      tenantId: account.tenantId,
      messageId: message._id,
      metaMediaId: `local-${message._id}`,
      mediaType: params.type,
      mimeType: params.mimeType,
      fileName: params.fileName,
      fileSize: params.mediaBuffer.length,
      storageKey,
    });

    message.content = {
      ...(typeof params.content === 'object' && params.content !== null ? params.content : {}),
      fileName: params.fileName,
    };
    await message.save();
  }

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
    await persistMediaAttachment();
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
      await storeMediaFile(storageKey, params.mediaBuffer, params.mimeType);
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
    metaAppId: string;
    appSecret?: string;
    phoneNumberId: string;
    businessAccountId: string;
    displayPhoneNumber: string;
    accessToken?: string;
    webhookVerifyToken: string;
    metaApiVersion: string;
  }
): Promise<IWhatsAppAccount> {
  const existing = await WhatsAppAccount.findOne({ tenantId });
  const encryptedAccessToken = data.accessToken
    ? encrypt(data.accessToken)
    : existing?.encryptedAccessToken;
  const encryptedAppSecret = data.appSecret
    ? encrypt(data.appSecret)
    : existing?.encryptedAppSecret;

  if (!encryptedAccessToken) {
    throw new Error('Access token is required for new WhatsApp account configuration');
  }

  if (!encryptedAppSecret) {
    throw new Error('App secret is required for new WhatsApp account configuration');
  }

  const account = await WhatsAppAccount.findOneAndUpdate(
    { tenantId },
    {
      tenantId,
      metaAppId: data.metaAppId,
      encryptedAppSecret,
      phoneNumberId: data.phoneNumberId,
      businessAccountId: data.businessAccountId,
      displayPhoneNumber: data.displayPhoneNumber,
      encryptedAccessToken,
      webhookVerifyToken: data.webhookVerifyToken,
      metaApiVersion: data.metaApiVersion,
      connectionStatus: 'CONNECTED',
      webhookConfigured: true,
    },
    { upsert: true, new: true }
  );

  if (env.CALLING_ENABLED) {
    try {
      const { enableCallingOnPhoneNumber } = await import('./metaApi');
      await enableCallingOnPhoneNumber(account.phoneNumberId, account);
    } catch (error) {
      logger.warn({ err: error }, 'Unable to enable Meta voice calling on phone number');
    }
  }

  return account;
}

export { getPresignedUrl };
