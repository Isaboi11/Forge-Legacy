-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migrations 0119 → 0122, IN ORDER
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- This is the four outstanding migrations concatenated in the ONE order they can safely run in.
-- Applied through 0118 as of 2026-08-06; nothing here has been applied.
--
--   0119  program_session_log        — a program remembers WHICH session you did (swap / skip)
--   0120  push_notifications         — the nine push preferences finally get a sender
--   0121  workout_join_requests      — joining a workout that is already under way
--   0122  squad_feed_notifications   — squad posts + check-ins notify; squad-media size limit
--
-- ⚠ THE ORDER IS NOT COSMETIC. 0121 rebuilds `notification_events_for` from 0120's eight-branch body
--   plus one; 0122 rebuilds it from 0121's nine plus two. Run out of order and the rebuild silently
--   DELETES a shipped branch — the exact fault 0088, 0092 and 0106 each shipped, each of which
--   compiled cleanly and was found by a person rather than by an error.
--
-- ⚠ TWO EXTENSIONS, early in the 0120 section: pg_net and pg_cron. If either errors under the
--   dashboard role, enable it in Database → Extensions and then RE-RUN THIS FILE FROM THE TOP.
--
--   RE-RUNNING IS SAFE. Every statement in all four migrations is guarded — `create table if not
--   exists`, `create index if not exists`, `drop policy if exists` before each create, `drop trigger
--   if exists` before each create, `cron.unschedule … where exists` before each schedule, and each
--   new constraint behind a `pg_constraint` lookup.
--
--   ⚠ THAT WAS NOT TRUE UNTIL NOW, and it is worth knowing why. 0120 created
--   `notification_events_for` with a bare `create function`, so a second run raised
--   **42723: function "notification_events_for" already exists with same argument types** and the file
--   could not be resumed from the top — the only recovery this project has, since there is no CLI.
--   A matching `drop function if exists` now precedes it. If you hit 42723 on an older copy of this
--   file, this one supersedes it.
--
-- ⚠ THE LAST STATEMENT touches `storage.buckets` (the check-in size limit). If the dashboard role
--   cannot update it, set it by hand: Storage → Buckets → squad-media → 50 MB. Everything above it
--   is independent and will already have applied.
--
-- ⚠ PUSH NEEDS A NEW iOS BUILD. `expo-notifications` is a native change, so 0120 alone sends nothing
--   until that build is installed. Applying it early is safe and silent: with no device token
--   registered, nothing is ever enqueued.
--
-- ── AFTER RUNNING, paste this to check the security invariant survived ────────────────────────────
--
--   select has_function_privilege('public','public.notification_events_for(uuid)','execute');
--
--   It MUST come back false. That function is SECURITY DEFINER and takes any user id, so if PUBLIC
--   can execute it, any signed-in athlete can read everybody else's notifications by passing their
--   id. 0120 revokes it; 0121 and 0122 use CREATE OR REPLACE (which preserves the revoke) rather
--   than DROP (which would reset it). This is the one-line proof that held.
--
-- ── And this, to confirm the union has all eleven branches ────────────────────────────────────────
--
--   select count(*) from pg_proc where proname = 'notification_events_for';   -- expect 1
--
-- ═══════════════════════════════════════════════════════════════════════════════════════════════




-- ###############################################################################################
-- ##  SECTION: pending-0119.sql
-- ###############################################################################################

-- Forge Legacy — 0119: a program remembers WHICH session you did, so you can swap or skip one
--
-- ══ WHAT THE MODEL COULD NOT SAY ═════════════════════════════════════════════════════════════════
--
-- Asked for: "During a program, should we have the ability to swap workout days or skip days?"
--
-- Skipping a DAY was never a thing — `dayOfWeek` is always null (PAS §2.2), programs are sequential,
-- and missing a Tuesday costs nothing because there is no Tuesday. But swapping or skipping a SESSION
-- was impossible, and not because a button was missing: **a saved workout records `program_id` and
-- nothing about which session it satisfied.** Progress is `count(workouts)`, "next up" is
-- `slots[count]`, and graduation is `count >= total`.
--
-- So an athlete who did Day D instead of Day C would push the count to 3, be served D again, and never
-- be offered C — while the app believed it had watched them do both. The ordering was not a UI
-- constraint. It was the absence of anywhere to write the answer down.
--
-- `program_sessions` is that place. One row per session the athlete has TOUCHED:
--
--     completed — they trained it, and `workout_id` says with what
--     skipped   — they chose to pass, and it still counts toward finishing the program (PO decision)
--
-- Progress becomes the COUNT OF ROWS. "Next up" is the first slot with no row. Graduated is every slot
-- having one. Order stops being implied by arithmetic and starts being recorded.
--
-- ⚠ A SKIP COUNTS, AND IS STILL NAMED A SKIP. The product decision is that skipping is fine and does
-- not block completion. The honest half is that `state` keeps saying which it was, forever — so the log
-- can mark the day skipped and a graduation can report "28 trained, 4 skipped" rather than quietly
-- presenting a skip as training. Counting it and claiming it are different things, and only the first
-- was asked for.
--
-- ══ ⚠ AND IT RESTORES A GRADUATION THAT 0106 SILENTLY DELETED ════════════════════════════════════
--
-- 0104 added program graduation to `save_workout`, in a block whose own comment reads "the only thing
-- 0104 adds to this function". **0106 then rebuilt `save_workout` from 0097's body** — which predates
-- 0104 — and the block went with it. Grep the applied function: zero occurrences of `graduated`.
--
-- So since 0106 was applied, no program has graduated. Again. That is the third instance of this exact
-- failure in this database: `notification_events()` lost its friend branches the same way across
-- 0088 and 0092, and 0104's own header opens by describing the first one. A function rebuilt from an
-- older copy compiles perfectly and takes a feature with it.
--
-- Everything 0104's header lists as broken is broken again: `programs.state` never reaches 'graduated',
-- the five Programs honors cannot fire, M-4 never plays, the rank ladder stays gated at Architect, and
-- no PROGRAM_GRADUATED timeline event is written.
--
-- This migration restores it — now counting `program_sessions` rows rather than workouts, so a skipped
-- session carries the athlete to the end exactly as the PO asked.
--
-- Depends on 0013 (programs), 0017 (state), 0018 (workouts.program_id), 0104 (program_total_sessions,
-- start_program guards), 0106 (the live save_workout body). Idempotent. RUN AFTER 0118.
--
-- ══ READ THIS BEFORE YOU RUN IT ══════════════════════════════════════════════════════════════════
--
-- The backfill maps every athlete's existing program workouts onto slots in saved order — which is
-- exactly what the old count-based model already assumed, so nobody's progress moves. This is the same
-- query with no write; it shows what is about to be created:
--
--   select p.athlete_id, p.name,
--          (select count(*) from public.workouts w
--            where w.program_id = p.id and w.state = 'saved') as will_become_completed_rows
--     from public.programs p
--    where exists (select 1 from public.workouts w where w.program_id = p.id and w.state = 'saved')
--    order by p.athlete_id;

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE SLOT LIST — the schedule, enumerated, in SQL
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ THIS RULE EXISTS TWICE, and 0104 already explains why: `save_workout` must decide graduation
-- WITHOUT TRUSTING THE CLIENT, because a graduation buys five never-revocable honors and a rank family.
-- The TypeScript twin is `scheduleSlots()` in `src/domain/program/progress-core.ts`; the two must change
-- together, and the self-check below fails loudly if they disagree about a length.
--
-- The CTEs are `program_total_sessions`'s, unchanged — this returns the ROWS that function counts.
create or replace function public.program_slots(p_structure jsonb)
returns table(ordinal integer, week_index integer, day_index integer)
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
  -- A structure with any unscheduled week prescribes nothing knowable, so it yields NO slots — the same
  -- reading `program_total_sessions` gives by returning null. Never treat that as "zero sessions owed".
  select (row_number() over (order by sized.wi, d.di) - 1)::int,
         sized.wi::int,
         d.di::int
    from sized
    cross join lateral generate_series(0, sized.size - 1) as d(di)
   where not exists (select 1 from sized z where z.no_schedule)
   order by sized.wi, d.di;
$$;

comment on function public.program_slots(jsonb) is
  'Every session a program prescribes, in order, as (ordinal, week_index, day_index) — all 0-based. The
   row form of program_total_sessions, sharing its CTEs and its reading of an unscheduled week (no rows,
   never "zero owed"). SQL twin of scheduleSlots() in src/domain/program/progress-core.ts. Migration 0119.';

-- Self-check: the row count must equal the number the count-based twin already returns, on the shapes
-- 0104 pinned. A disagreement here means the two walkers have drifted, which is how the ragged-week bug
-- reached an athlete the first time.
do $$
declare
  v jsonb;
