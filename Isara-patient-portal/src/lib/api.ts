// Use relative paths for API calls - Vite proxy will forward /api to backend
// This works in both development (via proxy) and production (same origin)
const API_URL = import.meta.env.VITE_API_URL || '';

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

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('izara_user');
    window.location.href = '/login';
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
