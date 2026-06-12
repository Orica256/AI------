<#
.SYNOPSIS
  就活コンパス：Codex への実装委譲ラッパー（ヘッドレス起動）。

.DESCRIPTION
  ハンドオフ仕様ファイルを受け取り、就活コンパスの規約ヘッダを添えて
  `codex exec`（非対話）を起動する。コーディングの生成トークンを Codex 側へ逃がす。
  - 型 / API 契約の「正」は Claude が管理。Codex は中身を実装するだけ。
  - コミットはしない（コミットは Claude が author=Orica256 で行う）。
  - 実行ログは scripts/logs/ に保存する。

.PARAMETER SpecFile
  作業指示（ハンドオフ）の Markdown ファイルパス。scripts/handoff-template.md を雛形に。

.PARAMETER Sandbox
  codex のサンドボックスポリシー。既定は workspace-write（リポジトリ内のみ書込可）。

.PARAMETER Effort
  推論強度。既定は medium（トークン節約。難しい設計のみ high）。

.PARAMETER Model
  使用モデル。既定は gpt-5.5。

.EXAMPLE
  .\scripts\codex-task.ps1 .\scripts\handoff-template.md
  .\scripts\codex-task.ps1 -SpecFile .\PM\成果物\指示_xxx.md -Effort high
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$SpecFile,

  [ValidateSet('read-only', 'workspace-write', 'danger-full-access')]
  [string]$Sandbox = 'workspace-write',

  [ValidateSet('minimal', 'low', 'medium', 'high')]
  [string]$Effort = 'medium',

  [string]$Model = 'gpt-5.5'
)

$ErrorActionPreference = 'Stop'

# リポジトリルート = このスクリプトの親（scripts/）の親
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

if (-not (Test-Path $SpecFile)) {
  Write-Error "仕様ファイルが見つかりません: $SpecFile"
  exit 1
}
$spec = Get-Content -Raw -Encoding UTF8 $SpecFile

# Codex に毎回渡す規約ヘッダ（CLAUDE.md のズレ防止＝Codex連携案リスク3対策）
$rules = @'
あなたは「就活コンパス（就活管理Webアプリ）」の実装担当として作業する。以下を厳守すること。

【絶対制約】
1. 完全無料・ローカル完結。有料API/有料クラウド/課金サービスは使わない。個人情報を外部送信しない。
2. 動くコードは app/ 配下にのみ書く（app/backend = Express+better-sqlite3、app/frontend = React+TS+Vite）。
3. 型 / API契約の「正」は Claude が管理する。指示書に書かれた契約・型に従い、勝手に変更しない。
   変更が必要だと判断したら、実装せずに理由を出力して止まる。

【コーディング規約】
- TypeScript strict。命名：変数/関数=camelCase、型/コンポーネント=PascalCase。1ファイル1責務。
- 既存コードのスタイル・周辺の書き方に合わせる。コメントは日本語可、意図が分かりにくい箇所のみ簡潔に。
- 詳細は必要に応じてリポジトリの CLAUDE.md と app/backend/API仕様書.md を読む。

【やってよい / だめなこと】
- やる：指示の実装、最小限の検証（例 tsc --noEmit、起動確認）。
- やらない：git commit / git push（コミットは Claude が行う）。app/ 以外への実装コード配置。依存の無断追加。

以下が今回の作業指示。完了条件をすべて満たすこと。完了したら、変更ファイルと検証結果を簡潔に要約して終了する。

==================== 作業指示 ====================
'@

$prompt = $rules + "`n" + $spec

# 実行ログ
$logDir = Join-Path $repoRoot 'scripts\logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $logDir "codex-$stamp.log"

Write-Host "==> Codex 委譲開始" -ForegroundColor Cyan
Write-Host "    spec    : $SpecFile"
Write-Host "    sandbox : $Sandbox"
Write-Host "    effort  : $Effort / model: $Model"
Write-Host "    log     : $logFile"
Write-Host ""

# codex は進捗情報を stderr に出す。PowerShell 5.1 では native コマンドの stderr が
# NativeCommandError 扱いになり、ErrorActionPreference=Stop だと codex 起動の瞬間に中断する。
# そのためここだけ Continue に戻す（stderr は 2>&1 で stdout にマージしログへ流す）。
$ErrorActionPreference = 'Continue'

# codex exec をヘッドレス起動（プロンプトは stdin で渡す）
$prompt | codex exec `
  --cd $repoRoot `
  --sandbox $Sandbox `
  -m $Model `
  -c "model_reasoning_effort=$Effort" `
  - 2>&1 | Tee-Object -FilePath $logFile

Write-Host ""
Write-Host "==> 完了。差分を確認してください: git -C `"$repoRoot`" diff" -ForegroundColor Green
Write-Host "    ログ: $logFile"
