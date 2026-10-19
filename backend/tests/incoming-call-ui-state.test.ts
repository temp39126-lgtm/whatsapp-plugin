import { describe, it, expect } from 'vitest';
import {
  isRingingIncomingCall,
  shouldDismissForEndedEvent,
  shouldShowIncomingModal,
} from '../../frontend/lib/incoming-call-state';

describe('incoming call UI state', () => {
  it('shows modal only for ringing incoming calls without an active call', () => {
    const pending = {
      call: { _id: '1', direction: 'INCOMING', status: 'RINGING' },
    };
    expect(shouldShowIncomingModal(pending as never, null)).toBe(true);
    expect(
      shouldShowIncomingModal(pending as never, {
        direction: 'INCOMING',
        status: 'CONNECTED',
      })
    ).toBe(false);
    expect(isRingingIncomingCall({ direction: 'OUTGOING', status: 'RINGING' })).toBe(false);
  });

  it('dismisses modal or active bar when matching call.ended events arrive', () => {
    expect(shouldDismissForEndedEvent('call-1', 'call-1', null)).toEqual({
      clearPending: true,
      clearActive: false,
    });
    expect(shouldDismissForEndedEvent('call-2', 'call-1', 'call-2')).toEqual({
      clearPending: false,
      clearActive: true,
    });
    expect(shouldDismissForEndedEvent(undefined, 'call-1', null)).toEqual({
      clearPending: true,
      clearActive: false,
    });
  });
});
