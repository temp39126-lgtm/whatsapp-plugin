'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { AUTH_ROUTES, getDashboardPath } from '@/lib/auth-routes';
import { getAuthToken, initHostAuthListener, requestHostAuth, setAuthToken } from '@/lib/auth';
import { resetSocket } from '@/lib/socket';
import type { AuthUser } from '@/types';

interface LoginOptions {
  keepSignedIn?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (
    email: string,
    password: string,
    options?: LoginOptions
  ) => Promise<{ token: string; user: AuthUser }>;
  completeLogin: (token: string, user: AuthUser) => void;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  login: async () => ({ token: '', user: null as unknown as AuthUser }),
  completeLogin: () => undefined,
  signup: async () => undefined,
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

  const completeLogin = useCallback(
    (token: string, authUser: AuthUser) => {
      setAuthToken(token);
      setUser(authUser);
      resetSocket();
      router.replace(getDashboardPath(authUser.role));
    },
    [router]
  );

  const login = useCallback(async (email: string, password: string, _options?: LoginOptions) => {
    return authApi.post<{ token: string; user: AuthUser }>('/login', {
      email,
      password,
    });
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authApi.post<{ token: string; user: AuthUser }>('/signup', {
        name,
        email,
        password,
      });
      completeLogin(result.token, result.user);
    },
    [completeLogin]
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    resetSocket();
    router.replace(AUTH_ROUTES.home);
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
        completeLogin,
        signup,
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
