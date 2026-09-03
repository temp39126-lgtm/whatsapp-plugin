'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { MessageCircle, Trash2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import {
  useCreateContact,
  useDeleteContact,
  useOpenContactConversation,
  useUploadContactAvatar,
} from '@/hooks/useContacts';
import type { ContactDTO, PaginatedResponse } from '@/types';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';

export default function ContactsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [openingContactId, setOpeningContactId] = useState<string | null>(null);
  const deleteContact = useDeleteContact();
  const createContact = useCreateContact();
  const openContactConversation = useOpenContactConversation();
  const uploadContactAvatar = useUploadContactAvatar();

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () =>
      api.get<PaginatedResponse<ContactDTO>>('/contacts', { search: search || undefined }),
  });

  const contacts = data?.data ?? [];

  function handleMessage(contact: ContactDTO) {
    setOpeningContactId(contact._id);
    openContactConversation.mutate(contact._id, {
      onSuccess: ({ conversationId }) => {
        router.push(`/whatsapp/inbox?conversation=${conversationId}`);
      },
      onError: (error) => {
        setMessage(error instanceof Error ? error.message : 'Failed to open conversation');
      },
      onSettled: () => setOpeningContactId(null),
    });
  }

  function handleDelete(contact: ContactDTO) {
    const confirmed = window.confirm(
      `Delete contact "${contact.name}"? This removes their conversations and messages from the CRM.`
    );
    if (!confirmed) return;
    deleteContact.mutate(contact._id);
  }

  function handleCreateContact(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    createContact.mutate(
      { name: name.trim(), phone: phone.trim() },
      {
        onSuccess: (contact) => {
          setName('');
          setPhone('');
          setMessage(`Saved contact "${contact.name}"`);
        },
        onError: (error) =>
          setMessage(error instanceof Error ? error.message : 'Failed to save contact'),
      }
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-b px-4 py-4 sm:px-6">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? 'Add a customer by name and phone number. Upload a photo with the camera icon.'
            : 'Add customer contacts by name and phone number.'}
        </p>

        <form
          onSubmit={handleCreateContact}
          className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <Input
            placeholder="Contact name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={1}
          />
          <Input
            placeholder="Phone number (e.g. +15551234567)"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            minLength={8}
          />
          <Button type="submit" variant="whatsapp" disabled={createContact.isPending}>
            <UserPlus className="mr-2 h-4 w-4" />
            {createContact.isPending ? 'Saving...' : 'Save contact'}
          </Button>
        </form>
        {message && (
          <p
            className={`mt-2 text-sm ${
              createContact.isError ? 'text-red-600' : 'text-whatsapp-dark'
            }`}
          >
            {message}
          </p>
        )}

        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-3 max-w-md"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                    <p className="truncate font-medium">{contact.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{contact.phone}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="whatsapp"
                        size="sm"
                        disabled={openingContactId === contact._id}
                        onClick={() => handleMessage(contact)}
                      >
                        <MessageCircle className="mr-1 h-4 w-4" />
                        {openingContactId === contact._id ? 'Opening...' : 'Message'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={deleteContact.isPending}
                        onClick={() => handleDelete(contact)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
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
