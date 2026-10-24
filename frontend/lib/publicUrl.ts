/**
 * Resolve API/Socket origin in the browser. When the app and /api share one public
 * host (Caddy reverse proxy), always use the page origin so session cookies match.
 */
export function getApiOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  const fallback = envUrl || 'http://localhost:5000';

  if (typeof window === 'undefined') {
    return fallback;
  }

  const pageOrigin = window.location.origin;

  if (!envUrl) {
    return pageOrigin;
  }

  try {
    if (new URL(envUrl).host === new URL(pageOrigin).host) {
      return pageOrigin;
    }
  } catch {
    return fallback;
  }

  return envUrl;
}

export function getSocketOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '');
  if (!envUrl) {
    return getApiOrigin();
  }

  if (typeof window === 'undefined') {
    return envUrl;
  }

  try {
    if (new URL(envUrl).host === new URL(window.location.origin).host) {
      return window.location.origin;
    }
  } catch {
    return getApiOrigin();
  }

  return envUrl;
}
