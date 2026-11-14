type Mp3EncoderInstance = {
  encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
  flush(): Int8Array;
};

type Mp3EncoderCtor = new (
  channels: number,
  sampleRate: number,
  kbps: number
) => Mp3EncoderInstance;

type LameJsBundle = {
  Mp3Encoder: Mp3EncoderCtor;
};

let loadPromise: Promise<LameJsBundle> | null = null;

function getBundleFromWindow(): LameJsBundle | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { lamejs?: LameJsBundle & (() => void) }).lamejs;
  if (candidate?.Mp3Encoder) {
    return { Mp3Encoder: candidate.Mp3Encoder };
  }
  return null;
}

/** Loads the single-file lame bundle (avoids webpack breaking MPEGMode in modular lamejs). */
export function loadLameEncoder(): Promise<LameJsBundle> {
  const existing = getBundleFromWindow();
  if (existing) return Promise.resolve(existing);

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/lame.all.js';
      script.async = true;
      script.onload = () => {
        const bundle = getBundleFromWindow();
        if (bundle) {
          resolve(bundle);
          return;
        }
        reject(new Error('MP3 encoder failed to initialize.'));
      };
      script.onerror = () => reject(new Error('Failed to load MP3 encoder.'));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}