/** Play remote WebRTC audio (requires a recent user gesture such as Accept). */
export function playRemoteStream(stream: MediaStream): HTMLAudioElement {
  const audio = new Audio();
  audio.autoplay = true;
  audio.srcObject = stream;
  void audio.play().catch(() => undefined);
  return audio;
}

export function stopRemoteAudio(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  audio.srcObject = null;
  audio.pause();
}