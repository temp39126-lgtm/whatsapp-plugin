'use client';

import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { createOutboundCallSession, type OutboundCallSession } from '@/lib/webrtc/outboundCall';
import { waitForCallSdpAnswer } from '@/lib/webrtc/waitForCallSdpAnswer';
import type { CallDTO } from '@/types';

export function useOutboundCall() {
  const sessionRef = useRef<OutboundCallSession | null>(null);
  const [activeCall, setActiveCall] = useState<CallDTO | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const cleanup = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setActiveCall(null);
  }, []);

  const startCall = useCallback(
    async (conversationId: string) => {
      setError('');
      setIsStarting(true);

      try {
        connectSocket();
        const answerPromise = waitForCallSdpAnswer(conversationId);
        const session = await createOutboundCallSession();
        sessionRef.current = session;
        const offer = await session.createOffer();

        const call = await api.post<CallDTO>('/calls/start', {
          conversationId,
          session: offer,
        });

        if (call.status === 'FAILED') {
          throw new Error(call.failureReason ?? 'Call could not be started.');
        }

        setActiveCall(call);

        const answer = await answerPromise;
        await session.applyAnswer(answer);
        setActiveCall((current) =>
          current ? { ...current, status: 'CONNECTED' } : current
        );
        return call;
      } catch (err) {
        cleanup();
        const message =
          err instanceof Error ? err.message : 'Unable to start call with WebRTC.';
        setError(message);
        throw err;
      } finally {
        setIsStarting(false);
      }
    },
    [cleanup]
  );

  const endCall = useCallback(
    async (callId: string) => {
      try {
        await api.post(`/calls/${callId}/end`);
      } finally {
        cleanup();
      }
    },
    [cleanup]
  );

  return {
    activeCall,
    isStarting,
    error,
    startCall,
    endCall,
    cleanup,
    setError,
  };
}
