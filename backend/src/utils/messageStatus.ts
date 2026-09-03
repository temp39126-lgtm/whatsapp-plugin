const STATUS_RANK: Record<string, number> = {
  FAILED: -1,
  SENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
};

export function shouldApplyMessageStatus(
  currentStatus: string,
  nextStatus: string
): boolean {
  if (nextStatus === 'FAILED') {
    return currentStatus !== 'READ';
  }

  const currentRank = STATUS_RANK[currentStatus] ?? 0;
  const nextRank = STATUS_RANK[nextStatus] ?? 0;
  return nextRank > currentRank;
}
