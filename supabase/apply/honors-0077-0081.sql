-- Forge Legacy — convenience bundle: the Honors migrations, 0077 → 0081, IN ORDER.
--
-- NOT new migrations. All five are already numbered in supabase/migrations/; this file exists so the whole
-- chain can be pasted in one go.
--
-- ORDER IS NOT OPTIONAL. 0077 CREATES `honor_catalog`; 0078 adds `metric_key` to it; 0079 and 0080 insert
-- rows; 0081 reads it to backfill categories. Running any of them before 0077 fails with
-- `42P01: relation "public.honor_catalog" does not exist`.
--
--   0077  honor_catalog + a table-driven evaluator  (43 honors)
--   0078  strength · competition · running          (35)  + restores the evaluate_honors call
--                                                          save_workout lost at migration 0018
--   0079  bodyweight ratios · tonnage · partners · comebacks (24)
--   0080  walking · cycling · swimming              (28)
--   0081  snapshots each honor's category onto the earned row
--
-- SAFE TO RE-RUN, whole or in part: tables and columns are `if not exists`, constraints are dropped before
-- being re-added, catalog rows are `on conflict do update`, and every function is `create or replace`.
-- Grant-once is enforced by 0012's unique indexes, so no honor can be awarded twice.
--
-- Ends with a PostgREST schema-cache reload so `honor_catalog` and `claim_earned_honors` are visible at once.

-- ==============================================================================
-- 0077_honor_catalog.sql
-- ==============================================================================

-- Forge Legacy — 0077: the honor catalog, and a table-driven evaluator
--
-- Two honors were being awarded — `first_workout_logged` and `workouts_in_chapter_10` (plus `initiative`
-- from its own RPC in 0014). `Honor-Catalog-v1.0-LOCKED` defines 167. An athlete could train for months
-- and earn nothing new.
--
-- WHY A TABLE INSTEAD OF MORE BRANCHES. 0012's evaluator spends ~10 lines per honor: check a threshold,
-- insert, check `found`, append to the return, write a timeline event. Correct, and completely uniform —
-- which means 42 more honors would be ~500 lines of copy-paste where every line is a chance to paste the
-- wrong display name next to the right id. Every threshold honor differs in exactly three values: which
-- metric, what threshold, what it's called.
--
-- So those three values move into `honor_catalog` and the evaluator loops. Adding an honor becomes an
-- INSERT, not a code change — which matters, because the remaining ~120 are mostly more of the same
-- shape, and because the catalog doc can now be diffed against a table rather than against control flow.
--
-- NOTHING ABOUT THE EXISTING BEHAVIOUR CHANGES. The same three honors keep their ids, display names and
-- scope, so rows already earned stay valid and re-running is still a no-op. Grant-once is still enforced
-- by 0012's two partial unique indexes, not by this function — the loop just stops repeating the check.
--
-- SCOPE IS THE ONE REAL DISTINCTION. `account` honors are earned once ever (chapter_id null, caught by
-- `honor_once`). `chapter` honors repeat per chapter (chapter_id set, caught by `honor_per_chap`). The
-- catalog carries it as a column because it decides which unique index applies.
--
-- METRICS ARE COMPUTED ONCE PER EVALUATION, not per honor: nine workout-count honors are nine comparisons
-- against one `count(*)`, not nine table scans.
--
-- WHAT IS DELIBERATELY NOT HERE YET: strength milestones (bench/squat/deadlift/OHP/pull-up and the
-- combined clubs) need exercise identity matching against `personal_records.exercise` plus lb/kg handling,
-- which deserves its own pass rather than being guessed at; competition honors need the Challenge
-- evaluator from `Honor-Catalog-Amendment-001`; and endurance, squad, community and prestige families
-- depend on data or systems that don't exist yet.
--
-- Depends on 0012 (honor_instances, evaluate_honors), 0025 (goals). Idempotent. RUN AFTER 0076.

-- ── The catalog ───────────────────────────────────────────────────────────────
create table if not exists public.honor_catalog (
  honor_type   text primary key,
  display_name text not null,
  category     text not null,
  -- Which computed number this honor tests.
  metric       text not null check (metric in (
    'workouts_total', 'hours_forged', 'chapters_sealed', 'goals_achieved', 'active_weeks',
    'chapter_workouts', 'chapter_days'
  )),
  threshold    numeric not null,
  -- 'account' = once ever; 'chapter' = once per chapter.
  scope        text not null default 'account' check (scope in ('account', 'chapter')),
  sort_order   int not null default 0
);

alter table public.honor_catalog enable row level security;
-- World-readable reference data: the app needs it to render an honor it hasn't earned yet.
drop policy if exists honor_catalog_read on public.honor_catalog;
create policy honor_catalog_read on public.honor_catalog for select using (true);

