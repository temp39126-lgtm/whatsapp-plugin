'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Cloud, Copy, Link2, Loader2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WhatsAppAccountSettings } from '@/types';

type ConnectionCheckStatus = 'pass' | 'fail' | 'warn';

interface ConnectionCheck {
  id: string;
  label: string;
  status: ConnectionCheckStatus;
  message: string;
}

interface ConnectionTestResult {
  success: boolean;
  checkedAt: string;
  checks: ConnectionCheck[];
}

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
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult | null>(null);
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

  const testConnection = useMutation({
    mutationFn: () =>
      api.post<ConnectionTestResult>('/settings/account/test-connection', {
        phoneNumberId: form.phoneNumberId.trim() || undefined,
        businessAccountId: form.businessAccountId.trim() || undefined,
        displayPhoneNumber: form.displayPhoneNumber.trim() || undefined,
        metaApiVersion: form.metaApiVersion.trim() || undefined,
        webhookVerifyToken: form.webhookVerifyToken.trim() || undefined,
        ...(form.accessToken.trim() ? { accessToken: form.accessToken.trim() } : {}),
      }),
    onSuccess: (result) => {
      setConnectionTest(result);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setMessage(
        result.success
          ? 'Connection test passed. Meta API and webhook checks look good.'
          : 'Connection test failed. Fix the items marked in red, then save and test again.'
      );
    },
    onError: (error) => {
      setConnectionTest(null);
      setMessage(error instanceof Error ? error.message : 'Connection test failed');
    },
  });

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
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                settings.connectionStatus === 'CONNECTED'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {settings.connectionStatus === 'CONNECTED' ? 'Connected' : 'Not verified'}
            </span>
          )}
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter all credentials from your Meta Developer App and WhatsApp Business Account.
          {settings?.callingEnabled && (
            <>
              {' '}
              Voice calling is enabled on this server — save configuration to turn on calling for
              your phone number in Meta.
            </>
          )}
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

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="whatsapp"
            disabled={saveSettings.isPending}
            onClick={() => {
              const error = validateForm();
              if (error) {
                setMessage(error);
                return;
              }
              setMessage('');
              setConnectionTest(null);
              saveSettings.mutate();
            }}
          >
            {saveSettings.isPending ? 'Saving...' : 'Save configuration'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testConnection.isPending || !settings?.configured}
            onClick={() => {
              if (!form.phoneNumberId.trim() || !form.businessAccountId.trim()) {
                setMessage('Phone Number ID and WABA ID are required to test connection.');
                return;
              }
              setMessage('');
              testConnection.mutate();
            }}
          >
            {testConnection.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing…
              </>
            ) : (
              'Test connection'
            )}
          </Button>
        </div>
        {!settings?.configured && (
          <p className="mt-2 text-xs text-muted-foreground">
            Save configuration once, then use Test connection (you can paste a new token in the form
            before testing without saving).
          </p>
        )}
        {connectionTest && (
          <div
            className={`mt-4 rounded-lg border p-4 ${
              connectionTest.success ? 'border-green-200 bg-green-50/80' : 'border-red-200 bg-red-50/80'
            }`}
          >
            <p
              className={`mb-3 flex items-center gap-2 text-sm font-semibold ${
                connectionTest.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {connectionTest.success ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              {connectionTest.success ? 'Connected successfully' : 'Not connected — fix the issues below'}
            </p>
            <ul className="space-y-2">
              {connectionTest.checks.map((check) => (
                <li key={check.id} className="flex gap-2 text-sm">
                  {check.status === 'pass' && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                  )}
                  {check.status === 'fail' && (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                  )}
                  {check.status === 'warn' && (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  )}
                  <div>
                    <span className="font-medium">{check.label}: </span>
                    <span className="text-muted-foreground">{check.message}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {message && (
          <p
            className={`mt-3 text-sm ${
              saveSettings.isError ||
              testConnection.isError ||
              message.includes('required') ||
              message.includes('failed')
                ? 'text-red-600'
                : 'text-whatsapp-dark'
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
              <div className="flex min-w-0 gap-2">
                <Input
                  readOnly
                  value={webhook.webhookUrl}
                  className="min-w-0 flex-1 font-mono text-xs"
                />
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
