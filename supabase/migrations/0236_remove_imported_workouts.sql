-- Forge Legacy — 0236: "Remove from Forge" for an imported workout (Build 10 · Docs/Apple-Health-Build-Plan.md §10 step 5)
--
-- ══ WHAT THIS IS FOR ══
--
-- An athlete can remove a workout Apple Health brought in — from Activity Detail, from Activity History, or
-- all of them at once when disconnecting. Until now the client did that in two calls (ledger 'deleted' row,
-- then `delete from workouts`), and that left one thing wrong: `chapters.workout_count` is a STORED counter,
-- bumped by `save_workout` (0010 → 0162) and by `import_external_workouts` (0234) — and nothing ever took it
-- back down. Nothing in Forge has deleted a workout before this; an import is the first kind that can be.
--
-- ══ WHAT THIS DOES ══
--
--   `remove_external_workouts(p_ids uuid[])` — ONE statement, so it all lands or none of it does:
--     1. deletes the caller's own IMPORTED workouts among `p_ids` (source <> 'forge'; a Forge-recorded
--        workout is never touched, whatever id is passed),
--     2. writes a ledger 'deleted' row for each, so the next sync never re-imports it (0234 §4 skips
--        'skipped' and 'deleted' ids),
--     3. takes each removed workout back off its chapter's `workout_count` — the ACTIVE chapter only,
--        mirroring 0234's rule that a sealed chapter's `workout_count` is never touched. Floored at 0.
--   Returns how many workouts were removed. ≤ 200 ids per call.
--
-- ══ WHAT IS ALREADY RIGHT, AND WHY NOTHING ELSE IS HERE ══
--
--   · Every FK to `workouts` cascades or nulls (grepped every migration for `references … workouts`):
--       workout_exercises → cascade (0001; workout_sets cascade from it)
--       coach_intensity_signals → cascade (0143)
--       squad_posts.workout_id → set null (0043)   — its triggers are insert-only (0126, 0192)
--       program_sessions.workout_id → set null (0119)
--     `external_activity_ledger.workout_id` has no FK on purpose (0234). So the delete cannot be refused.
--   · Honors, goals, rank, competitions and squad totals are computed from `workouts` when read — the
--     removed workout simply stops counting. Honors already granted stay granted (nothing revokes one).
--   · No trigger fires on a workout delete (push_workout_saved is insert/update only, and requires
--     source = 'forge' anyway).
--
-- SECURITY INVOKER, like 0234's import: it runs as the athlete under `workouts_own`, `chapters_own` and
-- `external_activity_ledger_own`, so it can only ever reach the caller's own rows. The `athlete_id` filters
-- below are belt and braces on top of RLS.
--
-- ⚠ THE CLIENT SURVIVES THIS NOT BEING APPLIED. `removeImportedWorkouts` (src/data/apple-health-sync-live.ts)
-- falls back to the 0234-era two-call path on PGRST202 — the removal still works, only the chapter count is
-- left one high per removed workout until this lands.
--
-- Depends on 0001, 0234 (applied). Idempotent: create or replace + restated grants. Safe to run twice.

create or replace function public.remove_external_workouts(p_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_uid     uuid := auth.uid();
  v_removed integer := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 200 then
    raise exception 'remove_external_workouts: at most 200 ids per call (got %)', cardinality(p_ids) using errcode = '22023';
  end if;

  -- One statement: every data-modifying CTE runs whether or not it is read, against the same snapshot,
  -- and the chapter arithmetic is taken from exactly the rows that were deleted.
  with gone as (
    delete from public.workouts w
     where w.athlete_id = v_uid
       and w.source <> 'forge'
       and w.id = any (p_ids)
    returning w.id, w.source, w.external_id, w.chapter_id
  ),
  ledger as (
    insert into public.external_activity_ledger (athlete_id, source, external_id, outcome, workout_id)
    select v_uid, g.source, g.external_id, 'deleted', g.id
      from gone g
     where g.external_id is not null
    on conflict (athlete_id, source, external_id)
      do update set outcome = 'deleted', workout_id = excluded.workout_id
    returning 1
  ),
  counted as (
    update public.chapters c
       set workout_count = greatest(0, c.workout_count - x.n)
      from (select g.chapter_id, count(*)::integer as n
              from gone g
             where g.chapter_id is not null
             group by g.chapter_id) x
     where c.id = x.chapter_id
       and c.athlete_id = v_uid
       and c.is_active
    returning 1
  )
  select count(*)::integer into v_removed from gone;

  return v_removed;
end;
$fn$;

comment on function public.remove_external_workouts(uuid[]) is
  'Removes the CALLER''s imported workouts among p_ids (0236; Apple-Health-Build-Plan §10.5). SECURITY INVOKER. source <> ''forge'' only; writes ledger ''deleted'' so a re-sync never re-imports; decrements the ACTIVE chapter''s workout_count (sealed chapters untouched, floor 0). One statement. ≤ 200 ids. Returns the number removed.';

revoke execute on function public.remove_external_workouts(uuid[]) from public, anon;
grant execute on function public.remove_external_workouts(uuid[]) to authenticated;
