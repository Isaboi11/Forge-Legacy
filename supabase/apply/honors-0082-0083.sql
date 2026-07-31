-- Forge Legacy - APPLY BUNDLE 0082-0083 (the tail of the honors chain)
--
-- 0077-0081 are applied. These two were not, and the Honors hub cannot load without 0083: the client
-- selects honor_catalog.display_amount, which 0083 is the only migration to add, so the read fails with
-- 42703 (undefined column) and the screen shows "Couldn'''t load your honors."
--
--   0082 the Origin family (8 honors, including "Again" for your second workout)
--   0083 wording sweep + display_amount, so a swim threshold stops reading "0.311 miles"
--
-- RUN AS ONE BATCH, in this order. Idempotent.


-- ==========================================================================
-- 0082_origin_honors.sql
-- ==========================================================================

-- Forge Legacy — 0082: the Origin family (8)
--
-- Origin held exactly one honor — `initiative`, granted by its own RPC. It is the only category about
-- crossing from trying to committing, which is the window where people quit, and it was almost empty.
--
-- ══ THE ONE THAT MATTERS MOST IS "AGAIN" ══
--
-- Your SECOND workout. Nothing in the app marked it. Anyone can log one session; coming back is the whole
-- game, and it is the honor most likely to arrive exactly when somebody needs it. It shares the
-- `workouts_total` metric with First Workout Logged, one threshold up.
--
-- ══ WHAT IS DELIBERATELY NOT HERE ══
--
-- Nothing granted automatically. Chapter I is created during onboarding, so "first chapter started" would
-- land before the athlete has done anything — an honor you cannot fail to earn is not one. Same reason
-- there is no honor for signing up.
--
-- ══ ONE STRUCTURAL FIX ══
--
-- The unkeyed loop listed its own metrics in an `IN (...)` clause that had to be kept in step with the
-- `jsonb_build_object` above it — two places, every time, and a metric added to one but not the other
-- fails silently by simply never matching. It now tests `v_metrics ? c.metric`, so the metrics object is
-- the single source of truth for what is computable.
--
-- Depends on 0081. 0073 (friendships) and 0044 (transformation_entries) are read defensively via to_regclass
-- so this still applies cleanly if either is missing. Idempotent. RUN AFTER 0081.

alter table public.honor_catalog drop constraint if exists honor_catalog_metric_check;
alter table public.honor_catalog add constraint honor_catalog_metric_check
  check (metric in (
    'workouts_total', 'hours_forged', 'chapters_sealed', 'goals_achieved', 'active_weeks',
    'chapter_workouts', 'chapter_days',
    'lift_max', 'combined_lifts', 'lift_ratio',
    'challenges_won', 'challenges_entered',
    'session_distance', 'lifetime_distance',
    'lifetime_volume', 'partnered_sessions', 'same_partner_max', 'distinct_partners', 'comeback_days',
    'prs_recorded', 'goals_set', 'connections', 'captures_recorded', 'reflections_written',
    'has_standard', 'best_week_sessions'
  ));

insert into public.honor_catalog (honor_type, display_name, category, metric, metric_key, threshold, scope, sort_order) values
  ('origin_again',           'Again',                  'Origin', 'workouts_total',      null, 2, 'account', 1),
  ('origin_first_pr',        'First Personal Record',  'Origin', 'prs_recorded',        null, 1, 'account', 2),
  ('origin_standard',        'My Standard',            'Origin', 'has_standard',        null, 1, 'account', 3),
  ('origin_first_goal',      'First Goal',             'Origin', 'goals_set',           null, 1, 'account', 4),
  ('origin_not_alone',       'Not Alone',              'Origin', 'connections',         null, 1, 'account', 5),
  ('origin_first_capture',   'First Capture',          'Origin', 'captures_recorded',   null, 1, 'account', 6),
  ('origin_first_reflection','First Reflection',       'Origin', 'reflections_written', null, 1, 'account', 7),
  ('origin_first_week',      'First Week',             'Origin', 'best_week_sessions',  null, 3, 'account', 8)
