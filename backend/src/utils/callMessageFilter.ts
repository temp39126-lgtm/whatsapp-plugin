/**
 * Meta sometimes delivers call summaries on the messages webhook as interactive/unsupported
 * payloads. Those should not appear as chat attachments — call state lives on the calls API.
 */
export function isCallNotificationMessage(incoming: Record<string, unknown>): boolean {
  const type = String(incoming.type ?? '').toLowerCase();
  const serialized = JSON.stringify(incoming).toLowerCase();

  if (serialized.includes('"call"') || serialized.includes('voice_call') || serialized.includes('call_log')) {
    return true;
  }

  if (type === 'interactive') {
    const interactive = incoming.interactive as Record<string, unknown> | undefined;
    const interactiveType = String(interactive?.type ?? '').toLowerCase();
    if (interactiveType.includes('call')) {
      return true;
    }
  }

  if ((type === 'unsupported' || type === 'unknown') && serialized.includes('call')) {
    return true;
  }

  return false;
}
