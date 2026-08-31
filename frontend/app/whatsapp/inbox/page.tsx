'use client';

import { useState } from 'react';
import { ConversationFilters } from '@/components/whatsapp/inbox/ConversationFilters';
import { ConversationList } from '@/components/whatsapp/inbox/ConversationList';
import { ChatWindow } from '@/components/whatsapp/chat/ChatWindow';
import { CustomerDetails } from '@/components/whatsapp/CustomerDetails';
import { useConversations } from '@/hooks/useConversations';
import type { ConversationDTO } from '@/types';

export default function InboxPage() {
  const [filters, setFilters] = useState<Record<string, string | boolean | undefined>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useConversations(filters);
  const conversations = data?.data ?? [];
  const selected = conversations.find((c) => c._id === selectedId) ?? null;

  return (
    <div className="flex h-full">
      <div className="flex w-80 shrink-0 flex-col border-r bg-background lg:w-96">
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Inbox</h1>
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
        <CustomerDetails conversation={selected} />
      </div>
    </div>
  );
}
