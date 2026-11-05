-- KABBU SCRAPBOOK — private studio + public links (Supabase / Postgres)
--
-- Apply this file in the Supabase SQL editor, then:
--   1. Authentication → Users: create the administrator (email + password).
--   2. Insert their id:
--        insert into public.admin_users (user_id, email)
--        values ('<their-user-id>', '<their-email>');
--   3. Put VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the build environment.
--
-- The service-role key is never used by the browser. Admin writes are
-- authorized here by Supabase Auth + row-level security, and the public site
-- can only ever read published snapshots through security-definer functions.
--
-- What lives where:
--   books                 one row per scrapbook: unique slug, metadata, draft JSON, revision
--   scrapbook_versions    frozen snapshots created by publish_version()
--   scrapbook_publication which version each scrapbook currently serves
--   scrapbook_profile     the maker's public profile (name, note, avatar)
--   Storage bucket        private scrapbook-media; only published/% is readable by readers
--
-- Replaces the earlier single-book schema. If you already applied that one,
-- the old tables are incompatible with this file: the old scrapbook_versions
-- has no book_id column, and `create table if not exists` will silently keep
-- it, so publishing and the public link would fail. Run this once:
--
--   drop table if exists
--     public.scrapbook_interactions,
--     public.scrapbook_assets,
--     public.letters,
--     public.media_assets,
--     public.scrapbook_pages,
--     public.scrapbook_settings,
--     public.scrapbook_versions,
--     public.scrapbook_publication
--   cascade;
--
-- That deletes the old single-book draft and version history. Export any
-- content you want to keep from the studio first, then recreate it after
-- applying this file. A database created with this file needs no drop.
-- The Storage bucket and its objects are left untouched; the old draft/ and
-- published/ files become unreferenced and can be deleted from the dashboard.

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
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------- scrapbooks
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'A new scrapbook',
  recipient text not null default '',
  revision bigint not null default 0,
  page_count integer not null default 0,
  photo_count integer not null default 0,
  draft_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  version_number integer,
  constraint books_slug_format
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$')
);

create table if not exists public.scrapbook_versions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  version_number integer not null,
  label text not null default '',
  snapshot_json jsonb not null,
  page_count integer not null default 0,
  photo_count integer not null default 0,
  letter_count integer not null default 0,
  published_at timestamptz not null default now(),
  unique (book_id, version_number)
);

create index if not exists scrapbook_versions_book_idx
  on public.scrapbook_versions (book_id, version_number desc);

create table if not exists public.scrapbook_publication (
  book_id uuid primary key references public.books (id) on delete cascade,
  version_id uuid not null references public.scrapbook_versions (id) on delete cascade,
  published_at timestamptz not null default now()
);

