-- Forge Legacy — 0039: lower-is-better goals + body-composition metrics
--
-- Adds a direction concept so goals can count DOWN (cut to 185 lb, shrink waist to 32"), and wires
-- body_entries (0028) as an auto-tracking source. `metric_dir` + `metric_start_value` (the baseline a level
-- metric is measured from) drive the descending / baseline-relative progress in the app. Individual goals
-- only. RUN BY HAND in the SQL editor.

alter table public.goals add column if not exists metric_dir         text not null default 'up' check (metric_dir in ('up', 'down'));
alter table public.goals add column if not exists metric_start_value numeric;  -- baseline for level metrics (body / later times)

alter table public.goals drop constraint if exists goals_metric_kind_check;
alter table public.goals add constraint goals_metric_kind_check
  check (metric_kind in ('manual', 'exercise_max', 'distance_total', 'workout_count', 'volume_total', 'time_total', 'pr_count', 'body_weight', 'body_measure'));

-- Extend the metric engine with body-composition (the latest logged reading).
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
    -- Body composition: the latest logged reading (not windowed).
    when 'body_weight' then coalesce((
      select b.weight_lb from public.body_entries b
      where b.athlete_id = auth.uid()
      order by b.logged_on desc, b.created_at desc limit 1
    ), 0)
    when 'body_measure' then coalesce((
      select case p_metric_key
        when 'waist_in' then (select b.waist_in from public.body_entries b where b.athlete_id = auth.uid() and b.waist_in is not null order by b.logged_on desc, b.created_at desc limit 1)
        when 'chest_in' then (select b.chest_in from public.body_entries b where b.athlete_id = auth.uid() and b.chest_in is not null order by b.logged_on desc, b.created_at desc limit 1)
        when 'arm_in'   then (select b.arm_in   from public.body_entries b where b.athlete_id = auth.uid() and b.arm_in   is not null order by b.logged_on desc, b.created_at desc limit 1)
      end
    ), 0)
    else 0
  end;
$$;
