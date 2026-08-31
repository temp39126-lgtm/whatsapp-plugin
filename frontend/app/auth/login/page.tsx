'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPath } from '@/lib/auth-routes';

export default function AuthLoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getDashboardPath(user.role));
    }
  }, [isLoading, router, user]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-whatsapp-light/30 via-background to-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Sign in to your account.">
      <LoginForm />
    </AuthShell>
  );
}
