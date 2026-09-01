'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Cloud, Copy, Link2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WhatsAppAccountSettings } from '@/types';

interface MetaFormState {
  metaAppId: string;
  appSecret: string;
  businessAccountId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  webhookVerifyToken: string;
  metaApiVersion: string;
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AdminMetaCloudPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MetaFormState>({
    metaAppId: '',
    appSecret: '',
    businessAccountId: '',
    phoneNumberId: '',
    displayPhoneNumber: '',
    accessToken: '',
    webhookVerifyToken: '',
    metaApiVersion: 'v21.0',
  });
  const [message, setMessage] = useState('');
  const [copiedField, setCopiedField] = useState<'callbackUrl' | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<WhatsAppAccountSettings>('/settings/account'),
  });

  const { data: webhook } = useQuery({
    queryKey: ['webhook-info'],
    queryFn: () => api.get<{ webhookUrl: string }>('/settings/webhook'),
  });

  useEffect(() => {
    if (!settings?.configured) return;
    setForm((current) => ({
      ...current,
      metaAppId: settings.metaAppId ?? '',
      appSecret: '',
      businessAccountId: settings.businessAccountId ?? '',
      phoneNumberId: settings.phoneNumberId ?? '',
      displayPhoneNumber: settings.displayPhoneNumber ?? '',
      accessToken: '',
      webhookVerifyToken: settings.webhookVerifyToken ?? '',
      metaApiVersion: settings.metaApiVersion ?? 'v21.0',
    }));
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: () =>
      api.put('/settings/account', {
        metaAppId: form.metaAppId.trim(),
        businessAccountId: form.businessAccountId.trim(),
        phoneNumberId: form.phoneNumberId.trim(),
        displayPhoneNumber: form.displayPhoneNumber.trim(),
        webhookVerifyToken: form.webhookVerifyToken.trim(),
        metaApiVersion: form.metaApiVersion.trim() || 'v21.0',
        ...(form.appSecret.trim() ? { appSecret: form.appSecret.trim() } : {}),
        ...(form.accessToken.trim() ? { accessToken: form.accessToken.trim() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings-connection'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-info'] });
      setForm((current) => ({ ...current, appSecret: '', accessToken: '' }));
      setMessage('Meta Cloud API configuration saved.');
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to save configuration'),
  });

  async function copyToClipboard(value: string, field: 'callbackUrl') {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      setMessage('Could not copy to clipboard.');
    }
  }

  function validateForm(): string | null {
    if (!form.metaAppId.trim()) return 'Meta App ID is required.';
    if (!form.businessAccountId.trim()) return 'WhatsApp Business Account ID is required.';
    if (!form.phoneNumberId.trim()) return 'Phone Number ID is required.';
    if (!form.displayPhoneNumber.trim()) return 'Display phone number is required.';
    if (!form.webhookVerifyToken.trim()) return 'Webhook verify token is required.';
    if (!form.metaApiVersion.trim()) return 'Meta API version is required.';
    if (!settings?.configured && !form.appSecret.trim()) return 'Meta App Secret is required.';
    if (!settings?.configured && !form.accessToken.trim()) {
      return 'Permanent access token is required.';
    }
    return null;
  }

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-whatsapp" />
            <h2 className="text-lg font-semibold">Meta Cloud API</h2>
          </div>
          {settings?.configured && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {settings.connectionStatus ?? 'Connected'}
            </span>
          )}
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter all credentials from your Meta Developer App and WhatsApp Business Account.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Meta App ID"
            required
            hint="From Meta Developer Dashboard → App settings → Basic"
          >
            <Input
              value={form.metaAppId}
              onChange={(event) => setForm({ ...form, metaAppId: event.target.value })}
              placeholder="e.g. 123456789012345"
            />
          </Field>

          <Field
            label="Meta App Secret"
            required={!settings?.appSecretConfigured}
            hint={
              settings?.appSecretConfigured
                ? 'Leave blank to keep the current secret'
                : 'From Meta Developer Dashboard → App settings → Basic'
            }
          >
            <Input
              type="password"
              value={form.appSecret}
              onChange={(event) => setForm({ ...form, appSecret: event.target.value })}
              placeholder={
                settings?.appSecretConfigured ? 'Leave blank to keep current' : 'App secret'
              }
            />
          </Field>

          <Field
            label="WhatsApp Business Account ID"
            required
            hint="WhatsApp Manager → Account overview"
          >
            <Input
              value={form.businessAccountId}
              onChange={(event) => setForm({ ...form, businessAccountId: event.target.value })}
              placeholder="WABA ID"
            />
          </Field>

          <Field label="Phone Number ID" required hint="WhatsApp Manager → Phone numbers">
            <Input
              value={form.phoneNumberId}
              onChange={(event) => setForm({ ...form, phoneNumberId: event.target.value })}
              placeholder="Phone number ID"
            />
          </Field>

          <Field label="Display phone number" required hint="Customer-facing business number">
            <Input
              value={form.displayPhoneNumber}
              onChange={(event) => setForm({ ...form, displayPhoneNumber: event.target.value })}
              placeholder="+1 555 0100"
            />
          </Field>

          <Field
            label="Permanent access token"
            required={!settings?.configured}
            hint={
              settings?.configured
                ? 'Leave blank to keep the current token'
                : 'System user token with whatsapp_business_messaging permission'
            }
          >
            <Input
              type="password"
              value={form.accessToken}
              onChange={(event) => setForm({ ...form, accessToken: event.target.value })}
              placeholder={
                settings?.configured ? 'Leave blank to keep current' : 'Permanent access token'
              }
            />
          </Field>

          <Field label="Meta API version" required hint="Usually v21.0 or latest Graph API version">
            <Input
              value={form.metaApiVersion}
              onChange={(event) => setForm({ ...form, metaApiVersion: event.target.value })}
              placeholder="v21.0"
            />
          </Field>
        </div>

        <Button
          className="mt-6"
          variant="whatsapp"
          disabled={saveSettings.isPending}
          onClick={() => {
            const error = validateForm();
            if (error) {
              setMessage(error);
              return;
            }
            setMessage('');
            saveSettings.mutate();
          }}
        >
          {saveSettings.isPending ? 'Saving...' : 'Save configuration'}
        </Button>
        {message && (
          <p
            className={`mt-3 text-sm ${
              saveSettings.isError || message.includes('required') ? 'text-red-600' : 'text-whatsapp-dark'
            }`}
          >
            {message}
          </p>
        )}
      </div>

      {webhook && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-whatsapp" />
            <h2 className="text-lg font-semibold">Webhook setup in Meta</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Copy these values into Meta Developer Dashboard → WhatsApp → Configuration → Webhook.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Callback URL"
              hint="Generated from your server URL. Paste this into Meta as the webhook callback."
            >
              <div className="flex gap-2">
                <Input readOnly value={webhook.webhookUrl} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 px-3"
                  onClick={() => copyToClipboard(webhook.webhookUrl, 'callbackUrl')}
                >
                  {copiedField === 'callbackUrl' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Field>

            <Field
              label="Verify token"
              required
              hint="Choose a secret string, save here, then paste the same value into Meta."
            >
              <Input
                value={form.webhookVerifyToken}
                onChange={(event) => setForm({ ...form, webhookVerifyToken: event.target.value })}
                placeholder="e.g. my-secret-verify-token"
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}
