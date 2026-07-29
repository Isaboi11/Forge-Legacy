-- Forge Legacy — 0061: scoped competitions (Max Deadlift, Most Miles Run, …)
--
-- Turns five metrics into hundreds of real competitions without inventing a single new scoring rule:
-- a `metric_key` narrows an existing kind to one exercise or one activity.
--
--   MAX_LIFT      + 'barbell-deadlift'  → Max Deadlift
--   MOST_VOLUME   + 'barbell-back-squat'→ Most Squat Volume
--   DISTANCE_TOTAL+ 'running'           → Most Miles Run
--   MOST_WORKOUTS + 'running'           → Most Runs
--
-- This is deliberately the SAME SHAPE the app already uses for squad goals — `goal_metric_kind` +
-- `goal_metric_key` (0036/0037), where the key is an activity modality. Matching it means one mental
-- model for "a metric, narrowed", rather than two competing ones.
--
-- The key is an exercise `catalog_key` (from `workout_exercises`, FK to the 794-exercise catalog) for
-- lift-based metrics, and an `activity_type` for session-based ones. Null = unscoped, which is exactly
-- how every challenge created before this migration behaves — so nothing is retro-changed.
--
-- ADDS ONE TYPE: `DISTANCE_TOTAL`. CS-D9's metric table doesn't list it, but the app already computes
-- distance for squad goals and "most miles run" is the single most-requested shape a running squad
-- would want. Recorded as an amendment-owed against CS-D9 rather than slipped in silently — see the
-- Decision Queue.
--
-- Depends on 0059/0060. Idempotent. RUN AFTER 0060.

alter table public.challenges add column if not exists metric_key text;

comment on column public.challenges.metric_key is
  'Narrows `type` to one exercise (catalog_key) or one activity_type. Null = unscoped. Mirrors squads.goal_metric_key.';

alter table public.challenges drop constraint if exists challenges_type_check;
alter table public.challenges add constraint challenges_type_check
  check (type in ('MOST_WORKOUTS', 'MOST_VOLUME', 'MAX_LIFT', 'MOST_DURATION', 'MOST_PRS', 'DISTANCE_TOTAL'));

-- ── Scoring, now key-aware ────────────────────────────────────────────────────
-- Every branch reads `c.metric_key is null or <match>`, so an unscoped challenge behaves exactly as it
-- did before 0061 and a scoped one narrows to the same rows a human would count.
create or replace function public.challenge_score(p_challenge uuid, p_user uuid)
returns numeric
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  c public.challenges%rowtype;
  k text;
begin
  select * into c from public.challenges where id = p_challenge;
  if not found then
    return 0;
  end if;
  k := nullif(btrim(coalesce(c.metric_key, '')), '');

  return case c.type
    when 'MOST_WORKOUTS' then coalesce((
      select count(*) from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at
         and (k is null or w.activity_type::text = k)), 0)

    when 'MOST_VOLUME' then coalesce((
      select sum(ws.weight * ws.reps)
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at
         and (k is null or we.catalog_key = k)), 0)

    when 'MAX_LIFT' then coalesce((
      select max(ws.weight)
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at
         and (k is null or we.catalog_key = k)), 0)

    when 'MOST_DURATION' then coalesce((
      select sum(w.duration_sec) from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at
         and (k is null or w.activity_type::text = k)), 0) / 3600.0

    when 'DISTANCE_TOTAL' then coalesce((
      select sum(w.distance) from public.workouts w
       where w.athlete_id = p_user and w.distance is not null
         and w.saved_at >= c.start_at and w.saved_at < c.end_at
         and (k is null or w.activity_type::text = k)), 0)

    when 'MOST_PRS' then coalesce((
      select count(*) from public.personal_records pr
       where pr.athlete_id = p_user
         and pr.achieved_on >= c.start_at::date and pr.achieved_on < c.end_at::date), 0)

    else 0
  end;
end;
$$;

-- ── The hub carries the key, so a card can say "Max Deadlift" not just "Max Lift" ──
create or replace function public.challenge_hub()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('open', '[]'::jsonb, 'active', '[]'::jsonb, 'history', '[]'::jsonb, 'stats', '{}'::jsonb);
  end if;

  return jsonb_build_object(
    'open', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
               'squad_id', c.squad_id, 'squad_name', s.name,
               'creator_name', coalesce(p.name, 'Athlete'),
               'start_at', c.start_at, 'end_at', c.end_at,
               'roster', (select count(*)::int from public.challenge_participants cp where cp.challenge_id = c.id)
             ) order by c.start_at)
        from public.challenges c
        join public.squads s on s.id = c.squad_id
        left join public.profiles p on p.id = c.creator_id
       where c.context = 'SQUAD'
         and c.state = 'ENROLLMENT'
         and public.is_squad_member(c.squad_id, v_uid)
         and not exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = v_uid)
    ), '[]'::jsonb),

    'active', coalesce((
      select jsonb_agg(x.obj order by x.end_at)
        from (
          select c.end_at,
                 jsonb_build_object(
                   'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
                   'squad_id', c.squad_id, 'squad_name', s.name,
                   'start_at', c.start_at, 'end_at', c.end_at,
                   'roster', (select count(*)::int from public.challenge_participants cp where cp.challenge_id = c.id),
                   'my_score', public.challenge_score(c.id, v_uid),
                   'my_place', (
                     select count(*) + 1
                       from public.challenge_participants cp2
                      where cp2.challenge_id = c.id
                        and public.challenge_score(c.id, cp2.user_id) > public.challenge_score(c.id, v_uid)
                   ),
                   'leader_score', (
                     select coalesce(max(public.challenge_score(c.id, cp3.user_id)), 0)
                       from public.challenge_participants cp3 where cp3.challenge_id = c.id
                   )
                 ) as obj
            from public.challenges c
            join public.squads s on s.id = c.squad_id
            join public.challenge_participants cp on cp.challenge_id = c.id and cp.user_id = v_uid
           where c.state = 'ACTIVE'
        ) x
    ), '[]'::jsonb),

    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
               'squad_name', s.name, 'end_at', c.end_at,
               'place', r.place, 'score', r.score, 'is_winner', r.is_winner,
               'roster', (select count(*)::int from public.challenge_results rr where rr.challenge_id = c.id)
             ) order by c.end_at desc)
        from public.challenge_results r
        join public.challenges c on c.id = r.challenge_id
        left join public.squads s on s.id = c.squad_id
       where r.user_id = v_uid and c.state in ('COMPLETED', 'ARCHIVED')
    ), '[]'::jsonb),

    'stats', (
      select jsonb_build_object(
               'entered', count(*)::int,
               'wins',    count(*) filter (where r.is_winner)::int,
               'podiums', count(*) filter (where r.place <= 3)::int,
               'fav_type', (
                 select c2.type from public.challenge_results r2
                   join public.challenges c2 on c2.id = r2.challenge_id
                  where r2.user_id = v_uid
                  group by c2.type order by count(*) desc, c2.type limit 1
               )
             )
        from public.challenge_results r
        join public.challenges c on c.id = r.challenge_id
       where r.user_id = v_uid and c.state in ('COMPLETED', 'ARCHIVED')
    )
  );
end;
$$;
