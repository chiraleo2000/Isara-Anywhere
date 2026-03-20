import { SecureTokenStore } from '../auth/SecureTokenStore';

const PATIENT_API_URL = process.env.EXPO_PUBLIC_PATIENT_API_URL || 'http://10.0.2.2:3005';
const DOCTOR_AUTH_URL = process.env.EXPO_PUBLIC_DOCTOR_AUTH_URL || 'http://10.0.2.2:3011';
const DOCTOR_API_URL = process.env.EXPO_PUBLIC_DOCTOR_API_URL || 'http://10.0.2.2:3009';
const MEETING_API_URL = process.env.EXPO_PUBLIC_MEETING_API_URL || 'http://10.0.2.2:3020';

export type ApiTarget = 'patient' | 'doctorAuth' | 'doctorApi' | 'meeting';

const BASE_URLS: Record<ApiTarget, string> = {
  patient: PATIENT_API_URL,
  doctorAuth: DOCTOR_AUTH_URL,
  doctorApi: DOCTOR_API_URL,
  meeting: MEETING_API_URL,
};

export function getBaseUrl(target: ApiTarget): string {
  return BASE_URLS[target];
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T>(
  target: ApiTarget,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = getBaseUrl(target);
  const token = await SecureTokenStore.getToken();

  const existingHeaders = (options.headers ?? {}) as Record<string, string>;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...existingHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText };
    }
    const errorObj = errorData as { error?: string } | undefined;
    const message = errorObj?.error ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(target: ApiTarget, endpoint: string) =>
    apiClient<T>(target, endpoint, { method: 'GET' }),

  post: <T>(target: ApiTarget, endpoint: string, body?: unknown) =>
    apiClient<T>(target, endpoint, {
      method: 'POST',
      body: body === null || body === undefined ? undefined : JSON.stringify(body),
    }),

  put: <T>(target: ApiTarget, endpoint: string, body?: unknown) =>
    apiClient<T>(target, endpoint, {
      method: 'PUT',
      body: body === null || body === undefined ? undefined : JSON.stringify(body),
    }),

  delete: <T>(target: ApiTarget, endpoint: string) =>
    apiClient<T>(target, endpoint, { method: 'DELETE' }),
};