begin
  foreach v in array array[
    '{"weeks":4,"daysPerWeek":3,"days":[{"main":[{"a":1}]},{"main":[{"a":1}]},{"main":[{"a":1}]}]}'::jsonb,
    '{"weeks":2,"daysPerWeek":2,"vary":true,"weekPlans":[{"days":[{"main":[{"a":1}]},{"main":[{"a":1}]}]},{"days":[{"main":[{"a":1}]}]}]}'::jsonb,
    '{"weeks":1,"daysPerWeek":5}'::jsonb
  ]
  loop
    if (select count(*) from public.program_slots(v)) is distinct from coalesce(public.program_total_sessions(v), 0) then
      raise exception '0119 self-check: program_slots and program_total_sessions disagree on %', v;
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE LOG
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.program_sessions (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.programs(id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  week_index  integer not null check (week_index >= 0),
  day_index   integer not null check (day_index  >= 0),
  state       text not null check (state in ('completed', 'skipped')),
  -- Null for a skip, and null again if the workout is later deleted — the session stays accounted for,
  -- which is the point of recording it separately from the workout.
  workout_id  uuid references public.workouts(id) on delete set null,
  created_at  timestamptz not null default now(),
  -- ONE row per session. A double-tap, two devices, or a re-run of the backfill all collapse to one.
  unique (program_id, week_index, day_index)
);

create index if not exists program_sessions_program on public.program_sessions (program_id, week_index, day_index);

alter table public.program_sessions enable row level security;
drop policy if exists program_sessions_own on public.program_sessions;
create policy program_sessions_own on public.program_sessions
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

comment on table public.program_sessions is
  'One row per session an athlete has TOUCHED in a program: completed (with the workout that did it) or
   skipped. Progress is the count of these rows, "next up" is the first slot without one, and graduation
   is every slot having one — so a skip carries the athlete forward (PO decision, 2026-08-07) while
   `state` keeps saying, permanently, that it was a skip. Migration 0119.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. BACKFILL — nobody loses a session
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- The old model said: the Nth saved workout satisfied the Nth slot. That is precisely what it MEANT by
-- `slots[count]`, so writing it down changes nobody's position — it makes the existing assumption
-- explicit instead of implicit. Ordered by saved_at then id so the mapping is deterministic on ties.
--
-- Workouts past the end of the schedule (possible: `>=` graduation, two devices racing) get no row.
-- There is no slot for them, and inventing one would put a program past its own length.
insert into public.program_sessions (program_id, athlete_id, week_index, day_index, state, workout_id, created_at)
select w.program_id, w.athlete_id, s.week_index, s.day_index, 'completed', w.id, w.saved_at
from (
  select w.id, w.program_id, w.athlete_id, w.saved_at,
         (row_number() over (partition by w.program_id order by w.saved_at, w.id) - 1)::int as ord
    from public.workouts w
   where w.program_id is not null and w.state = 'saved'
) w
join public.programs p on p.id = w.program_id
join lateral public.program_slots(p.structure) s on s.ordinal = w.ord
on conflict (program_id, week_index, day_index) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. SKIPPING A SESSION
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Its own function rather than a bare insert so the slot is validated against the program's real
-- schedule — a client cannot skip a session the program does not prescribe — and so graduation is
-- evaluated here too. Skipping the last outstanding session finishes the program, which is exactly what
-- "a skip counts toward completing it" has to mean.
create or replace function public.skip_program_session(
  p_program_id uuid,
  p_week_index integer,
  p_day_index  integer
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_prog  record;
  v_total int;
  v_done  int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select p.id, p.structure, p.state into v_prog
    from public.programs p
   where p.id = p_program_id and p.athlete_id = v_uid
   for update;
  if not found then raise exception 'program not found'; end if;
  -- A sealed program is history (Amendment-001 §1). Nothing may be added to it.
  if v_prog.state in ('graduated', 'ended_early') then
    return jsonb_build_object('ok', false, 'reason', 'program is not active');
  end if;

  if not exists (
    select 1 from public.program_slots(v_prog.structure) s
     where s.week_index = p_week_index and s.day_index = p_day_index
  ) then
    return jsonb_build_object('ok', false, 'reason', 'no such session in this program');
  end if;

  -- Already touched — completed OR skipped — is a no-op rather than an error. Skipping something you
  -- already trained must never overwrite the record of having trained it.
  insert into public.program_sessions (program_id, athlete_id, week_index, day_index, state)
  values (p_program_id, v_uid, p_week_index, p_day_index, 'skipped')
  on conflict (program_id, week_index, day_index) do nothing;

  v_total := coalesce(public.program_total_sessions(v_prog.structure), 0);
  select count(*) into v_done from public.program_sessions ps where ps.program_id = p_program_id;

  -- `>=` and the `state = 'active'` predicate, both for 0104's reasons: an athlete past the end has
  -- still finished, and the predicate IS the idempotency guard under a concurrent write.
  if v_total > 0 and v_done >= v_total then
    update public.programs
       set state = 'graduated', ended_at = now(), updated_at = now()
     where id = p_program_id and athlete_id = v_uid and state = 'active';

    if found then
      insert into public.timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at,
                                          source_entity_type, source_entity_id)
      select v_uid, 'PROGRAM_GRADUATED', p.name,
             (select c.id from public.chapters c where c.athlete_id = v_uid and c.is_active limit 1),
             now(), 'program', p.id
        from public.programs p where p.id = p_program_id;
      perform public.evaluate_honors('live_session');
      return jsonb_build_object('ok', true, 'graduated', true);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'graduated', false);
end;
$$;

comment on function public.skip_program_session(uuid, integer, integer) is
  'Mark one prescribed session as skipped. It counts toward completing the program (PO decision) and can
   therefore graduate it, while `state` records permanently that it was skipped rather than trained.
   Validates the slot against the program''s own schedule; a session already touched is a no-op.
   Migration 0119.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. save_workout — records WHICH session, and graduates again
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- DROPPED, not replaced: the two new parameters change the signature, and `create or replace` would
-- leave the 11-argument version alongside this one for PostgREST to choose between. Same reason 0117
-- dropped `squad_feed` rather than replacing it.
--
-- ⚠ THE SLOT IS RESOLVED HERE WHEN THE CLIENT DOES NOT NAME ONE, and that is deliberate.
-- `workout-launch.ts` explains why only the program id used to travel: "carrying the week/day too would
-- let a stale card (Home rendered minutes ago) train the wrong session". That protection is kept for the
-- DEFAULT path — Home's Continue still sends no slot, and the server assigns the first outstanding one
-- at commit time. An explicit slot arrives only when the athlete deliberately CHOSE a session, which is
-- what swapping is, and a choice is allowed to be a choice.
drop function if exists public.save_workout(text, modality, timestamptz, integer, text, jsonb, jsonb, uuid, numeric, text, uuid);

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
  p_template_id   uuid default null,
  p_program_week  integer default null,
  p_program_day   integer default null
) returns jsonb
language plpgsql
security invoker
as $fn$
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
  v_prog     record;
  v_total    int;
  v_done     int;
  v_grad     jsonb := null;
  v_wk       int;
  v_dy       int;
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
    insert into workout_exercises (workout_id, catalog_key, name, section, position, group_id, group_name, group_kind, group_rounds)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name',
            coalesce((v_ex->>'section')::workout_section, 'main'), (v_ex->>'position')::int,
            nullif(v_ex->>'group_id', ''), nullif(v_ex->>'group_name', ''),
            -- Anything the client did not label is a circuit, which is what the read side assumes too.
            case when nullif(v_ex->>'group_id', '') is null then null
                 when v_ex->>'group_kind' = 'superset' then 'superset'
                 else 'circuit' end,
            (v_ex->>'group_rounds')::int)
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

  -- Only when the caller did not state one: a pure run passes its own distance and must not be doubled.
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

  -- ══ WHICH SESSION THIS WAS, AND THEN GRADUATION (0119, restoring 0104 — see the header) ══
  --
  -- Its own exception block, on 0018's principle: the session is the thing worth saving. A failure here
  -- is loud in the Postgres log rather than surfacing months later as a graduation that never happened,
  -- which is exactly how 0106's silent deletion of this block went unnoticed.
  if v_program is not null then
    begin
      select p.name, p.structure, p.started_at, p.state
        into v_prog
        from programs p
       where p.id = v_program and p.athlete_id = v_uid
         for update;

      if found and v_prog.state = 'active' then
        -- The athlete's explicit choice, validated against the real schedule; otherwise the first
        -- session with no row against it. Both go through program_slots, so neither can name a session
        -- the program does not prescribe.
        select s.week_index, s.day_index into v_wk, v_dy
          from public.program_slots(v_prog.structure) s
         where (p_program_week is not null and p_program_day is not null
                  and s.week_index = p_program_week and s.day_index = p_program_day)
            or (p_program_week is null and p_program_day is null
                  and not exists (select 1 from public.program_sessions ps
                                   where ps.program_id = v_program
                                     and ps.week_index = s.week_index and ps.day_index = s.day_index))
         order by s.ordinal
         limit 1;

        if v_wk is not null then
          -- `do nothing` on conflict: re-training a session already logged keeps the FIRST record rather
          -- than rewriting which workout satisfied it.
          insert into public.program_sessions (program_id, athlete_id, week_index, day_index, state, workout_id)
          values (v_program, v_uid, v_wk, v_dy, 'completed', v_workout)
          on conflict (program_id, week_index, day_index) do nothing;
        end if;

        v_total := public.program_total_sessions(v_prog.structure);
        select count(*) into v_done from public.program_sessions ps where ps.program_id = v_program;

        -- `>=`, not `=`: two devices racing can put the count past the total, and an athlete past the end
        -- has still finished. A NULL total makes the comparison null, and null is not "graduate".
        if v_done >= v_total then
          update programs
             set state = 'graduated', ended_at = now(), updated_at = now()
           where id = v_program and athlete_id = v_uid and state = 'active';

          -- The `state = active` predicate IS the idempotency guard: a second concurrent save blocks on
          -- the row lock, re-evaluates once granted, and updates nothing.
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
              -- Sessions ACCOUNTED FOR, which is not the same as sessions trained. The ceremony is told
              -- both, so it can never present a skip as a workout.
              'sessions',     v_done,
              'trained',      (select count(*) from public.program_sessions ps
                                where ps.program_id = v_program and ps.state = 'completed'),
              'skipped',      (select count(*) from public.program_sessions ps
                                where ps.program_id = v_program and ps.state = 'skipped')
            );
          end if;
        end if;
      end if;
    exception when others then
      v_grad := null;
      raise warning 'save_workout: session/graduation step failed for program % (% %)', v_program, sqlstate, sqlerrm;
    end;
  end if;

  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors, 'graduated', v_grad);
