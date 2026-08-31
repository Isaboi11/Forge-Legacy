-- Forge Legacy — 0183: what a coach may read, and the one line that decides it
--
-- ══ WHAT THIS OPENS ══
--
-- 0182 built the relationship. This is the first migration that reads an athlete's actual training,
-- and it is therefore the most dangerous file in the Forge Coach build.
--
-- ⚠ EVERY FUNCTION HERE IS `SECURITY DEFINER` AND TAKES AN ATHLETE ID. That is precisely the shape
-- 0120 documents as a footgun — `notification_events_for(uuid)` left callable would have handed any
-- athlete anyone else's notifications, and its header says "that safety came from the missing
-- parameter, not from RLS." Here the parameter cannot be missing, because a coach reads a NAMED
-- client. So the safety has to come from somewhere else, and there is exactly one place it comes
-- from:
--
--        perform public.trainer_client_guard(p_athlete);
--
-- **That line is the first statement of every function in this file.** It raises 42501 unless the
-- caller holds a live seat AND the athlete has an active `trainer_clients` row with them. Delete it
-- from any one of these and that function hands a stranger a named athlete's body. There is a test
-- (`src/app/__tests__/trainer-reads-guard.test.mjs`) whose entire job is to assert it is still there
-- and still first.
--
-- ══ WHY THE GUARD IS ENOUGH, AND WHY RLS IS NOT ══
--
-- `body_entries`, `workouts`, `workout_sets` and `program_sessions` are all owner-scoped to
-- `athlete_id = auth.uid()`. A definer function runs as the table owner and is not subject to RLS, so
-- these functions can see everything — by design, because there is no other way for a coach to read a
-- client at all. RLS protects the athlete from every OTHER caller; the guard protects them from this
-- one. FC-D4: consent, not privilege.
--
-- Revocation needs no cache invalidation and no session expiry. `athlete_revoke_coach()` flips one
-- row, and the coach's very next call raises.
--
-- ══ ⛔ WHAT IS DELIBERATELY ABSENT: PHOTOS ══
--
-- The design's client profile leads with a then/now physique comparison, and it is NOT in this file.
-- FC-D16: all seven storage buckets are `public: true` and `createSignedUrl` appears nowhere in the
-- repo, so a row-level grant would be theatre — the object is readable by anyone holding the URL,
-- forever, whether or not this migration exists. **No physique photo reaches a coach until private
-- buckets and signed URLs land.** A `trainer_client_photos()` here would have been the single most
-- damaging function in the product.
--
-- ══ THREE THINGS THAT ARE EASY TO GET WRONG, AND ARE GOT RIGHT HERE ══
--
-- 1. **Weights are NOT unit-normalised.** `workout_sets.weight_unit` exists per row and the app has
--    always stored what the athlete typed. `trainer_client_lifts` returns the unit ALONGSIDE the
--    weight and converts nothing. Summing or comparing these without reading the unit is a bug, and
--    doing that conversion down here would bake it into the database.
-- 2. **A skip is not a completion, and "touched" is not adherence.** `program_sessions.state` is
--    'completed' or 'skipped'. `trainer_client_adherence` returns the two counts SEPARATELY and never
--    a combined figure, because a single "touched" number reads as adherence while counting the weeks
--    she gave up.
-- 3. **`week_index` is a PROGRAM week, not a calendar week.** It is the index into the structure, so
--    two program weeks can fall in one calendar month, or one program week can span a holiday.
--
-- ══ INVITED IS NOT ACTIVE ══
--
-- `trainer_roster()` returns training data and is scoped to `status = 'active'`. Pending invitations
-- come back from `trainer_invitations()`, which returns a handle and a date and nothing else. They are
-- two functions rather than one with a status column on purpose: a single query mixing both would put
-- a `case when status = 'active'` between a coach and somebody who has not answered yet, and that is
-- one edit away from leaking.
--
-- Idempotent. Depends on 0001 (workouts/sets), 0013+0017 (programs), 0028 (body_entries),
-- 0119 (program_sessions), 0182 (the guard). RUN AFTER 0182.

