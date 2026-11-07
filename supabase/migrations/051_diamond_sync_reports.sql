-- 051_diamond_sync_reports.sql
-- Gecelik Diamond senkronu (scripts/diamond-nightly.mjs, GitHub Actions) için:
--   1) diamond_sync_runs     — her gece bir satır: durum + sayılar
--   2) diamond_sync_changes  — ürün bazında değişiklik (fiyat / resim / kaldırılan / yeni / diğer)
--   3) product_seo.discontinued_at — Diamond listesinden çıkan ürün → /produkt/{slug} kategoriye 301
--   4) diamond_seo_apply()   — product_seo'da resim/fiyatı toplu eşitler, kalkanları işaretler
-- Okuma: yalnız admin (public.is_admin()). Yazma: yalnız service role (RLS bypass).

create table if not exists public.diamond_sync_runs (
  id           bigserial primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running' check (status in ('running','success','error')),
  feed_count   integer,
  totals       jsonb not null default '{}'::jsonb,
  error        text,
  trigger      text
);

create table if not exists public.diamond_sync_changes (
  id            bigserial primary key,
  run_id        bigint not null references public.diamond_sync_runs(id) on delete cascade,
  product_id    text not null,
  product_name  text,
  change_type   text not null check (change_type in ('price','image','removed','new','updated')),
  details       jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists diamond_sync_changes_run_idx on public.diamond_sync_changes (run_id, change_type);
create index if not exists diamond_sync_runs_started_idx on public.diamond_sync_runs (started_at desc);

alter table public.diamond_sync_runs    enable row level security;
alter table public.diamond_sync_changes enable row level security;

drop policy if exists diamond_sync_runs_admin_read on public.diamond_sync_runs;
create policy diamond_sync_runs_admin_read on public.diamond_sync_runs
  for select to authenticated using (public.is_admin());

drop policy if exists diamond_sync_changes_admin_read on public.diamond_sync_changes;
create policy diamond_sync_changes_admin_read on public.diamond_sync_changes
  for select to authenticated using (public.is_admin());

alter table public.product_seo add column if not exists discontinued_at timestamptz;

-- p_rows: [{source_id, image, images, price_net}]  → farklı olanları günceller
-- p_discontinued: Diamond listesinden çıkan source_id'ler → indexable=false + discontinued_at
create or replace function public.diamond_seo_apply(p_rows jsonb default '[]'::jsonb, p_discontinued text[] default '{}')
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_updated integer := 0;
  v_disc integer := 0;
begin
  if not (coalesce(auth.role(), '') = 'service_role') then
    raise exception 'forbidden';
  end if;

  update product_seo s
     set image = x.image,
         images = coalesce(x.images, s.images),
         price_net = coalesce(x.price_net, s.price_net),
         updated_at = now()
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as x(source_id text, image text, images jsonb, price_net numeric)
   where s.source = 'diamond'
     and s.source_id = x.source_id
     and (s.image is distinct from x.image
          or (x.images is not null and s.images is distinct from x.images)
          or (x.price_net is not null and s.price_net is distinct from x.price_net));
  get diagnostics v_updated = row_count;

  update product_seo
     set indexable = false, discontinued_at = now(), updated_at = now()
   where source = 'diamond'
     and source_id = any(coalesce(p_discontinued, '{}'))
     and discontinued_at is null;
  get diagnostics v_disc = row_count;

  return jsonb_build_object('seo_updated', v_updated, 'seo_discontinued', v_disc);
end;
$$;

revoke all on function public.diamond_seo_apply(jsonb, text[]) from public, anon, authenticated;
grant execute on function public.diamond_seo_apply(jsonb, text[]) to service_role;