end;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. SELF-CHECK — the body really got replaced, and nothing was transcribed away
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- 0104 shipped a check like this and it still did not save us, because 0106 replaced the function in a
-- LATER migration carrying its own (absent) check. So this asserts all four generations at once: 0097's
-- cardio columns, 0106's superset columns, 0104's graduation, and 0119's session row. A future rebuild
-- from an older copy fails here instead of shipping.
do $chk$
declare
  v_src text;
begin
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'save_workout'
   order by p.oid desc limit 1;

  if v_src is null then raise exception '0119 self-check: save_workout is missing'; end if;
  if v_src not like '%program_sessions%' then raise exception '0119 self-check: the session row is not being written'; end if;
  if v_src not like '%PROGRAM_GRADUATED%' then raise exception '0119 self-check: graduation is missing (the 0106 regression is back)'; end if;
  if v_src not like '%group_kind%' then raise exception '0119 self-check: 0106 superset columns were transcribed away'; end if;
  if v_src not like '%incline_pct%' then raise exception '0119 self-check: 0097 cardio columns were transcribed away'; end if;
end $chk$;

commit;


-- ###############################################################################################
-- ##  SECTION: pending-0120.sql
-- ###############################################################################################

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migration 0120 (push notifications)
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- APPLIED THROUGH 0118 as of 2026-08-07. ⚠ 0119 (program_session_log) is NOT recorded as applied —
-- apply supabase/apply/pending-0119.sql FIRST if it has not been run. 0120 does not depend on 0119,
-- but the ledger should not skip.
--
-- ⚠ TWO EXTENSIONS. The first two statements enable pg_net and pg_cron. If either errors under the
-- dashboard role, enable it in Database → Extensions, then re-run this file from the top — every
-- statement in it is idempotent.
--
-- ⚠ THIS MIGRATION ALONE SENDS NOTHING. Push is a NATIVE change: expo-notifications shifts the runtime
-- fingerprint, so the phone needs a NEW eas build + submit. An eas update cannot deliver it. Until that
-- build is installed no device has a token, and with no token nothing is ever enqueued — applying this
-- early is safe and silent.
--
-- Body below is byte-identical to supabase/migrations/0120_push_notifications.sql.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0120: push notifications
--
-- ══ WHAT WAS MISSING ══
--
-- `profiles.notif_prefs` has stored nine push preferences since 0022, and the P-5 screen has saved them
-- on every toggle since. There was no sender, no token column, and nowhere to send to. The preferences
-- recorded intent for a delivery mechanism that did not exist.
--
-- ══ THE ARCHITECTURAL PROBLEM, AND THE DECISION ══
--
-- `notification_events()` is a DERIVED read: a union over source tables that are already true. Nothing is
-- ever inserted as an event, so there was no row and no insert moment to hang a send on.
--
-- A push is not a derivation. It is a DELIVERY — once it leaves, it cannot be withdrawn the way a derived
-- row vanishes when its underlying fact stops being true. So push needs a record of "this was sent," and
-- that ledger is `push_outbox` below. That is the ONLY thing that becomes stored. The feed stays derived,
-- `/inbox` is untouched, and the property 0109 and 0110 both defend — a notification here can never lie,
-- because withdrawing the request removes it — survives intact.
--
-- PO decision (2026-08-07): triggers, over a parameterised union.
--
--   `notification_events_for(p_user)` holds the real body. `notification_events()` becomes a one-line
--   wrapper over it at `auth.uid()`. The eight branches are therefore defined EXACTLY ONCE and both the
--   viewer and the sender read the same definition.
--
-- The rejected alternative was triggers that each compute their own recipient. It avoids touching this
-- function, but it copies every branch's WHERE clause into trigger logic — in a schema that has now lost
-- branches to exactly that kind of duplication three times (0088, 0092, 0106). The triggers here are
-- deliberately stupid: they know WHO to re-scan, never WHAT an event is.
--
-- ══ ⚠ REBUILT FROM 0110's BODY — EIGHT BRANCHES ══
--
-- 0110 is the current definition, not 0109. It added the `program_shared` branch and the `share_id`
-- column, and 0109's own comment (written before it) says SEVEN. Rebuilding from 0109 would have deleted
-- `program_shared` silently and made it the fourth instance of this failure. All EIGHT branches are
-- below; count them before editing this again.
--
-- ══ NO BACKLOG BLAST ══
--
-- Every pending friend request, squad invite and shared program in the database is, right now, a live
-- event in that union. Without a floor, the first athlete to register a device would be pushed the entire
-- history of their account in one burst. `profiles.push_baseline_at` is that floor: it is stamped once,
-- when the first device registers, and only events NEWER than it are ever enqueued.

-- ── Extensions ───────────────────────────────────────────────────────────────
-- pg_net sends the HTTP request; pg_cron runs the drain. If either `create extension` errors under the
-- dashboard's role, enable it in Database → Extensions and re-run from here.
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ── Device tokens ────────────────────────────────────────────────────────────
create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token       text not null unique,
  platform    text not null default 'ios' check (platform in ('ios', 'android')),
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Set when Expo answers DeviceNotRegistered. The row is kept, not deleted: a reinstall hands back the
  -- same token and re-registration simply clears this.
  disabled_at timestamptz
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id) where disabled_at is null;

alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_own_select on public.push_tokens;
create policy push_tokens_own_select on public.push_tokens
  for select using (user_id = auth.uid());

drop policy if exists push_tokens_own_write on public.push_tokens;
create policy push_tokens_own_write on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The floor. Stamped once, never moved.
alter table public.profiles add column if not exists push_baseline_at timestamptz;
comment on column public.profiles.push_baseline_at is
  'Set when this athlete first registers a device. Only notification events NEWER than this are ever pushed — without it, registering a device would replay the account''s whole history as notifications.';

-- ── The delivery ledger ──────────────────────────────────────────────────────
create table if not exists public.push_outbox (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null,
  event_at      timestamptz not null,
  actor_id      uuid,
  squad_id      uuid,
  challenge_id  uuid,
  invite_id     uuid,
  share_id      uuid,
  -- Worded at enqueue, so the sender is a dumb pipe and the copy is auditable in-table.
  title         text not null,
  body          text not null,
  route         text not null,
  status        text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED')),
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  attempts      int not null default 0,
  request_id    bigint,
  error         text
);

