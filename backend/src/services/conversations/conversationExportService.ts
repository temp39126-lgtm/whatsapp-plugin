import archiver from 'archiver';
import { Response } from 'express';
import { AuthUser } from '../../types';
import { IConversation } from '../../models/Conversation';
import { Message, IMessage } from '../../models/Message';
import { MessageMedia } from '../../models/MessageMedia';
import { Contact } from '../../models/Contact';
import { Group } from '../../models/Group';
import { readMediaFile } from '../media/mediaService';
import { getAccessibleConversation } from '../rbac/conversationAccess';

function formatExportTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function messageListFilter(tenantId: string, conversationId: string) {
  return {
    tenantId,
    conversationId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }, { deletedForEveryone: true }],
  };
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || 'chat';
  return trimmed.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 80);
}

function extensionFromMime(mimeType: string, fileName?: string): string {
  if (fileName?.includes('.')) {
    return fileName.split('.').pop()!.toLowerCase();
  }
  if (mimeType.includes('jpeg') || mimeType === 'image/jpg') return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'bin';
}

type ContentRecord = Record<string, unknown>;

function messageBodyForExport(message: IMessage): string {
  if (message.deletedForEveryone) {
    return 'This message was deleted';
  }

  const content = (message.content ?? {}) as ContentRecord;
  const type = message.type;

  if (type === 'TEXT') {
    return String(content.text ?? '');
  }
  if (type === 'TEMPLATE') {
    return String(content.text ?? content.preview ?? '[Template message]');
  }
  if (type === 'IMAGE') {
    const caption = content.caption ? String(content.caption) : '';
    return caption ? `${caption} (image omitted)` : '<image omitted>';
  }
  if (type === 'VIDEO') {
    const caption = content.caption ? String(content.caption) : '';
    return caption ? `${caption} (video omitted)` : '<video omitted>';
  }
  if (type === 'AUDIO' || type === 'VOICE') {
    return '<audio omitted>';
  }
  if (type === 'DOCUMENT') {
    const name = content.fileName ? String(content.fileName) : 'document';
    return `<document: ${name}>`;
  }
  if (type === 'STICKER') {
    return '<sticker omitted>';
  }
  if (type === 'LOCATION') {
    return '<location omitted>';
  }
  if (type === 'CALL') {
    return String(content.text ?? '[Call]');
  }

  const caption = content.caption ? String(content.caption) : '';
  if (caption) return caption;
  return `<${type.toLowerCase()} message>`;
}

function messageBodyForZipExport(
  message: IMessage,
  mediaFileName?: string
): string {
  if (message.deletedForEveryone) {
    return 'This message was deleted';
  }

  const content = (message.content ?? {}) as ContentRecord;
  const type = message.type;
  const mediaTypes = new Set(['IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'DOCUMENT', 'STICKER']);

  if (mediaTypes.has(type) && mediaFileName) {
    const caption = content.caption ? String(content.caption) : '';
    const attachment = `<attached: ${mediaFileName}>`;
    return caption ? `${caption}\n${attachment}` : attachment;
  }

  return messageBodyForExport(message);
}

async function resolveChatTitle(conversation: IConversation): Promise<string> {
  if (conversation.groupId) {
    const group = await Group.findById(conversation.groupId).select('name').lean();
    if (group?.name) return group.name;
  }
  if (conversation.contactId) {
    const contact = await Contact.findById(conversation.contactId).select('name phone').lean();
    if (contact?.name) return contact.name;
    if (contact?.phone) return contact.phone;
  }
  return 'WhatsApp chat';
}

export async function buildConversationExportText(
  user: AuthUser,
  conversation: IConversation,
  options: { includeMediaReferences: boolean }
): Promise<{ title: string; text: string }> {
  const title = await resolveChatTitle(conversation);
  const conversationId = String(conversation._id);
  const messages = await Message.find(messageListFilter(user.tenantId, conversationId))
    .sort({ createdAt: 1 })
    .lean<IMessage[]>();

  const mediaByMessageId = new Map<
    string,
    { mimeType: string; fileName?: string; messageId: unknown }
  >();
  if (options.includeMediaReferences) {
    const mediaRows = await MessageMedia.find({
      tenantId: user.tenantId,
      messageId: { $in: messages.map((m) => m._id) },
    }).lean();
    for (const row of mediaRows) {
      mediaByMessageId.set(String(row.messageId), row);
    }
  }

  const lines: string[] = [];
  for (const message of messages) {
    const timestamp = formatExportTimestamp(new Date(message.createdAt));
    const senderLabel = message.direction === 'OUTGOING' ? 'You' : title;
    let body = messageBodyForExport(message);

    if (options.includeMediaReferences) {
      const media = mediaByMessageId.get(String(message._id));
      if (media && !message.deletedForEveryone) {
        const ext = extensionFromMime(media.mimeType, media.fileName);
        const mediaFileName = `${String(message._id)}.${ext}`;
        body = messageBodyForZipExport(message as IMessage, mediaFileName);
      }
    }

    if (message.isEdited && !message.deletedForEveryone) {
      body = `${body} (edited)`;
    }

    lines.push(`[${timestamp}] ${senderLabel}: ${body}`);
  }

  const header = `WhatsApp chat export — ${title}\nExported on ${formatExportTimestamp(new Date())}\n\n`;
  return { title, text: header + lines.join('\n') };
}

export async function streamConversationExportZip(
  user: AuthUser,
  conversation: IConversation,
  res: Response
): Promise<void> {
  const { title, text } = await buildConversationExportText(user, conversation, {
    includeMediaReferences: true,
  });
  const safeName = sanitizeFileName(title);
  const archive = archiver('zip', { zlib: { level: 6 } });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_export.zip"`);
  archive.on('error', (error) => {
    throw error;
  });
  archive.pipe(res);

  archive.append(text, { name: `${safeName}_chat.txt` });

  const conversationId = String(conversation._id);
  const messages = await Message.find(messageListFilter(user.tenantId, conversationId))
    .sort({ createdAt: 1 })
    .select('_id deletedForEveryone type')
    .lean();

  const mediaRows = await MessageMedia.find({
    tenantId: user.tenantId,
    messageId: { $in: messages.map((m) => m._id) },
  }).lean();

  for (const media of mediaRows) {
    const message = messages.find((m) => String(m._id) === String(media.messageId));
    if (!message || message.deletedForEveryone) continue;

    try {
      const { body } = await readMediaFile(media.storageKey);
      const ext = extensionFromMime(media.mimeType, media.fileName);
      const entryName = `media/${String(media.messageId)}.${ext}`;
      archive.append(body, { name: entryName });
    } catch {
      // Skip missing media files so text export still succeeds.
    }
  }

  await archive.finalize();
}

export async function exportConversation(
  user: AuthUser,
  conversationId: string,
  format: 'txt' | 'zip',
  res: Response
): Promise<void> {
  const conversation = await getAccessibleConversation(user, conversationId);
  if (format === 'zip') {
    await streamConversationExportZip(user, conversation, res);
    return;
  }

  const { title, text } = await buildConversationExportText(user, conversation, {
    includeMediaReferences: false,
  });
  const safeName = sanitizeFileName(title);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_chat.txt"`);
  res.send(text);
}
