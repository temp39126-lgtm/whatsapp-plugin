'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.role === 'ADMIN' ? '/whatsapp/admin' : '/whatsapp/user');
      return;
    }

    if (!isLoading && !user) {
      router.replace('/?login=1');
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-whatsapp-light/30 via-background to-background px-4">
      <LoginForm onBack={() => router.push('/')} />
    </div>
  );
}