-- Idempotence. `event_at` is a stable source timestamp in every branch (requested_at, joined_at,
-- decided_at, created_at), so the same event always produces the same key and re-scanning is free.
-- An expression index, not a generated column: casting timestamptz to text is not IMMUTABLE.
create unique index if not exists push_outbox_event_uk on public.push_outbox (
  user_id, kind, event_at,
  (coalesce(actor_id, squad_id, challenge_id, invite_id, share_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

create index if not exists push_outbox_pending_idx on public.push_outbox (created_at) where status = 'PENDING';

alter table public.push_outbox enable row level security;

-- Readable by its owner for support and debugging. Nothing but the SECURITY DEFINER functions below
-- writes here — there is deliberately no insert/update/delete policy.
drop policy if exists push_outbox_own_select on public.push_outbox;
create policy push_outbox_own_select on public.push_outbox
  for select using (user_id = auth.uid());

-- ── The union, parameterised ─────────────────────────────────────────────────
-- ⚠ DROP AND REBUILD, ALWAYS (42P13). Rebuild from THIS body, never from an older one.
drop function if exists public.notification_events();

-- ⚠ AND DROP THE PARAMETERISED ONE TOO, or this file cannot be run twice.
--
-- This line was missing, and the omission surfaced the first time anyone re-ran the migration: a bare
-- `create function` on a function that already exists raises 42723, so a run that stopped anywhere after
-- this point could never be resumed by starting again from the top — which is the only recovery this
-- project has, since there is no CLI and the dashboard is the whole deployment mechanism. Every other
-- statement in this migration was already guarded (`if not exists`, `drop policy if exists`,
-- `drop trigger if exists`, `cron.unschedule … where exists`); this one was the single exception.
--
-- Dropping resets the EXECUTE grant back to PUBLIC, which for this function is the escalation the
-- revoke at the foot of this file exists to close. That is safe HERE and only here, because the revoke
-- is in this same file and runs on the same pass. Later migrations must use `create or replace`
-- instead — a drop there would reset the grant with nothing following to restore it, which is why
-- `push.test.mjs` asserts 0121 and 0122 never contain this statement.
drop function if exists public.notification_events_for(uuid);

create function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 1
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = p_user and q.status = 'pending'

  union all
  -- 2
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = p_user and m.user_id <> p_user

  union all
  -- 3
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = p_user
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all
  -- 4 (0073, restored 0109)
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and p_user in (f.low_id, f.high_id)
     and f.requested_by <> p_user

  union all
  -- 5 (0073, restored 0109)
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = p_user then f.high_id else f.low_id end,
         null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = p_user

  union all
  -- 6
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and p_user = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = p_user
     )

  union all
  -- 7
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
   where i.to_id = p_user and i.status = 'PENDING'

  union all
  -- 8 (0110)
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id
    from public.program_shares ps
   where ps.to_id = p_user and ps.status = 'PENDING';
$$;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. EIGHT branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared. Read by notification_events() for the viewer and by push_enqueue_for() for the sender, so the two can never disagree. Any column change must DROP and rebuild (42P13) — from THIS body, never an older one. 0088 and 0092 each rebuilt from a predecessor and silently dropped both friend branches for two migrations.';

-- The viewer's entry point, unchanged in name, signature and return type, so `notification_feed` and
-- `notification_unread_count` rebind to it on their next call and need no edit.
create function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select * from public.notification_events_for(auth.uid());
$$;

comment on function public.notification_events() is
  'Thin wrapper over notification_events_for(auth.uid()) since 0120. The body lives there — edit it, not this.';

-- ── Preferences ──────────────────────────────────────────────────────────────
-- The kind → preference map. `request_declined` returns NULL and is therefore NEVER pushed: 0073's rule
-- is that a notification whose entire content is a small rejection is worse than none. It still appears
-- in `/inbox`, where the athlete came looking; it is not delivered to a lock screen unasked.
create or replace function public.push_pref_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'join_request'     then 'squad_activity'
    when 'member_joined'    then 'squad_activity'
    when 'request_approved' then 'squad_activity'
    when 'friend_request'   then 'friend_requests'
    when 'friend_accepted'  then 'friend_requests'
    when 'challenge_invite' then 'challenge_updates'
    when 'workout_invite'   then 'workout_tags'
    when 'program_shared'   then 'program_shares'
    else null
  end;
$$;

-- ⚠ These MUST equal `NOTIF_DEFAULTS` in src/domain/settings/notifications.ts. A test parses this
-- function and asserts the two agree, because a default that differs between client and sender means the
-- screen shows one thing and the server does another, silently.
create or replace function public.push_pref_default(p_key text)
returns boolean
language sql
immutable
as $$
  select case p_key
    when 'squad_activity'    then false
    when 'friend_requests'   then true
    when 'challenge_updates' then false
    when 'workout_tags'      then true
    when 'program_shares'    then true
    else false
  end;
$$;

-- Mirrors `sanitizeNotif`: only a stored BOOLEAN counts; anything else falls back to the default.
create or replace function public.push_prefs_allows(p_prefs jsonb, p_kind text)
returns boolean
language sql
immutable
as $$
  select case
    when public.push_pref_key(p_kind) is null then false
    when jsonb_typeof(p_prefs -> public.push_pref_key(p_kind)) = 'boolean'
      then (p_prefs ->> public.push_pref_key(p_kind))::boolean
    else public.push_pref_default(public.push_pref_key(p_kind))
  end;
$$;

-- ── Registration ─────────────────────────────────────────────────────────────
create or replace function public.push_register_token(p_token text, p_platform text default 'ios')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, coalesce(p_platform, 'ios'))
  on conflict (token) do update
    set user_id      = excluded.user_id,   -- a shared device follows whoever signed in last
        platform     = excluded.platform,
        last_seen_at = now(),
        disabled_at  = null;               -- re-registering revives a token Expo had rejected

  -- Stamped once. coalesce keeps the original floor on every later registration.
  update public.profiles
     set push_baseline_at = coalesce(push_baseline_at, now())
   where id = auth.uid();
end;
$$;

create or replace function public.push_unregister_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

-- ── Enqueue ──────────────────────────────────────────────────────────────────
-- Re-scans one athlete's events and files anything new, wanted, and after their floor. Idempotent: the
-- unique index absorbs re-scans, so calling this too often costs a query and nothing else.
create or replace function public.push_enqueue_for(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baseline timestamptz;
  v_prefs    jsonb;
  v_count    int;
begin
  if p_user is null then return 0; end if;

  select p.push_baseline_at, coalesce(p.notif_prefs, '{}'::jsonb)
    into v_baseline, v_prefs
    from public.profiles p
   where p.id = p_user;

  -- No device registered yet, or no floor: nothing is deliverable, so nothing is filed.
  if v_baseline is null then return 0; end if;
  if not exists (select 1 from public.push_tokens t where t.user_id = p_user and t.disabled_at is null) then
    return 0;
  end if;

  insert into public.push_outbox (
    user_id, kind, event_at, actor_id, squad_id, challenge_id, invite_id, share_id, title, body, route
  )
  select
    p_user, e.kind, e.at, e.actor_id, e.squad_id, e.challenge_id, e.invite_id, e.share_id,
    case e.kind
      when 'join_request'     then 'Squad request'
      when 'member_joined'    then 'New member'
      when 'request_approved' then 'You''re in'
      when 'friend_request'   then 'Friend request'
      when 'friend_accepted'  then 'Friend request accepted'
      when 'challenge_invite' then 'Challenge'
      when 'workout_invite'   then 'Train together'
      when 'program_shared'   then 'Program shared'
    end,
    -- Worded to match `bodyFor` in src/app/inbox.tsx: the push and the row it opens say the same thing.
    case e.kind
      when 'join_request'     then coalesce(pr.name, 'An athlete') || ' asked to join ' || coalesce(sq.name, 'your squad')
      when 'member_joined'    then coalesce(pr.name, 'An athlete') || ' joined ' || coalesce(sq.name, 'your squad')
      when 'request_approved' then 'You joined ' || coalesce(sq.name, 'the squad')
      when 'friend_request'   then coalesce(pr.name, 'An athlete') || ' wants to be friends'
      when 'friend_accepted'  then coalesce(pr.name, 'An athlete') || ' accepted your request'
      when 'challenge_invite' then coalesce(pr.name, 'An athlete') || ' challenged you to ' || coalesce(ch.name, 'a competition')
      when 'workout_invite'   then coalesce(pr.name, 'An athlete') || ' wants to train ' || coalesce(wi.workout_name, 'together') || ' with you'
      when 'program_shared'   then coalesce(pr.name, 'An athlete') || ' sent you ' || coalesce(sh.name, 'a program')
    end,
    -- The destinations `/inbox` already uses, so a tapped push and a tapped row land identically.
    case e.kind
      when 'workout_invite'   then '/workout-invite?id=' || e.invite_id::text
      when 'program_shared'   then '/program-share/' || e.share_id::text
      when 'challenge_invite' then '/challenge/' || e.challenge_id::text
      when 'join_request'     then '/squad-requests?id=' || e.squad_id::text
      when 'friend_request'   then '/athlete/' || e.actor_id::text
      when 'friend_accepted'  then '/athlete/' || e.actor_id::text
      else '/squad/' || e.squad_id::text
    end
    from public.notification_events_for(p_user) e
    left join public.profiles pr on pr.id = e.actor_id
    left join public.squads sq on sq.id = e.squad_id
    left join public.challenges ch on ch.id = e.challenge_id
    left join public.workout_invites wi on wi.id = e.invite_id
    left join public.program_shares sh on sh.id = e.share_id
   where e.at > v_baseline
     and public.push_prefs_allows(v_prefs, e.kind)
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── Triggers ─────────────────────────────────────────────────────────────────
-- Deliberately stupid. Each one answers only "who might have a new event" and hands off; not one of them
-- knows what an event is. That knowledge lives in `notification_events_for` alone, which is why these
-- cannot drift away from the feed the way 0088 and 0092 drifted away from friends.
create or replace function public.push_tg_squad_join_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_owner uuid;
begin
  if tg_op = 'INSERT' then
    select owner_id into v_owner from public.squads where id = new.squad_id;
    perform public.push_enqueue_for(v_owner);
  else
    -- decided: the athlete who asked now has an answer
    perform public.push_enqueue_for(new.user_id);
  end if;
  return null;
end;
$$;

drop trigger if exists push_squad_join_requests on public.squad_join_requests;
create trigger push_squad_join_requests
  after insert or update of status on public.squad_join_requests
  for each row execute function public.push_tg_squad_join_requests();

create or replace function public.push_tg_squad_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.squads where id = new.squad_id;
  perform public.push_enqueue_for(v_owner);
  return null;
end;
$$;

drop trigger if exists push_squad_members on public.squad_members;
create trigger push_squad_members
  after insert on public.squad_members
  for each row execute function public.push_tg_squad_members();

create or replace function public.push_tg_friendships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'PENDING' then
    -- the side that did not ask
    perform public.push_enqueue_for(case when new.low_id = new.requested_by then new.high_id else new.low_id end);
  elsif new.status = 'ACCEPTED' then
    -- only the original asker is told; there is no decline event, by design (0073)
    perform public.push_enqueue_for(new.requested_by);
  end if;
  return null;
end;
$$;

drop trigger if exists push_friendships on public.friendships;
create trigger push_friendships
  after insert or update of status on public.friendships
  for each row execute function public.push_tg_friendships();

create or replace function public.push_tg_challenges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid;
begin
  if new.context = 'FRIENDS' and new.state = 'ENROLLMENT' and new.invited_ids is not null then
    foreach v_user in array new.invited_ids loop
      perform public.push_enqueue_for(v_user);
    end loop;
  end if;
  return null;
end;
$$;

drop trigger if exists push_challenges on public.challenges;
create trigger push_challenges
  after insert or update of state, invited_ids on public.challenges
  for each row execute function public.push_tg_challenges();

create or replace function public.push_tg_workout_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.push_enqueue_for(new.to_id);
  return null;
end;
$$;

drop trigger if exists push_workout_invites on public.workout_invites;
create trigger push_workout_invites
  after insert on public.workout_invites
  for each row execute function public.push_tg_workout_invites();

create or replace function public.push_tg_program_shares()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.push_enqueue_for(new.to_id);
  return null;
end;
$$;

drop trigger if exists push_program_shares on public.program_shares;
create trigger push_program_shares
  after insert on public.program_shares
  for each row execute function public.push_tg_program_shares();

-- ── The sender ───────────────────────────────────────────────────────────────
-- Postgres sends this itself, via pg_net. There is no Edge Function because there is no Supabase CLI and
-- no service key in this project — everything here has to be applicable by pasting SQL into the
-- dashboard, and this is.
--
-- Expo's push endpoint needs no credential for a standard send; the token IS the address. Nothing
-- secret is stored by this migration.
create or replace function public.push_drain(p_limit int default 50)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r          record;
  v_messages jsonb;
  v_req      bigint;
  v_sent     int := 0;
begin
  for r in
    select * from public.push_outbox
     where status = 'PENDING' and attempts < 5
     order by created_at
     limit greatest(p_limit, 0)
  loop
    -- One message per live device. A silent athlete with no token was never enqueued, so this is
    -- non-empty in the ordinary case; if every device was disabled between enqueue and drain it is not.
    select jsonb_agg(
             jsonb_build_object(
               'to', t.token,
               'title', r.title,
               'body', r.body,
               'sound', 'default',
               -- `kind` + the ids are what the client routes on, through the same `destinationFor`
               -- the inbox row uses. `route` rides along for auditing and support, not for navigation.
               'data', jsonb_build_object(
                 'kind', r.kind,
                 'route', r.route,
                 'outboxId', r.id,
                 'squadId', r.squad_id,
                 'actorId', r.actor_id,
                 'challengeId', r.challenge_id,
                 'inviteId', r.invite_id,
                 'shareId', r.share_id
               )
             )
           )
      into v_messages
      from public.push_tokens t
     where t.user_id = r.user_id and t.disabled_at is null;

    if v_messages is null then
      update public.push_outbox
         set status = 'FAILED', attempts = attempts + 1, error = 'no active device'
       where id = r.id;
      continue;
    end if;

    select net.http_post(
             url     := 'https://exp.host/--/api/v2/push/send',
             headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
             body    := v_messages
           )
      into v_req;

    update public.push_outbox
       set status = 'SENT', sent_at = now(), attempts = attempts + 1, request_id = v_req
     where id = r.id;

    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

-- Reads back what Expo said and retires tokens it rejected. `DeviceNotRegistered` is the one that
-- matters: the app was deleted, and every future send to that token is wasted until it is disabled.
create or replace function public.push_reconcile(p_limit int default 200)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r       record;
  v_body  jsonb;
  v_item  jsonb;
  v_idx   int;
  v_token text;
  v_fixed int := 0;
begin
  for r in
    select o.id, o.user_id, o.request_id
      from public.push_outbox o
     where o.status = 'SENT' and o.request_id is not null and o.error is null
       -- pg_net prunes `net._http_response` (6h by default). Past that the answer is gone for good, and
       -- without this cutoff those rows would be re-read on every pass forever, growing without bound.
       and o.sent_at > now() - interval '6 hours'
     order by o.sent_at
     limit greatest(p_limit, 0)
  loop
    select (resp.content)::jsonb into v_body
      from net._http_response resp
     where resp.id = r.request_id and resp.status_code is not null;

    continue when v_body is null;

    v_idx := 0;
    for v_item in select * from jsonb_array_elements(coalesce(v_body -> 'data', '[]'::jsonb)) loop
      if v_item ->> 'status' = 'error' then
        -- The response array is positional against the messages posted, which were ordered by token.
        select t.token into v_token
          from public.push_tokens t
         where t.user_id = r.user_id and t.disabled_at is null
         offset v_idx limit 1;

        if v_item -> 'details' ->> 'error' = 'DeviceNotRegistered' and v_token is not null then
          update public.push_tokens set disabled_at = now() where token = v_token;
        end if;

        update public.push_outbox set error = v_item ->> 'message' where id = r.id;
        v_fixed := v_fixed + 1;
      end if;
      v_idx := v_idx + 1;
    end loop;

    -- Mark it examined so it is not re-read forever.
    update public.push_outbox set error = coalesce(error, '') where id = r.id;
  end loop;

  return v_fixed;
end;
$$;

-- ── Schedule ─────────────────────────────────────────────────────────────────
-- Every minute. The trigger has already filed the row the instant the fact became true, so this is a
-- pipe, not a poll — the latency an athlete feels is the drain interval, not a scan.
select cron.unschedule('forge-push-drain') where exists (select 1 from cron.job where jobname = 'forge-push-drain');
select cron.schedule('forge-push-drain', '* * * * *', $cron$ select public.push_drain(50); $cron$);

select cron.unschedule('forge-push-reconcile') where exists (select 1 from cron.job where jobname = 'forge-push-reconcile');
select cron.schedule('forge-push-reconcile', '*/5 * * * *', $cron$ select public.push_reconcile(200); $cron$);

-- ── Grants ───────────────────────────────────────────────────────────────────
--
-- ⚠ REVOKE FROM PUBLIC, not from `authenticated`. Postgres grants EXECUTE to PUBLIC on every new
-- function by default, and revoking from a role that never held a direct grant removes nothing — the
-- function stays callable through PUBLIC. Every revoke below is deliberately `from public`.
--
-- `notification_events_for` is the one that matters. It is SECURITY DEFINER and takes ANY user id, so
-- left callable it would hand any signed-in athlete every notification event belonging to anyone else:
-- their friend requests, their squad invitations, their competitions. It replaced a function that could
-- only ever answer for `auth.uid()`, and that safety came from the missing parameter, not from RLS.
revoke execute on function public.notification_events_for(uuid) from public;
revoke execute on function public.push_enqueue_for(uuid) from public;
revoke execute on function public.push_drain(int) from public;
revoke execute on function public.push_reconcile(int) from public;

-- The viewer's wrapper stays reachable: it pins auth.uid() itself and can answer for nobody else.
grant execute on function public.notification_events() to authenticated;
grant execute on function public.push_register_token(text, text) to authenticated;
grant execute on function public.push_unregister_token(text) to authenticated;

comment on table public.push_outbox is
  'The delivery ledger — the ONLY stored part of the notification system. The feed itself stays derived (notification_events_for), because a derived notification cannot outlive the fact behind it. A push can: once delivered it cannot be withdrawn, so it needs a record that it happened. Deduped by (user, kind, event_at, subject) so re-scanning is free.';

comment on table public.push_tokens is
  'Expo push tokens, one row per device. Disabled rather than deleted when Expo answers DeviceNotRegistered, so a reinstall handing back the same token simply revives it.';


-- ###############################################################################################
-- ##  SECTION: pending-0121.sql
-- ###############################################################################################

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migration 0121 (workout join requests)
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- ⚠ ORDER MATTERS. Apply in this sequence and do not skip:
--     pending-0119.sql → pending-0120.sql → THIS FILE → pending-0122.sql
--   0121 rebuilds `notification_events_for` from 0120's eight-branch body plus one. Running it before
--   0120 would replace a function that does not exist yet with a body referencing `push_pref_key`,
--   which 0120 creates.
--
-- ⚠ THIS ADDS A NINTH NOTIFICATION BRANCH. The client must ship with it: `workout_join_request` has to
--   be in `NotificationKind`, in the `KINDS` runtime array, in `PUSH_KIND_PREF`, in `destinationFor`
--   and in all five per-kind sites in `/inbox`. An unknown kind is silently dropped by `asKind`, so a
--   database ahead of the app loses the row rather than erroring.
--
-- Body below is byte-identical to supabase/migrations/0121_workout_join_requests.sql.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0121: joining a workout that is already under way
--
-- ══ WHAT THIS IS FOR ══
--
-- PO review: *"Workout together — in the middle of a workout you should be able to invite someone and
-- have them join where you're at in that workout. Or if someone sees you working out and wants to join
-- they can click 'join' on the active tab (right now it says view and it doesn't really benefit
-- anything) and it will notify the person working out asking if they accept the person joining."*
--
-- Two arrows, one relationship. 0092 built the first — I ask you to train. This adds the second — I ask
-- to join what you are ALREADY doing — and the fact that makes either of them mean "together": WHERE in
-- the session the guest opens.
--
-- ══ WHY THE SAME TABLE, AND NOT A NEW ONE ══
--
-- A `workout_join_requests` table would duplicate five decisions already made here: the friends-or-
-- squad-mates predicate on insert, the two-party read policy, the recipient-decides update policy, the
-- either-party delete, and the `workout_invite()` reader. Five copies of one rule is how a schema comes
-- to disagree with itself. The row is the same two-party object; only the direction of the ask changes,
-- and the existing policies already say the right thing about it:
--
--   · insert requires `from_id = auth.uid()` + friend-or-squad-mate → the ASKER inserts. Correct.
--   · update is `using (to_id = auth.uid())`                       → the HOST accepts, and writes the
--                                                                    snapshot in the same statement.
--   · delete allows either party                                   → withdraw and decline both work.
--
-- ══ WHY THE SNAPSHOT IS WRITTEN AT ACCEPT, BY THE HOST ══
--
-- Not at request time: the asker cannot know the shape of a session they are not in. And NOT mirrored
-- onto `profiles` beside `training_since` — that would be a write on every exercise navigation, by
-- every athlete training, forever, to serve an event that happens rarely; and 0086's own header argues
-- those two columns are for ONE FACT, not a session. On the row, it inherits this table's RLS instead of
-- needing a fresh audience decision, and it is written once, at the one moment the data exists.
--
-- ══ NO 'DECLINED' STATUS ══
--
-- 0092 is explicit: declining DELETES the row, exactly as a declined friend request does (0073), so
-- nothing anywhere records that someone said no. Adding a tombstone here would contradict a documented
-- anti-shame rule on the very table that states it. The gap that leaves — the asker is waiting and is
-- not the actor — is closed by making the request self-expiring against the host's presence instead:
-- see branch 9.
--
-- ⚠ NINE BRANCHES after this migration. 0120 had eight. `notification_events_for` is rebuilt from
--   0120's body plus one, and it is rebuilt with CREATE OR REPLACE rather than DROP + CREATE, because
--   0120 line 663 revokes EXECUTE on it FROM PUBLIC and a drop would reset that grant and silently
--   re-open the SECURITY DEFINER escalation that revoke exists to close. The return shape is unchanged,
--   so 42P13 does not apply.
--
-- Depends on 0086 (training presence), 0092/0093 (workout_invites), 0120 (push). Idempotent.
-- RUN AFTER 0120.

-- ── The two new columns ──────────────────────────────────────────────────────

alter table public.workout_invites
  add column if not exists kind text not null default 'INVITE';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workout_invites_kind_check') then
    alter table public.workout_invites
      add constraint workout_invites_kind_check check (kind in ('INVITE', 'JOIN_REQUEST'));
  end if;
end $$;

alter table public.workout_invites
  add column if not exists start_index int not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workout_invites_start_index_check') then
    alter table public.workout_invites
      add constraint workout_invites_start_index_check check (start_index >= 0);
  end if;
end $$;

comment on column public.workout_invites.kind is
  'INVITE = I am asking you to train (from_id invites to_id). JOIN_REQUEST = I am asking to join the session you are ALREADY in (from_id asks, to_id is the host). Same two-party row and the same policies, because both already say "the recipient decides". A JOIN_REQUEST carries no shape when it is inserted — the asker cannot know it — so exercises/start_index are written by the host''s accepting UPDATE.';

comment on column public.workout_invites.start_index is
  'Which exercise of `exercises` the guest opens on. 0 for an ordinary invitation. For an accepted JOIN_REQUEST it is where the host actually was, read off their live session at accept time — the difference between "do this workout too" and "join me".';

create index if not exists workout_invites_to_kind
  on public.workout_invites (to_id, kind, status, created_at desc);

-- ── The union: branch 7 narrowed, branch 9 added ─────────────────────────────
-- ⚠ CREATE OR REPLACE, NEVER DROP. See the header.
create or replace function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 1
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = p_user and q.status = 'pending'

  union all
  -- 2
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = p_user and m.user_id <> p_user

  union all
  -- 3
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = p_user
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all
  -- 4 (0073, restored 0109)
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and p_user in (f.low_id, f.high_id)
     and f.requested_by <> p_user

  union all
  -- 5 (0073, restored 0109)
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = p_user then f.high_id else f.low_id end,
         null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = p_user

  union all
  -- 6
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and p_user = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = p_user
     )

  union all
  -- 7 — NARROWED BY 0121. Without `kind = 'INVITE'` every join request would also render here: wrong
  --     wording, wrong screen state, wrong push copy, and two rows in the inbox for one ask.
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
   where i.to_id = p_user and i.status = 'PENDING' and i.kind = 'INVITE'

  union all
  -- 8 (0110)
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id
    from public.program_shares ps
   where ps.to_id = p_user and ps.status = 'PENDING'

  union all
  -- 9 (0121) — someone is standing in a gym wanting to join the session you are in RIGHT NOW.
  --
  -- ANCHORED TO THE HOST'S OWN PRESENCE, deliberately, and it is the only branch whose subject is a live
  -- fact rather than a stored one. It has to inherit that fact's mortality: once the host has stopped
  -- training, the ask is no longer answerable, and a notification that outlived the workout it is about
  -- would be the first one in this schema able to lie. Same four-hour ceiling `training_now()` applies
  -- (0086), for the same reason — and it is also what replaces a DECLINED tombstone, since a request
  -- nobody answers stops existing on its own.
  select 'workout_join_request'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
    join public.profiles h on h.id = i.to_id
   where i.to_id = p_user
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING'
     and h.training_since is not null
     and h.training_since > now() - interval '4 hours';
$$;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. NINE branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared, workout_join_request. Read by notification_events() for the viewer and by push_enqueue_for() for the sender, so the two can never disagree. Rebuild from THIS body, never an older one — 0088 and 0092 each rebuilt from a predecessor and silently dropped both friend branches for two migrations. Use CREATE OR REPLACE: a DROP resets 0120''s revoke from PUBLIC and re-opens the SECURITY DEFINER escalation.';

-- ── Preferences: one new arm ─────────────────────────────────────────────────
-- `workout_join_request` reuses `workout_tags` on purpose. "Someone wants to train with me" is ONE idea
-- to an athlete; a tenth toggle for the reverse arrow would be a distinction only the schema cares about.
create or replace function public.push_pref_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'join_request'         then 'squad_activity'
    when 'member_joined'        then 'squad_activity'
    when 'request_approved'     then 'squad_activity'
    when 'friend_request'       then 'friend_requests'
    when 'friend_accepted'      then 'friend_requests'
    when 'challenge_invite'     then 'challenge_updates'
    when 'workout_invite'       then 'workout_tags'
    when 'workout_join_request' then 'workout_tags'
    when 'program_shared'       then 'program_shares'
    else null
  end;
$$;

-- `push_pref_default` is UNCHANGED: `workout_tags` is already an explicit `true` arm, which is what the
-- client-parity test requires of every value `push_pref_key` can return.

-- ── The sender: three new arms ───────────────────────────────────────────────
create or replace function public.push_enqueue_for(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baseline timestamptz;
  v_prefs    jsonb;
  v_count    int;
begin
  if p_user is null then return 0; end if;

  select p.push_baseline_at, coalesce(p.notif_prefs, '{}'::jsonb)
    into v_baseline, v_prefs
    from public.profiles p
   where p.id = p_user;

  if v_baseline is null then return 0; end if;
  if not exists (select 1 from public.push_tokens t where t.user_id = p_user and t.disabled_at is null) then
    return 0;
  end if;

  insert into public.push_outbox (
    user_id, kind, event_at, actor_id, squad_id, challenge_id, invite_id, share_id, title, body, route
  )
  select
    p_user, e.kind, e.at, e.actor_id, e.squad_id, e.challenge_id, e.invite_id, e.share_id,
    case e.kind
      when 'join_request'         then 'Squad request'
      when 'member_joined'        then 'New member'
      when 'request_approved'     then 'You''re in'
      when 'friend_request'       then 'Friend request'
      when 'friend_accepted'      then 'Friend request accepted'
      when 'challenge_invite'     then 'Challenge'
      when 'workout_invite'       then 'Train together'
      when 'workout_join_request' then 'Join request'
      when 'program_shared'       then 'Program shared'
    end,
    -- Worded to match `bodyFor` in src/app/inbox.tsx: the push and the row it opens say the same thing.
    case e.kind
      when 'join_request'         then coalesce(pr.name, 'An athlete') || ' asked to join ' || coalesce(sq.name, 'your squad')
      when 'member_joined'        then coalesce(pr.name, 'An athlete') || ' joined ' || coalesce(sq.name, 'your squad')
      when 'request_approved'     then 'You joined ' || coalesce(sq.name, 'the squad')
      when 'friend_request'       then coalesce(pr.name, 'An athlete') || ' wants to be friends'
      when 'friend_accepted'      then coalesce(pr.name, 'An athlete') || ' accepted your request'
      when 'challenge_invite'     then coalesce(pr.name, 'An athlete') || ' challenged you to ' || coalesce(ch.name, 'a competition')
      when 'workout_invite'       then coalesce(pr.name, 'An athlete') || ' wants to train ' || coalesce(wi.workout_name, 'together') || ' with you'
      when 'workout_join_request' then coalesce(pr.name, 'An athlete') || ' wants to join your workout'
      when 'program_shared'       then coalesce(pr.name, 'An athlete') || ' sent you ' || coalesce(sh.name, 'a program')
    end,
    -- The destinations `/inbox` already uses, so a tapped push and a tapped row land identically.
    case e.kind
      when 'workout_invite'       then '/workout-invite?id=' || e.invite_id::text
      when 'workout_join_request' then '/workout-invite?id=' || e.invite_id::text
      when 'program_shared'       then '/program-share/' || e.share_id::text
      when 'challenge_invite'     then '/challenge/' || e.challenge_id::text
      when 'join_request'         then '/squad-requests?id=' || e.squad_id::text
      when 'friend_request'       then '/athlete/' || e.actor_id::text
      when 'friend_accepted'      then '/athlete/' || e.actor_id::text
      else '/squad/' || e.squad_id::text
    end
    from public.notification_events_for(p_user) e
    left join public.profiles pr on pr.id = e.actor_id
    left join public.squads sq on sq.id = e.squad_id
    left join public.challenges ch on ch.id = e.challenge_id
    left join public.workout_invites wi on wi.id = e.invite_id
    left join public.program_shares sh on sh.id = e.share_id
   where e.at > v_baseline
     and public.push_prefs_allows(v_prefs, e.kind)
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- The existing `push_workout_invites` trigger already fires on this table for both kinds, so no new
-- trigger is needed: it answers only "who might have a new event", which is `new.to_id` either way.

-- ── The reader has to carry the new fields ───────────────────────────────────
-- Same function as 0093 plus `kind`, `start_index`, and the HOST's identity — a JOIN_REQUEST is read by
-- the asker too, and on that shape `from_id` is themselves, so without `to_*` they cannot say whose
-- workout they are waiting on.
create or replace function public.workout_invite(p_invite uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', i.id,
           'kind', i.kind,
           'from_id', i.from_id,
           'from_name', coalesce(p.name, 'Athlete'),
           'from_avatar_url', p.avatar_url,
           'to_id', i.to_id,
           'to_name', coalesce(h.name, 'Athlete'),
           'to_avatar_url', h.avatar_url,
           'workout_name', i.workout_name,
           'template_id', i.template_id,
           'exercises', i.exercises,
           'start_index', i.start_index,
           'template_summary', case
             when jsonb_array_length(i.exercises) > 0 then jsonb_build_object(
               'lifts', jsonb_array_length(i.exercises),
               'sets', (select coalesce(sum((e->>'sets')::int), 0) from jsonb_array_elements(i.exercises) e)
             )
             else null
           end,
           'note', i.note,
           'status', i.status,
           'created_at', i.created_at,
           'accepted_at', i.accepted_at
         )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
    join public.profiles h on h.id = i.to_id
   where i.id = p_invite
     and (i.to_id = auth.uid() or i.from_id = auth.uid());
$$;

-- ── The host's pending asks, for the in-workout banner ───────────────────────
-- A thin, indexed read (workout_invites_to_kind) polled every 20 seconds while a session is active.
-- It exists rather than a raw select so the presence ceiling is applied in ONE place — the banner and
-- the notification branch must never disagree about whether an ask is still live.
create or replace function public.pending_join_requests()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', i.id,
      'from_id', i.from_id,
      'from_name', coalesce(p.name, 'Athlete'),
      'from_avatar_url', p.avatar_url,
      'note', i.note,
      'created_at', i.created_at
    ) order by i.created_at),
    '[]'::jsonb
  )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
   where i.to_id = auth.uid()
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING';
$$;

