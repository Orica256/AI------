export const STATUSES = [
  '気になる',
  'インターン応募',
  'インターン選考',
  'インターン参加',
  'エントリー',
  'ES提出',
  '一次面接',
  '二次面接',
  '最終面接',
  '内定',
  'お祈り',
] as const;
export type Status = (typeof STATUSES)[number];

export const ES_CATEGORIES = ['自己PR', '志望動機', 'ガクチカ', '長所・短所', '逆質問'] as const;
export type EsCategory = (typeof ES_CATEGORIES)[number];

// 志望度（1〜5）の表示ラベル
export const PRIORITY_LABELS: Record<number, string> = {
  1: '★1',
  2: '★2',
  3: '★3',
  4: '★4',
  5: '★5',
};

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

export interface Task {
  id: number;
  company_id: number;
  title: string;
  done: number;
  due_date: string | null;
  created_at: string;
}

export interface CompanyDetail extends Company {
  events: CompanyEvent[];
  tasks: Task[];
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

export interface EsTemplate {
  id: number;
  category: EsCategory;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total: number;
  byStatus: { status: string; count: number }[];
  byIndustry: { industry: string; count: number }[];
  offers: number;
  rejected: number;
  active: number;
}
