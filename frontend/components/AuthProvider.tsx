'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { getAuthToken, initHostAuthListener, requestHostAuth, setAuthToken } from '@/lib/auth';
import { resetSocket } from '@/lib/socket';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  login: async () => undefined,
  logout: () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(() => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    authApi
      .get<AuthUser>('/me')
      .then(setUser)
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.post<{ token: string; user: AuthUser }>('/login', {
        email,
        password,
      });
      setAuthToken(result.token);
      setUser(result.user);
      resetSocket();
      router.replace(result.user.role === 'ADMIN' ? '/whatsapp/admin' : '/whatsapp/user');
    },
    [router]
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    resetSocket();
    router.replace('/login');
  }, [router]);

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
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'ADMIN',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
