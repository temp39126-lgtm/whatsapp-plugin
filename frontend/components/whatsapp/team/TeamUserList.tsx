'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { DeleteTeamUserButton } from '@/components/whatsapp/team/DeleteTeamUserButton';
import type { TeamAgentWorkloadDTO } from '@/types';

export function TeamUserList() {
  const { data: teamWorkload, isLoading } = useQuery({
    queryKey: ['team-workload'],
    queryFn: () => api.get<TeamAgentWorkloadDTO[]>('/team/workload'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  const users = teamWorkload ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">User List</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team members for this workspace. Open a user to edit permissions.
          </p>
        </div>
        <Link
          href="/whatsapp/team/new"
          className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-4 py-2 text-sm font-medium text-white hover:bg-whatsapp-dark"
        >
          <UserPlus className="h-4 w-4" />
          Add New User
        </Link>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {users.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No users yet.{' '}
            <Link href="/whatsapp/team/new" className="text-whatsapp-dark hover:underline">
              Add your first user
            </Link>
            .
          </p>
        ) : (
          <div className="divide-y">
            {users.map((teamUser) => (
              <div
                key={teamUser._id}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                <Link
                  href={`/whatsapp/team/${teamUser._id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <ProfileAvatar
                    name={teamUser.name}
                    imageUrl={teamUser.profileImage}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{teamUser.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{teamUser.email}</p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="hidden text-right text-sm text-muted-foreground sm:block">
                    <p>
                      <span className="font-medium text-foreground">{teamUser.assignedByAdmin}</span>{' '}
                      assigned by admin
                    </p>
                    <p className="text-xs">{teamUser.total} total</p>
                  </div>
                  <DeleteTeamUserButton userId={teamUser._id} userName={teamUser.name} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}