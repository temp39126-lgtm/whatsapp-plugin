import { describe, it, expect } from 'vitest';
import {
  mimeToMessageType,
  metaMediaType,
  isNativeWhatsAppVoiceMime,
  normalizeVoiceNoteMimeType,
} from '../src/utils/mediaType';
import { mediaUploadFileName } from '../src/services/whatsapp/metaApi';

describe('Media type mapping', () => {
  it('maps mime types to message types', () => {
    expect(mimeToMessageType('image/jpeg')).toBe('IMAGE');
    expect(mimeToMessageType('video/mp4')).toBe('VIDEO');
    expect(mimeToMessageType('audio/mpeg')).toBe('AUDIO');
    expect(mimeToMessageType('application/pdf')).toBe('DOCUMENT');
  });

  it('maps message types to Meta media types', () => {
    expect(metaMediaType('IMAGE')).toBe('image');
    expect(metaMediaType('VIDEO')).toBe('video');
    expect(metaMediaType('AUDIO')).toBe('audio');
    expect(metaMediaType('VOICE')).toBe('audio');
    expect(metaMediaType('DOCUMENT')).toBe('document');
  });

  it('detects native WhatsApp voice mime types', () => {
    expect(isNativeWhatsAppVoiceMime('audio/ogg;codecs=opus')).toBe(true);
    expect(isNativeWhatsAppVoiceMime('audio/mpeg')).toBe(false);
    expect(normalizeVoiceNoteMimeType('audio/ogg;codecs=opus')).toBe('audio/ogg');
  });

  it('picks upload filenames with extensions for Meta', () => {
    expect(mediaUploadFileName('audio/mpeg')).toBe('voice-note.mp3');
    expect(mediaUploadFileName('audio/ogg', 'custom.ogg')).toBe('custom.ogg');
  });
});
