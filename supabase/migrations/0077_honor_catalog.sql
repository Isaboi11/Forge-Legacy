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