-- ── The roster: the coach's own clients ──────────────────────────────────────
--
-- Guarded by `trainer_guard()` rather than the per-client guard, because the query is already scoped
-- to relationships where the CALLER is the trainer and the status is active. There is no athlete id
-- to pass and no way to widen it.
create or replace function public.trainer_roster()
returns table (
  athlete_id      uuid,
  handle          text,
  display_name    text,
  coaching_since  timestamptz,
  program_id      uuid,
  program_name    text,
  program_state   text,
  program_started timestamptz,
  sessions_done   bigint,
  sessions_skipped bigint,
  last_workout_at timestamptz,
  last_weigh_in   date
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.trainer_guard();

  return query
    select
      tc.athlete_id,
      p.handle::text,
      coalesce(p.first_name, p.name)::text,
      tc.accepted_at,
      prog.id,
      prog.name,
      prog.state::text,
      prog.started_at,
      coalesce(tally.done, 0),
      coalesce(tally.skipped, 0),
      (select max(w.saved_at) from public.workouts w
        where w.athlete_id = tc.athlete_id and w.state = 'saved'),
      (select max(b.logged_on) from public.body_entries b
        where b.athlete_id = tc.athlete_id)
    from public.trainer_clients tc
    join public.profiles p on p.id = tc.athlete_id
    -- At most one active program per athlete (Program-Architecture-Amendment-001), but ordered and
    -- limited anyway: a lateral that can return two rows silently doubles the roster.
    left join lateral (
      select pr.id, pr.name, pr.state, pr.started_at
      from public.programs pr
      where pr.athlete_id = tc.athlete_id and pr.state = 'active'
      order by pr.started_at desc nulls last
      limit 1
    ) prog on true
    left join lateral (
      select
        count(*) filter (where ps.state = 'completed') as done,
        count(*) filter (where ps.state = 'skipped')   as skipped
      from public.program_sessions ps
      where ps.program_id = prog.id
    ) tally on true
    where tc.trainer_id = auth.uid()
      and tc.status = 'active'
    order by coalesce(p.first_name, p.name);
end;
$$;

comment on function public.trainer_roster() is
  'FC-D4. The coach''s active clients and a one-line summary of each. Scoped to trainer_id = auth.uid() and status = active, so there is no athlete id to pass and no way to widen it. Returns done and skipped SEPARATELY — a combined "touched" figure reads as adherence while counting the weeks she gave up.';

-- ── Pending invitations: a handle and a date, and nothing else ───────────────
create or replace function public.trainer_invitations()
returns table (
  invite_id  uuid,
  athlete_id uuid,
  handle     text,
  invited_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.trainer_guard();

  return query
    select tc.id, tc.athlete_id, p.handle::text, tc.invited_at
    from public.trainer_clients tc
    join public.profiles p on p.id = tc.athlete_id
    where tc.trainer_id = auth.uid()
      and tc.status = 'invited'
    order by tc.invited_at desc;
end;
$$;

comment on function public.trainer_invitations() is
  'Pending invitations only. Returns a handle and a date and NO training data — separate from trainer_roster() on purpose, so that no conditional stands between a coach and somebody who has not answered yet.';

-- ── The body log ─────────────────────────────────────────────────────────────
create or replace function public.trainer_client_body(p_athlete uuid, p_since date default null)
returns table (
  logged_on date,
  weight_lb numeric,
  waist_in  numeric,
  chest_in  numeric,
  arm_in    numeric
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.trainer_client_guard(p_athlete);

  return query
    select b.logged_on, b.weight_lb, b.waist_in, b.chest_in, b.arm_in
    from public.body_entries b
    where b.athlete_id = p_athlete
      and (p_since is null or b.logged_on >= p_since)
    order by b.logged_on;
end;
$$;

comment on function public.trainer_client_body(uuid, date) is
  'Weight and measurements over time, oldest first. ⚠ Only 3 of the design''s 7 measurement sites exist — hips, thigh, calf and neck have zero occurrences repo-wide (see Forge-Coach-Architecture §3.9). ⚠ body_entries.weight_lb is NOT NULL, so a measurement cannot be logged without a weight.';

-- ── The lifts ────────────────────────────────────────────────────────────────
--
-- One row per lift per DAY TRAINED: the heaviest set, the reps at that weight, and how many sets were
-- worked. Lift identity is `coalesce(catalog_key, name)`, matching `lift-history-live.ts` — rows
-- written before 0078 added `catalog_key` carry only a name.
create or replace function public.trainer_client_lifts(p_athlete uuid, p_since date default null)
returns table (
  lift_key     text,
  lift_name    text,
  trained_on   date,
  top_weight   numeric,
  weight_unit  text,
  top_reps     integer,
  working_sets bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.trainer_client_guard(p_athlete);

  return query
    with sets as (
      select
        coalesce(we.catalog_key, we.name)   as k,
        we.name                             as nm,
        (w.saved_at at time zone 'UTC')::date as d,
        ws.weight,
        ws.weight_unit                      as unit,
        ws.reps
      from public.workouts w
      join public.workout_exercises we on we.workout_id = w.id
      join public.workout_sets ws      on ws.workout_exercise_id = we.id
      where w.athlete_id = p_athlete
        and w.state = 'saved'
        and w.saved_at is not null
        and (p_since is null or (w.saved_at at time zone 'UTC')::date >= p_since)
        and ws.weight is not null
    ),
    ranked as (
      select s.*, row_number() over (partition by s.k, s.d order by s.weight desc, s.reps desc) as rn
      from sets s
    )
    select
      r.k, r.nm, r.d, r.weight, r.unit, r.reps,
      (select count(*) from sets s2 where s2.k = r.k and s2.d = r.d)
    from ranked r
    where r.rn = 1
    order by r.k, r.d;
end;
$$;

comment on function public.trainer_client_lifts(uuid, date) is
  '⚠ WEIGHTS ARE NOT UNIT-NORMALISED. weight_unit is returned per row and NOTHING is converted here — the app stores what the athlete typed, and a conversion in SQL would bake the assumption into the database. Any caller that sums or compares these must read the unit. One row per lift per day trained (the heaviest set and its reps); "reps at a fixed load" is a different query over the same sets and is deliberately not this one.';

-- ── Adherence ────────────────────────────────────────────────────────────────
create or replace function public.trainer_client_adherence(p_athlete uuid)
returns table (
  program_id       uuid,
  program_name     text,
  program_state    text,
  started_at       timestamptz,
  sessions_done    bigint,
  sessions_skipped bigint,
  weeks_touched    bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.trainer_client_guard(p_athlete);

  return query
    select
      pr.id, pr.name, pr.state::text, pr.started_at,
      count(*) filter (where ps.state = 'completed'),
      count(*) filter (where ps.state = 'skipped'),
      count(distinct ps.week_index)
    from public.programs pr
    left join public.program_sessions ps on ps.program_id = pr.id
    where pr.athlete_id = p_athlete
      and pr.state = 'active'
    group by pr.id, pr.name, pr.state, pr.started_at
    order by pr.started_at desc nulls last
    limit 1;
end;
$$;

comment on function public.trainer_client_adherence(uuid) is
  '⚠ done and skipped are returned SEPARATELY and there is no combined figure, because a "touched" count reads as adherence while counting the weeks she gave up. ⚠ week_index is a PROGRAM week, not a calendar week — two program weeks can fall in one month. Returns at most one row: the active program (Program-Architecture-Amendment-001 allows only one).';

-- ── Recent sessions ──────────────────────────────────────────────────────────
create or replace function public.trainer_client_sessions(p_athlete uuid, p_limit int default 30)
returns table (
  workout_id    uuid,
  saved_at      timestamptz,
  workout_name  text,
  activity_type text,
  duration_sec  integer,
  exercises     bigint,
  sets_logged   bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.trainer_client_guard(p_athlete);

  return query
    select
      w.id, w.saved_at, w.workout_name, w.activity_type::text, w.duration_sec,
      count(distinct we.id),
      count(ws.id)
    from public.workouts w
    left join public.workout_exercises we on we.workout_id = w.id
    left join public.workout_sets ws      on ws.workout_exercise_id = we.id
    where w.athlete_id = p_athlete
      and w.state = 'saved'
    group by w.id, w.saved_at, w.workout_name, w.activity_type, w.duration_sec
    order by w.saved_at desc nulls last
    limit greatest(1, least(coalesce(p_limit, 30), 200));
end;
$$;

comment on function public.trainer_client_sessions(uuid, int) is
  'Recent saved workouts, newest first. p_limit is clamped to 1..200 in the function rather than trusted from the caller — an unbounded limit on a definer function is a denial-of-service the RLS layer cannot see.';

-- ── Grants ───────────────────────────────────────────────────────────────────
--
-- ⚠ Revoke FROM PUBLIC, never from `authenticated` (0120, restated in 0129). Every function below is
-- safe to grant ONLY because its first statement is a guard that raises.
grant execute on function public.trainer_roster()                            to authenticated;
grant execute on function public.trainer_invitations()                       to authenticated;
grant execute on function public.trainer_client_body(uuid, date)             to authenticated;
grant execute on function public.trainer_client_lifts(uuid, date)            to authenticated;
grant execute on function public.trainer_client_adherence(uuid)              to authenticated;
grant execute on function public.trainer_client_sessions(uuid, int)          to authenticated;
