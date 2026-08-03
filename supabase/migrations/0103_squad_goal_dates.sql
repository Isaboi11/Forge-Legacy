-- 0103 · Squad goals get a start date you can choose and an end date at all
--
-- ── WHAT WAS ALREADY HERE ───────────────────────────────────────────────────
-- `squads.goal_started_at` has existed since 0031 ("progress counts from here")
-- and `squad_metric_sum` has always windowed on it:
--     and w.saved_at >= coalesce(p_started_at, '-infinity')
-- It was simply never exposed — `setSquadGoal` stamped `now()` and nobody could
-- choose otherwise. Backdating a goal to the 1st of the month has therefore
-- worked at the database level all along. This migration adds the other end.
--
-- ── THE ONE DESIGN CONSTRAINT ───────────────────────────────────────────────
-- SQ-D3 (LOCKED) closes a goal two ways: completing it, or a member cancelling
-- it. A deadline invents a third — it ran out of time — and SQ-D3.5 plus the
-- anti-shame guardrails (CC-D3, SA-D4: "non-participation is never shown as
-- failure") forbid rendering that as a miss. PO ruling: an expired goal CLOSES
-- and REPORTS WHAT WAS DONE ("312 workouts logged in March"), never the shortfall.
--
-- That needs NO storage and no new closure machinery. `archive_squad_goal`
-- already banks a completion row ONLY when the target was actually met, which is
-- what keeps the two honor evaluators that do `count(*) from
-- squad_goal_completions` (0099, 0100) honest. An expired-unmet goal writes
-- nothing there and must not — expiry is derived at read time from a frozen sum.
--
-- ── HOW THE BLAST RADIUS STAYS AT ZERO ──────────────────────────────────────
-- `squad_metric_sum` already receives `p_squad`, so it reads the deadline ITSELF
-- instead of having it threaded through. Its signature is unchanged, so all six
-- callers — `squad_metric_total` plus the inline computations in `squad_preview`
-- (0051), `squad_detail` (0053), `squad_commitment` (0055) and
-- `ensure_weekly_recap` (0057) — inherit the window with no edit to any of them.
--
-- ── DELIBERATELY NOT TOUCHED ────────────────────────────────────────────────
-- `goal_metric_value` (0039) computes the SIGNED-IN ATHLETE's own figure and is
-- shared with the personal Goals system (G-1) — eight metric kinds including
-- body-composition readings that are explicitly NOT windowed. Bounding it here
-- would reach well outside squads to change how personal goals score. The
-- consequence, stated rather than hidden: on an EXPIRED squad goal a member's
-- "your contribution" line keeps counting past the deadline while the squad
-- total is frozen. Fixing that wants a squad-scoped function of its own, not a
-- change to the shared one.

begin;

-- ── 1 · the column ──────────────────────────────────────────────────────────
alter table public.squads add column if not exists goal_ends_at timestamptz;

comment on column public.squads.goal_ends_at is
  'Optional deadline. Progress stops accumulating at this instant, so a finished window reports a frozen '
  'figure rather than one that keeps drifting. NULL = runs until met or cancelled (the pre-0103 behaviour, '
  'still valid).';

-- A window has to run forwards.
alter table public.squads drop constraint if exists squads_goal_window_check;
alter table public.squads add constraint squads_goal_window_check
  check (goal_ends_at is null or goal_started_at is null or goal_ends_at > goal_started_at);


-- ── 2 · the window's closing edge, as one stable expression ─────────────────
-- `least(deadline, now())` is what FREEZES an expired goal: after the deadline
-- the sum stops moving, so "312 workouts in March" is a stable fact rather than
-- a number that quietly starts counting April.
create or replace function public.squad_goal_window_end(p_squad uuid)
returns timestamptz
language sql
security definer
stable
set search_path = public
as $$
  select least(coalesce(s.goal_ends_at, 'infinity'::timestamptz), now())
    from public.squads s
   where s.id = p_squad;
$$;

grant execute on function public.squad_goal_window_end(uuid) to authenticated;


-- ── 3 · the sum, bounded ────────────────────────────────────────────────────
-- A FAITHFUL COPY of the 0051 body with one added predicate per branch. All five
-- metric kinds are carried through unchanged — an earlier draft of this migration
-- reconstructed the function from a partial read and silently dropped
-- `time_total` and `pr_count` to zero while filtering distance on a column that
-- does not exist. The gate, the `activity_type::text` comparison and the
-- `achieved_on` DATE arithmetic are all reproduced exactly as they were.
create or replace function public.squad_metric_sum(p_squad uuid, p_kind text, p_key text, p_started_at timestamptz)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select case
    when not (
      public.is_squad_member(p_squad, auth.uid())
      or exists (select 1 from public.squads s where s.id = p_squad and s.privacy = 'public')
    ) then 0
    when p_kind = 'workout_count' then coalesce((
      select count(*) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
        and w.saved_at < public.squad_goal_window_end(p_squad)
    ), 0)
    when p_kind = 'distance_total' then coalesce((
      select sum(w.distance) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.distance is not null
        and (p_key is null or w.activity_type::text = p_key)
        and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
        and w.saved_at < public.squad_goal_window_end(p_squad)
    ), 0)
    when p_kind = 'volume_total' then coalesce((
      select sum(ws.weight * ws.reps) from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
      join public.workouts w on w.id = we.workout_id
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
        and w.saved_at < public.squad_goal_window_end(p_squad)
    ), 0)
    when p_kind = 'time_total' then coalesce((
      select sum(w.duration_sec) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
        and w.saved_at < public.squad_goal_window_end(p_squad)
    ), 0) / 3600.0
    -- `personal_records.achieved_on` is a DATE, so its bound is a date too.
    when p_kind = 'pr_count' then coalesce((
      select count(*) from public.personal_records pr
      join public.squad_members sm on sm.user_id = pr.athlete_id
      where sm.squad_id = p_squad and pr.achieved_on >= coalesce(p_started_at::date, '-infinity'::date)
        and pr.achieved_on < public.squad_goal_window_end(p_squad)::date + 1
    ), 0)
    else 0
  end;
$$;

commit;

-- ── VERIFY ──────────────────────────────────────────────────────────────────
--   -- 1. the column and its guard exist
--   select column_name from information_schema.columns
--    where table_name = 'squads' and column_name in ('goal_started_at','goal_ends_at');
--   -- expect 2 rows
--
--   -- 2. ALL FIVE metric kinds still answer (the bug the first draft would have shipped)
--   select k, public.squad_metric_sum('<squad-uuid>', k, null, '2026-01-01'::timestamptz)
--     from unnest(array['workout_count','distance_total','volume_total','time_total','pr_count']) k;
--   -- expect five rows, none erroring
--
--   -- 3. a past deadline freezes the figure: run twice, minutes apart, same answer
--   update public.squads set goal_ends_at = now() - interval '1 day' where id = '<squad-uuid>';
--   select public.squad_metric_sum('<squad-uuid>', 'workout_count', null, '2026-01-01'::timestamptz);
