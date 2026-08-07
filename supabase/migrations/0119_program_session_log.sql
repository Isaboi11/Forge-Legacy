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
