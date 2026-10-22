'use client';

import { Trash2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { useDeleteTeamUser } from '@/hooks/useTeamUsers';

interface DeleteTeamUserButtonProps {
  userId: string;
  userName: string;
  className?: string;
  onDeleted?: () => void;
}

export function DeleteTeamUserButton({
  userId,
  userName,
  className,
  onDeleted,
}: DeleteTeamUserButtonProps) {
  const { user } = useAuth();
  const deleteUser = useDeleteTeamUser();

  if (!user || user.role !== 'ADMIN' || user.userId === userId) {
    return null;
  }

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm(
      `Permanently delete ${userName}? This removes their account from the system. Assigned conversations and contacts will be unassigned. This cannot be undone.`
    );
    if (!confirmed) return;

    deleteUser.mutate(userId, {
      onSuccess: () => onDeleted?.(),
      onError: (error) => {
        window.alert(error instanceof Error ? error.message : 'Failed to delete user');
      },
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className ?? 'text-red-600 hover:bg-red-50 hover:text-red-700'}
      disabled={deleteUser.isPending}
      onClick={handleClick}
      aria-label={`Delete user ${userName}`}
    >
      <Trash2 className="mr-1.5 h-4 w-4" />
      {deleteUser.isPending ? 'Removing...' : 'Delete'}
    </Button>
  );
}
