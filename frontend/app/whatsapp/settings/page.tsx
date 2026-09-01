'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Building2,
  KeyRound,
  MessageCircle,
  Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { WhatsAppAccountSettings, WhatsAppConnectionStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/AuthProvider';
import { useUserProfile } from '@/hooks/useProfile';
import { SettingsMenuItem } from '@/components/whatsapp/settings/SettingsMenuItem';
import { SettingsProfileHeader } from '@/components/whatsapp/settings/SettingsProfileHeader';
import { SettingsAccountPanel } from '@/components/whatsapp/settings/SettingsAccountPanel';
import { SettingsNotificationsPanel } from '@/components/whatsapp/settings/SettingsNotificationsPanel';
import { SettingsPrivacyPanel } from '@/components/whatsapp/settings/SettingsPrivacyPanel';
import { SettingsWhatsAppPanel } from '@/components/whatsapp/settings/SettingsWhatsAppPanel';

type SettingsPanel =
  | 'home'
  | 'account'
  | 'notifications'
  | 'privacy'
  | 'whatsapp'
  | 'business';

const panelTitles: Record<Exclude<SettingsPanel, 'home'>, string> = {
  account: 'Account',
  notifications: 'Notifications',
  privacy: 'Privacy',
  whatsapp: 'WhatsApp',
  business: 'Business configuration',
};

function AdminBusinessPanel({
  settings,
  webhook,
  form,
  setForm,
  isSaving,
  onSave,
}: {
  settings?: WhatsAppAccountSettings;
  webhook?: { webhookUrl: string; verifyToken: string };
  form: {
    phoneNumberId: string;
    businessAccountId: string;
    displayPhoneNumber: string;
    accessToken: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      phoneNumberId: string;
      businessAccountId: string;
      displayPhoneNumber: string;
      accessToken: string;
    }>
  >;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-3">
        <Input
          placeholder="Phone Number ID"
          value={form.phoneNumberId}
          onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
        />
        <Input
          placeholder="Business Account ID"
          value={form.businessAccountId}
          onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
        />
        <Input
          placeholder="Display Phone Number"
          value={form.displayPhoneNumber}
          onChange={(e) => setForm({ ...form, displayPhoneNumber: e.target.value })}
        />
        <Input
          type="password"
          placeholder="Access Token"
          value={form.accessToken}
          onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
        />
        <Button variant="whatsapp" onClick={onSave} disabled={isSaving}>
          Save configuration
        </Button>
      </div>

      {webhook && (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Webhook configuration</p>
          <p className="mt-2">
            <span className="font-medium">URL:</span> {webhook.webhookUrl}
          </p>
          <p className="mt-2">
            <span className="font-medium">Verify token:</span> {webhook.verifyToken}
          </p>
        </div>
      )}

      {settings?.configured && (
        <p className="text-sm text-green-700">
          Connected: {settings.displayPhoneNumber} · {settings.connectionStatus}
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<SettingsPanel>('home');
  const [avatarVersion, setAvatarVersion] = useState(0);

  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();

  const { data: connection, isLoading: isLoadingConnection } = useQuery({
    queryKey: ['settings-connection'],
    queryFn: () => api.get<WhatsAppConnectionStatus>('/settings/connection'),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<WhatsAppAccountSettings>('/settings/account'),
    enabled: isAdmin,
  });

  const { data: webhook } = useQuery({
    queryKey: ['webhook-info'],
    queryFn: () => api.get<{ webhookUrl: string; verifyToken: string }>('/settings/webhook'),
    enabled: isAdmin,
  });

  const [form, setForm] = useState({
    phoneNumberId: '',
    businessAccountId: '',
    displayPhoneNumber: '',
    accessToken: '',
  });

  const saveSettings = useMutation({
    mutationFn: () => api.put('/settings/account', form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
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
        {panel === 'business' && isAdmin && (
          <AdminBusinessPanel
            settings={settings}
            webhook={webhook}
            form={form}
            setForm={setForm}
            isSaving={saveSettings.isPending}
            onSave={() => saveSettings.mutate()}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-muted/20">
      <div className="border-b bg-card px-4 py-4">
        <h1 className="text-xl font-semibold">Settings</h1>
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
          subtitle="Message alerts, sounds, email summary"
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
        {isAdmin && (
          <SettingsMenuItem
            icon={Building2}
            title="Business configuration"
            subtitle="API credentials and webhook setup"
            onClick={() => setPanel('business')}
            iconClassName="bg-emerald-100 text-emerald-700"
          />
        )}
      </div>
    </div>
  );
}
