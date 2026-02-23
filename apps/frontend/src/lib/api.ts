import type { McpServer, CreateServerDto, ServerHealth, RequestLog } from './types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_ADMIN_API_KEY ?? 'dev-admin-key-change-in-production';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const serversApi = {
  list: () => apiFetch<McpServer[]>('/admin/servers'),
  get: (id: string) => apiFetch<McpServer>(`/admin/servers/${id}`),
  create: (dto: CreateServerDto) =>
    apiFetch<McpServer>('/admin/servers', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: Partial<CreateServerDto>) =>
    apiFetch<McpServer>(`/admin/servers/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  remove: (id: string) =>
    apiFetch<void>(`/admin/servers/${id}`, { method: 'DELETE' }),
  enable: (id: string) =>
    apiFetch<McpServer>(`/admin/servers/${id}/enable`, { method: 'PATCH' }),
  disable: (id: string) =>
    apiFetch<McpServer>(`/admin/servers/${id}/disable`, { method: 'PATCH' }),
};

export const healthApi = {
  status: () => apiFetch<ServerHealth[]>('/admin/health'),
};

export const logsApi = {
  list: (params: Record<string, string | number | undefined>) =>
    apiFetch<{ data: RequestLog[]; total: number }>(
      `/admin/logs?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ),
      )}`,
    ),
};