create table if not exists public.scrapbook_profile (
  id int primary key default 1 check (id = 1),
  profile_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------- RLS
alter table public.books enable row level security;
alter table public.scrapbook_versions enable row level security;
alter table public.scrapbook_publication enable row level security;
alter table public.scrapbook_profile enable row level security;

drop policy if exists "admins manage books" on public.books;
create policy "admins manage books" on public.books
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins manage versions" on public.scrapbook_versions;
create policy "admins manage versions" on public.scrapbook_versions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins manage publication" on public.scrapbook_publication;
create policy "admins manage publication" on public.scrapbook_publication
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins manage profile" on public.scrapbook_profile;
create policy "admins manage profile" on public.scrapbook_profile
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.books to authenticated;
grant select, insert, delete on public.scrapbook_versions to authenticated;
grant select, insert, update, delete on public.scrapbook_publication to authenticated;
grant select, insert, update, delete on public.scrapbook_profile to authenticated;

-- ---------------------------------------------------------------- publishing
-- Creates an immutable snapshot and points the scrapbook at it in one
-- transaction. Only the signed-in administrator can call this.
create or replace function public.publish_version(
  p_book_id uuid,
  p_snapshot jsonb,
  p_label text,
  p_page_count integer,
  p_photo_count integer,
  p_letter_count integer
)
returns table (id uuid, version_number integer, published_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_id uuid;
  v_time timestamptz := now();
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'Only the administrator can publish scrapbooks';
  end if;

  perform 1 from public.books where books.id = p_book_id for update;
  if not found then
    raise exception 'Scrapbook not found';
  end if;

  select coalesce(max(v.version_number), 0) + 1
    into v_next
    from public.scrapbook_versions v
   where v.book_id = p_book_id;

  v_label := coalesce(nullif(btrim(p_label), ''), 'Version ' || v_next);

  insert into public.scrapbook_versions (
    book_id, version_number, label, snapshot_json,
    page_count, photo_count, letter_count, published_at
  )
  values (
    p_book_id, v_next, v_label, p_snapshot,
    coalesce(p_page_count, 0), coalesce(p_photo_count, 0), coalesce(p_letter_count, 0), v_time
  )
  returning scrapbook_versions.id into v_id;

  insert into public.scrapbook_publication (book_id, version_id, published_at)
  values (p_book_id, v_id, v_time)
  on conflict (book_id) do update
    set version_id = excluded.version_id,
        published_at = excluded.published_at;

  update public.books
     set published_at = v_time,
         version_number = v_next
   where books.id = p_book_id;

  return query select v_id, v_next, v_time;
end;
$$;

revoke all on function public.publish_version(uuid, jsonb, text, integer, integer, integer) from anon;
grant execute on function public.publish_version(uuid, jsonb, text, integer, integer, integer) to authenticated;

-- ---------------------------------------------------------------- public reads
-- Readers resolve a shared link (#/s/<slug>) through this function. It only
-- ever returns the published snapshot for that slug, never a draft.
create or replace function public.get_published_by_slug(p_slug text)
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
    'publishedAt', (extract(epoch from p.published_at) * 1000)::bigint,
    'doc', v.snapshot_json
  )
  from public.books b
  join public.scrapbook_publication p on p.book_id = b.id
  join public.scrapbook_versions v on v.id = p.version_id
  where b.slug = lower(p_slug)
  limit 1;
$$;

-- The shelf: every published scrapbook, newest first.
create or replace function public.list_published_books()
returns table (
  id uuid,
  slug text,
  title text,
  subtitle text,
  recipient text,
  sender text,
  "publishedAt" bigint,
  "versionNumber" integer,
  "pageCount" integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.slug,
    b.title,
    coalesce(v.snapshot_json -> 'meta' ->> 'subtitle', ''),
    coalesce(v.snapshot_json -> 'meta' ->> 'recipient', b.recipient),
    coalesce(v.snapshot_json -> 'meta' ->> 'sender', ''),
    (extract(epoch from p.published_at) * 1000)::bigint,
    v.version_number,
    coalesce(jsonb_array_length(v.snapshot_json -> 'pages'), 0)
  from public.books b
  join public.scrapbook_publication p on p.book_id = b.id
  join public.scrapbook_versions v on v.id = p.version_id
  order by p.published_at desc;
$$;

create or replace function public.get_maker_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profile_json from public.scrapbook_profile where id = 1),
    'null'::jsonb
  );
$$;

revoke all on function public.get_published_by_slug(text) from public;
revoke all on function public.list_published_books() from public;
revoke all on function public.get_maker_profile() from public;
grant execute on function public.get_published_by_slug(text) to anon, authenticated;
grant execute on function public.list_published_books() to anon, authenticated;
grant execute on function public.get_maker_profile() to anon, authenticated;

-- ---------------------------------------------------------------- storage
-- Private bucket. Drafts and published copies both live here; only the
-- published/ prefix is readable without an admin session.
insert into storage.buckets (id, name, public)
values ('scrapbook-media', 'scrapbook-media', false)
on conflict (id) do nothing;

drop policy if exists "admins manage scrapbook media" on storage.objects;
create policy "admins manage scrapbook media" on storage.objects
  for all to authenticated
  using (bucket_id = 'scrapbook-media' and public.is_admin())
  with check (bucket_id = 'scrapbook-media' and public.is_admin());

drop policy if exists "readers open published media" on storage.objects;
create policy "readers open published media" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'scrapbook-media' and name like 'published/%');
