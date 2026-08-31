'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TagDTO } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';

export default function TagsPage() {
  const { isAdmin } = useAuth();
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

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Tags</h1>

      {isAdmin && (
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
          <Button type="submit" variant="whatsapp">
            Add Tag
          </Button>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(tags ?? []).map((tag) => (
            <span
              key={tag._id}
              className="rounded-full bg-whatsapp-light px-3 py-1 text-sm font-medium text-whatsapp-dark"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
