-- 0016_workout_partners.sql
-- Training-partner attribution on a saved workout (W-20, "Trained With").
--
-- Names only, and ONLY on the athlete's own record: tagging a partner records "I trained with them" on
-- MY workout (the "+N" pills in Activity) — it never writes to the partner's legacy. A partner's legacy
-- only gains an entry when THEY perform + save the workout themselves (a future shared-session backend).
--
-- The client sets this with a post-save UPDATE on its own row, already permitted by the existing
-- `workouts_own` (for all) RLS policy — so no new grant is needed, just the column.

alter table workouts add column if not exists partners text[] not null default '{}';
