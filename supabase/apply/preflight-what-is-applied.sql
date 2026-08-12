-- Forge Legacy — PRE-FLIGHT: what is actually applied?
--
-- Read-only. Creates nothing, changes nothing. Paste it, run it, and it reports one row per pending
-- migration group with APPLIED or MISSING.
--
-- ⚠ WHY THIS EXISTS. `Forge-Legacy-Master-Status.md` contradicts itself on apply state — it appends new
--   entries at the top and older entries keep their original claims, so the same migration reads both
--   "0134 + 0135 APPLIED" and "0134 + 0135 NOT YET APPLIED" depending which paragraph you land on. The
--   database is the only source of truth. This asks it.
--
-- Each check looks for an object the migration CREATES, not for a version number, because this project has
-- three recorded ways a migration lies about having worked: a partial run leaves an older function body in
-- place, PL/pgSQL binds names at RUN time so a broken reference stays silent until first call, and a
-- stopped chain fails on 42703 in a way a PGRST205 probe never sees.

with checks as (
  select '0131 · app_events (analytics raw)' as grp,
         to_regclass('public.app_events') is not null as ok
  union all
  select '0131 · forge-events-prune scheduled',
         exists (select 1 from cron.job where jobname = 'forge-events-prune')
  union all
  select '0132 · athlete_activity',
         to_regclass('public.athlete_activity') is not null
  union all
  select '0133 · metrics_daily (rollup)',
         to_regclass('public.metrics_daily') is not null
  union all
  select '0133 · forge-metrics-rollup scheduled',
         exists (select 1 from cron.job where jobname = 'forge-metrics-rollup')
  union all
  select '0137 · app_admins (signup alerts)',
         to_regclass('public.app_admins') is not null
  union all
  select '0138 · exercise_avoidance (coach capture)',
         to_regclass('public.exercise_avoidance') is not null
  union all
  select '0139 · every athlete on imperial',
         not exists (select 1 from public.profiles where app_prefs->>'units' is distinct from 'imperial')
  union all
  select '0140 · athlete_weekly_reviews',
         to_regclass('public.athlete_weekly_reviews') is not null
  union all
  select '0141 · forge-checkin-prune scheduled',
         exists (select 1 from cron.job where jobname = 'forge-checkin-prune')
  union all
  select '0142 · squad_checkins.video_object_path',
         exists (
           select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'squad_checkins'
              and column_name = 'video_object_path'
         )
  union all
  select '0143 · coach_intensity_signal',
         to_regclass('public.coach_intensity_signal') is not null
  union all
  -- ⚠ 0144 IS COACH AI AND MUST READ MISSING. PO decision 2026-08-12: no AI spend before full release
  --   and no AI for testers. It is authored and deliberately unapplied. APPLIED here is a mistake to undo.
  select '0144 · coach_ai_config — ⚠ SHOULD BE MISSING',
         to_regclass('public.coach_ai_config') is not null
  union all
  select '0145 · entitlement_config',
         to_regclass('public.entitlement_config') is not null
  union all
  select '0145 · athlete_entitlement',
         to_regclass('public.athlete_entitlement') is not null
  union all
  select '0145 · athlete_usage (lifetime counters)',
         to_regclass('public.athlete_usage') is not null
  union all
  select '0145 · referral_credits (ledger)',
         to_regclass('public.referral_credits') is not null
  union all
  -- The trigger is the enforcement. The tables can exist with it missing if a paste was truncated, and
  -- then the program cap silently never fires — which is exactly the failure this file exists to catch.
  select '0145 · programs_cap_guard_trg on programs',
         exists (
           select 1 from pg_trigger
            where tgname = 'programs_cap_guard_trg' and not tgisinternal
         )
)
select grp as "migration",
       case when ok then 'APPLIED' else '❌ MISSING' end as "state"
  from checks
 order by grp;

-- ══ ⚠ EVERY CHECK ABOVE IS `to_regclass` / catalogue LOOKUPS, AND THAT IS NOT A STYLE CHOICE ══
--
-- A check may never SELECT FROM the table it is checking for. Postgres resolves relation names at PARSE
-- time, so `coalesce((select … from public.entitlement_config), false)` raises 42P01 and takes the WHOLE
-- report down when the table is absent — which is precisely the case this file exists to report on. A
-- pre-flight that only runs once the migration is already applied answers a question nobody has.
--
-- That bug shipped here on 2026-08-12 and is recorded rather than quietly deleted: the safety check below
-- is what it was trying to do, moved to where it is legal.

-- ── RUN THIS SECOND, ONLY ONCE 0145 READS `APPLIED` ABOVE ────────────────────
--
-- ⚠ NOT A MIGRATION CHECK — A SAFETY CHECK. `PREMIUM` means nothing gates and every athlete is entitled,
--   which is the correct state through Phases B–E. `FREE` means monetization has switched on. Phase F is
--   the only time it should read FREE, and only AFTER the 20 OG testers hold explicit grants (MA3-D25) —
--   between those two statements the testers would be Free.
--
--   select default_tier as "⚠ must read PREMIUM until Phase F"
--     from public.entitlement_config;
