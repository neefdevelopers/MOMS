const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function fetchApi(endpoint: string, options: RequestInit = {}, timeoutMs = 30000) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('moms_token') : null;

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

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);

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
}
