import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { db, STATUSES, type Status } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ---- バリデーション補助 ----
const isStatus = (v: unknown): v is Status =>
  typeof v === 'string' && (STATUSES as readonly string[]).includes(v);

const isDateStr = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));

// ---- 企業：一覧（イベント件数付き） ----
app.get('/api/companies', (req: Request, res: Response) => {
  const status = req.query.status;
  let rows;
  if (typeof status === 'string' && status !== '') {
    rows = db.prepare('SELECT * FROM companies WHERE status = ? ORDER BY priority DESC, updated_at DESC').all(status);
  } else {
    rows = db.prepare('SELECT * FROM companies ORDER BY priority DESC, updated_at DESC').all();
  }
  const eventCount = db.prepare('SELECT COUNT(*) AS c FROM events WHERE company_id = ?');
  const result = (rows as any[]).map((r) => ({
    ...r,
    eventCount: (eventCount.get(r.id) as { c: number }).c,
  }));
  res.json(result);
});

// ---- 企業：詳細（イベント含む） ----
app.get('/api/companies/:id', (req: Request, res: Response) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: '企業が見つかりません' });
  const events = db.prepare('SELECT * FROM events WHERE company_id = ? ORDER BY date ASC').all(req.params.id);
  res.json({ ...company, events });
});

// ---- 企業：作成 ----
app.post('/api/companies', (req: Request, res: Response) => {
  const { name, industry, status, priority, applied_date, deadline, memo } = req.body ?? {};
  if (typeof name !== 'string' || name.trim() === '')
    return res.status(400).json({ error: '企業名は必須です' });
  if (status !== undefined && !isStatus(status))
    return res.status(400).json({ error: '不正なステータスです' });
  if (!isDateStr(applied_date) || !isDateStr(deadline))
    return res.status(400).json({ error: '日付はYYYY-MM-DD形式で入力してください' });

  const now = new Date().toISOString();
  const info = db
    .prepare(`
      INSERT INTO companies (name, industry, status, priority, applied_date, deadline, memo, created_at, updated_at)
      VALUES (@name, @industry, @status, @priority, @applied_date, @deadline, @memo, @created_at, @updated_at)
    `)
    .run({
      name: name.trim(),
      industry: industry ?? null,
      status: isStatus(status) ? status : '気になる',
      priority: Number(priority) || 3,
      applied_date: applied_date || null,
      deadline: deadline || null,
      memo: memo ?? null,
      created_at: now,
      updated_at: now,
    });
  const created = db.prepare('SELECT * FROM companies WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// ---- 企業：更新 ----
app.put('/api/companies/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: '企業が見つかりません' });

  const { name, industry, status, priority, applied_date, deadline, memo } = req.body ?? {};
  if (name !== undefined && (typeof name !== 'string' || name.trim() === ''))
    return res.status(400).json({ error: '企業名は必須です' });
  if (status !== undefined && !isStatus(status))
    return res.status(400).json({ error: '不正なステータスです' });
  if (!isDateStr(applied_date) || !isDateStr(deadline))
    return res.status(400).json({ error: '日付はYYYY-MM-DD形式で入力してください' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE companies SET
      name = @name, industry = @industry, status = @status, priority = @priority,
      applied_date = @applied_date, deadline = @deadline, memo = @memo, updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: req.params.id,
    name: name !== undefined ? name.trim() : existing.name,
    industry: industry !== undefined ? industry : existing.industry,
    status: status !== undefined ? status : existing.status,
    priority: priority !== undefined ? Number(priority) || existing.priority : existing.priority,
    applied_date: applied_date !== undefined ? applied_date || null : existing.applied_date,
    deadline: deadline !== undefined ? deadline || null : existing.deadline,
    memo: memo !== undefined ? memo : existing.memo,
    updated_at: now,
  });
  const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// ---- 企業：削除 ----
app.delete('/api/companies/:id', (req: Request, res: Response) => {
  const info = db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: '企業が見つかりません' });
  res.json({ ok: true });
});

// ---- イベント：追加 ----
app.post('/api/companies/:id/events', (req: Request, res: Response) => {
  const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: '企業が見つかりません' });
  const { title, date } = req.body ?? {};
  if (typeof title !== 'string' || title.trim() === '')
    return res.status(400).json({ error: 'イベント名は必須です' });
  if (!isDateStr(date) || !date)
    return res.status(400).json({ error: '日付はYYYY-MM-DD形式で入力してください' });

  const info = db
    .prepare('INSERT INTO events (company_id, title, date, done) VALUES (?, ?, ?, 0)')
    .run(req.params.id, title.trim(), date);
  const created = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// ---- イベント：更新（完了切替など） ----
app.put('/api/events/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'イベントが見つかりません' });
  const { title, date, done } = req.body ?? {};
  if (date !== undefined && (!isDateStr(date) || !date))
    return res.status(400).json({ error: '日付はYYYY-MM-DD形式で入力してください' });

  db.prepare('UPDATE events SET title = ?, date = ?, done = ? WHERE id = ?').run(
    title !== undefined ? title : existing.title,
    date !== undefined ? date : existing.date,
    done !== undefined ? (done ? 1 : 0) : existing.done,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// ---- イベント：削除 ----
app.delete('/api/events/:id', (req: Request, res: Response) => {
  const info = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'イベントが見つかりません' });
  res.json({ ok: true });
});

// ---- ダッシュボード ----
app.get('/api/dashboard', (_req: Request, res: Response) => {
  // ステータス別件数
  const statusRows = db
    .prepare('SELECT status, COUNT(*) AS count FROM companies GROUP BY status')
    .all() as { status: string; count: number }[];
  const byStatus: Record<string, number> = {};
  for (const s of STATUSES) byStatus[s] = 0;
  for (const r of statusRows) byStatus[r.status] = r.count;

  const total = db.prepare('SELECT COUNT(*) AS c FROM companies').get() as { c: number };

  // 今後7日以内の締切・イベント
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const todayStr = fmt(today);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  const in7Str = fmt(in7);

  const upcomingDeadlines = db
    .prepare('SELECT id, name, deadline, status FROM companies WHERE deadline IS NOT NULL AND deadline >= ? AND deadline <= ? ORDER BY deadline ASC')
    .all(todayStr, in7Str);

  const upcomingEvents = db
    .prepare(`
      SELECT e.id, e.title, e.date, e.done, c.name AS companyName, c.id AS companyId
      FROM events e JOIN companies c ON e.company_id = c.id
      WHERE e.done = 0 AND e.date >= ? AND e.date <= ?
      ORDER BY e.date ASC
    `)
    .all(todayStr, in7Str);

  res.json({ total: total.c, byStatus, upcomingDeadlines, upcomingEvents });
});

// ---- ヘルスチェック ----
app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

// ---- エラーハンドラ ----
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'サーバー内部エラー' });
});

app.listen(PORT, () => {
  console.log(`就活コンパス API 起動: http://localhost:${PORT}`);
});
