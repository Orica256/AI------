import { useEffect, useState } from 'react';
import { api } from '../api';
import { STATUSES, type CompanyDetail as CompanyDetailData, type Status } from '../types';

interface Props {
  id: number;
  onBack: () => void;
}

export function CompanyDetail({ id, onBack }: Props) {
  const [company, setCompany] = useState<CompanyDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<CompanyDetailData>>({});
  const [eventForm, setEventForm] = useState({ title: '', date: '' });

  const load = () => {
    api
      .getCompany(id)
      .then((c) => {
        setCompany(c);
        setForm(c);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!company) return <p className="loading">読み込み中...</p>;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.updateCompany(id, {
        name: form.name,
        industry: form.industry,
        status: form.status,
        priority: Number(form.priority),
        applied_date: form.applied_date,
        deadline: form.deadline,
        memo: form.memo,
      });
      setEditing(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`「${company.name}」を削除しますか？`)) return;
    await api.deleteCompany(id);
    onBack();
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.addEvent(id, eventForm);
      setEventForm({ title: '', date: '' });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleEvent = async (eventId: number, done: number) => {
    await api.updateEvent(eventId, { done: done ? 0 : 1 });
    load();
  };

  const removeEvent = async (eventId: number) => {
    await api.deleteEvent(eventId);
    load();
  };

  return (
    <div>
      <button className="link" onClick={onBack}>
        ← 一覧に戻る
      </button>

      {error && <p className="error">{error}</p>}

      <div className="list-header">
        <h2>{company.name}</h2>
        <div>
          <button onClick={() => setEditing((v) => !v)}>{editing ? 'キャンセル' : '編集'}</button>
          <button className="danger" onClick={handleDelete}>
            削除
          </button>
        </div>
      </div>

      {editing ? (
        <form className="card form" onSubmit={handleSave}>
          <div className="form-row">
            <label>
              企業名 *
              <input
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              業界
              <input
                value={form.industry ?? ''}
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
                value={form.priority ?? 3}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              応募日
              <input
                type="date"
                value={form.applied_date ?? ''}
                onChange={(e) => setForm({ ...form, applied_date: e.target.value })}
              />
            </label>
            <label>
              締切
              <input
                type="date"
                value={form.deadline ?? ''}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </label>
          </div>
          <label>
            メモ
            <textarea
              value={form.memo ?? ''}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
            />
          </label>
          <button type="submit" className="primary">
            保存する
          </button>
        </form>
      ) : (
        <div className="card">
          <dl className="detail-list">
            <dt>業界</dt>
            <dd>{company.industry || '-'}</dd>
            <dt>ステータス</dt>
            <dd>
              <span className="badge">{company.status}</span>
            </dd>
            <dt>志望度</dt>
            <dd>{'★'.repeat(company.priority)}</dd>
            <dt>応募日</dt>
            <dd>{company.applied_date || '-'}</dd>
            <dt>締切</dt>
            <dd>{company.deadline || '-'}</dd>
            <dt>メモ</dt>
            <dd className="memo">{company.memo || '-'}</dd>
          </dl>
        </div>
      )}

      <section className="card">
        <h3>選考イベント</h3>
        {company.events.length === 0 ? (
          <p className="empty">まだ予定がありません。</p>
        ) : (
          <ul className="event-list">
            {company.events.map((ev) => (
              <li key={ev.id} className={ev.done ? 'done' : ''}>
                <input
                  type="checkbox"
                  checked={!!ev.done}
                  onChange={() => toggleEvent(ev.id, ev.done)}
                />
                <span className="event-title">{ev.title}</span>
                <span className="date">{ev.date}</span>
                <button className="link danger" onClick={() => removeEvent(ev.id)}>
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="event-form" onSubmit={handleAddEvent}>
          <input
            placeholder="イベント名（例：一次面接）"
            value={eventForm.title}
            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            required
          />
          <input
            type="date"
            value={eventForm.date}
            onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
            required
          />
          <button type="submit">追加</button>
        </form>
      </section>
    </div>
  );
}
