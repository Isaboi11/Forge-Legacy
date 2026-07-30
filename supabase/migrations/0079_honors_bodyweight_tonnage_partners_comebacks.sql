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
