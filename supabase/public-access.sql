-- Kabbu scrapbook — public access controls (reader passcode + kill switch)
--
-- Paste this whole file in the Supabase SQL editor ONCE, after schema.sql.
-- It is idempotent and safe to re-run. It does not touch drafts, versions,
-- photos or your settings. It replaces the earlier supabase/kill-switch.sql.
--
-- Two owner controls, both enforced by the database:
--
--   1. Reader passcode — a per-book passcode a visitor must type before the
--      shared link (#/s/<slug>) opens. The server checks it and only sends the
--      book's pages once it matches. Set or remove it in the studio:
--      Settings → Reader passcode.
--
--   2. Kill switch — one row that closes every public read at once. See the
--      bottom of this file for the two lines that flip it.
--
-- The admin studio keeps working while either is active.

create extension if not exists pgcrypto;

-- 1. The one-row kill switch -------------------------------------------------
create table if not exists public.site_switch (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.site_switch (id) values (true) on conflict (id) do nothing;

alter table public.site_switch enable row level security;
revoke all on table public.site_switch from anon, authenticated;

create or replace function public.site_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select enabled from public.site_switch where id), true);
$$;

revoke all on function public.site_enabled() from public;
grant execute on function public.site_enabled() to anon, authenticated;

-- 2. Reader passcode ---------------------------------------------------------
-- Only a bcrypt hash is stored. pgcrypto lives in the extensions schema on
-- Supabase, so the functions below search both schemas.
alter table public.books add column if not exists reader_lock_hash text;

create or replace function public.set_reader_lock(p_book_id uuid, p_passcode text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pass text := nullif(btrim(coalesce(p_passcode, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Only the administrator can change the reader passcode';
  end if;

  if v_pass is not null and length(v_pass) < 4 then
    raise exception 'Use at least four characters for the reader passcode';
  end if;

  update public.books
     set reader_lock_hash = case
           when v_pass is null then null
           else crypt(v_pass, gen_salt('bf'))
         end
   where books.id = p_book_id;

  if not found then
    raise exception 'Scrapbook not found';
  end if;
end;
$$;

revoke all on function public.set_reader_lock(uuid, text) from public;
grant execute on function public.set_reader_lock(uuid, text) to authenticated;

-- 3. Public reads ------------------------------------------------------------
-- The old one-argument lookup must go, otherwise readers could still call it
-- and skip the passcode.
drop function if exists public.get_published_by_slug(text);
drop function if exists public.get_published_by_slug(text, text);

create function public.get_published_by_slug(p_slug text, p_passcode text default null)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select case
    when b.reader_lock_hash is not null
      and (
        p_passcode is null
        or crypt(p_passcode, b.reader_lock_hash) <> b.reader_lock_hash
      )
      then jsonb_build_object('locked', true)
    else jsonb_build_object(
      'versionId', v.id,
      'versionNumber', v.version_number,
      'label', v.label,
      'publishedAt', (extract(epoch from p.published_at) * 1000)::bigint,
      'doc', v.snapshot_json
    )
  end
  from public.books b
  join public.scrapbook_publication p on p.book_id = b.id
  join public.scrapbook_versions v on v.id = p.version_id
  where b.slug = lower(p_slug)
    and public.site_enabled()
  limit 1;
$$;

-- Changing the row shape requires dropping the old version first.
drop function if exists public.list_published_books();

create function public.list_published_books()
returns table (
  id uuid,
  slug text,
  title text,
  subtitle text,
  recipient text,
  sender text,
  "publishedAt" bigint,
  "versionNumber" integer,
  "pageCount" integer,
  locked boolean
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
    coalesce(jsonb_array_length(v.snapshot_json -> 'pages'), 0),
    (b.reader_lock_hash is not null)
  from public.books b
  join public.scrapbook_publication p on p.book_id = b.id
  join public.scrapbook_versions v on v.id = p.version_id
  where public.site_enabled()
  order by p.published_at desc;
$$;

create or replace function public.get_maker_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.site_enabled() then coalesce(
      (select profile_json from public.scrapbook_profile where id = 1),
      'null'::jsonb
    )
    else 'null'::jsonb
  end;
$$;

revoke all on function public.get_published_by_slug(text, text) from public;
revoke all on function public.list_published_books() from public;
revoke all on function public.get_maker_profile() from public;
grant execute on function public.get_published_by_slug(text, text) to anon, authenticated;
grant execute on function public.list_published_books() to anon, authenticated;
grant execute on function public.get_maker_profile() to anon, authenticated;

-- 4. Media links -------------------------------------------------------------
-- New signed URLs are only issued while the switch is ON. URLs handed out in
-- the last 24 hours stay valid until they expire; nothing can revoke those.
drop policy if exists "readers open published media" on storage.objects;
create policy "readers open published media" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'scrapbook-media'
    and name like 'published/%'
    and public.site_enabled()
  );

-- 5. Flip the switch ---------------------------------------------------------
-- OFF — the live site stops serving books within seconds:
-- update public.site_switch set enabled = false, updated_at = now();
--
-- ON — everything comes back:
-- update public.site_switch set enabled = true, updated_at = now();
--
-- Check the current state:
-- select enabled, updated_at from public.site_switch;

-- Note on the passcode: it is a link-sharing gate, not an account system.
-- There is no rate limit in this file, so use a passcode you would not mind
-- someone guessing slowly. Pages and photos never reach the browser until the
-- passcode matches; a determined visitor could still see that a published
-- book's media files exist in storage.
