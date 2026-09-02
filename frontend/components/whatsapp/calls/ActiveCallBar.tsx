'use client';

import { PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CallDTO } from '@/types';

interface ActiveCallBarProps {
  call: CallDTO;
  contactName?: string;
  isEnding?: boolean;
  onEnd: () => void;
}

export function ActiveCallBar({ call, contactName, isEnding, onEnd }: ActiveCallBarProps) {
  const statusLabel =
    call.status === 'CONNECTED'
      ? 'Connected'
      : call.status === 'RINGING'
        ? 'Ringing...'
        : 'Connecting...';

  return (
    <div className="flex items-center justify-between gap-2 border-b bg-whatsapp px-4 py-3 text-white">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{contactName ?? 'Voice call'}</p>
        <p className="text-xs text-white/80">{statusLabel}</p>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isEnding}
        onClick={onEnd}
        className="shrink-0 gap-2"
      >
        <PhoneOff className="h-4 w-4" />
        {isEnding ? 'Ending...' : 'End call'}
      </Button>
    </div>
  );
}
