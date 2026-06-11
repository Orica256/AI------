export const STATUSES = [
  '気になる',
  'エントリー',
  'ES提出',
  '一次面接',
  '二次面接',
  '最終面接',
  '内定',
  'お祈り',
] as const;
export type Status = (typeof STATUSES)[number];

export interface Company {
  id: number;
  name: string;
  industry: string | null;
  status: Status;
  priority: number;
  applied_date: string | null;
  deadline: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  eventCount?: number;
}

export interface CompanyEvent {
  id: number;
  company_id: number;
  title: string;
  date: string;
  done: number;
}

export interface CompanyDetail extends Company {
  events: CompanyEvent[];
}

export interface Dashboard {
  total: number;
  byStatus: Record<string, number>;
  upcomingDeadlines: { id: number; name: string; deadline: string; status: Status }[];
  upcomingEvents: {
    id: number;
    title: string;
    date: string;
    done: number;
    companyName: string;
    companyId: number;
  }[];
}
