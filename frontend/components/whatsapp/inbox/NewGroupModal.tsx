'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateGroup } from '@/hooks/useGroups';
import { api } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';
import type { ContactDTO, PaginatedResponse } from '@/types';

interface NewGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function NewGroupModal({ open, onClose, onSuccess }: NewGroupModalProps) {
  const [name, setName] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const createGroup = useCreateGroup();

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', 'group-picker'],
    queryFn: () => api.get<PaginatedResponse<ContactDTO>>('/contacts', { limit: 100 }),
    enabled: open,
  });

  const contacts = data?.data ?? [];

  useEffect(() => {
    if (!open) return;
    setName('');
    setSelectedContactIds([]);
    setError('');
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  function toggleContact(contactId: string) {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId]
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a group name');
      return;
    }

    if (selectedContactIds.length === 0) {
      setError('Select at least one contact');
      return;
    }

    createGroup.mutate(
      { name: trimmedName, contactIds: selectedContactIds },
      {
        onSuccess: (group) => {
          onSuccess(`Group "${group.name}" created`);
          onClose();
        },
        onError: (mutationError) => {
          setError(
            mutationError instanceof Error ? mutationError.message : 'Failed to create group'
          );
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-group-title"
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg bg-background shadow-xl"
      >
        <div className="border-b px-4 py-3">
          <h2 id="new-group-title" className="text-lg font-semibold">
            New group
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 p-4">
            <div>
              <label htmlFor="group-name" className="mb-1 block text-sm font-medium">
                Group name
              </label>
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter group name"
                maxLength={100}
                autoFocus
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Select contacts</p>
              <div className="max-h-56 overflow-y-auto rounded border">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
                  </div>
                ) : contacts.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No contacts available</p>
                ) : (
                  contacts.map((contact) => {
                    const selected = selectedContactIds.includes(contact._id);
                    return (
                      <button
                        key={contact._id}
                        type="button"
                        onClick={() => toggleContact(contact._id)}
                        className={cn(
                          'flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50',
                          selected && 'bg-whatsapp-light'
                        )}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-whatsapp text-xs font-semibold text-white">
                          {getInitials(contact.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{contact.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{contact.phone}</p>
                        </div>
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                            selected && 'border-whatsapp bg-whatsapp text-white'
                          )}
                        >
                          {selected ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={createGroup.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGroup.isPending}>
              {createGroup.isPending ? 'Creating...' : 'Create group'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
