import { AuthUser } from '../../types';
import { Tag } from '../../models/Tag';
import { Conversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { DEFAULT_TAGS } from '../../constants/tags';
import { AppError } from '../../types';
import { cache } from '../../utils/cache';
import { env } from '../../config/env';

function tagsCacheKey(tenantId: string): string {
  return `tags:${tenantId}`;
}

function invalidateTagsCache(tenantId: string): void {
  cache.delete(tagsCacheKey(tenantId));
}

export async function listTags(user: AuthUser) {
  const cacheKey = tagsCacheKey(user.tenantId);
  const cached = cache.get<Awaited<ReturnType<typeof Tag.find>>>(cacheKey);
  if (cached) return cached;

  const tags = await Tag.find({ tenantId: user.tenantId }).sort({ name: 1 });
  cache.set(cacheKey, tags, env.CACHE_TTL_MS);
  return tags;
}

export async function createTag(user: AuthUser, name: string) {
  const existing = await Tag.findOne({ tenantId: user.tenantId, name });
  if (existing) throw new AppError(409, 'Tag already exists');
  const tag = await Tag.create({ tenantId: user.tenantId, name, createdBy: user.userId });
  invalidateTagsCache(user.tenantId);
  return tag;
}

export async function updateTag(user: AuthUser, tagId: string, name: string) {
  const tag = await Tag.findOneAndUpdate(
    { _id: tagId, tenantId: user.tenantId },
    { name },
    { new: true }
  );
  if (!tag) throw new AppError(404, 'Tag not found');
  invalidateTagsCache(user.tenantId);
  return tag;
}

export async function deleteTag(user: AuthUser, tagId: string) {
  const tag = await Tag.findOneAndDelete({ _id: tagId, tenantId: user.tenantId });
  if (!tag) throw new AppError(404, 'Tag not found');

  await Promise.all([
    Conversation.updateMany(
      { tenantId: user.tenantId, tags: tagId },
      { $pull: { tags: tagId } }
    ),
    Contact.updateMany({ tenantId: user.tenantId, tags: tagId }, { $pull: { tags: tagId } }),
  ]);

  invalidateTagsCache(user.tenantId);
  return tag;
}

export async function seedDefaultTags(tenantId: string, createdBy: string) {
  for (const name of DEFAULT_TAGS) {
    await Tag.findOneAndUpdate(
      { tenantId, name },
      { tenantId, name, createdBy },
      { upsert: true }
    );
  }
}
