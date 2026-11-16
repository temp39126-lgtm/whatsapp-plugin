type MessagePreviewInput = {
  type: string;
  content?: unknown;
  deletedForEveryone?: boolean;
  media?: { fileName?: string };
};

const TYPE_PREVIEW_MAP: Record<string, string> = {
  IMAGE: 'Photo',
  VIDEO: 'Video',
  VOICE: 'Voice message',
  AUDIO: 'Audio',
  DOCUMENT: 'Document',
  STICKER: 'Sticker',
  LOCATION: 'Location',
  CONTACT: 'Contact',
  INTERACTIVE: 'Message',
  CALL: 'Call',
  TEMPLATE: 'Template',
};

/** Turns stored conversation.lastMessage values like `[IMAGE]` into inbox-friendly text. */
export function formatLastMessagePreview(lastMessage: string | null | undefined): string {
  if (lastMessage == null || lastMessage === '') return 'No messages';

  const bracketMatch = /^\[([A-Z_]+)\]$/.exec(lastMessage.trim());
  if (bracketMatch) {
    const type = bracketMatch[1];
    return TYPE_PREVIEW_MAP[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  return lastMessage;
}

export function getMessagePreviewLabel(message: MessagePreviewInput): string {
  if (message.deletedForEveryone) {
    return 'This message was deleted';
  }

  if (message.type === 'TEXT') {
    const text = (message.content as { text?: string } | undefined)?.text?.trim();
    if (text) return text.length > 120 ? `${text.slice(0, 117)}…` : text;
    return 'Message';
  }

  const fileName =
    message.media?.fileName ?? (message.content as { fileName?: string } | undefined)?.fileName;
  if (fileName) {
    return fileName.length > 80 ? `${fileName.slice(0, 77)}…` : fileName;
  }

  const caption = (message.content as { caption?: string } | undefined)?.caption?.trim();
  if (caption) {
    return caption.length > 120 ? `${caption.slice(0, 117)}…` : caption;
  }

  return TYPE_PREVIEW_MAP[message.type] ?? message.type.toLowerCase();
}