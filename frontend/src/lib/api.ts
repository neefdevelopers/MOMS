export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!envUrl) {
    return 'http://localhost:4000/api/v1';
  }
  const clean = envUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api/v1')) {
    return clean;
  }
  if (clean.endsWith('/api')) {
    return `${clean}/v1`;
  }
  return `${clean}/api/v1`;
}

export const API_BASE_URL = getApiBaseUrl();

export function resolveFileUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  if (
    rawUrl.startsWith('http://') ||
    rawUrl.startsWith('https://') ||
    rawUrl.startsWith('data:') ||
    rawUrl.startsWith('blob:')
  ) {
    return rawUrl;
  }
  const apiBase = getApiBaseUrl();
  const origin = apiBase.replace(/\/api(\/v1)?\/?$/, '');
  const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${origin}${cleanPath}`;
}

export interface FetchApiOptions extends RequestInit {
  skipCache?: boolean;
  cacheTtlMs?: number;
  skipCacheInvalidation?: boolean;
}

// In-memory response cache & in-flight request deduplication map
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const apiCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

// Reference endpoints that rarely change and can be cached with longer TTL (5 minutes)
const LONG_CACHE_ENDPOINTS = [
  '/clients',
  '/brands',
  '/products',
  '/users',
  '/users/departments',
  '/settings',
  '/settings/default-page-size',
  '/equipment',
  '/equipment/categories',
  '/communications/types',
  '/permissions',
  '/permissions/overview',
];

export function clearApiCache() {
  apiCache.clear();
}

export function invalidateApiCache(pattern?: string | RegExp) {
  if (!pattern) {
    // Preserve long-cache reference endpoints unless explicitly specified
    const keysToDelete: string[] = [];
    apiCache.forEach((_, key) => {
      const isRef = LONG_CACHE_ENDPOINTS.some((ep) => key.startsWith(ep));
      if (!isRef) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((k) => apiCache.delete(k));
    return;
  }
  if (pattern === 'all') {
    apiCache.clear();
    return;
  }
  const keysToDelete: string[] = [];
  apiCache.forEach((_, key) => {
    if (typeof pattern === 'string' && key.includes(pattern)) {
      keysToDelete.push(key);
    } else if (pattern instanceof RegExp && pattern.test(key)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((k) => apiCache.delete(k));
}

export async function fetchApi(
  endpoint: string,
  options: FetchApiOptions = {},
  timeoutMs = 30000,
): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('moms_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken')
      : null;

  // On real data mutations (POST, PUT, PATCH, DELETE), execute targeted cache invalidation
  const isPassive =
    options.skipCacheInvalidation ||
    endpoint.startsWith('/recent-access') ||
    endpoint.startsWith('/favorites/check') ||
    endpoint.startsWith('/notifications/system-alerts/scan');

  if (method !== 'GET' && !isPassive) {
    if (endpoint.startsWith('/calendar')) {
      invalidateApiCache('/calendar');
      invalidateApiCache('/reports');
      invalidateApiCache('/client-review');
    } else if (endpoint.startsWith('/projects')) {
      invalidateApiCache('/projects');
      invalidateApiCache('/tasks');
      invalidateApiCache('/reports');
    } else if (endpoint.startsWith('/tasks')) {
      invalidateApiCache('/tasks');
      invalidateApiCache('/projects');
      invalidateApiCache('/reports');
    } else if (endpoint.startsWith('/graphic-reqs')) {
      invalidateApiCache('/graphic-reqs');
      invalidateApiCache('/calendar');
      invalidateApiCache('/reports');
    } else if (endpoint.startsWith('/equipment')) {
      invalidateApiCache('/equipment');
      invalidateApiCache('/reports');
    } else if (endpoint.startsWith('/clients') || endpoint.startsWith('/brands') || endpoint.startsWith('/products')) {
      invalidateApiCache('/clients');
      invalidateApiCache('/brands');
      invalidateApiCache('/products');
      invalidateApiCache('/reports');
    } else if (endpoint.startsWith('/notifications')) {
      invalidateApiCache('/notifications');
    } else if (endpoint.startsWith('/communications')) {
      invalidateApiCache('/communications');
    } else if (endpoint.startsWith('/attendance')) {
      invalidateApiCache('/attendance');
      invalidateApiCache('/reports');
    } else if (endpoint.startsWith('/users')) {
      invalidateApiCache('/users');
    } else {
      invalidateApiCache();
    }
  }

  const isGet = method === 'GET';
  const shouldSkipCache =
    options.skipCache ||
    options.cache === 'no-store' ||
    options.cacheTtlMs === 0 ||
    !isGet;

  // 1. Check in-memory cache for GET requests (Fresh or Stale-While-Revalidate)
  if (isGet && !shouldSkipCache) {
    const cached = apiCache.get(endpoint);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < cached.ttl) {
        // Return fresh cached data immediately (0ms, zero serialization overhead)
        return cached.data;
      } else if (age < cached.ttl * 3) {
        // Stale-While-Revalidate: Return stale data instantly and revalidate in background
        setTimeout(() => {
          fetchApi(endpoint, { ...options, skipCache: true }).catch(() => {});
        }, 0);
        return cached.data;
      }
    }
  }

  // 2. Coalesce in-flight requests (request deduplication)
  if (isGet && !shouldSkipCache && inFlightRequests.has(endpoint)) {
    return inFlightRequests.get(endpoint);
  }

  const fetchPromise = (async () => {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let attempt = 0;
    const maxAttempts = isGet ? 2 : 1;

    while (attempt < maxAttempts) {
      attempt++;
      // Setup AbortController timeout to catch hung requests / timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/login')) {
            localStorage.removeItem('moms_token');
            localStorage.removeItem('moms_user');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          const err: any = new Error(errorData.message || 'API request failed');
          err.remediation = errorData.remediation;
          err.statusCode = response.status;
          throw err;
        }

        const data = await response.json();

        // Determine appropriate TTL
        if (isGet && !shouldSkipCache) {
          let ttl = options.cacheTtlMs;
          if (ttl === undefined) {
            const isLongCache = LONG_CACHE_ENDPOINTS.some((ep) => endpoint.startsWith(ep));
            ttl = isLongCache ? 300000 : 30000; // 5 min for reference data, 30s for general GETs
          }
          apiCache.set(endpoint, {
            data,
            timestamp: Date.now(),
            ttl,
          });
        }

        return data;
      } catch (err: any) {
        clearTimeout(timeoutId);

        // If err is an API response error (has statusCode), rethrow it directly
        if (err.statusCode) {
          throw err;
        }

        // If we have remaining attempts on GET requests, retry once after a short delay
        if (attempt < maxAttempts && isGet) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }

        // Differentiate Network / Server Failure vs Standard HTTP Error
        if (err.name === 'AbortError') {
          const netErr: any = new Error(`Request timed out while waiting for backend response (${API_BASE_URL}).`);
          netErr.isNetworkError = true;
          netErr.remediation = 'If using Render free tier, the backend may be waking up from cold start (~50s). Please wait a moment and retry.';
          throw netErr;
        } else if (err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
          const isLocalhostInProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && API_BASE_URL.includes('localhost');
          const message = isLocalhostInProd
            ? `Backend URL is pointing to localhost (${API_BASE_URL}). NEXT_PUBLIC_API_URL must be configured in Vercel.`
            : `Cannot reach backend server at ${API_BASE_URL}.`;
          const netErr: any = new Error(message);
          netErr.isNetworkError = true;
          netErr.remediation = isLocalhostInProd
            ? 'Go to Vercel Project Settings → Environment Variables → Add NEXT_PUBLIC_API_URL (e.g. https://your-backend.onrender.com/api/v1) and trigger a Redeploy.'
            : 'Check if your Render backend is active, or wait ~50s if the free tier container is waking up from inactivity.';
          throw netErr;
        }

        throw err;
      }
    }
  })();

  if (isGet && !shouldSkipCache) {
    inFlightRequests.set(endpoint, fetchPromise);
    try {
      const data = await fetchPromise;
      return data;
    } finally {
      inFlightRequests.delete(endpoint);
    }
  }

  return fetchPromise;
}
