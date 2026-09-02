import { getMicrophoneStream, mapMicrophoneError } from '@/lib/webrtc/microphone';

export type WebRtcSession = {
  sdp_type: 'offer' | 'answer';
  sdp: string;
};

export type OutboundCallSession = {
  createOffer: () => Promise<WebRtcSession>;
  applyAnswer: (session: WebRtcSession) => Promise<void>;
  close: () => void;
};

function waitForIceGatheringComplete(peerConnection: RTCPeerConnection): Promise<void> {
  if (peerConnection.iceGatheringState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      peerConnection.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }, 8000);

    function onChange() {
      if (peerConnection.iceGatheringState === 'complete') {
        window.clearTimeout(timeout);
        peerConnection.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }
    }

    peerConnection.addEventListener('icegatheringstatechange', onChange);
  });
}

export async function createOutboundCallSession(): Promise<OutboundCallSession> {
  if (typeof window === 'undefined' || !window.RTCPeerConnection) {
    throw new Error('WebRTC is not supported in this browser.');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not available in this browser.');
  }

  const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  let localStream: MediaStream;
  try {
    localStream = await getMicrophoneStream();
  } catch (error) {
    throw new Error(mapMicrophoneError(error));
  }

  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  let remoteAudio: HTMLAudioElement | null = null;
  peerConnection.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) return;
    if (!remoteAudio) {
      remoteAudio = new Audio();
      remoteAudio.autoplay = true;
    }
    remoteAudio.srcObject = stream;
  };

  return {
    async createOffer() {
      const offer = await peerConnection.createOffer({ offerToReceiveAudio: true });
      await peerConnection.setLocalDescription(offer);
      await waitForIceGatheringComplete(peerConnection);
      const sdp = peerConnection.localDescription?.sdp;
      if (!sdp) {
        throw new Error('Failed to create WebRTC offer.');
      }
      return { sdp_type: 'offer', sdp };
    },
    async applyAnswer(session) {
      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: session.sdp,
      });
    },
    close() {
      localStream.getTracks().forEach((track) => track.stop());
      peerConnection.close();
      if (remoteAudio) {
        remoteAudio.srcObject = null;
        remoteAudio = null;
      }
    },
  };
}
