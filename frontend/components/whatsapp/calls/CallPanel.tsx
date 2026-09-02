'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { api } from '@/lib/api';
import type { CallDTO, PaginatedResponse, WhatsAppConnectionStatus } from '@/types';
import { cn } from '@/lib/utils';

export function CallPanel() {
  const { data: connection } = useQuery({
    queryKey: ['settings-connection'],
    queryFn: () => api.get<WhatsAppConnectionStatus>('/settings/connection'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: () => api.get<PaginatedResponse<CallDTO>>('/calls'),
  });

  const calls = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Call History</h1>

      {connection?.callingEnabled ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Voice calling is enabled. Use the phone icon in a 1:1 inbox conversation to start a call.
          Incoming calls appear here when Meta sends webhook events to your callback URL.
        </p>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          Voice calling is disabled on this server. Set <code>CALLING_ENABLED=true</code> in the
          backend environment to enable it.
        </p>
      )}

      {calls.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No calls yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            WhatsApp calling requires Meta Business Calling to be enabled
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div
              key={call._id}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                {call.direction === 'INCOMING' ? (
                  <PhoneIncoming className="h-5 w-5 text-blue-500" />
                ) : (
                  <PhoneOutgoing className="h-5 w-5 text-green-500" />
                )}
                <div>
                  <p className="font-medium">{call.direction} Call</p>
                  <p className="text-sm text-muted-foreground">
                    {call.startedAt
                      ? format(new Date(call.startedAt), 'MMM d, yyyy HH:mm')
                      : 'Unknown time'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    call.status === 'CONNECTED' && 'bg-green-100 text-green-700',
                    call.status === 'MISSED' && 'bg-red-100 text-red-700',
                    call.status === 'FAILED' && 'bg-red-100 text-red-700',
                    !['CONNECTED', 'MISSED', 'FAILED'].includes(call.status) &&
                      'bg-muted text-muted-foreground'
                  )}
                >
                  {call.status}
                </span>
                {call.duration != null && call.duration > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Math.floor(call.duration / 60)}m {call.duration % 60}s
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
