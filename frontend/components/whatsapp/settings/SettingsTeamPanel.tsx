'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Settings shortcut — team creation lives under Staff & Members → Add New User. */
export function SettingsTeamPanel() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/whatsapp/team/new');
  }, [router]);

  return (
    <div className="flex h-full min-h-[12rem] items-center justify-center p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
    </div>
  );
}