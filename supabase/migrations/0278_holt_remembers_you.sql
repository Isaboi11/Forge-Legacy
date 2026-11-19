-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0278 · HOLT REMEMBERS YOU — what kind of thing a kept fact is, and the off switch
--        (AI Road to 10 Sprint 4b §1.3 + §1.4, CH-4 — Docs/AI-Sprint-4b-Build-Notes.md)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO, 2026-11-18: "Holt remembers by default, with an off switch. Everything he keeps is visible and deletable in
-- /holt-memory. Nothing medical is ever stored. Memory goes in Export My Data and the account wipe."
--
-- ══ WHAT THIS DOES ══
--
--   1. `holt_notes.kind` (nullable text): schedule · gym · like · dislike · avoid · goal · other. The end-of-chat
--      summary (coach-ask `summarize`, caps memory_v1) now also keeps the facts the athlete said, as notes, written
--      AS THE ATHLETE (their JWT, so 0204's RLS applies) with `source = 'chat'` and a kind, so What Holt Remembers can
--      group them. Notes kept before this (the in-chat remember_note card, the builder) have no kind — null, shown
--      under "Other". 0204's cap (20, by trigger) and its 2–80 character rule are UNCHANGED.
--   2. `holt_memory_prefs` — one row per athlete, `remembers boolean not null default true`. NO ROW = ON (the PO's
--      default); the row exists only once the athlete has touched the switch. Owner-only select / insert / update /
--      delete. coach-ask reads it AS THE ATHLETE in `summarize` (every app version — a person who turned memory off on
--      a new phone is not remembered from an old one either) and in `get_past_chats`.
--
-- ══ THE ACCOUNT WIPE ══
--
-- `athlete_id … references auth.users(id) on delete cascade` — `delete_my_account()` deletes the auth.users row, and
-- the switch goes with it, as holt_notes (0204) and holt_chat_summaries (0218) already do.
--
-- ⚠ NO ANON, NO PUBLIC. Supabase grants table privileges to `anon` directly (the 0147 lesson), so both are revoked
--   explicitly; RLS would refuse anyway.
--
-- ⚠ NO FUNCTION IS CREATED OR CHANGED — tables, a column, a check, policies and grants only. Nothing live is retyped.
--
-- ⚠ BACK-COMPATIBLE WITH EVERY DEPLOYED CLIENT: the new column is nullable with no default, so 0204's insert path
--   (`{text, source}`) is untouched; the new table is read by nothing deployed until coach-ask v30 and the 4b app.
--   Apply BEFORE the coach-ask redeploy (it reads both); coach-ask also copes with either missing (no table = on, no
--   column = the fact is kept without a kind).
--
-- Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. What kind of thing a fact is ──────────────────────────────────────────────────────────────────

alter table public.holt_notes add column if not exists kind text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'holt_notes_kind_check') then
    alter table public.holt_notes
      add constraint holt_notes_kind_check
      check (kind is null or kind in ('schedule', 'gym', 'like', 'dislike', 'avoid', 'goal', 'other'));
  end if;
end $$;

comment on column public.holt_notes.kind is
  'What kind of fact (0278, Sprint 4b): schedule, gym, like, dislike, avoid, goal, other. Null on notes kept before 0278. Facts kept from a chat have source ''chat''.';

-- ── 2. The off switch ────────────────────────────────────────────────────────────────────────────────

create table if not exists public.holt_memory_prefs (
  athlete_id  uuid        primary key default auth.uid() references auth.users(id) on delete cascade,
  remembers   boolean     not null default true,
  updated_at  timestamptz not null default now()
);

comment on table public.holt_memory_prefs is
  'Holt''s memory switch (0278, Sprint 4b §1.4). No row = on. remembers = false: no chat summary, no kept facts, no past chats saved or read, no notes in the brief. What is already kept stays until the athlete deletes it at /holt-memory.';

alter table public.holt_memory_prefs enable row level security;

drop policy if exists holt_memory_prefs_owner_select on public.holt_memory_prefs;
drop policy if exists holt_memory_prefs_owner_insert on public.holt_memory_prefs;
drop policy if exists holt_memory_prefs_owner_update on public.holt_memory_prefs;
drop policy if exists holt_memory_prefs_owner_delete on public.holt_memory_prefs;
create policy holt_memory_prefs_owner_select on public.holt_memory_prefs for select
  using (athlete_id = auth.uid());
create policy holt_memory_prefs_owner_insert on public.holt_memory_prefs for insert
  with check (athlete_id = auth.uid());
create policy holt_memory_prefs_owner_update on public.holt_memory_prefs for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());
create policy holt_memory_prefs_owner_delete on public.holt_memory_prefs for delete
  using (athlete_id = auth.uid());

revoke all on public.holt_memory_prefs from public, anon;
grant select, insert, update, delete on public.holt_memory_prefs to authenticated;

commit;
