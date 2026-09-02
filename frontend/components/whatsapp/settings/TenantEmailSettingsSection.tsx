'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/AuthProvider';
import type { TenantNotificationSettings } from '@/types';

type EmailFormState = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
};

const defaultForm: EmailFormState = {
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
};

function smtpReady(form: EmailFormState, passwordConfigured?: boolean) {
  return Boolean(
    form.smtpHost.trim() &&
      form.smtpUser.trim() &&
      (form.smtpPassword.trim() || passwordConfigured)
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

interface TenantEmailSettingsSectionProps {
  compact?: boolean;
}

export function TenantEmailSettingsSection({ compact = false }: TenantEmailSettingsSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EmailFormState>(defaultForm);
  const [message, setMessage] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-notification-settings'],
    queryFn: () => api.get<TenantNotificationSettings>('/settings/notifications'),
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPassword: '',
    });
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: () =>
      api.put<TenantNotificationSettings>('/settings/notifications', {
        enabled: smtpReady(form, settings?.smtpPasswordConfigured),
        smtpHost: form.smtpHost.trim(),
        smtpPort: form.smtpPort,
        smtpUser: form.smtpUser.trim(),
        ...(form.smtpPassword.trim() ? { smtpPassword: form.smtpPassword.trim() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notification-settings'] });
      setForm((current) => ({ ...current, smtpPassword: '' }));
      setMessage('SMTP settings saved.');
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to save SMTP settings'),
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
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  const cardClass = compact
    ? 'space-y-5 px-4 pb-4 pt-4'
    : 'rounded-xl border bg-card p-6 shadow-sm';

  return (
    <div className={compact ? '' : 'space-y-6'}>
      <div className={cardClass}>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">SMTP (Nodemailer)</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            All transactional and notification emails are sent through your SMTP server (SendGrid,
            Gmail, etc.).
          </p>
        </div>

        <div className="space-y-5">
          <Field label="SMTP Host" required>
            <Input
              placeholder="smtp.zoho.in or smtp.gmail.com"
              value={form.smtpHost}
              onChange={(event) => setForm({ ...form, smtpHost: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Zoho India accounts use <code className="text-xs">smtp.zoho.in</code>, not{' '}
              <code className="text-xs">smtp.zoho.com</code>.
            </p>
          </Field>

          <Field label="SMTP Port" required>
            <Input
              type="number"
              placeholder="587"
              value={form.smtpPort}
              onChange={(event) =>
                setForm({ ...form, smtpPort: Number(event.target.value) || 587 })
              }
            />
          </Field>

          <Field label="SMTP Username" required>
            <Input
              placeholder="your-email@company.com"
              value={form.smtpUser}
              onChange={(event) => setForm({ ...form, smtpUser: event.target.value })}
            />
          </Field>

          <Field label="SMTP Password" required={!settings?.smtpPasswordConfigured}>
            <Input
              type="password"
              placeholder={
                settings?.smtpPasswordConfigured
                  ? 'Leave blank to keep current password'
                  : 'Enter SMTP password'
              }
              value={form.smtpPassword}
              onChange={(event) => setForm({ ...form, smtpPassword: event.target.value })}
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="whatsapp"
            disabled={saveSettings.isPending || !smtpReady(form, settings?.smtpPasswordConfigured)}
            onClick={() => {
              setMessage('');
              saveSettings.mutate();
            }}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>

          {!compact && (
            <Button
              variant="outline"
              disabled={sendTestEmail.isPending || !smtpReady(form, settings?.smtpPasswordConfigured)}
              onClick={() => {
                setMessage('');
                sendTestEmail.mutate();
              }}
            >
              {sendTestEmail.isPending ? 'Sending...' : 'Send test email'}
            </Button>
          )}
        </div>

        {message && (
          <p
            className={`mt-4 text-sm ${
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
