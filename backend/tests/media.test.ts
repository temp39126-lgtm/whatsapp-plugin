import { describe, it, expect } from 'vitest';
import { mimeToMessageType, metaMediaType } from '../src/utils/mediaType';

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
    expect(metaMediaType('DOCUMENT')).toBe('document');
  });
});
