'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cloud, Link2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WhatsAppAccountSettings } from '@/types';

interface MetaFormState {
  phoneNumberId: string;
  businessAccountId: string;
  displayPhoneNumber: string;
  accessToken: string;
}

export function AdminMetaCloudPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MetaFormState>({
    phoneNumberId: '',
    businessAccountId: '',
    displayPhoneNumber: '',
    accessToken: '',
  });
  const [message, setMessage] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<WhatsAppAccountSettings>('/settings/account'),
  });

  const { data: webhook } = useQuery({
    queryKey: ['webhook-info'],
    queryFn: () => api.get<{ webhookUrl: string; verifyToken: string }>('/settings/webhook'),
  });

  useEffect(() => {
    if (!settings?.configured) return;
    setForm((current) => ({
      ...current,
      phoneNumberId: settings.phoneNumberId ?? '',
      businessAccountId: settings.businessAccountId ?? '',
      displayPhoneNumber: settings.displayPhoneNumber ?? '',
      accessToken: '',
    }));
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: () =>
      api.put('/settings/account', {
        phoneNumberId: form.phoneNumberId.trim(),
        businessAccountId: form.businessAccountId.trim(),
        displayPhoneNumber: form.displayPhoneNumber.trim(),
        ...(form.accessToken.trim() ? { accessToken: form.accessToken.trim() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings-connection'] });
      setForm((current) => ({ ...current, accessToken: '' }));
      setMessage('Meta Cloud API configuration saved.');
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to save configuration'),
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
          Connect your WhatsApp Business account using Meta Cloud API credentials.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Phone Number ID"
            value={form.phoneNumberId}
            onChange={(event) => setForm({ ...form, phoneNumberId: event.target.value })}
          />
          <Input
            placeholder="Business Account ID"
            value={form.businessAccountId}
            onChange={(event) => setForm({ ...form, businessAccountId: event.target.value })}
          />
          <Input
            placeholder="Display Phone Number"
            value={form.displayPhoneNumber}
            onChange={(event) => setForm({ ...form, displayPhoneNumber: event.target.value })}
          />
          <Input
            type="password"
            placeholder={
              settings?.configured ? 'Access token (leave blank to keep current)' : 'Access Token'
            }
            value={form.accessToken}
            onChange={(event) => setForm({ ...form, accessToken: event.target.value })}
          />
        </div>
        <Button
          className="mt-4"
          variant="whatsapp"
          disabled={saveSettings.isPending}
          onClick={() => {
            setMessage('');
            saveSettings.mutate();
          }}
        >
          {saveSettings.isPending ? 'Saving...' : 'Save configuration'}
        </Button>
        {message && (
          <p
            className={`mt-3 text-sm ${
              saveSettings.isError ? 'text-red-600' : 'text-whatsapp-dark'
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
            <h2 className="text-lg font-semibold">Webhook</h2>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">URL:</span>{' '}
              <code className="break-all text-xs">{webhook.webhookUrl}</code>
            </p>
            <p>
              <span className="font-medium">Verify token:</span>{' '}
              <code className="text-xs">{webhook.verifyToken}</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
