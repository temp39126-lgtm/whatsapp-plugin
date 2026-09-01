import { generateStorageKey, readMediaFile, storeMediaFile } from '../media/mediaService';

const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function isAvatarMimeType(mimeType: string): boolean {
  return AVATAR_MIME_TYPES.includes(mimeType);
}

export async function storeAvatar(
  tenantId: string,
  category: 'contacts' | 'groups',
  entityId: string,
  fileName: string,
  body: Buffer,
  mimeType: string
): Promise<string> {
  if (!isAvatarMimeType(mimeType)) {
    throw new Error('Avatar must be a JPEG, PNG, WebP, or GIF image');
  }

  const key = generateStorageKey(tenantId, category, `${entityId}-${fileName}`);
  await storeMediaFile(key, body, mimeType);
  return key;
}

export async function readAvatar(storageKey: string) {
  return readMediaFile(storageKey);
}
