'use client';

import { ChevronRight } from 'lucide-react';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import type { UserProfile } from '@/types';

interface SettingsProfileHeaderProps {
  profile: UserProfile;
  avatarVersion?: number;
  onClick: () => void;
}

export function SettingsProfileHeader({
  profile,
  avatarVersion = 0,
  onClick,
}: SettingsProfileHeaderProps) {
  const avatarUrl = profile.profileImage
    ? `${profile.profileImage}?v=${avatarVersion}`
    : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 border-b bg-card px-4 py-5 text-left transition-colors hover:bg-muted/30"
    >
      <ProfileAvatar name={profile.name ?? 'User'} imageUrl={avatarUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-semibold">{profile.name ?? 'User'}</p>
        {profile.about ? (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.about}</p>
        ) : (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.email}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
