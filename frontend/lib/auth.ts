const LEGACY_TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY || 'whatsapp_crm_token';
const HOST_ORIGIN = process.env.NEXT_PUBLIC_HOST_SAAS_ORIGIN;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const HOST_AUTH_MESSAGE_TYPE = 'WHATSAPP_CRM_AUTH';

function clearLegacyStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return null;
}

export function setAuthToken(_token: string | null): void {
  if (typeof window === 'undefined') return;
  clearLegacyStoredToken();
  window.dispatchEvent(new CustomEvent('whatsapp-crm-auth-changed'));
}

export function getAuthHeaders(): Record<string, string> {
  return {};
}

export async function establishSessionFromToken(token: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/establish-session`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to establish session');
  }
}

export function initHostAuthListener(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handler = (event: MessageEvent) => {
    if (!HOST_ORIGIN) return;
    if (event.origin !== HOST_ORIGIN) return;

    const data = event.data as { type?: string; token?: string } | null;
    if (data?.type === HOST_AUTH_MESSAGE_TYPE && data.token) {
      void establishSessionFromToken(data.token)
        .then(() => {
          window.dispatchEvent(new CustomEvent('whatsapp-crm-auth-changed'));
        })
        .catch(() => undefined);
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

export function requestHostAuth(): void {
  if (typeof window === 'undefined' || !HOST_ORIGIN) return;
  window.parent.postMessage({ type: 'WHATSAPP_CRM_REQUEST_AUTH' }, HOST_ORIGIN);
}

export function clearLegacyAuthStorage(): void {
  clearLegacyStoredToken();
}
