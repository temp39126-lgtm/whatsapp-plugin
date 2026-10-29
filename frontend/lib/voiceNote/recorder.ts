import { getMicrophoneStream, mapMicrophoneError } from '@/lib/webrtc/microphone';

const VOICE_NOTE_MAX_MS = 15 * 60 * 1000;
const VOICE_NOTE_MIN_MS = 800;

/** Prefer WebM/OGG for recording; MP4/AAC only as fallback — always uploaded to Meta as MP3. */
const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
];

export type VoiceNoteRecorder = {
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
  const lameModule = await import('lamejs');
  const lamejs = lameModule.default ?? lameModule;
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

    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
    const mp3Chunks: Int8Array[] = [];
    const blockSize = 1152;
    for (let i = 0; i < samples.length; i += blockSize) {
      const slice = samples.subarray(i, i + blockSize);
      const encoded = mp3encoder.encodeBuffer(slice);
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

/** Meta accepts audio/mpeg; raw MediaRecorder MP4/WebM blobs are often rejected (131053). */
async function chunksToVoiceNoteFile(chunks: Blob[], recorderMime: string): Promise<File> {
  const raw = new Blob(chunks, { type: recorderMime });
  try {
    const mp3 = await recordingBlobToMp3(raw);
    return new File([mp3], 'voice-note.mp3', { type: 'audio/mpeg' });
  } catch {
    throw new Error(
      'Could not prepare voice note for WhatsApp. Try Chrome or Firefox, or attach an MP3/OGG file with the paperclip.'
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
  const startedAt = Date.now();
  let maxTimer: number | undefined;

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

  return {
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
                const durationMs = Date.now() - startedAt;
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

        if (recorder.state === 'recording') {
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
