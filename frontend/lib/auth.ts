const TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY || 'whatsapp_crm_token';
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
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  window.dispatchEvent(new CustomEvent('whatsapp-crm-auth-changed'));
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
