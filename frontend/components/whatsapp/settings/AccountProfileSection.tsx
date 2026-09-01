'use client';

import { useEffect, useState } from 'react';
import { Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { useAuth } from '@/components/AuthProvider';
import { useUpdateProfile, useUploadProfileAvatar } from '@/hooks/useProfile';

function SettingsRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/40 px-4 py-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export function AccountProfileSection() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const updateProfile = useUpdateProfile((updatedUser) => {
    refreshUser(updatedUser);
    setMessage('Profile updated');
  });

  const uploadAvatar = useUploadProfileAvatar((updatedUser) => {
    refreshUser(updatedUser);
    setAvatarVersion((current) => current + 1);
    setMessage('Profile photo updated');
  });

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage('Name is required');
      return;
    }
    updateProfile.mutate(trimmedName, {
      onError: (error) =>
        setMessage(error instanceof Error ? error.message : 'Failed to update profile'),
    });
  }

  const avatarUrl = user?.profileImage
    ? `${user.profileImage}?v=${avatarVersion}`
    : undefined;
  const isSaving = updateProfile.isPending || uploadAvatar.isPending;

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">My account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your display name and profile photo.
      </p>

      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <ProfileAvatar
          name={user?.name ?? 'User'}
          imageUrl={avatarUrl}
          size="lg"
          editable
          uploading={uploadAvatar.isPending}
          onUpload={(file) =>
            uploadAvatar.mutate(file, {
              onError: (error) =>
                setMessage(error instanceof Error ? error.message : 'Failed to upload photo'),
            })
          }
        />
        <form onSubmit={handleSave} className="w-full max-w-md space-y-3">
          <div>
            <label htmlFor="profile-name" className="text-sm font-medium">
              Display name
            </label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1"
              disabled={isSaving}
            />
          </div>
          <Button type="submit" variant="whatsapp" disabled={isSaving}>
            {updateProfile.isPending ? 'Saving...' : 'Save profile'}
          </Button>
        </form>
      </div>

      <div className="mt-4 space-y-3">
        <SettingsRow label="Email" value={user?.email ?? '—'} icon={Mail} />
        <SettingsRow
          label="Role"
          value={user?.role === 'ADMIN' ? 'Admin' : 'User'}
          icon={Shield}
        />
      </div>

      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
