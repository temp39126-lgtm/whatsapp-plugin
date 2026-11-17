let audioContext: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let ringMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioContext = new AudioContextCtor();
  }
  return audioContext;
}

function playRingPulse(): void {
  const context = getAudioContext();
  if (!context || ringMuted) return;

  void context.resume().then(() => {
    const start = context.currentTime;
    const frequencies = [440, 554];
    frequencies.forEach((frequency) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.07, start + 0.04);
      gain.gain.setValueAtTime(0.07, start + 0.85);
      gain.gain.linearRampToValueAtTime(0, start + 1);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 1.05);
    });
  }).catch(() => undefined);
}

export function setCallRingtoneMuted(muted: boolean): void {
  ringMuted = muted;
  if (muted) {
    stopIncomingCallRingtone();
  } else if (ringTimer) {
    playRingPulse();
  }
}

export function isCallRingtoneMuted(): boolean {
  return ringMuted;
}

export function startIncomingCallRingtone(): void {
  if (ringMuted) return;
  stopIncomingCallRingtone();
  playRingPulse();
  ringTimer = setInterval(playRingPulse, 2800);
}

export function stopIncomingCallRingtone(): void {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
}