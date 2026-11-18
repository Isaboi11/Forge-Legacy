-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0275: "Send this to Forge so we learn this format?" (AI Road to 10 Sprint 3b, IM-5)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, a create-or-replace, or drop-then-create; §3 is read-only.
-- The editor shows only the LAST result — that is §3.
--
-- Apply order for Sprint 3b: 0274 → 0275 → 0276. 0275 depends on nothing in 0274/0276.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO 2026-11-17 (IM-5): when an import is unsure, the athlete may send it to Forge so the reader learns the format —
-- their choice every time, text only unless they tick "include the photo", kept 90 days, operators only.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  · `import_misses` — one row per send. RLS on, NO policy, NO client grant. Written only by
--       `import_miss_send(...)` (the account is auth.uid(), never a parameter; 20 a day at most; a photo path must be
--       the athlete's own, already uploaded); read only by `admin_import_misses(...)` (admin_guard).
--     · `import-misses` storage bucket, PRIVATE: athletes upload into their own folder only and read nothing back;
--       operators read (signed URL) only while a photo is under 90 days old, and may delete.
--     · `import_misses_purge(1000)` daily at 04:35 UTC (cron `forge-import-misses-purge`): rows past 90 days go.
--     · `import_miss_photo_debts` + a delete trigger: SQL CANNOT delete storage bytes (storage.protect_delete, see
--       0142), so a purged or account-deleted row's photo path is written down; the /admin "Import misses" card
--       deletes those files through the Storage API with the operator's session and clears them. The bytes are
--       unreadable from day 90 either way — the bucket's select policy refuses them.
-- §2  asserts the tables, RLS, the revokes, every function and its guard, the trigger, the bucket (private), the
--     three storage policies and the cron job. RAISES if any is missing.
-- §3  one row: what landed, and how many misses there are.
--
-- ⚠ OLD CLIENTS ARE UNAFFECTED: nothing existing changes. Only an app with the IM-5 offer calls these; an app with it
--   that meets a database WITHOUT this file says "Sending isn't switched on yet — nothing was sent".
-- ⚠ APPLYING IT SENDS NOTHING. Rows appear only after an athlete taps "Send to Forge" on the updated app.
--
-- ══ PREDICTED §3 (2026-11-18) ══
--   misses = 0 · photo_debts = 0 · bucket_public = false · storage_policies = 3 · purge_job_active = true ·
--   anon_can_send = false · authenticated_can_send = true · authenticated_can_read_table = false
--   (0 misses because the client that sends is committed, not shipped — a non-zero count means something else is
--   writing rows it should not.)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0275_import_misses.sql)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. The misses ──────────────────────────────────────────────────────────────────────────────────
create table if not exists public.import_misses (
  id           uuid        primary key default gen_random_uuid(),
  athlete_id   uuid        not null references auth.users (id) on delete cascade,
  kind         text        not null,
  input_text   text,
  photo_path   text,
  read         jsonb       not null,
  corrected    jsonb,
  app_version  text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid,
  resolution   text,
  constraint import_misses_kind_check        check (kind in ('paste', 'photo')),
  constraint import_misses_text_size         check (input_text is null or char_length(input_text) <= 20000),
  constraint import_misses_read_size         check (pg_column_size(read) <= 262144),
  constraint import_misses_corrected_size    check (corrected is null or pg_column_size(corrected) <= 262144),
  constraint import_misses_version_size      check (app_version is null or char_length(app_version) <= 40),
  constraint import_misses_resolution_size   check (resolution is null or char_length(resolution) <= 1000),
  constraint import_misses_something_sent    check (input_text is not null or photo_path is not null),
  constraint import_misses_photo_own_folder  check (photo_path is null or photo_path like athlete_id::text || '/%')
);

create index if not exists import_misses_created on public.import_misses (created_at desc);
create index if not exists import_misses_athlete_day on public.import_misses (athlete_id, created_at desc);

alter table public.import_misses enable row level security;
-- ⚠ No policy on purpose, and no grant: only the definer functions below touch it.
revoke all on table public.import_misses from public, anon, authenticated;

comment on table public.import_misses is
  'IM-5: an import the reader was unsure of, sent by the athlete''s own tap ("Send this to Forge so we learn this format?"). Written only by import_miss_send, read only by admin_import_misses, deleted at 90 days by import_misses_purge (0275).';

-- ── 2. Photo bytes still owed to the bucket ────────────────────────────────────────────────────────
create table if not exists public.import_miss_photo_debts (
  path        text        primary key,
  owed_since  timestamptz not null default now()
);