-- Display names are verbatim from `Honor-Catalog-v1.0-LOCKED`. `on conflict do update` so a corrected
-- name propagates on re-run without disturbing anything already earned (earned rows snapshot their own
-- display_name at award time, per AD-58 — renaming the catalog never rewrites history).
insert into public.honor_catalog (honor_type, display_name, category, metric, threshold, scope, sort_order) values
  -- Training · Origin + Workout Count
  ('first_workout_logged',   'First Workout Logged',   'Training', 'workouts_total', 1,    'account', 10),
  ('workouts_logged_25',     '25 Workouts Logged',     'Training', 'workouts_total', 25,   'account', 11),
  ('workouts_logged_50',     '50 Workouts Logged',     'Training', 'workouts_total', 50,   'account', 12),
  ('workouts_logged_100',    '100 Workouts Logged',    'Training', 'workouts_total', 100,  'account', 13),
  ('workouts_logged_250',    '250 Workouts Logged',    'Training', 'workouts_total', 250,  'account', 14),
  ('workouts_logged_500',    '500 Workouts Logged',    'Training', 'workouts_total', 500,  'account', 15),
  ('workouts_logged_1000',   '1,000 Workouts Logged',  'Training', 'workouts_total', 1000, 'account', 16),
  ('workouts_logged_1500',   '1,500 Workouts Logged',  'Training', 'workouts_total', 1500, 'account', 17),
  ('workouts_logged_2500',   '2,500 Workouts Logged',  'Training', 'workouts_total', 2500, 'account', 18),
  ('workouts_logged_5000',   '5,000 Workouts Logged',  'Training', 'workouts_total', 5000, 'account', 19),

  -- Training · Hours Forged
  ('hours_forged_100',       '100 Hours Forged',       'Training', 'hours_forged', 100,    'account', 30),
  ('hours_forged_250',       '250 Hours Forged',       'Training', 'hours_forged', 250,    'account', 31),
  ('hours_forged_500',       '500 Hours Forged',       'Training', 'hours_forged', 500,    'account', 32),
  ('hours_forged_1000',      '1,000 Hours Forged',     'Training', 'hours_forged', 1000,   'account', 33),
  ('hours_forged_2500',      '2,500 Hours Forged',     'Training', 'hours_forged', 2500,   'account', 34),
  ('hours_forged_5000',      '5,000 Hours Forged',     'Training', 'hours_forged', 5000,   'account', 35),
  ('hours_forged_7500',      '7,500 Hours Forged',     'Training', 'hours_forged', 7500,   'account', 36),
  ('hours_forged_10000',     '10,000 Hours Forged',    'Training', 'hours_forged', 10000,  'account', 37),

  -- Training · Consistency (cumulative active weeks — weeks with at least one session)
  ('consistency_active_weeks_1', '10 Active Weeks',    'Training', 'active_weeks', 10,     'account', 50),
  ('consistency_active_weeks_2', '50 Active Weeks',    'Training', 'active_weeks', 50,     'account', 51),
  ('consistency_active_weeks_3', '150 Active Weeks',   'Training', 'active_weeks', 150,    'account', 52),
  ('consistency_active_weeks_4', '300 Active Weeks',   'Training', 'active_weeks', 300,    'account', 53),
  ('consistency_active_weeks_5', '500 Active Weeks',   'Training', 'active_weeks', 500,    'account', 54),

  -- Chapters · Count
  ('first_chapter_sealed',   'First Chapter Sealed',   'Chapters', 'chapters_sealed', 1,   'account', 70),
  ('chapters_sealed_5',      '5 Chapters Sealed',      'Chapters', 'chapters_sealed', 5,   'account', 71),
  ('chapters_sealed_10',     '10 Chapters Sealed',     'Chapters', 'chapters_sealed', 10,  'account', 72),
  ('chapters_sealed_25',     '25 Chapters Sealed',     'Chapters', 'chapters_sealed', 25,  'account', 73),
  ('chapters_sealed_50',     '50 Chapters Sealed',     'Chapters', 'chapters_sealed', 50,  'account', 74),

  -- Chapters · Depth (per chapter)
  ('workouts_in_chapter_10',  '10 Workouts in a Chapter',  'Chapters', 'chapter_workouts', 10,  'chapter', 80),
  ('workouts_in_chapter_25',  '25 Workouts in a Chapter',  'Chapters', 'chapter_workouts', 25,  'chapter', 81),
  ('workouts_in_chapter_50',  '50 Workouts in a Chapter',  'Chapters', 'chapter_workouts', 50,  'chapter', 82),
  ('workouts_in_chapter_100', '100 Workouts in a Chapter', 'Chapters', 'chapter_workouts', 100, 'chapter', 83),
  ('workouts_in_chapter_250', '250 Workouts in a Chapter', 'Chapters', 'chapter_workouts', 250, 'chapter', 84),

  -- Chapters · Duration (per chapter, measured on SEALED chapters only — see the evaluator)
  ('chapter_duration_6_months', 'Half a Year, One Chapter', 'Chapters', 'chapter_days', 182,  'chapter', 90),
  ('chapter_duration_1_year',   'A Full Year, One Chapter', 'Chapters', 'chapter_days', 365,  'chapter', 91),
  ('chapter_duration_2_years',  'Two Years, One Chapter',   'Chapters', 'chapter_days', 730,  'chapter', 92),
  ('chapter_duration_3_years',  'Three Years, One Chapter', 'Chapters', 'chapter_days', 1095, 'chapter', 93),

  -- Goals
  ('first_goal_achieved',    'First Goal Achieved',    'Goals', 'goals_achieved', 1,    'account', 110),
  ('goals_achieved_5',       '5 Goals Achieved',       'Goals', 'goals_achieved', 5,    'account', 111),
  ('goals_achieved_10',      '10 Goals Achieved',      'Goals', 'goals_achieved', 10,   'account', 112),
  ('goals_achieved_25',      '25 Goals Achieved',      'Goals', 'goals_achieved', 25,   'account', 113),
  ('goals_achieved_50',      '50 Goals Achieved',      'Goals', 'goals_achieved', 50,   'account', 114),
  ('goals_achieved_100',     '100 Goals Achieved',     'Goals', 'goals_achieved', 100,  'account', 115)
on conflict (honor_type) do update set
  display_name = excluded.display_name,
  category     = excluded.category,
  metric       = excluded.metric,
  threshold    = excluded.threshold,
  scope        = excluded.scope,
  sort_order   = excluded.sort_order;

-- ── The evaluator ─────────────────────────────────────────────────────────────
create or replace function evaluate_honors(p_source text default 'live_session')
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid   uuid := auth.uid();
  v_live  boolean := (p_source = 'live_session');
  v_new   jsonb := '[]'::jsonb;
  v_row   record;
  v_metrics jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Every account-level metric, computed once. Nine workout-count honors are nine comparisons against
  -- one count, not nine scans.
  select jsonb_build_object(
    'workouts_total',  (select count(*) from workouts where athlete_id = v_uid),
    'hours_forged',    (select coalesce(sum(duration_sec), 0) / 3600.0 from workouts where athlete_id = v_uid),
    'chapters_sealed', (select count(*) from chapters where athlete_id = v_uid and sealed_at is not null),
    'goals_achieved',  (select count(*) from goals where athlete_id = v_uid and achieved_at is not null),
    -- A week counts if it holds at least one session. date_trunc is fine here (it would only be a problem
    -- inside an index expression, where STABLE isn't good enough).
    'active_weeks',    (select count(distinct date_trunc('week', saved_at)) from workouts where athlete_id = v_uid)
  ) into v_metrics;

  -- ── Account-scoped ──
  for v_row in
    select c.honor_type, c.display_name
      from public.honor_catalog c
     where c.scope = 'account'
       and (v_metrics->>c.metric)::numeric >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, source)
    values (v_uid, v_row.honor_type, v_row.display_name, p_source)
    on conflict do nothing;

    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Chapter-scoped ──
  -- `chapter_days` is measured only on SEALED chapters: an active chapter's elapsed time is still running,
  -- and awarding "A Full Year, One Chapter" on day 365 of a chapter that later gets sealed at day 400 would
  -- be right by luck. The duration honors are about a chapter you finished, so they wait for the seal.
  for v_row in
    select c.honor_type, c.display_name, c.metric, ch.id as chapter_id, ch.name as chapter_name
      from public.honor_catalog c
      cross join (
        select chp.id, chp.name,
               chp.workout_count::numeric as chapter_workouts,
               case when chp.sealed_at is not null
                    then (chp.sealed_at::date - chp.start_date)::numeric
                    else null end as chapter_days
          from chapters chp
         where chp.athlete_id = v_uid
      ) ch
     where c.scope = 'chapter'
       and case c.metric
             when 'chapter_workouts' then ch.chapter_workouts
             when 'chapter_days'     then ch.chapter_days
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, chapter_id, source, metadata)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.chapter_id, p_source,
            jsonb_build_object('chapterName', v_row.chapter_name))
    on conflict do nothing;

    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'honor_type', v_row.honor_type, 'display_name', v_row.display_name, 'chapter', v_row.chapter_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, v_row.chapter_id, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  return v_new;
end;
$$;

-- ── Backfill ──────────────────────────────────────────────────────────────────
-- Honors are evaluated when a workout is saved, so an athlete who already passed a threshold before this
-- migration would have to train again to be awarded something they had already earned. Callable and
-- idempotent — grant-once is enforced by the unique indexes, so running it twice awards nothing twice.
-- `source = 'import'` marks these silent: no timeline event, because the moment they were earned has
-- already passed and dating it today would be a lie.
create or replace function public.claim_earned_honors()
returns jsonb
language plpgsql
security invoker
as $$
begin
  return public.evaluate_honors('import');
end;
$$;

-- ==============================================================================
-- 0078_strength_competition_endurance_honors.sql
-- ==============================================================================

