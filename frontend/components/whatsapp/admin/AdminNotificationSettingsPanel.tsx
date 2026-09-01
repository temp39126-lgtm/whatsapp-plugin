'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/AuthProvider';
import { SettingsToggle } from '@/components/whatsapp/settings/SettingsToggle';
import type { TenantNotificationSettings } from '@/types';

type NotificationFormState = Omit<TenantNotificationSettings, 'smtpPasswordConfigured'> & {
  smtpPassword: string;
};

const defaultForm: NotificationFormState = {
  enabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  fromEmail: '',
  fromName: 'WhatsApp CRM',
  emailOnAssignment: true,
  notifyAdminOnUnassigned: false,
  adminAlertEmail: '',
  dailyDigestEnabled: false,
};

export function AdminNotificationSettingsPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NotificationFormState>(defaultForm);
  const [message, setMessage] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-notification-settings'],
    queryFn: () => api.get<TenantNotificationSettings>('/settings/notifications'),
  });

  useEffect(() => {
    if (!settings) return;
    setForm((current) => ({
      ...current,
      enabled: settings.enabled,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpSecure: settings.smtpSecure,
      smtpUser: settings.smtpUser,
      smtpPassword: '',
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      emailOnAssignment: settings.emailOnAssignment,
      notifyAdminOnUnassigned: settings.notifyAdminOnUnassigned,
      adminAlertEmail: settings.adminAlertEmail,
      dailyDigestEnabled: settings.dailyDigestEnabled,
    }));
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: () =>
      api.put<TenantNotificationSettings>('/settings/notifications', {
        enabled: form.enabled,
        smtpHost: form.smtpHost.trim(),
        smtpPort: form.smtpPort,
        smtpSecure: form.smtpSecure,
        smtpUser: form.smtpUser.trim(),
        ...(form.smtpPassword.trim() ? { smtpPassword: form.smtpPassword.trim() } : {}),
        fromEmail: form.fromEmail.trim(),
        fromName: form.fromName.trim(),
        emailOnAssignment: form.emailOnAssignment,
        notifyAdminOnUnassigned: form.notifyAdminOnUnassigned,
        adminAlertEmail: form.adminAlertEmail.trim(),
        dailyDigestEnabled: form.dailyDigestEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notification-settings'] });
      setForm((current) => ({ ...current, smtpPassword: '' }));
      setMessage('Notification settings saved.');
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to save notification settings'),
  });

  const sendTestEmail = useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; recipientEmail: string }>('/settings/notifications/test', {
        recipientEmail: user?.email,
      }),
    onSuccess: (result) => setMessage(`Test email sent to ${result.recipientEmail}.`),
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to send test email'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-whatsapp" />
          <h2 className="text-lg font-semibold">Notification management</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Configure tenant-wide email notifications for assignment alerts and admin alerts.
        </p>

        <div className="divide-y rounded-xl border bg-background">
          <SettingsToggle
            label="Enable email notifications"
            description="Turn on SMTP delivery for this tenant"
            checked={form.enabled}
            disabled={saveSettings.isPending}
            onChange={(checked) => setForm({ ...form, enabled: checked })}
          />
          <SettingsToggle
            label="Email agents on assignment"
            description="Send an email when you assign a conversation to an agent"
            checked={form.emailOnAssignment}
            disabled={saveSettings.isPending || !form.enabled}
            onChange={(checked) => setForm({ ...form, emailOnAssignment: checked })}
          />
          <SettingsToggle
            label="Alert admin on new unassigned conversations"
            description="Email the admin address when a new customer conversation arrives"
            checked={form.notifyAdminOnUnassigned}
            disabled={saveSettings.isPending || !form.enabled}
            onChange={(checked) => setForm({ ...form, notifyAdminOnUnassigned: checked })}
          />
          <SettingsToggle
            label="Daily digest"
            description="Send a daily summary email (coming soon)"
            checked={form.dailyDigestEnabled}
            disabled
            onChange={(checked) => setForm({ ...form, dailyDigestEnabled: checked })}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-whatsapp" />
          <h2 className="text-lg font-semibold">SMTP settings</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="SMTP host"
            value={form.smtpHost}
            onChange={(event) => setForm({ ...form, smtpHost: event.target.value })}
          />
          <Input
            type="number"
            placeholder="SMTP port"
            value={form.smtpPort}
            onChange={(event) =>
              setForm({ ...form, smtpPort: Number(event.target.value) || 587 })
            }
          />
          <Input
            placeholder="SMTP username"
            value={form.smtpUser}
            onChange={(event) => setForm({ ...form, smtpUser: event.target.value })}
          />
          <Input
            type="password"
            placeholder={
              settings?.smtpPasswordConfigured
                ? 'SMTP password (leave blank to keep current)'
                : 'SMTP password'
            }
            value={form.smtpPassword}
            onChange={(event) => setForm({ ...form, smtpPassword: event.target.value })}
          />
          <Input
            type="email"
            placeholder="From email"
            value={form.fromEmail}
            onChange={(event) => setForm({ ...form, fromEmail: event.target.value })}
          />
          <Input
            placeholder="From name"
            value={form.fromName}
            onChange={(event) => setForm({ ...form, fromName: event.target.value })}
          />
          <Input
            type="email"
            placeholder="Admin alert email"
            value={form.adminAlertEmail}
            onChange={(event) => setForm({ ...form, adminAlertEmail: event.target.value })}
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.smtpSecure}
            onChange={(event) => setForm({ ...form, smtpSecure: event.target.checked })}
          />
          Use secure SMTP (TLS on port 465)
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="whatsapp"
            disabled={saveSettings.isPending}
            onClick={() => {
              setMessage('');
              saveSettings.mutate();
            }}
          >
            {saveSettings.isPending ? 'Saving...' : 'Save notification settings'}
          </Button>
          <Button
            variant="outline"
            disabled={sendTestEmail.isPending || !form.enabled}
            onClick={() => {
              setMessage('');
              sendTestEmail.mutate();
            }}
          >
            {sendTestEmail.isPending ? 'Sending...' : 'Send test email'}
          </Button>
        </div>
        {message && (
          <p
            className={`mt-3 text-sm ${
              saveSettings.isError || sendTestEmail.isError ? 'text-red-600' : 'text-whatsapp-dark'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