alter table public.import_miss_photo_debts enable row level security;
revoke all on table public.import_miss_photo_debts from public, anon, authenticated;

comment on table public.import_miss_photo_debts is
  'Paths in the private import-misses bucket whose row is gone (90-day purge, account deleted). SQL cannot delete storage bytes (storage.protect_delete); the /admin card deletes them through the Storage API and clears them (0275).';

create or replace function public.import_misses_owe_photo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.photo_path is not null then
    insert into public.import_miss_photo_debts (path) values (old.photo_path) on conflict (path) do nothing;
  end if;
  return old;
end;
$$;

drop trigger if exists import_misses_owe_photo on public.import_misses;
create trigger import_misses_owe_photo
  before delete on public.import_misses
  for each row execute function public.import_misses_owe_photo();

-- ── 3. The private bucket ──────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('import-misses', 'import-misses', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The athlete's own folder, upload only. No read-back, no list: what was sent is gone from their hands.
drop policy if exists "import_misses_own_insert" on storage.objects;
create policy "import_misses_own_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'import-misses' and (storage.foldername(name))[1] = auth.uid()::text);

-- Operators read (a signed URL needs select) — and only inside the 90 days, so a photo past it is unreadable even
-- before its bytes are deleted.
drop policy if exists "import_misses_admin_select" on storage.objects;
create policy "import_misses_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'import-misses' and public.is_app_admin() and created_at > now() - interval '90 days');

-- Operators delete (the /admin card settling `import_miss_photo_debts`).
drop policy if exists "import_misses_admin_delete" on storage.objects;
create policy "import_misses_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'import-misses' and public.is_app_admin());

-- ── 4. The athlete's send ──────────────────────────────────────────────────────────────────────────
--
-- ⚠ THE ACCOUNT IS auth.uid(), NEVER A PARAMETER — an athlete can only ever file their own row.
-- ⚠ A PHOTO MUST ALREADY BE IN THEIR OWN FOLDER (uploaded first by the app). A path to anybody else's file, or to a
--   file that is not there, is refused.
-- ⚠ AT MOST 20 A DAY per athlete: it is a button, not a pipe.
create or replace function public.import_miss_send(
  p_kind        text,
  p_text        text,
  p_photo_path  text,
  p_read        jsonb,
  p_corrected   jsonb,
  p_app_version text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'import_miss_send: not signed in' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('paste', 'photo') then
    raise exception 'import_miss_send: unknown kind %', p_kind using errcode = '22023';
  end if;
  if p_read is null or jsonb_typeof(p_read) <> 'object' then
    raise exception 'import_miss_send: what was read is missing' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_text, '')), '') is null and p_photo_path is null then
    raise exception 'import_miss_send: nothing to send' using errcode = '22023';
  end if;
  if p_photo_path is not null then
    if p_photo_path not like v_uid::text || '/%' or p_photo_path like '%..%' then
      raise exception 'import_miss_send: the photo is not in your folder' using errcode = '42501';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'import-misses' and o.name = p_photo_path) then
      raise exception 'import_miss_send: the photo was not uploaded' using errcode = '22023';
    end if;
  end if;
  if (select count(*) from public.import_misses m
       where m.athlete_id = v_uid and m.created_at > now() - interval '1 day') >= 20 then
    raise exception 'import_miss_send: that is enough for today' using errcode = '54000';
  end if;

  insert into public.import_misses (athlete_id, kind, input_text, photo_path, read, corrected, app_version)
  values (v_uid, p_kind, nullif(btrim(coalesce(p_text, '')), ''), p_photo_path, p_read, p_corrected,
          left(nullif(btrim(coalesce(p_app_version, '')), ''), 40))
  returning id into v_id;
  return v_id;
end;
$$;

comment on function public.import_miss_send(text, text, text, jsonb, jsonb, text) is
  'IM-5: the athlete''s "Send this to Forge" tap. Files ONE row for auth.uid() — the paste or the card reader''s words, what was read, what they changed, the app version, and a photo path only if they ticked it (already uploaded to their own folder of the private import-misses bucket). 20 a day at most (0275).';