-- Forge Legacy — 0078: strength, competition and endurance honors
--
-- Three families that all need the same thing 0077 didn't have: a way to say WHICH lift, WHICH modality.
-- `honor_catalog.metric_key` is that — deliberately the same "a metric, narrowed" shape `challenges`
-- already uses (`metric_key`, 0061) and squad goals before it (`goal_metric_key`, 0036), so the product
-- has one mental model for scoping rather than three.
--
-- ══ PRs DIDN'T RECORD WHICH EXERCISE, RELIABLY ══
--
-- `personal_records.exercise` stores the DISPLAY NAME (`save_workout` writes `v_pr->>'exercise'`, and the
-- client sends `ex.name`). So "did they bench 225" was answerable only by string-matching a human-typed
-- label — and the catalog has `Barbell Bench Press`, `Close-Grip Bench Press`, `Incline Barbell Bench
-- Press` and more. Matching loosely credits an incline PR as a bench milestone; matching strictly misses
-- anyone whose catalog name shifts by a word.
--
-- So `personal_records` gains `catalog_key`, `save_workout` records it, and honors match on it. Rows
-- written before this have no key, so the matcher falls back to an EXACT canonical name — which is
-- conservative on purpose: a near-miss on old data means an honor arrives late, whereas a loose match
-- means it arrives wrong, and a permanent record should err toward late.
--
-- ══ WHAT IS NOT HERE, AND WHY ══
--
-- `challenge_streak_3/5/10` (max participation streak) is NOT implemented. A streak needs a definition of
-- the sequence it runs along — consecutive challenges you *could have* entered — and that means knowing
-- which challenges each athlete was eligible for at the time, which depends on squad membership history
-- this schema doesn't keep. Guessing (say, consecutive by end date among challenges in your current
-- squads) would award a streak to someone who joined a squad last week and deny one to someone who left.
-- Left out rather than approximated; the other six competition honors are exact.
--
-- Walking, cycling and swimming endurance families are rows, not code — the metric already takes a
-- modality. Running ships here because it was asked for; the other three are an INSERT away.
--
-- Depends on 0077 (honor_catalog), 0010 (save_workout), 0034 (workout distance), 0059 (challenges).
-- Idempotent. RUN AFTER 0077.

-- ── PRs remember which exercise ───────────────────────────────────────────────
alter table public.personal_records add column if not exists catalog_key text;
create index if not exists personal_records_key on public.personal_records (athlete_id, catalog_key);

comment on column public.personal_records.catalog_key is
  'Exercise catalog id (e.g. barbell-bench-press). Null on rows written before 0078; honors fall back to an exact canonical-name match for those.';

-- ── The catalog gains a narrowing key ─────────────────────────────────────────
alter table public.honor_catalog add column if not exists metric_key text;

comment on column public.honor_catalog.metric_key is
  'Narrows `metric` to one exercise (catalog id) or one activity modality. Null = unscoped. Mirrors challenges.metric_key.';

alter table public.honor_catalog drop constraint if exists honor_catalog_metric_check;
alter table public.honor_catalog add constraint honor_catalog_metric_check
  check (metric in (
    'workouts_total', 'hours_forged', 'chapters_sealed', 'goals_achieved', 'active_weeks',
    'chapter_workouts', 'chapter_days',
    'lift_max', 'combined_lifts',
    'challenges_won', 'challenges_entered',
    'session_distance', 'lifetime_distance'
  ));

insert into public.honor_catalog (honor_type, display_name, category, metric, metric_key, threshold, scope, sort_order) values
  -- ── Strength · the four barbell lifts (thresholds in lb, as stored) ──
  ('bench_milestone_1', 'Bench 135', 'Strength', 'lift_max', 'barbell-bench-press', 135, 'account', 200),
  ('bench_milestone_2', 'Bench 225', 'Strength', 'lift_max', 'barbell-bench-press', 225, 'account', 201),
  ('bench_milestone_3', 'Bench 315', 'Strength', 'lift_max', 'barbell-bench-press', 315, 'account', 202),
  ('bench_milestone_4', 'Bench 405', 'Strength', 'lift_max', 'barbell-bench-press', 405, 'account', 203),

  ('squat_milestone_1', 'Squat 225', 'Strength', 'lift_max', 'barbell-back-squat', 225, 'account', 210),
  ('squat_milestone_2', 'Squat 315', 'Strength', 'lift_max', 'barbell-back-squat', 315, 'account', 211),
  ('squat_milestone_3', 'Squat 405', 'Strength', 'lift_max', 'barbell-back-squat', 405, 'account', 212),
  ('squat_milestone_4', 'Squat 500', 'Strength', 'lift_max', 'barbell-back-squat', 500, 'account', 213),

  ('deadlift_milestone_1', 'Deadlift 315', 'Strength', 'lift_max', 'barbell-deadlift', 315, 'account', 220),
  ('deadlift_milestone_2', 'Deadlift 405', 'Strength', 'lift_max', 'barbell-deadlift', 405, 'account', 221),
  ('deadlift_milestone_3', 'Deadlift 500', 'Strength', 'lift_max', 'barbell-deadlift', 500, 'account', 222),
  ('deadlift_milestone_4', 'Deadlift 600', 'Strength', 'lift_max', 'barbell-deadlift', 600, 'account', 223),

  ('overhead_press_milestone_1', 'Overhead Press 95',  'Strength', 'lift_max', 'barbell-overhead-press', 95,  'account', 230),
  ('overhead_press_milestone_2', 'Overhead Press 135', 'Strength', 'lift_max', 'barbell-overhead-press', 135, 'account', 231),
  ('overhead_press_milestone_3', 'Overhead Press 185', 'Strength', 'lift_max', 'barbell-overhead-press', 185, 'account', 232),
  ('overhead_press_milestone_4', 'Overhead Press 225', 'Strength', 'lift_max', 'barbell-overhead-press', 225, 'account', 233),

  -- ── Strength · combined total (bench + squat + deadlift all-time bests) ──
  ('club_1000', '1,000 Pound Club', 'Strength', 'combined_lifts', null, 1000, 'account', 240),
  ('club_1200', '1,200 Pound Club', 'Strength', 'combined_lifts', null, 1200, 'account', 241),
  ('club_1500', '1,500 Pound Club', 'Strength', 'combined_lifts', null, 1500, 'account', 242),

  -- ── Competition ──
  ('first_challenge_won',     'First Victory',           'Competition', 'challenges_won',     null, 1,  'account', 300),
  ('challenges_won_10',       '10 Challenge Wins',       'Competition', 'challenges_won',     null, 10, 'account', 301),
  ('challenges_won_25',       '25 Challenge Wins',       'Competition', 'challenges_won',     null, 25, 'account', 302),
  ('first_challenge_joined',  'First Challenge Entered', 'Competition', 'challenges_entered', null, 1,  'account', 310),
  ('challenges_entered_10',   '10 Challenges Entered',   'Competition', 'challenges_entered', null, 10, 'account', 311),
  ('challenges_entered_25',   'Challenge Veteran',       'Competition', 'challenges_entered', null, 25, 'account', 312),

  -- ── Endurance · Running (thresholds normalised to MILES; see the evaluator) ──
  ('run_milestone_1', 'First Mile Run',           'Endurance', 'session_distance', 'running', 1,    'account', 400),
  ('run_milestone_2', 'First 5K Run',             'Endurance', 'session_distance', 'running', 3.1,  'account', 401),
  ('run_milestone_3', 'First 10K Run',            'Endurance', 'session_distance', 'running', 6.2,  'account', 402),
  ('run_milestone_4', 'First Half Marathon Run',  'Endurance', 'session_distance', 'running', 13.1, 'account', 403),
  ('run_milestone_5', 'First Marathon Run',       'Endurance', 'session_distance', 'running', 26.2, 'account', 404),

  ('run_lifetime_distance_1', '100 Lifetime Running Miles',    'Endurance', 'lifetime_distance', 'running', 100,   'account', 410),
  ('run_lifetime_distance_2', '500 Lifetime Running Miles',    'Endurance', 'lifetime_distance', 'running', 500,   'account', 411),
  ('run_lifetime_distance_3', '1,000 Lifetime Running Miles',  'Endurance', 'lifetime_distance', 'running', 1000,  'account', 412),
  ('run_lifetime_distance_4', '5,000 Lifetime Running Miles',  'Endurance', 'lifetime_distance', 'running', 5000,  'account', 413),
  ('run_lifetime_distance_5', '15,000 Lifetime Running Miles', 'Endurance', 'lifetime_distance', 'running', 15000, 'account', 414)
