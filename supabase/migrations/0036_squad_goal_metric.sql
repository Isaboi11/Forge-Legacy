-- Forge Legacy — 0036: choosable metric for the squad goal
--
-- The squad goal (0031) auto-tracked progress, but the metric was hardcoded to "workouts logged since the
-- goal was set". This lets the owner choose what a squad goal tracks — total workouts OR total distance
-- (the "run 200 miles together" case) — reusing the `goal_metric_value` engine from 0035. Solo squads = the
-- owner's data for now; cross-member aggregation lands with invites. RUN BY HAND in the SQL editor.

alter table public.squads add column if not exists goal_metric_kind text not null default 'workout_count'
  check (goal_metric_kind in ('workout_count', 'distance_total'));
alter table public.squads add column if not exists goal_metric_key text;  -- activity modality for distance_total
