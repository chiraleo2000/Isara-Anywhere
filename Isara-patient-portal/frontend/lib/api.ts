// Use relative paths when baked API URL origin differs from page origin (Docker E2E, Cloud Run).
import { resolveApiBaseUrl } from '../utils/resolveApiBaseUrl';

function apiBaseUrl(): string {
  return resolveApiBaseUrl();
}
function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${apiBaseUrl()}${endpoint}`, { ...options, headers, credentials: 'include' });
  
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('izara_user');
    globalThis.location.href = '/login';
    throw new Error('Session expired');
  }
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  
  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  
  post: <T>(endpoint: string, data?: unknown) => 
    request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  
  put: <T>(endpoint: string, data?: unknown) => 
    request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  
  delete: <T>(endpoint: string, options?: { data?: unknown }) => 
    request<T>(endpoint, { method: 'DELETE', body: options?.data ? JSON.stringify(options.data) : undefined }),
};

export default api;
