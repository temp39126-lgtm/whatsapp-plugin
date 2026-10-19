'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { connectSocket, getSocket, onSocketEvent } from '@/lib/socket';
import type { CallDTO } from '@/types';
import type { IncomingCallSocketPayload, PendingIncomingCall } from '@/lib/incoming-call-types';
import {
  isRingingIncomingCall,
  shouldDismissForEndedEvent,
  shouldShowIncomingModal,
} from '@/lib/incoming-call-state';
import { createIncomingCallSession } from '@/lib/webrtc/incomingCall';
import type { IncomingCallSession } from '@/lib/webrtc/incomingCall';
import { mapMicrophoneError, prepareMicrophoneAccess } from '@/lib/webrtc/microphone';
import { IncomingCallModal } from './IncomingCallModal';
import { ActiveCallBar } from './ActiveCallBar';

function normalizeCall(raw: CallDTO): CallDTO {
  return {
    ...raw,
    _id: String(raw._id),
    conversationId: String(raw.conversationId),
    contactId: String(raw.contactId),
  };
}

export function IncomingCallManager() {
  const queryClient = useQueryClient();
  const sessionRef = useRef<IncomingCallSession | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const [pending, setPending] = useState<PendingIncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<CallDTO | null>(null);
  const [contactLabel, setContactLabel] = useState<string | undefined>();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState('');
  const [micStatus, setMicStatus] = useState<'checking' | 'ready' | 'blocked'>('checking');
  const [isEnablingMic, setIsEnablingMic] = useState(false);

  const cleanupSession = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
  }, []);

  const clearPending = useCallback(() => {
    pendingIdRef.current = null;
    setPending(null);
    setError('');
    setMicStatus('checking');
  }, []);

  const enableMicrophone = useCallback(async () => {
    setIsEnablingMic(true);
    setError('');
    try {
      await prepareMicrophoneAccess();
      setMicStatus('ready');
    } catch (err) {
      setMicStatus('blocked');
      setError(mapMicrophoneError(err));
    } finally {
      setIsEnablingMic(false);
    }
  }, []);

  const clearActive = useCallback(() => {
    activeIdRef.current = null;
    setActiveCall(null);
    setContactLabel(undefined);
    cleanupSession();
  }, [cleanupSession]);

  const applyPendingPayload = useCallback((payload: IncomingCallSocketPayload) => {
    const call = normalizeCall(payload.call);
    if (!isRingingIncomingCall(call)) return;

    if (activeIdRef.current && activeIdRef.current !== call._id) {
      return;
    }

    if (pendingIdRef.current === call._id) {
      setPending((current) =>
        current
          ? {
              ...current,
              session: payload.session ?? current.session,
              contact: payload.contact ?? current.contact,
            }
          : null
      );
      return;
    }

    if (pendingIdRef.current && pendingIdRef.current !== call._id) {
      return;
    }

    pendingIdRef.current = call._id;
    setPending({
      call,
      session: payload.session,
      contact: payload.contact,
    });
    setError('');
  }, []);

  const handleCallEnded = useCallback(
    (payload: { callId?: string; status?: string }) => {
      const endedId = payload.callId ? String(payload.callId) : undefined;
      const dismiss = shouldDismissForEndedEvent(
        endedId,
        pendingIdRef.current,
        activeIdRef.current
      );
      if (dismiss.clearPending) clearPending();
      if (dismiss.clearActive) clearActive();
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
    [clearActive, clearPending, queryClient]
  );

  const syncActiveIncoming = useCallback(async () => {
    try {
      const response = await api.get<{ data: Array<PendingIncomingCall['call'] & { contact?: PendingIncomingCall['contact'] }> }>(
        '/calls/incoming/active'
      );
      const ringing = response.data?.[0];
      if (!ringing) return;
      if (activeIdRef.current) return;
      applyPendingPayload({
        call: ringing,
        contact: ringing.contact,
      });
    } catch {
      // Ignore sync errors (calling disabled, auth, etc.)
    }
  }, [applyPendingPayload]);

  useEffect(() => {
    if (!pending) return;
    setMicStatus('checking');
    void enableMicrophone();
  }, [pending?.call._id, enableMicrophone, pending]);

  useEffect(() => {
    connectSocket();
    void syncActiveIncoming();

    const socket = getSocket();
    const onConnect = () => {
      void syncActiveIncoming();
    };
    socket.on('connect', onConnect);

    const unsubscribers = [
      onSocketEvent('call.incoming', (data) => {
        applyPendingPayload(data as IncomingCallSocketPayload);
        queryClient.invalidateQueries({ queryKey: ['calls'] });
      }),
      onSocketEvent('call.ended', (data) => {
        handleCallEnded(data as { callId?: string; status?: string });
      }),
      onSocketEvent('call.connected', (data) => {
        const payload = data as { callId?: string };
        if (payload.callId && pendingIdRef.current === String(payload.callId)) {
          clearPending();
        }
        queryClient.invalidateQueries({ queryKey: ['calls'] });
      }),
    ];

    return () => {
      socket.off('connect', onConnect);
      unsubscribers.forEach((unsub) => unsub());
      cleanupSession();
    };
  }, [
    applyPendingPayload,
    cleanupSession,
    handleCallEnded,
    queryClient,
    syncActiveIncoming,
  ]);

  async function handleDecline() {
    if (!pending) return;
    setIsDeclining(true);
    setError('');
    try {
      await api.post(`/calls/${pending.call._id}/reject`);
      clearPending();
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline call');
    } finally {
      setIsDeclining(false);
    }
  }

  async function handleAccept() {
    if (!pending?.session) return;
    setIsAccepting(true);
    setError('');
    try {
      const session = await createIncomingCallSession(pending.session);
      sessionRef.current = session;
      const answer = await session.createAnswer();
      const updated = await api.post<CallDTO>(`/calls/${pending.call._id}/accept`, {
        session: answer,
      });
      const call = normalizeCall(updated);
      pendingIdRef.current = null;
      setPending(null);
      activeIdRef.current = call._id;
      setActiveCall(call);
      setContactLabel(pending.contact?.name ?? pending.contact?.phone);
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    } catch (err) {
      cleanupSession();
      setError(mapMicrophoneError(err));
    } finally {
      setIsAccepting(false);
    }
  }

  async function handleEndActive() {
    if (!activeCall) return;
    setIsEnding(true);
    try {
      await api.post(`/calls/${activeCall._id}/end`);
    } catch {
      // Local cleanup even if Meta terminate fails
    } finally {
      clearActive();
      setIsEnding(false);
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    }
  }

  return (
    <>
      {activeCall && (
        <div className="fixed left-0 right-0 top-0 z-[190] lg:left-64">
          <ActiveCallBar
            call={activeCall}
            contactName={contactLabel}
            isEnding={isEnding}
            onEnd={handleEndActive}
          />
        </div>
      )}
      {shouldShowIncomingModal(pending, activeCall) ? (
        <IncomingCallModal
          pending={pending!}
          isAccepting={isAccepting}
          isDeclining={isDeclining}
          micStatus={micStatus}
          isEnablingMic={isEnablingMic}
          error={error}
          onEnableMicrophone={enableMicrophone}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      ) : null}
    </>
  );
}
