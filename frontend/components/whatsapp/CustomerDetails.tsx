'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  useAssignConversation,
  useCreateTag,
  useTags,
  useTeamUsers,
  useUpdateConversationPriority,
  useUpdateConversationStatus,
  useUpdateConversationTags,
} from '@/hooks/useConversations';
import { useDeleteContact, useUploadContactAvatar } from '@/hooks/useContacts';
import { useDeleteGroup, useUploadGroupAvatar } from '@/hooks/useGroups';
import type { ConversationDTO, InternalNoteDTO } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CustomerDetailsProps {
  conversation: ConversationDTO | null;
  onDeleted?: () => void;
}

const statuses = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] as const;
const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

export function CustomerDetails({ conversation, onDeleted }: CustomerDetailsProps) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showMembers, setShowMembers] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const updateStatus = useUpdateConversationStatus();
  const updatePriority = useUpdateConversationPriority();
  const updateTags = useUpdateConversationTags();
  const assignConversation = useAssignConversation();
  const deleteContact = useDeleteContact();
  const deleteGroup = useDeleteGroup();
  const uploadContactAvatar = useUploadContactAvatar();
  const uploadGroupAvatar = useUploadGroupAvatar();
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const { data: teamUsers = [] } = useTeamUsers(isAdmin);

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
  const group = conversation.group;
  const isGroup = Boolean(group);
  const displayName = group?.name ?? contact?.name ?? 'Unknown';
  const selectedTagIds = conversation.tags.map((tag) => tag._id);
  const isDeleting = deleteContact.isPending || deleteGroup.isPending;
  const isUploading = uploadContactAvatar.isPending || uploadGroupAvatar.isPending;

  function toggleTag(tagId: string) {
    const nextTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];

    updateTags.mutate({ id: conversation!._id, tagIds: nextTagIds });
  }

  function handleCreateTag(event: React.FormEvent) {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name) return;

    createTag.mutate(name, {
      onSuccess: (tag) => {
        setNewTagName('');
        updateTags.mutate({ id: conversation!._id, tagIds: [...selectedTagIds, tag._id] });
        setActionMessage(`Tag "${tag.name}" created and applied`);
      },
      onError: (error) => {
        setActionMessage(error instanceof Error ? error.message : 'Failed to create tag');
      },
    });
  }

  function handleAvatarUpload(file: File) {
    if (isGroup && group) {
      uploadGroupAvatar.mutate(
        { groupId: group._id, file },
        {
          onSuccess: () => setActionMessage('Group photo updated'),
          onError: (error) =>
            setActionMessage(error instanceof Error ? error.message : 'Upload failed'),
        }
      );
      return;
    }

    if (contact?._id) {
      uploadContactAvatar.mutate(
        { contactId: contact._id, file },
        {
          onSuccess: () => setActionMessage('Profile photo updated'),
          onError: (error) =>
            setActionMessage(error instanceof Error ? error.message : 'Upload failed'),
        }
      );
    }
  }

  function handleDelete() {
    if (isGroup && group) {
      const confirmed = window.confirm(
        `Delete group "${group.name}"? This removes the group and its inbox conversation.`
      );
      if (!confirmed) return;

      deleteGroup.mutate(group._id, {
        onSuccess: () => {
          onDeleted?.();
          setActionMessage('Group deleted');
        },
        onError: (error) =>
          setActionMessage(error instanceof Error ? error.message : 'Failed to delete group'),
      });
      return;
    }

    if (contact?._id) {
      const confirmed = window.confirm(
        `Delete contact "${contact.name}"? This removes their conversations and messages from the CRM.`
      );
      if (!confirmed) return;

      deleteContact.mutate(contact._id, {
        onSuccess: () => {
          onDeleted?.();
          setActionMessage('Contact deleted');
        },
        onError: (error) =>
          setActionMessage(error instanceof Error ? error.message : 'Failed to delete contact'),
      });
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b p-4 text-center">
        <div className="mx-auto mb-3 flex justify-center">
          <ProfileAvatar
            name={displayName}
            imageUrl={group?.profileImage ?? contact?.profileImage}
            size="lg"
            isGroup={isGroup}
            editable
            uploading={isUploading}
            onUpload={handleAvatarUpload}
          />
        </div>
        <h3 className="font-semibold">{displayName}</h3>
        {isGroup ? (
          <p className="text-sm text-muted-foreground">{group?.memberCount ?? 0} participants</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{contact?.phone}</p>
            <p className="text-xs text-muted-foreground">ID: {contact?.whatsappId}</p>
          </>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={isDeleting || (!isGroup && !contact?._id)}
          onClick={handleDelete}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {isDeleting ? 'Deleting...' : isGroup ? 'Delete group' : 'Delete contact'}
        </Button>

        {actionMessage && (
          <p className="mt-2 text-xs text-muted-foreground">{actionMessage}</p>
        )}
      </div>

      {isGroup && group?.members && group.members.length > 0 && (
        <section className="border-b p-4">
          <button
            type="button"
            onClick={() => setShowMembers((current) => !current)}
            className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <span>Group members ({group.members.length})</span>
            {showMembers ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showMembers && (
            <div className="space-y-2">
              {group.members.map((member) => (
                <div key={member._id} className="flex items-center gap-3 rounded-lg border p-2">
                  <ProfileAvatar
                    name={member.name}
                    imageUrl={member.profileImage}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="space-y-4 p-4">
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </h4>
          <p className="mb-2 text-[10px] text-muted-foreground">
            Status values are fixed. Click tags below to assign them to this conversation.
          </p>
          <div className="flex flex-wrap gap-1">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => updateStatus.mutate({ id: conversation._id, status })}
                disabled={updateStatus.isPending}
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs transition-colors',
                  conversation.status === status
                    ? 'bg-whatsapp text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
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
          <div className="flex flex-wrap gap-1">
            {priorities.map((priority) => (
              <button
                key={priority}
                onClick={() => updatePriority.mutate({ id: conversation._id, priority })}
                disabled={updatePriority.isPending}
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs transition-colors',
                  conversation.priority === priority
                    ? priority === 'URGENT'
                      ? 'bg-red-600 text-white'
                      : 'bg-whatsapp text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {priority}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tags
          </h4>
          <p className="mb-2 text-[10px] text-muted-foreground">
            {isAdmin
              ? 'Create a new tag below or open the Tags page to manage all tags.'
              : 'Tags are created by admins. Click a tag to assign it to this chat.'}{' '}
            <Link href="/whatsapp/tags" className="text-whatsapp underline">
              Tags page
            </Link>
          </p>
          {isAdmin && (
            <form onSubmit={handleCreateTag} className="mb-2 flex gap-2">
              <Input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="New tag name..."
                className="h-8 text-sm"
                maxLength={50}
              />
              <Button type="submit" size="sm" variant="whatsapp" disabled={createTag.isPending}>
                {createTag.isPending ? 'Adding...' : 'Create'}
              </Button>
            </form>
          )}
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag._id);
              return (
                <button
                  key={tag._id}
                  type="button"
                  onClick={() => toggleTag(tag._id)}
                  disabled={updateTags.isPending}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs transition-colors',
                    selected
                      ? 'bg-whatsapp text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Assigned Agent
          </h4>
          {isAdmin ? (
            <select
              value={conversation.assignedUserId ?? ''}
              onChange={(event) => {
                if (!event.target.value) return;
                assignConversation.mutate({
                  id: conversation._id,
                  assignedUserId: event.target.value,
                });
              }}
              className="w-full rounded border px-2 py-1.5 text-sm"
            >
              {!conversation.assignedUserId && <option value="">Unassigned</option>}
              {teamUsers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.role === 'ADMIN' ? 'Admin' : 'User'})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm">{conversation.assignedUser?.name ?? 'Unassigned'}</p>
          )}
        </section>

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
            <Button type="submit" size="sm" variant="outline" disabled={addNote.isPending}>
              Add
            </Button>
          </form>
          <div className="space-y-2">
            {notes?.map((note) => (
              <div key={note._id} className="rounded bg-yellow-50 p-2 text-sm">
                <p>{note.content}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {note.author?.name ?? 'Agent'} · {format(new Date(note.createdAt), 'MMM d, HH:mm')}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
