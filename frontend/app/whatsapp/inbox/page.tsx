'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConversationFilters } from '@/components/whatsapp/inbox/ConversationFilters';
import { ConversationList } from '@/components/whatsapp/inbox/ConversationList';
import { WhatsAppOverflowMenu } from '@/components/whatsapp/inbox/WhatsAppOverflowMenu';
import { ChatWindow } from '@/components/whatsapp/chat/ChatWindow';
import { CustomerDetails } from '@/components/whatsapp/CustomerDetails';
import { useConversation, useConversations } from '@/hooks/useConversations';
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
  const conversations = data?.data ?? [];
  const selected = selectedConversation ?? conversations.find((c) => c._id === selectedId) ?? null;

  return (
    <div className="flex h-full">
      <div className="flex w-80 shrink-0 flex-col border-r bg-background lg:w-96">
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

      <ChatWindow conversation={selected} />

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
