-- Forge Legacy — 0062: four metrics a different person can win
--
-- Every metric shipped so far — Most Volume, Max Lift, Most Workouts — rewards the biggest, strongest,
-- most available athlete. In a mixed squad the leaderboard is decided before it starts, which is the
-- outcome CS-D3's anti-shame rules exist to prevent. These four are chosen because the winner is
-- usually somebody else:
--
--   MOST_DAYS      Distinct days trained. Discipline over intensity — and counting DAYS rather than
--                  sessions quietly closes the double-logging loophole MOST_WORKOUTS has.
--   MOST_REPS      Total reps, weight ignored entirely. Bodyweight work competes with barbell work.
--   EARLY_BIRD     Sessions started before 7am. Pure identity; no strength component at all.
--   MOST_VARIETY   Distinct exercises used. Rewards curiosity, not output.
--
-- TIMEZONE. MOST_DAYS and EARLY_BIRD both need a day boundary and a wall-clock hour, and the database
-- runs in UTC — so "before 7am" would mean 7am UTC, which is 7am for almost nobody. Each challenge now
-- carries the `tz` its creator was in, and both metrics are computed against that. A squad trains in
-- roughly one place; the creator's zone is the closest honest answer available without asking every
-- participant. Existing challenges default to UTC, which is what they were already implicitly using.
--
-- NOT IN CS-D9. These four (and DISTANCE_TOTAL from 0061) extend the locked metric table and owe it an
-- amendment. Recorded in the Decision Queue rather than slipped in.
--
-- Depends on 0061. Idempotent. RUN AFTER 0061.

alter table public.challenges add column if not exists tz text not null default 'UTC';
comment on column public.challenges.tz is
  'IANA zone the creator was in. Day boundaries and wall-clock hours (MOST_DAYS, EARLY_BIRD) resolve here, not UTC.';

alter table public.challenges drop constraint if exists challenges_type_check;
alter table public.challenges add constraint challenges_type_check
  check (type in (
    'MOST_WORKOUTS', 'MOST_VOLUME', 'MAX_LIFT', 'MOST_DURATION', 'MOST_PRS', 'DISTANCE_TOTAL',
    'MOST_DAYS', 'MOST_REPS', 'EARLY_BIRD', 'MOST_VARIETY'
  ));

create or replace function public.challenge_score(p_challenge uuid, p_user uuid)
returns numeric
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  c  public.challenges%rowtype;
  k  text;
  tz text;
begin
  select * into c from public.challenges where id = p_challenge;
  if not found then
    return 0;
  end if;
  k  := nullif(btrim(coalesce(c.metric_key, '')), '');
  -- A bad zone must not take the whole leaderboard down with it.
  tz := coalesce(nullif(btrim(c.tz), ''), 'UTC');
  begin
    perform now() at time zone tz;
  exception when others then
    tz := 'UTC';
  end;

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

    -- Distinct DAYS, in the challenge's own zone. Two sessions on one day is one day.
    when 'MOST_DAYS' then coalesce((
      select count(distinct (w.saved_at at time zone tz)::date)
        from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at
         and (k is null or w.activity_type::text = k)), 0)

    -- Weight is deliberately absent: a bodyweight set counts the same as a loaded one.
    when 'MOST_REPS' then coalesce((
      select sum(ws.reps)
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at
         and ws.reps is not null
         and (k is null or we.catalog_key = k)), 0)

    when 'EARLY_BIRD' then coalesce((
      select count(*) from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at
         and extract(hour from (w.saved_at at time zone tz)) < 7), 0)

    -- coalesce to the name so a custom exercise (no catalog_key) still counts as its own thing.
    when 'MOST_VARIETY' then coalesce((
      select count(distinct coalesce(we.catalog_key, we.name))
        from public.workout_exercises we
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at), 0)

    else 0
  end;
end;
$$;
