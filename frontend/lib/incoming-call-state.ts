type CallLike = { direction: string; status: string };
type PendingLike = { call: CallLike };

export function isRingingIncomingCall(call: CallLike): boolean {
  return call.direction === 'INCOMING' && call.status === 'RINGING';
}

export function shouldShowIncomingModal(
  pending: PendingLike | null,
  activeCall: CallLike | null
): boolean {
  return Boolean(pending && !activeCall);
}

export function shouldDismissForEndedEvent(
  callId: string | undefined,
  pendingId: string | null,
  activeId: string | null
): { clearPending: boolean; clearActive: boolean } {
  if (!callId) {
    return { clearPending: Boolean(pendingId), clearActive: Boolean(activeId) };
  }
  return {
    clearPending: pendingId === callId,
    clearActive: activeId === callId,
  };
}
