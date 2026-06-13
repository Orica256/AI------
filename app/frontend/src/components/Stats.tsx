import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Stats as StatsData } from '../types';

export function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  const maxStatusCount = useMemo(
    () => Math.max(1, ...(stats?.byStatus.map((row) => row.count) ?? [0])),
    [stats],
  );
  const maxIndustryCount = useMemo(
    () => Math.max(1, ...(stats?.byIndustry.map((row) => row.count) ?? [0])),
    [stats],
  );

  if (error) return <p className="error">読み込みエラー: {error}</p>;
  if (!stats) return <p className="loading">読み込み中...</p>;

  return (
    <div>
      <h2>統計</h2>

      <section className="stats-summary">
        <div className="card stat-card">
          <span className="stat-label">総応募数</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">進行中</span>
          <strong>{stats.active}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">内定</span>
          <strong>{stats.offers}</strong>
        </div>
        <div className="card stat-card">
          <span className="stat-label">お祈り</span>
          <strong>{stats.rejected}</strong>
        </div>
      </section>

      <section className="card">
        <h3>ステータス別</h3>
        <div className="stat-bars">
          {stats.byStatus.map((row) => (
            <div key={row.status} className="stat-bar-row">
              <span className="stat-bar-label">{row.status}</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{ width: `${(row.count / maxStatusCount) * 100}%` }}
                />
              </div>
              <span className="stat-bar-count">{row.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>業界別</h3>
        {stats.byIndustry.length === 0 ? (
          <p className="empty">業界データはまだありません。</p>
        ) : (
          <div className="stat-bars">
            {stats.byIndustry.map((row) => (
              <div key={row.industry} className="stat-bar-row">
                <span className="stat-bar-label">{row.industry}</span>
                <div className="stat-bar-track">
                  <div
                    className="stat-bar-fill industry"
                    style={{ width: `${(row.count / maxIndustryCount) * 100}%` }}
                  />
                </div>
                <span className="stat-bar-count">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
