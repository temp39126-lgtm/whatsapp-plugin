/**
 * Escapes special regex characters so user input can be used safely in MongoDB $regex queries.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
