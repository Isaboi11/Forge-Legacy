-- Forge Legacy — LAUNCH PRE-FLIGHT: what is actually applied?
--
-- Read-only. Creates nothing, changes nothing. Paste into the Supabase SQL editor, run, and it reports
-- one row per checked object with APPLIED or ❌ MISSING.
--
-- ⚠ WHY THIS EXISTS, AND WHY IT REPLACES `preflight-what-is-applied.sql`.
--   That file checks 0131–0142 only, and it has three holes that a launch audit cannot afford:
--
--   1. It labels `app_admins` as "0137". **0129 creates that table**, and 0137 re-creates it
--      `if not exists`. So the existing row goes green when 0129 ran and 0137 did not. The only object
--      unique to 0137 is `admin_recent_signups`; the only one unique to 0130 is `admin_overview`.
--   2. It never checks **0129, 0130, 0134, 0135, 0136 or 0143** — and live code calls into every one of
--      them (`planned-workout-live.ts` → `planned_workouts`; `coach-signal-live.ts` →
--      `coach_intensity_signal`; `notifications-live.ts` → `notification_feed`;
--      `activity-live.ts` → `shared_workout_detail`).
--   3. It never checks the **push cron jobs**. `forge-push-drain` is what actually delivers a push. If it
--      is not scheduled, every notification enqueues correctly and is never sent, and nothing anywhere in
--      the app reports a problem. That is the single most silent failure in this schema.
--
--   Each check looks for an object the migration CREATES, not for a version number, because this project
--   has three recorded ways a migration lies about having worked: a partial run leaves an older function
--   body in place, PL/pgSQL binds names at RUN time so a broken reference stays silent until first call,
--   and a stopped chain fails on 42703 in a way a PGRST205 probe never sees.
--
-- EXPECTED AT LAUNCH: everything APPLIED except the two 0144/0145 rows at the bottom, which are the
-- Coach AI and entitlement groundwork and are deliberately NOT applied for this release.

with checks as (
  -- ── 0120 · push delivery ───────────────────────────────────────────────────
  select '0120 · push_tokens' as grp, to_regclass('public.push_tokens') is not null as ok
  union all
  select '0120 · ⚠ forge-push-drain scheduled (NOTHING SENDS WITHOUT THIS)',
         exists (select 1 from cron.job where jobname = 'forge-push-drain')
  union all
  select '0120 · forge-push-reconcile scheduled',
         exists (select 1 from cron.job where jobname = 'forge-push-reconcile')

  -- ── 0129/0130/0137 · operator dashboard ────────────────────────────────────
  union all
  select '0129 · app_admins + admin_guard',
         to_regclass('public.app_admins') is not null
     and to_regprocedure('public.admin_guard()') is not null
  union all
  select '0130 · admin_overview (UNIQUE to 0130)',
         to_regprocedure('public.admin_overview(integer)') is not null
      or exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'admin_overview')
  union all
  select '0137 · admin_recent_signups (UNIQUE to 0137 — not app_admins)',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'admin_recent_signups')

  -- ── 0131–0133 · analytics ──────────────────────────────────────────────────
  union all
  select '0131 · app_events (analytics raw)', to_regclass('public.app_events') is not null
  union all
  select '0131 · forge-events-prune scheduled',
         exists (select 1 from cron.job where jobname = 'forge-events-prune')
  union all
  select '0132 · athlete_activity', to_regclass('public.athlete_activity') is not null
  union all
  select '0133 · metrics_daily (rollup)', to_regclass('public.metrics_daily') is not null
  union all
  select '0133 · forge-metrics-rollup scheduled',
         exists (select 1 from cron.job where jobname = 'forge-metrics-rollup')

  -- ── 0134–0136 · never checked before, all have live callers ────────────────
  union all
  select '0134 · shared_workout_detail (activity-live.ts)',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'shared_workout_detail')
  union all
  select '0135 · notification_events_for (push body)',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'notification_events_for')
  union all
  select '0135 · push_post_comments trigger',
         exists (select 1 from pg_trigger where tgname = 'push_post_comments' and not tgisinternal)
  union all
  select '0136 · planned_workouts (planned-workout-live.ts)',
         to_regclass('public.planned_workouts') is not null

  -- ── 0138–0143 ──────────────────────────────────────────────────────────────
  union all
  select '0138 · exercise_avoidance (coach capture)',
         to_regclass('public.exercise_avoidance') is not null
  union all
  select '0138 · record_substitutions',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'record_substitutions')
  union all
  select '0139 · every athlete on imperial',
         not exists (select 1 from public.profiles
                      where app_prefs->>'units' is distinct from 'imperial')
  union all
  select '0140 · athlete_weekly_reviews', to_regclass('public.athlete_weekly_reviews') is not null
  union all
  select '0141 · forge-checkin-prune scheduled',
         exists (select 1 from cron.job where jobname = 'forge-checkin-prune')
  union all
  select '0142 · squad_checkins.video_object_path',
         exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'squad_checkins'
                    and column_name = 'video_object_path')
  union all
  select '0143 · coach_intensity_signal (coach-signal-live.ts)',
         to_regclass('public.coach_intensity_signal') is not null

  -- ── deliberately NOT applied for this release ──────────────────────────────
  union all
  select '0144 · coach_ai_credits — EXPECT MISSING (PO: no AI spend pre-launch)',
         to_regclass('public.coach_ai_credits') is not null
  union all
  select '0145 · entitlement — EXPECT MISSING until Phase B lands',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'my_entitlement')
)
select grp as "migration / object",
       case when ok then 'APPLIED' else '❌ MISSING' end as "state"
  from checks
 order by grp;