comment on function public.pending_join_requests() is
  'Join requests waiting on the caller, for the in-workout banner. No presence filter here: the caller IS the host and is by definition training when they poll this, and applying the four-hour ceiling would hide an ask from someone standing right there in a session older than four hours.';

-- ── Grants ───────────────────────────────────────────────────────────────────
--
-- ⚠ `notification_events_for` IS DELIBERATELY NOT GRANTED TO ANYONE. It is SECURITY DEFINER and takes
-- ANY user id, so a direct grant would hand every signed-in athlete everyone else's notification
-- events. It is reached only through `notification_events()` (which pins `auth.uid()`) and
-- `push_enqueue_for` (which is itself SECURITY DEFINER). 0120 revoked it from PUBLIC for exactly this
-- reason; CREATE OR REPLACE above preserved that, and the revoke is restated here so a future DROP in
-- this file cannot quietly undo it.
revoke execute on function public.notification_events_for(uuid) from public;

-- The new reader is the opposite case: it pins `auth.uid()` itself and can answer for nobody else.
revoke execute on function public.pending_join_requests() from public;
grant execute on function public.pending_join_requests() to authenticated;


-- ###############################################################################################
-- ##  SECTION: pending-0122.sql
-- ###############################################################################################

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migration 0122 (squad feed notifications)
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- ⚠ RUN 0121 FIRST. This rebuilds `notification_events_for` from 0121's NINE-branch body plus two.
--   Applied out of order it would silently delete `workout_join_request` — the exact fault 0088, 0092
--   and 0106 each shipped.
--
-- ⚠ TWO FAN-OUT BRANCHES. One squad post becomes one event per member. Read this migration's header
--   before changing the 14-day window: it is what stops the inbox becoming a second feed and what stops
--   `push_enqueue_for` re-scanning a squad's whole history once per member, inside the insert.
--
-- ⚠ THE LAST STATEMENT TOUCHES `storage.buckets`. If the dashboard role cannot update it, set the
--   `squad-media` limit by hand in Storage → Buckets → squad-media → 50 MB. Everything above it is
--   independent and will already have applied.
--
-- Body below is byte-identical to supabase/migrations/0122_squad_feed_notifications.sql.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0122: the Squad Feed finally notifies anybody
--
-- ══ WHAT THIS CLOSES ══
--
-- PO review: *"Notifications should be when someone in the squad has posted something or checks in. Or
-- friend request or squad invite or different things that matter like that."*
--
-- Friend requests already worked (branch 4). Squad posts and check-ins did not, and the toggle that
-- claimed to control them — `squad_feed`, "Squad Posts & Activity" — has been sitting in Settings since
-- 0022 with nothing behind it: no branch, no trigger, no route. Switching it on did nothing at all, and
-- had done nothing for a hundred migrations.
--
-- ══ THESE ARE THE FIRST FAN-OUT BRANCHES, AND THAT IS A REAL DIFFERENCE ══
--
-- Every branch before these answers "a row ABOUT ME": a pending request, a decided one, an invitation
-- aimed at me. They are self-limiting — one row per relationship, and most of them vanish when answered.
-- `squad_posts` and `squad_checkins` are append-only and unbounded, and joining through `squad_members`
-- multiplies each row by the size of the squad. Three things break if that goes in unqualified:
--
--   1. THE INBOX BECOMES A SECOND FEED. `notification_feed` takes 50 rows ordered by time; one chatty
--      squad fills every slot and pushes a friend request off the screen entirely.
--   2. THE BELL LIES BY VOLUME. `notification_unread_count()` has no limit at all. "127" is not
--      information, and the athlete stops reading the number.
--   3. THE SENDER GOES QUADRATIC. `push_enqueue_for` re-scans the WHOLE union per call, and one post in
--      a twenty-person squad is twenty calls — each scanning every squad post that member can see, from
--      the beginning of time, inside the insert's transaction. `profiles.push_baseline_at` bounds what
--      gets ENQUEUED; it does not bound what gets SCANNED, and it does nothing for the inbox.
--
-- ══ THE ANSWER: A 14-DAY WINDOW, IN THE UNION ══
--
-- One predicate, at the one place the definition lives, and therefore hit by the viewer and the sender
-- alike because they read the same function. It bounds the inbox, the unread count and the enqueue scan
-- together. The justification is not merely technical: a squad post from three weeks ago is not news.
-- The FEED is where it lives; the inbox is for things aimed at you, and these two are the closest the
-- inbox comes to ambient. Both supporting indexes already exist (`squad_posts_squad` from 0041,
-- `squad_checkins_recent` from 0049).
--
-- Residual risk, recorded honestly: a very chatty squad can still dominate fourteen days of one
-- member's inbox. A per-squad cap would bound that properly and a `union all` cannot express one
-- cleanly. Fourteen days is the pragmatic line, not the perfect one.
--
-- ══ ROUTING ══
--
-- Both go to `/squad/[id]` on the `squad_id` the union already carries. For a check-in that is not even
-- a compromise — there is no per-check-in route, they are watched in the squad screen's story viewer.
-- For a post it lands one tap from the post. Adding a `post_id` column to the union would touch eleven
-- files (the union, both wrappers, `notification_feed`, the `push_outbox` column AND its unique-index
-- expression, `push_drain`, `targetFrom`, two client types, `destinationFor`, `FeedRow`); it is a clean
-- follow-up when it is worth that, and today it is not.
--
-- ⚠ ELEVEN BRANCHES after this migration. 0120 had eight; 0121 made it nine. THIS BODY IS REBUILT FROM
--   0121'S, NOT 0120'S. Rebuilding from a stale predecessor has silently deleted a shipped feature three
--   times in this schema (0088 and 0092 each dropped both friend branches; 0106 dropped program
--   graduation). Count them before editing this again.
-- ⚠ CREATE OR REPLACE, NEVER DROP — a drop resets 0120's revoke from PUBLIC and re-opens the
--   SECURITY DEFINER escalation. The return shape is unchanged, so 42P13 does not apply.
--
-- Also folds in the `squad-media` bucket limits, so the client's pre-flight size guard and the server's
-- ceiling are set in one migration and cannot drift apart.
--
-- Depends on 0041 (squad_posts), 0049 (squad_checkins), 0120 (push), 0121 (branch 9). Idempotent.
-- RUN AFTER 0121.

