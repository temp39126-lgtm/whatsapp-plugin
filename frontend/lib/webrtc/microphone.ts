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
        return 'Your browser cannot use a microphone. Open the CRM with HTTPS, allow the mic for this site (lock icon in the address bar), set your OS default input to the headset (Windows: Settings → Sound → Input), and avoid Remote Desktop without audio redirection. Reload, then click Enable microphone.';
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Microphone permission was denied. Click the lock icon in the address bar → Microphone → Allow, then click Enable microphone again.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Your microphone is in use by another app (Zoom, Teams, etc.). Close those apps and try again.';
      case 'SecurityError':
        return 'Microphone access requires HTTPS. Open https://wa.zenablers.com (or your secure domain), not http:// or a raw IP address.';
      case 'OverconstrainedError':
        return 'No microphone matched the requested settings. Choose a different input device in system sound settings.';
      default:
        if (error.message.toLowerCase().includes('requested device not found')) {
          return 'Your browser cannot see a microphone input. Check headset connection, OS input device, and browser permission for this site, then reload.';
        }
        return error.message || 'Unable to access the microphone.';
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('requested device not found')) {
      return 'Your browser cannot see a microphone input. Check headset connection, OS input device, and browser permission for this site, then reload.';
    }
    return error.message;
  }

  return 'Unable to access the microphone.';
}

export async function getMicrophoneStream(): Promise<MediaStream> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not available in this browser.');
  }

  if (!window.isSecureContext) {
    throw new DOMException('Microphone requires HTTPS.', 'SecurityError');
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

/** Requests permission and releases the stream so WebRTC can open the mic for the call. */
export async function prepareMicrophoneAccess(): Promise<void> {
  const stream = await getMicrophoneStream();
  stream.getTracks().forEach((track) => track.stop());
}
