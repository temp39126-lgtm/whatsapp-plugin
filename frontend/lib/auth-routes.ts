export const AUTH_ROUTES = {
  login: '/auth/login',
  signup: '/auth/signup',
  home: '/',
} as const;

export function getDashboardPath(role: 'ADMIN' | 'USER'): string {
  return role === 'ADMIN' ? '/whatsapp/admin' : '/whatsapp/user';
}
