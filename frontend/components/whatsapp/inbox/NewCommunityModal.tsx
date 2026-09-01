'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCommunities, useCreateCommunity, useGroups } from '@/hooks/useGroups';
import { cn } from '@/lib/utils';

interface NewCommunityModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function NewCommunityModal({ open, onClose, onSuccess }: NewCommunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const createCommunity = useCreateCommunity();
  const { data: groups = [], isLoading: groupsLoading } = useGroups(open);
  const { data: communities = [] } = useCommunities(open);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setSelectedGroupIds([]);
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

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a community name');
      return;
    }

    createCommunity.mutate(
      {
        name: trimmedName,
        description: description.trim() || undefined,
        groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
      },
      {
        onSuccess: (community) => {
          onSuccess(`Community "${community.name}" created`);
          onClose();
        },
        onError: (mutationError) => {
          setError(
            mutationError instanceof Error ? mutationError.message : 'Failed to create community'
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
        aria-labelledby="new-community-title"
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg bg-background shadow-xl"
      >
        <div className="border-b px-4 py-3">
          <h2 id="new-community-title" className="text-lg font-semibold">
            New community
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto p-4">
            <div>
              <label htmlFor="community-name" className="mb-1 block text-sm font-medium">
                Community name
              </label>
              <Input
                id="community-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter community name"
                maxLength={100}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="community-description" className="mb-1 block text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="community-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this community about?"
                maxLength={500}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Add groups (optional)</p>
              <div className="max-h-40 overflow-y-auto rounded border">
                {groupsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
                  </div>
                ) : groups.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    No groups yet. Create a group first to add it here.
                  </p>
                ) : (
                  groups.map((group) => {
                    const selected = selectedGroupIds.includes(group._id);
                    return (
                      <button
                        key={group._id}
                        type="button"
                        onClick={() => toggleGroup(group._id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50',
                          selected && 'bg-whatsapp-light'
                        )}
                      >
                        <span className="truncate text-sm font-medium">{group.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {group.contactIds.length} members
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {communities.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Existing communities
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {communities.slice(0, 3).map((community) => (
                    <li key={community._id}>• {community.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createCommunity.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCommunity.isPending}>
              {createCommunity.isPending ? 'Creating...' : 'Create community'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
