'use client';

import { useEffect, useState } from 'react';
import { PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CallDTO } from '@/types';

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface OngoingCallModalProps {
  call: CallDTO;
  contactName?: string;
  isEnding?: boolean;
  onEnd: () => void;
}

export function OngoingCallModal({ call, contactName, isEnding, onEnd }: OngoingCallModalProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = call.startedAt ? new Date(call.startedAt).getTime() : Date.now();
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [call._id, call.startedAt]);

  const statusLabel =
    call.status === 'CONNECTED'
      ? 'Connected'
      : call.status === 'RINGING'
        ? 'Ringing…'
        : 'Connecting…';

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="ongoing-call-title"
        aria-modal="true"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp-light">
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-whatsapp opacity-60" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-whatsapp" />
            </span>
          </div>
          <p id="ongoing-call-title" className="text-lg font-semibold">
            On call
          </p>
          <p className="mt-1 text-base font-medium">{contactName ?? 'Voice call'}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {statusLabel} · {formatElapsed(elapsed)}
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="mt-6 w-full gap-2"
          disabled={isEnding}
          onClick={onEnd}
        >
          <PhoneOff className="h-5 w-5" />
          {isEnding ? 'Ending call…' : 'End call'}
        </Button>
      </div>
    </div>
  );
}