'use client';

import { Sidebar } from '@/components/whatsapp/shared/Sidebar';
import { useSocket } from '@/hooks/useSocket';

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  useSocket();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
