-- Forge Legacy — convenience bundle: migrations 0103 → 0105, in dependency order.
--
-- NOT a new migration. Every statement below is already numbered in supabase/migrations/; this file
-- exists so the outstanding chain can be pasted into the Supabase SQL editor in one go.
--
--   0103  squads.goal_ends_at + a bounded squad_metric_sum   — a squad goal can have a deadline, and an
--                                                              expired one FREEZES rather than drifting
--   0104  program graduation inside save_workout             — programs.state = 'graduated' had never
--                                                              been written by anything, ever
--   0105  workouts.playlist_url/_service/_name               — the Spotify / Apple Music link
--
-- ══ RUN IT AS ONE PASTE. IT IS ONE TRANSACTION. ══
--
-- The per-file `begin;` / `commit;` have been removed, so the Supabase editor runs the whole bundle in a
-- single implicit transaction: either all three land or none do. That is the point — this repo's recorded
-- failure mode is a PARTIAL run that leaves an older function body behind and errors nothing. Both 0104
-- and 0105 carry self-checks that `raise exception` on a wrong result, so a bad apply rolls the whole
-- bundle back instead of going quiet.
--
-- SAFE TO RE-RUN, including any part already applied: every column add is `if not exists`, every
-- constraint is dropped before being re-added, every function is `create or replace`, and 0104's backfill
-- finds no due rows the second time.
--
-- ══ ⚠ READ THIS BEFORE YOU RUN IT — 0104 WRITES ACROSS EVERY ATHLETE ══
--
-- Section 8 of 0104 is a BACKFILL. It seals every currently-Active program that has already logged its
-- final scheduled session, because without it those athletes would sit Active forever (there is no next
-- save left to trigger the transition). It dates each one to the workout that actually completed the
-- program, NOT to today, so it does not rewrite history to say they finished on migration day.
--
-- Run this FIRST, on its own, and read the answer. It is the same query with no write — it tells you
-- exactly which programs are about to be sealed:
--
--   select p.athlete_id, p.name,
--          (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') as logged
--     from public.programs p
--    where p.state = 'active'
--      and (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') > 0
--    order by p.athlete_id;
--
-- (`program_total_sessions` does not exist until this bundle runs, so the dry run shows candidates by
-- logged count; the backfill itself applies the real threshold.)
--
-- ══ AFTER IT RUNS ══
--
-- Ends with a PostgREST schema-cache reload — without it, the freshly added `squads.goal_ends_at` and
-- `workouts.playlist_*` columns report PGRST204 to the app even though they exist.
--
-- Then do the STEP 0 that both 0104 and 0105 ask for: IN THE APP, log one workout, any workout, and
-- confirm it lands in Activity History. This bundle replaces `save_workout`, which is the function every
-- session save goes through. Nothing below proves it still SAVES; only that does.
--
-- Each migration's own VERIFY block is preserved at the end of its section.


-- ==========================================================================
-- 0103  squad goals get a start date you can choose and an end date at all
-- source: supabase/migrations/0103_squad_goal_dates.sql
-- ==========================================================================

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

-- ==========================================================================
-- 0104  a program can finally graduate
-- source: supabase/migrations/0104_program_graduation.sql
-- ==========================================================================

-- Forge Legacy — 0104: a program can finally graduate
--
-- ══ THE DEFECT ══
--
-- Nothing in this app or this database has ever written `programs.state = 'graduated'`. The only client
-- call is endProgram(id, 'ended_early'); the only SQL that writes the column is 0017, which sets 'active'
-- and 'ended_early'. Every other mention of 'graduated' across 103 migrations is a READ.
--
-- So `programs_graduated` has been permanently 0 for every athlete, and therefore:
--   · the five Programs honors (0099) could never fire — rows in a catalog waiting on a number that
--     never moved;
--   · `programGraduations` gated the rank ladder at Architect and above, so nobody could pass Craftsman;
--   · the M-4 ceremony, its locked copy, its queue priority and its share plumbing were all built and
--     reachable only from a dev harness;
--   · `PROGRAM_GRADUATED` timeline events were never written, though the read side renders them fine.
--
-- Program-Architecture-Amendment-001 §4 (LOCKED): "A program graduates when the athlete logs the final
-- scheduled workout." Automatic, never manual. M-4 decision M4-D1 (LOCKED): "State transition timing:
-- Active → Graduated AT SESSION SAVE. Transition is atomic with workout log persistence." So it belongs
-- inside save_workout, and that is where this puts it.
--
-- Two live violations of the same locked amendment are closed here too:
--   · start_program never checked the current state, so W-3's "Run Again" REACTIVATED a sealed record.
--     §1: "A Graduated program cannot be reactivated… History cannot be rewritten."
--   · programs could be deleted in any state. §6: graduated and ended programs "may never be deleted."
--
-- Depends on 0013 (programs), 0017 (state + start_program), 0019 (source_definition_id),
-- 0097 (the live save_workout body), 0099/0100 (honor_metrics). Idempotent. RUN AFTER 0103.
--
-- ══ RUN THIS FIRST, ON ITS OWN, AND READ THE ANSWER ══
--
-- The backfill at the end writes `state` across every athlete. This is the same query with no write —
-- it tells you exactly which programs are about to be sealed, before you commit to anything:
--
--   select p.athlete_id, p.name,
--          (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') as logged
--     from public.programs p
--    where p.state = 'active'
--      and (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') > 0
--    order by p.athlete_id;
--
-- (program_total_sessions does not exist until this migration runs, so the dry run shows candidates by
-- logged count; the backfill itself applies the real threshold.)


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. HOW MANY SESSIONS A PROGRAM PRESCRIBES
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ THIS RULE EXISTS TWICE. The other copy is `totalSessions` / `weekSizes` in
-- `src/domain/program/progress-core.ts`, and the two must change together.
--
-- It exists twice on purpose: save_workout has to decide graduation WITHOUT TRUSTING THE CLIENT, because
-- what a graduation buys is five never-revocable honors and a rank family. A client-supplied "this was
-- my last session" flag would be the one number in the app that anyone with a PostgREST call could
-- assert. And a stored `sessions_total` column was rejected on this repo's own precedent — 0098 is a
-- whole migration about a stored derived count that "drifts on any path its author did not think of and
-- has no repair path"; it would also go stale the moment W-5 edits a Future program's structure.
--
-- WEEKS ARE NOT ALL THE SAME SIZE. A real block runs six days for two weeks then five, or drops a
-- conditioning day in a deload — so this SUMS each week's own built-day count. It is not
-- weeks × daysPerWeek; deriving one number from week 1 and multiplying reports a length the program
-- does not have (see the comment on `weekSizes`, which was written after that exact bug went live).
--
-- TOTAL BY CONSTRUCTION. It runs inside the Finish commit, so it must never raise, whatever jsonb it is
-- handed: typed reads (`jsonb_typeof(...) = 'number'`), never bare casts — `(j->>'weeks')::int` on
-- {"weeks":"four"} raises and would cost the athlete a logged session.
--
-- NULL means "this structure prescribes no schedule at all". Callers MUST read null as "do not
-- graduate", never as zero.
create or replace function public.program_total_sessions(p_structure jsonb)
returns integer
language sql
immutable
parallel safe
as $$
  with s as (select coalesce(p_structure, '{}'::jsonb) as j),
  n as (
    select case when jsonb_typeof(s.j->'weeks') = 'number'
                then greatest(1, floor((s.j->>'weeks')::numeric)::int) else 1 end as weeks,
           case when jsonb_typeof(s.j->'daysPerWeek') = 'number'
                then floor((s.j->>'daysPerWeek')::numeric)::int else 0 end as dpw,
           s.j as j
      from s
  ),
  -- plannedDays(structure, wi): that week's own plan in Customize mode, else the repeating template.
  wk as (
    select gs.wi,
           case
             when n.j->'vary' = 'true'::jsonb
              and jsonb_typeof(n.j->'weekPlans'->gs.wi->'days') = 'array'
               then n.j->'weekPlans'->gs.wi->'days'
             when jsonb_typeof(n.j->'days') = 'array'
               then n.j->'days'
             else null
           end as days,
           n.dpw
      from n, generate_series(0, n.weeks - 1) as gs(wi)
  ),
  -- trainingDays(): a day the athlete owes is one that prescribes something.
  sized as (
    select wk.wi,
           wk.days is null as no_schedule,
           greatest(1, coalesce(nullif((
             select count(*) from jsonb_array_elements(coalesce(wk.days, '[]'::jsonb)) d
              where jsonb_typeof(d) = 'object'
                and (case when jsonb_typeof(d->'warmup')   = 'array' then jsonb_array_length(d->'warmup')   else 0 end)
                  + (case when jsonb_typeof(d->'main')     = 'array' then jsonb_array_length(d->'main')     else 0 end)
                  + (case when jsonb_typeof(d->'cooldown') = 'array' then jsonb_array_length(d->'cooldown') else 0 end) > 0
           )::int, 0), wk.dpw)) as size
      from wk
  )
  select case when bool_or(no_schedule) then null else sum(size)::int end from sized;
$$;

comment on function public.program_total_sessions(jsonb) is
  'How many sessions a program prescribes: the SUM over weeks of that week''s built-day count (a day with
   no exercises is not a session owed), falling back to the configured daysPerWeek, floored at 1 per week.
   SQL twin of totalSessions()/weekSizes() in src/domain/program/progress-core.ts — it exists twice only
   because save_workout must decide graduation without trusting the client. NULL means the structure
   prescribes no schedule; read it as "do not graduate", never as zero. Total by construction: it never
   raises, whatever jsonb it is handed. Migration 0104.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. SELF-CHECK A — the rule is right, proven at apply time
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- These vectors are duplicated VERBATIM into src/domain/program/__tests__/progress-core.test.mjs. Both
-- lists fail loudly, so the SQL and the TypeScript can only drift through a deliberate edit to both.
do $$
declare
  v record;
  v_got int;
begin
  for v in
    select * from (values
      -- (label, structure, expected)
      ('empty-ish: no days array at all',
       '{"weeks":6,"daysPerWeek":3}'::jsonb, null::int),
      ('repeating week, 3 built days x 6 weeks',
       '{"weeks":6,"daysPerWeek":3,"vary":false,"days":[
          {"main":[{}]},{"main":[{}]},{"main":[{}]}],"weekPlans":null}'::jsonb, 18),
      ('empty days fall back to daysPerWeek',
       '{"weeks":4,"daysPerWeek":3,"vary":false,"days":[{"main":[]},{"main":[]}],"weekPlans":null}'::jsonb, 12),
      ('warmup alone makes a day count',
       '{"weeks":2,"daysPerWeek":9,"vary":false,"days":[{"warmup":[{}]},{"cooldown":[{}]}],"weekPlans":null}'::jsonb, 4),
      ('ragged weeks: 3 then 2',
       '{"weeks":2,"daysPerWeek":3,"vary":true,"days":[{"main":[{}]}],"weekPlans":[
          {"days":[{"main":[{}]},{"main":[{}]},{"main":[{}]}]},
          {"days":[{"main":[{}]},{"main":[{}]}]}]}'::jsonb, 5),
      ('vary with fewer weekPlans than weeks falls back to the template',
       '{"weeks":3,"daysPerWeek":2,"vary":true,"days":[{"main":[{}]},{"main":[{}]}],"weekPlans":[
          {"days":[{"main":[{}]},{"main":[{}]},{"main":[{}]}]}]}'::jsonb, 7),
      ('weeks floored at 1',
       '{"weeks":0,"daysPerWeek":3,"vary":false,"days":[{"main":[{}]},{"main":[{}]}],"weekPlans":null}'::jsonb, 2),
      ('every week floored at 1 even with nothing built and dpw 0',
       '{"weeks":3,"daysPerWeek":0,"vary":false,"days":[{"main":[]}],"weekPlans":null}'::jsonb, 3),
      ('garbage types never raise',
       '{"weeks":"four","daysPerWeek":null,"days":[{"main":[{}]}]}'::jsonb, 1),
      ('null structure',
       null::jsonb, null::int)
    ) as t(label, structure, expected)
  loop
    v_got := public.program_total_sessions(v.structure);
    if v_got is distinct from v.expected then
      raise exception '0104 self-check A FAILED [%]: expected %, got %', v.label, v.expected, v_got;
    end if;
  end loop;
  raise notice '0104: program_total_sessions matches all 10 golden vectors.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. start_program REFUSES A SEALED RECORD
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- This has been the hole in Amendment-001 §1 since 0017: the function never looked at the current state,
-- so W-3 routed every non-active program into it and "Run Again" on a graduated one flipped the sealed
-- record back to Active. A repeat is a NEW program (W-3 §7.2), created by the client — never this.
create or replace function public.start_program(p_program_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_state program_state;
  v_ended uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select state into v_state from programs where id = p_program_id and athlete_id = v_uid;
  if not found then raise exception 'program not found'; end if;

  -- Legal transitions are Future→Active, Active→Graduated, Active→Ended Early. There are no others.
  if v_state in ('graduated', 'ended_early') then
    raise exception 'a % program cannot be restarted — run it again as a new program', v_state
      using errcode = '22023';
  end if;

  update programs
     set state = 'ended_early', ended_at = now(), updated_at = now()
   where athlete_id = v_uid and state = 'active' and id <> p_program_id
  returning id into v_ended;

  update programs
     set state = 'active', started_at = coalesce(started_at, now()), ended_at = null, updated_at = now()
   where id = p_program_id and athlete_id = v_uid;

  return jsonb_build_object('started', p_program_id, 'ended', v_ended);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. THE INDEX: NARROW IT, DON'T DROP IT
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- 0019 made a second copy of a catalog plan impossible in ANY state. That was right while a program could
-- only be Future or Active, and wrong the moment one could be sealed: an athlete who graduated Strength
-- Foundation I could never run it again, and adoptCatalogProgram would hand them back the graduated row —
-- a dead end with a CTA on it.
--
-- The intent was never "one copy ever". 0019's own header says it: "starting the same catalog program
-- twice resumes the existing row instead of silently forking a second copy with its own separate
-- progress." That is a statement about LIVE copies. Sealed records accumulate without limit
-- (Amendment-001 §1), so the uniqueness narrows to the live states.
--
-- This also closes a defect noted while building the rank work: re-running a program used to LOSE credit
-- rather than gain it. The re-run row keeps its source_definition_id, so `distinctProgramCount`
-- (src/domain/rank/signals.ts) reads two graduations of one plan as programGraduations 2 / distinct 1 —
-- both true, per CAL Q14.
--
-- SAFE BY CONSTRUCTION: the old index was strictly stronger, so no existing row can violate the new one.
drop index if exists public.programs_one_per_source;

create unique index if not exists programs_one_live_per_source
  on public.programs (athlete_id, source_definition_id)
  where source_definition_id is not null and state in ('future', 'active');

comment on index public.programs_one_live_per_source is
  'One LIVE copy of a catalog plan per athlete. Sealed copies (graduated / ended_early) accumulate — they
   are permanent records, and running a program again is a new row, not a reactivation. Narrowed from
   0019''s programs_one_per_source by 0104.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. A SEALED RECORD CANNOT BE DELETED
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Amendment-001 §6: "Graduated and Ended Early programs are permanent legacy records. They may never be
-- deleted." A screen enforces that until somebody builds the next screen. 0017 put the one-active rule in
-- a unique index rather than in the client so the invariant would hold even if two devices raced;
-- permanence deserves the same treatment, and a state predicate IS expressible in a policy.
--
-- Deliberately NOT tightening programs_owner_update in the same migration: PostgREST returns 200 with an
-- empty body for an update matching zero rows, so updateProgram would fail SILENTLY. Hiding Edit on a
-- sealed record (W-3 §7 requires it anyway) covers the same ground at no risk.
drop policy if exists programs_owner_delete on public.programs;
create policy programs_owner_delete on public.programs
  for delete using (athlete_id = auth.uid() and state in ('future', 'active'));

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. save_workout — GRADUATE AT SESSION SAVE
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- 0097's body verbatim, plus ONE block between the chapter bump and evaluate_honors. The 11-arg signature
-- is unchanged (frozen since 0095), so this is create-or-replace with no client change and no window in
-- which PostgREST cannot find the function.
-- 0097's body, COPIED EXACTLY, plus ONE block between the chapter bump and evaluate_honors. The 11-arg
-- signature, the parameter names, `security invoker`, the snake_case jsonb keys the client actually
-- sends, `workout_name`, `weight_unit`, the `case when` on distance_unit and the `nullif` on modality are
-- all 0097's and are reproduced verbatim — a paraphrase here breaks every workout save for every athlete.
create or replace function save_workout(
  p_workout_name  text,
  p_activity_type modality,
  p_started_at    timestamptz,
  p_duration_sec  integer,
  p_notes         text,
  p_exercises     jsonb,
  p_prs           jsonb,
  p_program_id    uuid default null,
  p_distance      numeric default null,
  p_distance_unit text default null,
  p_template_id   uuid default null
) returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid      uuid := auth.uid();
  v_chapter  uuid;
  v_workout  uuid;
  v_wex      uuid;
  v_ex       jsonb;
  v_set      jsonb;
  v_pr       jsonb;
  v_tl       int := 0;
  v_program  uuid := null;
  v_template uuid := null;
  v_honors   jsonb := '[]'::jsonb;
  v_legs     numeric := 0;
  -- 0104 — graduation
  v_prog     record;
  v_done     int := 0;
  v_total    int;
  v_grad     jsonb := null;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select id into v_chapter from chapters where athlete_id = v_uid and is_active limit 1;

  if p_program_id is not null then
    select id into v_program from programs where id = p_program_id and athlete_id = v_uid;
  end if;

  if p_template_id is not null then
    select id into v_template from public.workout_templates where id = p_template_id and athlete_id = v_uid;
  end if;

  insert into workouts (athlete_id, chapter_id, program_id, template_id, workout_name, activity_type, started_at, saved_at, duration_sec, state, notes, distance, distance_unit)
  values (v_uid, v_chapter, v_program, v_template, p_workout_name, p_activity_type, p_started_at, now(), p_duration_sec, 'saved', p_notes, p_distance, p_distance_unit)
  returning id into v_workout;

  for v_ex in select value from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb))
  loop
    insert into workout_exercises (workout_id, catalog_key, name, section, position)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name',
            coalesce((v_ex->>'section')::workout_section, 'main'), (v_ex->>'position')::int)
    returning id into v_wex;

    for v_set in select value from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb))
    loop
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, modality, incline_pct)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end,
              nullif(v_set->>'modality', ''), (v_set->>'incline_pct')::numeric);

      v_legs := v_legs + coalesce((v_set->>'distance')::numeric, 0);
    end loop;
  end loop;

  -- Only when the caller didn't state one: a pure run passes its own distance and must not be doubled.
  if p_distance is null and v_legs > 0 then
    update workouts set distance = v_legs, distance_unit = 'mi' where id = v_workout;
  end if;

  for v_pr in select value from jsonb_array_elements(coalesce(p_prs, '[]'::jsonb))
  loop
    insert into personal_records (athlete_id, exercise, catalog_key, achieved_on, measure_kind, load_value, load_unit, load_reps)
    values (v_uid, v_pr->>'exercise', v_pr->>'catalogKey', current_date, 'load', (v_pr->>'weight')::numeric, 'lb', (v_pr->>'reps')::int);
    insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
    values (v_uid, 'ACCOMPLISHMENT', (v_pr->>'exercise') || ' — ' || (v_pr->>'weight') || ' lb PR',
            v_chapter, now(), 'personal_record');
    v_tl := v_tl + 1;
  end loop;

  if v_chapter is not null then
    update chapters set workout_count = workout_count + 1 where id = v_chapter;
  end if;

  -- ══ PROGRAM GRADUATION (Amendment-001 §4 · M4-D1) — the only thing 0104 adds to this function ══
  --
  -- "A program graduates when the athlete logs the final scheduled workout." Automatic, never manual, and
  -- ATOMIC with the workout that caused it: if the app dies before W-17 loads, the program is already
  -- Graduated and the record is intact.
  --
  -- IT MUST LAND BEFORE evaluate_honors. honor_metrics.programs_graduated is
  -- `count(*) from programs where state = 'graduated'` (0100) and honor_metrics is STABLE, so it reads the
  -- snapshot of the statement that calls it — which is after this UPDATE. Written afterwards instead, the
  -- five Programs honors would each fire one workout late, forever. Same mechanism by which workouts_total
  -- already counts the row inserted above.
  --
  -- Its own exception block on 0018's principle — the session is the thing worth saving. It should be
  -- unreachable (program_total_sessions is total by construction); the warning exists so a failure is loud
  -- in the Postgres log rather than surfacing months later as a graduation that silently never happened.
  if v_program is not null then
    begin
      select p.name, p.structure, p.started_at
        into v_prog
        from programs p
       where p.id = v_program and p.athlete_id = v_uid and p.state = 'active'
         for update;

      -- Not found = not active. Future, Graduated and Ended Early are all no-ops here: §1 permits exactly
      -- one transition into Graduated and it starts from Active.
      if found then
        v_total := public.program_total_sessions(v_prog.structure);

        select count(*) into v_done
          from workouts w
         where w.program_id = v_program and w.athlete_id = v_uid and w.state = 'saved';

        -- `>=`, not `=`: two devices racing can put the count past the total, and an athlete past the end
        -- has still finished. A NULL total makes the comparison null, and null is not "graduate".
        if v_done >= v_total then
          update programs
             set state = 'graduated', ended_at = now(), updated_at = now()
           where id = v_program and athlete_id = v_uid and state = 'active';

          -- The `state = 'active'` predicate IS the idempotency guard: under READ COMMITTED a second
          -- concurrent save blocks on the row lock, re-evaluates the predicate once granted, and updates
          -- nothing — so exactly one transaction writes the timeline event and the payload.
          if found then
            insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at,
                                         source_entity_type, source_entity_id)
            values (v_uid, 'PROGRAM_GRADUATED', v_prog.name, v_chapter, now(), 'program', v_program);
            v_tl := v_tl + 1;

            v_grad := jsonb_build_object(
              'program_id',   v_program,
              'program_name', v_prog.name,
              'started_at',   v_prog.started_at,
              'graduated_at', now(),
              'workouts',     v_done
            );
          end if;
        end if;
      end if;
    exception when others then
      v_grad := null;
      raise warning 'save_workout: graduation check failed for program % (% %)', v_program, sqlstate, sqlerrm;
    end;
  end if;

  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors, 'graduated', v_grad);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. SELF-CHECK B — the body actually got replaced
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- The direct antidote to this repo's recorded failure mode: "a partial run leaves an OLDER function body
-- and errors nothing". Asserts both that the new content is present AND that 0097's content survived the
-- transcription — a slip that dropped the cardio columns would otherwise be silent until someone logged a
-- treadmill session.
do $$
declare v_src text;
begin
  v_src := pg_get_functiondef(
    'public.save_workout(text, modality, timestamptz, integer, text, jsonb, jsonb, uuid, numeric, text, uuid)'::regprocedure);
  if position('PROGRAM_GRADUATED' in v_src) = 0 then
    raise exception '0104 self-check B FAILED: save_workout was NOT replaced — an older body is installed';
  end if;
  if position('incline_pct' in v_src) = 0 then
    raise exception '0104 self-check B FAILED: save_workout lost 0097''s cardio columns — body transcribed wrong';
  end if;
  raise notice '0104: save_workout replaced, 0097 content intact.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 8. BACKFILL — athletes already past their final session
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Without this the fix reaches nobody who has already finished, because there is no next save to trigger
-- the transition: W-3's "Continue Training" returns early when nextSession is null, Home offers nothing,
-- and the logger drops to freestyle. They would sit Active forever.
--
-- Dated to the workout that actually completed the program, NOT now() — stamping today would rewrite
-- history to say they finished on migration day. No ceremony fires (M-4 §8.1: a transition outside a live
-- session gets no modal); the record, the timeline entry and W-3's sealed presentation all land.
--
-- Honors are NOT evaluated here: evaluate_honors is security definer on auth.uid(), which is null in the
-- SQL editor. The five Programs honors fire on each athlete's next saved workout, which counts these rows.
-- A delay, not a loss.
--
-- Idempotent: re-running finds no due Active rows. Never violates programs_one_active_per_athlete — rows
-- only LEAVE that partial index.
with due as (
  select p.id, p.athlete_id, p.name,
         (select max(w.saved_at) from workouts w
           where w.program_id = p.id and w.state = 'saved') as last_saved
    from programs p
   where p.state = 'active'
     and public.program_total_sessions(p.structure) is not null
     and (select count(*) from workouts w where w.program_id = p.id and w.state = 'saved')
         >= public.program_total_sessions(p.structure)
),
graduated as (
  update programs p
     set state = 'graduated', ended_at = coalesce(d.last_saved, now()), updated_at = now()
    from due d
   where p.id = d.id and p.state = 'active'
  returning p.id, p.athlete_id, p.name, p.ended_at
)
insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at,
                             source_entity_type, source_entity_id)
