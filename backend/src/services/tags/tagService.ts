import { AuthUser } from '../../types';
import { Tag } from '../../models/Tag';
import { DEFAULT_TAGS } from '../../constants/tags';
import { AppError } from '../../types';

export async function listTags(user: AuthUser) {
  return Tag.find({ tenantId: user.tenantId }).sort({ name: 1 });
}

export async function createTag(user: AuthUser, name: string) {
  const existing = await Tag.findOne({ tenantId: user.tenantId, name });
  if (existing) throw new AppError(409, 'Tag already exists');
  return Tag.create({ tenantId: user.tenantId, name, createdBy: user.userId });
}

export async function updateTag(user: AuthUser, tagId: string, name: string) {
  const tag = await Tag.findOneAndUpdate(
    { _id: tagId, tenantId: user.tenantId },
    { name },
    { new: true }
  );
  if (!tag) throw new AppError(404, 'Tag not found');
  return tag;
}

export async function deleteTag(user: AuthUser, tagId: string) {
  const tag = await Tag.findOneAndDelete({ _id: tagId, tenantId: user.tenantId });
  if (!tag) throw new AppError(404, 'Tag not found');
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
