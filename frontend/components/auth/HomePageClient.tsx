'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { useAuth } from '@/components/AuthProvider';

export function HomePageClient() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showLogin, setShowLogin] = useState(searchParams.get('login') === '1');

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.role === 'ADMIN' ? '/whatsapp/admin' : '/whatsapp/user');
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (searchParams.get('login') === '1') {
      setShowLogin(true);
    }
  }, [searchParams]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-whatsapp-light/30 via-background to-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-whatsapp-light/30 via-background to-background px-4 py-10">
      {showLogin ? (
        <LoginForm onBack={() => setShowLogin(false)} />
      ) : (
        <WelcomeScreen onLoginClick={() => setShowLogin(true)} />
      )}
    </div>
  );
}