select g.athlete_id, 'PROGRAM_GRADUATED', g.name,
       (select c.id from chapters c where c.athlete_id = g.athlete_id and c.is_active limit 1),
       g.ended_at, 'program', g.id
  from graduated g
 where not exists (select 1 from timeline_events t
                    where t.source_entity_id = g.id and t.event_type = 'PROGRAM_GRADUATED');


-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY — read-only. Substitute your athlete id.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- STEP 0 — IN THE APP, BEFORE ANYTHING BELOW. Log one workout, any workout, and confirm it appears in
-- Activity History. Nothing here proves save_workout still SAVES; only that does.
--
-- STEP 1 — Does the SQL rule agree with the screen?
-- Compare `total` with the "Workout N of M" line W-3 prints for the same program. A mismatch means
-- program_total_sessions and totalSessions() have drifted, and nothing else will tell you.
--
--   select p.name, p.state,
--          (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') as logged,
--          public.program_total_sessions(p.structure) as total,
--          case
--            when p.state <> 'active' then p.state::text
--            when public.program_total_sessions(p.structure) is null
--              then 'NO SCHEDULE — cannot graduate (check the structure)'
--            when (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved')
--                 >= public.program_total_sessions(p.structure)
--              then 'STUCK — at/past the final session but still Active'
--            else 'in progress'
--          end as verdict
--     from public.programs p
--    where p.athlete_id = '<your-athlete-id>'::uuid
--    order by p.created_at desc;
--
--   Expected: NO row reads 'STUCK'. (This is also the standing detector if the graduation block's
--   exception handler ever fires — re-run it after the first few real graduations.)
--
-- STEP 2 — Did the graduations seal, with their timeline entries?
--
--   select p.name, p.started_at, p.ended_at,
--          (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') as workouts,
--          exists (select 1 from public.timeline_events t
--                   where t.source_entity_id = p.id and t.event_type = 'PROGRAM_GRADUATED') as timeline_written
--     from public.programs p
--    where p.athlete_id = '<your-athlete-id>'::uuid and p.state = 'graduated'
--    order by p.ended_at desc;
--
--   Every row must show timeline_written = true.
--
-- STEP 3 — Do the honors see them? (This is the number that was permanently 0.)
--
--   select public.honor_metrics('<your-athlete-id>'::uuid) ->> 'programs_graduated';
--
--   Must equal STEP 2's row count. The five Programs honors fire on the NEXT saved workout.
--
-- STEP 4 — The guarantees are guarantees, not screen behaviour. Wrap in begin; … rollback;
--
--   delete from public.programs where id = '<a graduated id>';   -- expect DELETE 0
--   select public.start_program('<a graduated id>');             -- expect 'cannot be restarted'

-- ==========================================================================
-- 0105  the workout playlist link
-- source: supabase/migrations/0105_workout_playlist.sql
-- ==========================================================================

-- Forge Legacy — 0105: what you trained to
--
-- ══ WHAT THIS CLOSES ══
--
-- Workout-Playlist-Amendment-001 (LOCKED, June 2026) has been merged into four base specs — W-9–W-16
-- §8.5, W-17 §8A, W-19 §9A and WSR-001 — and implemented in exactly zero of them. `grep -ri playlist src`
-- returned one line before this migration, and it was a comment on W-19 reading "Playlist — no such data."
-- That comment was correct. This is the data.
--
-- Amendment §3: "Stored as `WorkoutSession.playlistLink: WorkoutPlaylistLink | null`. At most one playlist
-- link per session." So: three nullable columns on `workouts`, in the same shape and by the same reasoning
-- as `partners` (0016) and `reflection` — an optional annotation on the session row, written after the
-- commit, never part of it.
--
-- NOT A TABLE, DELIBERATELY. A child table is how you store a list, and §4 is explicit about why there
-- isn't one: "Supporting multiple links per session would imply a queue or ordering, which would create an
-- expectation of in-app playback sequencing that V1 explicitly does not provide." The cardinality belongs
-- in the schema, not in a rule somebody has to remember.
--
-- Depends on 0001 (workouts + the `workouts_own` FOR ALL policy that makes the post-commit update legal).
-- Idempotent. RUN AFTER 0104.
--
-- ══ NOTHING TO DRY-RUN ══
--
-- This migration adds columns and constraints and writes no row. The CHECK constraints are validated
-- against a table where every new column is NULL on every existing row, so they cannot fail on live data.


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- All three nullable, all three defaulting to nothing. A workout with no playlist is the overwhelming
-- majority and must cost nothing to represent — no empty string, no 'NONE' sentinel, no default row.
alter table public.workouts add column if not exists playlist_url     text;
alter table public.workouts add column if not exists playlist_service text;
alter table public.workouts add column if not exists playlist_name    text;

comment on column public.workouts.playlist_url is
  'The share link the athlete pasted, verbatim. Amendment-001 §3. Never displayed — the chip shows
   playlist_name or a generic service label, never a raw URL (§5).';
comment on column public.workouts.playlist_service is
  'SPOTIFY | APPLE_MUSIC, derived from the URL host at attach time and re-checked here. Amendment-001 §3:
   "If the domain doesn''t match either, the field is rejected — no silent guess."';
comment on column public.workouts.playlist_name is
  'Optional athlete-typed label ("Leg Day Bangers"). Amendment-001 §2 forbids fetching any playlist
   metadata, so this is the ONLY name that will ever exist for the link.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE HOST RULE, ENFORCED ON THE DATA
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ THIS RULE EXISTS TWICE. The other copy is `detectService` / `parsePlaylistLink` in
-- `src/domain/workout/playlist.ts`, and the two must change together. Its test file duplicates these
-- vectors verbatim, so the pair can only drift through a deliberate edit to both.
--
-- ══ WHY THE DATABASE CHECKS A HOSTNAME, WHICH IT OTHERWISE NEVER DOES ══
--
-- Because this is the one column in the app whose value becomes a TAP TARGET FOR SOMEBODY ELSE. The
-- amendment (§2, and WSR-001 §6.3) puts the playlist chip on squad check-in cards, so a squadmate sees a
-- chip labelled "Spotify Playlist" and taps it. If the service tag were merely a client-supplied string
-- constrained to two enum values, any caller with a PostgREST token could post a workout carrying
-- service='SPOTIFY' and url='https://anything-at-all', and the app would render a Spotify-labelled chip
-- that opens it. The label would be a lie the product told on the attacker's behalf.
--
-- 0104 declined to duplicate a rule into SQL where the client could be trusted, and duplicated
-- `program_total_sessions` where it could not — because graduation buys honors and rank. This is the same
-- test with the same answer: the client cannot be the only thing standing between a squadmate and an
-- arbitrary URL.
--
-- ══ WHY THESE REGEXES ARE SHAPED THE WAY THEY ARE ══
--
-- The terminator class `(/|\?|#|$)` is the whole security property, and each alternative is one attack:
--   · without it, 'https://open.spotify.com.evil.com/x'  matches a bare prefix test    → wrong host
--   · without it, 'https://open.spotify.com@evil.com/x'  matches a bare prefix test    → userinfo trick,
--     the real host is evil.com
-- A port ('https://open.spotify.com:443/…') is rejected too, because ':' is not in the class. That is
-- deliberate rather than an oversight: no share sheet on either platform emits one, and the TypeScript
-- twin rejects it identically, so the client never offers to save something the database will refuse.
--
-- https ONLY. Both services emit https from every share affordance they have. Accepting http would mean
-- storing a downgradeable link and handing it to a squadmate.
-- ══ `playlist_service is not null` IS LOAD-BEARING — A CHECK PASSES ON NULL ══
--
-- Without that line this constraint ACCEPTED a url with no service tag, and the first draft of this
-- migration shipped exactly that. A CHECK rejects a row only when its expression is explicitly FALSE;
-- an expression evaluating to NULL/UNKNOWN passes. With `playlist_service` null:
--
--     (playlist_service = 'SPOTIFY' and <regex true>)      →  NULL and TRUE   →  NULL
--     (playlist_service = 'APPLE_MUSIC' and <regex false>) →  NULL and FALSE  →  FALSE
--     NULL or FALSE                                        →  NULL            →  row ACCEPTED
--
-- So a half-written link — a URL the app would render a chip for, with no service to label or validate
-- it — was legal. The self-check in section 3 caught it at apply time, which is the entire reason that
-- section exists; the TypeScript twin never had the bug, because `playlistFromRow` tests `!url ||
-- !service` explicitly and JavaScript has no third truth value to fall through.
--
-- Comparing a nullable column inside a disjunction is the general shape of this trap. If you edit this
-- constraint, re-run section 3 and believe it over the code you just wrote.
alter table public.workouts drop constraint if exists workouts_playlist_pair;
alter table public.workouts add constraint workouts_playlist_pair check (
  (playlist_url is null and playlist_service is null)
  or (
    playlist_url is not null
    and playlist_service is not null
    and (
      (playlist_service = 'SPOTIFY'     and playlist_url ~ '^https://open\.spotify\.com(/|\?|#|$)')
      or (playlist_service = 'APPLE_MUSIC' and playlist_url ~ '^https://music\.apple\.com(/|\?|#|$)')
    )
  )
);

comment on constraint workouts_playlist_pair on public.workouts is
  'A playlist link is all of its parts or none of them, and the service tag must agree with the URL''s
   actual host. SQL twin of detectService() in src/domain/workout/playlist.ts. Enforced here rather than
   client-side because WSR-001 §6.3 renders this chip to SQUADMATES: a service-labelled chip opening an
   arbitrary URL is a lie the product would be telling on an attacker''s behalf. Migration 0105.';

-- A name with no link is an orphan — nothing would ever render it, and it would survive a "remove" that
-- only cleared the URL. Removal clears all three or the constraint stops it.
alter table public.workouts drop constraint if exists workouts_playlist_name_needs_link;
alter table public.workouts add constraint workouts_playlist_name_needs_link check (
  playlist_name is null or playlist_url is not null
);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. SELF-CHECK — the constraint actually rejects what it claims to
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- A CHECK constraint that is present but wrong is this repo's recorded failure mode wearing a different
-- hat: it applies cleanly, errors nothing, and is discovered months later by the thing it was supposed to
-- prevent. These vectors are duplicated VERBATIM into
-- src/domain/workout/__tests__/playlist.test.mjs. Both lists fail loudly.
--
-- Runs against a temp table carrying the identical constraint, so a failing vector cannot leave a row in
-- `workouts` and the check needs no cleanup.
do $$
declare
  v record;
  v_ok  boolean;
  v_def text;
begin
  /*
   * THE PROBE TESTS THE REAL CONSTRAINT, NOT A RETYPED COPY OF IT.
   *
   * The first draft of this migration hand-copied the CHECK expression into this string, and the copy
   * inherited the NULL bug documented in section 2 — so the probe and the constraint agreed with each
   * other while both were wrong. They only disagreed with the EXPECTED column, which is what caught it,
   * but that was luck rather than design: any bug present in both copies would have passed silently.
   *
   * `pg_get_constraintdef` reads the definition Postgres actually installed above, so the two can no
   * longer differ by construction. The temp columns are named to match the real ones so the definition
   * applies verbatim.
   */
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conname = 'workouts_playlist_pair'
     and conrelid = 'public.workouts'::regclass;

  if v_def is null then
    raise exception '0105 self-check FAILED: workouts_playlist_pair is not installed on public.workouts';
  end if;

  create temp table _pl_probe (playlist_url text, playlist_service text) on commit drop;
  execute 'alter table _pl_probe add constraint c ' || v_def;

  for v in
    select * from (values
      -- (label, url, service, should_be_accepted)
      ('nothing attached',                     null,                                                     null,          true),
      ('real Spotify share link',              'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP', 'SPOTIFY',     true),
      ('Spotify link carrying its ?si= param', 'https://open.spotify.com/playlist/abc?si=xyz',            'SPOTIFY',     true),
      ('real Apple Music share link',          'https://music.apple.com/us/playlist/gym/pl.u-abc',        'APPLE_MUSIC', true),
      ('bare host, no path',                   'https://open.spotify.com',                                'SPOTIFY',     true),
      -- the attacks
      ('suffixed host is a DIFFERENT host',    'https://open.spotify.com.evil.com/x',                     'SPOTIFY',     false),
      ('userinfo trick — real host is evil',   'https://open.spotify.com@evil.com/x',                     'SPOTIFY',     false),
      ('service tag lying about the host',     'https://music.apple.com/us/playlist/x',                   'SPOTIFY',     false),
      ('arbitrary URL wearing a service tag',  'https://evil.com/pretty-playlist',                        'SPOTIFY',     false),
      ('http is not https',                    'http://open.spotify.com/playlist/x',                      'SPOTIFY',     false),
      ('scheme-relative',                      '//open.spotify.com/playlist/x',                           'SPOTIFY',     false),
      ('not even a URL',                       'open.spotify.com/playlist/x',                             'SPOTIFY',     false),
      -- half-written links
      ('url with no service',                  'https://open.spotify.com/playlist/x',                     null,          false),
      ('service with no url',                  null,                                                     'SPOTIFY',     false),
      ('unknown service value',                'https://open.spotify.com/playlist/x',                     'TIDAL',       false)
    ) as t(label, url, service, accepted)
  loop
    begin
      insert into _pl_probe values (v.url, v.service);
      v_ok := true;
    exception when check_violation then
      v_ok := false;
    end;
    if v_ok is distinct from v.accepted then
      raise exception '0105 self-check FAILED [%]: expected accepted=%, got %', v.label, v.accepted, v_ok;
    end if;
  end loop;
  raise notice '0105: playlist host rule matches all 15 golden vectors.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY — read-only. Substitute your athlete id.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- STEP 0 — IN THE APP, BEFORE ANYTHING BELOW. Log one workout, any workout, and confirm it appears in
-- Activity History. This migration touches the table every save writes to; only a real save proves it.
--
-- STEP 1 — Are the columns there, and did the notice in section 3 print "matches all 15 golden vectors"?
--
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_name = 'workouts' and column_name like 'playlist%'
--    order by column_name;
--
--   Expected: three rows, all is_nullable = YES.
--
-- STEP 2 — The guarantee is a guarantee, not screen behaviour. Wrap in begin; … rollback;
--
--   update public.workouts set playlist_url = 'https://evil.com/x', playlist_service = 'SPOTIFY'
--    where id = '<any workout of yours>';        -- expect ERROR 23514 workouts_playlist_pair
--
--   update public.workouts set playlist_name = 'Orphan' where id = '<any workout of yours>';
--                                                -- expect ERROR 23514 workouts_playlist_name_needs_link
--
-- STEP 3 — After attaching one in the app (⋯ Options during a workout, or W-17's Reflect step):
--
--   select workout_name, playlist_service, playlist_name, playlist_url
--     from public.workouts
--    where athlete_id = '<your-athlete-id>'::uuid and playlist_url is not null
--    order by saved_at desc;

-- ==========================================================================
-- Make the new columns and functions visible to the API immediately.
-- ==========================================================================

notify pgrst, 'reload schema';
