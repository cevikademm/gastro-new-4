-- Blog CMS: posts table + RLS
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  locale text not null default 'tr',
  title text not null,
  description text not null,
  excerpt text,
  category text,
  tags text[] default '{}',
  author text default '2MC Gastro',
  image text,
  body text not null,
  faq jsonb default '[]',
  reading_minutes int default 5,
  status text not null default 'draft' check (status in ('draft','published')),
  date_published timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_idx on public.blog_posts(status, date_published desc);
create index if not exists blog_posts_locale_idx on public.blog_posts(locale);

alter table public.blog_posts enable row level security;

drop policy if exists "public read published" on public.blog_posts;
create policy "public read published" on public.blog_posts
  for select using (status = 'published');

drop policy if exists "admin all" on public.blog_posts;
create policy "admin all" on public.blog_posts
  for all using (
    public.is_admin()
  );

create or replace function public.touch_blog_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch before update on public.blog_posts
  for each row execute function public.touch_blog_updated_at();
