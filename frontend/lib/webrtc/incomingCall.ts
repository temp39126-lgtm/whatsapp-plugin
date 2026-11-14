import { getMicrophoneStream, mapMicrophoneError } from '@/lib/webrtc/microphone';
import type { WebRtcSession } from '@/lib/webrtc/outboundCall';
import { playRemoteStream, stopRemoteAudio } from '@/lib/webrtc/remoteAudio';
import { waitForMediaConnection } from '@/lib/webrtc/waitForMediaConnection';

export type IncomingCallSession = {
  createAnswer: () => Promise<WebRtcSession>;
  waitUntilMediaReady: (timeoutMs?: number) => Promise<void>;
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

export async function createIncomingCallSession(
  remoteOffer: WebRtcSession
): Promise<IncomingCallSession> {
  if (typeof window === 'undefined' || !window.RTCPeerConnection) {
    throw new Error('WebRTC is not supported in this browser.');
  }

  const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  const localStream = await getMicrophoneStream().catch((error) => {
    throw new Error(mapMicrophoneError(error));
  });

  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  let remoteAudio: HTMLAudioElement | null = null;
  peerConnection.ontrack = (event) => {
    const stream = event.streams[0] ?? new MediaStream([event.track]);
    stopRemoteAudio(remoteAudio);
    remoteAudio = playRemoteStream(stream);
  };

  await peerConnection.setRemoteDescription({
    type: 'offer',
    sdp: remoteOffer.sdp,
  });

  return {
    async createAnswer() {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await waitForIceGatheringComplete(peerConnection);
      const sdp = peerConnection.localDescription?.sdp;
      if (!sdp) {
        throw new Error('Failed to create WebRTC answer.');
      }
      return { sdp_type: 'answer', sdp };
    },
    waitUntilMediaReady(timeoutMs?: number) {
      return waitForMediaConnection(peerConnection, timeoutMs);
    },
    close() {
      localStream.getTracks().forEach((track) => track.stop());
      peerConnection.close();
      stopRemoteAudio(remoteAudio);
      remoteAudio = null;
    },
  };
}
