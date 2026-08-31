'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ContactDTO, PaginatedResponse } from '@/types';
import { getInitials } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function ContactsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () =>
      api.get<PaginatedResponse<ContactDTO>>('/contacts', { search: search || undefined }),
  });

  const contacts = data?.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-3 max-w-md"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-center text-muted-foreground">No contacts found</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <div key={contact._id} className="rounded-lg border p-4 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-sm font-semibold text-white">
                    {getInitials(contact.name)}
                  </div>
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
