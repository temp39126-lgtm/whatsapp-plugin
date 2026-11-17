/** Trim and strip accidental quote wrapping from docker-compose / .env values. */
export function normalizeEnvString(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let trimmed = value.trim();
  if (!trimmed) return '';

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    trimmed = trimmed.slice(1, -1);
  } else if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
    trimmed = trimmed.slice(1);
  }

  return trimmed.trim();
}