'use client';

import { useState } from 'react';
import type { UserProfile } from '@/types';
import { SettingsToggle } from './SettingsToggle';
import { useUpdatePreferences } from '@/hooks/useProfile';

interface SettingsNotificationsPanelProps {
  profile: UserProfile;
}

export function SettingsNotificationsPanel({ profile }: SettingsNotificationsPanelProps) {
  const [message, setMessage] = useState('');
  const updatePreferences = useUpdatePreferences(() => setMessage('Notification settings saved'));
  const notifications = profile.preferences.notifications;
  const isSaving = updatePreferences.isPending;

  function updateNotification<K extends keyof typeof notifications>(
    key: K,
    value: (typeof notifications)[K]
  ) {
    updatePreferences.mutate(
      { notifications: { [key]: value } },
      {
        onError: (error) =>
          setMessage(error instanceof Error ? error.message : 'Failed to save settings'),
      }
    );
  }

  return (
    <div className="divide-y px-4">
      <SettingsToggle
        label="Message notifications"
        description="Alert when a new customer message arrives"
        checked={notifications.messageAlerts}
        disabled={isSaving}
        onChange={(checked) => updateNotification('messageAlerts', checked)}
      />
      <SettingsToggle
        label="Notification sounds"
        description="Play a sound for new messages"
        checked={notifications.sound}
        disabled={isSaving}
        onChange={(checked) => updateNotification('sound', checked)}
      />
      <SettingsToggle
        label="Desktop notifications"
        description="Show browser notifications while the app is open"
        checked={notifications.desktopNotifications}
        disabled={isSaving}
        onChange={(checked) => updateNotification('desktopNotifications', checked)}
      />
      <SettingsToggle
        label="Email summary"
        description="Receive a daily email digest of unread conversations"
        checked={notifications.emailSummary}
        disabled={isSaving}
        onChange={(checked) => updateNotification('emailSummary', checked)}
      />
      <SettingsToggle
        label="Email when assigned a chat"
        description="Get an email when an admin assigns a conversation to you"
        checked={notifications.emailOnAssignment}
        disabled={isSaving}
        onChange={(checked) => updateNotification('emailOnAssignment', checked)}
      />
      {message && <p className="py-3 text-sm text-whatsapp-dark">{message}</p>}
    </div>
  );
}
