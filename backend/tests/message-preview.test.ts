import { describe, expect, it } from 'vitest';
import { formatLastMessagePreview } from '../../shared/utils/messagePreview';

describe('formatLastMessagePreview', () => {
  it('maps media bracket types to friendly labels', () => {
    expect(formatLastMessagePreview('[IMAGE]')).toBe('Photo');
    expect(formatLastMessagePreview('[VOICE]')).toBe('Voice message');
  });

  it('keeps plain text unchanged', () => {
    expect(formatLastMessagePreview('Hello there')).toBe('Hello there');
  });
});