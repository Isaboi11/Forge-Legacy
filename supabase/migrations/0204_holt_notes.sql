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
