'use client';

import { Sidebar } from '@/components/whatsapp/shared/Sidebar';
import { AuthGate } from '@/components/auth/AuthGate';
import { useSocket } from '@/hooks/useSocket';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';
import { IncomingCallManager } from '@/components/whatsapp/calls/IncomingCallManager';

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  useSocket();
  useNotificationAlerts();

  return (
    <AuthGate>
      <IncomingCallManager />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </AuthGate>
  );
}
