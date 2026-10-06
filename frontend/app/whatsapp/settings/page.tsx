'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WhatsAppAccountSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<WhatsAppAccountSettings>('/settings/account'),
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

  useEffect(() => {
    if (!settings?.configured) return;
    setForm((prev) => ({
      phoneNumberId: prev.phoneNumberId || settings.phoneNumberId || '',
      businessAccountId: prev.businessAccountId || settings.businessAccountId || '',
      displayPhoneNumber: prev.displayPhoneNumber || settings.displayPhoneNumber || '',
      accessToken: prev.accessToken,
    }));
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: () => api.put('/settings/account', form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const canSave =
    form.phoneNumberId.trim() &&
    form.businessAccountId.trim() &&
    form.displayPhoneNumber.trim() &&
    form.accessToken.trim();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      {settings?.configured && (
        <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-800">WhatsApp Connected</p>
          <p className="text-sm text-green-700">
            {settings.displayPhoneNumber} · {settings.connectionStatus}
          </p>
          {settings.callingEnabled ? (
            <p className="mt-1 text-xs text-green-600">Calling enabled</p>
          ) : (
            <p className="mt-1 text-xs text-green-600">
              Calling disabled (requires Meta Business Calling)
            </p>
          )}
        </div>
      )}

      {isAdmin ? (
        <>
          <section className="mb-8 max-w-lg space-y-4">
            <h2 className="text-lg font-medium">WhatsApp Account</h2>
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
            <Button
              variant="whatsapp"
              onClick={() => saveSettings.mutate()}
              disabled={saveSettings.isPending || !canSave}
            >
              Save Configuration
            </Button>
            {!canSave && (
              <p className="text-sm text-muted-foreground">
                Fill all four fields before saving. The access token is required each time you update
                settings (it is not shown again after save).
              </p>
            )}
            {saveSettings.isError && (
              <p className="text-sm text-destructive">{saveSettings.error.message}</p>
            )}
          </section>

          {webhook && (
            <section className="max-w-lg space-y-2">
              <h2 className="text-lg font-medium">Webhook Configuration</h2>
              <div className="rounded bg-muted p-3 text-sm">
                <p>
                  <span className="font-medium">URL:</span> {webhook.webhookUrl}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Verify Token:</span> {webhook.verifyToken}
                </p>
              </div>
            </section>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">
          Personal settings. Contact your admin for WhatsApp configuration.
        </p>
      )}
    </div>
  );
}
