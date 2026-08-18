-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PREFLIGHT: what is actually applied of 0163, 0164, 0165?
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- It READS ONLY — no insert, update, delete or DDL anywhere in it. Safe at any time, any number
-- of times. There is no Supabase CLI and no service key in this project; the dashboard is the
-- only path.
--
-- ══ WHY THIS EXISTS ══
--
-- On 2026-08-17 three documents disagreed about these three migrations. `Docs/GO-LIVE.md` said all
-- three were unapplied; `Forge-Legacy-Master-Status.md` said 0163 was applied and 0164 was not.
-- Both were reasoning from the presence of files in `supabase/apply/`, and **a `pending-*.sql`
-- being present means a bundle was STAGED, never that it was RUN.** That inference has now been
-- wrong in both directions in this project — eleven applied files once sat listed as pending.
--
-- So this asks the database instead of the ledger.
--
-- ══ ⚠ 0165 IS NOT A YES/NO QUESTION, AND THIS REPORT DOES NOT PRETEND IT IS ══
--
-- 0165 is an idempotent restatement of four objects 0087 already defined. "0165 applied" is
-- therefore indistinguishable from "0087 applied and nothing clobbered it" — which is the entire
-- point of the migration. Section B reports **the live state of the four objects**, not whether a
-- file was run. If they read FRIENDS-aware, there is nothing to fix and 0165 is unnecessary today;
-- if any reads squad-only, 0059 has been re-pasted over 0087 and every friends competition in the
-- database is unreadable and unjoinable right now.
--
-- ⛔ Whatever this says, do NOT re-paste 0059. It is idempotent and still in the migrations folder,
--    and re-running it is exactly how the squad-only versions come back.
--
-- ══ TWO THINGS v1 OF THIS FILE GOT WRONG, RECORDED SO THEY ARE NOT REPEATED ══
--
--   1. It called `pg_get_functiondef()` over every function in `public`. That raises
--      `42809: "min" is an aggregate function` the moment it meets an aggregate, and an extension
--      puts one in this schema. This version reads `prosrc` — a plain catalog column that cannot
--      raise — and filters `prokind = 'f'` so aggregates, window functions and procedures are
--      excluded regardless. The strings being searched for all live in the function BODY, which is
--      exactly what `prosrc` holds.
--
--   2. It was three separate SELECT statements. **The Supabase SQL editor returns only the last
--      statement's result set**, so the first two reports would have been invisible — a preflight
--      that silently shows you a third of the answer is worse than no preflight. Everything below
--      is now ONE statement returning ONE table.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

