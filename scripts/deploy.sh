#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# 2MC Gastro — "deploy bunu" komutuyla uzaktan tetiklenebilir deploy script'i
# -----------------------------------------------------------------------------
# Kullanım (kullanıcı PC'sinden, bir defa secrets ayarlandıktan sonra):
#
#   bash scripts/deploy.sh                 # varsayılan: vercel deploy hook
#   bash scripts/deploy.sh --push          # önce git push, Vercel GitHub integ. tetikler
#   bash scripts/deploy.sh --github        # GitHub Actions repository_dispatch tetikler
#
# Gerekli ortam değişkenleri (.env.deploy dosyasından okunur, commit edilmez):
#   VERCEL_DEPLOY_HOOK_URL  — https://api.vercel.com/v1/integrations/deploy/...
#   GITHUB_TOKEN            — (opsiyonel) repository_dispatch için PAT
#   GITHUB_REPO             — (opsiyonel) örn: "cevikademm/2mc-gastro"
# -----------------------------------------------------------------------------
set -euo pipefail

MODE="hook"
for arg in "$@"; do
  case "$arg" in
    --push)   MODE="push" ;;
    --github) MODE="github" ;;
    --hook)   MODE="hook" ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# .env.deploy varsa yükle (commit edilmez, .gitignore'a ekli)
if [ -f ".env.deploy" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.deploy
  set +a
fi

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log()       { printf "\033[36m[deploy %s]\033[0m %s\n" "$(timestamp)" "$*"; }
err()       { printf "\033[31m[deploy %s] HATA:\033[0m %s\n" "$(timestamp)" "$*" 1>&2; }

case "$MODE" in
  hook)
    if [ -z "${VERCEL_DEPLOY_HOOK_URL:-}" ]; then
      err "VERCEL_DEPLOY_HOOK_URL tanımlı değil. .env.deploy dosyasına ekle."
      err "Vercel → Project → Settings → Git → Deploy Hooks ile oluştur."
      exit 1
    fi
    log "Vercel Deploy Hook tetikleniyor..."
    RESP=$(curl -sS -X POST "$VERCEL_DEPLOY_HOOK_URL")
    echo "$RESP"
    log "Tetiklendi. Vercel dashboard'unda ilerlemeyi izleyebilirsin."
    ;;

  push)
    log "Aktif branch kontrol ediliyor..."
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log "Branch: $BRANCH"
    if [ -n "$(git status --porcelain)" ]; then
      log "Tracked değişiklikler commit ediliyor..."
      git add -A
      git commit -m "chore: auto-deploy $(timestamp)" || true
    else
      log "Commit edilecek değişiklik yok."
    fi
    log "origin/$BRANCH üzerine push..."
    git push origin "$BRANCH"
    log "Push tamam. Vercel GitHub integration otomatik deploy başlatır."
    ;;

  github)
    if [ -z "${GITHUB_TOKEN:-}" ] || [ -z "${GITHUB_REPO:-}" ]; then
      err "GITHUB_TOKEN ve GITHUB_REPO tanımlı değil. .env.deploy dosyasına ekle."
      exit 1
    fi
    log "GitHub repository_dispatch tetikleniyor: $GITHUB_REPO (event_type=deploy)"
    curl -sS -X POST \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/$GITHUB_REPO/dispatches" \
      -d '{"event_type":"deploy"}'
    log "Tetiklendi. GitHub → Actions sekmesinde akışı izle."
    ;;

  *)
    err "Bilinmeyen mod: $MODE"
    exit 1
    ;;
esac