on conflict (honor_type) do update set
  display_name = excluded.display_name,
  category     = excluded.category,
  metric       = excluded.metric,
  metric_key   = excluded.metric_key,
  threshold    = excluded.threshold,
  scope        = excluded.scope,
  sort_order   = excluded.sort_order;

-- ── One lift's all-time best, in lb ───────────────────────────────────────────
-- Matches on `catalog_key` where the PR has one. Where it doesn't (rows predating 0078) it falls back to an
-- EXACT canonical name — never a LIKE, because 'Close-Grip Bench Press' and 'Incline Barbell Bench Press'
-- both contain 'Bench Press' and neither is a bench milestone.
create or replace function public.lift_best_lb(p_uid uuid, p_key text)
returns numeric
language sql
security invoker
stable
as $$
  select coalesce(max(
    case when lower(coalesce(pr.load_unit, 'lb')) = 'kg' then pr.load_value * 2.20462 else pr.load_value end
  ), 0)
    from public.personal_records pr
   where pr.athlete_id = p_uid
     and pr.measure_kind = 'load'
     and pr.load_value is not null
     and (
       pr.catalog_key = p_key
       or (pr.catalog_key is null and pr.exercise = case p_key
             when 'barbell-bench-press'    then 'Barbell Bench Press'
             when 'barbell-back-squat'     then 'Barbell Back Squat'
             when 'barbell-deadlift'       then 'Barbell Deadlift'
             when 'barbell-overhead-press' then 'Barbell Overhead Press'
             else null end)
     );
$$;

-- ── The evaluator, extended ───────────────────────────────────────────────────
create or replace function evaluate_honors(p_source text default 'live_session')
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid   uuid := auth.uid();
  v_live  boolean := (p_source = 'live_session');
  v_new   jsonb := '[]'::jsonb;
  v_row   record;
  v_metrics jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select jsonb_build_object(
    'workouts_total',  (select count(*) from workouts where athlete_id = v_uid),
    'hours_forged',    (select coalesce(sum(duration_sec), 0) / 3600.0 from workouts where athlete_id = v_uid),
    'chapters_sealed', (select count(*) from chapters where athlete_id = v_uid and sealed_at is not null),
    'goals_achieved',  (select count(*) from goals where athlete_id = v_uid and achieved_at is not null),
    'active_weeks',    (select count(distinct date_trunc('week', saved_at)) from workouts where athlete_id = v_uid),
    -- Combined total is the three competition lifts, each at its own all-time best (they need not have
    -- happened on the same day — the catalog says "all-time PRs").
    'combined_lifts',  public.lift_best_lb(v_uid, 'barbell-bench-press')
                     + public.lift_best_lb(v_uid, 'barbell-back-squat')
                     + public.lift_best_lb(v_uid, 'barbell-deadlift'),
    'challenges_won',     (select count(*) from public.challenge_results r where r.user_id = v_uid and r.is_winner),
    'challenges_entered', (select count(*) from public.challenge_results r where r.user_id = v_uid)
  ) into v_metrics;

  -- ── Account-scoped, unkeyed ──
  for v_row in
    select c.honor_type, c.display_name
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is null
       and c.metric in ('workouts_total', 'hours_forged', 'chapters_sealed', 'goals_achieved',
                        'active_weeks', 'combined_lifts', 'challenges_won', 'challenges_entered')
       and (v_metrics->>c.metric)::numeric >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, source)
    values (v_uid, v_row.honor_type, v_row.display_name, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Account-scoped, KEYED: one lift, or one activity modality ──
  -- Distances normalise to miles: `workouts.distance_unit` may be 'km', and the catalog's thresholds are
  -- stated in miles. A null unit is treated as miles, which is what the logger writes.
  for v_row in
    select c.honor_type, c.display_name
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is not null
       and case c.metric
             when 'lift_max' then public.lift_best_lb(v_uid, c.metric_key)
             when 'session_distance' then (
               select coalesce(max(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             when 'lifetime_distance' then (
               select coalesce(sum(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, source)
    values (v_uid, v_row.honor_type, v_row.display_name, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Chapter-scoped ──
  for v_row in
    select c.honor_type, c.display_name, ch.id as chapter_id, ch.name as chapter_name
      from public.honor_catalog c
      cross join (
        select chp.id, chp.name,
               chp.workout_count::numeric as chapter_workouts,
               case when chp.sealed_at is not null
                    then (chp.sealed_at::date - chp.start_date)::numeric
                    else null end as chapter_days
          from chapters chp
         where chp.athlete_id = v_uid
      ) ch
     where c.scope = 'chapter'
       and case c.metric
             when 'chapter_workouts' then ch.chapter_workouts
             when 'chapter_days'     then ch.chapter_days
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, chapter_id, source, metadata)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.chapter_id, p_source,
            jsonb_build_object('chapterName', v_row.chapter_name))
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'honor_type', v_row.honor_type, 'display_name', v_row.display_name, 'chapter', v_row.chapter_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, v_row.chapter_id, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  return v_new;
end;
$$;

-- ── save_workout: restore honor evaluation, and record the PR's exercise id ──
--
-- TWO CHANGES ONLY, against 0034's definition (the authoritative one — 0018 added `p_program_id`, 0034
-- added distance). Signature, columns and return shape are otherwise byte-for-byte, because the client
-- reads `workout_id` and a changed contract breaks the save path.
--
-- ⚠ A LIVE BUG, FIXED HERE. 0012 added `evaluate_honors()` to the end of `save_workout` so honors commit
-- inside the same transaction as the workout. 0018 then replaced the function to add program attribution,
-- and 0034 replaced it again to add distance — and NEITHER carried the honor call forward. So honors have
-- not been evaluated on workout save since 0018. The only reason anyone has honors at all is
-- `first_workout_logged` awarded before that, and `initiative` from its own RPC.
--
-- That is also why the backfill in 0077 matters more than it looked: it is not just catching up new
-- catalog entries, it is catching up everything missed since 0018.
--
--   1. `catalog_key` is recorded on each PR, so strength honors can match an exercise rather than a string.
--   2. `evaluate_honors('live_session')` runs again, and its result rides back on the return object.
create or replace function save_workout(
  p_workout_name  text,
  p_activity_type modality,
  p_started_at    timestamptz,
  p_duration_sec  integer,
  p_notes         text,
  p_exercises     jsonb,
  p_prs           jsonb,
  p_program_id    uuid default null,
  p_distance      numeric default null,
  p_distance_unit text default null
) returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid     uuid := auth.uid();
  v_chapter uuid;
  v_workout uuid;
  v_wex     uuid;
  v_ex      jsonb;
  v_set     jsonb;
  v_pr      jsonb;
  v_tl      int := 0;
  v_program uuid := null;
  v_honors  jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select id into v_chapter from chapters where athlete_id = v_uid and is_active limit 1;

  if p_program_id is not null then
    select id into v_program from programs where id = p_program_id and athlete_id = v_uid;
  end if;

  insert into workouts (athlete_id, chapter_id, program_id, workout_name, activity_type, started_at, saved_at, duration_sec, state, notes, distance, distance_unit)
  values (v_uid, v_chapter, v_program, p_workout_name, p_activity_type, p_started_at, now(), p_duration_sec, 'saved', p_notes, p_distance, p_distance_unit)
  returning id into v_workout;

  for v_ex in select value from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb))
  loop
    insert into workout_exercises (workout_id, catalog_key, name, section, position)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name',
            coalesce((v_ex->>'section')::workout_section, 'main'), (v_ex->>'position')::int)
    returning id into v_wex;

    for v_set in select value from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb))
    loop
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int);
    end loop;
  end loop;

  for v_pr in select value from jsonb_array_elements(coalesce(p_prs, '[]'::jsonb))
  loop
    -- `catalogKey` is optional: a caller that doesn't send it stores null and the honor matcher falls back
    -- to the canonical name, exactly as it does for every PR written before this migration.
    insert into personal_records (athlete_id, exercise, catalog_key, achieved_on, measure_kind, load_value, load_unit, load_reps)
    values (v_uid, v_pr->>'exercise', v_pr->>'catalogKey', current_date, 'load', (v_pr->>'weight')::numeric, 'lb', (v_pr->>'reps')::int);
    insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
    values (v_uid, 'ACCOMPLISHMENT', (v_pr->>'exercise') || ' — ' || (v_pr->>'weight') || ' lb PR',
            v_chapter, now(), 'personal_record');
    v_tl := v_tl + 1;
  end loop;

  if v_chapter is not null then
    update chapters set workout_count = workout_count + 1 where id = v_chapter;
  end if;

  -- Inside the transaction, as 0012 intended: a rollback takes the honors with it.
  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'honors', v_honors);