with f as (
  select p.proname, p.prosrc as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and p.proname in (
       'challenge_detail', 'challenge_results_detail', 'push_pref_key',
       'push_pref_default', 'notification_events_for', 'can_read_challenge', 'push_enqueue_for'
     )
),
pol as (
  select tablename,
         policyname,
         coalesce(qual, '') || ' ' || coalesce(with_check, '') as body,
         coalesce(qual, '(none)')       as using_clause,
         coalesce(with_check, '(none)') as check_clause
    from pg_policies
   where schemaname = 'public'
     and tablename in ('challenges', 'challenge_participants')
)
select * from (

  -- ── SECTION A · verdicts ────────────────────────────────────────────────────────────────────
  -- Read the `detail` column. Anything not starting ✅ needs a decision.

  select 1 as ord, 1 as sub,
         'A · VERDICT' as section,
         '0163 · challenge_detail() renamed tz → v_tz' as item,
         case
           when not exists (select 1 from f where proname = 'challenge_detail') then '⛔ FUNCTION MISSING'
           when exists (select 1 from f where proname = 'challenge_detail' and def like '%v_tz%') then '✅ APPLIED'
           else '⛔ NOT APPLIED — C-3 still raises 42702 on every call'
         end as detail

  union all select 1, 2, 'A · VERDICT',
         '0163 · challenge_results_detail() renamed (preventive)',
         case
           when not exists (select 1 from f where proname = 'challenge_results_detail') then '⛔ FUNCTION MISSING'
           when exists (select 1 from f where proname = 'challenge_results_detail' and def like '%v_tz%') then '✅ APPLIED'
           else '⚠ NOT APPLIED — not broken today, one join away from the same 42702'
         end

  -- ⚠ EVERY CHECK BELOW MATCHES A QUOTED SQL LITERAL, NOT A BARE WORD, AND THE REASON IS A BUG THIS
  -- FILE ALREADY SHIPPED. `prosrc` INCLUDES COMMENTS. v2 asked whether `push_pref_key` contained the
  -- text `challenge_updates` and reported ⛔ STILL PRESENT against a correctly-migrated database —
  -- because 0164's replacement body carries the line `-- 0164. \`challenge_updates\` is retired`.
  -- The guard matched the sentence announcing the removal. Matching `then 'challenge_updates'`
  -- separates cleanly: 0 hits in 0164, 1 in 0159.
  union all select 1, 3, 'A · VERDICT',
         '0164 · push_pref_key() maps → challenge_invites',
         case
           when not exists (select 1 from f where proname = 'push_pref_key') then '⛔ FUNCTION MISSING'
           when exists (select 1 from f where proname = 'push_pref_key' and def like '%''challenge_invites''%') then '✅ APPLIED'
           else '⛔ NOT APPLIED — invitations cannot reach a lock screen'
         end

  union all select 1, 4, 'A · VERDICT',
         '0164 · push_pref_key() retired challenge_updates',
         case
           when not exists (select 1 from f where proname = 'push_pref_key') then '⛔ FUNCTION MISSING'
           when exists (select 1 from f where proname = 'push_pref_key' and def like '%then ''challenge_updates''%') then '⛔ STILL MAPPED — 0164 not applied, or applied over an older copy'
           else '✅ OK — retired'
         end

  union all select 1, 5, 'A · VERDICT',
         '0164 · notification_events_for() branch 17 challenge_joined',
         case
           when not exists (select 1 from f where proname = 'notification_events_for') then '⛔ FUNCTION MISSING'
           when exists (select 1 from f where proname = 'notification_events_for' and def like '%''challenge_joined''%') then '✅ APPLIED'
           else '⛔ NOT APPLIED — the creator is never told anyone joined'
         end

  union all select 1, 6, 'A · VERDICT',
         '0164 · push_enqueue_for() has a challenge_joined arm',
         case
           when not exists (select 1 from f where proname = 'push_enqueue_for') then '⛔ FUNCTION MISSING'
           when exists (select 1 from f where proname = 'push_enqueue_for' and def like '%''challenge_joined''%') then '✅ APPLIED'
           else '⛔ NOT APPLIED — a missing arm writes NULL into a NOT NULL column'
         end

  union all select 1, 7, 'A · VERDICT',
         '0164 · trigger push_challenge_participants exists',
         case
           when exists (
             select 1 from pg_trigger t
               join pg_class c on c.oid = t.tgrelid
               join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public'
                and c.relname = 'challenge_participants'
                and t.tgname = 'push_challenge_participants'
                and not t.tgisinternal
           ) then '✅ APPLIED'
           else '⛔ MISSING — joining pushes nothing'
         end

  union all select 1, 8, 'A · VERDICT',
         '0087/0165 · can_read_challenge() covers FRIENDS',
         case
           when not exists (select 1 from f where proname = 'can_read_challenge') then '⛔ FUNCTION MISSING'
           when exists (select 1 from f where proname = 'can_read_challenge' and def like '%FRIENDS%') then '✅ OK — friends-aware'
           else '⛔ SQUAD-ONLY — 0059 has been re-pasted over 0087'
         end

  union all select 1, 9, 'A · VERDICT',
         '0087/0165 · policy challenges_select covers FRIENDS',
         case
           when not exists (select 1 from pol where policyname = 'challenges_select') then '⛔ POLICY MISSING'
           when exists (select 1 from pol where policyname = 'challenges_select' and body like '%FRIENDS%') then '✅ OK — friends-aware'
           else '⛔ SQUAD-ONLY — every friends competition is invisible'
         end

  union all select 1, 10, 'A · VERDICT',
         '0087/0165 · policy challenges_insert covers FRIENDS',
         case
           when not exists (select 1 from pol where policyname = 'challenges_insert') then '⛔ POLICY MISSING'
           when exists (select 1 from pol where policyname = 'challenges_insert' and body like '%FRIENDS%') then '✅ OK — friends-aware'
           else '⛔ SQUAD-ONLY — a friends competition cannot be created'
         end

  union all select 1, 11, 'A · VERDICT',
         '0087/0165 · policy challenge_participants_insert covers FRIENDS',
         case
           when not exists (select 1 from pol where policyname = 'challenge_participants_insert') then '⛔ POLICY MISSING'
           when exists (select 1 from pol where policyname = 'challenge_participants_insert' and body like '%FRIENDS%') then '✅ OK — friends-aware'
           else '⛔ SQUAD-ONLY — this is the 42501 on Join'
         end

  union all select 1, 12, 'A · VERDICT',
         '0087/0165 · participants insert allows a late join (ACTIVE)',
         case
           when not exists (select 1 from pol where policyname = 'challenge_participants_insert') then '⛔ POLICY MISSING'
           when exists (select 1 from pol where policyname = 'challenge_participants_insert' and body like '%ACTIVE%') then '✅ OK — ENROLLMENT or ACTIVE'
           else '⚠ ENROLLMENT ONLY — a competition that started today cannot be joined'
         end

  -- ── SECTION B · the policy bodies, verbatim ─────────────────────────────────────────────────
  -- Eyeball these if section A flags anything. This is what is actually in force right now.

  union all
  select 2, row_number() over (order by tablename, policyname)::int, 'B · POLICY BODY',
         tablename || '.' || policyname,
         'USING ' || using_clause || '   |   WITH CHECK ' || check_clause
    from pol

) r order by ord, sub;
