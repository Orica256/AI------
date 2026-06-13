import { useEffect, useState } from 'react';
import { api } from '../api';
import { Company, STATUSES, Status, PRIORITY_LABELS } from '../types';
import { deadlineInfo } from '../utils/deadline';

interface Props {
  onSelect: (companyId: number) => void;
}

// 選考段階をカンバン（列）で俯瞰し、ドラッグ＆ドロップで段階を移動できる
export default function KanbanBoard({ onSelect }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStatus, setOverStatus] = useState<Status | null>(null);

  function load() {
    api.listCompanies().then(setCompanies).catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
  }, []);

  async function moveTo(companyId: number, status: Status) {
    const target = companies.find((c) => c.id === companyId);
    if (!target || target.status === status) return;
    // 楽観的更新
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, status } : c)));
    try {
      await api.updateCompany(companyId, { status });
    } catch (e: any) {
      setError(e.message);
      load(); // 失敗時は再取得して戻す
    }
  }

  function onDrop(status: Status) {
    if (dragId != null) moveTo(dragId, status);
    setDragId(null);
    setOverStatus(null);
  }

  if (error) return <p className="error">{error}</p>;

  return (
    <div className="kanban">
      <div
        className="kanban-board"
        style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(0, 1fr))` }}
      >
        {STATUSES.map((status) => {
          const items = companies.filter((c) => c.status === status);
          return (
            <div
              key={status}
              className={`kanban-col ${overStatus === status ? 'drop-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStatus(status);
              }}
              onDragLeave={() => setOverStatus((s) => (s === status ? null : s))}
              onDrop={() => onDrop(status)}
            >
              <div className="kanban-col-head">
                <span>{status}</span>
                <span className="kanban-count">{items.length}</span>
              </div>
              <div className="kanban-col-body">
                {items.map((c) => {
                  const info = deadlineInfo(c.deadline);
                  return (
                    <div
                      key={c.id}
                      className="kanban-card"
                      draggable
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => onSelect(c.id)}
                      title="クリックで詳細／ドラッグで段階を移動"
                    >
                      <div className="kanban-card-name">{c.name}</div>
                      <div className="kanban-card-meta">
                        <span className={`prio prio-${c.priority}`}>{PRIORITY_LABELS[c.priority]}</span>
                        {c.deadline && (
                          <span className={`deadline-badge level-${info.level}`}>
                            <span className="dl-label">{info.label}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <div className="kanban-empty">（なし）</div>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="hint">カードをドラッグして別の列に移すと、選考ステータスが変わります。</p>
    </div>
  );
}
