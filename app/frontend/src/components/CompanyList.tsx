import { useEffect, useState } from 'react';
import { api } from '../api';
import { STATUSES, type Company, type Status } from '../types';

interface Props {
  onOpenCompany: (id: number) => void;
}

const emptyForm = {
  name: '',
  industry: '',
  status: '気になる' as Status,
  priority: 3,
  applied_date: '',
  deadline: '',
  memo: '',
};

export function CompanyList({ onOpenCompany }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const load = (status?: string) => {
    api.listCompanies(status || undefined).then(setCompanies).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createCompany({
        ...form,
        priority: Number(form.priority),
      });
      setForm(emptyForm);
      setShowForm(false);
      load(filter);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <div className="list-header">
        <h2>企業一覧</h2>
        <button className="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '閉じる' : '＋ 企業を追加'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <form className="card form" onSubmit={handleCreate}>
          <h3>新規企業の登録</h3>
          <div className="form-row">
            <label>
              企業名 *
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              業界
              <input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              ステータス
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              志望度 (1〜5)
              <input
                type="number"
                min={1}
                max={5}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              応募日
              <input
                type="date"
                value={form.applied_date}
                onChange={(e) => setForm({ ...form, applied_date: e.target.value })}
              />
            </label>
            <label>
              締切
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </label>
          </div>
          <label>
            メモ
            <textarea
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
            />
          </label>
          <button type="submit" className="primary">
            登録する
          </button>
        </form>
      )}

      <div className="filter-bar">
        <button className={filter === '' ? 'active' : ''} onClick={() => setFilter('')}>
          すべて
        </button>
        {STATUSES.map((s) => (
          <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {companies.length === 0 ? (
        <p className="empty">該当する企業がありません。</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>企業名</th>
              <th>業界</th>
              <th>ステータス</th>
              <th>志望度</th>
              <th>締切</th>
              <th>予定</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} onClick={() => onOpenCompany(c.id)} className="clickable">
                <td>{c.name}</td>
                <td>{c.industry || '-'}</td>
                <td>
                  <span className="badge">{c.status}</span>
                </td>
                <td>{'★'.repeat(c.priority)}</td>
                <td>{c.deadline || '-'}</td>
                <td>{c.eventCount ? `${c.eventCount}件` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