end;
$$;

-- ==============================================================================
-- 0079_honors_bodyweight_tonnage_partners_comebacks.sql
-- ==============================================================================

-- Forge Legacy — 0079: four new honor families
--
-- Bodyweight-relative strength · lifetime tonnage · training partners · comebacks. Twenty-four honors, all
-- computed from data the app already stores and none of them in the locked catalog or its six expansion
-- drafts — they are net-new and are recorded in
-- `Honor-Catalog-Amendment-002-Relative-Strength-And-Presence.md`.
--
-- ══ WHY THESE FOUR ══
--
-- The catalog's strength honors are all absolute — Bench 225, Squat 315. Absolute thresholds reward mass
-- as much as strength, so a 250 lb athlete collects them years before a 150 lb athlete who is, pound for
-- pound, far stronger. RATIO honors are the counterweight, and they are also the honest version of the
-- "top percentile" idea: a percentile needs a leaderboard of other athletes, which the Performance
-- Firewall (CC-D2) and DNA §10 both bar. Measuring against your own bodyweight says the same thing —
-- "this is objectively strong" — against a fixed standard rather than against other people.
--
-- LIFETIME TONNAGE is the number that only ever grows. No comparison, no window, nothing to lose: ten
-- million pounds moved is a fact about a career.
--
-- PARTNER honors use `workouts.partners` (0016), which nothing has read until now. `same_partner_max` is
-- the one worth having — 25 sessions with the SAME person is a relationship, and a completely different
-- achievement from 100 sessions with anyone.
--
-- COMEBACKS acknowledge the moment most people quit. Nothing else in the app notices a return, and a
-- catalog that only ever rewards unbroken accumulation quietly tells anyone who stopped that their record
-- is over. Strictly positive: the honor is for coming BACK, and an athlete who is currently away is never
-- marked as away — the metric only resolves once a workout follows the gap (CC-D3).
--
-- ══ BODYWEIGHT IS OPTIONAL, SO RATIO HONORS DEGRADE SILENTLY ══
--
-- `body_entries` (0028) is an opt-in log. An athlete who has never weighed in has no ratio, so those
-- honors are simply unreachable for them — not failed, not shown as missed. The guard is a null ratio,
-- never a divide-by-zero and never a default weight, because inventing a bodyweight to award a strength
-- honor would put a fabricated number underneath a permanent record.
--
-- Depends on 0078 (honor_catalog + metric_key), 0016 (partners), 0028 (body_entries). Idempotent.

alter table public.honor_catalog drop constraint if exists honor_catalog_metric_check;
alter table public.honor_catalog add constraint honor_catalog_metric_check
  check (metric in (
    'workouts_total', 'hours_forged', 'chapters_sealed', 'goals_achieved', 'active_weeks',
    'chapter_workouts', 'chapter_days',
    'lift_max', 'combined_lifts', 'lift_ratio',
    'challenges_won', 'challenges_entered',
    'session_distance', 'lifetime_distance',
    'lifetime_volume', 'partnered_sessions', 'same_partner_max', 'distinct_partners', 'comeback_days'
  ));

