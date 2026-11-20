'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/whatsapp/shared/Sidebar';
import { cn } from '@/lib/utils';

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inboxChatOpen =
    pathname === '/whatsapp/inbox' && Boolean(searchParams.get('conversation'));

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <div
        className={cn(
          'h-full shrink-0',
          inboxChatOpen ? 'hidden lg:block' : 'block'
        )}
      >
        <Sidebar />
      </div>
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function ShellFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar />
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export function WhatsAppAppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback>{children}</ShellFallback>}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}