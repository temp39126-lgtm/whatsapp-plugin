export async function hasAudioInputDevice(): Promise<boolean> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return true;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === 'audioinput');
  } catch {
    return true;
  }
}

export function mapMicrophoneError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No microphone was found. Connect a headset or microphone, check your system audio input, then reload the page and try again.';
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Microphone permission was denied. Allow microphone access in your browser site settings, then try again.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Your microphone is in use by another app. Close other apps using the mic and try again.';
      case 'SecurityError':
        return 'Microphone access requires a secure HTTPS connection. Open the app using the Cloudflare link, not localhost over HTTP.';
      case 'OverconstrainedError':
        return 'No microphone matched the requested settings. Try a different audio input device.';
      default:
        if (error.message.toLowerCase().includes('requested device not found')) {
          return 'No microphone was found. Connect a headset or microphone, check your system audio input, then reload the page and try again.';
        }
        return error.message || 'Unable to access the microphone.';
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('requested device not found')) {
      return 'No microphone was found. Connect a headset or microphone, check your system audio input, then reload the page and try again.';
    }
    return error.message;
  }

  return 'Unable to access the microphone.';
}

export async function getMicrophoneStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not available in this browser.');
  }

  const hasMic = await hasAudioInputDevice();
  if (!hasMic) {
    throw new DOMException(
      'No microphone was found. Connect a headset or microphone and try again.',
      'NotFoundError'
    );
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });
  } catch (error) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (fallbackError) {
      throw fallbackError ?? error;
    }
  }
}
