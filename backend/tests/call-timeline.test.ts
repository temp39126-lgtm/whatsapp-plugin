import { describe, it, expect } from 'vitest';
import { isCallNotificationMessage } from '../src/utils/callMessageFilter';
import { formatCallTimelineLabel } from '../src/services/calls/callTimelineService';

describe('call timeline', () => {
  it('detects Meta call notification payloads on the messages webhook', () => {
    expect(
      isCallNotificationMessage({
        type: 'interactive',
        interactive: { type: 'call_log', body: { text: 'Voice call' } },
      })
    ).toBe(true);

    expect(
      isCallNotificationMessage({
        type: 'text',
        text: { body: 'Hello' },
      })
    ).toBe(false);
  });

  it('formats call labels for chat timeline', () => {
    expect(
      formatCallTimelineLabel({ direction: 'INCOMING', status: 'MISSED', duration: undefined })
    ).toBe('Missed voice call');
    expect(
      formatCallTimelineLabel({ direction: 'OUTGOING', status: 'ENDED', duration: 125 })
    ).toBe('Voice call · 2:05');
  });
});
