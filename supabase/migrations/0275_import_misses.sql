-- Forge Legacy — 0275: "Send this to Forge so we learn this format?" (AI Road to 10 Sprint 3b, IM-5)
--
-- PO 2026-11-17: "If it's a new format we haven't seen and we're not confident … it would go to me or to Claude and
-- be able to adapt … then saving that format moving forward." Decisions (Docs/Import-Accuracy-Plan.md, PO 11-17):
-- text only by default, the photo only when the athlete ticks "include the photo"; kept 90 days, then deleted; the
-- question shows only on an unsure read, and nothing is sent without the tap — every time.
--
-- WHAT IT ADDS
--   · `import_misses` — one row per send: what the reader saw (the paste, or the card reader's words for a photo),
--     what was read (the preview's weeks, the skipped lines, the checks), what the athlete changed by hand, the app
--     version, the account, and — only if ticked — the path of the photo in the PRIVATE `import-misses` bucket.
--     RLS on, no policy, no client grant: the athlete writes ONLY through `import_miss_send` (their own row — the
--     account is auth.uid(), never a parameter); operators read ONLY through `admin_import_misses`.
--   · `import-misses` bucket, PRIVATE (a photographed program can show a face, a handle, an injury note — unlike the
--     public photo buckets). An athlete uploads into their own folder only and can read nothing back; an operator
--     can read a photo only while it is under 90 days old.
--   · The 90-day purge (`import_misses_purge`, daily cron `forge-import-misses-purge`).
--   · `import_miss_photo_debts` — ⚠ SQL CANNOT DELETE STORAGE BYTES (storage.protect_delete, see 0142). A purged or
--     account-deleted row's photo path is written here; the /admin "Import misses" card deletes those files through
--     the Storage API with the operator's own session and clears them (`admin_import_miss_photos_cleared`). Until
--     then the bytes are unreadable: the bucket's select policy refuses anything past 90 days, to everyone.
--
-- Old clients are unaffected: nothing existing changes; only an app with the IM-5 button calls these.

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
