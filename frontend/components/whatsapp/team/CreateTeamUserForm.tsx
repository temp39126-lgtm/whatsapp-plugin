'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Eye, EyeOff, UserCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TeamUserDTO } from '@/types';
import type { Permission } from '@shared/constants/permissions';
import { TeamUserPermissionPicker } from '@/components/whatsapp/team/TeamUserPermissionPicker';
import { cn } from '@/lib/utils';

type CreateTeamUserFormProps = {
  layout?: 'embedded' | 'page';
};

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export function CreateTeamUserForm({ layout = 'embedded' }: CreateTeamUserFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [message, setMessage] = useState('');

  const createUser = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      password: string;
      permissions: Permission[];
    }) => api.post<TeamUserDTO>('/team/users', payload),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      queryClient.invalidateQueries({ queryKey: ['team-workload'] });
      setName('');
      setEmail('');
      setPassword('');
      setPermissions([]);
      const emailNote =
        user.welcomeEmailSent === true
          ? `A welcome email with login details was sent to ${user.email}.`
          : user.welcomeEmailSent === false
            ? `User created, but the welcome email could not be sent. Check SMTP in Settings and share login details manually.`
            : '';
      setMessage(
        [`Created user account for ${user.name}. Assign chats from the inbox.`, emailNote]
          .filter(Boolean)
          .join(' ')
      );
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to create user'),
  });

  function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');

    createUser.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      permissions,
    });
  }

  const pageLayout = layout === 'page';

  const formBody = (
    <form onSubmit={handleCreateUser} className="space-y-6">
      <div
        className={cn(
          pageLayout
            ? 'grid gap-6 xl:grid-cols-2 xl:items-start'
            : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'
        )}
      >
        {pageLayout ? (
          <>
            <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-whatsapp" />
                <h2 className="text-lg font-semibold">General Information</h2>
              </div>
              <GeneralInformationFields
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                pageLayout
              />
              <div className="mt-6">
                <Button
                  type="submit"
                  variant="whatsapp"
                  disabled={createUser.isPending}
                  className="w-full sm:w-auto"
                >
                  {createUser.isPending ? 'Creating…' : 'Create user'}
                </Button>
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">User Settings</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                New accounts are created active and can sign in immediately.
              </p>
              <div className="mt-5">
                <TeamUserPermissionPicker value={permissions} onChange={setPermissions} />
              </div>
            </section>
          </>
        ) : (
          <>
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
              minLength={8}
            />
            <Button
              type="submit"
              variant="whatsapp"
              disabled={createUser.isPending}
              className="w-full sm:w-auto xl:col-span-1"
            >
              {createUser.isPending ? 'Creating...' : 'Create user'}
            </Button>
          </>
        )}
      </div>

      {!pageLayout ? (
        <TeamUserPermissionPicker value={permissions} onChange={setPermissions} />
      ) : null}

      {message ? (
        <p
          className={cn(
            'text-sm',
            createUser.isError ? 'text-red-600' : 'text-whatsapp-dark'
          )}
        >
          {message}
        </p>
      ) : pageLayout ? (
        <p className="text-xs text-muted-foreground">
          Public sign-up is disabled. When SMTP is configured, a welcome email is sent with login
          details.
        </p>
      ) : null}
    </form>
  );

  if (pageLayout) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Add New User</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a team member account and set their access.
          </p>
        </div>
        {formBody}
      </div>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <UserCircle2 className="h-5 w-5 text-whatsapp" />
        <h2 className="text-lg font-semibold">Create user account</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Public sign-up is disabled. Create every user account here. When SMTP notifications are
        configured, a welcome email is sent with the login link, email, and temporary password.
      </p>
      {formBody}
    </section>
  );
}

function GeneralInformationFields({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  pageLayout,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  pageLayout: boolean;
}) {
  const fields = (
    <>
      <FormField label="Name" required>
        <Input
          placeholder="John Doe"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
        />
      </FormField>
      <FormField label="Email ID" required>
        <Input
          type="email"
          placeholder="john@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </FormField>
    </>
  );

  const passwordField = (
    <FormField label="Account Password" required>
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder="Min. 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  );

  if (!pageLayout) {
    return (
      <>
        {fields}
        {passwordField}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">{fields}</div>
      {passwordField}
    </div>
  );
}