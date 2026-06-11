import type { Company, CompanyDetail, CompanyEvent, Dashboard } from './types';

// Viteプロキシ経由で /api をバックエンド(3001)へ転送
const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `エラー (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getDashboard: () => request<Dashboard>('/dashboard'),

  listCompanies: (status?: string) =>
    request<Company[]>(`/companies${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  getCompany: (id: number) => request<CompanyDetail>(`/companies/${id}`),

  createCompany: (data: Partial<Company>) =>
    request<Company>('/companies', { method: 'POST', body: JSON.stringify(data) }),

  updateCompany: (id: number, data: Partial<Company>) =>
    request<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteCompany: (id: number) =>
    request<{ ok: true }>(`/companies/${id}`, { method: 'DELETE' }),

  addEvent: (companyId: number, data: { title: string; date: string }) =>
    request<CompanyEvent>(`/companies/${companyId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEvent: (id: number, data: Partial<CompanyEvent>) =>
    request<CompanyEvent>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteEvent: (id: number) =>
    request<{ ok: true }>(`/events/${id}`, { method: 'DELETE' }),
};