on conflict (honor_type) do update set
  display_name = excluded.display_name,
  category     = excluded.category,
  metric       = excluded.metric,
  metric_key   = excluded.metric_key,
  threshold    = excluded.threshold,
  scope        = excluded.scope,
  sort_order   = excluded.sort_order;

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
  v_friends int := 0;
  v_captures int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_bw := public.latest_bodyweight_lb(v_uid);

  -- Read defensively: these tables arrive in later migrations than some deployments may have applied, and
  -- an honor family should degrade to "not yet earned" rather than take the whole evaluation down.
  if to_regclass('public.friendships') is not null then
    execute 'select count(*) from public.friendships where status = ''ACCEPTED'' and $1 in (low_id, high_id)'
      into v_friends using v_uid;
  end if;
  if to_regclass('public.transformation_entries') is not null then
    execute 'select count(*) from public.transformation_entries where athlete_id = $1'
      into v_captures using v_uid;
  end if;

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
        select count(*) as n from workouts w, unnest(w.partners) as p(name)
         where w.athlete_id = v_uid group by p.name
      ) t
    ),
    'distinct_partners', (
      select count(distinct p.name) from workouts w, unnest(w.partners) as p(name)
       where w.athlete_id = v_uid
    ),
    'comeback_days', (
      select coalesce(max(gap), 0) from (
        select (w.saved_at::date - lag(w.saved_at::date) over (order by w.saved_at))::numeric as gap
          from workouts w where w.athlete_id = v_uid
      ) g
    ),

    -- ── Origin ──
    'prs_recorded', (select count(*) from public.personal_records pr where pr.athlete_id = v_uid),
    'goals_set',    (select count(*) from public.goals g where g.athlete_id = v_uid),
    -- Squads and friends together: "Not Alone" is about not training alone, and either route counts.
    'connections',  (select count(*) from public.squad_members m where m.user_id = v_uid) + v_friends,
    'captures_recorded', v_captures,
    -- A reflection is authored prose, not a logged number — a sealed chapter's reflection or a note on an
    -- accomplishment. Both are the athlete choosing to say something about what happened.
    'reflections_written',
      (select count(*) from public.chapters c where c.athlete_id = v_uid and btrim(coalesce(c.reflection, '')) <> '')
      + (select count(*) from public.accomplishments a where a.athlete_id = v_uid and btrim(coalesce(a.note, '')) <> ''),
    'has_standard', (
      select case when btrim(coalesce(p.standard, '')) <> '' then 1 else 0 end
        from public.profiles p where p.id = v_uid
    ),
    -- Most sessions inside any rolling 7-day window. A real week of training, not a calendar accident:
    -- Thu/Fri/Sat counts even though it straddles no week boundary.
    'best_week_sessions', (
      select coalesce(max(cnt), 0) from (
        select count(*) over (
                 order by w.saved_at
                 range between interval '6 days' preceding and current row
               ) as cnt
          from workouts w where w.athlete_id = v_uid
      ) t
    )
  ) into v_metrics;

  -- ── Account-scoped, unkeyed ──
  -- `v_metrics ? c.metric` replaces a hand-maintained IN list that had to mirror the object above it.
  for v_row in
    select c.honor_type, c.display_name, c.category
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is null
       and v_metrics ? c.metric
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
          from chapters chp where chp.athlete_id = v_uid
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


-- ==========================================================================
-- 0083_honor_display_amounts.sql
-- ==========================================================================

-- Forge Legacy — 0083: honor wording sweep
--
-- A pass over every honor's name and generated description, reading them as an athlete would.
--
-- ══ 1. A DISPLAY AMOUNT, FOR THRESHOLDS THAT DON'T ROUND-TRIP ══
--
-- Every distance threshold is stored in miles so one evaluator can compare them (0078). Swimming is
-- authored in metres and kilometres, so converting back for display produced nonsense:
--
--     "25 Lifetime Swimming Kilometers"  →  "15.534 lifetime swim miles."
--     "First 500m Swim"                  →  "Swim 0.311 miles in a single session."
--
-- The name says one unit and the description says another, in a decimal nobody swims to. Converting in the
-- client doesn't fix it either: 500 m and 1,000 m convert back cleanly, but 1 mile does not become a round
-- metric figure, and a rule that guesses which unit to show would get "First Mile Swim" wrong.
--
-- So the catalog carries an optional `display_amount` — the phrase to print for that threshold. Set only
-- where the stored number and the spoken number differ. Null everywhere else, which is most honors.
--
-- ══ 2. NAMING COLLISION ══
--
-- "Not Alone" (Origin — you joined a squad or added a friend) and "Never Alone" (Partnership — you logged
-- a workout alongside someone) are two different achievements in two categories whose names are almost
-- indistinguishable. Both were authored here, a day apart, without being read against each other.
-- Origin's becomes "First Connection", which says what it is; Partnership's keeps "Never Alone", which
-- means what it says.
--
-- Display names are snapshotted onto earned rows (AD-58), so the rename is backfilled for anyone who
-- already holds it — nobody has had it more than a few hours, and leaving two names for one honor in
-- circulation would be worse than editing a very young record.
--
-- Idempotent. RUN AFTER 0082.

alter table public.honor_catalog add column if not exists display_amount text;

comment on column public.honor_catalog.display_amount is
  'How to speak this threshold when the stored figure is not the spoken one (swimming is stored in miles, authored in metres). Null = say the stored number.';

update public.honor_catalog set display_amount = v.amount
  from (values
    ('swim_milestone_1', '500 m'),
    ('swim_milestone_2', '1,000 m'),
    ('swim_milestone_3', '1 mile'),
    ('swim_milestone_4', '5 km'),
    ('swim_lifetime_distance_1', '25 km'),
    ('swim_lifetime_distance_2', '100 km'),
    ('swim_lifetime_distance_3', '250 km'),
    ('swim_lifetime_distance_4', '500 km'),
    ('swim_lifetime_distance_5', '1,000 km')
  ) as v(honor_type, amount)
 where public.honor_catalog.honor_type = v.honor_type;

-- ── The rename ────────────────────────────────────────────────────────────────
update public.honor_catalog
   set display_name = 'First Connection'
 where honor_type = 'origin_not_alone';

-- Earned rows snapshot their name, so the rename has to reach them too or the same honor reads two ways.
update public.honor_instances
   set display_name = 'First Connection'
 where honor_type = 'origin_not_alone';
