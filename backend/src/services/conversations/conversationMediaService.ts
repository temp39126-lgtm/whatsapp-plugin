import { AuthUser } from '../../types';
import { Message } from '../../models/Message';
import { MessageMedia } from '../../models/MessageMedia';
import { getMessageMediaPath } from '../media/mediaService';
import { getAccessibleConversation } from '../rbac/conversationAccess';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { AppError } from '../../types';

export const MEDIA_CATEGORIES = ['images', 'videos', 'audio', 'files', 'location'] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

const CATEGORY_TYPES: Record<MediaCategory, string[]> = {
  images: ['IMAGE', 'STICKER'],
  videos: ['VIDEO'],
  audio: ['AUDIO', 'VOICE'],
  files: ['DOCUMENT'],
  location: ['LOCATION'],
};

function mediaHistoryFilter(tenantId: string, conversationId: string, types: string[]) {
  return {
    tenantId,
    conversationId,
    type: { $in: types },
    deletedForEveryone: { $ne: true },
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  };
}

async function enrichMediaItem(message: Record<string, unknown>) {
  const media = await MessageMedia.findOne({ messageId: message._id }).lean();
  return {
    _id: String(message._id),
    type: message.type,
    direction: message.direction,
    createdAt: message.createdAt,
    content: message.content,
    media: media
      ? {
          fileName: media.fileName,
          mimeType: media.mimeType,
          mediaType: media.mediaType,
          url: getMessageMediaPath(String(message._id)),
        }
      : undefined,
  };
}

export async function getConversationMediaSummary(user: AuthUser, conversationId: string) {
  await getAccessibleConversation(user, conversationId);

  const summary: Record<MediaCategory, number> = {
    images: 0,
    videos: 0,
    audio: 0,
    files: 0,
    location: 0,
  };

  await Promise.all(
    MEDIA_CATEGORIES.map(async (category) => {
      summary[category] = await Message.countDocuments(
        mediaHistoryFilter(user.tenantId, conversationId, CATEGORY_TYPES[category])
      );
    })
  );

  return summary;
}

export async function listConversationMedia(
  user: AuthUser,
  conversationId: string,
  category: MediaCategory,
  page = 1,
  limit = 20
) {
  if (!MEDIA_CATEGORIES.includes(category)) {
    throw new AppError(400, 'Invalid media category');
  }

  await getAccessibleConversation(user, conversationId);

  const types = CATEGORY_TYPES[category];
  const filter = mediaHistoryFilter(user.tenantId, conversationId, types);
  const { skip, limit: lim } = getPagination({ page, limit });

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(lim)
    .lean();

  const enriched = await Promise.all(messages.map((msg) => enrichMediaItem(msg)));
  const total = await Message.countDocuments(filter);

  return paginatedResponse(enriched, total, page, lim);
}