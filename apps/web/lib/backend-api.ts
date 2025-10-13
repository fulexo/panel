const DEFAULT_LOCAL_API_BASE = 'http://127.0.0.1:3001';

const ensureHttpUrl = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed.replace(/^\/+/, '')}`;
};

const isLocalUrl = (url: string): boolean => {
  const normalized = url.toLowerCase();
  return (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.startsWith('http://0.0.0.0') ||
    normalized.startsWith('http://[::1]')
  );
};

/**
 * Resolve the base URL that Next.js API routes should use when proxying
 * requests to the backend service.
 */
export const getBackendApiBaseUrl = (): string => {
  const explicit = ensureHttpUrl(process.env['BACKEND_API_BASE']);
  if (explicit) {
    return explicit;
  }

  const candidate = (
    ensureHttpUrl(process.env['API_BASE_URL']) ||
    // Intentionally ignore NEXT_PUBLIC_API_BASE on the server to avoid self-proxying to port 3000
    ensureHttpUrl(process.env['DOMAIN_API'])
  );

  if (!candidate) {
    console.log('No candidate found, using default:', DEFAULT_LOCAL_API_BASE);
    return DEFAULT_LOCAL_API_BASE;
  }

  if (process.env['NODE_ENV'] !== 'production' && !isLocalUrl(candidate)) {
    return DEFAULT_LOCAL_API_BASE;
  }

  return candidate;
};

/**
 * Resolve the base URL the browser/client should prepend to API requests.
 * When possible we return an empty string so the client talks to the Next.js
 * API routes on the same origin, which keeps authentication cookies intact.
 */
export const getClientApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return getBackendApiBaseUrl();
  }

  const explicit = ensureHttpUrl(process.env['NEXT_PUBLIC_API_BASE']);

  if (!explicit || isLocalUrl(explicit)) {
    return '';
  }

  if (process.env['NEXT_PUBLIC_FORCE_ABSOLUTE_API'] === 'true') {
    return explicit;
  }

  return '';
};
