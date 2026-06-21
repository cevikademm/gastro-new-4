#!/usr/bin/env bash
# =============================================================================
# migrate-data.sh — copy business + auth data from the OLD Supabase project to
# the NEW one, in FK-safe order: auth.users → profiles → business tables.
#
# Catalog tables (products/brands/categories/diamond_products) are NOT copied —
# re-sync them from source on the new project instead (sync-diamond /
# sync-combisteel / sync-meilisearch). See docs/SUPABASE_MIGRATION.md §4a.
#
# REQUIREMENTS: pg_dump + psql (PostgreSQL client tools) on PATH.
#   Windows: install via "scoop install postgresql" or the EnterpriseDB installer,
#   then run this from Git Bash.
#
# USAGE (do NOT hardcode passwords in files — pass via env):
#   OLD_DB_URL="postgresql://postgres:OLDPW@db.mnlgbsfarubpvkmqqvff.supabase.co:5432/postgres" \
#   NEW_DB_URL="postgresql://postgres:NEWPW@db.vwuqvweorjbqxcebnaym.supabase.co:5432/postgres" \
#   bash scripts/migrate-data.sh
#
#   Optional:  SKIP_AUTH=1   → skip the auth.users/identities step (re-register users instead)
#
# ⚠️  RUN ONCE. This is a data-only load; re-running causes duplicate-key errors.
# ⚠️  TEST on a throwaway/staging restore before touching production.
# =============================================================================
set -euo pipefail

: "${OLD_DB_URL:?set OLD_DB_URL (source project connection string)}"
: "${NEW_DB_URL:?set NEW_DB_URL (target project connection string)}"
SKIP_AUTH="${SKIP_AUTH:-0}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
DUMP_FLAGS=(--data-only --no-owner --no-privileges)

echo "==> [1/3] Dumping from OLD project into $WORK"

if [ "$SKIP_AUTH" != "1" ]; then
  echo "    - auth.users + auth.identities"
  pg_dump "$OLD_DB_URL" "${DUMP_FLAGS[@]}" \
    -t auth.users -t auth.identities \
    > "$WORK/01_auth.sql"
else
  echo "    - SKIP_AUTH=1 → skipping auth (users will re-register on the new project)"
  : > "$WORK/01_auth.sql"
fi

echo "    - public.profiles"
pg_dump "$OLD_DB_URL" "${DUMP_FLAGS[@]}" \
  -t public.profiles \
  > "$WORK/02_profiles.sql"

echo "    - business tables (orders, leads, blog, 3d models)"
pg_dump "$OLD_DB_URL" "${DUMP_FLAGS[@]}" \
  -t public.gastro_orders \
  -t public.gastro_order_events \
  -t public.customer_searches \
  -t public.customer_leads \
  -t public.blog_posts \
  -t public.product_3d_models \
  > "$WORK/03_business.sql"

echo "==> [2/3] Restoring to NEW project (single transaction, triggers disabled)"
# session_replication_role = replica disables ALL triggers during the load:
#  - the on-signup trigger (handle_new_user) won't auto-create profiles when
#    auth.users rows are inserted, so the explicit profiles load won't collide;
#  - FK triggers are deferred, but our load order (auth → profiles → business)
#    already satisfies them.
# If your role lacks permission to set session_replication_role, drop the signup
# trigger temporarily instead and re-create it afterward (see runbook).
{
  echo "SET session_replication_role = replica;"
  cat "$WORK/01_auth.sql"
  cat "$WORK/02_profiles.sql"
  cat "$WORK/03_business.sql"
  echo "SET session_replication_role = origin;"
} | psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 --single-transaction

echo "==> [3/3] Done. Verify on the NEW project:"
echo "    SELECT count(*) FROM auth.users;"
echo "    SELECT count(*) FROM public.profiles;"
echo "    SELECT count(*) FROM public.gastro_orders;"
echo "    Then test that a migrated user can log in with their existing password."
