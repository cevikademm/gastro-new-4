# -----------------------------------------------------------------------------
# 2MC Gastro — Windows PowerShell deploy script'i
# -----------------------------------------------------------------------------
# Kullanım:
#   powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1            # hook
#   powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -Mode push
#   powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -Mode github
#
# .env.deploy dosyasından okunan değişkenler:
#   VERCEL_DEPLOY_HOOK_URL, GITHUB_TOKEN, GITHUB_REPO
# -----------------------------------------------------------------------------
param(
  [ValidateSet('hook','push','github')]
  [string]$Mode = 'hook'
)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

# .env.deploy yükle
$envFile = Join-Path $RootDir '.env.deploy'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)=(.*)$') {
      $name = $matches[1]; $value = $matches[2].Trim('"').Trim("'")
      Set-Item -Path "env:$name" -Value $value
    }
  }
}

function Log($msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[deploy $ts] $msg" -ForegroundColor Cyan
}
function Err($msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[deploy $ts] HATA: $msg" -ForegroundColor Red
}

switch ($Mode) {
  'hook' {
    if (-not $env:VERCEL_DEPLOY_HOOK_URL) {
      Err "VERCEL_DEPLOY_HOOK_URL tanımlı değil. .env.deploy dosyasına ekle."
      exit 1
    }
    Log "Vercel Deploy Hook tetikleniyor..."
    $resp = Invoke-RestMethod -Method Post -Uri $env:VERCEL_DEPLOY_HOOK_URL
    $resp | ConvertTo-Json -Depth 5 | Write-Host
    Log "Tetiklendi. Vercel dashboard'unda ilerlemeyi izleyebilirsin."
  }
  'push' {
    $branch = git rev-parse --abbrev-ref HEAD
    Log "Branch: $branch"
    $status = git status --porcelain
    if ($status) {
      Log "Değişiklikler commit ediliyor..."
      git add -A
      $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
      git commit -m "chore: auto-deploy $ts" 2>$null | Out-Null
    } else {
      Log "Commit edilecek değişiklik yok."
    }
    Log "origin/$branch üzerine push..."
    git push origin $branch
    Log "Push tamam. Vercel GitHub integration otomatik deploy başlatır."
  }
  'github' {
    if (-not $env:GITHUB_TOKEN -or -not $env:GITHUB_REPO) {
      Err "GITHUB_TOKEN ve GITHUB_REPO tanımlı değil."
      exit 1
    }
    Log "GitHub repository_dispatch tetikleniyor: $($env:GITHUB_REPO)"
    $headers = @{
      'Accept'               = 'application/vnd.github+json'
      'Authorization'        = "Bearer $($env:GITHUB_TOKEN)"
      'X-GitHub-Api-Version' = '2022-11-28'
    }
    $body = '{"event_type":"deploy"}'
    Invoke-RestMethod -Method Post `
      -Uri "https://api.github.com/repos/$($env:GITHUB_REPO)/dispatches" `
      -Headers $headers -Body $body -ContentType 'application/json'
    Log "Tetiklendi. GitHub → Actions sekmesinde akışı izle."
  }
}
