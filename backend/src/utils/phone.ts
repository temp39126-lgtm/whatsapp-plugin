/** Normalize WhatsApp IDs to digits-only for consistent lookups. */
export function normalizeWhatsAppId(input: string): string {
  return input.replace(/\D/g, '');
}

/** Format digits as E.164-style display phone when possible. */
export function formatPhoneDisplay(digits: string): string {
  const normalized = normalizeWhatsAppId(digits);
  return normalized ? `+${normalized}` : digits.trim();
}
