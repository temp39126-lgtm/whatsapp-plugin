'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WhatsAppConnectionStatus } from '@/types';
import { cn } from '@/lib/utils';
import { ConversationFilters } from '@/components/whatsapp/inbox/ConversationFilters';
import { ConversationList } from '@/components/whatsapp/inbox/ConversationList';
import { WhatsAppOverflowMenu } from '@/components/whatsapp/inbox/WhatsAppOverflowMenu';
import { ChatWindow } from '@/components/whatsapp/chat/ChatWindow';
import { CustomerDetails } from '@/components/whatsapp/CustomerDetails';
import { useConversation, useConversations } from '@/hooks/useConversations';
import { useOutboundCall } from '@/hooks/useOutboundCall';
import { ActiveCallBar } from '@/components/whatsapp/calls/ActiveCallBar';
import { inboxFiltersFromSearchParams } from '@/lib/inbox-filters';

function InboxLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
    </div>
  );
}

function InboxPageContent() {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const urlFilters = inboxFiltersFromSearchParams(searchParams);

  const [filters, setFilters] = useState<Record<string, string | boolean | undefined>>(urlFilters);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('conversation'));

  useEffect(() => {
    setFilters(inboxFiltersFromSearchParams(searchParams));
    setSelectedId(searchParams.get('conversation'));
  }, [searchKey, searchParams]);

  const { data, isLoading } = useConversations(filters);
  const { data: selectedConversation } = useConversation(selectedId);
  const { data: connection } = useQuery({
    queryKey: ['settings-connection'],
    queryFn: () => api.get<WhatsAppConnectionStatus>('/settings/connection'),
  });
  const outboundCall = useOutboundCall();
  const conversations = data?.data ?? [];
  const selected = selectedConversation ?? conversations.find((c) => c._id === selectedId) ?? null;

  return (
    <div className="flex h-full min-w-0">
      <div
        className={cn(
          'flex min-w-0 flex-col border-r bg-background md:w-80 md:shrink-0 lg:w-96',
          selectedId ? 'hidden md:flex' : 'flex w-full'
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Inbox</h1>
          <WhatsAppOverflowMenu />
        </div>
        <ConversationFilters filters={filters} onChange={setFilters} />
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          isLoading={isLoading}
        />
      </div>

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          selectedId ? 'flex w-full' : 'hidden md:flex'
        )}
      >
        {outboundCall.activeCall && selected && (
          <ActiveCallBar
            call={outboundCall.activeCall}
            contactName={selected.contact?.name}
            onEnd={() => outboundCall.endCall(outboundCall.activeCall!._id)}
          />
        )}

        <ChatWindow
          conversation={selected}
          onBack={selectedId ? () => setSelectedId(null) : undefined}
          onStartCall={
            connection?.callingEnabled && selected && !selected.group
              ? () => {
                  outboundCall.setError('');
                  outboundCall.startCall(selected._id).catch(() => undefined);
                }
              : undefined
          }
          callDisabled={outboundCall.isStarting || Boolean(outboundCall.activeCall)}
        />
      </div>

      {outboundCall.error && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-background px-4 py-3 text-sm shadow-lg">
          {outboundCall.error}
        </div>
      )}

      <div className="hidden w-80 shrink-0 border-l bg-background xl:block">
        <CustomerDetails
          conversation={selected}
          onDeleted={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxLoading />}>
      <InboxPageContent />
    </Suspense>
  );
}
