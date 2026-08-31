'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { useUpdateConversationStatus } from '@/hooks/useConversations';
import type { ConversationDTO, InternalNoteDTO } from '@/types';
import { getInitials } from '@/lib/utils';
import { format } from 'date-fns';

interface CustomerDetailsProps {
  conversation: ConversationDTO | null;
}

export function CustomerDetails({ conversation }: CustomerDetailsProps) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateConversationStatus();

  const { data: notes } = useQuery({
    queryKey: ['notes', conversation?._id],
    queryFn: () => api.get<InternalNoteDTO[]>(`/conversations/${conversation!._id}/notes`),
    enabled: !!conversation?._id,
  });

  const addNote = useMutation({
    mutationFn: (content: string) =>
      api.post(`/conversations/${conversation!._id}/notes`, { content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', conversation?._id] }),
  });

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        Select a conversation to view details
      </div>
    );
  }

  const contact = conversation.contact;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b p-4 text-center">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-whatsapp text-2xl font-semibold text-white">
          {getInitials(contact?.name ?? 'U')}
        </div>
        <h3 className="font-semibold">{contact?.name}</h3>
        <p className="text-sm text-muted-foreground">{contact?.phone}</p>
        <p className="text-xs text-muted-foreground">ID: {contact?.whatsappId}</p>
      </div>

      <div className="space-y-4 p-4">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </h4>
          <div className="flex flex-wrap gap-1">
            {['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].map((status) => (
              <button
                key={status}
                onClick={() => updateStatus.mutate({ id: conversation._id, status })}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  conversation.status === status
                    ? 'bg-whatsapp text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Priority
          </h4>
          <Badge variant={conversation.priority === 'URGENT' ? 'destructive' : 'secondary'}>
            {conversation.priority}
          </Badge>
        </section>

        {conversation.assignedUserId && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assigned Agent
            </h4>
            <p className="text-sm">{conversation.assignedUserId}</p>
          </section>
        )}

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Internal Notes
          </h4>
          <p className="mb-2 text-[10px] text-muted-foreground">
            Notes are never sent to WhatsApp
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('note') as HTMLInputElement;
              if (input.value.trim()) {
                addNote.mutate(input.value.trim());
                input.value = '';
              }
            }}
            className="mb-3 flex gap-2"
          >
            <input
              name="note"
              placeholder="Add internal note..."
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
            <Button type="submit" size="sm" variant="outline">
              Add
            </Button>
          </form>
          <div className="space-y-2">
            {notes?.map((note) => (
              <div key={note._id} className="rounded bg-yellow-50 p-2 text-sm">
                <p>{note.content}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {format(new Date(note.createdAt), 'MMM d, HH:mm')}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
