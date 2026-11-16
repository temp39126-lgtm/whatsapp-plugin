import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  env: { DEFAULT_PHONE_REGION: 'IN' },
}));

import {
  canonicalWhatsAppId,
  whatsappIdLookupVariants,
} from '../src/utils/phone';

describe('canonicalWhatsAppId (India)', () => {
  it('prefixes 91 for 10-digit Indian mobile numbers', () => {
    expect(canonicalWhatsAppId('8860916437')).toBe('918860916437');
    expect(canonicalWhatsAppId('+91 88609 16437')).toBe('918860916437');
  });

  it('strips leading 0 before prefixing 91', () => {
    expect(canonicalWhatsAppId('08860916437')).toBe('918860916437');
  });

  it('exposes lookup variants for merged identity', () => {
    expect(whatsappIdLookupVariants('918860916437')).toEqual(
      expect.arrayContaining(['918860916437', '8860916437'])
    );
  });
});