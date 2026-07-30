-- Forge Legacy — convenience bundle: challenge migrations 0061 → 0065, in dependency order.
--
-- NOT a new migration. Every statement below is already numbered in supabase/migrations/; this file
-- exists only so the whole outstanding chain can be pasted into the Supabase SQL editor in one go.
--
-- SAFE TO RE-RUN, including any part already applied: every column add is `if not exists`, every
-- constraint is dropped before being re-added, and every function is `create or replace`. None of these
-- are set-returning, so there is no 42P13 return-type collision to work around.
--
-- Ends with a PostgREST schema-cache reload. Without it, a freshly added column can still report
-- "Could not find the 'tz' column of 'challenges' in the schema cache (PGRST204)" from the client even
-- though the column is really there — the API layer caches the schema and does not always notice a DDL
-- change immediately.

-- ============================================================================
-- 0061_challenge_metric_key.sql
-- ============================================================================

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

-- ============================================================================
-- 0062_challenge_fair_metrics.sql
-- ============================================================================

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

-- ============================================================================
-- 0063_challenge_progression.sql
-- ============================================================================

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

-- ============================================================================
-- 0064_challenge_detail.sql
-- ============================================================================

-- Forge Legacy — 0064: the standings read (C-3)
--
-- `Forge Challenge.dc.html` is the destination for every competition tap in the app, and in the design
-- every number on it is a typed literal: `yourRank: '2nd'`, `raceLine: 'Marcus leads by 2 workouts'`,
-- `yourScore: '5'`. They happen to agree with the seed roster, but nothing computes them — change one
-- seed and the summary silently lies. This is the read that makes them true.
--
-- TIES ARE HANDLED. The design gives two athletes on 4 workouts ranks 3 and 4 purely from array order,
-- and hands the third-place treatment to whichever sorted first. `rank()` shares the place, and the
-- screen marks it — a tie that renders as a clean 3rd/4th is a wrong answer, not a tidy one.
--
-- MOMENTUM IS POSITIVE-ONLY (CS-D3). The design carries a `stale` flag that greys out athletes who have
-- gone quiet, which is a soft failure marker on a leaderboard. What's returned instead is `recent` —
-- what you've added in the last 7 days — and the screen shows it only when it's above zero. Nobody is
-- ever annotated for absence; they simply have nothing extra next to their name.
--
-- Reuses `metric_over()` (0063) for the recent window, so "this week" is scored by exactly the same
-- rules as the challenge itself.
--
-- Depends on 0063. Idempotent. RUN AFTER 0063.

create or replace function public.challenge_detail(p_challenge uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.challenges%rowtype;
  tz    text;
  k     text;
begin
  if v_uid is null or not public.can_read_challenge(p_challenge, v_uid) then
    return null;
  end if;

  select * into c from public.challenges where id = p_challenge;
  if not found then
    return null;
  end if;

  k  := nullif(btrim(coalesce(c.metric_key, '')), '');
  tz := coalesce(nullif(btrim(c.tz), ''), 'UTC');
  begin
    perform now() at time zone tz;
  exception when others then
    tz := 'UTC';
  end;

  return jsonb_build_object(
    'id',          c.id,
    'name',        c.name,
    'description', c.description,
    'type',        c.type,
    'metric_key',  c.metric_key,
    'context',     c.context,
    'state',       c.state,
    'start_at',    c.start_at,
    'end_at',      c.end_at,
    'squad_id',    c.squad_id,
    'squad_name',  (select s.name from public.squads s where s.id = c.squad_id),
    'is_creator',  c.creator_id = v_uid,
    'i_joined',    exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = v_uid),

    'standings', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'user_id',     t.user_id,
                 'name',        t.name,
                 'avatar_url',  t.avatar_url,
                 'score',       t.score,
                 'place',       t.place,
                 -- Marked so the screen can say "T-3" rather than inventing an order between equals.
                 'tied',        t.tied,
                 'is_self',     t.user_id = v_uid,
                 'logged_today',t.logged_today,
                 'recent',      t.recent
               ) order by t.place, t.name)
        from (
          select
            cp.user_id,
            coalesce(p.name, 'Athlete') as name,
            p.avatar_url,
            public.challenge_score(c.id, cp.user_id) as score,
            rank() over (order by public.challenge_score(c.id, cp.user_id) desc) as place,
            count(*) over (partition by public.challenge_score(c.id, cp.user_id)) > 1 as tied,
            exists (
              select 1 from public.workouts w
               where w.athlete_id = cp.user_id
                 and (w.saved_at at time zone tz)::date = (now() at time zone tz)::date
            ) as logged_today,
            -- What they've added in the last 7 days, scored the same way the challenge is.
            public.metric_over(
              case c.type
                when 'GAIN_MAX_LIFT' then 'MAX_LIFT'
                when 'GAIN_VOLUME'   then 'MOST_VOLUME'
                when 'GAIN_REPS'     then 'MOST_REPS'
                when 'GAIN_DISTANCE' then 'DISTANCE_TOTAL'
                else c.type
              end,
              cp.user_id,
              greatest(c.start_at, now() - interval '7 days'),
              least(c.end_at, now()),
              k, tz
            ) as recent
          from public.challenge_participants cp
          join public.profiles p on p.id = cp.user_id
         where cp.challenge_id = c.id
        ) t
    ), '[]'::jsonb)
  );
