<#
.SYNOPSIS
  就活コンパス バックエンドのスモークテスト（CRUD疎通確認）。

.DESCRIPTION
  http://localhost:3001 が起動している前提で、主要APIの疎通を順に確認する。
  health → 作成 → 一覧 → 詳細 → 更新 → dashboard → 削除（後始末）。
  作成したテストデータは最後に削除するので、DBにゴミは残らない。

.EXAMPLE
  # 別ターミナルで backend を起動しておく（cd app/backend; npm run dev）
  .\scripts\smoke-test.ps1
  .\scripts\smoke-test.ps1 -BaseUrl http://localhost:3001
#>
param([string]$BaseUrl = 'http://localhost:3001')

$pass = 0
$fail = 0

function Step($name, $block) {
  try {
    & $block
    Write-Host "  [OK] $name" -ForegroundColor Green
    $script:pass++
  } catch {
    Write-Host "  [NG] $name -> $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "==> スモークテスト開始: $BaseUrl" -ForegroundColor Cyan

# 起動確認（疎通できなければ即終了して案内）
try {
  Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get -TimeoutSec 5 | Out-Null
} catch {
  Write-Host "バックエンドに接続できません。先に 'cd app/backend; npm run dev' で起動してください。" -ForegroundColor Yellow
  exit 1
}

$createdId = $null

Step 'GET /api/health' {
  Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get | Out-Null
}

Step 'POST /api/companies（作成）' {
  $body = @{ name = 'スモークテスト株式会社'; industry = 'テスト'; status = 'エントリー'; priority = 3; deadline = '2026-07-01' } | ConvertTo-Json
  $c = Invoke-RestMethod -Uri "$BaseUrl/api/companies" -Method Post -Body $body -ContentType 'application/json; charset=utf-8'
  $script:createdId = $c.id
  if (-not $script:createdId) { throw 'idが返却されない' }
}

Step 'GET /api/companies（一覧）' {
  $list = Invoke-RestMethod -Uri "$BaseUrl/api/companies" -Method Get
  if ($list.Count -lt 1) { throw '一覧が空' }
}

Step 'GET /api/companies/:id（詳細・events/tasks含む）' {
  $d = Invoke-RestMethod -Uri "$BaseUrl/api/companies/$script:createdId" -Method Get
  if ($null -eq $d.events -or $null -eq $d.tasks) { throw 'events/tasks が欠落' }
}

Step 'PUT /api/companies/:id（更新）' {
  $body = @{ name = 'スモークテスト株式会社'; industry = 'テスト'; status = '一次面接'; priority = 4; deadline = '2026-07-10' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$BaseUrl/api/companies/$script:createdId" -Method Put -Body $body -ContentType 'application/json; charset=utf-8' | Out-Null
}

Step 'POST /api/companies/:id/tasks（ToDo・期日あり）' {
  $body = @{ title = 'ES提出'; due_date = '2026-07-05' } | ConvertTo-Json
  $t = Invoke-RestMethod -Uri "$BaseUrl/api/companies/$script:createdId/tasks" -Method Post -Body $body -ContentType 'application/json; charset=utf-8'
  if ($t.due_date -ne '2026-07-05') { throw 'due_date が保存されない' }
}

Step 'POST /api/companies/:id/tasks（ToDo・期日なし）' {
  $body = @{ title = '説明会の予約' } | ConvertTo-Json
  $t = Invoke-RestMethod -Uri "$BaseUrl/api/companies/$script:createdId/tasks" -Method Post -Body $body -ContentType 'application/json; charset=utf-8'
  if ($null -ne $t.due_date) { throw '期日なしが null でない' }
}

Step 'GET /api/companies/:id（tasks 2件・due_date確認）' {
  $d = Invoke-RestMethod -Uri "$BaseUrl/api/companies/$script:createdId" -Method Get
  if ($d.tasks.Count -lt 2) { throw 'tasks が2件未満' }
}

Step 'GET /api/dashboard' {
  $dash = Invoke-RestMethod -Uri "$BaseUrl/api/dashboard" -Method Get
  if ($null -eq $dash.total) { throw 'total が欠落' }
}

Step 'DELETE /api/companies/:id（後始末）' {
  if ($script:createdId) {
    Invoke-RestMethod -Uri "$BaseUrl/api/companies/$script:createdId" -Method Delete | Out-Null
  }
}

Write-Host ""
$color = if ($fail -eq 0) { 'Green' } else { 'Red' }
Write-Host "==> 結果: 成功 $pass / 失敗 $fail" -ForegroundColor $color
if ($fail -gt 0) { exit 1 }
