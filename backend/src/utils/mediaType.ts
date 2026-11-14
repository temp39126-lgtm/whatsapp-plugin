export function mimeToMessageType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

/** WhatsApp Cloud API native voice notes require OGG/Opus and `audio.voice: true`. */
export function isNativeWhatsAppVoiceMime(mimeType: string): boolean {
  const lower = mimeType.toLowerCase();
  return lower.includes('ogg') || lower.includes('opus');
}

export function normalizeVoiceNoteMimeType(mimeType: string): string {
  if (isNativeWhatsAppVoiceMime(mimeType)) return 'audio/ogg';
  return mimeType;
}

export function metaMediaType(messageType: string): string {
  switch (messageType) {
    case 'IMAGE':
      return 'image';
    case 'VIDEO':
      return 'video';
    case 'AUDIO':
    case 'VOICE':
      return 'audio';
    default:
      return 'document';
  }
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/3gpp',
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/amr',
  'audio/ogg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
