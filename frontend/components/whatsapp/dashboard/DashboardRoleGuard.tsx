'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

function LoadingSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
    </div>
  );
}

export function DashboardRoleGuard({
  allowedRole,
  children,
}: {
  allowedRole: 'ADMIN' | 'USER';
  children: React.ReactNode;
}) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;

    if (allowedRole === 'ADMIN' && !isAdmin) {
      router.replace('/whatsapp/user');
    } else if (allowedRole === 'USER' && isAdmin) {
      router.replace('/whatsapp/admin');
    }
  }, [allowedRole, isAdmin, isLoading, router, user]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  if (allowedRole === 'ADMIN' && !isAdmin) {
    return null;
  }

  if (allowedRole === 'USER' && isAdmin) {
    return null;
  }

  return children;
}
