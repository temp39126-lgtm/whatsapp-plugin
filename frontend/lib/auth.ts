const TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY || 'whatsapp_crm_token';
const LOGGED_OUT_KEY = 'whatsapp_crm_logged_out';
const HOST_ORIGIN = process.env.NEXT_PUBLIC_HOST_SAAS_ORIGIN;

export const HOST_AUTH_MESSAGE_TYPE = 'WHATSAPP_CRM_AUTH';

let cachedToken: string | null = null;

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (cachedToken) return cachedToken;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  cachedToken = token;
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(LOGGED_OUT_KEY);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  window.dispatchEvent(new CustomEvent('whatsapp-crm-auth-changed'));
}

export function isExplicitlyLoggedOut(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(LOGGED_OUT_KEY) === '1';
}

export function clearExplicitLogout(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LOGGED_OUT_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function initHostAuthListener(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handler = (event: MessageEvent) => {
    if (HOST_ORIGIN && event.origin !== HOST_ORIGIN) return;

    const data = event.data as { type?: string; token?: string } | null;
    if (data?.type === HOST_AUTH_MESSAGE_TYPE && data.token) {
      setAuthToken(data.token);
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

export function requestHostAuth(): void {
  if (typeof window === 'undefined') return;
  window.parent.postMessage({ type: 'WHATSAPP_CRM_REQUEST_AUTH' }, HOST_ORIGIN || '*');
}

/** Clears stored JWT and marks the session logged out until sign-in again. */
export function logout(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(LOGGED_OUT_KEY, '1');
  }
  setAuthToken(null);
}
