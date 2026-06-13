import { useEffect, useState } from 'react';
import { api } from '../api';
import { STATUSES, type Company, type Status } from '../types';
import DeadlineBadge from './DeadlineBadge';
import { daysUntil } from '../utils/deadline';

type SortKey = 'default' | 'deadline' | 'priority' | 'name-asc' | 'name-desc';

// ひらがな→カタカナに正規化し、かな表記ゆれ（ひら/カタ）を吸収する
function normalizeKana(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

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
  const [keyword, setKeyword] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('default');
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

  // 検索（企業名・業界の部分一致）と並べ替えはクライアント側で適用する
  const visible = companies
    .filter((c) => {
      const k = normalizeKana(keyword.trim());
      if (!k) return true;
      return normalizeKana(c.name).includes(k) || normalizeKana(c.industry ?? '').includes(k);
    })
    .sort((a, b) => {
      if (sortKey === 'name-asc') return a.name.localeCompare(b.name, 'ja');
      if (sortKey === 'name-desc') return b.name.localeCompare(a.name, 'ja');
      if (sortKey === 'priority') return b.priority - a.priority;
      if (sortKey === 'deadline') {
        const da = daysUntil(a.deadline);
        const db = daysUntil(b.deadline);
        if (da === null && db === null) return 0;
        if (da === null) return 1; // 締切なしは末尾
        if (db === null) return -1;
        return da - db; // 残日数が小さい（＝近い／超過）ほど先頭
      }
      return 0;
    });

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

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="🔍 企業名・業界で検索"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="default">並び順：デフォルト</option>
          <option value="deadline">締切が近い順</option>
          <option value="priority">志望度が高い順</option>
          <option value="name-asc">企業名 昇順（あ→ん）</option>
          <option value="name-desc">企業名 降順（ん→あ）</option>
        </select>
      </div>

      {visible.length === 0 ? (
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
            {visible.map((c) => (
              <tr key={c.id} onClick={() => onOpenCompany(c.id)} className="clickable">
                <td>{c.name}</td>
                <td>{c.industry || '-'}</td>
                <td>
                  <span className="badge">{c.status}</span>
                </td>
                <td>{'★'.repeat(c.priority)}</td>
                <td><DeadlineBadge deadline={c.deadline} /></td>
                <td>{c.eventCount ? `${c.eventCount}件` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
