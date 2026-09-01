'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { TagDTO } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function TagsPage() {
  const [newTag, setNewTag] = useState('');
  const queryClient = useQueryClient();

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<TagDTO[]>('/tags'),
  });

  const createTag = useMutation({
    mutationFn: (name: string) => api.post('/tags', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTag('');
    },
  });

  const deleteTag = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  function handleDelete(tag: TagDTO) {
    const confirmed = window.confirm(
      `Delete tag "${tag.name}"? It will be removed from all conversations.`
    );
    if (!confirmed) return;
    deleteTag.mutate(tag._id);
  }

  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-semibold">Tags</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Tags label conversations (for example Complaint, VIP, Refund). Create, assign, and delete
        tags from here or from the inbox side panel while viewing a chat.
      </p>

      <form
        className="mb-6 flex gap-2 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (newTag.trim()) createTag.mutate(newTag.trim());
        }}
      >
        <Input
          placeholder="New tag name..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
        />
        <Button type="submit" variant="whatsapp" disabled={createTag.isPending}>
          Add Tag
        </Button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(tags ?? []).map((tag) => (
            <span
              key={tag._id}
              className="inline-flex items-center gap-1 rounded-full bg-whatsapp-light pl-3 pr-1 py-1 text-sm font-medium text-whatsapp-dark"
            >
              {tag.name}
              <button
                type="button"
                aria-label={`Delete tag ${tag.name}`}
                disabled={deleteTag.isPending}
                onClick={() => handleDelete(tag)}
                className="rounded-full p-1 hover:bg-whatsapp/20 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
