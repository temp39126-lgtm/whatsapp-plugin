'use client';

import { Mail } from 'lucide-react';
import type { EmailSettingsStatus } from '@/types';

function EmailStatusBanner({ email }: { email: EmailSettingsStatus }) {
  if (!email.configured) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
        <p className="font-medium text-yellow-800">Email not configured</p>
        <p className="mt-1 text-sm text-yellow-700">
          Set SMTP environment variables on the server to send assignment emails when an admin
          assigns a chat to an agent.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
      <p className="font-medium text-green-800">Email notifications ready</p>
      <p className="mt-1 text-sm text-green-700">
        Agents with assignment emails enabled will be notified when a chat is assigned to them.
      </p>
    </div>
  );
}

interface SettingsEmailPanelProps {
  email?: EmailSettingsStatus;
  isLoading: boolean;
}

export function SettingsEmailPanel({ email, isLoading }: SettingsEmailPanelProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  const status = email ?? {
    configured: false,
    smtpHost: null,
    smtpPort: 587,
    fromAddress: null,
    frontendUrl: 'http://localhost:3000',
    authConfigured: false,
  };

  return (
    <div className="space-y-4 p-4">
      <EmailStatusBanner email={status} />

      <div className="rounded-xl border bg-card px-4 py-3 text-sm">
        <div className="mb-3 flex items-center gap-2 font-medium">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Server configuration
        </div>
        <dl className="space-y-2 text-muted-foreground">
          <div className="flex justify-between gap-4">
            <dt>SMTP host</dt>
            <dd className="text-right text-foreground">{status.smtpHost ?? 'Not set'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>SMTP port</dt>
            <dd className="text-right text-foreground">{status.smtpPort}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>From address</dt>
            <dd className="text-right text-foreground">{status.fromAddress ?? 'Not set'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>SMTP auth</dt>
            <dd className="text-right text-foreground">
              {status.authConfigured ? 'Configured' : 'Optional / not set'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Inbox link base URL</dt>
            <dd className="max-w-[55%] truncate text-right text-foreground">{status.frontendUrl}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Environment variables</p>
        <p className="mt-2">
          Configure on the backend server: <code className="text-xs">SMTP_HOST</code>,{' '}
          <code className="text-xs">SMTP_PORT</code>, <code className="text-xs">SMTP_USER</code>,{' '}
          <code className="text-xs">SMTP_PASS</code>, <code className="text-xs">EMAIL_FROM</code>,{' '}
          and <code className="text-xs">FRONTEND_URL</code>.
        </p>
      </div>
    </div>
  );
}
