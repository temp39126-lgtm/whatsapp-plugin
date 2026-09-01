'use client';

import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { useDeleteContact, useUploadContactAvatar } from '@/hooks/useContacts';
import type { ContactDTO, PaginatedResponse } from '@/types';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';

export default function ContactsPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const deleteContact = useDeleteContact();
  const uploadContactAvatar = useUploadContactAvatar();

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () =>
      api.get<PaginatedResponse<ContactDTO>>('/contacts', { search: search || undefined }),
  });

  const contacts = data?.data ?? [];

  function handleDelete(contact: ContactDTO) {
    const confirmed = window.confirm(
      `Delete contact "${contact.name}"? This removes their conversations and messages from the CRM.`
    );
    if (!confirmed) return;
    deleteContact.mutate(contact._id);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? 'Upload a photo with the camera icon. Delete removes the contact and related CRM data.'
            : 'View customer details. Only admins can change contact photos or delete contacts.'}
        </p>
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
                <div className="flex items-start gap-3">
                  <ProfileAvatar
                    name={contact.name}
                    imageUrl={
                      contact.profileImage
                        ? `/api/whatsapp/contacts/${contact._id}/avatar`
                        : undefined
                    }
                    size="md"
                    editable={isAdmin}
                    uploading={uploadContactAvatar.isPending}
                    onUpload={(file) =>
                      uploadContactAvatar.mutate({ contactId: contact._id, file })
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={deleteContact.isPending}
                      onClick={() => handleDelete(contact)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
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
