-- Forge Legacy — 0031: Squad goal quantification (Social · Part 1 follow-up)
--
-- Promotes the squad goal from a create-time text blurb to a real, measurable target set from the squad
-- page. `squads.goal` (0030) now holds the goal TITLE; this adds the target count and the start timestamp
-- so progress = the squad's workouts logged since the goal was set (owner-only for now; auto-aggregates
-- across members once invites/check-ins land — no schema change needed then). RUN BY HAND in the SQL editor.

alter table public.squads add column if not exists goal_target     int;          -- e.g. 500 (workouts)
alter table public.squads add column if not exists goal_started_at timestamptz;  -- progress counts from here
