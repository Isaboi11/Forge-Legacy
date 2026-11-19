-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0278: Holt remembers you — fact kinds + the off switch (AI Road to 10 Sprint 4b §1.3 + §1.4, CH-4)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is add-if-not-exists, a guarded check, create-if-not-exists, drop-if-exists + create policy,
-- revoke/grant; §2 only raises; §3 is read-only.
--
-- Apply order for Sprint 4b: 0278 → 0279 (lane B's past chats). Then the coach-ask redeploy (it reads both 0278 parts).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- The end-of-chat summary now also keeps the lasting facts the athlete told Holt (as holt_notes, source 'chat', with a
-- KIND so What Holt Remembers can group them), and the athlete can switch memory off. No row in holt_memory_prefs = on.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  (verbatim from supabase/migrations/0278_holt_remembers_you.sql)
--     a. holt_notes.kind (nullable) + holt_notes_kind_check (the seven kinds, or null).
--     b. holt_memory_prefs (athlete_id pk -> auth.users ON DELETE CASCADE, remembers default true, updated_at), RLS on,
--        four owner-only policies, revoked from public + anon, granted to authenticated.
-- §2  RAISES if the column, the check, the table, RLS, a policy or the cascade is missing, or anon / public can read it.
-- §3  one row: what landed.
--
-- ⚠ NO FUNCTION IS CREATED OR CHANGED. Nothing live is retyped.
-- ⚠ APPLYING IS NOT WORKING: coach-ask v30 (supabase/apply/deploy-coach-ask.ts) and the 4b app must also ship before
--   anyone sees a kept fact or the switch. Until then nothing writes kind or a prefs row.
--
-- ══ PREDICTED §3 (written 2026-11-18 from the live database, read-only: holt_notes has id, athlete_id, text,
--    created_at, source — no kind; no holt_memory_prefs; 0 notes stored) ══
--   kind_column = true · kind_check = true · prefs_table = true · prefs_rls = true · prefs_policies = 4 ·
--   prefs_cascades = true · anon_can_select = false · public_can_select = false · authenticated_can_select = true ·
--   prefs_rows = 0 · notes_with_kind = 0 · notes_total = 0
--   Why: the column, check, table and 4 policies are new; the FK is on delete cascade; nobody has a prefs row until the
--   4b app's switch writes one; no deployed client writes kind; 0 notes on 11-18 (any >= 0 at paste — notes_total is
--   the only number that may have moved, through the 4a remember_note card).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0278_holt_remembers_you.sql)
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


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION (raises when 0278 did not land)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

do $check$
begin
  if not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'holt_notes' and c.column_name = 'kind') then
    raise exception '0278 DID NOT APPLY: holt_notes has no kind column';
  end if;
  if not exists (select 1 from pg_constraint k where k.conname = 'holt_notes_kind_check') then
    raise exception '0278 DID NOT APPLY: holt_notes_kind_check is missing';
  end if;
  if to_regclass('public.holt_memory_prefs') is null then
    raise exception '0278 DID NOT APPLY: holt_memory_prefs does not exist';
  end if;
  if not (select r.relrowsecurity from pg_class r where r.oid = 'public.holt_memory_prefs'::regclass) then
    raise exception '0278: RLS is off on holt_memory_prefs';
  end if;
  if (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'holt_memory_prefs'
        and p.policyname in ('holt_memory_prefs_owner_select', 'holt_memory_prefs_owner_insert', 'holt_memory_prefs_owner_update', 'holt_memory_prefs_owner_delete')) <> 4 then
    raise exception '0278: holt_memory_prefs does not have its four owner policies';
  end if;
  if not exists (select 1 from pg_constraint f where f.conrelid = 'public.holt_memory_prefs'::regclass and f.contype = 'f'
                  and f.confrelid = 'auth.users'::regclass and f.confdeltype = 'c') then
    raise exception '0278: holt_memory_prefs does not cascade from auth.users - the account wipe would leave it behind';
  end if;
  if has_table_privilege('anon', 'public.holt_memory_prefs', 'select') or has_table_privilege('public', 'public.holt_memory_prefs', 'select') then
    raise exception '0278: anon or public can read holt_memory_prefs';
  end if;
  if not has_table_privilege('authenticated', 'public.holt_memory_prefs', 'select, insert, update, delete') then
    raise exception '0278: authenticated cannot use holt_memory_prefs - the switch would never save';
  end if;
  raise notice '0278 applied. Facts can carry a kind; the memory switch exists (no row = on).';
end
$check$;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

select
  exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'holt_notes' and c.column_name = 'kind') as kind_column,
  exists (select 1 from pg_constraint k where k.conname = 'holt_notes_kind_check')                                                        as kind_check,
  to_regclass('public.holt_memory_prefs') is not null                                                                                     as prefs_table,
  (select r.relrowsecurity from pg_class r where r.oid = 'public.holt_memory_prefs'::regclass)                                           as prefs_rls,
  (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'holt_memory_prefs')                                as prefs_policies,
  exists (select 1 from pg_constraint f where f.conrelid = 'public.holt_memory_prefs'::regclass and f.contype = 'f'
           and f.confrelid = 'auth.users'::regclass and f.confdeltype = 'c')                                                              as prefs_cascades,
  has_table_privilege('anon', 'public.holt_memory_prefs', 'select')                                                                       as anon_can_select,
  has_table_privilege('public', 'public.holt_memory_prefs', 'select')                                                                     as public_can_select,
  has_table_privilege('authenticated', 'public.holt_memory_prefs', 'select')                                                              as authenticated_can_select,
  (select count(*) from public.holt_memory_prefs)                                                                                         as prefs_rows,
  (select count(*) from public.holt_notes n where n.kind is not null)                                                                     as notes_with_kind,
  (select count(*) from public.holt_notes)                                                                                                as notes_total;
