-- Forge Legacy — 0138: what the athlete told you by acting
--
-- ══ WHAT THIS CLOSES ══
--
-- PO: *"It should learn from the individual… what they like and don't like, what they swap for, how long
-- they take, everything about them."*
--
-- Holt learns nothing today — `src/domain/coach/**` reads no database at all. Most of the signal needed
-- to change that is already recorded (every set, every duration, every skipped session, every favourite).
-- Two things are not, and this migration is those two. Governed by
-- `Docs/Coach-Adaptive-Learning-Amendment-001.md` (CL-D9, CL-D10, CL-D11).
--
-- ══ ⚠ HALF ONE IS NOT A NEW DECISION ══
--
-- `Exercise-002-Exercise-Substitution-Architecture` §10.1–10.2 is LOCKED and already says it:
--
--   "Both `exerciseName` (substitute) and `prescribedExerciseName` (original) are snapshotted at the
--    moment of write… Historical integrity is complete and permanent for both exercises involved."
--
-- `save_workout` has always inserted `workout_exercises (workout_id, catalog_key, name, section,
-- position, group_*)` and there is no `prescribed_*` column anywhere in 137 migrations. So the app has
-- been throwing away the single most informative thing an athlete does in a session — telling you, by
-- acting, that the movement you gave them was the wrong one — for as long as substitution has shipped.
-- This implements §10; it does not decide it.
--
-- ══ ⚠ WHY A SEPARATE RPC AND NOT A CHANGE TO `save_workout` ══
--
-- `save_workout`'s eleven arguments have been frozen since 0095 and EVERY client path calls it. Widening
-- it, or rebuilding its 200-line body to read two more jsonb keys, would put every save in the app at
-- risk to record an annotation. `partners` (0016) and the playlist link (0105) set the precedent and
-- `save.ts` states the rule: these are marks ON a session rather than parts OF one, written after the
-- commit, and a failure must cost the mark and never the workout.
--
-- ══ HALF TWO: THE SIGNAL FAVOURITES NEVER HAD ══
--
-- `exercise_favorites` (0020) has carried "I like this" since the twentieth migration. Nothing has ever
-- carried "stop giving me this", which is why "what they don't like" was unanswerable. Same shape, same
-- key, one extra column for the reason.
--
-- ⚠ AN AVOIDANCE IS NOT READ BY THE ENGINE YET, ON PURPOSE (CL-D11). Capture ships first — nothing can
-- learn from data that was never written — and CL-D3 makes a VISIBLE, REVERSIBLE list a precondition of
-- `assemble()` ever reading this table. An invisible avoidance that silently narrows somebody's training
-- is the exact failure this system is being designed against.
--
-- Idempotent. Depends on 0001 (workouts, workout_exercises, profiles). RUN AFTER 0137.

begin;

-- ── HALF ONE: what a substitution replaced (EX-002 §10 / CL-D9) ─────────────────────────────────────
alter table public.workout_exercises
  add column if not exists prescribed_catalog_key text,
  add column if not exists prescribed_name        text;

comment on column public.workout_exercises.prescribed_name is
  'EX-002 §10.1. The exercise this row REPLACED, snapshotted at write time and permanent. Null in the overwhelming majority of rows — non-null only when the athlete explicitly substituted. Never set because they logged different weight or reps, and never because they skipped something (§10.1).';

-- Only the rows that carry a substitution, which is a small minority of a large table. The coach reads
-- this as "what did this athlete swap away from, and what to" — a per-athlete question, so the workout
-- join is always in play; the partial index keeps it off every ordinary row.
create index if not exists workout_exercises_substituted
  on public.workout_exercises (prescribed_catalog_key)
  where prescribed_catalog_key is not null;

-- ── The writer ───────────────────────────────────────────────────────────────────────────────────────
--
-- One statement for every substitution in a session. Keyed by `position`, which is what the client
-- already sends to `save_workout` and what uniquely places a row inside its workout.
--
-- ⚠ OWNERSHIP IS CHECKED ON THE WORKOUT, NOT THE EXERCISE ROW. `workout_exercises` has no athlete
-- column — the same reason `fetchLastNotes` joins `workouts!inner` — so an unguarded definer function
-- here would let anybody annotate anybody's session. The `exists` clause is the whole gate.
create or replace function public.record_substitutions(p_workout uuid, p_subs jsonb)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int := 0;
begin
  if p_workout is null or p_subs is null or jsonb_typeof(p_subs) <> 'array' then
    return 0;
  end if;

  if not exists (
    select 1 from public.workouts w
     where w.id = p_workout and w.athlete_id = auth.uid()
  ) then
    raise exception 'not your workout' using errcode = '42501';
  end if;

  update public.workout_exercises we
     set prescribed_catalog_key = nullif(s->>'prescribed_catalog_key', ''),
         prescribed_name        = nullif(s->>'prescribed_name', '')
    from jsonb_array_elements(p_subs) s
   where we.workout_id = p_workout
     and we.position = (s->>'position')::int
     -- A name is the minimum: EX-002 §10.2 makes the NAME the display authority, and a custom or
     -- deleted exercise may have no catalogue key to record at all.
     and nullif(s->>'prescribed_name', '') is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.record_substitutions(uuid, jsonb) is
  'CL-D9. Records what each substituted exercise replaced, after the commit — never inside save_workout, whose signature has been frozen since 0095 and which every client path calls. Guarded on workouts.athlete_id because workout_exercises has no athlete column of its own.';

revoke execute on function public.record_substitutions(uuid, jsonb) from public;
grant  execute on function public.record_substitutions(uuid, jsonb) to authenticated;

-- ── HALF TWO: "stop giving me this" (CL-D10) ────────────────────────────────────────────────────────
create table if not exists public.exercise_avoidance (
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  catalog_key text not null,
  -- Optional and free text. A reason the athlete typed is worth more to a coach than any enum this
  -- migration could guess at, and "my shoulder" and "I just hate it" want different responses.
  reason      text check (reason is null or char_length(reason) <= 200),
  created_at  timestamptz not null default now(),
  primary key (athlete_id, catalog_key)
);

create index if not exists exercise_avoidance_athlete
  on public.exercise_avoidance (athlete_id, created_at desc);

alter table public.exercise_avoidance enable row level security;

-- Yours and nobody else's — the same posture `exercise_favorites` has held since 0020. CL-D7: learned
-- state is never readable by another athlete, never in a squad surface, never in /admin.
drop policy if exists exercise_avoidance_own on public.exercise_avoidance;
create policy exercise_avoidance_own on public.exercise_avoidance
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

comment on table public.exercise_avoidance is
  'CL-D10. The negative counterpart to exercise_favorites (0020) — "stop offering me this". ⚠ NOT READ BY THE COACH ENGINE YET (CL-D11): CL-D3 makes a visible, reversible list in the app a PRECONDITION of assemble() reading it, because an invisible avoidance silently narrowing somebody''s training is the failure mode this whole system is designed against. Removes one EXERCISE, never a movement pattern.';

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure reports rather than rolling back work that succeeded.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'workout_exercises'
       and column_name = 'prescribed_name'
  ) then
    raise exception '0138 self-check: workout_exercises.prescribed_name was not added';
  end if;
  if to_regprocedure('public.record_substitutions(uuid, jsonb)') is null then
    raise exception '0138 self-check: record_substitutions was not created';
  end if;
  if to_regclass('public.exercise_avoidance') is null then
    raise exception '0138 self-check: exercise_avoidance was not created';
  end if;
end;
$$;
