import { getMicrophoneStream, mapMicrophoneError } from '@/lib/webrtc/microphone';

const VOICE_NOTE_MAX_MS = 15 * 60 * 1000;
const VOICE_NOTE_MIN_MS = 800;

/** Prefer OGG/Opus for native WhatsApp voice notes; WebM is converted to MP3 for Meta. */
const RECORDER_MIME_CANDIDATES = [
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
];

function isOggOpusRecordingMime(mime: string): boolean {
  const lower = mime.toLowerCase();
  return lower.includes('ogg') || lower.includes('opus');
}

function bufferHasOggHeader(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53;
}

function bufferHasMp3Header(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 2) return false;
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

export type VoiceNoteRecorder = {
  pause: () => boolean;
  resume: () => boolean;
  getIsPaused: () => boolean;
  getElapsedMs: () => number;
  supportsPause: boolean;
  stop: () => Promise<{ file: File; durationMs: number }>;
  cancel: () => void;
};

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Voice recording is not supported in this browser.');
  }
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  throw new Error('Voice recording is not supported in this browser.');
}

async function recordingBlobToMp3(recording: Blob): Promise<Blob> {
  const { loadLameEncoder } = await import('./loadLameEncoder');
  const { Mp3Encoder } = await loadLameEncoder();
  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await recording.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const samples = new Int16Array(length);
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

    for (let i = 0; i < length; i++) {
      const mixed = (left[i] + right[i]) / 2;
      const clamped = Math.max(-1, Math.min(1, mixed));
      samples[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
    }

    const mp3encoder = new Mp3Encoder(1, sampleRate, 128);
    const mp3Chunks: Int8Array[] = [];
    const blockSize = 1152;
    for (let i = 0; i < samples.length; i += blockSize) {
      const slice = samples.subarray(i, i + blockSize);
      const encoded = mp3encoder.encodeBuffer(slice, slice);
      if (encoded.length > 0) mp3Chunks.push(encoded);
    }
    const flushed = mp3encoder.flush();
    if (flushed.length > 0) mp3Chunks.push(flushed);

    if (mp3Chunks.length === 0) {
      throw new Error('Could not encode voice note. Try again or use a shorter recording.');
    }

    const totalLength = mp3Chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of mp3Chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return new Blob([merged], { type: 'audio/mpeg' });
  } finally {
    await audioContext.close();
  }
}

/** OGG/Opus is sent as a native WhatsApp voice note when the blob is valid; otherwise MP3. */
async function chunksToVoiceNoteFile(chunks: Blob[], recorderMime: string): Promise<File> {
  const raw = new Blob(chunks, { type: recorderMime });
  const rawBuffer = await raw.arrayBuffer();
  if (rawBuffer.byteLength === 0) {
    throw new Error('No audio was captured. Check your microphone and try again.');
  }

  if (isOggOpusRecordingMime(recorderMime) && bufferHasOggHeader(rawBuffer)) {
    const type = recorderMime.includes('ogg') ? recorderMime.split(';')[0]! : 'audio/ogg';
    return new File([raw], 'voice-note.ogg', { type });
  }

  try {
    const mp3 = await recordingBlobToMp3(raw);
    const mp3Buffer = await mp3.arrayBuffer();
    if (!bufferHasMp3Header(mp3Buffer)) {
      throw new Error('Voice note encoding failed. Please record again.');
    }
    return new File([mp3], 'voice-note.mp3', { type: 'audio/mpeg' });
  } catch (error) {
    console.error('[VoiceNote] MP3 conversion failed:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Voice note conversion failed.'
    );
  }
}

export async function startVoiceNoteRecording(): Promise<VoiceNoteRecorder> {
  const stream = await getMicrophoneStream().catch((error) => {
    throw new Error(mapMicrophoneError(error));
  });

  const mimeType = pickRecorderMimeType();
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  let accumulatedMs = 0;
  let segmentStart = Date.now();
  let paused = false;
  let maxTimer: number | undefined;

  const supportsPause =
    typeof recorder.pause === 'function' && typeof recorder.resume === 'function';

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });

  recorder.start(250);

  maxTimer = window.setTimeout(() => {
    if (recorder.state === 'recording') recorder.stop();
  }, VOICE_NOTE_MAX_MS);

  const cleanupStream = () => {
    stream.getTracks().forEach((track) => track.stop());
    if (maxTimer !== undefined) window.clearTimeout(maxTimer);
  };

  const getElapsedMs = () => {
    const active = paused ? 0 : Date.now() - segmentStart;
    return accumulatedMs + active;
  };

  return {
    supportsPause,
    getIsPaused: () => paused,
    getElapsedMs,
    pause() {
      if (!supportsPause || recorder.state !== 'recording' || paused) return false;
      recorder.pause();
      accumulatedMs += Date.now() - segmentStart;
      paused = true;
      return true;
    },
    resume() {
      if (!supportsPause || recorder.state !== 'paused' || !paused) return false;
      recorder.resume();
      segmentStart = Date.now();
      paused = false;
      return true;
    },
    cancel() {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      cleanupStream();
    },
    stop() {
      return new Promise((resolve, reject) => {
        const fail = (message: string) => {
          cleanupStream();
          reject(new Error(message));
        };

        recorder.addEventListener(
          'stop',
          () => {
            void (async () => {
              try {
                if (!paused) {
                  accumulatedMs += Date.now() - segmentStart;
                }
                const durationMs = accumulatedMs;
                cleanupStream();
                if (durationMs < VOICE_NOTE_MIN_MS) {
                  fail('Recording is too short. Hold the mic a little longer.');
                  return;
                }
                if (chunks.length === 0) {
                  fail('No audio was captured. Check your microphone and try again.');
                  return;
                }
                const file = await chunksToVoiceNoteFile(chunks, mimeType);
                resolve({ file, durationMs });
              } catch (error) {
                fail(error instanceof Error ? error.message : 'Failed to process voice note');
              }
            })();
          },
          { once: true }
        );

        if (recorder.state === 'recording' || recorder.state === 'paused') {
          recorder.stop();
        } else if (recorder.state === 'inactive') {
          fail('Recording already stopped.');
        }
      });
    },
  };
}

export function formatRecordingDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}