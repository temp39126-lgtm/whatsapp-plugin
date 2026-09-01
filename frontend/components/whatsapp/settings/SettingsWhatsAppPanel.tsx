'use client';

import { Phone } from 'lucide-react';
import type { WhatsAppConnectionStatus } from '@/types';

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

interface SettingsWhatsAppPanelProps {
  connection?: WhatsAppConnectionStatus;
  isLoading: boolean;
}

export function SettingsWhatsAppPanel({ connection, isLoading }: SettingsWhatsAppPanelProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <WhatsAppStatusBanner connection={connection ?? { configured: false }} />
      {connection?.configured && (
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Business number</p>
            <p className="text-sm font-medium">{connection.displayPhoneNumber ?? 'Not available'}</p>
          </div>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Contact your admin if WhatsApp needs to be connected or updated.
      </p>
    </div>
  );
}
