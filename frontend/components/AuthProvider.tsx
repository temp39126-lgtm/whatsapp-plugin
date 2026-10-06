'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { initHostAuthListener, requestHostAuth, logout as clearAuthToken, isExplicitlyLoggedOut, clearExplicitLogout } from '@/lib/auth';
import { resetSocket } from '@/lib/socket';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  logout: () => void;
  signInAgain: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  logout: () => undefined,
  signInAgain: () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = () => {
    setIsLoading(true);
    if (isExplicitlyLoggedOut()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    api
      .get<AuthUser>('/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const cleanupHostAuth = initHostAuthListener();
    requestHostAuth();
    loadUser();

    const onAuthChanged = () => {
      resetSocket();
      loadUser();
    };

    window.addEventListener('whatsapp-crm-auth-changed', onAuthChanged);
    return () => {
      cleanupHostAuth();
      window.removeEventListener('whatsapp-crm-auth-changed', onAuthChanged);
    };
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    resetSocket();
    setUser(null);
  };

  const handleSignInAgain = () => {
    clearExplicitLogout();
    requestHostAuth();
    loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'ADMIN',
        logout: handleLogout,
        signInAgain: handleSignInAgain,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
