'use client';

import { useEffect, useState } from 'react';
import { Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { useAuth } from '@/components/AuthProvider';
import {
  profileToAuthUser,
  useUpdateProfile,
  useUploadProfileAvatar,
} from '@/hooks/useProfile';
import type { UserProfile } from '@/types';

interface SettingsAccountPanelProps {
  profile: UserProfile;
}

export function SettingsAccountPanel({ profile }: SettingsAccountPanelProps) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState(profile.name ?? '');
  const [about, setAbout] = useState(profile.about ?? '');
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(profile.name ?? '');
    setAbout(profile.about ?? '');
  }, [profile.name, profile.about]);

  const updateProfile = useUpdateProfile((updated) => {
    refreshUser(profileToAuthUser(updated));
    setMessage('Profile updated');
  });

  const uploadAvatar = useUploadProfileAvatar((updated) => {
    refreshUser(profileToAuthUser(updated));
    setAvatarVersion((current) => current + 1);
    setMessage('Profile photo updated');
  });

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    updateProfile.mutate(
      { name: name.trim(), about: about.trim() },
      {
        onError: (error) =>
          setMessage(error instanceof Error ? error.message : 'Failed to update profile'),
      }
    );
  }

  const avatarUrl = profile.profileImage
    ? `${profile.profileImage}?v=${avatarVersion}`
    : undefined;
  const isSaving = updateProfile.isPending || uploadAvatar.isPending;

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <ProfileAvatar
          name={profile.name ?? 'User'}
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
        <form onSubmit={handleSave} className="w-full max-w-lg space-y-3">
          <div>
            <label htmlFor="profile-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1"
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="profile-about" className="text-sm font-medium">
              About
            </label>
            <Input
              id="profile-about"
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              placeholder="Available for support"
              maxLength={139}
              className="mt-1"
              disabled={isSaving}
            />
          </div>
          <Button type="submit" variant="whatsapp" disabled={isSaving}>
            {updateProfile.isPending ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card divide-y">
        <div className="flex items-center gap-3 px-4 py-3">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="truncate text-sm font-medium">{profile.email ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
            <p className="text-sm font-medium">{profile.role === 'ADMIN' ? 'Admin' : 'User'}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Password changes are managed by your workspace admin.
      </p>

      {message && <p className="text-sm text-whatsapp-dark">{message}</p>}
    </div>
  );
}