-- ── The union: branches 10 and 11 ────────────────────────────────────────────
create or replace function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 1
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = p_user and q.status = 'pending'

  union all
  -- 2
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = p_user and m.user_id <> p_user

  union all
  -- 3
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = p_user
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all
  -- 4 (0073, restored 0109)
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and p_user in (f.low_id, f.high_id)
     and f.requested_by <> p_user

  union all
  -- 5 (0073, restored 0109)
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = p_user then f.high_id else f.low_id end,
         null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = p_user

  union all
  -- 6
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and p_user = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = p_user
     )

  union all
  -- 7 (narrowed 0121)
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
   where i.to_id = p_user and i.status = 'PENDING' and i.kind = 'INVITE'

  union all
  -- 8 (0110)
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id
    from public.program_shares ps
   where ps.to_id = p_user and ps.status = 'PENDING'

  union all
  -- 9 (0121)
  select 'workout_join_request'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
    join public.profiles h on h.id = i.to_id
   where i.to_id = p_user
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING'
     and h.training_since is not null
     and h.training_since > now() - interval '4 hours'

  union all
  -- 10 (0122) — THE FIRST FAN-OUT BRANCH. Windowed at 14 days; see this migration's header for why
  --     that predicate is load-bearing rather than tidy.
  select 'squad_post'::text, sp.created_at, sp.squad_id, sp.author_id, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.author_id <> p_user
     and sp.created_at > now() - interval '14 days'

  union all
  -- 11 (0122)
  select 'squad_checkin'::text, sc.created_at, sc.squad_id, sc.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_checkins sc
    join public.squad_members m on m.squad_id = sc.squad_id and m.user_id = p_user
   where sc.user_id <> p_user
     and sc.created_at > now() - interval '14 days';
