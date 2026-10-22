'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { connectSocket, onSocketEvent } from '@/lib/socket';
import { createOutboundCallSession, type OutboundCallSession } from '@/lib/webrtc/outboundCall';
import { mapMicrophoneError } from '@/lib/webrtc/microphone';
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

  const endServerCall = useCallback(async (call: CallDTO | null) => {
    if (!call) return;
    if (!['INITIATING', 'RINGING', 'CONNECTED'].includes(call.status)) return;
    await api.post(`/calls/${call._id}/end`).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activeCall) return;
    connectSocket();
    return onSocketEvent('call.ended', (data) => {
      const payload = data as { callId?: string };
      if (payload.callId === activeCall._id) {
        cleanup();
      }
    });
  }, [activeCall, cleanup]);

  const startCall = useCallback(
    async (conversationId: string) => {
      setError('');
      setIsStarting(true);

      let startedCall: CallDTO | null = null;

      try {
        connectSocket();
        const session = await createOutboundCallSession();
        sessionRef.current = session;
        const offer = await session.createOffer();

        const call = await api.post<CallDTO>('/calls/start', {
          conversationId,
          session: offer,
        });
        startedCall = call;

        if (call.status === 'FAILED') {
          throw new Error(call.failureReason ?? 'Call could not be started.');
        }

        setActiveCall(call);

        const answer = await waitForCallSdpAnswer(conversationId, call._id);
        await session.applyAnswer(answer);
        setActiveCall((current) =>
          current ? { ...current, status: 'CONNECTED' } : current
        );
        return call;
      } catch (err) {
        await endServerCall(startedCall);
        cleanup();
        const message = mapMicrophoneError(err);
        setError(message);
        throw err;
      } finally {
        setIsStarting(false);
      }
    },
    [cleanup, endServerCall]
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
