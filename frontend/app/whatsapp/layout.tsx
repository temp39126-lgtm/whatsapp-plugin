'use client';

import { Sidebar } from '@/components/whatsapp/shared/Sidebar';
import { AuthGate } from '@/components/auth/AuthGate';
import { useSocket } from '@/hooks/useSocket';

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  useSocket();

  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </AuthGate>
  );
}