end;
$$;

-- ============================================================================
-- 0065_challenge_results.sql
-- ============================================================================

-- Forge Legacy — 0065: the frozen result (C-4)
--
-- C-3 computes a live leaderboard. C-4 must NOT: `Challenge-Results-Wireframe-Spec-C4` §8 and CS-D17
-- make the result immutable — "later imported history never alters them". So every standing here is
-- read from `challenge_results`, the row set `advance_challenges()` wrote once at completion, and never
-- from `challenge_score()`. If an athlete backfills a workout into a closed season next month, this
-- screen does not move. That is the whole point of the table.
--
-- CO-WINNERS ARE FIRST-CLASS (CS-D15). `challenge_results.place` comes from `rank()`, so a tie at the
-- top produces several rows at place 1, each with `is_winner`. The design renders `FINAL[0]` — one
-- champion, always — which would silently drop a co-champion from their own victory. `winners` is an
-- array here, and the screen is built to render more than one.
--
-- CANCELLED NEVER REACHES C-4 (§8). A cancelled challenge has no result, and returning null for any
-- state outside COMPLETED/ARCHIVED enforces that in the database rather than trusting the caller.
--
-- WHAT IS NOT HERE, DELIBERATELY:
--   · No honor rows. `Honor-Catalog-Amendment-001`'s ChallengeEvaluator and HonorInstance do not exist
--     in this schema yet, so there is nothing truthful to return. The design names a specific earned
--     honor ("Forge League — Silver", "Added to your Legacy · tap to view"); shipping that against an
--     unbuilt Honors backend would be a claim the app cannot honour.
--   · No streak comparison. §6.3 is explicit: participation streaks are personal stats feeding honors,
--     with "no squad-surface streak comparison (Firewall)". The design's "Longest Streak" card is
--     precisely that surface, so it is not computed and not returned.
--
-- Depends on 0063 (metric_over) + 0059 (challenge_results). Idempotent. RUN AFTER 0064.

