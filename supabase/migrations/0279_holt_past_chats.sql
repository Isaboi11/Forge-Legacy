-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0279 · PAST CHATS — every conversation with Holt, kept, browsable, searchable, continuable
--        (AI Road to 10 Sprint 4b "Holt remembers you", CH-4 — Docs/AI-Sprint-4b-Build-Notes.md §1.5)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Until now a chat with Holt lived only on the phone and was gone the moment it ended; all that
-- survived was a 2–3 line summary (0218). This keeps the conversation itself — the athlete's lines,
-- Holt's lines and the app's short bracketed notes of what it did — so the athlete can read an old
-- chat at `/holt-chats`, search them, and carry on where one left off.
--
-- ══ THE RULES THE TABLE CARRIES ══
--
--   · THE ID IS MADE ON THE PHONE, at the chat's first athlete line, so every save of one chat is an
--     upsert of the SAME row — including after "Continue this chat". (A default exists only as a
--     fallback; the app always sends its own.)
--   · VISIBLE AND DELETABLE BY THE ATHLETE. Owner-only select / insert / update / delete. Update is
--     needed: a chat grows after every reply. `with check` stops a row being handed to anyone else.
--   · NOTHING MEDICAL IS STORED. ⚠ SQL cannot see that — the app runs every line through the same
--     code guard the question goes through (`storedTurns` in src/domain/coach/past-chats.ts) and runs
--     it AGAIN on the way back out, so a chat stored before a stop was widened is read with today's.
--   · SIZE-CAPPED: at most 200 turns and 96 KB of turns per chat (`holt_chats_turns_size`), so one
--     row can never grow without bound. The app trims the oldest turns before it gets there.
--   · THE NEWEST 100 CHATS PER ATHLETE, trimmed by a trigger after each insert, under an advisory lock
--     per athlete (as 0204's cap) so two devices saving at once cannot both skip the trim.
--   · `updated_at` is the SERVER's clock (trigger), because it is the list's order.
--   · `search_text` = the lower-case words of every stored line, written by the app. Searched with
--     `ilike`; a trigram index is added when `pg_trgm` is installed (it is on the live project, 1.6 in
--     `public`, read 2026-11-18) — guarded, so this file still applies on a database without it.
--   · GONE WITH THE ACCOUNT: `athlete_id … on delete cascade` — `delete_my_account()` deletes
--     `auth.users`, and that IS the wipe.
--
-- ⚠ NO ANON OR PUBLIC ACCESS. Supabase grants `anon` table privileges directly (the 0147 lesson), so
--   they are revoked explicitly; RLS would refuse anyway, but a signed-out client has no business here.
--
-- ⚠ "HOLT REMEMBERS" OFF (0278's switch) means the app saves no new rows; it is checked in the app
--   (`getRemembers()`), not here — what is already kept stays until the athlete deletes it.
--
-- Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. The table ─────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.holt_chats (
  id             uuid         primary key default gen_random_uuid(),
  athlete_id     uuid         not null default auth.uid() references auth.users(id) on delete cascade,
  title          varchar(80)  not null,
  turns          jsonb        not null default '[]'::jsonb,
  preview        varchar(160),
  recap          text,
  recap_through  integer,
  summary        varchar(500),
  search_text    text         not null default '',
  turn_count     integer      not null default 0,
  started_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'holt_chats_title_len') then
    alter table public.holt_chats
      add constraint holt_chats_title_len check (char_length(btrim(title)) >= 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'holt_chats_turns_size') then
    alter table public.holt_chats
      add constraint holt_chats_turns_size check (
        jsonb_typeof(turns) = 'array'
        and jsonb_array_length(turns) <= 200
        and octet_length(turns::text) <= 98304
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'holt_chats_turn_count') then
    alter table public.holt_chats
      add constraint holt_chats_turn_count check (turn_count between 0 and 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'holt_chats_recap_len') then
    alter table public.holt_chats
      add constraint holt_chats_recap_len check (
        (recap is null or char_length(recap) <= 800)
        and (recap_through is null or recap_through >= 0)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'holt_chats_search_len') then
    alter table public.holt_chats
      add constraint holt_chats_search_len check (octet_length(search_text) <= 98304);
  end if;
end $$;

create index if not exists holt_chats_athlete_idx on public.holt_chats (athlete_id, updated_at desc);

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute 'create index if not exists holt_chats_search_trgm_idx on public.holt_chats using gin (search_text gin_trgm_ops)';
  end if;
end $$;

comment on table public.holt_chats is
  'Past chats with Coach Holt (0279, AI Road to 10 Sprint 4b CH-4): the athlete''s lines, Holt''s lines and the app''s bracketed notes, run through the medical guard by the app before storage and again on read. Id made on the phone; owner-only; newest 100 per athlete (trigger holt_chats_keep_hundred); <= 200 turns / 96 KB each. Browsed, searched and continued at /holt-chats.';

alter table public.holt_chats enable row level security;

drop policy if exists holt_chats_owner_select on public.holt_chats;
drop policy if exists holt_chats_owner_insert on public.holt_chats;
drop policy if exists holt_chats_owner_update on public.holt_chats;
drop policy if exists holt_chats_owner_delete on public.holt_chats;
create policy holt_chats_owner_select on public.holt_chats for select
  using (athlete_id = auth.uid());
create policy holt_chats_owner_insert on public.holt_chats for insert
  with check (athlete_id = auth.uid());
create policy holt_chats_owner_update on public.holt_chats for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());
create policy holt_chats_owner_delete on public.holt_chats for delete
  using (athlete_id = auth.uid());

revoke all on public.holt_chats from public, anon;
grant select, insert, update, delete on public.holt_chats to authenticated;

-- ── 2. The server's clock on every write ─────────────────────────────────────────────────────────────

create or replace function public.holt_chats_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists holt_chats_touch on public.holt_chats;
create trigger holt_chats_touch
  before insert or update on public.holt_chats
  for each row execute function public.holt_chats_touch();

-- ── 3. Keep the newest hundred ───────────────────────────────────────────────────────────────────────

create or replace function public.holt_chats_keep_hundred()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('holt_chats:' || new.athlete_id::text, 0));
  delete from public.holt_chats c
   where c.athlete_id = new.athlete_id
     and c.id not in (
       select k.id from public.holt_chats k
        where k.athlete_id = new.athlete_id
        order by k.updated_at desc, k.id desc
        limit 100
     );
  return null;
end;
$$;

drop trigger if exists holt_chats_keep_hundred on public.holt_chats;
create trigger holt_chats_keep_hundred
  after insert on public.holt_chats
  for each row execute function public.holt_chats_keep_hundred();

revoke all on function public.holt_chats_touch() from public, anon;
revoke all on function public.holt_chats_keep_hundred() from public, anon;

commit;
