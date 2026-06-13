import type { Company, CompanyDetail, CompanyEvent, Dashboard, Task } from './types';

// エクスポート/インポートのデータ束（ローカルJSONバックアップ）
export interface ExportBundle {
  version: number;
  exportedAt?: string;
  companies: Company[];
  events: CompanyEvent[];
  tasks: Task[];
}

// 全イベント（カレンダー用・企業名付き）
export interface AllEvent {
  id: number;
  company_id: number;
  title: string;
  date: string;
  done: number;
  company_name: string;
}

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

  // カレンダー用：全イベント（企業名付き）
  listAllEvents: () => request<AllEvent[]>('/events'),

  // ToDo（タスク）
  addTask: (companyId: number, data: { title: string; due_date?: string | null }) =>
    request<Task>(`/companies/${companyId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: number, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: number) =>
    request<{ ok: true }>(`/tasks/${id}`, { method: 'DELETE' }),

  // データ入出力（ローカルバックアップ）
  exportData: () => request<ExportBundle>('/export'),
  importData: (bundle: ExportBundle) =>
    request<{ ok: true }>('/import', { method: 'POST', body: JSON.stringify(bundle) }),
};
