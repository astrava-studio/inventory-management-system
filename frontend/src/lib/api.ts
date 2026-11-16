const DEFAULT_PROD_API = 'https://inventory-management-system-3i9g.onrender.com';
const RAW_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  (import.meta.env.PROD ? DEFAULT_PROD_API : '');
const API_BASE = RAW_BASE ? (RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE}/api`) : '/api';

export class ApiError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('inventory_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
    localStorage.removeItem('inventory_token');
    localStorage.removeItem('inventory_user');
    sessionStorage.clear();
    window.location.href = '/login';
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  // Handle CSV responses
  const contentType = res.headers.get('content-type');
  if (contentType && (contentType.includes('text/csv') || endpoint.includes('export-csv'))) {
    return (await res.text()) as unknown as T;
  }

  let data: any;
  const rawText = await res.text();
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new ApiError(
      `Backend service returned unexpected response (${res.status} ${res.statusText || 'Error'}). Ensure backend is live.`,
      res.status
    );
  }

  if (!res.ok) {
    throw new ApiError(
      data?.message || `API request failed with status ${res.status}`,
      res.status,
      data?.details || data?.errors
    );
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
