'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Eye, EyeOff, UserCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TeamUserDTO } from '@/types';
import type { Permission } from '@shared/constants/permissions';
import { TeamUserPermissionPicker } from '@/components/whatsapp/team/TeamUserPermissionPicker';
import {
  TEAM_USER_ROLE_PRESETS,
  permissionsForPreset,
  type TeamUserRolePresetId,
} from '@/lib/team-user-role-presets';
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

function ActiveToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-whatsapp' : 'bg-muted-foreground/30',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export function CreateTeamUserForm({ layout = 'embedded' }: CreateTeamUserFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rolePreset, setRolePreset] = useState<TeamUserRolePresetId>('agent');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [active, setActive] = useState(true);
  const [message, setMessage] = useState('');

  const isCustomRole = rolePreset === 'custom';

  const effectivePermissions = useMemo(() => {
    if (isCustomRole) return permissions;
    return permissionsForPreset(rolePreset);
  }, [isCustomRole, permissions, rolePreset]);

  function handleRoleChange(next: TeamUserRolePresetId) {
    setRolePreset(next);
    if (next !== 'custom') {
      setPermissions(permissionsForPreset(next));
    }
  }

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
      setRolePreset('agent');
      setPermissions([]);
      setActive(true);
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

    if (!active) {
      setMessage('Turn on Active to create this account.');
      return;
    }

    createUser.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      permissions: effectivePermissions,
    });
  }

  const pageLayout = layout === 'page';

  const formBody = (
    <form onSubmit={handleCreateUser} className="space-y-6">
      <div
        className={cn(
          pageLayout
            ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start'
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

              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">User Role</p>
                      <p className="text-xs text-muted-foreground">Assign permissions based on role</p>
                    </div>
                  </div>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp/40"
                    value={rolePreset}
                    onChange={(event) =>
                      handleRoleChange(event.target.value as TeamUserRolePresetId)
                    }
                  >
                    {TEAM_USER_ROLE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label} — {preset.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-3">
                  <div>
                    <p className="text-sm font-medium">Active Status</p>
                    <p className="text-xs text-muted-foreground">Allow access to this account</p>
                  </div>
                  <ActiveToggle checked={active} onChange={setActive} />
                </div>
              </div>

              {isCustomRole ? (
                <div className="mt-5">
                  <TeamUserPermissionPicker value={permissions} onChange={setPermissions} />
                </div>
              ) : null}
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
            createUser.isError || message.startsWith('Turn on')
              ? 'text-red-600'
              : 'text-whatsapp-dark'
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