create or replace function public.challenge_results_detail(p_challenge uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  c       public.challenges%rowtype;
  tz      text;
  k       text;
  v_mid   timestamptz;
  v_base  text;
  v_gain  boolean;
  v_field int;
begin
  if v_uid is null or not public.can_read_challenge(p_challenge, v_uid) then
    return null;
  end if;

  select * into c from public.challenges where id = p_challenge;
  -- A season that never closed has no final standings to show.
  if not found or c.state not in ('COMPLETED', 'ARCHIVED') then
    return null;
  end if;

  k  := nullif(btrim(coalesce(c.metric_key, '')), '');
  tz := coalesce(nullif(btrim(c.tz), ''), 'UTC');
  begin
    perform now() at time zone tz;
  exception when others then
    tz := 'UTC';
  end;

  v_base := case c.type
    when 'GAIN_MAX_LIFT' then 'MAX_LIFT'
    when 'GAIN_VOLUME'   then 'MOST_VOLUME'
    when 'GAIN_REPS'     then 'MOST_REPS'
    when 'GAIN_DISTANCE' then 'DISTANCE_TOTAL'
    else c.type
  end;
  v_gain := v_base <> c.type;
  v_mid  := c.start_at + (c.end_at - c.start_at) / 2;

  select count(*) into v_field from public.challenge_results r where r.challenge_id = c.id;

  return jsonb_build_object(
    'id', c.id, 'name', c.name, 'description', c.description,
    'type', c.type, 'metric_key', c.metric_key, 'context', c.context, 'state', c.state,
    'start_at', c.start_at, 'end_at', c.end_at,
    'squad_id', c.squad_id,
    'squad_name', (select s.name from public.squads s where s.id = c.squad_id),
    'field', v_field,

    -- ── Final standings — frozen, everyone, ranked (§5: no truncation, no withdrawals) ──
    'standings', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'user_id', t.user_id, 'name', t.name, 'avatar_url', t.avatar_url,
                 'score', t.score, 'place', t.place, 'is_winner', t.is_winner,
                 'tied', t.shared > 1, 'is_self', t.user_id = v_uid
               ) order by t.place, t.name)
        from (
          select r.user_id,
                 coalesce(p.name, 'Athlete') as name,
                 p.avatar_url, r.score, r.place, r.is_winner,
                 count(*) over (partition by r.place) as shared
            from public.challenge_results r
            join public.profiles p on p.id = r.user_id
           where r.challenge_id = c.id
        ) t
    ), '[]'::jsonb),

    -- CS-D15: every athlete at place 1, not just the first one sorted.
    'winners', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', r.user_id, 'name', coalesce(p.name, 'Athlete'),
               'avatar_url', p.avatar_url, 'score', r.score) order by coalesce(p.name, 'Athlete'))
        from public.challenge_results r
        join public.profiles p on p.id = r.user_id
       where r.challenge_id = c.id and r.is_winner
    ), '[]'::jsonb),

    -- ── The season, in aggregate. Every figure below is counted, none estimated. ──
    'summary', jsonb_build_object(
      -- Summing personal bests would be meaningless, so a max-lift field reports its best single lift.
      'total', case when c.type in ('MAX_LIFT', 'GAIN_MAX_LIFT')
        then (select coalesce(max(r.score), 0) from public.challenge_results r where r.challenge_id = c.id)
        else (select coalesce(sum(r.score), 0) from public.challenge_results r where r.challenge_id = c.id)
      end,
      'athletes', v_field,
      'prs', (
        select count(*) from public.personal_records pr
         where pr.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
           and pr.achieved_on >= c.start_at::date and pr.achieved_on < c.end_at::date
      ),
      -- Athlete-days: one athlete training on ten days contributes ten. A field-level total, never a
      -- per-athlete comparison, so §6.3's Firewall line is not crossed.
      'athlete_days', (
        select count(*) from (
          select distinct w.athlete_id, (w.saved_at at time zone tz)::date as d
            from public.workouts w
           where w.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
             and w.saved_at >= c.start_at and w.saved_at < c.end_at
        ) x
      )
    ),

    -- ── Derived badges (§6.1, CC-D4: squad-scoped, positive only) ──
    -- Both are earned distinctions, computed at read time and never stored. Either can be absent when
    -- there is no honest answer — an unanimated season simply shows no badges.
    'badges', (
      select coalesce(jsonb_agg(b.obj), '[]'::jsonb) from (

        -- Most days trained during the season. Requires more than one day, so a one-session field
        -- doesn't crown somebody for showing up once.
        select jsonb_build_object(
                 'kind', 'MOST_CONSISTENT', 'user_id', t.user_id,
                 'name', coalesce(p.name, 'Athlete'), 'value', t.days) as obj
          from (
            select w.athlete_id as user_id,
                   count(distinct (w.saved_at at time zone tz)::date) as days
              from public.workouts w
             where w.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
               and w.saved_at >= c.start_at and w.saved_at < c.end_at
             group by w.athlete_id
             order by days desc, w.athlete_id
             limit 1
          ) t
          join public.profiles p on p.id = t.user_id
         where t.days > 1

        union all

        -- Biggest climb from the halfway standings to the final ones. Positive by construction: the
        -- `>= 1` filter means only a rise is ever reported, never a slide.
        select jsonb_build_object(
                 'kind', 'BIGGEST_CLIMB', 'user_id', m.user_id,
                 'name', coalesce(p.name, 'Athlete'), 'value', m.climb) as obj
          from (
            select r.user_id, (mid.mp - r.place) as climb
              from public.challenge_results r
              join (
                select r2.user_id,
                       rank() over (order by
                         case when v_gain then greatest(0,
                           public.metric_over(v_base, r2.user_id, c.start_at, v_mid, k, tz)
                           - public.metric_over(v_base, r2.user_id, c.start_at - (v_mid - c.start_at), c.start_at, k, tz))
                         else public.metric_over(v_base, r2.user_id, c.start_at, v_mid, k, tz) end
                       desc) as mp
                  from public.challenge_results r2
                 where r2.challenge_id = c.id
              ) mid on mid.user_id = r.user_id
             where r.challenge_id = c.id
             order by climb desc, r.place
             limit 1
          ) m
          join public.profiles p on p.id = m.user_id
         where m.climb >= 1
      ) b
    )
  );
end;
$$;

-- Tell PostgREST to re-read the schema, so the new columns are visible to the client at once.
notify pgrst, 'reload schema';
