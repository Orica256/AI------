import { useEffect, useMemo, useState } from 'react';
import { api, AllEvent, AllTask } from '../api';
import { Company } from '../types';

interface Props {
  onSelect: (companyId: number) => void;
}

interface DayItem {
  kind: 'event' | 'deadline' | 'task';
  label: string;
  companyId: number;
  companyName: string;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 選考イベントと締切を月カレンダーで表示する
export default function CalendarView({ onSelect }: Props) {
  const [events, setEvents] = useState<AllEvent[]>([]);
  const [tasks, setTasks] = useState<AllTask[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    api.listAllEvents().then(setEvents).catch((e) => setError(e.message));
    api.listAllTasks().then(setTasks).catch(() => {});
    api.listCompanies().then(setCompanies).catch(() => {});
  }, []);

  // 日付ごとの予定マップ
  const itemsByDate = useMemo(() => {
    const map: Record<string, DayItem[]> = {};
    const push = (date: string, item: DayItem) => {
      if (!date) return;
      const key = date.slice(0, 10);
      (map[key] = map[key] || []).push(item);
    };
    for (const e of events) {
      push(e.date, { kind: 'event', label: e.title, companyId: e.company_id, companyName: e.company_name });
    }
    for (const t of tasks) {
      push(t.due_date, { kind: 'task', label: t.title, companyId: t.company_id, companyName: t.company_name });
    }
    for (const c of companies) {
      if (c.deadline) {
        push(c.deadline, { kind: 'deadline', label: '締切', companyId: c.id, companyName: c.name });
      }
    }
    return map;
  }, [events, tasks, companies]);

  // カレンダーのマス（前月の余白含む6週分）
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay(); // 0=日
    const start = new Date(year, month, 1 - startOffset);
    const arr: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      arr.push({ date: d, inMonth: d.getMonth() === month });
    }
    return arr;
  }, [cursor]);

  const todayKey = ymd(new Date());
  const monthLabel = `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`;

  if (error) return <p className="error">{error}</p>;

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>← 前月</button>
        <h2>{monthLabel}</h2>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>翌月 →</button>
        <button className="today-btn" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>今月</button>
      </div>

      <div className="calendar-grid">
        {['日', '月', '火', '水', '木', '金', '土'].map((w) => (
          <div key={w} className="cal-weekday">{w}</div>
        ))}
        {cells.map(({ date, inMonth }, i) => {
          const key = ymd(date);
          const items = itemsByDate[key] || [];
          return (
            <div
              key={i}
              className={`cal-cell ${inMonth ? '' : 'out-month'} ${key === todayKey ? 'is-today' : ''}`}
            >
              <div className="cal-date">{date.getDate()}</div>
              <div className="cal-items">
                {items.map((it, j) => (
                  <button
                    key={j}
                    className={`cal-item cal-${it.kind}`}
                    onClick={() => onSelect(it.companyId)}
                    title={`${it.companyName}：${it.label}`}
                  >
                    {it.kind === 'deadline' ? '⏰' : it.kind === 'task' ? '✅' : '📌'} {it.companyName}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="hint">📌 選考イベント / ⏰ 企業の締切 / ✅ ToDoの期日。クリックでその企業の詳細へ移動します。</p>
    </div>
  );
}
