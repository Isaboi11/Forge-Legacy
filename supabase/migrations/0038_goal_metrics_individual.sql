-- Forge Legacy — 0038: allow the volume/time/PR metrics on INDIVIDUAL goals too (parity with squad)
--
-- 0037 added volume_total / time_total / pr_count to the goal_metric_value engine + the squad goal. This
-- widens the individual `goals` metric_kind check so the same three can be picked there. No engine change
-- (the RPC already handles them). RUN BY HAND in the SQL editor.

alter table public.goals drop constraint if exists goals_metric_kind_check;
alter table public.goals add constraint goals_metric_kind_check
  check (metric_kind in ('manual', 'exercise_max', 'distance_total', 'workout_count', 'volume_total', 'time_total', 'pr_count'));
