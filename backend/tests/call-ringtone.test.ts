import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setCallRingtoneMuted,
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
  isCallRingtoneMuted,
} from '../../frontend/lib/callRingtone';

describe('incoming call ringtone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setCallRingtoneMuted(false);
    stopIncomingCallRingtone();
  });

  afterEach(() => {
    stopIncomingCallRingtone();
    vi.useRealTimers();
  });

  it('mutes and unmutes ring playback state', () => {
    expect(isCallRingtoneMuted()).toBe(false);
    setCallRingtoneMuted(true);
    expect(isCallRingtoneMuted()).toBe(true);
    setCallRingtoneMuted(false);
    expect(isCallRingtoneMuted()).toBe(false);
  });

  it('schedules repeated ring pulses until stopped', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    startIncomingCallRingtone();
    expect(setIntervalSpy).toHaveBeenCalled();
    stopIncomingCallRingtone();
    setIntervalSpy.mockRestore();
  });
});