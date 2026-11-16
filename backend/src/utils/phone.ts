import { env } from '../config/env';

/** Normalize WhatsApp IDs to digits-only for consistent lookups. */
export function normalizeWhatsAppId(input: string): string {
  return input.replace(/\D/g, '');
}

export type PhoneRegion = 'IN' | 'NONE';

function defaultPhoneRegion(): PhoneRegion {
  return env.DEFAULT_PHONE_REGION === 'NONE' ? 'NONE' : 'IN';
}

/**
 * Single canonical whatsappId for storage and Meta API calls.
 * For India (default): 10-digit mobile → prefix 91; 0-prefixed local → 91 + 10 digits.
 */
export function canonicalWhatsAppId(input: string, region?: PhoneRegion): string {
  let digits = normalizeWhatsAppId(input);
  if (!digits) return digits;

  const effectiveRegion = region ?? defaultPhoneRegion();
  if (effectiveRegion === 'IN') {
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
      digits = `91${digits}`;
    } else if (digits.length === 11 && digits.startsWith('0') && /^0[6-9]\d{9}$/.test(digits)) {
      digits = `91${digits.slice(1)}`;
    }
  }

  return digits;
}

/** Ids that should match the same person (e.g. 91xxxxxxxxxx vs 10-digit local). */
export function whatsappIdLookupVariants(canonicalId: string, region?: PhoneRegion): string[] {
  const variants = new Set<string>([canonicalId]);
  const effectiveRegion = region ?? defaultPhoneRegion();

  if (effectiveRegion === 'IN' && canonicalId.startsWith('91') && canonicalId.length === 12) {
    const local = canonicalId.slice(2);
    if (/^[6-9]\d{9}$/.test(local)) {
      variants.add(local);
    }
  }

  return [...variants];
}

/** Format digits as E.164-style display phone when possible. */
export function formatPhoneDisplay(digits: string): string {
  const normalized = normalizeWhatsAppId(digits);
  return normalized ? `+${normalized}` : digits.trim();
}
