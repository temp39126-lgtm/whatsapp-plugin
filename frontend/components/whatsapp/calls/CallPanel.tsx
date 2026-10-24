'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Phone, PhoneIncoming, PhoneOutgoing, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { CallDTO, WhatsAppConnectionStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useCallHistory,
  useClearCallHistory,
  useDeleteCallFromHistory,
} from '@/hooks/useCallHistory';

function contactLabel(call: CallDTO): string | undefined {
  const contact = call.contactId;
  if (contact && typeof contact === 'object' && 'name' in contact) {
    return String((contact as { name?: string }).name ?? '').trim() || undefined;
  }
  return undefined;
}

export function CallPanel() {
  const { data: connection } = useQuery({
    queryKey: ['settings-connection'],
    queryFn: () => api.get<WhatsAppConnectionStatus>('/settings/connection'),
  });

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useCallHistory();
  const deleteCall = useDeleteCallFromHistory();
  const clearHistory = useClearCallHistory();

  const calls = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data?.pages]
  );

  const total = data?.pages[0]?.pagination.total ?? calls.length;

  function handleDeleteCall(call: CallDTO) {
    const name = contactLabel(call);
    const label = name ? `${call.direction.toLowerCase()} call with ${name}` : 'this call record';
    if (!window.confirm(`Remove ${label} from history? The chat timeline entry for this call will also be removed.`)) {
      return;
    }

    deleteCall.mutate(call._id, {
      onError: (error) => {
        window.alert(error instanceof Error ? error.message : 'Failed to delete call');
      },
    });
  }

  function handleClearHistory() {
    if (calls.length === 0) return;
    if (
      !window.confirm(
        `Clear all ${total} completed call record${total === 1 ? '' : 's'} from history? Active calls are kept. Chat call markers for removed calls are deleted too.`
      )
    ) {
      return;
    }

    clearHistory.mutate(undefined, {
      onSuccess: (result) => {
        if (result.deleted === 0) {
          window.alert('No completed calls to clear.');
        }
      },
      onError: (error) => {
        window.alert(error instanceof Error ? error.message : 'Failed to clear call history');
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b bg-background/80 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Call History</h1>
            {total > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {total} call{total === 1 ? '' : 's'}
              </p>
            )}
          </div>
          {calls.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={clearHistory.isPending}
              onClick={handleClearHistory}
            >
              {clearHistory.isPending ? 'Clearing...' : 'Clear history'}
            </Button>
          )}
        </div>

        {connection?.callingEnabled ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Voice calling is enabled. Use the phone icon in a 1:1 inbox conversation to start a call.
            Incoming calls appear here when Meta sends webhook events to your callback URL.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Voice calling is disabled on this server. Set{' '}
            <code className="break-all text-xs">CALLING_ENABLED=true</code> in the backend environment
            to enable it.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {calls.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No calls yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              WhatsApp calling requires Meta Business Calling to be enabled
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-6">
            {calls.map((call) => {
              const name = contactLabel(call);
              return (
                <div
                  key={call._id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {call.direction === 'INCOMING' ? (
                      <PhoneIncoming className="h-5 w-5 shrink-0 text-blue-500" />
                    ) : (
                      <PhoneOutgoing className="h-5 w-5 shrink-0 text-green-500" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">
                        {call.direction} Call
                        {name ? ` · ${name}` : ''}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {call.startedAt
                          ? format(new Date(call.startedAt), 'MMM d, yyyy HH:mm')
                          : 'Unknown time'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      disabled={deleteCall.isPending}
                      aria-label="Delete call from history"
                      onClick={() => handleDeleteCall(call)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
