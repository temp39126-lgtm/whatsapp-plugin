import { onSocketEvent } from '@/lib/socket';
import type { WebRtcSession } from '@/lib/webrtc/outboundCall';

export function waitForCallSdpAnswer(
  conversationId: string,
  timeoutMs = 30000
): Promise<WebRtcSession> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out waiting for Meta call answer.'));
    }, timeoutMs);

    const unsubscribe = onSocketEvent('call.sdp-answer', (data) => {
      const payload = data as {
        conversationId?: string;
        session?: WebRtcSession;
      };
      if (payload.conversationId !== conversationId || !payload.session) return;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(payload.session);
    });
  });
}
