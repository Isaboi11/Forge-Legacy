-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0204: what Holt remembers (holt_notes, Coach-AI-Amendment-001 CA-D2)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded (create … if not exists, drop policy if exists,
-- create or replace, a pg_constraint check), and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- CA-D2: Holt remembers facts, not conversations. Up to 20 one-line notes per athlete — things the
-- athlete SAID ("Hates lunges", "Left knee flares on deep squats") — sent with each question so he
-- doesn't feel like he forgets you. The athlete sees, edits and deletes them at /holt-memory
-- (Settings → Training → What Holt Remembers).
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  0204_holt_notes.sql, verbatim: the table, a 2-char minimum check, owner-only RLS for select /
--     insert / update / delete, anon revoked, and a BEFORE INSERT trigger that rejects a 21st note
--     with `holt_notes_cap` (under a per-athlete advisory lock, so two devices cannot race past it).
-- §2  asserts the table, RLS, all four policies, the check and the trigger exist, and RAISES if not.
-- §3  reports what landed. Read-only.
--
-- ⚠ BEFORE THIS IS APPLIED the app is fine: `holt-notes-live.ts` reads PGRST205 / 42P01 as "no notes"
--   and the screen shows its empty state.
--
-- ⚠ APPLYING IS NOT THE SAME AS WORKING. Nothing writes notes until the client that proposes them is
--   deployed. Expect §3's note count to be 0 — a non-zero count before then means something is writing
--   this table that should not be.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE MIGRATION (0204_holt_notes.sql, verbatim)
-- ═════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0204 · WHAT HOLT REMEMBERS — the athlete's notes (Coach-AI-Amendment-001 CA-D2)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- CA-D2: *"Holt remembers facts, not conversations."* Continuity comes from a short brief, and part of
-- that brief is up to twenty one-line notes — "Runs Tue/Thu, wants the long run on Sunday", "Hates
-- lunges". This is where they live.
--
-- ══ THE RULES THE TABLE CARRIES ══
--
--   · VISIBLE, EDITABLE, DELETABLE BY THE ATHLETE. Owner-only select / insert / update / delete. A
--     hidden memory is where a wrong fact lives forever (CA-D2, same principle as CL-D3). The screen is
--     `/holt-memory` (Settings → Training → What Holt Remembers).
--   · CAPPED AT 20 PER ATHLETE, in the database, not only in the client. A trigger rejects the 21st
--     insert with the message `holt_notes_cap`; the client proposes a replacement instead. The brief
--     therefore stays a few hundred tokens for the life of the account.
--   · ONE LINE EACH: 2–80 characters.
--   · `source` says where a note came from (e.g. 'ask', 'build-program', 'athlete'). Free text, nullable.
--     It is for the athlete's screen and for audits, never read by the model.
--
-- ⚠ NOTES RECORD WHAT THE ATHLETE SAID, NEVER WHAT THE MODEL INFERRED. Nothing in SQL can enforce
--   that; the client that writes notes must. "Said Monday is their only long day" is a note.
--   "Probably overtrained" is not.
--
-- ⚠ NO ANON ACCESS. Supabase grants `anon` table privileges directly (the 0147 lesson), so they are
--   revoked explicitly; RLS would refuse anyway, but a signed-out client has no business here.
--
-- ⚠ THE CAP TAKES AN ADVISORY LOCK PER ATHLETE, so two inserts racing from two devices cannot both
--   count 19 and land a 21st row.
--
-- Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.holt_notes (
  id          uuid        primary key default gen_random_uuid(),
  athlete_id  uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  text        varchar(80) not null,
  created_at  timestamptz not null default now(),
  source      text
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'holt_notes_text_len') then
    alter table public.holt_notes
      add constraint holt_notes_text_len check (char_length(btrim(text)) >= 2);
  end if;
end $$;

create index if not exists holt_notes_athlete_idx on public.holt_notes (athlete_id, created_at);

comment on table public.holt_notes is
  'Coach Holt''s notes about an athlete (0204, CA-D2): one-line facts the athlete SAID, never model inference. Visible, editable and deletable by the athlete at /holt-memory. Capped at 20 per athlete by trigger holt_notes_cap.';

alter table public.holt_notes enable row level security;

drop policy if exists holt_notes_owner_select on public.holt_notes;
drop policy if exists holt_notes_owner_insert on public.holt_notes;
drop policy if exists holt_notes_owner_update on public.holt_notes;
drop policy if exists holt_notes_owner_delete on public.holt_notes;
create policy holt_notes_owner_select on public.holt_notes for select
  using (athlete_id = auth.uid());
create policy holt_notes_owner_insert on public.holt_notes for insert
  with check (athlete_id = auth.uid());
create policy holt_notes_owner_update on public.holt_notes for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());
create policy holt_notes_owner_delete on public.holt_notes for delete
  using (athlete_id = auth.uid());

revoke all on public.holt_notes from anon;
grant select, insert, update, delete on public.holt_notes to authenticated;

-- ── THE CAP ──────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.holt_notes_enforce_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  held int;
begin
  perform pg_advisory_xact_lock(hashtextextended('holt_notes:' || new.athlete_id::text, 0));
  select count(*) into held from public.holt_notes n where n.athlete_id = new.athlete_id;
  if held >= 20 then
    raise exception 'holt_notes_cap: an athlete keeps at most 20 notes — replace one instead'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists holt_notes_cap on public.holt_notes;
create trigger holt_notes_cap
  before insert on public.holt_notes
  for each row execute function public.holt_notes_enforce_cap();


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  missing text := '';
  p text;
begin
  if to_regclass('public.holt_notes') is null then
    raise exception '0204 DID NOT APPLY. public.holt_notes does not exist.';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.holt_notes'::regclass) then
    missing := missing || ' RLS-not-enabled';
  end if;

  foreach p in array array['holt_notes_owner_select', 'holt_notes_owner_insert', 'holt_notes_owner_update', 'holt_notes_owner_delete'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'holt_notes' and policyname = p) then
      missing := missing || ' policy:' || p;
    end if;
  end loop;

  if not exists (select 1 from pg_constraint where conname = 'holt_notes_text_len') then
    missing := missing || ' holt_notes_text_len';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'holt_notes_cap' and tgrelid = 'public.holt_notes'::regclass and not tgisinternal
  ) then
    missing := missing || ' trigger:holt_notes_cap';
  end if;

  if has_table_privilege('anon', 'public.holt_notes', 'select') then
    missing := missing || ' anon-still-has-select';
  end if;

  if missing <> '' then
    raise exception '0204 DID NOT FULLY APPLY. Missing:%', missing;
  end if;

  raise notice '0204 OK — holt_notes, RLS, 4 owner policies, the length check and the 20-note cap are present.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — WHAT IS NOW THERE. Read-only.
-- ═════════════════════════════════════════════════════════════════════════════

-- Expect 4 rows: delete / insert / select / update, each qual or with_check `(athlete_id = auth.uid())`.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'holt_notes'
order by cmd;

-- Expect: rls_enabled = true, cap_trigger = 1, notes = 0, athletes_with_notes = 0.
select
  (select relrowsecurity from pg_class where oid = 'public.holt_notes'::regclass)          as rls_enabled,
  (select count(*) from pg_trigger
     where tgname = 'holt_notes_cap' and tgrelid = 'public.holt_notes'::regclass)           as cap_trigger,
  (select count(*) from public.holt_notes)                                                  as notes,
  (select count(distinct athlete_id) from public.holt_notes)                                as athletes_with_notes;
