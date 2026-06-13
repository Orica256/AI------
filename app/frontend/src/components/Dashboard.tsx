import { useEffect, useState } from 'react';
import { api } from '../api';
import { STATUSES, type Dashboard as DashboardData } from '../types';
import DeadlineBadge from './DeadlineBadge';
import { deadlineInfo } from '../utils/deadline';

interface Props {
  onOpenCompany: (id: number) => void;
}

export function Dashboard({ onOpenCompany }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">読み込みエラー: {error}（バックエンドは起動していますか？）</p>;
  if (!data) return <p className="loading">読み込み中...</p>;

  // 超過・当日・3日以内の締切を「緊急」として件数を強調する
  const urgentCount = data.upcomingDeadlines.filter((d) => {
    const lv = deadlineInfo(d.deadline).level;
    return lv === 'overdue' || lv === 'today' || lv === 'soon';
  }).length;

  return (
    <div>
      <h2>ダッシュボード</h2>

      <section className="card">
        <h3>選考状況サマリー（全{data.total}社）</h3>
        <div className="status-grid">
          {STATUSES.map((s) => (
            <div key={s} className="status-cell">
              <span className="status-count">{data.byStatus[s] ?? 0}</span>
              <span className="status-label">{s}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>
          ⏰ 今後7日以内の締切
          {urgentCount > 0 && <span className="urgent-pill">🔥 緊急 {urgentCount}件</span>}
        </h3>
        {data.upcomingDeadlines.length === 0 ? (
          <p className="empty">直近の締切はありません。</p>
        ) : (
          <ul className="alert-list">
            {data.upcomingDeadlines.map((d) => (
              <li key={d.id}>
                <button className="link" onClick={() => onOpenCompany(d.id)}>
                  {d.name}
                </button>
                <span className="badge">{d.status}</span>
                <span className="dl-cell">
                  <DeadlineBadge deadline={d.deadline} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>📅 今後7日以内の予定（面接など）</h3>
        {data.upcomingEvents.length === 0 ? (
          <p className="empty">直近の予定はありません。</p>
        ) : (
          <ul className="alert-list">
            {data.upcomingEvents.map((e) => (
              <li key={e.id}>
                <button className="link" onClick={() => onOpenCompany(e.companyId)}>
                  {e.companyName}
                </button>
                <span className="event-title">{e.title}</span>
                <span className="date">{e.date}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
