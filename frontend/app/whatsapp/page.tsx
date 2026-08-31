'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function WhatsAppDashboardPage() {
  const { isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAdmin ? '/whatsapp/admin' : '/whatsapp/user');
  }, [isAdmin, isLoading, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
    </div>
  );
}
