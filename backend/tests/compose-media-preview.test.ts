import { describe, it, expect } from 'vitest';
import { composeMediaPreviewKind } from '../../frontend/lib/compose-media-preview';

describe('composeMediaPreviewKind', () => {
  it('classifies images and gifs as image preview', () => {
    expect(composeMediaPreviewKind({ type: 'image/png' } as File)).toBe('image');
    expect(composeMediaPreviewKind({ type: 'image/gif' } as File)).toBe('image');
  });

  it('classifies videos as video preview', () => {
    expect(composeMediaPreviewKind({ type: 'video/mp4' } as File)).toBe('video');
  });

  it('classifies other attachments as file', () => {
    expect(composeMediaPreviewKind({ type: 'application/pdf' } as File)).toBe('file');
  });
});