insert into public.honor_catalog (honor_type, display_name, category, metric, metric_key, threshold, scope, sort_order) values
  -- ── Relative Strength · pound for pound ──
  ('bw_bench_1x',      'Bodyweight Bench',              'Relative Strength', 'lift_ratio', 'barbell-bench-press',    1.00, 'account', 250),
  ('bw_bench_125',     'Bench 1.25× Bodyweight',        'Relative Strength', 'lift_ratio', 'barbell-bench-press',    1.25, 'account', 251),
  ('bw_bench_15',      'Bench 1.5× Bodyweight',         'Relative Strength', 'lift_ratio', 'barbell-bench-press',    1.50, 'account', 252),

  ('bw_squat_15',      'Squat 1.5× Bodyweight',         'Relative Strength', 'lift_ratio', 'barbell-back-squat',     1.50, 'account', 260),
  ('bw_squat_2x',      'Double Bodyweight Squat',       'Relative Strength', 'lift_ratio', 'barbell-back-squat',     2.00, 'account', 261),
  ('bw_squat_25',      'Squat 2.5× Bodyweight',         'Relative Strength', 'lift_ratio', 'barbell-back-squat',     2.50, 'account', 262),

  ('bw_deadlift_2x',   'Double Bodyweight Deadlift',    'Relative Strength', 'lift_ratio', 'barbell-deadlift',       2.00, 'account', 270),
  ('bw_deadlift_25',   'Deadlift 2.5× Bodyweight',      'Relative Strength', 'lift_ratio', 'barbell-deadlift',       2.50, 'account', 271),
  ('bw_deadlift_3x',   'Triple Bodyweight Deadlift',    'Relative Strength', 'lift_ratio', 'barbell-deadlift',       3.00, 'account', 272),

  ('bw_press_075',     'Overhead Press 0.75× Bodyweight','Relative Strength','lift_ratio', 'barbell-overhead-press', 0.75, 'account', 280),
  ('bw_press_1x',      'Bodyweight Overhead Press',     'Relative Strength', 'lift_ratio', 'barbell-overhead-press', 1.00, 'account', 281),

  -- ── Tonnage · the number that only grows ──
  ('tonnage_1m',   'One Million Pounds',         'Training', 'lifetime_volume', null, 1000000,  'account', 290),
  ('tonnage_5m',   'Five Million Pounds',        'Training', 'lifetime_volume', null, 5000000,  'account', 291),
  ('tonnage_10m',  'Ten Million Pounds',         'Training', 'lifetime_volume', null, 10000000, 'account', 292),
  ('tonnage_25m',  'Twenty-Five Million Pounds', 'Training', 'lifetime_volume', null, 25000000, 'account', 293),

  -- ── Partnership · who you trained with ──
  ('trained_together_first', 'Never Alone',          'Partnership', 'partnered_sessions', null, 1,   'account', 320),
  ('trained_together_10',    '10 Sessions Together', 'Partnership', 'partnered_sessions', null, 10,  'account', 321),
  ('trained_together_50',    '50 Sessions Together', 'Partnership', 'partnered_sessions', null, 50,  'account', 322),
  ('trained_together_100',   '100 Sessions Together','Partnership', 'partnered_sessions', null, 100, 'account', 323),
  ('same_partner_25',        'The Regular',          'Partnership', 'same_partner_max',   null, 25,  'account', 324),
  ('distinct_partners_10',   'Wide Circle',          'Partnership', 'distinct_partners',  null, 10,  'account', 325),

  -- ── Comebacks · returning is the achievement ──
  ('comeback_30',  'Back to the Iron',     'Longevity', 'comeback_days', null, 30,  'account', 340),
  ('comeback_90',  'The Long Way Back',    'Longevity', 'comeback_days', null, 90,  'account', 341),
  ('comeback_180', 'Never Gone for Good',  'Longevity', 'comeback_days', null, 180, 'account', 342)
on conflict (honor_type) do update set
  display_name = excluded.display_name,
  category     = excluded.category,
  metric       = excluded.metric,
  metric_key   = excluded.metric_key,
  threshold    = excluded.threshold,
  scope        = excluded.scope,
  sort_order   = excluded.sort_order;

-- ── Latest recorded bodyweight, in lb. Null when never logged. ────────────────
create or replace function public.latest_bodyweight_lb(p_uid uuid)
returns numeric
language sql
security invoker
stable
as $$
  select b.weight_lb
    from public.body_entries b
   where b.athlete_id = p_uid and b.weight_lb > 0
   order by b.logged_on desc, b.created_at desc
   limit 1;
$$;

