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
)
select grp as "migration",
       case when ok then 'APPLIED' else '❌ MISSING' end as "state"
  from checks
 order by grp;
