'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WhatsAppAccountSettings, WhatsAppConnectionStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';
import { Mail, Phone, Shield, User } from 'lucide-react';

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

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

function WhatsAppStatusBanner({ connection }: { connection: WhatsAppConnectionStatus }) {
  if (!connection.configured) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
        <p className="font-medium text-yellow-800">WhatsApp not connected</p>
        <p className="mt-1 text-sm text-yellow-700">
          Your workspace is not linked to WhatsApp yet. Ask your admin to complete setup.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
      <p className="font-medium text-green-800">WhatsApp connected</p>
      <p className="mt-1 text-sm text-green-700">
        {connection.displayPhoneNumber ?? 'Business number'} · {connection.connectionStatus ?? 'Active'}
      </p>
      <p className="mt-1 text-xs text-green-600">
        {connection.callingEnabled
          ? 'Calling enabled for this workspace'
          : 'Calling disabled (requires Meta Business Calling)'}
      </p>
    </div>
  );
}

function UserSettingsView({
  connection,
  isLoadingConnection,
}: {
  connection?: WhatsAppConnectionStatus;
  isLoadingConnection: boolean;
}) {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <SettingsSection title="My account" description="Your personal profile in this workspace.">
        <SettingsRow label="Name" value={user?.name ?? '—'} icon={User} />
        <SettingsRow label="Email" value={user?.email ?? '—'} icon={Mail} />
        <SettingsRow label="Role" value={user?.role === 'ADMIN' ? 'Admin' : 'User'} icon={Shield} />
      </SettingsSection>

      <SettingsSection
        title="WhatsApp"
        description="Connection details for your team. Only admins can change configuration."
      >
        {isLoadingConnection ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
          </div>
        ) : (
          <>
            <WhatsAppStatusBanner connection={connection ?? { configured: false }} />
            {connection?.configured && (
              <SettingsRow
                label="Business number"
                value={connection.displayPhoneNumber ?? 'Not available'}
                icon={Phone}
              />
            )}
            <p className="text-sm text-muted-foreground">
              Contact your admin if WhatsApp needs to be connected or updated.
            </p>
          </>
        )}
      </SettingsSection>
    </div>
  );
}

function AdminSettingsView({
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
    <div className="max-w-2xl space-y-8">
      {settings?.configured && (
        <WhatsAppStatusBanner
          connection={{
            configured: true,
            displayPhoneNumber: settings.displayPhoneNumber,
            connectionStatus: settings.connectionStatus,
            callingEnabled: settings.callingEnabled,
          }}
        />
      )}

      <SettingsSection title="WhatsApp account" description="Connect your Meta WhatsApp Business account.">
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
      </SettingsSection>

      {webhook && (
        <SettingsSection title="Webhook configuration">
          <div className="rounded-lg bg-muted/40 p-4 text-sm">
            <p>
              <span className="font-medium">URL:</span> {webhook.webhookUrl}
            </p>
            <p className="mt-2">
              <span className="font-medium">Verify token:</span> {webhook.verifyToken}
            </p>
          </div>
        </SettingsSection>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<WhatsAppAccountSettings>('/settings/account'),
    enabled: isAdmin,
  });

  const { data: connection, isLoading: isLoadingConnection } = useQuery({
    queryKey: ['settings-connection'],
    queryFn: () => api.get<WhatsAppConnectionStatus>('/settings/connection'),
    enabled: !isAdmin,
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

  const isLoading = isAdmin ? isLoadingSettings : isLoadingConnection;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? 'Manage WhatsApp connection and workspace configuration.'
            : 'View your account and workspace connection status.'}
        </p>
      </div>

      {isAdmin ? (
        <AdminSettingsView
          settings={settings}
          webhook={webhook}
          form={form}
          setForm={setForm}
          isSaving={saveSettings.isPending}
          onSave={() => saveSettings.mutate()}
        />
      ) : (
        <UserSettingsView connection={connection} isLoadingConnection={isLoadingConnection} />
      )}
    </div>
  );
}
