# API仕様書（就活コンパス）

作成：バックエンドエンジニア ／ 2026-06-12
ベースURL：`http://localhost:3001`

## 起動方法
```bash
cd app/backend
npm install
npm run dev      # http://localhost:3001 で起動（tsx watch）
```
- DBはローカル `data/shukatsu.db`（初回起動時に自動生成＋サンプルデータ投入）。
- 有料サービス・外部通信なし。CORSは `http://localhost:5173` のみ許可。

## エンドポイント一覧
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/companies?status=` | 企業一覧（statusで絞込可。eventCount付き） |
| GET | `/api/companies/:id` | 企業詳細（events含む） |
| POST | `/api/companies` | 企業作成 |
| PUT | `/api/companies/:id` | 企業更新 |
| DELETE | `/api/companies/:id` | 企業削除（イベントもCASCADE削除） |
| POST | `/api/companies/:id/events` | イベント追加 |
| PUT | `/api/events/:id` | イベント更新（完了切替等） |
| DELETE | `/api/events/:id` | イベント削除 |
| GET | `/api/dashboard` | サマリー（ステータス別件数・今後7日の締切/イベント） |
| GET | `/api/health` | ヘルスチェック |

## リクエスト例
### 企業作成
```bash
curl -X POST http://localhost:3001/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"株式会社例","industry":"Web系","status":"エントリー","priority":5,"deadline":"2026-07-01"}'
```
### ダッシュボード
```bash
curl http://localhost:3001/api/dashboard
```

## バリデーション
- `name` / `title`：空文字不可。
- `status`：定義済みenumのみ（気になる/インターン応募/インターン選考/インターン参加/エントリー/ES提出/一次面接/二次面接/最終面接/内定/お祈り）。
- 日付：`YYYY-MM-DD` 形式（空はnull許容、ただしイベント日付は必須）。

## エラー応答
- `400`：バリデーション違反 `{ "error": "..." }`
- `404`：対象なし `{ "error": "..." }`
- `500`：サーバー内部エラー

## 第3サイクル 追加API（2026-06-12）
- `GET /api/events` … 全イベント（企業名 `company_name` 付き）。カレンダー用。
- `GET /api/companies/:id` … レスポンスに `tasks`（ToDo配列）を追加。
- `POST /api/companies/:id/tasks` … ToDo追加（body: `{ title, due_date? }`。due_dateは任意・`YYYY-MM-DD` or null）。
- `PUT /api/tasks/:id` … ToDo更新（`{ title?, done?, due_date? }`）。
- `GET /api/tasks` … 期日（due_date）付きの全ToDoを企業名 `company_name` 付きで返す（カレンダー用）。
- `DELETE /api/tasks/:id` … ToDo削除。
- `GET /api/export` … 全データ（companies/events/tasks）をJSONで返す（バックアップ）。
- `POST /api/import` … JSONを受け取り全置換（トランザクション）。body: `{ companies[], events[], tasks[] }`。
> tasksテーブル：id, company_id, title, done, due_date, created_at。companies削除時に CASCADE。
> （既存DBは起動時に `due_date` を冪等マイグレーションで自動追加。）

## 第8サイクル 追加API（2026-06-13）
- `GET /api/es-templates` - ESテンプレート一覧。`updated_at` 降順。
- `POST /api/es-templates` - ESテンプレート作成。body: `{ category, title, body }`。`title` 必須、`category` は `自己PR/志望動機/ガクチカ/長所・短所/逆質問`。
- `PUT /api/es-templates/:id` - ESテンプレート更新。body: `{ category?, title?, body? }`。
- `DELETE /api/es-templates/:id` - ESテンプレート削除。戻り値: `{ ok: true }`。
- `GET /api/stats` - 統計取得。`total/byStatus/byIndustry/offers/rejected/active` を返す。`byStatus` は全ステータスを0件でも含める。
- `GET /api/export` - `version: 2` とし、`esTemplates` を含める。
- `POST /api/import` - `esTemplates` が配列なら `es_templates` を全置換して取り込む。未指定なら既存ESテンプレートは保持する。
