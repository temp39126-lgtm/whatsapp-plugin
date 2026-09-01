'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  KeyRound,
  MessageCircle,
  Shield,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WhatsAppConnectionStatus } from '@/types';
import { useAuth } from '@/components/AuthProvider';
import { useUserProfile } from '@/hooks/useProfile';
import { SettingsMenuItem } from '@/components/whatsapp/settings/SettingsMenuItem';
import { SettingsProfileHeader } from '@/components/whatsapp/settings/SettingsProfileHeader';
import { SettingsAccountPanel } from '@/components/whatsapp/settings/SettingsAccountPanel';
import { SettingsNotificationsPanel } from '@/components/whatsapp/settings/SettingsNotificationsPanel';
import { SettingsPrivacyPanel } from '@/components/whatsapp/settings/SettingsPrivacyPanel';
import { SettingsWhatsAppPanel } from '@/components/whatsapp/settings/SettingsWhatsAppPanel';

type SettingsPanel = 'home' | 'account' | 'notifications' | 'privacy' | 'whatsapp';

const panelTitles: Record<Exclude<SettingsPanel, 'home'>, string> = {
  account: 'Account',
  notifications: 'Notifications',
  privacy: 'Privacy',
  whatsapp: 'WhatsApp',
};

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [panel, setPanel] = useState<SettingsPanel>('home');
  const [avatarVersion, setAvatarVersion] = useState(0);

  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();

  const { data: connection, isLoading: isLoadingConnection } = useQuery({
    queryKey: ['settings-connection'],
    queryFn: () => api.get<WhatsAppConnectionStatus>('/settings/connection'),
  });

  if (isLoadingProfile || !profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  if (panel !== 'home') {
    return (
      <div className="flex h-full flex-col overflow-y-auto bg-background">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card px-2 py-3">
          <button
            type="button"
            onClick={() => setPanel('home')}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Back to settings"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">{panelTitles[panel]}</h1>
        </div>

        {panel === 'account' && <SettingsAccountPanel profile={profile} />}
        {panel === 'notifications' && <SettingsNotificationsPanel profile={profile} />}
        {panel === 'privacy' && <SettingsPrivacyPanel profile={profile} />}
        {panel === 'whatsapp' && (
          <SettingsWhatsAppPanel connection={connection} isLoading={isLoadingConnection} />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-muted/20">
      <div className="border-b bg-card px-4 py-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        {isAdmin && (
          <p className="mt-1 text-sm text-muted-foreground">
            Personal account settings. Meta Cloud API and SMTP email are managed in{' '}
            <Link href="/whatsapp/admin/settings" className="text-whatsapp-dark hover:underline">
              Admin Settings
            </Link>
            .
          </p>
        )}
      </div>

      <SettingsProfileHeader
        profile={profile}
        avatarVersion={avatarVersion}
        onClick={() => setPanel('account')}
      />

      <div className="mt-2 divide-y border-y bg-card">
        <SettingsMenuItem
          icon={KeyRound}
          title="Account"
          subtitle="Security info, profile, email"
          onClick={() => setPanel('account')}
        />
        <SettingsMenuItem
          icon={Bell}
          title="Notifications"
          subtitle="Message alerts, sounds, assignment emails"
          onClick={() => setPanel('notifications')}
        />
        <SettingsMenuItem
          icon={Shield}
          title="Privacy"
          subtitle="Read receipts, online status, profile photo"
          onClick={() => setPanel('privacy')}
        />
        <SettingsMenuItem
          icon={MessageCircle}
          title="WhatsApp"
          subtitle="Business connection and calling status"
          onClick={() => setPanel('whatsapp')}
        />
      </div>
    </div>
  );
}