-- ── 5. The operators' queue ────────────────────────────────────────────────────────────────────────
create or replace function public.admin_import_misses(p_limit integer default 100, p_include_resolved boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_out jsonb;
begin
  perform public.admin_guard();

  select coalesce(jsonb_agg(x.item order by x.created_at desc), '[]'::jsonb)
    into v_out
    from (
      select m.created_at,
             jsonb_build_object(
               'id',          m.id,
               'created_at',  m.created_at,
               'kind',        m.kind,
               'input_text',  m.input_text,
               'photo_path',  m.photo_path,
               'read',        m.read,
               'corrected',   m.corrected,
               'app_version', m.app_version,
               'athlete_id',  m.athlete_id,
               'athlete',     coalesce(nullif(btrim(p.name), ''), p.handle::text, 'Unknown'),
               'handle',      p.handle::text,
               'resolved_at', m.resolved_at,
               'resolution',  m.resolution
             ) as item
        from public.import_misses m
        left join public.profiles p on p.id = m.athlete_id
       where m.created_at > now() - interval '90 days'
         and (p_include_resolved or m.resolved_at is null)
       order by m.created_at desc
       limit least(greatest(coalesce(p_limit, 100), 1), 500)
    ) x;
  return v_out;
end;
$$;

comment on function public.admin_import_misses(integer, boolean) is
  'IM-5: the /admin "Import misses" queue — newest first, unresolved unless asked, 90 days at most. Operators only (admin_guard) (0275).';

create or replace function public.admin_import_miss_resolve(p_id uuid, p_resolution text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_n int;
begin
  perform public.admin_guard();
  update public.import_misses m
     set resolved_at = now(),
         resolved_by = auth.uid(),
         resolution  = left(nullif(btrim(coalesce(p_resolution, '')), ''), 1000)
   where m.id = p_id;
  get diagnostics v_n = row_count;
  return v_n = 1;
end;
$$;

comment on function public.admin_import_miss_resolve(uuid, text) is
  'IM-5: an operator marks a miss handled — a reader rule and a corpus case, or an answer — with a short note. Operators only (0275).';

create or replace function public.admin_import_miss_photo_debts()
returns text[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  return coalesce((select array_agg(d.path order by d.owed_since) from public.import_miss_photo_debts d), '{}'::text[]);
end;
$$;

-- Clears only the paths whose file is really gone from the bucket — a failed Storage API delete stays owed.
create or replace function public.admin_import_miss_photos_cleared(p_paths text[])
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_n int;
begin
  perform public.admin_guard();
  delete from public.import_miss_photo_debts d
   where d.path = any (coalesce(p_paths, '{}'::text[]))
     and not exists (select 1 from storage.objects o where o.bucket_id = 'import-misses' and o.name = d.path);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ── 6. The 90-day purge ────────────────────────────────────────────────────────────────────────────
create or replace function public.import_misses_purge(p_limit integer default 1000)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_n int;
begin
  -- The trigger writes each deleted row's photo path into import_miss_photo_debts.
  with doomed as (
    select m.id from public.import_misses m
     where m.created_at < now() - interval '90 days'
     order by m.created_at
     limit greatest(coalesce(p_limit, 1000), 0)
  )
  delete from public.import_misses m using doomed d where m.id = d.id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

comment on function public.import_misses_purge(integer) is
  'IM-5: deletes import misses older than 90 days (PO 11-17). Daily, forge-import-misses-purge. Photo bytes are owed through import_miss_photo_debts (0275).';

select cron.unschedule('forge-import-misses-purge')
 where exists (select 1 from cron.job where jobname = 'forge-import-misses-purge');
select cron.schedule('forge-import-misses-purge', '35 4 * * *', $cron$ select public.import_misses_purge(1000); $cron$);

-- ── 7. Grants — Supabase grants EXECUTE on every new function to anon AND authenticated DIRECTLY ──────
revoke all on function public.import_misses_owe_photo()                                  from public, anon, authenticated;
revoke all on function public.import_misses_purge(integer)                               from public, anon, authenticated;
revoke all on function public.import_miss_send(text, text, text, jsonb, jsonb, text)     from public, anon;
grant execute on function public.import_miss_send(text, text, text, jsonb, jsonb, text)  to authenticated;
revoke all on function public.admin_import_misses(integer, boolean)                      from public, anon;
grant execute on function public.admin_import_misses(integer, boolean)                   to authenticated;
revoke all on function public.admin_import_miss_resolve(uuid, text)                      from public, anon;
grant execute on function public.admin_import_miss_resolve(uuid, text)                   to authenticated;
revoke all on function public.admin_import_miss_photo_debts()                            from public, anon;
grant execute on function public.admin_import_miss_photo_debts()                         to authenticated;
revoke all on function public.admin_import_miss_photos_cleared(text[])                   from public, anon;
grant execute on function public.admin_import_miss_photos_cleared(text[])                to authenticated;

commit;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ───────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare
  f text;
  r text;
  p text;
begin
  foreach f in array array['public.import_misses', 'public.import_miss_photo_debts'] loop
    if to_regclass(f) is null then
      raise exception '0275 §2: table % was not created', f;
    end if;
    if not (select c.relrowsecurity from pg_class c where c.oid = f::regclass) then
      raise exception '0275 §2: row level security is OFF on %', f;
    end if;
    foreach r in array array['anon', 'authenticated'] loop
      foreach p in array array['select', 'insert', 'update', 'delete'] loop
        if has_table_privilege(r, f, p) then
          raise exception '0275 §2: % can % % directly — the revoke did not take', r, p, f;
        end if;
      end loop;
    end loop;
  end loop;

  foreach f in array array['public.import_misses_owe_photo()', 'public.import_misses_purge(integer)',
                           'public.import_miss_send(text, text, text, jsonb, jsonb, text)',
                           'public.admin_import_misses(integer, boolean)', 'public.admin_import_miss_resolve(uuid, text)',
                           'public.admin_import_miss_photo_debts()', 'public.admin_import_miss_photos_cleared(text[])'] loop
    if to_regprocedure(f) is null then
      raise exception '0275 §2: % was not created', f;
    end if;
    if has_function_privilege('anon', f, 'execute') then
      raise exception '0275 §2: anon can execute % — the revoke did not take', f;
    end if;
  end loop;

  foreach f in array array['public.import_misses_owe_photo()', 'public.import_misses_purge(integer)'] loop
    if has_function_privilege('authenticated', f, 'execute') then
      raise exception '0275 §2: authenticated can execute % — internal only', f;
    end if;
  end loop;

  foreach f in array array['public.import_miss_send(text, text, text, jsonb, jsonb, text)',
                           'public.admin_import_misses(integer, boolean)', 'public.admin_import_miss_resolve(uuid, text)',
                           'public.admin_import_miss_photo_debts()', 'public.admin_import_miss_photos_cleared(text[])'] loop
    if not has_function_privilege('authenticated', f, 'execute') then
      raise exception '0275 §2: authenticated cannot execute % — the app could never call it', f;
    end if;
  end loop;

  foreach f in array array['admin_import_misses', 'admin_import_miss_resolve', 'admin_import_miss_photo_debts',
                           'admin_import_miss_photos_cleared'] loop
    if position('admin_guard' in (select p2.prosrc from pg_proc p2 join pg_namespace n on n.oid = p2.pronamespace
                                    where n.nspname = 'public' and p2.proname = f)) = 0 then
      raise exception '0275 §2: % is not guarded by admin_guard()', f;
    end if;
  end loop;

  if not exists (select 1 from pg_trigger t where t.tgname = 'import_misses_owe_photo'
                   and t.tgrelid = 'public.import_misses'::regclass) then
    raise exception '0275 §2: the photo-debt trigger is missing';
  end if;
  if not exists (select 1 from storage.buckets b where b.id = 'import-misses' and b.public = false) then
    raise exception '0275 §2: bucket import-misses is missing or PUBLIC — it must be private';
  end if;
  if (select count(*) from pg_policies pp where pp.schemaname = 'storage' and pp.tablename = 'objects'
        and pp.policyname in ('import_misses_own_insert', 'import_misses_admin_select', 'import_misses_admin_delete')) <> 3 then
    raise exception '0275 §2: the three import-misses storage policies did not all land';
  end if;
  if not exists (select 1 from cron.job j where j.jobname = 'forge-import-misses-purge' and j.active) then
    raise exception '0275 §2: cron job forge-import-misses-purge is missing or inactive';
  end if;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — WHAT LANDED. Read-only. Predicted in the header.
-- ───────────────────────────────────────────────────────────────────────────────────────────────
select (select count(*) from public.import_misses) as misses,
       (select count(*) from public.import_miss_photo_debts) as photo_debts,
       (select b.public from storage.buckets b where b.id = 'import-misses') as bucket_public,
       (select count(*) from pg_policies pp where pp.schemaname = 'storage' and pp.tablename = 'objects'
          and pp.policyname like 'import\_misses\_%') as storage_policies,
       (select j.active from cron.job j where j.jobname = 'forge-import-misses-purge') as purge_job_active,
       has_function_privilege('anon', 'public.import_miss_send(text, text, text, jsonb, jsonb, text)', 'execute') as anon_can_send,
       has_function_privilege('authenticated', 'public.import_miss_send(text, text, text, jsonb, jsonb, text)', 'execute') as authenticated_can_send,
       has_table_privilege('authenticated', 'public.import_misses', 'select') as authenticated_can_read_table;
