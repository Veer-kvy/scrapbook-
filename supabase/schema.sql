-- KABBU SCRAPBOOK — private admin CMS schema (Supabase / Postgres)
--
-- Apply this file in the Supabase SQL editor, then:
--   1. Create the administrator in Authentication → Users (email + password).
--   2. Insert their user id into public.admin_users with the statement at the bottom.
--   3. Put VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
--
-- The service-role key is never used by the browser. All admin writes are
-- authorized here by Supabase Auth + row-level security.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- admins
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- Intentionally no policies: only the service role (SQL editor) can grant admin.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------- draft content
create table if not exists public.scrapbook_settings (
  id int primary key default 1 check (id = 1),
  meta_json jsonb not null default '{}'::jsonb,
  theme_json jsonb not null default '{}'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  albums_json jsonb not null default '[]'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.scrapbook_pages (
  id text primary key,
  title text not null default 'Untitled page',
  page_type text not null default 'blank',
  page_order int not null default 0,
  status text not null default 'draft',
  content_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id text primary key,
  file_path text not null,
  thumbnail_path text,
  filename text,
  mime_type text,
  file_size bigint not null default 0,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.letters (
  id text primary key,
  title text not null default 'A letter',
  category text not null default 'custom',
  content text not null default '',
  design_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scrapbook_assets (
  id text primary key,
  name text not null default 'Decoration',
  file_path text not null,
  mime_type text,
  width int not null default 0,
  height int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.scrapbook_interactions (
  id text primary key,
  page_id text references public.scrapbook_pages (id) on delete cascade,
  element_id text not null,
  interaction_type text not null,
  interaction_config jsonb not null default '{}'::jsonb
);

create index if not exists scrapbook_interactions_element_idx
  on public.scrapbook_interactions (element_id);

-- ---------------------------------------------------------------- published versions
create table if not exists public.scrapbook_versions (
  id uuid primary key default gen_random_uuid(),
  version_number bigint generated always as identity unique,
  label text not null,
  snapshot_json jsonb not null,
  page_count int not null default 0,
  photo_count int not null default 0,
  letter_count int not null default 0,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id)
);

create table if not exists public.scrapbook_publication (
  id int primary key default 1 check (id = 1),
  version_id uuid not null references public.scrapbook_versions (id),
  published_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS: admins only
alter table public.scrapbook_settings enable row level security;
alter table public.scrapbook_pages enable row level security;
alter table public.media_assets enable row level security;
alter table public.letters enable row level security;
alter table public.scrapbook_assets enable row level security;
alter table public.scrapbook_interactions enable row level security;
alter table public.scrapbook_versions enable row level security;
alter table public.scrapbook_publication enable row level security;

drop policy if exists admin_all_settings on public.scrapbook_settings;
create policy admin_all_settings on public.scrapbook_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all_pages on public.scrapbook_pages;
create policy admin_all_pages on public.scrapbook_pages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all_media on public.media_assets;
create policy admin_all_media on public.media_assets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all_letters on public.letters;
create policy admin_all_letters on public.letters
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all_assets on public.scrapbook_assets;
create policy admin_all_assets on public.scrapbook_assets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all_interactions on public.scrapbook_interactions;
create policy admin_all_interactions on public.scrapbook_interactions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all_versions on public.scrapbook_versions;
create policy admin_all_versions on public.scrapbook_versions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all_publication on public.scrapbook_publication;
create policy admin_all_publication on public.scrapbook_publication
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Nothing above is readable by anonymous visitors. Published content is
-- exposed only through the two security-definer functions below.

revoke all on public.scrapbook_settings from anon;
revoke all on public.scrapbook_pages from anon;
revoke all on public.media_assets from anon;
revoke all on public.letters from anon;
revoke all on public.scrapbook_assets from anon;
revoke all on public.scrapbook_interactions from anon;
revoke all on public.scrapbook_versions from anon;
revoke all on public.scrapbook_publication from anon;
revoke all on public.admin_users from anon, authenticated;

grant select, insert, update, delete on public.scrapbook_settings to authenticated;
grant select, insert, update, delete on public.scrapbook_pages to authenticated;
grant select, insert, update, delete on public.media_assets to authenticated;
grant select, insert, update, delete on public.letters to authenticated;
grant select, insert, update, delete on public.scrapbook_assets to authenticated;
grant select, insert, update, delete on public.scrapbook_interactions to authenticated;
grant select, insert, update, delete on public.scrapbook_versions to authenticated;
grant select, insert, update, delete on public.scrapbook_publication to authenticated;

-- ---------------------------------------------------------------- public read RPC
create or replace function public.get_published_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'versionId', v.id,
    'versionNumber', v.version_number,
    'label', v.label,
    'publishedAt', (extract(epoch from v.published_at) * 1000)::bigint,
    'doc', v.snapshot_json
  )
  from public.scrapbook_publication p
  join public.scrapbook_versions v on v.id = p.version_id
  where p.id = 1;
$$;

grant execute on function public.get_published_snapshot() to anon, authenticated;

-- ---------------------------------------------------------------- publish RPC
create or replace function public.publish_version(
  p_snapshot jsonb,
  p_label text,
  p_page_count int default 0,
  p_photo_count int default 0,
  p_letter_count int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_row public.scrapbook_versions;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can publish.' using errcode = '42501';
  end if;

  insert into public.scrapbook_versions
    (label, snapshot_json, page_count, photo_count, letter_count, published_by)
  values
    (coalesce(nullif(trim(p_label), ''), 'Version'),
     p_snapshot, p_page_count, p_photo_count, p_letter_count, auth.uid())
  returning * into new_row;

  insert into public.scrapbook_publication (id, version_id, published_at)
  values (1, new_row.id, now())
  on conflict (id) do update
    set version_id = excluded.version_id,
        published_at = excluded.published_at;

  -- Keep the 25 newest versions; never delete the one just published.
  delete from public.scrapbook_versions
  where id in (
    select id from public.scrapbook_versions
    where id <> new_row.id
    order by version_number desc
    offset 25
  );

  return jsonb_build_object(
    'id', new_row.id,
    'version_number', new_row.version_number,
    'label', new_row.label,
    'published_at', new_row.published_at
  );
end;
$$;

revoke all on function public.publish_version(jsonb, text, int, int, int) from anon;
grant execute on function public.publish_version(jsonb, text, int, int, int) to authenticated;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public)
values ('scrapbook-media', 'scrapbook-media', false)
on conflict (id) do nothing;

-- Administrators can do anything inside the bucket.
drop policy if exists admin_all_storage on storage.objects;
create policy admin_all_storage on storage.objects
  for all to authenticated
  using (bucket_id = 'scrapbook-media' and public.is_admin())
  with check (bucket_id = 'scrapbook-media' and public.is_admin());

-- Visitors may read only frozen, published objects (needed for signed URLs).
drop policy if exists public_read_published_storage on storage.objects;
create policy public_read_published_storage on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'scrapbook-media' and name like 'published/%');

-- Draft uploads/deletes have no anonymous policy, so they are unreachable
-- without an authenticated administrator session.

-- ---------------------------------------------------------------- first admin
-- Run once after creating the account in Authentication → Users:
--   insert into public.admin_users (user_id, email)
--   select id, email from auth.users where email = 'you@example.com'
--   on conflict (user_id) do nothing;
