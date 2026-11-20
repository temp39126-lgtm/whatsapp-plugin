export type ComposeMediaPreviewKind = 'image' | 'video' | 'file';

export function composeMediaPreviewKind(file: File): ComposeMediaPreviewKind {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}