$$;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. ELEVEN branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared, workout_join_request, squad_post, squad_checkin. The last two are FAN-OUT — one row becomes one event per squad member — and are windowed at 14 days so the inbox does not become a second feed and push_enqueue_for does not re-scan a squad''s whole history per member. Read by notification_events() for the viewer and by push_enqueue_for() for the sender. Rebuild from THIS body, never an older one — 0088, 0092 and 0106 each rebuilt from a predecessor and silently dropped a shipped feature. Use CREATE OR REPLACE: a DROP resets 0120''s revoke from PUBLIC.';

-- ── Preferences: the inert toggle becomes live ───────────────────────────────
create or replace function public.push_pref_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'join_request'         then 'squad_activity'
    when 'member_joined'        then 'squad_activity'
    when 'request_approved'     then 'squad_activity'
    when 'friend_request'       then 'friend_requests'
    when 'friend_accepted'      then 'friend_requests'
    when 'challenge_invite'     then 'challenge_updates'
    when 'workout_invite'       then 'workout_tags'
    when 'workout_join_request' then 'workout_tags'
    when 'program_shared'       then 'program_shares'
    when 'squad_post'           then 'squad_feed'
    when 'squad_checkin'        then 'squad_feed'
    else null
  end;
$$;

-- ⚠ `squad_feed` needs an EXPLICIT arm here. It had none and fell to the catch-all `false` — which
-- happens to be the right value, but the client-parity test asserts every key `push_pref_key` can
-- return has an explicit default, precisely so "right by accident" cannot survive a change to the
-- catch-all. Default stays false: squad activity is ambient (P-5 §3.2), and a fan-out branch defaulting
-- to ON would push a twenty-person squad's whole morning at everyone in it.
create or replace function public.push_pref_default(p_key text)
returns boolean
language sql
immutable
as $$
  select case p_key
    when 'squad_activity'    then false
    when 'squad_feed'        then false
    when 'friend_requests'   then true
    when 'challenge_updates' then false
    when 'workout_tags'      then true
    when 'program_shares'    then true
    else false
  end;
