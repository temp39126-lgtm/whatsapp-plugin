'use client';

import { AuthGate } from '@/components/auth/AuthGate';
import { WhatsAppAppShell } from '@/components/whatsapp/shared/WhatsAppAppShell';
import { useSocket } from '@/hooks/useSocket';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';
import { IncomingCallManager } from '@/components/whatsapp/calls/IncomingCallManager';

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  useSocket();
  useNotificationAlerts();

  return (
    <AuthGate>
      <IncomingCallManager />
      <WhatsAppAppShell>{children}</WhatsAppAppShell>
    </AuthGate>
  );
}
