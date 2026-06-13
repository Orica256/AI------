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
  const tasks = db.prepare('SELECT * FROM tasks WHERE company_id = ? ORDER BY done ASC, id ASC').all(req.params.id);
  res.json({ ...company, events, tasks });
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

// ---- ToDo（タスク）：追加 ----
app.post('/api/companies/:id/tasks', (req: Request, res: Response) => {
  const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: '企業が見つかりません' });
  const { title, due_date } = req.body ?? {};
  if (typeof title !== 'string' || title.trim() === '')
    return res.status(400).json({ error: 'タスク名は必須です' });
  if (!isDateStr(due_date))
    return res.status(400).json({ error: '期日はYYYY-MM-DD形式で入力してください' });
  const info = db
    .prepare('INSERT INTO tasks (company_id, title, done, due_date, created_at) VALUES (?, ?, 0, ?, ?)')
    .run(req.params.id, title.trim(), due_date || null, new Date().toISOString());
  const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// ---- ToDo（タスク）：更新（完了切替・改名） ----
app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'タスクが見つかりません' });
  const { title, done, due_date } = req.body ?? {};
  if (title !== undefined && (typeof title !== 'string' || title.trim() === ''))
    return res.status(400).json({ error: 'タスク名は必須です' });
  if (due_date !== undefined && !isDateStr(due_date))
    return res.status(400).json({ error: '期日はYYYY-MM-DD形式で入力してください' });
  db.prepare('UPDATE tasks SET title = ?, done = ?, due_date = ? WHERE id = ?').run(
    title !== undefined ? title.trim() : existing.title,
    done !== undefined ? (done ? 1 : 0) : existing.done,
    due_date !== undefined ? due_date || null : existing.due_date,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// ---- ToDo（タスク）：削除 ----
app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'タスクが見つかりません' });
  res.json({ ok: true });
});

// ---- イベント：全件（カレンダー用・企業名付き） ----
app.get('/api/events', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT e.id, e.company_id, e.title, e.date, e.done, c.name AS company_name
    FROM events e JOIN companies c ON e.company_id = c.id
    ORDER BY e.date ASC
  `).all();
  res.json(rows);
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

// ---- データ：エクスポート（ローカルJSONバックアップ） ----
app.get('/api/export', (_req: Request, res: Response) => {
  const companies = db.prepare('SELECT * FROM companies ORDER BY id ASC').all();
  const events = db.prepare('SELECT * FROM events ORDER BY id ASC').all();
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY id ASC').all();
  res.json({ version: 1, exportedAt: new Date().toISOString(), companies, events, tasks });
});

// ---- データ：インポート（全置換・トランザクション） ----
app.post('/api/import', (req: Request, res: Response) => {
  const { companies, events, tasks } = req.body ?? {};
  if (!Array.isArray(companies) || !Array.isArray(events))
    return res.status(400).json({ error: 'companies と events の配列が必要です' });
  const taskRows = Array.isArray(tasks) ? tasks : [];
  try {
    const tx = db.transaction(() => {
      // 子テーブルから削除（FK整合）
      db.prepare('DELETE FROM tasks').run();
      db.prepare('DELETE FROM events').run();
      db.prepare('DELETE FROM companies').run();

      const insC = db.prepare(`
        INSERT INTO companies (id, name, industry, status, priority, applied_date, deadline, memo, created_at, updated_at)
        VALUES (@id, @name, @industry, @status, @priority, @applied_date, @deadline, @memo, @created_at, @updated_at)
      `);
      for (const c of companies) {
        if (!c || typeof c.name !== 'string' || c.name.trim() === '')
          throw new Error('企業データが不正です（nameは必須）');
        const now = new Date().toISOString();
        insC.run({
          id: c.id ?? null,
          name: c.name,
          industry: c.industry ?? null,
          status: isStatus(c.status) ? c.status : '気になる',
          priority: Number(c.priority) || 3,
          applied_date: c.applied_date ?? null,
          deadline: c.deadline ?? null,
          memo: c.memo ?? null,
          created_at: c.created_at ?? now,
          updated_at: c.updated_at ?? now,
        });
      }

      const insE = db.prepare('INSERT INTO events (id, company_id, title, date, done) VALUES (@id, @company_id, @title, @date, @done)');
      for (const e of events) {
        insE.run({
          id: e?.id ?? null,
          company_id: Number(e?.company_id),
          title: String(e?.title ?? ''),
          date: String(e?.date ?? ''),
          done: e?.done ? 1 : 0,
        });
      }

      const insT = db.prepare('INSERT INTO tasks (id, company_id, title, done, due_date, created_at) VALUES (@id, @company_id, @title, @done, @due_date, @created_at)');
      for (const t of taskRows) {
        insT.run({
          id: t?.id ?? null,
          company_id: Number(t?.company_id),
          title: String(t?.title ?? ''),
          done: t?.done ? 1 : 0,
          due_date: t?.due_date ?? null,
          created_at: t?.created_at ?? new Date().toISOString(),
        });
      }
    });
    tx();
  } catch (e: any) {
    return res.status(400).json({ error: 'インポートに失敗しました: ' + (e?.message ?? '不明なエラー') });
  }
  res.json({ ok: true });
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
