-- Forge Legacy — 0063: progression metrics — "biggest improvement on squat"
--
-- A progression challenge scores the CHANGE in a metric, not its total: your best during the challenge
-- minus your best over an equal-length window immediately before it. Whoever improves most wins.
--
--   GAIN_MAX_LIFT   + 'barbell-back-squat'  → Biggest Squat Gain
--   GAIN_VOLUME     + exercise              → Biggest Volume Gain
--   GAIN_REPS       + exercise              → Biggest Rep Gain
--   GAIN_DISTANCE   + activity              → Biggest Distance Gain
--
-- ABSOLUTE GAIN, NOT PERCENTAGE — a product decision, not a shortcut. Percentage improvement is
-- unwinnable-by-design for anyone with a real baseline: an athlete who has never squatted starts at
-- zero, so their first session is an infinite improvement and they take every progression challenge by
-- existing. Absolute gain (+40 lb is +40 lb) cannot be farmed by starting low. It does quietly favour
-- stronger athletes, which is the accepted trade — and the fairness metrics in 0062 exist precisely so
-- that isn't the only kind of competition available.
--
-- FLOORED AT ZERO. `greatest(0, after - before)` — an athlete who had a worse window scores 0, never a
-- negative. CS-D3: standings are positive-framed, and "-15 lb" on a leaderboard is exactly the failure
-- marker the anti-shame rules forbid.
--
-- STRUCTURE. Computing one metric over two windows meant the ten-branch CASE had to stop being welded
-- to the challenge's own dates. `metric_over()` now owns the calculation for an arbitrary window, and
-- `challenge_score()` becomes a thin caller: once for a total, twice for a gain. Ten branches stayed
-- one implementation instead of becoming twenty.
--
-- Depends on 0062. Idempotent. RUN AFTER 0062.

alter table public.challenges drop constraint if exists challenges_type_check;
alter table public.challenges add constraint challenges_type_check
  check (type in (
    'MOST_WORKOUTS', 'MOST_VOLUME', 'MAX_LIFT', 'MOST_DURATION', 'MOST_PRS', 'DISTANCE_TOTAL',
    'MOST_DAYS', 'MOST_REPS', 'EARLY_BIRD', 'MOST_VARIETY',
    'GAIN_MAX_LIFT', 'GAIN_VOLUME', 'GAIN_REPS', 'GAIN_DISTANCE'
  ));

-- ── One metric, any window ────────────────────────────────────────────────────
create or replace function public.metric_over(
  p_kind text,
  p_user uuid,
  p_from timestamptz,
  p_to   timestamptz,
  p_key  text,
  p_tz   text
)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select case p_kind
    when 'MOST_WORKOUTS' then coalesce((
      select count(*) from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= p_from and w.saved_at < p_to
         and (p_key is null or w.activity_type::text = p_key)), 0)

    when 'MOST_VOLUME' then coalesce((
      select sum(ws.weight * ws.reps)
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= p_from and w.saved_at < p_to
         and (p_key is null or we.catalog_key = p_key)), 0)

    when 'MAX_LIFT' then coalesce((
      select max(ws.weight)
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= p_from and w.saved_at < p_to
         and (p_key is null or we.catalog_key = p_key)), 0)

    when 'MOST_DURATION' then coalesce((
      select sum(w.duration_sec) from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= p_from and w.saved_at < p_to
         and (p_key is null or w.activity_type::text = p_key)), 0) / 3600.0

    when 'DISTANCE_TOTAL' then coalesce((
      select sum(w.distance) from public.workouts w
       where w.athlete_id = p_user and w.distance is not null
         and w.saved_at >= p_from and w.saved_at < p_to
         and (p_key is null or w.activity_type::text = p_key)), 0)

    when 'MOST_PRS' then coalesce((
      select count(*) from public.personal_records pr
       where pr.athlete_id = p_user
         and pr.achieved_on >= p_from::date and pr.achieved_on < p_to::date), 0)

    when 'MOST_DAYS' then coalesce((
      select count(distinct (w.saved_at at time zone p_tz)::date)
        from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= p_from and w.saved_at < p_to
         and (p_key is null or w.activity_type::text = p_key)), 0)

    when 'MOST_REPS' then coalesce((
      select sum(ws.reps)
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= p_from and w.saved_at < p_to
         and ws.reps is not null
         and (p_key is null or we.catalog_key = p_key)), 0)

    when 'EARLY_BIRD' then coalesce((
      select count(*) from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= p_from and w.saved_at < p_to
         and extract(hour from (w.saved_at at time zone p_tz)) < 7), 0)

    when 'MOST_VARIETY' then coalesce((
      select count(distinct coalesce(we.catalog_key, we.name))
        from public.workout_exercises we
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= p_from and w.saved_at < p_to), 0)

    else 0
  end;
$$;

-- ── Score = a total, or a difference between two ──────────────────────────────
create or replace function public.challenge_score(p_challenge uuid, p_user uuid)
returns numeric
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  c      public.challenges%rowtype;
  k      text;
  tz     text;
  base   text;
  before numeric;
  after  numeric;
begin
  select * into c from public.challenges where id = p_challenge;
  if not found then
    return 0;
  end if;

  k  := nullif(btrim(coalesce(c.metric_key, '')), '');
  tz := coalesce(nullif(btrim(c.tz), ''), 'UTC');
  begin
    perform now() at time zone tz;
  exception when others then
    tz := 'UTC';
  end;

  base := case c.type
    when 'GAIN_MAX_LIFT' then 'MAX_LIFT'
    when 'GAIN_VOLUME'   then 'MOST_VOLUME'
    when 'GAIN_REPS'     then 'MOST_REPS'
    when 'GAIN_DISTANCE' then 'DISTANCE_TOTAL'
    else null
  end;

  if base is null then
    return public.metric_over(c.type, p_user, c.start_at, c.end_at, k, tz);
  end if;

  -- The baseline window is the same length, immediately before the challenge — so a 4-week challenge
  -- is measured against your previous 4 weeks, not an arbitrary lookback.
  before := public.metric_over(base, p_user, c.start_at - (c.end_at - c.start_at), c.start_at, k, tz);
  after  := public.metric_over(base, p_user, c.start_at, c.end_at, k, tz);
  return greatest(0, coalesce(after, 0) - coalesce(before, 0));
end;
$$;

-- ── Baseline, for the standings screen to show ────────────────────────────────
-- What you were at before this started. Null for a non-progression challenge — there is no "before".
create or replace function public.challenge_baseline(p_challenge uuid, p_user uuid)
returns numeric
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  c    public.challenges%rowtype;
  base text;
  tz   text;
begin
  select * into c from public.challenges where id = p_challenge;
  if not found then
    return null;
  end if;

  base := case c.type
    when 'GAIN_MAX_LIFT' then 'MAX_LIFT'
    when 'GAIN_VOLUME'   then 'MOST_VOLUME'
    when 'GAIN_REPS'     then 'MOST_REPS'
    when 'GAIN_DISTANCE' then 'DISTANCE_TOTAL'
    else null
  end;
  if base is null then
    return null;
  end if;

  tz := coalesce(nullif(btrim(c.tz), ''), 'UTC');
  begin
    perform now() at time zone tz;
  exception when others then
    tz := 'UTC';
  end;

  return public.metric_over(
    base, p_user,
    c.start_at - (c.end_at - c.start_at), c.start_at,
    nullif(btrim(coalesce(c.metric_key, '')), ''), tz
  );
end;
$$;