$$;

-- ── The sender: two new arms ─────────────────────────────────────────────────
create or replace function public.push_enqueue_for(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baseline timestamptz;
  v_prefs    jsonb;
  v_count    int;
begin
  if p_user is null then return 0; end if;

  select p.push_baseline_at, coalesce(p.notif_prefs, '{}'::jsonb)
    into v_baseline, v_prefs
    from public.profiles p
   where p.id = p_user;

  if v_baseline is null then return 0; end if;
  if not exists (select 1 from public.push_tokens t where t.user_id = p_user and t.disabled_at is null) then
    return 0;
  end if;

  insert into public.push_outbox (
    user_id, kind, event_at, actor_id, squad_id, challenge_id, invite_id, share_id, title, body, route
  )
  select
    p_user, e.kind, e.at, e.actor_id, e.squad_id, e.challenge_id, e.invite_id, e.share_id,
    case e.kind
      when 'join_request'         then 'Squad request'
      when 'member_joined'        then 'New member'
      when 'request_approved'     then 'You''re in'
      when 'friend_request'       then 'Friend request'
      when 'friend_accepted'      then 'Friend request accepted'
      when 'challenge_invite'     then 'Challenge'
      when 'workout_invite'       then 'Train together'
      when 'workout_join_request' then 'Join request'
      when 'program_shared'       then 'Program shared'
      when 'squad_post'           then 'New in ' || coalesce(sq.name, 'your squad')
      when 'squad_checkin'        then 'Check-in'
    end,
    -- Worded to match `bodyFor` in src/app/inbox.tsx: the push and the row it opens say the same thing.
    case e.kind
      when 'join_request'         then coalesce(pr.name, 'An athlete') || ' asked to join ' || coalesce(sq.name, 'your squad')
      when 'member_joined'        then coalesce(pr.name, 'An athlete') || ' joined ' || coalesce(sq.name, 'your squad')
      when 'request_approved'     then 'You joined ' || coalesce(sq.name, 'the squad')
      when 'friend_request'       then coalesce(pr.name, 'An athlete') || ' wants to be friends'
      when 'friend_accepted'      then coalesce(pr.name, 'An athlete') || ' accepted your request'
      when 'challenge_invite'     then coalesce(pr.name, 'An athlete') || ' challenged you to ' || coalesce(ch.name, 'a competition')
      when 'workout_invite'       then coalesce(pr.name, 'An athlete') || ' wants to train ' || coalesce(wi.workout_name, 'together') || ' with you'
      when 'workout_join_request' then coalesce(pr.name, 'An athlete') || ' wants to join your workout'
      when 'program_shared'       then coalesce(pr.name, 'An athlete') || ' sent you ' || coalesce(sh.name, 'a program')
      when 'squad_post'           then coalesce(pr.name, 'An athlete') || ' posted in ' || coalesce(sq.name, 'your squad')
      when 'squad_checkin'        then coalesce(pr.name, 'An athlete') || ' checked in to ' || coalesce(sq.name, 'your squad')
    end,
    -- The destinations `/inbox` already uses, so a tapped push and a tapped row land identically. Both
    -- new kinds fall to the `else` arm, which is already `/squad/<id>` — no new case needed.
    case e.kind
      when 'workout_invite'       then '/workout-invite?id=' || e.invite_id::text
      when 'workout_join_request' then '/workout-invite?id=' || e.invite_id::text
      when 'program_shared'       then '/program-share/' || e.share_id::text
      when 'challenge_invite'     then '/challenge/' || e.challenge_id::text
      when 'join_request'         then '/squad-requests?id=' || e.squad_id::text
      when 'friend_request'       then '/athlete/' || e.actor_id::text
      when 'friend_accepted'      then '/athlete/' || e.actor_id::text
      else '/squad/' || e.squad_id::text
    end
    from public.notification_events_for(p_user) e
    left join public.profiles pr on pr.id = e.actor_id
    left join public.squads sq on sq.id = e.squad_id
    left join public.challenges ch on ch.id = e.challenge_id
    left join public.workout_invites wi on wi.id = e.invite_id
    left join public.program_shares sh on sh.id = e.share_id
   where e.at > v_baseline
     and public.push_prefs_allows(v_prefs, e.kind)
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── Triggers ─────────────────────────────────────────────────────────────────
--
-- Two functions rather than one, because `squad_posts` names its author `author_id` and
-- `squad_checkins` names it `user_id`, and `NEW` is not polymorphic across tables in plpgsql. Each is a
-- five-line loop, and each is as deliberately stupid as 0120's: it answers only "who might have a new
-- event" and hands off. The author is excluded by the union's own WHERE, never here — a trigger that
-- started deciding what an event IS would be the first step back towards the drift 0120 removed.
create or replace function public.push_tg_squad_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid;
begin
  for v_user in
    select m.user_id from public.squad_members m
     where m.squad_id = new.squad_id and m.user_id <> new.author_id
  loop
    perform public.push_enqueue_for(v_user);
  end loop;
  return null;
end;
$$;

drop trigger if exists push_squad_posts on public.squad_posts;
create trigger push_squad_posts
  after insert on public.squad_posts
  for each row execute function public.push_tg_squad_posts();

create or replace function public.push_tg_squad_checkins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid;
begin
  for v_user in
    select m.user_id from public.squad_members m
     where m.squad_id = new.squad_id and m.user_id <> new.user_id
  loop
    perform public.push_enqueue_for(v_user);
  end loop;
  return null;
end;
$$;

drop trigger if exists push_squad_checkins on public.squad_checkins;
create trigger push_squad_checkins
  after insert on public.squad_checkins
  for each row execute function public.push_tg_squad_checkins();

-- ── The check-in bucket gets an actual ceiling ───────────────────────────────
--
-- `squad-media` was created with (id, name, public) only (0042) — no `file_size_limit` — so the
-- project-global default applied and the client had no idea what it was. Set here, in the same
-- migration, so the 50 MB the client refuses at and the size the server refuses at are one number.
-- Matches `MAX_CHECKIN_BYTES` in src/lib/storage-upload.ts.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
 where id = 'squad-media';

-- ── Grants ───────────────────────────────────────────────────────────────────
-- Restated for the same reason 0121 restates it: `notification_events_for` is SECURITY DEFINER over any
-- user id and must never be directly callable. Reached only through `notification_events()` and
-- `push_enqueue_for`, both of which pin the caller themselves.
revoke execute on function public.notification_events_for(uuid) from public;
