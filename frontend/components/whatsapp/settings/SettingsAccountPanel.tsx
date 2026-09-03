'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { useAuth } from '@/components/AuthProvider';
import { setAuthToken } from '@/lib/auth';
import { resetSocket } from '@/lib/socket';
import {
  profileToAuthUser,
  useChangeEmail,
  useChangePassword,
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
  const [email, setEmail] = useState(profile.email ?? '');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(profile.name ?? '');
    setAbout(profile.about ?? '');
    setEmail(profile.email ?? '');
  }, [profile.name, profile.about, profile.email]);

  const updateProfile = useUpdateProfile((updated) => {
    refreshUser(profileToAuthUser(updated));
    setMessage('Profile updated');
  });

  const uploadAvatar = useUploadProfileAvatar((updated) => {
    refreshUser(profileToAuthUser(updated));
    setAvatarVersion((current) => current + 1);
    setMessage('Profile photo updated');
  });

  const changePassword = useChangePassword((result) => {
    setAuthToken(result.token);
    refreshUser(profileToAuthUser(result.profile));
    resetSocket();
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage(result.message);
  });

  const changeEmail = useChangeEmail((result) => {
    setAuthToken(result.token);
    refreshUser(profileToAuthUser(result.profile));
    resetSocket();
    setEmailPassword('');
    setMessage(result.message);
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

  function handleEmailChange(event: React.FormEvent) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    changeEmail.mutate(
      { email: trimmedEmail, currentPassword: emailPassword },
      {
        onError: (error) =>
          setMessage(error instanceof Error ? error.message : 'Failed to update email'),
      }
    );
  }

  function handlePasswordChange(event: React.FormEvent) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onError: (error) =>
          setMessage(error instanceof Error ? error.message : 'Failed to update password'),
      }
    );
  }

  const avatarUrl = profile.profileImage
    ? `${profile.profileImage}?v=${avatarVersion}`
    : undefined;
  const isSaving = updateProfile.isPending || uploadAvatar.isPending;
  const isChangingEmail = changeEmail.isPending;
  const isChangingPassword = changePassword.isPending;

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
            {updateProfile.isPending ? 'Saving...' : 'Save profile'}
          </Button>
        </form>
      </div>

      <form onSubmit={handleEmailChange} className="max-w-lg space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Email address</h3>
        </div>
        <div>
          <label htmlFor="profile-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1"
            disabled={isChangingEmail}
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="email-password" className="text-sm font-medium">
            Current password
          </label>
          <Input
            id="email-password"
            type="password"
            value={emailPassword}
            onChange={(event) => setEmailPassword(event.target.value)}
            className="mt-1"
            disabled={isChangingEmail}
            autoComplete="current-password"
            placeholder="Confirm with your password"
          />
        </div>
        <Button type="submit" variant="outline" disabled={isChangingEmail || !emailPassword.trim()}>
          {isChangingEmail ? 'Updating...' : 'Update email'}
        </Button>
      </form>

      <form
        onSubmit={handlePasswordChange}
        className="max-w-lg space-y-3 rounded-xl border bg-card p-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Password</h3>
        </div>
        <div>
          <label htmlFor="current-password" className="text-sm font-medium">
            Current password
          </label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-1"
            disabled={isChangingPassword}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="text-sm font-medium">
            New password
          </label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1"
            disabled={isChangingPassword}
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="text-sm font-medium">
            Confirm new password
          </label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1"
            disabled={isChangingPassword}
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={
            isChangingPassword ||
            !currentPassword ||
            !newPassword ||
            newPassword !== confirmPassword
          }
        >
          {isChangingPassword ? 'Updating...' : 'Change password'}
        </Button>
      </form>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-3 px-4 py-3">
          <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
            <p className="text-sm font-medium">{profile.role === 'ADMIN' ? 'Admin' : 'User'}</p>
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-whatsapp-dark">{message}</p>}
    </div>
  );
}
