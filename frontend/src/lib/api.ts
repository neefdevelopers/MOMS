const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface FetchApiOptions extends RequestInit {
  skipCache?: boolean;
  cacheTtlMs?: number;
}

// In-memory response cache & in-flight request deduplication map
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const apiCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

// Reference endpoints that rarely change and can be cached with longer TTL (60s)
const LONG_CACHE_ENDPOINTS = [
  '/clients',
  '/brands',
  '/products',
  '/users',
  '/users/departments',
  '/settings',
  '/equipment/categories',
  '/communications/types',
];

export function clearApiCache() {
  apiCache.clear();
}

export function invalidateApiCache(pattern?: string | RegExp) {
  if (!pattern) {
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('moms_token') : null;

  // On data mutations (POST, PUT, PATCH, DELETE), automatically invalidate cached data
  if (method !== 'GET') {
    clearApiCache();
  }

  const isGet = method === 'GET';
  const shouldSkipCache =
    options.skipCache ||
    options.cache === 'no-store' ||
    options.cacheTtlMs === 0 ||
    !isGet;

  // 1. Check in-memory cache for GET requests
  if (isGet && !shouldSkipCache) {
    const cached = apiCache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Return cached data immediately (0ms response time)
      return structuredClone(cached.data);
    }
  }

  // 2. Coalesce in-flight requests (request deduplication)
  if (isGet && !shouldSkipCache && inFlightRequests.has(endpoint)) {
    const result = await inFlightRequests.get(endpoint);
    return structuredClone(result);
  }

  const fetchPromise = (async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

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
          ttl = isLongCache ? 60000 : 10000; // 60s for reference data, 10s for other GETs
        }
        apiCache.set(endpoint, {
          data: structuredClone(data),
          timestamp: Date.now(),
          ttl,
        });
      }

      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);

      // If err is an API response error (has statusCode), rethrow it directly so the exact message is displayed
      if (err.statusCode) {
        throw err;
      }

      // Differentiate Network / Server / Cloudflare Tunnel Failure vs Standard HTTP Error
      if (err.name === 'AbortError') {
        const netErr: any = new Error('Request timed out while waiting for Office Operations Server response.');
        netErr.isNetworkError = true;
        netErr.remediation = 'Please check server latency or Cloudflare Tunnel status, then click Retry.';
        throw netErr;
      } else if (err.name === 'TypeError' || err.message?.includes('Failed to fetch')) {
        const netErr: any = new Error('Network connection error: Office Operations Server or Cloudflare Tunnel is unavailable.');
        netErr.isNetworkError = true;
        netErr.remediation = 'Check your internet connection, verify Cloudflare Tunnel status, and click Retry.';
        throw netErr;
      }

      throw err;
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
