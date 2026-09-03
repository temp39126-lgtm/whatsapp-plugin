'use client';

import { Sidebar } from '@/components/whatsapp/shared/Sidebar';
import { AuthGate } from '@/components/auth/AuthGate';
import { useSocket } from '@/hooks/useSocket';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  useSocket();
  useNotificationAlerts();

  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </AuthGate>
  );
}
