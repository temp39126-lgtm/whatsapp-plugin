'use client';

import { useState } from 'react';
import type { UserProfile } from '@/types';
import { SettingsToggle } from './SettingsToggle';
import { useUpdatePreferences } from '@/hooks/useProfile';

interface SettingsPrivacyPanelProps {
  profile: UserProfile;
}

export function SettingsPrivacyPanel({ profile }: SettingsPrivacyPanelProps) {
  const [message, setMessage] = useState('');
  const updatePreferences = useUpdatePreferences(() => setMessage('Privacy settings saved'));
  const privacy = profile.preferences.privacy;
  const isSaving = updatePreferences.isPending;

  function updatePrivacy<K extends keyof typeof privacy>(key: K, value: (typeof privacy)[K]) {
    updatePreferences.mutate(
      { privacy: { [key]: value } },
      {
        onError: (error) =>
          setMessage(error instanceof Error ? error.message : 'Failed to save settings'),
      }
    );
  }

  return (
    <div className="divide-y px-4">
      <SettingsToggle
        label="Read receipts"
        description="Let teammates know when you have read assigned conversations"
        checked={privacy.readReceipts}
        disabled={isSaving}
        onChange={(checked) => updatePrivacy('readReceipts', checked)}
      />
      <SettingsToggle
        label="Online status"
        description="Show when you are active in the CRM"
        checked={privacy.showOnlineStatus}
        disabled={isSaving}
        onChange={(checked) => updatePrivacy('showOnlineStatus', checked)}
      />
      <SettingsToggle
        label="Profile photo"
        description="Allow teammates to see your profile photo"
        checked={privacy.showProfilePhoto}
        disabled={isSaving}
        onChange={(checked) => updatePrivacy('showProfilePhoto', checked)}
      />
      {message && <p className="py-3 text-sm text-whatsapp-dark">{message}</p>}
    </div>
  );
}
