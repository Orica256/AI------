## タイトル
機能3「ES/自己PRテンプレ管理」＋機能4「応募状況の統計」の実装

## 背景 / 目的
- 機能3：自己PR・ガクチカ・志望動機などの文章を「使い回せるテンプレ」として保存・編集・コピーできるようにする（企業に紐づかない独立データ）。
- 機能4：応募状況（ステータス分布・業界分布・内定/お祈り/進行中）を可視化するダッシュボードを追加する。

## 対象ファイル（これ以外は変更しないこと）
**バックエンド**
- `app/backend/src/db.ts`（テーブル追加のみ）
- `app/backend/src/index.ts`（エンドポイント追加のみ）
- `app/backend/API仕様書.md`（追記のみ）

**フロントエンド**
- `app/frontend/src/types.ts`（型追加のみ）
- `app/frontend/src/api.ts`（API追加のみ）
- `app/frontend/src/App.tsx`（タブ2つ追加のみ。既存ビューは触らない）
- `app/frontend/src/components/EsTemplates.tsx`（新規作成）
- `app/frontend/src/components/Stats.tsx`（新規作成）
- `app/frontend/src/styles.css`（末尾に追記のみ）
- `app/frontend/画面仕様書.md`（追記のみ）

**触らない**：上記以外すべて。特に既存コンポーネント（CompanyList/CompanyDetail/Dashboard/KanbanBoard/CalendarView/DeadlineBadge/SimpleMarkdown）のロジック、`CLAUDE.md`・`AGENTS.md`・`作業ログ.md`・`PM/`・`秘書/`・`レビュアー/` のドキュメント。既存ファイルは「追加」のみで、無関係な箇所・既存記述を書き換えない（全文リライト禁止）。

---

## 確定スキーマ（変更不可）

### 機能3：es_templates テーブル（新規）
```sql
CREATE TABLE IF NOT EXISTS es_templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  category   TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```
- 新規テーブルなのでマイグレーション不要（`CREATE TABLE IF NOT EXISTS` を既存スキーマ定義に追記）。

### カテゴリ enum（バック `db.ts`・フロント `types.ts` の両方に同一で定義）
```
ES_CATEGORIES = ['自己PR', 'ガクチカ', '志望動機', '長所・短所', 'その他']
```

---

## 確定 API 契約（変更不可・Base: http://localhost:3001）

### 機能3：ES テンプレ CRUD
| Method | Path | body | 返り値 |
| --- | --- | --- | --- |
| GET | `/api/es-templates` | — | `EsTemplate[]`（`updated_at` 降順） |
| POST | `/api/es-templates` | `{ category, title, body }` | 作成された `EsTemplate`（201） |
| PUT | `/api/es-templates/:id` | `{ category?, title?, body? }` | 更新後の `EsTemplate` |
| DELETE | `/api/es-templates/:id` | — | `{ ok: true }` |

バリデーション：
- `title`：空文字不可（400 `{ "error": "..." }`）。
- `category`：`ES_CATEGORIES` のいずれかのみ（400）。
- `body`：任意（空文字可）。
- 対象なしは 404。

### 機能4：統計
| Method | Path | 返り値 |
| --- | --- | --- |
| GET | `/api/stats` | `Stats`（下記） |

集計はサーバ側（SQL）で行う。`byStatus` は全ステータス（`STATUSES` 順、0件も含む）。`byIndustry` は `industry` 別件数（NULL/空は「未設定」に集約）。`offers`=ステータス`内定`の数、`rejected`=`お祈り`の数、`active`=それ以外の数。

### export/import の拡張
- `GET /api/export`：返り値に `esTemplates`（全件）を追加。`version` を `2` にする。
- `POST /api/import`：`esTemplates`（配列・**省略可**）を受け取り、全置換トランザクションに含める（`esTemplates` が無い旧JSONも受理＝後方互換）。子テーブル削除順に `es_templates` も含める。

---

## 確定 TypeScript 型（フロント `types.ts`・変更不可）
```ts
export const ES_CATEGORIES = ['自己PR', 'ガクチカ', '志望動機', '長所・短所', 'その他'] as const;
export type EsCategory = (typeof ES_CATEGORIES)[number];

export interface EsTemplate {
  id: number;
  category: EsCategory;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total: number;
  byStatus: { status: string; count: number }[];
  byIndustry: { industry: string; count: number }[];
  offers: number;
  rejected: number;
  active: number;
}
```
- `api.ts` の `ExportBundle` に `esTemplates?: EsTemplate[]` を追加（省略可で後方互換）。
- `api.ts` に追加：`listEsTemplates`/`createEsTemplate`/`updateEsTemplate`/`deleteEsTemplate`/`getStats`。

---

## フロント実装方針
- `App.tsx`：`View` 型に `{ name: 'es' }` と `{ name: 'stats' }` を追加。ヘッダ `nav` に「ES文例」「統計」タブを追加（既存タブの並びの後）。`main` のビュー分岐に2つ追加。**既存タブ・既存ロジックは変更しない**。
- `EsTemplates.tsx`：カテゴリ別に一覧表示。追加/編集フォーム（カテゴリ選択・タイトル・本文textarea）、**本文の文字数カウント表示**、削除（確認ダイアログ）。本文をクリップボードにコピーするボタンがあると望ましい（`navigator.clipboard`、任意）。
- `Stats.tsx`：サマリー数値（総数/進行中/内定/お祈り）＋ステータス分布・業界分布を**CSSの横棒バー**で表示（外部グラフライブラリは使わない）。
- `styles.css`：上記用のクラスを**末尾に追記**。既存スタイルは変更しない。
- スタイルは既存のCSS変数（`--card`/`--border`/`--primary` 等）を使い、ダークモード（`[data-theme="dark"]`）でも破綻しないようにする。

---

## 完了条件（DoD）
- [ ] `app/backend` で `npx tsc --noEmit` がエラー0。
- [ ] `app/frontend` で `npx tsc --noEmit` がエラー0。
- [ ] ES文例：追加・一覧・編集・削除が API/画面の両方で動作。文字数カウントが出る。
- [ ] 統計：`/api/stats` が正しい集計を返し、画面にサマリーと分布バーが表示される。
- [ ] `GET /api/export` に `esTemplates` が含まれ、`POST /api/import`（esTemplates有り/無し両方）が成功する。
- [ ] 既存機能（企業/イベント/ToDo/カンバン/カレンダー/ダッシュボード）が壊れていない。
- [ ] 新規依存パッケージを追加していない。
- [ ] 変更ファイルと検証結果を簡潔に要約して終了する。

## 制約
- `AGENTS.md` を厳守（app/ のみ・追加中心・全文リライト禁止・コミットしない）。
- DBスキーマは上記のとおり。既存テーブルは変更しない。
- 不明点や、上記契約の変更が必要だと判断した場合は、実装せず理由を出力して停止する。
