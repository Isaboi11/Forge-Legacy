-- Forge Legacy — 0037: more auto-tracking metrics (volume · time · PRs)
--
-- Extends the goal_metric_value engine (0035) with three cumulative team totals that all compute from data
-- we already save, and widens the squad goal to allow them. RUN BY HAND in the SQL editor.
--   volume_total — total weight moved (Σ weight×reps), e.g. "move 1,000,000 lb together"
--   time_total   — total training hours (Σ duration_sec ÷ 3600), e.g. "100 hours logged"
--   pr_count     — personal records set since the goal started, e.g. "set 25 PRs"

create or replace function public.goal_metric_value(p_metric_kind text, p_metric_key text, p_started_at timestamptz)
returns numeric
language sql
security invoker
stable
as $$
  select case p_metric_kind
    when 'exercise_max' then coalesce((
      select max(ws.weight)
      from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
      join public.workouts w on w.id = we.workout_id
      where w.athlete_id = auth.uid() and we.name = p_metric_key and ws.reps >= 1
    ), 0)
    when 'distance_total' then coalesce((
      select sum(w.distance)
      from public.workouts w
      where w.athlete_id = auth.uid()
        and w.distance is not null
        and (p_metric_key is null or w.activity_type::text = p_metric_key)
        and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    when 'workout_count' then coalesce((
      select count(*)
      from public.workouts w
      where w.athlete_id = auth.uid()
        and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    when 'volume_total' then coalesce((
      select sum(ws.weight * ws.reps)
      from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
      join public.workouts w on w.id = we.workout_id
      where w.athlete_id = auth.uid()
        and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    when 'time_total' then coalesce((
      select sum(w.duration_sec)
      from public.workouts w
      where w.athlete_id = auth.uid()
        and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0) / 3600.0
    when 'pr_count' then coalesce((
      select count(*)
      from public.personal_records pr
      where pr.athlete_id = auth.uid()
        and pr.achieved_on >= coalesce(p_started_at::date, '-infinity'::date)
    ), 0)
    else 0
  end;
$$;

-- Let a squad goal use any of the cumulative team metrics.
alter table public.squads drop constraint if exists squads_goal_metric_kind_check;
alter table public.squads add constraint squads_goal_metric_kind_check
  check (goal_metric_kind in ('workout_count', 'distance_total', 'volume_total', 'time_total', 'pr_count'));