-- ── The evaluator ─────────────────────────────────────────────────────────────
create or replace function evaluate_honors(p_source text default 'live_session')
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid   uuid := auth.uid();
  v_live  boolean := (p_source = 'live_session');
  v_new   jsonb := '[]'::jsonb;
  v_row   record;
  v_metrics jsonb;
  v_bw    numeric;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_bw := public.latest_bodyweight_lb(v_uid);

  select jsonb_build_object(
    'workouts_total',  (select count(*) from workouts where athlete_id = v_uid),
    'hours_forged',    (select coalesce(sum(duration_sec), 0) / 3600.0 from workouts where athlete_id = v_uid),
    'chapters_sealed', (select count(*) from chapters where athlete_id = v_uid and sealed_at is not null),
    'goals_achieved',  (select count(*) from goals where athlete_id = v_uid and achieved_at is not null),
    'active_weeks',    (select count(distinct date_trunc('week', saved_at)) from workouts where athlete_id = v_uid),
    'combined_lifts',  public.lift_best_lb(v_uid, 'barbell-bench-press')
                     + public.lift_best_lb(v_uid, 'barbell-back-squat')
                     + public.lift_best_lb(v_uid, 'barbell-deadlift'),
    'challenges_won',     (select count(*) from public.challenge_results r where r.user_id = v_uid and r.is_winner),
    'challenges_entered', (select count(*) from public.challenge_results r where r.user_id = v_uid),

    -- Every logged set, ever. kg normalised so a mixed-unit history still totals correctly.
    'lifetime_volume', (
      select coalesce(sum(
        case when lower(coalesce(ws.weight_unit, 'lb')) = 'kg' then ws.weight * 2.20462 else ws.weight end
        * ws.reps), 0)
        from workout_sets ws
        join workout_exercises we on we.id = ws.workout_exercise_id
        join workouts w on w.id = we.workout_id
       where w.athlete_id = v_uid and ws.weight is not null and ws.reps is not null
    ),

    'partnered_sessions', (
      select count(*) from workouts w
       where w.athlete_id = v_uid and array_length(w.partners, 1) > 0
    ),
    -- The most sessions logged alongside any ONE person.
    'same_partner_max', (
      select coalesce(max(n), 0) from (
        select count(*) as n
          from workouts w, unnest(w.partners) as p(name)
         where w.athlete_id = v_uid
         group by p.name
      ) t
    ),
    'distinct_partners', (
      select count(distinct p.name)
        from workouts w, unnest(w.partners) as p(name)
       where w.athlete_id = v_uid
    ),

    -- The longest gap that was FOLLOWED by a return. `lag` needs a prior row and this row must exist, so
    -- an athlete currently away scores nothing — the honor is for coming back, never for having left.
    'comeback_days', (
      select coalesce(max(gap), 0) from (
        select (w.saved_at::date - lag(w.saved_at::date) over (order by w.saved_at))::numeric as gap
          from workouts w
         where w.athlete_id = v_uid
      ) g
    )
  ) into v_metrics;

  -- ── Account-scoped, unkeyed ──
  for v_row in
    select c.honor_type, c.display_name
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is null
       and c.metric in ('workouts_total', 'hours_forged', 'chapters_sealed', 'goals_achieved', 'active_weeks',
                        'combined_lifts', 'challenges_won', 'challenges_entered',
                        'lifetime_volume', 'partnered_sessions', 'same_partner_max', 'distinct_partners',
                        'comeback_days')
       and (v_metrics->>c.metric)::numeric >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, source)
    values (v_uid, v_row.honor_type, v_row.display_name, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Account-scoped, KEYED ──
  -- `lift_ratio` yields NULL when no bodyweight has ever been logged, so the comparison is never true and
  -- those honors are simply unreachable — not failed, and never awarded off an invented default weight.
  for v_row in
    select c.honor_type, c.display_name
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is not null
       and case c.metric
             when 'lift_max' then public.lift_best_lb(v_uid, c.metric_key)
             when 'lift_ratio' then
               case when v_bw is null or v_bw <= 0 then null
                    else public.lift_best_lb(v_uid, c.metric_key) / v_bw end
             when 'session_distance' then (
               select coalesce(max(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             when 'lifetime_distance' then (
               select coalesce(sum(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, source)
    values (v_uid, v_row.honor_type, v_row.display_name, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Chapter-scoped ──
  for v_row in
    select c.honor_type, c.display_name, ch.id as chapter_id, ch.name as chapter_name
      from public.honor_catalog c
      cross join (
        select chp.id, chp.name,
               chp.workout_count::numeric as chapter_workouts,
               case when chp.sealed_at is not null
                    then (chp.sealed_at::date - chp.start_date)::numeric
                    else null end as chapter_days
          from chapters chp
         where chp.athlete_id = v_uid
      ) ch
     where c.scope = 'chapter'
       and case c.metric
             when 'chapter_workouts' then ch.chapter_workouts
             when 'chapter_days'     then ch.chapter_days
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, chapter_id, source, metadata)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.chapter_id, p_source,
            jsonb_build_object('chapterName', v_row.chapter_name))
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'honor_type', v_row.honor_type, 'display_name', v_row.display_name, 'chapter', v_row.chapter_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, v_row.chapter_id, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  return v_new;
end;
$$;

-- ==============================================================================
-- 0080_endurance_honors.sql
-- ==============================================================================

-- Forge Legacy — 0080: walking, cycling and swimming endurance honors (28)
--
-- Pure catalog rows. `session_distance` and `lifetime_distance` already take a modality key (0078), so
-- these three families needed no evaluator change at all — which was the point of making the catalog a
-- table. Running shipped in 0078; this completes the Endurance category.
--
-- ══ EVERY THRESHOLD IS IN MILES ══
--
-- The catalog states each family in the unit its athletes think in — kilometres for swimming, miles for
-- cycling, both for running and walking. The evaluator normalises `workouts.distance` to miles (a km-logged
-- session converts on read), so the thresholds are converted ONCE here rather than the evaluator carrying a
-- per-family unit. Conversions are shown beside each row so the arithmetic is checkable against the doc
-- rather than trusted.
--
-- ══ WHAT IS DELIBERATELY LEFT OUT: THE kg CLUBS ══
--
-- `club_400kg` / `club_500kg` / `club_600kg` are in the locked catalog beside `club_1000` / `1200` / `1500`,
-- and they are the SAME achievement stated in another unit — 400 kg is 882 lb, so an athlete crossing
-- 1,000 lb has already crossed 400 kg. Awarding both sets means one combined total earns six honors, and a
-- trophy case that lists "1,000 Pound Club" next to "400 Kilogram Club" reads as padding rather than as
-- two accomplishments.
--
-- The catalog almost certainly intends them as a UNIT-PREFERENCE pair — you are shown the set matching your
-- units — but nothing in the schema expresses "these two honors are the same honor in different units", and
-- inventing that mapping silently is a product decision, not a migration. Left out and raised instead.
-- Athletes on metric currently earn the lb clubs, which are at least correct, just not in their units.
--
-- Depends on 0078 (session_distance / lifetime_distance metrics). Idempotent. RUN AFTER 0079.

insert into public.honor_catalog (honor_type, display_name, category, metric, metric_key, threshold, scope, sort_order) values
  -- ── Walking · session ──
  ('walk_milestone_1', 'First Mile Walk',          'Endurance', 'session_distance', 'walking', 1,    'account', 420),
  ('walk_milestone_2', 'First 5K Walk',            'Endurance', 'session_distance', 'walking', 3.1,  'account', 421),
  ('walk_milestone_3', 'First 10K Walk',           'Endurance', 'session_distance', 'walking', 6.2,  'account', 422),
  ('walk_milestone_4', 'First Half Marathon Walk', 'Endurance', 'session_distance', 'walking', 13.1, 'account', 423),
  ('walk_milestone_5', 'First Marathon Walk',      'Endurance', 'session_distance', 'walking', 26.2, 'account', 424),

  -- ── Walking · lifetime ──
  ('walk_lifetime_distance_1', '100 Lifetime Walking Miles',    'Endurance', 'lifetime_distance', 'walking', 100,   'account', 430),
  ('walk_lifetime_distance_2', '500 Lifetime Walking Miles',    'Endurance', 'lifetime_distance', 'walking', 500,   'account', 431),
  ('walk_lifetime_distance_3', '1,000 Lifetime Walking Miles',  'Endurance', 'lifetime_distance', 'walking', 1000,  'account', 432),
  ('walk_lifetime_distance_4', '5,000 Lifetime Walking Miles',  'Endurance', 'lifetime_distance', 'walking', 5000,  'account', 433),
  ('walk_lifetime_distance_5', '15,000 Lifetime Walking Miles', 'Endurance', 'lifetime_distance', 'walking', 15000, 'account', 434),

  -- ── Cycling · session ──
  ('bike_milestone_1', 'First 25-Mile Ride',       'Endurance', 'session_distance', 'cycling', 25,  'account', 440),
  ('bike_milestone_2', 'First 50-Mile Ride',       'Endurance', 'session_distance', 'cycling', 50,  'account', 441),
  ('bike_milestone_3', 'First Century Ride',       'Endurance', 'session_distance', 'cycling', 100, 'account', 442),
  ('bike_milestone_4', 'First Double Century Ride','Endurance', 'session_distance', 'cycling', 200, 'account', 443),

  -- ── Cycling · lifetime ──
  ('bike_lifetime_distance_1', '250 Lifetime Cycling Miles',    'Endurance', 'lifetime_distance', 'cycling', 250,   'account', 450),
  ('bike_lifetime_distance_2', '1,000 Lifetime Cycling Miles',  'Endurance', 'lifetime_distance', 'cycling', 1000,  'account', 451),
  ('bike_lifetime_distance_3', '5,000 Lifetime Cycling Miles',  'Endurance', 'lifetime_distance', 'cycling', 5000,  'account', 452),
  ('bike_lifetime_distance_4', '15,000 Lifetime Cycling Miles', 'Endurance', 'lifetime_distance', 'cycling', 15000, 'account', 453),
  ('bike_lifetime_distance_5', '50,000 Lifetime Cycling Miles', 'Endurance', 'lifetime_distance', 'cycling', 50000, 'account', 454),

  -- ── Swimming · session (catalog states metres; converted to miles) ──
  ('swim_milestone_1', 'First 500m Swim',  'Endurance', 'session_distance', 'swimming', 0.311, 'account', 460),  --   500 m
  ('swim_milestone_2', 'First 1000m Swim', 'Endurance', 'session_distance', 'swimming', 0.621, 'account', 461),  -- 1,000 m
  ('swim_milestone_3', 'First Mile Swim',  'Endurance', 'session_distance', 'swimming', 1,     'account', 462),  -- 1,609 m
  ('swim_milestone_4', 'First 5K Swim',    'Endurance', 'session_distance', 'swimming', 3.107, 'account', 463),  -- 5,000 m

  -- ── Swimming · lifetime (catalog states kilometres; converted to miles) ──
  ('swim_lifetime_distance_1', '25 Lifetime Swimming Kilometers',    'Endurance', 'lifetime_distance', 'swimming', 15.534, 'account', 470),  --    25 km
  ('swim_lifetime_distance_2', '100 Lifetime Swimming Kilometers',   'Endurance', 'lifetime_distance', 'swimming', 62.137, 'account', 471),  --   100 km
  ('swim_lifetime_distance_3', '250 Lifetime Swimming Kilometers',   'Endurance', 'lifetime_distance', 'swimming', 155.34, 'account', 472),  --   250 km
  ('swim_lifetime_distance_4', '500 Lifetime Swimming Kilometers',   'Endurance', 'lifetime_distance', 'swimming', 310.69, 'account', 473),  --   500 km
  ('swim_lifetime_distance_5', '1,000 Lifetime Swimming Kilometers', 'Endurance', 'lifetime_distance', 'swimming', 621.37, 'account', 474)   -- 1,000 km
on conflict (honor_type) do update set
  display_name = excluded.display_name,
  category     = excluded.category,
  metric       = excluded.metric,
  metric_key   = excluded.metric_key,
  threshold    = excluded.threshold,
  scope        = excluded.scope,
  sort_order   = excluded.sort_order;

-- ==============================================================================
-- 0081_honor_category_snapshot.sql
-- ==============================================================================

-- Forge Legacy — 0081: snapshot an honor's category onto the earned row
--
-- The Honors Hub draws a per-category medallion — a dumbbell for Training, a shield for Strength. The
-- Legacy screen drew a five-point star for every honor, because its query selects only
-- `id, display_name, date_earned`: there is nothing on the row to resolve a category from, so it fell back
-- to one hardcoded mark. Two surfaces, same honor, different artwork.
--
-- WHY SNAPSHOT RATHER THAN JOIN. `honor_instances.honor_type` has no foreign key to `honor_catalog` and
-- cannot have one — `initiative` is granted by its own RPC (0014) and is not a threshold honor, so it will
-- never be a catalog row. Every surface that wants a glyph would otherwise have to fetch the whole catalog
-- and map it client-side, which is a second list to keep in step and a second query on every read.
--
-- Snapshotting also matches what this table already does: `display_name` is copied onto the row at award
-- time (AD-58) precisely so a later catalog edit cannot rewrite what an athlete was told they earned. The
-- category is the same kind of fact — what this honor WAS when it was struck. If Relative Strength is ever
-- renamed, honors earned under the old name keep it, which is the correct behaviour for a permanent record.
--
-- Nullable, and the client falls back to the code catalog when it is null: `initiative` has no catalog row,
-- and rows earned before this migration keep whatever the backfill can resolve.
--
-- Depends on 0077 (honor_catalog), 0012 (honor_instances). Idempotent. RUN AFTER 0080.

alter table public.honor_instances add column if not exists category text;

comment on column public.honor_instances.category is
  'Category snapshotted at award time, so every surface renders the right medallion without joining the catalog. Null for honors granted outside the catalog (e.g. initiative) — the client falls back to the code catalog.';

-- Backfill what can be resolved. Honors with no catalog row (initiative) stay null by design.
update public.honor_instances hi
   set category = c.category
  from public.honor_catalog c
 where c.honor_type = hi.honor_type
   and hi.category is distinct from c.category;

-- ── Award with the category attached ──────────────────────────────────────────
-- Identical to 0079's evaluator apart from carrying `c.category` through each insert.
create or replace function evaluate_honors(p_source text default 'live_session')
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid   uuid := auth.uid();
  v_live  boolean := (p_source = 'live_session');
  v_new   jsonb := '[]'::jsonb;
  v_row   record;
  v_metrics jsonb;
  v_bw    numeric;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_bw := public.latest_bodyweight_lb(v_uid);

  select jsonb_build_object(
    'workouts_total',  (select count(*) from workouts where athlete_id = v_uid),
    'hours_forged',    (select coalesce(sum(duration_sec), 0) / 3600.0 from workouts where athlete_id = v_uid),
    'chapters_sealed', (select count(*) from chapters where athlete_id = v_uid and sealed_at is not null),
    'goals_achieved',  (select count(*) from goals where athlete_id = v_uid and achieved_at is not null),
    'active_weeks',    (select count(distinct date_trunc('week', saved_at)) from workouts where athlete_id = v_uid),
    'combined_lifts',  public.lift_best_lb(v_uid, 'barbell-bench-press')
                     + public.lift_best_lb(v_uid, 'barbell-back-squat')
                     + public.lift_best_lb(v_uid, 'barbell-deadlift'),
    'challenges_won',     (select count(*) from public.challenge_results r where r.user_id = v_uid and r.is_winner),
    'challenges_entered', (select count(*) from public.challenge_results r where r.user_id = v_uid),
    'lifetime_volume', (
      select coalesce(sum(
        case when lower(coalesce(ws.weight_unit, 'lb')) = 'kg' then ws.weight * 2.20462 else ws.weight end
        * ws.reps), 0)
        from workout_sets ws
        join workout_exercises we on we.id = ws.workout_exercise_id
        join workouts w on w.id = we.workout_id
       where w.athlete_id = v_uid and ws.weight is not null and ws.reps is not null
    ),
    'partnered_sessions', (
      select count(*) from workouts w
       where w.athlete_id = v_uid and array_length(w.partners, 1) > 0
    ),
    'same_partner_max', (
      select coalesce(max(n), 0) from (
        select count(*) as n
          from workouts w, unnest(w.partners) as p(name)
         where w.athlete_id = v_uid
         group by p.name
      ) t
    ),
    'distinct_partners', (
      select count(distinct p.name)
        from workouts w, unnest(w.partners) as p(name)
       where w.athlete_id = v_uid
    ),
    'comeback_days', (
      select coalesce(max(gap), 0) from (
        select (w.saved_at::date - lag(w.saved_at::date) over (order by w.saved_at))::numeric as gap
          from workouts w
         where w.athlete_id = v_uid
      ) g
    )
  ) into v_metrics;

  -- ── Account-scoped, unkeyed ──
  for v_row in
    select c.honor_type, c.display_name, c.category
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is null
       and c.metric in ('workouts_total', 'hours_forged', 'chapters_sealed', 'goals_achieved', 'active_weeks',
                        'combined_lifts', 'challenges_won', 'challenges_entered',
                        'lifetime_volume', 'partnered_sessions', 'same_partner_max', 'distinct_partners',
                        'comeback_days')
       and (v_metrics->>c.metric)::numeric >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, source)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Account-scoped, keyed ──
  for v_row in
    select c.honor_type, c.display_name, c.category
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is not null
       and case c.metric
             when 'lift_max' then public.lift_best_lb(v_uid, c.metric_key)
             when 'lift_ratio' then
               case when v_bw is null or v_bw <= 0 then null
                    else public.lift_best_lb(v_uid, c.metric_key) / v_bw end
             when 'session_distance' then (
               select coalesce(max(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             when 'lifetime_distance' then (
               select coalesce(sum(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, source)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Chapter-scoped ──
  for v_row in
    select c.honor_type, c.display_name, c.category, ch.id as chapter_id, ch.name as chapter_name
      from public.honor_catalog c
      cross join (
        select chp.id, chp.name,
               chp.workout_count::numeric as chapter_workouts,
               case when chp.sealed_at is not null
                    then (chp.sealed_at::date - chp.start_date)::numeric
                    else null end as chapter_days
          from chapters chp
         where chp.athlete_id = v_uid
      ) ch
     where c.scope = 'chapter'
       and case c.metric
             when 'chapter_workouts' then ch.chapter_workouts
             when 'chapter_days'     then ch.chapter_days
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, chapter_id, source, metadata)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, v_row.chapter_id, p_source,
            jsonb_build_object('chapterName', v_row.chapter_name))
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'honor_type', v_row.honor_type, 'display_name', v_row.display_name, 'chapter', v_row.chapter_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, v_row.chapter_id, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  return v_new;
end;
$$;

notify pgrst, 'reload schema';
