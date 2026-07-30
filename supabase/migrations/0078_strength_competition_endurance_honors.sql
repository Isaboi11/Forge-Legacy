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
