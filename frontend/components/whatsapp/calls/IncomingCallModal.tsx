'use client';

import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PendingIncomingCall } from '@/lib/incoming-call-types';

type MicStatus = 'checking' | 'ready' | 'blocked';

interface IncomingCallModalProps {
  pending: PendingIncomingCall;
  isAccepting: boolean;
  isDeclining: boolean;
  micStatus: MicStatus;
  isEnablingMic: boolean;
  error?: string;
  onEnableMicrophone: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({
  pending,
  isAccepting,
  isDeclining,
  micStatus,
  isEnablingMic,
  error,
  onEnableMicrophone,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const name = pending.contact?.name ?? 'WhatsApp caller';
  const phone = pending.contact?.phone;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="incoming-call-title"
        aria-modal="true"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-whatsapp-light">
            <Phone className="h-8 w-8 animate-pulse text-whatsapp-dark" aria-hidden="true" />
          </div>
          <p id="incoming-call-title" className="text-lg font-semibold">
            Incoming WhatsApp call
          </p>
          <p className="mt-1 text-base font-medium">{name}</p>
          {phone ? <p className="text-sm text-muted-foreground">{phone}</p> : null}
          {!pending.session ? (
            <p className="mt-3 text-xs text-amber-700">
              Call signaling is still loading. You can decline; accepting may fail until Meta sends
              the offer.
            </p>
          ) : null}
          {micStatus === 'checking' ? (
            <p className="mt-3 text-xs text-muted-foreground">Checking microphone access…</p>
          ) : null}
          {micStatus === 'ready' ? (
            <p className="mt-3 text-xs text-green-700">Microphone is ready for this call.</p>
          ) : null}
          {micStatus === 'blocked' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={isEnablingMic || isAccepting || isDeclining}
              onClick={onEnableMicrophone}
            >
              {isEnablingMic ? 'Enabling…' : 'Enable microphone'}
            </Button>
          ) : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="destructive"
            className="flex-1 gap-2"
            disabled={isAccepting || isDeclining}
            onClick={onDecline}
          >
            <PhoneOff className="h-4 w-4" />
            Decline
          </Button>
          <Button
            type="button"
            variant="whatsapp"
            className="flex-1 gap-2"
            disabled={
              isAccepting || isDeclining || !pending.session || micStatus !== 'ready'
            }
            onClick={onAccept}
          >
            <Phone className="h-4 w-4" />
            {isAccepting ? 'Connecting…' : 'Accept'}
          </Button>
        </div>
      </div>
    </div>
  );
}
