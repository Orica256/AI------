// 締切までの残日数と警告レベルを計算するユーティリティ

export type DeadlineLevel = 'none' | 'overdue' | 'today' | 'soon' | 'warn' | 'normal';

export interface DeadlineInfo {
  level: DeadlineLevel;
  days: number | null; // 残日数（負なら超過）。締切なしは null
  label: string; // 表示用ラベル
}

// 日付文字列（YYYY-MM-DD）の今日との差（日数）。今日=0
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function deadlineInfo(dateStr: string | null | undefined): DeadlineInfo {
  const days = daysUntil(dateStr);
  if (days === null) return { level: 'none', days: null, label: '—' };
  if (days < 0) return { level: 'overdue', days, label: `${Math.abs(days)}日超過` };
  if (days === 0) return { level: 'today', days, label: '今日' };
  if (days <= 3) return { level: 'soon', days, label: `あと${days}日` };
  if (days <= 7) return { level: 'warn', days, label: `あと${days}日` };
  return { level: 'normal', days, label: `あと${days}日` };
}
