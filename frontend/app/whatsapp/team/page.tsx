'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInitials } from '@/lib/utils';
import type { TeamAgentWorkloadDTO, TeamUserDTO } from '@/types';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const { data: teamUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['team-users'],
    queryFn: () => api.get<TeamUserDTO[]>('/team/users'),
  });

  const { data: workload = [], isLoading: isLoadingWorkload } = useQuery({
    queryKey: ['team-workload'],
    queryFn: () => api.get<TeamAgentWorkloadDTO[]>('/team/workload'),
  });

  const createUser = useMutation({
    mutationFn: (payload: { name: string; email: string; password: string }) =>
      api.post<TeamUserDTO>('/team/users', payload),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      setName('');
      setEmail('');
      setPassword('');
      setMessage(`Created agent account for ${user.name}. Assign chats from the inbox.`);
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to create user'),
  });

  function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    createUser.mutate({ name: name.trim(), email: email.trim(), password });
  }

  const isLoading = isLoadingUsers || isLoadingWorkload;

  return (
    <div className="overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Team Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create agent accounts and review workload across your team.
        </p>
      </div>

      <section className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-whatsapp" />
          <h2 className="text-lg font-semibold">Create agent account</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          New agents can also sign up at <code className="text-xs">/auth/signup</code>. Use this
          form when you want to create their account directly.
        </p>
        <form onSubmit={handleCreateUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
          />
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Temporary password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
          <Button type="submit" variant="whatsapp" disabled={createUser.isPending}>
            {createUser.isPending ? 'Creating...' : 'Create user'}
          </Button>
        </form>
        {message && (
          <p
            className={`mt-3 text-sm ${
              createUser.isError ? 'text-red-600' : 'text-whatsapp-dark'
            }`}
          >
            {message}
          </p>
        )}
      </section>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Team members ({teamUsers.length})</h2>
            <div className="rounded-xl border bg-card shadow-sm">
              {teamUsers.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No team members yet</p>
              ) : (
                <div className="divide-y">
                  {teamUsers.map((member) => (
                    <Link
                      key={member._id}
                      href={`/whatsapp/team/${member._id}`}
                      className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-whatsapp text-sm font-semibold text-white">
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {member.role === 'ADMIN' ? 'Admin' : 'Agent'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Agent workload</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              All team members are listed here. Counts stay at 0 until chats are assigned in the
              inbox.
            </p>
            <div className="rounded-xl border bg-card shadow-sm">
              {workload.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No team members yet</p>
              ) : (
                <div className="divide-y">
                  {workload.map((agent) => (
                    <Link
                      key={agent._id}
                      href={`/whatsapp/team/${agent._id}`}
                      className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-whatsapp text-sm font-semibold text-white">
                          {getInitials(agent.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{agent.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{agent.email}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-sm text-muted-foreground">
                        <p>{agent.open} open</p>
                        <p>{agent.pending} pending</p>
                        <p className="font-medium text-foreground">{agent.total} total</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
