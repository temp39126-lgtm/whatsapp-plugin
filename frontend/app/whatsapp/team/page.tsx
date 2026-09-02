'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TeamUserDTO } from '@/types';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const createUser = useMutation({
    mutationFn: (payload: { name: string; email: string; password: string }) =>
      api.post<TeamUserDTO>('/team/users', payload),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      queryClient.invalidateQueries({ queryKey: ['team-workload'] });
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

  return (
    <div className="overflow-y-auto p-4 sm:p-6">
      <div className="mb-6">
        <Link
          href="/whatsapp/admin"
          className="mb-3 inline-flex items-center gap-1 text-sm text-whatsapp-dark hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Team Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create new agent accounts here. View agents and assigned conversation counts on the{' '}
          <Link href="/whatsapp/admin" className="text-whatsapp-dark hover:underline">
            admin dashboard
          </Link>
          .
        </p>
      </div>

      <section className="max-w-3xl rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-whatsapp" />
          <h2 className="text-lg font-semibold">Create agent account</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          New agents can also sign up at <code className="text-xs">/auth/signup</code>. Use this
          form when you want to create their account directly.
        </p>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <Button
            type="submit"
            variant="whatsapp"
            disabled={createUser.isPending}
            className="w-full sm:w-auto xl:col-span-1"
          >
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
    </div>
  );
}
