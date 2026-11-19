-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0279: past chats (AI Road to 10 Sprint 4b §1.5, CH-4)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every create is `if not exists` / `create or replace`, every constraint is guarded by a
-- pg_constraint lookup, policies and triggers are dropped before they are made, revoke/grant are idempotent;
-- §2 only raises; §3 is read-only.
--
-- Apply order for Sprint 4b: 0278 → 0279. Either order is safe (0279 touches nothing 0278 does), but the
-- contract's order is 0278 first.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- A chat with Holt used to live only on the phone and vanish when it ended — only a 2–3 line summary survived
-- (0218). This keeps the conversation itself so the athlete can read an old chat at /holt-chats, search them,
-- and tap "Continue this chat".
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  (verbatim from supabase/migrations/0279_holt_past_chats.sql)
--     a. public.holt_chats: id made on the phone, athlete_id → auth.users ON DELETE CASCADE (the account wipe),
--        title, turns (jsonb), preview, recap + recap_through, summary, search_text, turn_count, started_at,
--        updated_at; checks: ≤ 200 turns / ≤ 96 KB of turns, recap ≤ 800, title not blank.
--     b. index (athlete_id, updated_at desc) + a trigram index on search_text when pg_trgm is installed.
--     c. RLS on; owner-only select / insert / update / delete; revoke all from public + anon; grant to
--        authenticated.
--     d. trigger holt_chats_touch (server clock on updated_at) and holt_chats_keep_hundred (newest 100 per
--        athlete, advisory lock per athlete).
-- §2  RAISES if the table, RLS, any of the four policies, either trigger, the cascade, the size check or the
--     grants are not as written — or if anon can read it.
-- §3  one row: what landed.
--
-- ⚠ APPLYING IS NOT WORKING: the app that saves and reads these rows ships in the Sprint 4b OTA/web release.
--   Before this is applied that app saves nothing and /holt-chats says "No past chats yet" — quietly
--   (PGRST205/42P01 is the expected state for a while, not an error to show anyone).
--
-- ══ PREDICTED §3 (written 2026-11-18 from the live database, read-only: no public.holt_chats yet; pg_trgm 1.6
--    installed in public; 75 auth.users) ══
--   table_exists = true · rls_on = true · policies = 4 · triggers = 2 · cascades_with_account = true ·
--   size_check = true · trigram_index = true · anon_can_select = false · authenticated_can_select = true ·
--   rows = 0
--   Why: the table is new; four owner-only policies; touch + keep_hundred; the FK is ON DELETE CASCADE; pg_trgm
--   is on so the guarded index is made; rows is 0 because no app that writes them is deployed yet — a non-zero
--   count means something unreleased is writing.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0279_holt_past_chats.sql)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION (raises when 0279 did not land)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

do $check$
declare
  v_n integer;
begin
  if to_regclass('public.holt_chats') is null then
    raise exception '0279 DID NOT APPLY: public.holt_chats does not exist';
  end if;
  if not (select c.relrowsecurity from pg_class c where c.oid = 'public.holt_chats'::regclass) then
    raise exception '0279 DID NOT APPLY: row level security is off on public.holt_chats';
  end if;
  select count(*) into v_n
    from pg_policies p
   where p.schemaname = 'public' and p.tablename = 'holt_chats'
     and p.policyname in ('holt_chats_owner_select', 'holt_chats_owner_insert', 'holt_chats_owner_update', 'holt_chats_owner_delete');
  if v_n <> 4 then
    raise exception '0279 DID NOT APPLY: % of 4 owner policies on public.holt_chats', v_n;
  end if;
  select count(*) into v_n
    from pg_policies p
   where p.schemaname = 'public' and p.tablename = 'holt_chats';
  if v_n <> 4 then
    raise exception '0279: public.holt_chats has % policies, not 4 - something else widened it', v_n;
  end if;
  select count(*) into v_n
    from pg_trigger t
   where t.tgrelid = 'public.holt_chats'::regclass and not t.tgisinternal
     and t.tgname in ('holt_chats_touch', 'holt_chats_keep_hundred');
  if v_n <> 2 then
    raise exception '0279 DID NOT APPLY: % of 2 triggers on public.holt_chats', v_n;
  end if;
  if not exists (
    select 1 from pg_constraint k
     where k.conrelid = 'public.holt_chats'::regclass and k.contype = 'f'
       and k.confrelid = 'auth.users'::regclass and k.confdeltype = 'c'
  ) then
    raise exception '0279: holt_chats.athlete_id does not cascade from auth.users - the account wipe would leave chats behind';
  end if;
  if not exists (select 1 from pg_constraint k where k.conname = 'holt_chats_turns_size' and k.conrelid = 'public.holt_chats'::regclass) then
    raise exception '0279 DID NOT APPLY: no holt_chats_turns_size check';
  end if;
  if has_table_privilege('anon', 'public.holt_chats', 'select') then
    raise exception '0279: anon can read public.holt_chats';
  end if;
  if not has_table_privilege('authenticated', 'public.holt_chats', 'insert')
     or not has_table_privilege('authenticated', 'public.holt_chats', 'update') then
    raise exception '0279: authenticated cannot write public.holt_chats - no chat would ever save';
  end if;
  raise notice '0279 applied. Past chats have a home: owner-only, newest 100, gone with the account.';
end
$check$;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

select
  to_regclass('public.holt_chats') is not null                                                       as table_exists,
  (select c.relrowsecurity from pg_class c where c.oid = 'public.holt_chats'::regclass)               as rls_on,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'holt_chats')                                         as policies,
  (select count(*) from pg_trigger t
    where t.tgrelid = 'public.holt_chats'::regclass and not t.tgisinternal)                           as triggers,
  exists (select 1 from pg_constraint k
           where k.conrelid = 'public.holt_chats'::regclass and k.contype = 'f'
             and k.confrelid = 'auth.users'::regclass and k.confdeltype = 'c')                        as cascades_with_account,
  exists (select 1 from pg_constraint k where k.conname = 'holt_chats_turns_size')                    as size_check,
  to_regclass('public.holt_chats_search_trgm_idx') is not null                                        as trigram_index,
  has_table_privilege('anon', 'public.holt_chats', 'select')                                          as anon_can_select,
  has_table_privilege('authenticated', 'public.holt_chats', 'select')                                 as authenticated_can_select,
  (select count(*) from public.holt_chats)                                                            as rows;
