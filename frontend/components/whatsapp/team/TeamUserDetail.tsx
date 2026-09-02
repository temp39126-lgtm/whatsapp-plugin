'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Inbox, Mail, Shield, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { buildInboxHref } from '@/lib/inbox-filters';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { useConversations } from '@/hooks/useConversations';
import type { TeamAgentWorkloadDTO, TeamUserDTO } from '@/types';

interface TeamUserDetailProps {
  userId: string;
  backHref?: string;
  backLabel?: string;
}

export function TeamUserDetail({
  userId,
  backHref = '/whatsapp/admin',
  backLabel = 'Back to dashboard',
}: TeamUserDetailProps) {
  const { data: teamUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['team-users'],
    queryFn: () => api.get<TeamUserDTO[]>('/team/users'),
  });

  const { data: workload = [], isLoading: isLoadingWorkload } = useQuery({
    queryKey: ['team-workload'],
    queryFn: () => api.get<TeamAgentWorkloadDTO[]>('/team/workload'),
  });

  const { data: assignedConversations, isLoading: isLoadingConversations } = useConversations({
    assignedUserId: userId,
    limit: 20,
  });

  const user = teamUsers.find((member) => member._id === userId);
  const stats = workload.find((entry) => entry._id === userId);
  const conversations = assignedConversations?.data ?? [];

  if (isLoadingUsers || isLoadingWorkload) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-whatsapp-dark hover:underline">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <p className="mt-6 text-muted-foreground">User not found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-6">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-whatsapp-dark hover:underline">
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <ProfileAvatar name={user.name} imageUrl={user.profileImage} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">{user.name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {user.role === 'ADMIN' ? (
                <>
                  <Shield className="h-3 w-3" />
                  Admin
                </>
              ) : (
                <>
                  <User className="h-3 w-3" />
                  User
                </>
              )}
            </span>
          </div>
          <Link
            href={buildInboxHref({ assignedUserId: userId })}
            className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-4 py-2 text-sm font-medium text-white hover:bg-whatsapp-dark"
          >
            <Inbox className="h-4 w-4" />
            View assigned chats
          </Link>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Workload</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total assigned</p>
            <p className="mt-2 text-3xl font-bold">{stats?.total ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="mt-2 text-3xl font-bold">{stats?.open ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="mt-2 text-3xl font-bold">{stats?.pending ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="mt-2 text-xl font-semibold">{user.role === 'ADMIN' ? 'Admin' : 'User'}</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Assigned conversations</h2>
          <span className="text-sm text-muted-foreground">{conversations.length} shown</span>
        </div>
        <div className="rounded-xl border bg-card shadow-sm">
          {isLoadingConversations ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No conversations assigned to this user yet.
            </p>
          ) : (
            <div className="divide-y">
              {conversations.map((conversation) => {
                const label =
                  conversation.group?.name ?? conversation.contact?.name ?? 'Unknown conversation';
                return (
                  <Link
                    key={conversation._id}
                    href={buildInboxHref({ assignedUserId: userId }, conversation._id)}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{label}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {conversation.lastMessage ?? 'No messages'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {conversation.status}
                      </span>
                      {conversation.lastMessageAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
