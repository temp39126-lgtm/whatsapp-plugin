import { onSocketEvent } from '@/lib/socket';
import type { WebRtcSession } from '@/lib/webrtc/outboundCall';

export function waitForCallSdpAnswer(
  conversationId: string,
  callId?: string,
  timeoutMs = 30000
): Promise<WebRtcSession> {
  return new Promise((resolve, reject) => {
    let unsubscribeAnswer: (() => void) | undefined;
    let unsubscribeEnded: (() => void) | undefined;

    const stopListening = () => {
      unsubscribeAnswer?.();
      unsubscribeEnded?.();
    };

    const timeout = window.setTimeout(() => {
      stopListening();
      reject(new Error('Timed out waiting for Meta call answer.'));
    }, timeoutMs);

    unsubscribeAnswer = onSocketEvent('call.sdp-answer', (data) => {
      const payload = data as {
        conversationId?: string;
        session?: WebRtcSession;
      };
      if (payload.conversationId !== conversationId || !payload.session) return;
      window.clearTimeout(timeout);
      stopListening();
      resolve(payload.session);
    });

    if (callId) {
      unsubscribeEnded = onSocketEvent('call.ended', (data) => {
        const payload = data as { callId?: string };
        if (payload.callId !== callId) return;
        window.clearTimeout(timeout);
        stopListening();
        reject(new Error('Call ended before connection was established.'));
      });
    }
  });
}
