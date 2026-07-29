-- Forge Legacy — 0035: auto-tracking goals (metric descriptor + progress engine)
--
-- Lets a quantifiable goal track its progress from real workout data instead of a hand-typed number
-- (pre-authorized by Critical-Decisions-Amendment-001 "Hybrid Progress Model"). Adds a metric descriptor
-- to `goals` and a function that computes the current value for the caller. The app still writes progress
-- through the existing updateProgress path (history + auto-achieve + ceremony) — this just supplies the
-- number. RUN BY HAND in the Supabase SQL editor.

alter table public.goals add column if not exists metric_kind       text not null default 'manual'
  check (metric_kind in ('manual', 'exercise_max', 'distance_total', 'workout_count'));
alter table public.goals add column if not exists metric_key        text;          -- exercise name / activity modality
alter table public.goals add column if not exists metric_started_at timestamptz;   -- window anchor for cumulative kinds

-- Compute a goal metric's current value for the signed-in athlete. security invoker → RLS scopes every
-- read to the caller's own workouts.
create or replace function public.goal_metric_value(p_metric_kind text, p_metric_key text, p_started_at timestamptz)
returns numeric
language sql
security invoker
stable
as $$
  select case p_metric_kind
    -- Heaviest weight actually lifted on the exercise (matches "squat 405 once", not an e1RM estimate).
    when 'exercise_max' then coalesce((
      select max(ws.weight)
      from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
      join public.workouts w on w.id = we.workout_id
      where w.athlete_id = auth.uid() and we.name = p_metric_key and ws.reps >= 1
    ), 0)
    -- Total distance for the activity, since the goal's start anchor.
    when 'distance_total' then coalesce((
      select sum(w.distance)
      from public.workouts w
      where w.athlete_id = auth.uid()
        and w.distance is not null
        and (p_metric_key is null or w.activity_type::text = p_metric_key)
        and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    -- Workouts logged since the goal's start anchor.
    when 'workout_count' then coalesce((
      select count(*)
      from public.workouts w
      where w.athlete_id = auth.uid()
        and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    else 0
  end;
$$;
