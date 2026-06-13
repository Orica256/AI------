import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// DBファイルはローカルに保存（外部送信なし・無料）
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });
const dbPath = join(dataDir, 'shukatsu.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 選考ステータスの取りうる値
export const STATUSES = [
  '気になる',
  'エントリー',
  'ES提出',
  '一次面接',
  '二次面接',
  '最終面接',
  '内定',
  'お祈り',
] as const;
export type Status = (typeof STATUSES)[number];

// スキーマ初期化
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    industry     TEXT,
    status       TEXT NOT NULL DEFAULT '気になる',
    priority     INTEGER NOT NULL DEFAULT 3,
    applied_date TEXT,
    deadline     TEXT,
    memo         TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    title      TEXT NOT NULL,
    date       TEXT NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    title      TEXT NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    due_date   TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
`);

// 既存DB向けの冪等マイグレーション（tasks.due_date が無ければ追加）
const taskCols = db.prepare('PRAGMA table_info(tasks)').all() as { name: string }[];
if (!taskCols.some((c) => c.name === 'due_date')) {
  db.exec('ALTER TABLE tasks ADD COLUMN due_date TEXT');
}

// 初回のみサンプルデータを投入（使い方の例示）
const count = db.prepare('SELECT COUNT(*) AS c FROM companies').get() as { c: number };
if (count.c === 0) {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO companies (name, industry, status, priority, applied_date, deadline, memo, created_at, updated_at)
    VALUES (@name, @industry, @status, @priority, @applied_date, @deadline, @memo, @created_at, @updated_at)
  `);
  const sample = [
    { name: 'サンプル株式会社', industry: 'Web系', status: 'ES提出', priority: 5, applied_date: '2026-06-01', deadline: '2026-06-15', memo: 'ESは提出済み。面接対策を進める。', created_at: now, updated_at: now },
    { name: 'テックスタート合同会社', industry: 'SaaS', status: '気になる', priority: 4, applied_date: null, deadline: '2026-06-18', memo: '説明会の予約をする', created_at: now, updated_at: now },
  ];
  const tx = db.transaction(() => {
    for (const s of sample) insert.run(s);
  });
  tx();
}
