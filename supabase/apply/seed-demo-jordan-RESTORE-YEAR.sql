-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- FILM SEED · RESTORE THE YEAR · one paste after filming shot 3   (NOT a migration — data for the hero film)
-- = seed-demo-jordan-2-REDO.sql (removes the program Holt built in the take) + 3-mar + 4-year + 4b-legacy, verbatim,
--   each in its own transaction. The editor shows only the LAST result: stage 4b's report (7 accomplishments, 6 pins).
--   If any part fails, everything before it is already applied; fix and paste this whole file again (each part is safe
--   to re-run).
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- FILM SEED · STAGE 2 REDO · demo athlete Jordan back to the end of Mon Feb 9   (NOT a migration — data for the hero film)
--
-- ⚠ USE THIS TO RE-FILM SHOT 3 (Holt, Tue Feb 10) AFTER STAGES 3–4 ARE IN. It is stage 2 with three changes:
--   1. It runs when stage 3 or 4 is applied. Stage 2's rewind already deletes every row of Jordan's dated on/after
--      Jan 19, so no workout, PR, honor, session or accomplishment from a later stage survives.
--   2. It also undoes what stage 4 owns that is not dated: Chapters II and III are deleted, Chapter I is unsealed
--      (active again, no end date, no reflection), and the program is un-graduated (stage 4's own rewind block).
--   3. The program's plan is reset to the seeded one, so every earlier Holt edit (programs.structure, any week) is
--      gone and Week 6 Upper B is the original. The program row, its id and the stage-1 sessions are kept.
-- After filming: run THIS file once more (it removes the program Holt built in the take), then stage 3, then stage 4.
--
-- PASTE THE WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice.
--
-- Writes (Jordan only): 16 workouts (workouts / workout_exercises / workout_sets), their PR rows + ACCOMPLISHMENT
-- timeline events, program_sessions, honors via the real evaluate_honors() (backdated, celebrated), accomplishments, chapter counts, stored rank.
-- Side effects outside Jordan's rows: NONE. Triggers that fire are listed in film/SEED-NOTES.md; each is a no-op here
-- (no demo account has push_baseline_at or a push token, so push_enqueue_for files nothing). §2 asserts it.
--
-- Expected §3: 27 saved workouts, 20 PR rows, 17 honors, newest workout 2026-02-09-LA, stored rank Builder I, next program session = week 6 "Upper A".
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- Transaction-local settings. UTC is what PostgREST sessions use, so honor_metrics' date_trunc('week', …)
-- and ::date read exactly as they do when the app saves a workout.
set local statement_timeout = '15min';
set local lock_timeout = '15s';
set local timezone = 'UTC';
set local search_path = public, extensions;

-- Deterministic ids: every seeded row's id starts with 'f11de000' (md5 of a label for the rest), which is how
-- a later stage tells a seeded row from one the app wrote during a capture. pg_temp: nothing persists.
create or replace function pg_temp.fl_id(p text) returns uuid language sql immutable as $fn$
  select ('f11de000' || substr(md5('forge-film:' || p), 9, 4) || '4' || substr(md5('forge-film:' || p), 14, 3) || '8' || substr(md5('forge-film:' || p), 18, 15))::uuid
$fn$;

-- The six demo accounts, looked up by email. Every DELETE below is joined to this table.
create temp table fl_demo on commit drop as
select v.who, u.id, u.email::text as email
  from (values ('jordan', 'jordan.demo@forgelegacy.app'), ('dre', 'dre.demo@forgelegacy.app'), ('sam', 'sam.demo@forgelegacy.app'), ('alex', 'alex.demo@forgelegacy.app'), ('taylor', 'taylor.demo@forgelegacy.app'), ('morgan', 'morgan.demo@forgelegacy.app')) v(who, email)
  join auth.users u on lower(u.email) = v.email;

-- §2-guard (runs BEFORE anything is written or deleted): every account this file can touch must be a
-- '.demo@forgelegacy.app' address. A row for anyone else aborts the whole transaction.
do $$
begin
  if exists (select 1 from fl_demo d where d.email not like '%.demo@forgelegacy.app') then
    raise exception 'REFUSED: a targeted account is not a .demo@forgelegacy.app address — nothing was changed.';
  end if;
end $$;

-- §0 — PREFLIGHT. Stage 0 applied, previous stage applied, no later stage applied.
do $$
declare
  v_j uuid;
begin
  select d.id into v_j from fl_demo d where d.who = 'jordan';
  if v_j is null then raise exception 'jordan.demo@forgelegacy.app does not exist — paste seed-demo-jordan-0-accounts.sql first'; end if;
  if v_j <> pg_temp.fl_id('user:jordan') then raise exception 'jordan.demo@ exists with an id this seed did not create — run seed-demo-jordan-REMOVE.sql first'; end if;
  if (select count(*) from fl_demo) <> 6 then raise exception 'expected 6 demo accounts, found % — re-run stage 0', (select count(*) from fl_demo); end if;
  if not exists (select 1 from public.workouts w where w.id = pg_temp.fl_id('workout:2026-01-18-RUN')) then
    raise exception 'stage 1 is not applied (its last workout 2026-01-18-RUN is missing) — paste seed-demo-jordan-1-*.sql first';
  end if;
  -- REDO: a later stage being applied is expected — the rewind below removes it.
end $$;

-- ─── §1a · rewind ────────────────────────────────────────────────────────────────────────────────────────────
-- REWIND to the end of the previous stage, so a re-run replaces instead of duplicating, and anything the app
-- wrote during a capture (a finished live workout, its PR, a live honor) is removed. Two rules, both scoped to
-- Jordan: (a) any of his rows dated on/after this stage's start 2026-01-19 00:00:00-06; (b) any of his workout / PR / timeline /
-- program-session / accomplishment rows whose id is NOT a seeded 'f11de000…' id (i.e. written by the app).
-- Kept on purpose: the program row itself (Holt's Feb 10 change lives in programs.structure), Holt chat, consents.
delete from public.workouts w          using fl_demo d where d.who = 'jordan' and w.athlete_id = d.id
   and (w.started_at >= '2026-01-19 00:00:00-06' or w.id::text not like 'f11de000%');
delete from public.personal_records r  using fl_demo d where d.who = 'jordan' and r.athlete_id = d.id
   and (r.created_at >= '2026-01-19 00:00:00-06' or r.id::text not like 'f11de000%');
delete from public.timeline_events t   using fl_demo d where d.who = 'jordan' and t.athlete_id = d.id
   and (t.occurred_at >= '2026-01-19 00:00:00-06' or t.created_at >= '2026-01-19 00:00:00-06' or t.id::text not like 'f11de000%');
delete from public.honor_instances h   using fl_demo d where d.who = 'jordan' and h.athlete_id = d.id
   and h.awarded_at >= '2026-01-19 00:00:00-06';
delete from public.program_sessions ps using fl_demo d where d.who = 'jordan' and ps.athlete_id = d.id
   and (ps.created_at >= '2026-01-19 00:00:00-06' or ps.id::text not like 'f11de000%');
delete from public.accomplishments a   using fl_demo d where d.who = 'jordan' and a.athlete_id = d.id
   and (a.created_at >= '2026-01-19 00:00:00-06' or a.id::text not like 'f11de000%');
-- REDO: undo what stage 4 owns (its own rewind block, verbatim).
-- Stage 4 owns Chapters II and III, Chapter I's seal, and the graduation.
delete from public.chapters c using fl_demo d where d.who = 'jordan' and c.athlete_id = d.id
   and c.id in (pg_temp.fl_id('chapter:jordan:2'), pg_temp.fl_id('chapter:jordan:3'));
update public.chapters c set is_active = true, sealed_at = null, end_date = null, reflection = null
  from fl_demo d where d.who = 'jordan' and c.athlete_id = d.id and c.id = pg_temp.fl_id('chapter:jordan:1')
   and c.sealed_at is not null;
update public.programs p set state = 'active', ended_at = null, updated_at = p.created_at
  from fl_demo d where d.who = 'jordan' and p.athlete_id = d.id and p.id = pg_temp.fl_id('program:return-to-strength')
   and p.state = 'graduated';
-- REDO: Jordan's pins go too (stage 4b writes them; a pin is a soft reference that would outlive its row).
delete from public.pins p using fl_demo d where d.who = 'jordan' and p.athlete_id = d.id;
-- REDO: a program Holt built during a take is removed and "Return to Strength" runs again ("Start it anyway" ended it
-- early). workouts.program_id is ON DELETE SET NULL (0018) and program_sessions cascade (0119). Run this file again
-- after filming shot 3, before stage 3, so stage 3 finds the seeded program active.
delete from public.programs p using fl_demo d
 where d.who = 'jordan' and p.athlete_id = d.id and p.id <> pg_temp.fl_id('program:return-to-strength');
update public.programs p set state = 'active', ended_at = null, updated_at = p.created_at
  from fl_demo d where d.who = 'jordan' and p.athlete_id = d.id and p.id = pg_temp.fl_id('program:return-to-strength')
   and p.state <> 'active';
-- REDO: the plan back to the seeded one (drops every Holt edit). Row, id, lift maxes and sessions are kept.
update public.programs p set structure = $json${"name":"Return to Strength","weeks":12,"daysPerWeek":4,"vary":false,"days":[{"letter":"A","name":"Lower A","warmup":[],"cooldown":[],"main":[{"id":"xfl1a1","catalogKey":"barbell-back-squat","name":"Barbell Back Squat","equip":"Barbell","muscles":["Quadriceps","Glutes","Hamstrings","Rectus Abdominis"],"type":"","sets":5,"reps":5,"percentScheme":[54,74,82,90,90]},{"id":"xfl1a2","catalogKey":"barbell-romanian-deadlift","name":"Barbell Romanian Deadlift","equip":"Barbell","muscles":["Glutes","Erector Spinae","Rectus Abdominis","Adductors"],"type":"","sets":3,"reps":8},{"id":"xfl1a3","catalogKey":"dumbbell-split-squat","name":"Dumbbell Split Squat","equip":"Dumbbell","muscles":["Quadriceps","Glutes","Hamstrings","Rectus Abdominis"],"type":"","sets":3,"reps":8,"per":"leg"}]},{"letter":"B","name":"Upper A","warmup":[],"cooldown":[],"main":[{"id":"xfl1b1","catalogKey":"barbell-bench-press","name":"Barbell Bench Press","equip":"Barbell","muscles":["Chest","Triceps","Front Deltoids"],"type":"","sets":5,"reps":5},{"id":"xfl1b2","catalogKey":"barbell-bent-over-row","name":"Barbell Bent-Over Row","equip":"Barbell","muscles":["Upper Back","Latissimus Dorsi","Biceps","Rear Deltoids"],"type":"","sets":4,"reps":8},{"id":"xfl1b3","catalogKey":"pull-up","name":"Pull-Up","equip":"Bodyweight","muscles":["Latissimus Dorsi","Biceps","Upper Back"],"type":"","sets":3,"reps":8}]},{"letter":"C","name":"Upper B","warmup":[],"cooldown":[],"main":[{"id":"xfl1c1","catalogKey":"barbell-overhead-press","name":"Barbell Overhead Press","equip":"Barbell","muscles":["Front Deltoids","Triceps","Chest"],"type":"","sets":4,"reps":5},{"id":"xfl1c2","catalogKey":"barbell-bench-press","name":"Barbell Bench Press","equip":"Barbell","muscles":["Chest","Triceps","Front Deltoids"],"type":"","sets":3,"reps":8},{"id":"xfl1c3","catalogKey":"cable-face-pull","name":"Cable Face Pull","equip":"Cable Machine","muscles":["Rear Deltoids","Latissimus Dorsi","Biceps"],"type":"","sets":3,"reps":15}]},{"letter":"D","name":"Lower B","warmup":[],"cooldown":[],"main":[{"id":"xfl1d1","catalogKey":"barbell-back-squat","name":"Barbell Back Squat","equip":"Barbell","muscles":["Quadriceps","Glutes","Hamstrings","Rectus Abdominis"],"type":"","sets":4,"reps":5},{"id":"xfl1d2","catalogKey":"barbell-deadlift","name":"Barbell Deadlift","equip":"Barbell","muscles":["Glutes","Erector Spinae","Rectus Abdominis","Adductors"],"type":"","sets":3,"reps":5},{"id":"xfl1d3","catalogKey":"lying-leg-curl-machine","name":"Lying Leg Curl Machine","equip":"Selectorized Machine","muscles":["Hamstrings"],"type":"","sets":3,"reps":10}]}],"weekPlans":null}$json$::jsonb, updated_at = p.created_at
  from fl_demo d where d.who = 'jordan' and p.athlete_id = d.id and p.id = pg_temp.fl_id('program:return-to-strength');
-- chapters.workout_count is what save_workout keeps (0242:162) and what Home's "awaiting" check reads
-- (home-live.ts:28-46) — recount it from what is left.
update public.chapters c set workout_count = (select count(*) from public.workouts w where w.chapter_id = c.id)
  from fl_demo d where d.who = 'jordan' and c.athlete_id = d.id;

-- ─── §1c · replay ────────────────────────────────────────────────────────────────────────────────────────────
create temp table fl_ex (key text primary key, name text not null) on commit drop;
insert into fl_ex values
  ('barbell-back-squat', 'Barbell Back Squat'),
  ('barbell-romanian-deadlift', 'Barbell Romanian Deadlift'),
  ('dumbbell-split-squat', 'Dumbbell Split Squat'),
  ('barbell-bench-press', 'Barbell Bench Press'),
  ('barbell-bent-over-row', 'Barbell Bent-Over Row'),
  ('pull-up', 'Pull-Up'),
  ('barbell-overhead-press', 'Barbell Overhead Press'),
  ('cable-face-pull', 'Cable Face Pull'),
  ('barbell-deadlift', 'Barbell Deadlift'),
  ('lying-leg-curl-machine', 'Lying Leg Curl Machine');

-- One evaluate_honors() call, AS JORDAN, at a moment in his past — then the rows it wrote are moved to that moment.
--   · auth.uid() is read from request.jwt.claim(s) — set transaction-local, cleared straight after (the 0200 act-as shape).
--   · evaluate_honors('live_session') (0099:544) is exactly what save_workout calls (0242:242): it inserts
--     honor_instances and, for 'live_session', one HONOR_EARNED timeline_events row per honor. Nothing else is
--     written except archive_squad_goal() per squad, which is a no-op for a squad with no goal (0101:39).
--   · honor_metrics.account_days is current_date − profiles.created_at (0100), so for the length of the call
--     created_at is shifted to make Jordan exactly as old as he was at p_at, then put back.
--   · Every honor is marked celebrated at the moment it was earned EXCEPT '1,000 Pound Club' (club_1000):
--     that is the one ceremony the film records.
create or replace function pg_temp.fl_honors(p_j uuid, p_at timestamptz) returns int
language plpgsql as $fn$
declare
  v_signup timestamptz;
  v_n      int;
begin
  select u.created_at into v_signup from auth.users u where u.id = p_j;
  update public.profiles
     set created_at = v_signup + (current_date - (p_at at time zone 'UTC')::date) * interval '1 day'
   where id = p_j;

  perform set_config('request.jwt.claim.sub', p_j::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_j, 'role', 'authenticated')::text, true);
  perform public.evaluate_honors('live_session');
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);

  update public.profiles set created_at = v_signup where id = p_j;

  -- now() is the transaction's start time; no backdated row can equal it, so this touches only what was just written.
  update public.honor_instances h
     set awarded_at    = p_at,
         date_earned   = (p_at at time zone 'UTC')::date,
         celebrated_at = case when h.honor_type = 'club_1000' then null else p_at end
   where h.athlete_id = p_j and h.awarded_at = now();
  get diagnostics v_n = row_count;

  update public.timeline_events t
     set occurred_at = p_at,
         created_at  = p_at,
         id = pg_temp.fl_id('tl:honor:' || t.object_name || ':' || coalesce(t.chapter_id::text, '-'))
   where t.athlete_id = p_j and t.event_type = 'HONOR_EARNED' and t.created_at = now();

  return v_n;
end;
$fn$;

create temp table fl_events (
  ord int primary key, label text not null, kind text not null, at timestamptz not null, name text, dur_sec int,
  prog_week int, prog_day int, miles numeric, spec text,
  chapter_n int, next_n int, next_name text, next_start date, end_date date, reflection text, acc_date date, featured boolean
) on commit drop;

-- 16 workouts. Times are America/Chicago with an explicit offset (CST −06 until Sun Mar 8 2026, CDT −05 after).
insert into fl_events (ord, label, kind, at, name, dur_sec, prog_week, prog_day, miles, spec) values
  (  1, '2026-01-19-LA', 'lift', '2026-01-19 06:30:00-06', 'Lower A', 3879, 2, 0, null, 'barbell-back-squat 135x5 185x5 205x5 225x5*2 | barbell-romanian-deadlift 185x8*3 | dumbbell-split-squat 35x8*3'),
  (  3, '2026-01-20-UA', 'lift', '2026-01-20 06:30:00-06', 'Upper A', 3346, 2, 1, null, 'barbell-bench-press 135x5 185x3 225x5*3 | barbell-bent-over-row 140x8*4 | pull-up bwx8 bwx7 bwx6'),
  (  4, '2026-01-21-RUN', 'run', '2026-01-21 06:15:00-06', 'Run', 1804, null, null, 3.1, null),
  (  5, '2026-01-22-UB', 'lift', '2026-01-22 06:30:00-06', 'Upper B', 3130, 2, 2, null, 'barbell-overhead-press 125x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 40x15*3'),
  (  6, '2026-01-24-LB', 'lift', '2026-01-24 07:30:00-06', 'Lower B', 3864, 2, 3, null, 'barbell-back-squat 135x5 185x5 205x5*3 | barbell-deadlift 225x5 275x3 315x5 | lying-leg-curl-machine 90x10*3'),
  (  7, '2026-01-26-LA', 'lift', '2026-01-26 06:30:00-06', 'Lower A', 3902, 3, 0, null, 'barbell-back-squat 135x5 185x5 215x5 235x5*2 | barbell-romanian-deadlift 195x8*3 | dumbbell-split-squat 35x8*3'),
  (  8, '2026-01-27-UA', 'lift', '2026-01-27 06:30:00-06', 'Upper A', 3369, 3, 1, null, 'barbell-bench-press 135x5 185x3 225x5 225x4 225x3 | barbell-bent-over-row 140x8*4 | pull-up bwx8 bwx7 bwx6'),
  (  9, '2026-01-28-RUN', 'run', '2026-01-28 06:15:00-06', 'Run', 1801, null, null, 3.1, null),
  ( 10, '2026-01-29-UB', 'lift', '2026-01-29 06:30:00-06', 'Upper B', 3143, 3, 2, null, 'barbell-overhead-press 130x5*4 | barbell-bench-press 195x8*2 195x7 | cable-face-pull 40x15*3'),
  ( 11, '2026-01-31-LB', 'lift', '2026-01-31 07:30:00-06', 'Lower B', 3877, 3, 3, null, 'barbell-back-squat 135x5 185x5 215x5*3 | barbell-deadlift 225x5 285x3 325x5 | lying-leg-curl-machine 90x10*3'),
  ( 12, '2026-02-02-LA', 'lift', '2026-02-02 06:30:00-06', 'Lower A', 3975, 4, 0, null, 'barbell-back-squat 135x5 185x5 225x5 245x5*2 | barbell-romanian-deadlift 195x8*3 | dumbbell-split-squat 35x8*3'),
  ( 13, '2026-02-03-UA', 'lift', '2026-02-03 06:30:00-06', 'Upper A', 3442, 4, 1, null, 'barbell-bench-press 135x5 185x3 225x4*2 225x3 | barbell-bent-over-row 145x8*4 | pull-up bwx8 bwx7 bwx6'),
  ( 14, '2026-02-04-RUN', 'run', '2026-02-04 06:15:00-06', 'Run', 1853, null, null, 3.2, null),
  ( 15, '2026-02-05-UB', 'lift', '2026-02-05 06:30:00-06', 'Upper B', 3156, 4, 2, null, 'barbell-overhead-press 130x5*2 130x4*2 | barbell-bench-press 195x8 195x7 195x6 | cable-face-pull 40x15*3'),
  ( 16, '2026-02-07-LB', 'lift', '2026-02-07 07:30:00-06', 'Lower B', 3840, 4, 3, null, 'barbell-back-squat 135x5 185x5 225x5*3 | barbell-deadlift 225x5 285x3 335x5 | lying-leg-curl-machine 90x10*3'),
  ( 17, '2026-02-09-LA', 'lift', '2026-02-09 06:30:00-06', 'Lower A', 3688, 5, 0, null, 'barbell-back-squat 135x5 185x5 225x5 250x5*2 | barbell-romanian-deadlift 195x8*3 | dumbbell-split-squat 35x8*3');

insert into fl_events (ord, label, kind, at, name, chapter_n, acc_date, featured)
values (2, 'squat-225', 'acc', '2026-01-19 08:05:00-06', 'Back Squat 225 × 5', 1, '2026-01-19', false);

do $$
declare
  v_j     uuid := pg_temp.fl_id('user:jordan');
  v_prog  uuid := pg_temp.fl_id('program:return-to-strength');
  e       record;
  r       record;
  x       record;
  t       text;
  v_wid   uuid;
  v_weid  uuid;
  v_ch    uuid;
  v_saved timestamptz;
  v_pos   int;
  v_si    int;
  v_key   text;
  v_note  text;
  v_body  text;
  v_name  text;
  v_w     numeric;
  v_reps  int;
  v_n     int;
  v_i     int;
  v_prior numeric;
  v_done  int;
begin
  for e in select * from fl_events order by ord loop
    if e.kind in ('lift', 'run') then
      v_wid   := pg_temp.fl_id('workout:' || e.label);
      v_saved := e.at + make_interval(secs => e.dur_sec);
      select c.id into v_ch from public.chapters c where c.athlete_id = v_j and c.is_active;   -- as save_workout (0242:100)
      if v_ch is null then raise exception 'no active chapter for %', e.label; end if;

      -- workouts (0001:69 + 0018 program_id + 0234 source default 'forge'). saved_at/created_at = the session's real end.
      insert into public.workouts (id, athlete_id, chapter_id, program_id, workout_name, activity_type, started_at, saved_at,
                                   duration_sec, state, distance, distance_unit, created_at)
      values (v_wid, v_j, v_ch, case when e.prog_week is not null then v_prog end, e.name,
              (case when e.kind = 'run' then 'running' else 'strength' end)::modality,
              e.at, v_saved, e.dur_sec, 'saved', e.miles, case when e.miles is not null then 'mi' end, v_saved);

      -- workout_exercises + workout_sets. spec = 'key[{note}] 135x5 185x5*3 bwx8 | key …'  (bw = bodyweight, no load)
      v_pos := 0;
      for t in select btrim(s) from unnest(string_to_array(coalesce(e.spec, ''), '|')) s where btrim(s) <> '' loop
        v_key  := substring(t from '^([a-z0-9-]+)');
        v_note := substring(t from '^[a-z0-9-]+[{]([^}]*)[}]');
        v_body := btrim(regexp_replace(t, '^[a-z0-9-]+([{][^}]*[}])?', ''));
        v_name := null;
        select f.name into v_name from fl_ex f where f.key = v_key;
        if v_name is null then raise exception 'unknown exercise key % in %', v_key, e.label; end if;
        v_weid := pg_temp.fl_id('we:' || e.label || ':' || v_pos);
        insert into public.workout_exercises (id, workout_id, catalog_key, name, section, position, notes)
        values (v_weid, v_wid, v_key, v_name, 'main', v_pos, v_note);
        v_si := 0;
        for x in select tok from unnest(string_to_array(v_body, ' ')) tok where tok <> '' loop
          v_w    := nullif(split_part(x.tok, 'x', 1), 'bw')::numeric;
          v_reps := split_part(split_part(x.tok, 'x', 2), '*', 1)::int;
          v_n    := coalesce(nullif(split_part(x.tok, '*', 2), '')::int, 1);
          for v_i in 1..v_n loop
            insert into public.workout_sets (id, workout_exercise_id, set_index, weight, weight_unit, reps)
            values (pg_temp.fl_id('ws:' || e.label || ':' || v_pos || ':' || v_si), v_weid, v_si, v_w, 'lb', v_reps);
            v_si := v_si + 1;
          end loop;
        end loop;
        v_pos := v_pos + 1;
      end loop;

      -- PRs exactly as the app decides them (metrics.ts detectPRs): main section, load > 0, 1–5 reps, strictly
      -- heavier than the stored best (reps ≤ 5); the first mark on a lift is written as a baseline. Then the row
      -- and the ACCOMPLISHMENT timeline event save_workout writes for each (0242:154-158).
      for r in
        select we.catalog_key as key, we.name, we.position, max(ws.weight) as w
          from public.workout_exercises we
          join public.workout_sets ws on ws.workout_exercise_id = we.id
         where we.workout_id = v_wid and we.section = 'main' and ws.weight > 0 and ws.reps between 1 and 5
         group by we.catalog_key, we.name, we.position
         order by we.position
      loop
        select max(p.load_value) into v_prior
          from public.personal_records p
         where p.athlete_id = v_j and p.measure_kind = 'load' and p.load_value > 0 and p.load_reps between 1 and 5
           and (p.catalog_key = r.key or (p.catalog_key is null and p.exercise = r.name));
        if v_prior is null or r.w > v_prior then
          select ws.reps into v_reps
            from public.workout_sets ws
            join public.workout_exercises we on we.id = ws.workout_exercise_id
           where we.workout_id = v_wid and we.position = r.position and ws.weight = r.w and ws.reps between 1 and 5
           order by ws.set_index limit 1;
          insert into public.personal_records (id, athlete_id, exercise, catalog_key, achieved_on, measure_kind,
                                               load_value, load_unit, load_reps, workout_id, created_at)
          values (pg_temp.fl_id('pr:' || e.label || ':' || r.key), v_j, r.name, r.key, (v_saved at time zone 'UTC')::date,
                  'load', r.w, 'lb', v_reps, v_wid, v_saved);
          insert into public.timeline_events (id, athlete_id, event_type, object_name, chapter_id, occurred_at,
                                              source_entity_type, created_at)
          values (pg_temp.fl_id('tl:pr:' || e.label || ':' || r.key), v_j, 'ACCOMPLISHMENT',
                  r.name || ' — ' || r.w::text || ' lb PR', v_ch, v_saved, 'personal_record', v_saved);
        end if;
      end loop;

      update public.chapters set workout_count = workout_count + 1 where id = v_ch;   -- 0242:162

      -- Which program session this was, and graduation (0242:171-240).
      if e.prog_week is not null then
        insert into public.program_sessions (id, program_id, athlete_id, week_index, day_index, state, workout_id, created_at)
        values (pg_temp.fl_id('ps:' || e.prog_week || ':' || e.prog_day), v_prog, v_j, e.prog_week, e.prog_day,
                'completed', v_wid, v_saved);
        select count(*) into v_done from public.program_sessions ps where ps.program_id = v_prog;
        if v_done >= (select public.program_total_sessions(p.structure) from public.programs p where p.id = v_prog) then
          update public.programs set state = 'graduated', ended_at = v_saved, updated_at = v_saved
           where id = v_prog and state = 'active';
          if found then
            insert into public.timeline_events (id, athlete_id, event_type, object_name, chapter_id, occurred_at,
                                                source_entity_type, source_entity_id, created_at)
            select pg_temp.fl_id('tl:program-graduated'), v_j, 'PROGRAM_GRADUATED'::flm_event_type, p.name, v_ch, v_saved,
                   'program', v_prog, v_saved
              from public.programs p where p.id = v_prog;
          end if;
        end if;
      end if;

      perform pg_temp.fl_honors(v_j, v_saved);

    elsif e.kind = 'seal' then
      -- sealChapter() (chapter-detail-live.ts:220) + the next chapter (chapter-detail-live.ts:198 shape).
      update public.chapters
         set is_active = false, sealed_at = e.at, end_date = e.end_date, reflection = e.reflection
       where id = pg_temp.fl_id('chapter:jordan:' || e.chapter_n) and athlete_id = v_j;
      insert into public.chapters (id, athlete_id, name, start_date, is_active, workout_count, honor_count, created_at)
      values (pg_temp.fl_id('chapter:jordan:' || e.next_n), v_j, e.next_name, e.next_start, true, 0, 0, e.at);
      perform pg_temp.fl_honors(v_j, e.at);

    elsif e.kind = 'acc' then
      -- An accomplishment Jordan pins himself (accomplishments-live.ts; 0023). No note, so no metric moves.
      insert into public.accomplishments (id, athlete_id, name, date, chapter_id, featured, created_at)
      values (pg_temp.fl_id('acc:' || e.label), v_j, e.name, e.acc_date, pg_temp.fl_id('chapter:jordan:' || e.chapter_n),
              e.featured, e.at);

    elsif e.kind = 'squad' then
      -- Squad "Ironside" (0029 + later columns). Inserted AFTER this stage's workouts, as asked; its own trigger
      -- squads_set_invite_code_trg (0040/0161) fills invite_code.
      insert into public.squads (id, name, description, privacy, owner_id, motto, weekly_standard, created_at, updated_at)
      select pg_temp.fl_id('squad:ironside'), 'Ironside', 'We lift, we run, we show up.', 'private', v_j, 'Show up.', 3, e.at, e.at
       where not exists (select 1 from public.squads s where s.id = pg_temp.fl_id('squad:ironside'));
      -- push_squad_members (0120:442) fires per row and calls push_enqueue_for(owner = Jordan): Jordan has no
      -- push_baseline_at and no push_tokens, so it files nothing (0120:340-345).
      insert into public.squad_members (squad_id, user_id, role, joined_at)
      select pg_temp.fl_id('squad:ironside'), d.id, case when d.who = 'jordan' then 'owner' else 'member' end, j.joined_at
        from fl_demo d
        join (values ('jordan', timestamptz '2026-01-10 12:00:00-06'), ('dre', timestamptz '2026-01-10 18:10:00-06'), ('sam', timestamptz '2026-01-11 09:00:00-06'), ('alex', timestamptz '2026-01-12 20:30:00-06'), ('taylor', timestamptz '2026-01-14 19:00:00-06'), ('morgan', timestamptz '2026-01-16 07:45:00-06')) j(who, joined_at) on j.who = d.who
      on conflict (squad_id, user_id) do nothing;
      -- The five joins are 'member_joined' rows in Jordan's derived inbox (0251:395, unwindowed for the owner) and
      -- notification_unread_count() (0110) counts everything newer than notifications_seen_at: mark them read, so
      -- Home's bell carries no badge on camera.
      update public.profiles set notifications_seen_at = timestamptz '2026-01-16 08:00:00-06'
       where id = v_j and (notifications_seen_at is null or notifications_seen_at < timestamptz '2026-01-16 08:00:00-06');
      perform pg_temp.fl_honors(v_j, e.at);
    end if;
  end loop;
end $$;

-- ─── §1d · stored rank ───────────────────────────────────────────────────────────────────────────────────────
-- Stored rank = what rank-live would have stored by this date (rank-live.ts:252-264), so no ceremony fires on
-- capture. athlete_rank_state.rank_level is 1–25 (family×4+sub); profiles.rank_level is the SUB-TIER 1–4.
insert into public.athlete_rank_state (athlete_id, family, sub_tier, rank_level, journey_start_date, family_entry_date, updated_at)
select d.id, 'builder', 1, 5, date '2026-01-05', date '2026-02-09', '2026-02-09 07:45:00-06'
  from fl_demo d where d.who = 'jordan'
on conflict (athlete_id) do update
   set family = excluded.family, sub_tier = excluded.sub_tier, rank_level = excluded.rank_level,
       journey_start_date = excluded.journey_start_date, family_entry_date = excluded.family_entry_date,
       updated_at = excluded.updated_at;
update public.profiles p set rank_family = 'builder', rank_level = 1
  from fl_demo d where d.who = 'jordan' and p.id = d.id;

-- ─── §2 · assert ─────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT AND RAISE. Any failure rolls the whole stage back.
do $$
declare
  v_j  uuid := pg_temp.fl_id('user:jordan');
  v_n  bigint;
  v_wk int;
  v_dy int;
begin
  select count(*) into v_n from public.workouts where athlete_id = v_j and state = 'saved';
  if v_n <> 27 then raise exception 'saved workouts = %, expected 27', v_n; end if;
  if exists (select 1 from public.workouts where athlete_id = v_j and id::text not like 'f11de000%') then
    raise exception 'a non-seeded workout survived the rewind';
  end if;
  select count(*) into v_n from public.personal_records where athlete_id = v_j;
  if v_n <> 20 then raise exception 'personal_records = %, expected 20', v_n; end if;
  select count(*) into v_n from public.chapters where athlete_id = v_j and is_active;
  if v_n <> 1 then raise exception 'active chapters = %, expected exactly 1', v_n; end if;
  select workout_count into v_n from public.chapters where id = pg_temp.fl_id('chapter:jordan:1');
  if v_n is distinct from 27 then raise exception 'Chapter 1 workout_count is %, expected 27', v_n; end if;
  select s.week_index, s.day_index into v_wk, v_dy
    from public.program_slots((select p.structure from public.programs p where p.id = pg_temp.fl_id('program:return-to-strength'))) s
   where not exists (select 1 from public.program_sessions ps
                      where ps.program_id = pg_temp.fl_id('program:return-to-strength')
                        and ps.week_index = s.week_index and ps.day_index = s.day_index)
   order by s.ordinal limit 1;
  if v_wk is distinct from 5 or v_dy is distinct from 1 then
    raise exception 'next program slot is week % day %, expected week 5 day 1 (Upper A)', v_wk, v_dy;
  end if;
  if (select state from public.programs where id = pg_temp.fl_id('program:return-to-strength')) <> 'active' then
    raise exception 'the program is not active';
  end if;
  if (select max(started_at) from public.workouts where athlete_id = v_j) <> timestamptz '2026-02-09 06:30:00-06' then
    raise exception 'newest workout is not 2026-02-09-LA';
  end if;
  if exists (select 1 from public.honor_instances h where h.athlete_id = v_j and h.celebrated_at is null) then
    raise exception 'an honor is uncelebrated — a ceremony would play during the capture';
  end if;
  -- Nothing may sit in the push outbox for, or about, any demo account (0120 push_outbox; 0137 signup alerts).
  if exists (select 1 from public.push_outbox o join fl_demo d on d.id = o.user_id or d.id = o.actor_id) then
    raise exception 'a push_outbox row exists for a demo account';
  end if;
  -- Nothing may have been written for anybody else: every row this stage dated on/after 2026-01-19 00:00:00-06 belongs to Jordan.
  if exists (select 1 from public.workouts w where w.saved_at >= '2026-01-19 00:00:00-06' and w.id::text like 'f11de000%' and w.athlete_id <> v_j) then
    raise exception 'a seeded workout belongs to someone other than Jordan';
  end if;
  if (select rank_level from public.athlete_rank_state where athlete_id = v_j) <> 5 then
    raise exception 'stored rank is not Builder I';
  end if;
end $$;

commit;

-- ─── §3 · report ─────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE REPORT (read-only, the one result the SQL editor shows). "actual" must equal "expected" on every row.
select v.check_name, v.actual, v.expected, case when v.actual = v.expected then 'ok' else 'CHECK' end as verdict
  from (values
    ('1 · saved workouts (all-time)', (select count(*) from public.workouts where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and state = 'saved')::text, '27'),
    ('2 · of which runs · miles', (select count(*) || ' · ' || coalesce(sum(distance), 0) from public.workouts where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and activity_type = 'running'), '6 · 16.5'),
    ('3 · personal_records rows', (select count(*) from public.personal_records where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app'))::text, '20'),
    ('4 · squat best · bench best (lb)', (select coalesce(max(load_value) filter (where catalog_key = 'barbell-back-squat'), 0) || ' · ' || coalesce(max(load_value) filter (where catalog_key = 'barbell-bench-press'), 0) from public.personal_records where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), '250 · 225'),
    ('5 · honors (all) · uncelebrated', (select count(*) || ' · ' || count(*) filter (where celebrated_at is null) from public.honor_instances where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), '17 · 0'),
    ('6 · chapters (name: workouts, state)', (select string_agg(name || ': ' || workout_count || case when is_active then ' active' else ' sealed' end, ' | ' order by start_date) from public.chapters where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Chapter I — The Return: 27 active'),
    ('7 · program · sessions done · next', (select p.state || ' · ' || (select count(*) from public.program_sessions ps where ps.program_id = p.id) || ' · ' || coalesce((select 'week ' || (s.week_index + 1) || ' ' || (p.structure -> 'days' -> s.day_index ->> 'name') from public.program_slots(p.structure) s where not exists (select 1 from public.program_sessions ps where ps.program_id = p.id and ps.week_index = s.week_index and ps.day_index = s.day_index) order by s.ordinal limit 1), 'none') from public.programs p where p.athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and p.name = 'Return to Strength'), 'active · 21 · week 6 Upper A'),
    ('8 · newest workout (Chicago)', (select to_char(max(started_at) at time zone 'America/Chicago', 'Dy Mon DD HH24:MI') from public.workouts where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Mon Feb 09 06:30'),
    ('9 · stored rank', (select initcap(family) || ' ' || (array['I','II','III','IV'])[sub_tier] || ' (level ' || rank_level || ')' from public.athlete_rank_state where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Builder I (level 5)'),
    ('10 · squad Ironside members', (select count(*)::text from public.squad_members m join public.squads s on s.id = m.squad_id where s.owner_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and s.name = 'Ironside'), '6'),
    ('11 · push_outbox rows for/about demo accounts', (select count(*)::text from public.push_outbox o join auth.users u on u.id in (o.user_id, o.actor_id) where u.email like '%.demo@forgelegacy.app'), '0'),
    ('12 · accomplishments', (select string_agg(name, ' | ' order by date) from public.accomplishments where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Back Squat 225 × 5')
  ) v(check_name, actual, expected);


-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- FILM SEED · STAGE 3 of 4 · demo athlete Jordan · 2026-02-10 → 2026-03-08   (NOT a migration — data for the hero film)
--
-- PASTE THE WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice: it first REWINDS Jordan
-- to the end of stage 2 (deleting only his rows), then replays this stage. It refuses to run if a LATER stage
-- is already applied (start over with seed-demo-jordan-REMOVE.sql, then 0, 1, 2 …).
-- Order: 0-accounts → 1 → capture → 2 → capture → 3 → capture → 4 → capture. Then capture shot 4 at Mon Mar 16 2026.
--
-- Writes (Jordan only): 20 workouts (workouts / workout_exercises / workout_sets), their PR rows + ACCOMPLISHMENT
-- timeline events, program_sessions, honors via the real evaluate_honors() (backdated, celebrated), chapter counts, stored rank.
-- Side effects outside Jordan's rows: NONE. Triggers that fire are listed in film/SEED-NOTES.md; each is a no-op here
-- (no demo account has push_baseline_at or a push token, so push_enqueue_for files nothing). §2 asserts it.
--
-- Expected §3: 47 saved workouts, 30 PR rows, 18 honors, newest workout 2026-03-08-RUN, stored rank Builder II, next program session = week 10 "Lower A".
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- Transaction-local settings. UTC is what PostgREST sessions use, so honor_metrics' date_trunc('week', …)
-- and ::date read exactly as they do when the app saves a workout.
set local statement_timeout = '15min';
set local lock_timeout = '15s';
set local timezone = 'UTC';
set local search_path = public, extensions;

-- Deterministic ids: every seeded row's id starts with 'f11de000' (md5 of a label for the rest), which is how
-- a later stage tells a seeded row from one the app wrote during a capture. pg_temp: nothing persists.
create or replace function pg_temp.fl_id(p text) returns uuid language sql immutable as $fn$
  select ('f11de000' || substr(md5('forge-film:' || p), 9, 4) || '4' || substr(md5('forge-film:' || p), 14, 3) || '8' || substr(md5('forge-film:' || p), 18, 15))::uuid
$fn$;

-- The six demo accounts, looked up by email. Every DELETE below is joined to this table.
create temp table fl_demo on commit drop as
select v.who, u.id, u.email::text as email
  from (values ('jordan', 'jordan.demo@forgelegacy.app'), ('dre', 'dre.demo@forgelegacy.app'), ('sam', 'sam.demo@forgelegacy.app'), ('alex', 'alex.demo@forgelegacy.app'), ('taylor', 'taylor.demo@forgelegacy.app'), ('morgan', 'morgan.demo@forgelegacy.app')) v(who, email)
  join auth.users u on lower(u.email) = v.email;

-- §2-guard (runs BEFORE anything is written or deleted): every account this file can touch must be a
-- '.demo@forgelegacy.app' address. A row for anyone else aborts the whole transaction.
do $$
begin
  if exists (select 1 from fl_demo d where d.email not like '%.demo@forgelegacy.app') then
    raise exception 'REFUSED: a targeted account is not a .demo@forgelegacy.app address — nothing was changed.';
  end if;
end $$;

-- §0 — PREFLIGHT. Stage 0 applied, previous stage applied, no later stage applied.
do $$
declare
  v_j uuid;
begin
  select d.id into v_j from fl_demo d where d.who = 'jordan';
  if v_j is null then raise exception 'jordan.demo@forgelegacy.app does not exist — paste seed-demo-jordan-0-accounts.sql first'; end if;
  if v_j <> pg_temp.fl_id('user:jordan') then raise exception 'jordan.demo@ exists with an id this seed did not create — run seed-demo-jordan-REMOVE.sql first'; end if;
  if (select count(*) from fl_demo) <> 6 then raise exception 'expected 6 demo accounts, found % — re-run stage 0', (select count(*) from fl_demo); end if;
  if not exists (select 1 from public.workouts w where w.id = pg_temp.fl_id('workout:2026-02-09-LA')) then
    raise exception 'stage 2 is not applied (its last workout 2026-02-09-LA is missing) — paste seed-demo-jordan-2-*.sql first';
  end if;
  if exists (select 1 from public.workouts w where w.athlete_id = v_j and w.id::text like 'f11de000%' and w.started_at >= '2026-03-16 00:00:00-05') then
    raise exception 'a LATER stage is already applied — to redo this one, run REMOVE then stages 0..3';
  end if;
end $$;

-- ─── §1a · rewind ────────────────────────────────────────────────────────────────────────────────────────────
-- REWIND to the end of the previous stage, so a re-run replaces instead of duplicating, and anything the app
-- wrote during a capture (a finished live workout, its PR, a live honor) is removed. Two rules, both scoped to
-- Jordan: (a) any of his rows dated on/after this stage's start 2026-02-10 00:00:00-06; (b) any of his workout / PR / timeline /
-- program-session / accomplishment rows whose id is NOT a seeded 'f11de000…' id (i.e. written by the app).
-- Kept on purpose: the program row itself (Holt's Feb 10 change lives in programs.structure), Holt chat, consents.
delete from public.workouts w          using fl_demo d where d.who = 'jordan' and w.athlete_id = d.id
   and (w.started_at >= '2026-02-10 00:00:00-06' or w.id::text not like 'f11de000%');
delete from public.personal_records r  using fl_demo d where d.who = 'jordan' and r.athlete_id = d.id
   and (r.created_at >= '2026-02-10 00:00:00-06' or r.id::text not like 'f11de000%');
delete from public.timeline_events t   using fl_demo d where d.who = 'jordan' and t.athlete_id = d.id
   and (t.occurred_at >= '2026-02-10 00:00:00-06' or t.created_at >= '2026-02-10 00:00:00-06' or t.id::text not like 'f11de000%');
delete from public.honor_instances h   using fl_demo d where d.who = 'jordan' and h.athlete_id = d.id
   and h.awarded_at >= '2026-02-10 00:00:00-06';
delete from public.program_sessions ps using fl_demo d where d.who = 'jordan' and ps.athlete_id = d.id
   and (ps.created_at >= '2026-02-10 00:00:00-06' or ps.id::text not like 'f11de000%');
delete from public.accomplishments a   using fl_demo d where d.who = 'jordan' and a.athlete_id = d.id
   and (a.created_at >= '2026-02-10 00:00:00-06' or a.id::text not like 'f11de000%');
-- chapters.workout_count is what save_workout keeps (0242:162) and what Home's "awaiting" check reads
-- (home-live.ts:28-46) — recount it from what is left.
update public.chapters c set workout_count = (select count(*) from public.workouts w where w.chapter_id = c.id)
  from fl_demo d where d.who = 'jordan' and c.athlete_id = d.id;

-- ─── §1c · replay ────────────────────────────────────────────────────────────────────────────────────────────
create temp table fl_ex (key text primary key, name text not null) on commit drop;
insert into fl_ex values
  ('barbell-back-squat', 'Barbell Back Squat'),
  ('barbell-romanian-deadlift', 'Barbell Romanian Deadlift'),
  ('dumbbell-split-squat', 'Dumbbell Split Squat'),
  ('barbell-bench-press', 'Barbell Bench Press'),
  ('barbell-bent-over-row', 'Barbell Bent-Over Row'),
  ('pull-up', 'Pull-Up'),
  ('barbell-overhead-press', 'Barbell Overhead Press'),
  ('cable-face-pull', 'Cable Face Pull'),
  ('barbell-deadlift', 'Barbell Deadlift'),
  ('lying-leg-curl-machine', 'Lying Leg Curl Machine');

-- One evaluate_honors() call, AS JORDAN, at a moment in his past — then the rows it wrote are moved to that moment.
--   · auth.uid() is read from request.jwt.claim(s) — set transaction-local, cleared straight after (the 0200 act-as shape).
--   · evaluate_honors('live_session') (0099:544) is exactly what save_workout calls (0242:242): it inserts
--     honor_instances and, for 'live_session', one HONOR_EARNED timeline_events row per honor. Nothing else is
--     written except archive_squad_goal() per squad, which is a no-op for a squad with no goal (0101:39).
--   · honor_metrics.account_days is current_date − profiles.created_at (0100), so for the length of the call
--     created_at is shifted to make Jordan exactly as old as he was at p_at, then put back.
--   · Every honor is marked celebrated at the moment it was earned EXCEPT '1,000 Pound Club' (club_1000):
--     that is the one ceremony the film records.
create or replace function pg_temp.fl_honors(p_j uuid, p_at timestamptz) returns int
language plpgsql as $fn$
declare
  v_signup timestamptz;
  v_n      int;
begin
  select u.created_at into v_signup from auth.users u where u.id = p_j;
  update public.profiles
     set created_at = v_signup + (current_date - (p_at at time zone 'UTC')::date) * interval '1 day'
   where id = p_j;

  perform set_config('request.jwt.claim.sub', p_j::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_j, 'role', 'authenticated')::text, true);
  perform public.evaluate_honors('live_session');
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);

  update public.profiles set created_at = v_signup where id = p_j;

  -- now() is the transaction's start time; no backdated row can equal it, so this touches only what was just written.
  update public.honor_instances h
     set awarded_at    = p_at,
         date_earned   = (p_at at time zone 'UTC')::date,
         celebrated_at = case when h.honor_type = 'club_1000' then null else p_at end
   where h.athlete_id = p_j and h.awarded_at = now();
  get diagnostics v_n = row_count;

  update public.timeline_events t
     set occurred_at = p_at,
         created_at  = p_at,
         id = pg_temp.fl_id('tl:honor:' || t.object_name || ':' || coalesce(t.chapter_id::text, '-'))
   where t.athlete_id = p_j and t.event_type = 'HONOR_EARNED' and t.created_at = now();

  return v_n;
end;
$fn$;

create temp table fl_events (
  ord int primary key, label text not null, kind text not null, at timestamptz not null, name text, dur_sec int,
  prog_week int, prog_day int, miles numeric, spec text,
  chapter_n int, next_n int, next_name text, next_start date, end_date date, reflection text, acc_date date, featured boolean
) on commit drop;

-- 20 workouts. Times are America/Chicago with an explicit offset (CST −06 until Sun Mar 8 2026, CDT −05 after).
insert into fl_events (ord, label, kind, at, name, dur_sec, prog_week, prog_day, miles, spec) values
  (  1, '2026-02-10-UA', 'lift', '2026-02-10 06:30:00-06', 'Upper A', 3515, 5, 1, null, 'barbell-bench-press 135x5 185x3 225x5*2 225x4 | barbell-bent-over-row 145x8*4 | pull-up bwx8 bwx7 bwx6'),
  (  2, '2026-02-11-RUN', 'run', '2026-02-11 06:15:00-06', 'Run', 1907, null, null, 3.3, null),
  (  3, '2026-02-12-UB', 'lift', '2026-02-12 06:30:00-06', 'Upper B', 3169, 5, 2, null, 'barbell-overhead-press 135x5*3 135x4 | barbell-bench-press{Paused — 2-count on the chest} 205x4*4 | cable-face-pull 40x15*3'),
  (  4, '2026-02-14-LB', 'lift', '2026-02-14 07:30:00-06', 'Lower B', 3853, 5, 3, null, 'barbell-back-squat 135x5 185x5 230x5*3 | barbell-deadlift 225x5 295x3 345x5 | lying-leg-curl-machine 95x10*3'),
  (  5, '2026-02-16-LA', 'lift', '2026-02-16 06:30:00-06', 'Lower A', 3761, 6, 0, null, 'barbell-back-squat 135x5 185x5 225x5 255x5*2 | barbell-romanian-deadlift 205x8*3 | dumbbell-split-squat 40x8*3'),
  (  6, '2026-02-17-UA', 'lift', '2026-02-17 06:30:00-06', 'Upper A', 3588, 6, 1, null, 'barbell-bench-press 135x5 185x3 225x5*3 | barbell-bent-over-row 150x8*4 | pull-up bwx8 bwx7 bwx6'),
  (  7, '2026-02-18-RUN', 'run', '2026-02-18 06:15:00-06', 'Run', 1962, null, null, 3.4, null),
  (  8, '2026-02-19-UB', 'lift', '2026-02-19 06:30:00-06', 'Upper B', 3132, 6, 2, null, 'barbell-overhead-press 135x5*4 | barbell-bench-press{Paused — 2-count on the chest} 205x4*4 | cable-face-pull 40x15*3'),
  (  9, '2026-02-21-LB', 'lift', '2026-02-21 07:30:00-06', 'Lower B', 3866, 6, 3, null, 'barbell-back-squat 135x5 185x5 235x5*3 | barbell-deadlift 225x5 295x3 355x5 | lying-leg-curl-machine 95x10*3'),
  ( 10, '2026-02-23-LA', 'lift', '2026-02-23 06:30:00-06', 'Lower A', 3784, 7, 0, null, 'barbell-back-squat 135x5 185x5 225x5 260x5 260x4 | barbell-romanian-deadlift 205x8*3 | dumbbell-split-squat 40x8*3'),
  ( 11, '2026-02-24-UA', 'lift', '2026-02-24 06:30:00-06', 'Upper A', 3611, 7, 1, null, 'barbell-bench-press 135x5 185x3 230x5*2 230x4 | barbell-bent-over-row 150x8*4 | pull-up bwx8 bwx7 bwx6'),
  ( 12, '2026-02-25-RUN', 'run', '2026-02-25 06:15:00-06', 'Run', 2013, null, null, 3.5, null),
  ( 13, '2026-02-26-UB', 'lift', '2026-02-26 06:30:00-06', 'Upper B', 3145, 7, 2, null, 'barbell-overhead-press 140x5*3 140x4 | barbell-bench-press{Paused — 2-count on the chest} 210x4*4 | cable-face-pull 40x15*3'),
  ( 14, '2026-02-28-LB', 'lift', '2026-02-28 07:30:00-06', 'Lower B', 3879, 7, 3, null, 'barbell-back-squat 135x5 185x5 240x5*3 | barbell-deadlift 225x5 315x3 365x5 | lying-leg-curl-machine 95x10*3'),
  ( 15, '2026-03-02-LA', 'lift', '2026-03-02 06:30:00-06', 'Lower A', 3857, 8, 0, null, 'barbell-back-squat 135x5 185x5 225x5 265x5*2 | barbell-romanian-deadlift 205x8*3 | dumbbell-split-squat 40x8*3'),
  ( 16, '2026-03-03-UA', 'lift', '2026-03-03 06:30:00-06', 'Upper A', 3324, 8, 1, null, 'barbell-bench-press 135x5 185x3 230x5*3 | barbell-bent-over-row 155x8*4 | pull-up bwx8 bwx7 bwx6'),
  ( 17, '2026-03-04-RUN', 'run', '2026-03-04 06:15:00-06', 'Run', 2009, null, null, 3.5, null),
  ( 18, '2026-03-05-UB', 'lift', '2026-03-05 06:30:00-06', 'Upper B', 3158, 8, 2, null, 'barbell-overhead-press 140x5*4 | barbell-bench-press{Paused — 2-count on the chest} 215x4*4 | cable-face-pull 45x15*3'),
  ( 19, '2026-03-07-LB', 'lift', '2026-03-07 07:30:00-06', 'Lower B', 3842, 8, 3, null, 'barbell-back-squat 135x5 185x5 245x5*3 | barbell-deadlift 225x5 315x3 375x5 | lying-leg-curl-machine 95x10*3'),
  ( 20, '2026-03-08-RUN', 'run', '2026-03-08 07:30:00-05', 'Run', 2131, null, null, 3.6, null);

do $$
declare
  v_j     uuid := pg_temp.fl_id('user:jordan');
  v_prog  uuid := pg_temp.fl_id('program:return-to-strength');
  e       record;
  r       record;
  x       record;
  t       text;
  v_wid   uuid;
  v_weid  uuid;
  v_ch    uuid;
  v_saved timestamptz;
  v_pos   int;
  v_si    int;
  v_key   text;
  v_note  text;
  v_body  text;
  v_name  text;
  v_w     numeric;
  v_reps  int;
  v_n     int;
  v_i     int;
  v_prior numeric;
  v_done  int;
begin
  for e in select * from fl_events order by ord loop
    if e.kind in ('lift', 'run') then
      v_wid   := pg_temp.fl_id('workout:' || e.label);
      v_saved := e.at + make_interval(secs => e.dur_sec);
      select c.id into v_ch from public.chapters c where c.athlete_id = v_j and c.is_active;   -- as save_workout (0242:100)
      if v_ch is null then raise exception 'no active chapter for %', e.label; end if;

      -- workouts (0001:69 + 0018 program_id + 0234 source default 'forge'). saved_at/created_at = the session's real end.
      insert into public.workouts (id, athlete_id, chapter_id, program_id, workout_name, activity_type, started_at, saved_at,
                                   duration_sec, state, distance, distance_unit, created_at)
      values (v_wid, v_j, v_ch, case when e.prog_week is not null then v_prog end, e.name,
              (case when e.kind = 'run' then 'running' else 'strength' end)::modality,
              e.at, v_saved, e.dur_sec, 'saved', e.miles, case when e.miles is not null then 'mi' end, v_saved);

      -- workout_exercises + workout_sets. spec = 'key[{note}] 135x5 185x5*3 bwx8 | key …'  (bw = bodyweight, no load)
      v_pos := 0;
      for t in select btrim(s) from unnest(string_to_array(coalesce(e.spec, ''), '|')) s where btrim(s) <> '' loop
        v_key  := substring(t from '^([a-z0-9-]+)');
        v_note := substring(t from '^[a-z0-9-]+[{]([^}]*)[}]');
        v_body := btrim(regexp_replace(t, '^[a-z0-9-]+([{][^}]*[}])?', ''));
        v_name := null;
        select f.name into v_name from fl_ex f where f.key = v_key;
        if v_name is null then raise exception 'unknown exercise key % in %', v_key, e.label; end if;
        v_weid := pg_temp.fl_id('we:' || e.label || ':' || v_pos);
        insert into public.workout_exercises (id, workout_id, catalog_key, name, section, position, notes)
        values (v_weid, v_wid, v_key, v_name, 'main', v_pos, v_note);
        v_si := 0;
        for x in select tok from unnest(string_to_array(v_body, ' ')) tok where tok <> '' loop
          v_w    := nullif(split_part(x.tok, 'x', 1), 'bw')::numeric;
          v_reps := split_part(split_part(x.tok, 'x', 2), '*', 1)::int;
          v_n    := coalesce(nullif(split_part(x.tok, '*', 2), '')::int, 1);
          for v_i in 1..v_n loop
            insert into public.workout_sets (id, workout_exercise_id, set_index, weight, weight_unit, reps)
            values (pg_temp.fl_id('ws:' || e.label || ':' || v_pos || ':' || v_si), v_weid, v_si, v_w, 'lb', v_reps);
            v_si := v_si + 1;
          end loop;
        end loop;
        v_pos := v_pos + 1;
      end loop;

      -- PRs exactly as the app decides them (metrics.ts detectPRs): main section, load > 0, 1–5 reps, strictly
      -- heavier than the stored best (reps ≤ 5); the first mark on a lift is written as a baseline. Then the row
      -- and the ACCOMPLISHMENT timeline event save_workout writes for each (0242:154-158).
      for r in
        select we.catalog_key as key, we.name, we.position, max(ws.weight) as w
          from public.workout_exercises we
          join public.workout_sets ws on ws.workout_exercise_id = we.id
         where we.workout_id = v_wid and we.section = 'main' and ws.weight > 0 and ws.reps between 1 and 5
         group by we.catalog_key, we.name, we.position
         order by we.position
      loop
        select max(p.load_value) into v_prior
          from public.personal_records p
         where p.athlete_id = v_j and p.measure_kind = 'load' and p.load_value > 0 and p.load_reps between 1 and 5
           and (p.catalog_key = r.key or (p.catalog_key is null and p.exercise = r.name));
        if v_prior is null or r.w > v_prior then
          select ws.reps into v_reps
            from public.workout_sets ws
            join public.workout_exercises we on we.id = ws.workout_exercise_id
           where we.workout_id = v_wid and we.position = r.position and ws.weight = r.w and ws.reps between 1 and 5
           order by ws.set_index limit 1;
          insert into public.personal_records (id, athlete_id, exercise, catalog_key, achieved_on, measure_kind,
                                               load_value, load_unit, load_reps, workout_id, created_at)
          values (pg_temp.fl_id('pr:' || e.label || ':' || r.key), v_j, r.name, r.key, (v_saved at time zone 'UTC')::date,
                  'load', r.w, 'lb', v_reps, v_wid, v_saved);
          insert into public.timeline_events (id, athlete_id, event_type, object_name, chapter_id, occurred_at,
                                              source_entity_type, created_at)
          values (pg_temp.fl_id('tl:pr:' || e.label || ':' || r.key), v_j, 'ACCOMPLISHMENT',
                  r.name || ' — ' || r.w::text || ' lb PR', v_ch, v_saved, 'personal_record', v_saved);
        end if;
      end loop;

      update public.chapters set workout_count = workout_count + 1 where id = v_ch;   -- 0242:162

      -- Which program session this was, and graduation (0242:171-240).
      if e.prog_week is not null then
        insert into public.program_sessions (id, program_id, athlete_id, week_index, day_index, state, workout_id, created_at)
        values (pg_temp.fl_id('ps:' || e.prog_week || ':' || e.prog_day), v_prog, v_j, e.prog_week, e.prog_day,
                'completed', v_wid, v_saved);
        select count(*) into v_done from public.program_sessions ps where ps.program_id = v_prog;
        if v_done >= (select public.program_total_sessions(p.structure) from public.programs p where p.id = v_prog) then
          update public.programs set state = 'graduated', ended_at = v_saved, updated_at = v_saved
           where id = v_prog and state = 'active';
          if found then
            insert into public.timeline_events (id, athlete_id, event_type, object_name, chapter_id, occurred_at,
                                                source_entity_type, source_entity_id, created_at)
            select pg_temp.fl_id('tl:program-graduated'), v_j, 'PROGRAM_GRADUATED'::flm_event_type, p.name, v_ch, v_saved,
                   'program', v_prog, v_saved
              from public.programs p where p.id = v_prog;
          end if;
        end if;
      end if;

      perform pg_temp.fl_honors(v_j, v_saved);

    elsif e.kind = 'seal' then
      -- sealChapter() (chapter-detail-live.ts:220) + the next chapter (chapter-detail-live.ts:198 shape).
      update public.chapters
         set is_active = false, sealed_at = e.at, end_date = e.end_date, reflection = e.reflection
       where id = pg_temp.fl_id('chapter:jordan:' || e.chapter_n) and athlete_id = v_j;
      insert into public.chapters (id, athlete_id, name, start_date, is_active, workout_count, honor_count, created_at)
      values (pg_temp.fl_id('chapter:jordan:' || e.next_n), v_j, e.next_name, e.next_start, true, 0, 0, e.at);
      perform pg_temp.fl_honors(v_j, e.at);

    elsif e.kind = 'acc' then
      -- An accomplishment Jordan pins himself (accomplishments-live.ts; 0023). No note, so no metric moves.
      insert into public.accomplishments (id, athlete_id, name, date, chapter_id, featured, created_at)
      values (pg_temp.fl_id('acc:' || e.label), v_j, e.name, e.acc_date, pg_temp.fl_id('chapter:jordan:' || e.chapter_n),
              e.featured, e.at);

    elsif e.kind = 'squad' then
      -- Squad "Ironside" (0029 + later columns). Inserted AFTER this stage's workouts, as asked; its own trigger
      -- squads_set_invite_code_trg (0040/0161) fills invite_code.
      insert into public.squads (id, name, description, privacy, owner_id, motto, weekly_standard, created_at, updated_at)
      select pg_temp.fl_id('squad:ironside'), 'Ironside', 'We lift, we run, we show up.', 'private', v_j, 'Show up.', 3, e.at, e.at
       where not exists (select 1 from public.squads s where s.id = pg_temp.fl_id('squad:ironside'));
      -- push_squad_members (0120:442) fires per row and calls push_enqueue_for(owner = Jordan): Jordan has no
      -- push_baseline_at and no push_tokens, so it files nothing (0120:340-345).
      insert into public.squad_members (squad_id, user_id, role, joined_at)
      select pg_temp.fl_id('squad:ironside'), d.id, case when d.who = 'jordan' then 'owner' else 'member' end, j.joined_at
        from fl_demo d
        join (values ('jordan', timestamptz '2026-01-10 12:00:00-06'), ('dre', timestamptz '2026-01-10 18:10:00-06'), ('sam', timestamptz '2026-01-11 09:00:00-06'), ('alex', timestamptz '2026-01-12 20:30:00-06'), ('taylor', timestamptz '2026-01-14 19:00:00-06'), ('morgan', timestamptz '2026-01-16 07:45:00-06')) j(who, joined_at) on j.who = d.who
      on conflict (squad_id, user_id) do nothing;
      -- The five joins are 'member_joined' rows in Jordan's derived inbox (0251:395, unwindowed for the owner) and
      -- notification_unread_count() (0110) counts everything newer than notifications_seen_at: mark them read, so
      -- Home's bell carries no badge on camera.
      update public.profiles set notifications_seen_at = timestamptz '2026-01-16 08:00:00-06'
       where id = v_j and (notifications_seen_at is null or notifications_seen_at < timestamptz '2026-01-16 08:00:00-06');
      perform pg_temp.fl_honors(v_j, e.at);
    end if;
  end loop;
end $$;

-- ─── §1d · stored rank ───────────────────────────────────────────────────────────────────────────────────────
-- Stored rank = what rank-live would have stored by this date (rank-live.ts:252-264), so no ceremony fires on
-- capture. athlete_rank_state.rank_level is 1–25 (family×4+sub); profiles.rank_level is the SUB-TIER 1–4.
insert into public.athlete_rank_state (athlete_id, family, sub_tier, rank_level, journey_start_date, family_entry_date, updated_at)
select d.id, 'builder', 2, 6, date '2026-01-05', date '2026-02-09', '2026-03-08 08:30:00-05'
  from fl_demo d where d.who = 'jordan'
on conflict (athlete_id) do update
   set family = excluded.family, sub_tier = excluded.sub_tier, rank_level = excluded.rank_level,
       journey_start_date = excluded.journey_start_date, family_entry_date = excluded.family_entry_date,
       updated_at = excluded.updated_at;
update public.profiles p set rank_family = 'builder', rank_level = 2
  from fl_demo d where d.who = 'jordan' and p.id = d.id;

-- ─── §2 · assert ─────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT AND RAISE. Any failure rolls the whole stage back.
do $$
declare
  v_j  uuid := pg_temp.fl_id('user:jordan');
  v_n  bigint;
  v_wk int;
  v_dy int;
begin
  select count(*) into v_n from public.workouts where athlete_id = v_j and state = 'saved';
  if v_n <> 47 then raise exception 'saved workouts = %, expected 47', v_n; end if;
  if exists (select 1 from public.workouts where athlete_id = v_j and id::text not like 'f11de000%') then
    raise exception 'a non-seeded workout survived the rewind';
  end if;
  select count(*) into v_n from public.personal_records where athlete_id = v_j;
  if v_n <> 30 then raise exception 'personal_records = %, expected 30', v_n; end if;
  select count(*) into v_n from public.chapters where athlete_id = v_j and is_active;
  if v_n <> 1 then raise exception 'active chapters = %, expected exactly 1', v_n; end if;
  select workout_count into v_n from public.chapters where id = pg_temp.fl_id('chapter:jordan:1');
  if v_n is distinct from 47 then raise exception 'Chapter 1 workout_count is %, expected 47', v_n; end if;
  select s.week_index, s.day_index into v_wk, v_dy
    from public.program_slots((select p.structure from public.programs p where p.id = pg_temp.fl_id('program:return-to-strength'))) s
   where not exists (select 1 from public.program_sessions ps
                      where ps.program_id = pg_temp.fl_id('program:return-to-strength')
                        and ps.week_index = s.week_index and ps.day_index = s.day_index)
   order by s.ordinal limit 1;
  if v_wk is distinct from 9 or v_dy is distinct from 0 then
    raise exception 'next program slot is week % day %, expected week 9 day 0 (Lower A)', v_wk, v_dy;
  end if;
  if (select state from public.programs where id = pg_temp.fl_id('program:return-to-strength')) <> 'active' then
    raise exception 'the program is not active';
  end if;
  if (select max(started_at) from public.workouts where athlete_id = v_j) <> timestamptz '2026-03-08 07:30:00-05' then
    raise exception 'newest workout is not 2026-03-08-RUN';
  end if;
  if exists (select 1 from public.honor_instances h where h.athlete_id = v_j and h.celebrated_at is null) then
    raise exception 'an honor is uncelebrated — a ceremony would play during the capture';
  end if;
  -- Nothing may sit in the push outbox for, or about, any demo account (0120 push_outbox; 0137 signup alerts).
  if exists (select 1 from public.push_outbox o join fl_demo d on d.id = o.user_id or d.id = o.actor_id) then
    raise exception 'a push_outbox row exists for a demo account';
  end if;
  -- Nothing may have been written for anybody else: every row this stage dated on/after 2026-02-10 00:00:00-06 belongs to Jordan.
  if exists (select 1 from public.workouts w where w.saved_at >= '2026-02-10 00:00:00-06' and w.id::text like 'f11de000%' and w.athlete_id <> v_j) then
    raise exception 'a seeded workout belongs to someone other than Jordan';
  end if;
  if (select rank_level from public.athlete_rank_state where athlete_id = v_j) <> 6 then
    raise exception 'stored rank is not Builder II';
  end if;
end $$;

commit;

-- ─── §3 · report ─────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE REPORT (read-only, the one result the SQL editor shows). "actual" must equal "expected" on every row.
select v.check_name, v.actual, v.expected, case when v.actual = v.expected then 'ok' else 'CHECK' end as verdict
  from (values
    ('1 · saved workouts (all-time)', (select count(*) from public.workouts where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and state = 'saved')::text, '47'),
    ('2 · of which runs · miles', (select count(*) || ' · ' || coalesce(sum(distance), 0) from public.workouts where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and activity_type = 'running'), '11 · 33.8'),
    ('3 · personal_records rows', (select count(*) from public.personal_records where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app'))::text, '30'),
    ('4 · squat best · bench best (lb)', (select coalesce(max(load_value) filter (where catalog_key = 'barbell-back-squat'), 0) || ' · ' || coalesce(max(load_value) filter (where catalog_key = 'barbell-bench-press'), 0) from public.personal_records where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), '265 · 230'),
    ('5 · honors (all) · uncelebrated', (select count(*) || ' · ' || count(*) filter (where celebrated_at is null) from public.honor_instances where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), '18 · 0'),
    ('6 · chapters (name: workouts, state)', (select string_agg(name || ': ' || workout_count || case when is_active then ' active' else ' sealed' end, ' | ' order by start_date) from public.chapters where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Chapter I — The Return: 47 active'),
    ('7 · program · sessions done · next', (select p.state || ' · ' || (select count(*) from public.program_sessions ps where ps.program_id = p.id) || ' · ' || coalesce((select 'week ' || (s.week_index + 1) || ' ' || (p.structure -> 'days' -> s.day_index ->> 'name') from public.program_slots(p.structure) s where not exists (select 1 from public.program_sessions ps where ps.program_id = p.id and ps.week_index = s.week_index and ps.day_index = s.day_index) order by s.ordinal limit 1), 'none') from public.programs p where p.athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and p.name = 'Return to Strength'), 'active · 36 · week 10 Lower A'),
    ('8 · newest workout (Chicago)', (select to_char(max(started_at) at time zone 'America/Chicago', 'Dy Mon DD HH24:MI') from public.workouts where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Sun Mar 08 07:30'),
    ('9 · stored rank', (select initcap(family) || ' ' || (array['I','II','III','IV'])[sub_tier] || ' (level ' || rank_level || ')' from public.athlete_rank_state where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Builder II (level 6)'),
    ('10 · squad Ironside members', (select count(*)::text from public.squad_members m join public.squads s on s.id = m.squad_id where s.owner_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and s.name = 'Ironside'), '6'),
    ('11 · push_outbox rows for/about demo accounts', (select count(*)::text from public.push_outbox o join auth.users u on u.id in (o.user_id, o.actor_id) where u.email like '%.demo@forgelegacy.app'), '0'),
    ('12 · accomplishments', (select string_agg(name, ' | ' order by date) from public.accomplishments where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Back Squat 225 × 5')
  ) v(check_name, actual, expected);


-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- FILM SEED · STAGE 4 of 4 · demo athlete Jordan · 2026-03-16 → 2026-10-01   (NOT a migration — data for the hero film)
--
-- PASTE THE WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice: it first REWINDS Jordan
-- to the end of stage 3 (deleting only his rows), then replays this stage. It refuses to run if a LATER stage
-- is already applied (start over with seed-demo-jordan-REMOVE.sql, then 0, 1, 2 …).
-- Order: 0-accounts → 1 → capture → 2 → capture → 3 → capture → 4 → capture. Then capture shot 5 at the real date (~Oct 2 2026) — see the RANK note below.
--
-- Writes (Jordan only): 148 workouts (workouts / workout_exercises / workout_sets), their PR rows + ACCOMPLISHMENT
-- timeline events, program_sessions, honors via the real evaluate_honors() (backdated, celebrated), the graduation,
-- Chapter I sealed May 1, Chapter II (sealed Sep 1), Chapter III (active), one uncelebrated honor (1,000 Pound Club), accomplishments, chapter counts, stored rank.
-- Side effects outside Jordan's rows: NONE. Triggers that fire are listed in film/SEED-NOTES.md; each is a no-op here
-- (no demo account has push_baseline_at or a push token, so push_enqueue_for files nothing). §2 asserts it.
--
-- Expected §3: 195 saved workouts, 48 PR rows, 38 honors, newest workout 2026-10-01-UB, stored rank Builder IV, program graduated.
--
-- ⚠ RANK: with a year at ~4 sessions/week Jordan has 38 active weeks on Oct 2, which computes to CRAFTSMAN IV, not
--   Craftsman I (Craftsman I is 18–21 active weeks; Architect is blocked because he has no goals). The stored rank is
--   left at Builder IV as asked. Captured on Oct 2 the real ceremony therefore reads "Craftsman IV". The honest
--   "Builder IV → Craftsman I" is the week of May 11: freeze the capture clock at Tue May 12 2026 (after 07:30 CDT)
--   and the app computes Craftsman I from this exact data (rank-live clamps later sessions onto "today").
--   film/SEED-NOTES.md §Rank has the capture order and the one-statement follow-up.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- Transaction-local settings. UTC is what PostgREST sessions use, so honor_metrics' date_trunc('week', …)
-- and ::date read exactly as they do when the app saves a workout.
set local statement_timeout = '15min';
set local lock_timeout = '15s';
set local timezone = 'UTC';
set local search_path = public, extensions;

-- Deterministic ids: every seeded row's id starts with 'f11de000' (md5 of a label for the rest), which is how
-- a later stage tells a seeded row from one the app wrote during a capture. pg_temp: nothing persists.
create or replace function pg_temp.fl_id(p text) returns uuid language sql immutable as $fn$
  select ('f11de000' || substr(md5('forge-film:' || p), 9, 4) || '4' || substr(md5('forge-film:' || p), 14, 3) || '8' || substr(md5('forge-film:' || p), 18, 15))::uuid
$fn$;

-- The six demo accounts, looked up by email. Every DELETE below is joined to this table.
create temp table fl_demo on commit drop as
select v.who, u.id, u.email::text as email
  from (values ('jordan', 'jordan.demo@forgelegacy.app'), ('dre', 'dre.demo@forgelegacy.app'), ('sam', 'sam.demo@forgelegacy.app'), ('alex', 'alex.demo@forgelegacy.app'), ('taylor', 'taylor.demo@forgelegacy.app'), ('morgan', 'morgan.demo@forgelegacy.app')) v(who, email)
  join auth.users u on lower(u.email) = v.email;

-- §2-guard (runs BEFORE anything is written or deleted): every account this file can touch must be a
-- '.demo@forgelegacy.app' address. A row for anyone else aborts the whole transaction.
do $$
begin
  if exists (select 1 from fl_demo d where d.email not like '%.demo@forgelegacy.app') then
    raise exception 'REFUSED: a targeted account is not a .demo@forgelegacy.app address — nothing was changed.';
  end if;
end $$;

-- §0 — PREFLIGHT. Stage 0 applied, previous stage applied, no later stage applied.
do $$
declare
  v_j uuid;
begin
  select d.id into v_j from fl_demo d where d.who = 'jordan';
  if v_j is null then raise exception 'jordan.demo@forgelegacy.app does not exist — paste seed-demo-jordan-0-accounts.sql first'; end if;
  if v_j <> pg_temp.fl_id('user:jordan') then raise exception 'jordan.demo@ exists with an id this seed did not create — run seed-demo-jordan-REMOVE.sql first'; end if;
  if (select count(*) from fl_demo) <> 6 then raise exception 'expected 6 demo accounts, found % — re-run stage 0', (select count(*) from fl_demo); end if;
  if not exists (select 1 from public.workouts w where w.id = pg_temp.fl_id('workout:2026-03-08-RUN')) then
    raise exception 'stage 3 is not applied (its last workout 2026-03-08-RUN is missing) — paste seed-demo-jordan-3-*.sql first';
  end if;
end $$;

-- ─── §1a · rewind ────────────────────────────────────────────────────────────────────────────────────────────
-- REWIND to the end of the previous stage, so a re-run replaces instead of duplicating, and anything the app
-- wrote during a capture (a finished live workout, its PR, a live honor) is removed. Two rules, both scoped to
-- Jordan: (a) any of his rows dated on/after this stage's start 2026-03-16 00:00:00-05; (b) any of his workout / PR / timeline /
-- program-session / accomplishment rows whose id is NOT a seeded 'f11de000…' id (i.e. written by the app).
-- Kept on purpose: the program row itself (Holt's Feb 10 change lives in programs.structure), Holt chat, consents.
delete from public.workouts w          using fl_demo d where d.who = 'jordan' and w.athlete_id = d.id
   and (w.started_at >= '2026-03-16 00:00:00-05' or w.id::text not like 'f11de000%');
delete from public.personal_records r  using fl_demo d where d.who = 'jordan' and r.athlete_id = d.id
   and (r.created_at >= '2026-03-16 00:00:00-05' or r.id::text not like 'f11de000%');
delete from public.timeline_events t   using fl_demo d where d.who = 'jordan' and t.athlete_id = d.id
   and (t.occurred_at >= '2026-03-16 00:00:00-05' or t.created_at >= '2026-03-16 00:00:00-05' or t.id::text not like 'f11de000%');
delete from public.honor_instances h   using fl_demo d where d.who = 'jordan' and h.athlete_id = d.id
   and h.awarded_at >= '2026-03-16 00:00:00-05';
delete from public.program_sessions ps using fl_demo d where d.who = 'jordan' and ps.athlete_id = d.id
   and (ps.created_at >= '2026-03-16 00:00:00-05' or ps.id::text not like 'f11de000%');
delete from public.accomplishments a   using fl_demo d where d.who = 'jordan' and a.athlete_id = d.id
   and (a.created_at >= '2026-03-16 00:00:00-05' or a.id::text not like 'f11de000%');
-- Stage 4 also owns Chapters II and III, Chapter I's seal, and the graduation.
delete from public.chapters c using fl_demo d where d.who = 'jordan' and c.athlete_id = d.id
   and c.id in (pg_temp.fl_id('chapter:jordan:2'), pg_temp.fl_id('chapter:jordan:3'));
update public.chapters c set is_active = true, sealed_at = null, end_date = null, reflection = null
  from fl_demo d where d.who = 'jordan' and c.athlete_id = d.id and c.id = pg_temp.fl_id('chapter:jordan:1')
   and c.sealed_at is not null;
update public.programs p set state = 'active', ended_at = null, updated_at = p.created_at
  from fl_demo d where d.who = 'jordan' and p.athlete_id = d.id and p.id = pg_temp.fl_id('program:return-to-strength')
   and p.state = 'graduated';
-- chapters.workout_count is what save_workout keeps (0242:162) and what Home's "awaiting" check reads
-- (home-live.ts:28-46) — recount it from what is left.
update public.chapters c set workout_count = (select count(*) from public.workouts w where w.chapter_id = c.id)
  from fl_demo d where d.who = 'jordan' and c.athlete_id = d.id;

-- ─── §1c · replay ────────────────────────────────────────────────────────────────────────────────────────────
create temp table fl_ex (key text primary key, name text not null) on commit drop;
insert into fl_ex values
  ('barbell-back-squat', 'Barbell Back Squat'),
  ('barbell-romanian-deadlift', 'Barbell Romanian Deadlift'),
  ('dumbbell-split-squat', 'Dumbbell Split Squat'),
  ('barbell-bench-press', 'Barbell Bench Press'),
  ('barbell-bent-over-row', 'Barbell Bent-Over Row'),
  ('pull-up', 'Pull-Up'),
  ('barbell-overhead-press', 'Barbell Overhead Press'),
  ('cable-face-pull', 'Cable Face Pull'),
  ('barbell-deadlift', 'Barbell Deadlift'),
  ('lying-leg-curl-machine', 'Lying Leg Curl Machine');

-- One evaluate_honors() call, AS JORDAN, at a moment in his past — then the rows it wrote are moved to that moment.
--   · auth.uid() is read from request.jwt.claim(s) — set transaction-local, cleared straight after (the 0200 act-as shape).
--   · evaluate_honors('live_session') (0099:544) is exactly what save_workout calls (0242:242): it inserts
--     honor_instances and, for 'live_session', one HONOR_EARNED timeline_events row per honor. Nothing else is
--     written except archive_squad_goal() per squad, which is a no-op for a squad with no goal (0101:39).
--   · honor_metrics.account_days is current_date − profiles.created_at (0100), so for the length of the call
--     created_at is shifted to make Jordan exactly as old as he was at p_at, then put back.
--   · Every honor is marked celebrated at the moment it was earned EXCEPT '1,000 Pound Club' (club_1000):
--     that is the one ceremony the film records.
create or replace function pg_temp.fl_honors(p_j uuid, p_at timestamptz) returns int
language plpgsql as $fn$
declare
  v_signup timestamptz;
  v_n      int;
begin
  select u.created_at into v_signup from auth.users u where u.id = p_j;
  update public.profiles
     set created_at = v_signup + (current_date - (p_at at time zone 'UTC')::date) * interval '1 day'
   where id = p_j;

  perform set_config('request.jwt.claim.sub', p_j::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_j, 'role', 'authenticated')::text, true);
  perform public.evaluate_honors('live_session');
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);

  update public.profiles set created_at = v_signup where id = p_j;

  -- now() is the transaction's start time; no backdated row can equal it, so this touches only what was just written.
  update public.honor_instances h
     set awarded_at    = p_at,
         date_earned   = (p_at at time zone 'UTC')::date,
         celebrated_at = case when h.honor_type = 'club_1000' then null else p_at end
   where h.athlete_id = p_j and h.awarded_at = now();
  get diagnostics v_n = row_count;

  update public.timeline_events t
     set occurred_at = p_at,
         created_at  = p_at,
         id = pg_temp.fl_id('tl:honor:' || t.object_name || ':' || coalesce(t.chapter_id::text, '-'))
   where t.athlete_id = p_j and t.event_type = 'HONOR_EARNED' and t.created_at = now();

  return v_n;
end;
$fn$;

create temp table fl_events (
  ord int primary key, label text not null, kind text not null, at timestamptz not null, name text, dur_sec int,
  prog_week int, prog_day int, miles numeric, spec text,
  chapter_n int, next_n int, next_name text, next_start date, end_date date, reflection text, acc_date date, featured boolean
) on commit drop;

-- 148 workouts. Times are America/Chicago with an explicit offset (CST −06 until Sun Mar 8 2026, CDT −05 after).
insert into fl_events (ord, label, kind, at, name, dur_sec, prog_week, prog_day, miles, spec) values
  (  1, '2026-03-16-LA', 'lift', '2026-03-16 06:30:00-05', 'Lower A', 4003, 9, 0, null, 'barbell-back-squat 135x5 185x5 225x5 245x5*2 | barbell-romanian-deadlift 215x8*3 | dumbbell-split-squat 40x8*3'),
  (  2, '2026-03-17-UA', 'lift', '2026-03-17 06:30:00-05', 'Upper A', 3420, 9, 1, null, 'barbell-bench-press 135x5 185x3 215x5*3 | barbell-bent-over-row 160x8*4 | pull-up bwx9 bwx8 bwx7'),
  (  3, '2026-03-18-RUN', 'run', '2026-03-18 06:15:00-05', 'Run', 1713, null, null, 3, null),
  (  4, '2026-03-19-UB', 'lift', '2026-03-19 06:30:00-05', 'Upper B', 3134, 9, 2, null, 'barbell-overhead-press 130x5*4 | barbell-bench-press{Paused — 2-count on the chest} 205x4*4 | cable-face-pull 45x15*3'),
  (  5, '2026-03-21-LB', 'lift', '2026-03-21 07:30:00-05', 'Lower B', 3868, 9, 3, null, 'barbell-back-squat 135x5 185x5 225x5*3 | barbell-deadlift 225x5 315x3 355x5 | lying-leg-curl-machine 100x10*3'),
  (  6, '2026-03-23-LA', 'lift', '2026-03-23 06:30:00-05', 'Lower A', 3666, 10, 0, null, 'barbell-back-squat 135x5 185x5 225x5 255x5*2 | barbell-romanian-deadlift 215x8*3 | dumbbell-split-squat 40x8*3'),
  (  7, '2026-03-24-UA', 'lift', '2026-03-24 06:30:00-05', 'Upper A', 3493, 10, 1, null, 'barbell-bench-press 135x5 185x3 225x5*3 | barbell-bent-over-row 160x8*4 | pull-up bwx9 bwx8 bwx7'),
  (  8, '2026-03-25-RUN', 'run', '2026-03-25 06:15:00-05', 'Run', 1938, null, null, 3.4, null),
  (  9, '2026-03-26-UB', 'lift', '2026-03-26 06:30:00-05', 'Upper B', 3147, 10, 2, null, 'barbell-overhead-press 135x5*4 | barbell-bench-press{Paused — 2-count on the chest} 210x4*4 | cable-face-pull 45x15*3'),
  ( 10, '2026-03-28-LB', 'lift', '2026-03-28 07:30:00-05', 'Lower B', 3881, 10, 3, null, 'barbell-back-squat 135x5 185x5 235x5*3 | barbell-deadlift 225x5 315x3 375x5 | lying-leg-curl-machine 100x10*3'),
  ( 11, '2026-03-30-LA', 'lift', '2026-03-30 06:30:00-05', 'Lower A', 3739, 11, 0, null, 'barbell-back-squat 135x5 185x5 225x5 265x5 265x4 | barbell-romanian-deadlift 225x8*3 | dumbbell-split-squat 45x8*3'),
  ( 12, '2026-03-31-UA', 'lift', '2026-03-31 06:30:00-05', 'Upper A', 3566, 11, 1, null, 'barbell-bench-press 135x5 185x3 230x5*2 230x4 | barbell-bent-over-row 165x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 13, '2026-04-01-RUN', 'run', '2026-04-01 06:15:00-05', 'Run', 2045, null, null, 3.6, null),
  ( 14, '2026-04-02-UB', 'lift', '2026-04-02 06:30:00-05', 'Upper B', 3160, 11, 2, null, 'barbell-overhead-press 140x5*4 | barbell-bench-press{Paused — 2-count on the chest} 215x4*4 | cable-face-pull 45x15*3'),
  ( 15, '2026-04-04-LB', 'lift', '2026-04-04 07:30:00-05', 'Lower B', 3844, 11, 3, null, 'barbell-back-squat 135x5 185x5 245x5*3 | barbell-deadlift 225x5 335x3 385x5 | lying-leg-curl-machine 100x10*3'),
  ( 16, '2026-04-05-RUN', 'run', '2026-04-05 07:30:00-05', 'Run', 2344, null, null, 4, null),
  ( 17, '2026-04-06-LA', 'lift', '2026-04-06 06:30:00-05', 'Lower A', 3812, null, null, null, 'barbell-back-squat 135x5 185x5 225x5 270x5*2 | barbell-romanian-deadlift 225x8*3 | dumbbell-split-squat 45x8*3'),
  ( 18, '2026-04-07-UA', 'lift', '2026-04-07 06:30:00-05', 'Upper A', 3639, null, null, null, 'barbell-bench-press 135x5 185x3 230x5*3 | barbell-bent-over-row 165x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 19, '2026-04-08-RUN', 'run', '2026-04-08 06:15:00-05', 'Run', 2155, null, null, 3.8, null),
  ( 20, '2026-04-09-UB', 'lift', '2026-04-09 06:30:00-05', 'Upper B', 3123, null, null, null, 'barbell-overhead-press 145x5*3 145x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 45x15*3'),
  ( 21, '2026-04-11-LB', 'lift', '2026-04-11 07:30:00-05', 'Lower B', 3857, null, null, null, 'barbell-back-squat 135x5 185x5 250x5*3 | barbell-deadlift 225x5 315x3 365x3 395x3 | lying-leg-curl-machine 100x10*3'),
  ( 22, '2026-04-13-LA', 'lift', '2026-04-13 06:30:00-05', 'Lower A', 3885, null, null, null, 'barbell-back-squat 135x5 185x5 225x5 275x5*2 | barbell-romanian-deadlift 225x8*3 | dumbbell-split-squat 45x8*3'),
  ( 23, '2026-04-14-UA', 'lift', '2026-04-14 06:30:00-05', 'Upper A', 3302, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*3 | barbell-bent-over-row 170x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 24, '2026-04-15-RUN', 'run', '2026-04-15 06:15:00-05', 'Run', 2260, null, null, 4, null),
  ( 25, '2026-04-16-UB', 'lift', '2026-04-16 06:30:00-05', 'Upper B', 3136, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 45x15*3'),
  ( 26, '2026-04-18-LB', 'lift', '2026-04-18 07:30:00-05', 'Lower B', 3870, null, null, null, 'barbell-back-squat 135x5 185x5 255x5*3 | barbell-deadlift 225x5 315x3 365x3 405x3 | lying-leg-curl-machine 100x10*3'),
  ( 27, '2026-04-20-LA', 'lift', '2026-04-20 06:30:00-05', 'Lower A', 3908, null, null, null, 'barbell-back-squat 135x5 185x5 235x5 280x5 280x4 | barbell-romanian-deadlift 235x8*3 | dumbbell-split-squat 45x8*3'),
  ( 28, '2026-04-21-UA', 'lift', '2026-04-21 06:30:00-05', 'Upper A', 3375, null, null, null, 'barbell-bench-press 135x5 185x3 230x5*3 | barbell-bent-over-row 170x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 29, '2026-04-22-RUN', 'run', '2026-04-22 06:15:00-05', 'Run', 2256, null, null, 4, null),
  ( 30, '2026-04-23-UB', 'lift', '2026-04-23 06:30:00-05', 'Upper B', 3149, null, null, null, 'barbell-overhead-press 140x5*4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 45x15*3'),
  ( 31, '2026-04-25-LB', 'lift', '2026-04-25 07:30:00-05', 'Lower B', 3883, null, null, null, 'barbell-back-squat 135x5 185x5 260x5*3 | barbell-deadlift 225x5 315x3 385x3 425x3 | lying-leg-curl-machine 105x10*3'),
  ( 32, '2026-04-27-LA', 'lift', '2026-04-27 06:30:00-05', 'Lower A', 3981, null, null, null, 'barbell-back-squat 135x5 185x3 235x3 265x3 290x3 | barbell-romanian-deadlift 235x8*3 | dumbbell-split-squat 45x8*3'),
  ( 33, '2026-04-28-UA', 'lift', '2026-04-28 06:30:00-05', 'Upper A', 3448, null, null, null, 'barbell-bench-press 135x5 185x3 215x3 230x3*2 | barbell-bent-over-row 175x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 34, '2026-04-29-RUN', 'run', '2026-04-29 06:15:00-05', 'Run', 2308, null, null, 4.1, null),
  ( 35, '2026-04-30-UB', 'lift', '2026-04-30 06:30:00-05', 'Upper B', 3162, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 50x15*3'),
  ( 37, '2026-05-02-LB', 'lift', '2026-05-02 07:30:00-05', 'Lower B', 3846, null, null, null, 'barbell-back-squat 135x5 185x5 250x5*3 | barbell-deadlift 225x5 335x3 405x2 445x2 | lying-leg-curl-machine 105x10*3'),
  ( 38, '2026-05-04-LA', 'lift', '2026-05-04 06:30:00-05', 'Lower A', 3694, null, null, null, 'barbell-back-squat 135x5 185x3 235x3 275x3 300x3 | barbell-romanian-deadlift 235x8*3 | dumbbell-split-squat 45x8*3'),
  ( 39, '2026-05-05-UA', 'lift', '2026-05-05 06:30:00-05', 'Upper A', 3521, null, null, null, 'barbell-bench-press 135x5 185x3 215x3 230x3*2 | barbell-bent-over-row 175x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 40, '2026-05-06-RUN', 'run', '2026-05-06 06:15:00-05', 'Run', 2356, null, null, 4.2, null),
  ( 41, '2026-05-07-UB', 'lift', '2026-05-07 06:30:00-05', 'Upper B', 3125, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 50x15*3'),
  ( 42, '2026-05-09-LB', 'lift', '2026-05-09 07:30:00-05', 'Lower B', 3859, null, null, null, 'barbell-back-squat 135x5 185x5 260x5*3 | barbell-deadlift 225x5 335x3 405x1 435x1 465x1 | lying-leg-curl-machine 105x10*3'),
  ( 43, '2026-05-10-RUN', 'run', '2026-05-10 07:30:00-05', 'Run', 2895, null, null, 5, null),
  ( 44, '2026-05-12-UA', 'lift', '2026-05-12 06:30:00-05', 'Upper A', 3544, null, null, null, 'barbell-bench-press 135x5 185x3 215x3 235x3 225x5 | barbell-bent-over-row 180x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 46, '2026-05-13-RUN', 'run', '2026-05-13 06:15:00-05', 'Run', 2352, null, null, 4.2, null),
  ( 47, '2026-05-14-UB', 'lift', '2026-05-14 06:30:00-05', 'Upper B', 3138, null, null, null, 'barbell-overhead-press 140x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 50x15*3'),
  ( 48, '2026-05-16-LB', 'lift', '2026-05-16 07:30:00-05', 'Lower B', 3872, null, null, null, 'barbell-back-squat 135x5 185x5 255x5*3 | barbell-deadlift 225x5 315x3 405x3 | lying-leg-curl-machine 105x10*3'),
  ( 49, '2026-05-18-LA', 'lift', '2026-05-18 06:30:00-05', 'Lower A', 3790, null, null, null, 'barbell-back-squat 135x5 185x3 235x3 285x3 305x3 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 50x8*3'),
  ( 50, '2026-05-19-UA', 'lift', '2026-05-19 06:30:00-05', 'Upper A', 3617, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*3 | barbell-bent-over-row 180x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 51, '2026-05-20-RUN', 'run', '2026-05-20 06:15:00-05', 'Run', 2399, null, null, 4.3, null),
  ( 52, '2026-05-21-UB', 'lift', '2026-05-21 06:30:00-05', 'Upper B', 3151, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 50x15*3'),
  ( 53, '2026-05-23-LB', 'lift', '2026-05-23 07:30:00-05', 'Lower B', 3885, null, null, null, 'barbell-back-squat 135x5 185x5 265x5*3 | barbell-deadlift 225x5 335x3 425x3 | lying-leg-curl-machine 105x10*3'),
  ( 54, '2026-05-25-LA', 'lift', '2026-05-25 06:30:00-05', 'Lower A', 3863, null, null, null, 'barbell-back-squat 135x5 185x5 225x5 275x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 50x8*3'),
  ( 55, '2026-05-26-UA', 'lift', '2026-05-26 06:30:00-05', 'Upper A', 3330, null, null, null, 'barbell-bench-press 135x5 185x3 215x3 235x2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 56, '2026-05-27-RUN', 'run', '2026-05-27 06:15:00-05', 'Run', 2395, null, null, 4.3, null),
  ( 57, '2026-05-28-UB', 'lift', '2026-05-28 06:30:00-05', 'Upper B', 3164, null, null, null, 'barbell-overhead-press 150x5*2 150x4*2 | barbell-bench-press 195x8*3 | cable-face-pull 50x15*3'),
  ( 58, '2026-05-30-LB', 'lift', '2026-05-30 07:30:00-05', 'Lower B', 3848, null, null, null, 'barbell-back-squat 135x5 185x5 255x5*3 | barbell-deadlift 225x5 315x5 405x5 | lying-leg-curl-machine 110x10*3'),
  ( 59, '2026-06-01-LA', 'lift', '2026-06-01 06:30:00-05', 'Lower A', 3936, null, null, null, 'barbell-back-squat 135x5 185x5 235x5 285x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 50x8*3'),
  ( 60, '2026-06-02-UA', 'lift', '2026-06-02 06:30:00-05', 'Upper A', 3403, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 61, '2026-06-03-RUN', 'run', '2026-06-03 06:15:00-05', 'Run', 2446, null, null, 4.4, null),
  ( 62, '2026-06-04-UB', 'lift', '2026-06-04 06:30:00-05', 'Upper B', 3127, null, null, null, 'barbell-overhead-press 150x5*3 150x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 50x15*3'),
  ( 63, '2026-06-06-LB', 'lift', '2026-06-06 07:30:00-05', 'Lower B', 3861, null, null, null, 'barbell-back-squat 135x5 185x5 265x5*3 | barbell-deadlift 225x5 335x3 435x3 | lying-leg-curl-machine 110x10*3'),
  ( 64, '2026-06-07-RUN', 'run', '2026-06-07 07:30:00-05', 'Run', 3100, null, null, 5.4, null),
  ( 65, '2026-06-08-LA', 'lift', '2026-06-08 06:30:00-05', 'Lower A', 4009, null, null, null, 'barbell-back-squat 135x5 185x3 245x3 290x3 305x3 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 50x8*3'),
  ( 66, '2026-06-09-UA', 'lift', '2026-06-09 06:30:00-05', 'Upper A', 3426, null, null, null, 'barbell-bench-press 135x5 185x3 230x5*2 230x4 | barbell-bent-over-row 185x8*4 | pull-up bwx9 bwx8 bwx7'),
  ( 67, '2026-06-10-RUN', 'run', '2026-06-10 06:15:00-05', 'Run', 2493, null, null, 4.5, null),
  ( 68, '2026-06-11-UB', 'lift', '2026-06-11 06:30:00-05', 'Upper B', 3140, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 50x15*3'),
  ( 69, '2026-06-13-LB', 'lift', '2026-06-13 07:30:00-05', 'Lower B', 3874, null, null, null, 'barbell-back-squat 135x5 185x5 270x5*3 | barbell-deadlift 225x5 315x3 405x5 | lying-leg-curl-machine 110x10*3'),
  ( 70, '2026-06-15-LA', 'lift', '2026-06-15 06:30:00-05', 'Lower A', 3672, null, null, null, 'barbell-back-squat 135x5 185x5 235x5 290x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 50x8*3'),
  ( 71, '2026-06-16-UA', 'lift', '2026-06-16 06:30:00-05', 'Upper A', 3499, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*3 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  ( 72, '2026-06-17-RUN', 'run', '2026-06-17 06:15:00-05', 'Run', 2489, null, null, 4.5, null),
  ( 73, '2026-06-18-UB', 'lift', '2026-06-18 06:30:00-05', 'Upper B', 3153, null, null, null, 'barbell-overhead-press 150x5*3 150x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 50x15*3'),
  ( 74, '2026-06-20-LB', 'lift', '2026-06-20 07:30:00-05', 'Lower B', 3887, null, null, null, 'barbell-back-squat 135x5 185x5 270x5*3 | barbell-deadlift 225x5 335x3 445x2 | lying-leg-curl-machine 110x10*3'),
  ( 75, '2026-06-22-LA', 'lift', '2026-06-22 06:30:00-05', 'Lower A', 3745, null, null, null, 'barbell-back-squat 135x5 185x5 235x5 285x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  ( 76, '2026-06-23-UA', 'lift', '2026-06-23 06:30:00-05', 'Upper A', 3572, null, null, null, 'barbell-bench-press 135x5 185x3 215x3 235x2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  ( 77, '2026-06-24-RUN', 'run', '2026-06-24 06:15:00-05', 'Run', 2535, null, null, 4.6, null),
  ( 78, '2026-06-25-UB', 'lift', '2026-06-25 06:30:00-05', 'Upper B', 3166, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 55x15*3'),
  ( 79, '2026-06-27-LB', 'lift', '2026-06-27 07:30:00-05', 'Lower B', 3850, null, null, null, 'barbell-back-squat 135x5 185x5 265x5*3 | barbell-deadlift 225x5 315x5 405x5 | lying-leg-curl-machine 110x10*3'),
  ( 80, '2026-06-29-LA', 'lift', '2026-06-29 06:30:00-05', 'Lower A', 3818, null, null, null, 'barbell-back-squat 135x5 185x3 245x3 295x3 305x3 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  ( 81, '2026-06-30-UA', 'lift', '2026-06-30 06:30:00-05', 'Upper A', 3645, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  ( 82, '2026-07-01-RUN', 'run', '2026-07-01 06:15:00-05', 'Run', 2530, null, null, 4.6, null),
  ( 83, '2026-07-02-UB', 'lift', '2026-07-02 06:30:00-05', 'Upper B', 3129, null, null, null, 'barbell-overhead-press 150x5*3 150x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 55x15*3'),
  ( 84, '2026-07-04-LB', 'lift', '2026-07-04 07:30:00-05', 'Lower B', 3863, null, null, null, 'barbell-back-squat 135x5 185x5 275x5*3 | barbell-deadlift 225x5 335x3 455x1 | lying-leg-curl-machine 115x10*3'),
  ( 85, '2026-07-05-RUN', 'run', '2026-07-05 07:30:00-05', 'Run', 3522, null, null, 6.2, null),
  ( 86, '2026-07-06-LA', 'lift', '2026-07-06 06:30:00-05', 'Lower A', 3841, null, null, null, 'barbell-back-squat 135x5 185x5 235x5 290x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  ( 87, '2026-07-07-UA', 'lift', '2026-07-07 06:30:00-05', 'Upper A', 3308, null, null, null, 'barbell-bench-press 135x5 185x3 230x5*2 230x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  ( 88, '2026-07-08-RUN', 'run', '2026-07-08 06:15:00-05', 'Run', 2580, null, null, 4.7, null),
  ( 89, '2026-07-09-UB', 'lift', '2026-07-09 06:30:00-05', 'Upper B', 3142, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 55x15*3'),
  ( 90, '2026-07-13-LA', 'lift', '2026-07-13 06:30:00-05', 'Lower A', 3914, null, null, null, 'barbell-back-squat 135x5 185x3 245x3 295x3 310x2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  ( 91, '2026-07-14-UA', 'lift', '2026-07-14 06:30:00-05', 'Upper A', 3381, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*3 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  ( 92, '2026-07-15-RUN', 'run', '2026-07-15 06:15:00-05', 'Run', 2571, null, null, 4.7, null),
  ( 93, '2026-07-16-UB', 'lift', '2026-07-16 06:30:00-05', 'Upper B', 3155, null, null, null, 'barbell-overhead-press 150x5*3 150x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 55x15*3'),
  ( 94, '2026-07-18-LB', 'lift', '2026-07-18 07:30:00-05', 'Lower B', 3889, null, null, null, 'barbell-back-squat 135x5 185x5 275x5*3 | barbell-deadlift 225x5 335x3 445x2 | lying-leg-curl-machine 115x10*3'),
  ( 95, '2026-07-20-LA', 'lift', '2026-07-20 06:30:00-05', 'Lower A', 3987, null, null, null, 'barbell-back-squat 135x5 185x5 235x5 295x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  ( 96, '2026-07-21-UA', 'lift', '2026-07-21 06:30:00-05', 'Upper A', 3454, null, null, null, 'barbell-bench-press 135x5 185x3 215x3 235x2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  ( 97, '2026-07-22-RUN', 'run', '2026-07-22 06:15:00-05', 'Run', 2621, null, null, 4.8, null),
  ( 98, '2026-07-23-UB', 'lift', '2026-07-23 06:30:00-05', 'Upper B', 3168, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 55x15*3'),
  ( 99, '2026-07-25-LB', 'lift', '2026-07-25 07:30:00-05', 'Lower B', 3852, null, null, null, 'barbell-back-squat 135x5 185x5 275x5*3 | barbell-deadlift 225x5 365x3 425x1 475x1 | lying-leg-curl-machine 115x10*3'),
  (100, '2026-07-27-LA', 'lift', '2026-07-27 06:30:00-05', 'Lower A', 3700, null, null, null, 'barbell-back-squat 135x5 185x5 235x5 295x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (101, '2026-07-28-UA', 'lift', '2026-07-28 06:30:00-05', 'Upper A', 3527, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (102, '2026-07-29-RUN', 'run', '2026-07-29 06:15:00-05', 'Run', 2611, null, null, 4.8, null),
  (103, '2026-07-30-UB', 'lift', '2026-07-30 06:30:00-05', 'Upper B', 3131, null, null, null, 'barbell-overhead-press 150x5*3 150x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 55x15*3'),
  (104, '2026-08-01-LB', 'lift', '2026-08-01 07:30:00-05', 'Lower B', 3865, null, null, null, 'barbell-back-squat 135x5 185x5 270x5*3 | barbell-deadlift 225x5 315x5 405x5 | lying-leg-curl-machine 115x10*3'),
  (105, '2026-08-02-RUN', 'run', '2026-08-02 07:30:00-05', 'Run', 3653, null, null, 6.5, null),
  (106, '2026-08-03-LA', 'lift', '2026-08-03 06:30:00-05', 'Lower A', 3723, null, null, null, 'barbell-back-squat 135x5 185x3 245x3 295x3 315x2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (107, '2026-08-04-UA', 'lift', '2026-08-04 06:30:00-05', 'Upper A', 3550, null, null, null, 'barbell-bench-press 135x5 185x3 230x5*2 230x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (108, '2026-08-05-RUN', 'run', '2026-08-05 06:15:00-05', 'Run', 2661, null, null, 4.9, null),
  (109, '2026-08-06-UB', 'lift', '2026-08-06 06:30:00-05', 'Upper B', 3144, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 55x15*3'),
  (110, '2026-08-08-LB', 'lift', '2026-08-08 07:30:00-05', 'Lower B', 3878, null, null, null, 'barbell-back-squat 135x5 185x5 280x5*3 | barbell-deadlift 225x5 335x3 445x3 | lying-leg-curl-machine 120x10*3'),
  (111, '2026-08-10-LA', 'lift', '2026-08-10 06:30:00-05', 'Lower A', 3796, null, null, null, 'barbell-back-squat 135x5 185x5 235x5 285x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (112, '2026-08-11-UA', 'lift', '2026-08-11 06:30:00-05', 'Upper A', 3623, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*3 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (113, '2026-08-12-RUN', 'run', '2026-08-12 06:15:00-05', 'Run', 2656, null, null, 4.9, null),
  (114, '2026-08-13-UB', 'lift', '2026-08-13 06:30:00-05', 'Upper B', 3157, null, null, null, 'barbell-overhead-press 150x5*3 150x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 55x15*3'),
  (115, '2026-08-15-LB', 'lift', '2026-08-15 07:30:00-05', 'Lower B', 3841, null, null, null, 'barbell-back-squat 135x5 185x5 270x5*3 | barbell-deadlift 225x5 315x5 415x5 | lying-leg-curl-machine 120x10*3'),
  (116, '2026-08-17-LA', 'lift', '2026-08-17 06:30:00-05', 'Lower A', 3869, null, null, null, 'barbell-back-squat 135x5 185x5 245x5 295x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (117, '2026-08-18-UA', 'lift', '2026-08-18 06:30:00-05', 'Upper A', 3336, null, null, null, 'barbell-bench-press 135x5 185x3 215x3 235x2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (118, '2026-08-19-RUN', 'run', '2026-08-19 06:15:00-05', 'Run', 2700, null, null, 5, null),
  (119, '2026-08-22-LB', 'lift', '2026-08-22 07:30:00-05', 'Lower B', 3854, null, null, null, 'barbell-back-squat 135x5 185x5 275x5*3 | barbell-deadlift 225x5 335x3 455x2 | lying-leg-curl-machine 120x10*3'),
  (120, '2026-08-24-LA', 'lift', '2026-08-24 06:30:00-05', 'Lower A', 3942, null, null, null, 'barbell-back-squat 135x5 185x3 245x3 295x3 305x3 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (121, '2026-08-25-UA', 'lift', '2026-08-25 06:30:00-05', 'Upper A', 3409, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (122, '2026-08-26-RUN', 'run', '2026-08-26 06:15:00-05', 'Run', 2695, null, null, 5, null),
  (123, '2026-08-27-UB', 'lift', '2026-08-27 06:30:00-05', 'Upper B', 3133, null, null, null, 'barbell-overhead-press 150x5*3 150x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 60x15*3'),
  (124, '2026-08-29-LB', 'lift', '2026-08-29 07:30:00-05', 'Lower B', 3867, null, null, null, 'barbell-back-squat 135x5 185x5 280x5*3 | barbell-deadlift 225x5 315x5 405x5 | lying-leg-curl-machine 120x10*3'),
  (125, '2026-08-30-RUN', 'run', '2026-08-30 07:30:00-05', 'Run', 3899, null, null, 7, null),
  (126, '2026-08-31-LA', 'lift', '2026-08-31 06:30:00-05', 'Lower A', 3965, null, null, null, 'barbell-back-squat 135x5 185x5 235x5 295x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (128, '2026-09-01-UA', 'lift', '2026-09-01 06:30:00-05', 'Upper A', 3432, null, null, null, 'barbell-bench-press 135x5 185x3 230x5*2 230x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (129, '2026-09-02-RUN', 'run', '2026-09-02 06:15:00-05', 'Run', 2685, null, null, 5, null),
  (130, '2026-09-03-UB', 'lift', '2026-09-03 06:30:00-05', 'Upper B', 3146, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 60x15*3'),
  (131, '2026-09-05-LB', 'lift', '2026-09-05 07:30:00-05', 'Lower B', 3880, null, null, null, 'barbell-back-squat 135x5 185x5 275x5*3 | barbell-deadlift 225x5 335x3 455x2 | lying-leg-curl-machine 120x10*3'),
  (132, '2026-09-07-LA', 'lift', '2026-09-07 06:30:00-05', 'Lower A', 3678, null, null, null, 'barbell-back-squat 135x5 185x5 245x5 300x5 300x4 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (133, '2026-09-08-UA', 'lift', '2026-09-08 06:30:00-05', 'Upper A', 3505, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*3 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (134, '2026-09-09-RUN', 'run', '2026-09-09 06:15:00-05', 'Run', 2734, null, null, 5.1, null),
  (135, '2026-09-10-UB', 'lift', '2026-09-10 06:30:00-05', 'Upper B', 3159, null, null, null, 'barbell-overhead-press 150x5*3 150x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 60x15*3'),
  (136, '2026-09-12-LB', 'lift', '2026-09-12 07:30:00-05', 'Lower B', 3843, null, null, null, 'barbell-back-squat 135x5 185x5 280x5*3 | barbell-deadlift 225x5 335x3 445x3 | lying-leg-curl-machine 125x10*3'),
  (137, '2026-09-14-LA', 'lift', '2026-09-14 06:30:00-05', 'Lower A', 3751, null, null, null, 'barbell-back-squat 135x5 185x3 245x3 295x3 315x2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (138, '2026-09-15-UA', 'lift', '2026-09-15 06:30:00-05', 'Upper A', 3578, null, null, null, 'barbell-bench-press 135x5 185x3 215x3 235x2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (139, '2026-09-16-RUN', 'run', '2026-09-16 06:15:00-05', 'Run', 2729, null, null, 5.1, null),
  (140, '2026-09-17-UB', 'lift', '2026-09-17 06:30:00-05', 'Upper B', 3122, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 60x15*3'),
  (141, '2026-09-19-LB', 'lift', '2026-09-19 07:30:00-05', 'Lower B', 3856, null, null, null, 'barbell-back-squat 135x5 185x5 280x5*3 | barbell-deadlift 225x5 315x5 425x5 | lying-leg-curl-machine 125x10*3'),
  (142, '2026-09-21-LA', 'lift', '2026-09-21 06:30:00-05', 'Lower A', 3824, null, null, null, 'barbell-back-squat 135x5 185x5 245x5 300x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (143, '2026-09-22-UA', 'lift', '2026-09-22 06:30:00-05', 'Upper A', 3601, null, null, null, 'barbell-bench-press 135x5 185x3 225x5*2 225x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (144, '2026-09-23-RUN', 'run', '2026-09-23 06:15:00-05', 'Run', 2772, null, null, 5.2, null),
  (145, '2026-09-24-UB', 'lift', '2026-09-24 06:30:00-05', 'Upper B', 3135, null, null, null, 'barbell-overhead-press 150x5*3 150x4 | barbell-bench-press 205x8*2 205x7 | cable-face-pull 60x15*3'),
  (146, '2026-09-26-LB', 'lift', '2026-09-26 07:30:00-05', 'Lower B', 3869, null, null, null, 'barbell-back-squat 135x5 185x5 285x5*3 | barbell-deadlift 225x5 335x3 465x1 | lying-leg-curl-machine 125x10*3'),
  (147, '2026-09-27-RUN', 'run', '2026-09-27 07:30:00-05', 'Run', 4133, null, null, 7.5, null),
  (148, '2026-09-28-LA', 'lift', '2026-09-28 06:30:00-05', 'Lower A', 3847, null, null, null, 'barbell-back-squat 135x5 185x5 245x5 300x5*2 | barbell-romanian-deadlift 245x8*3 | dumbbell-split-squat 55x8*3'),
  (149, '2026-09-29-UA', 'lift', '2026-09-29 06:30:00-05', 'Upper A', 3314, null, null, null, 'barbell-bench-press 135x5 185x3 230x5*2 230x4 | barbell-bent-over-row 185x8*4 | pull-up bwx10 bwx9 bwx8'),
  (150, '2026-09-30-RUN', 'run', '2026-09-30 06:15:00-05', 'Run', 2766, null, null, 5.2, null),
  (151, '2026-10-01-UB', 'lift', '2026-10-01 06:30:00-05', 'Upper B', 3148, null, null, null, 'barbell-overhead-press 145x5*4 | barbell-bench-press 195x8*3 | cable-face-pull 60x15*3');

insert into fl_events (ord, label, kind, at, chapter_n, next_n, next_name, next_start, end_date, reflection)
values (36, 'seal-1', 'seal', '2026-05-01 19:00:00-05', 1, 2, 'Chapter II — Stronger Than Before', '2026-05-01', '2026-04-30', 'Came back slower than I wanted. Came back anyway.');

insert into fl_events (ord, label, kind, at, name, chapter_n, acc_date, featured)
values (45, 'bench-235', 'acc', '2026-05-12 08:05:00-05', 'Bench Press 235', 2, '2026-05-12', true);

insert into fl_events (ord, label, kind, at, chapter_n, next_n, next_name, next_start, end_date, reflection)
values (127, 'seal-2', 'seal', '2026-09-01 05:45:00-05', 2, 3, 'Chapter III — Still Writing', '2026-09-01', '2026-08-31', 'Stronger than before. The numbers say so too.');

do $$
declare
  v_j     uuid := pg_temp.fl_id('user:jordan');
  v_prog  uuid := pg_temp.fl_id('program:return-to-strength');
  e       record;
  r       record;
  x       record;
  t       text;
  v_wid   uuid;
  v_weid  uuid;
  v_ch    uuid;
  v_saved timestamptz;
  v_pos   int;
  v_si    int;
  v_key   text;
  v_note  text;
  v_body  text;
  v_name  text;
  v_w     numeric;
  v_reps  int;
  v_n     int;
  v_i     int;
  v_prior numeric;
  v_done  int;
begin
  for e in select * from fl_events order by ord loop
    if e.kind in ('lift', 'run') then
      v_wid   := pg_temp.fl_id('workout:' || e.label);
      v_saved := e.at + make_interval(secs => e.dur_sec);
      select c.id into v_ch from public.chapters c where c.athlete_id = v_j and c.is_active;   -- as save_workout (0242:100)
      if v_ch is null then raise exception 'no active chapter for %', e.label; end if;

      -- workouts (0001:69 + 0018 program_id + 0234 source default 'forge'). saved_at/created_at = the session's real end.
      insert into public.workouts (id, athlete_id, chapter_id, program_id, workout_name, activity_type, started_at, saved_at,
                                   duration_sec, state, distance, distance_unit, created_at)
      values (v_wid, v_j, v_ch, case when e.prog_week is not null then v_prog end, e.name,
              (case when e.kind = 'run' then 'running' else 'strength' end)::modality,
              e.at, v_saved, e.dur_sec, 'saved', e.miles, case when e.miles is not null then 'mi' end, v_saved);

      -- workout_exercises + workout_sets. spec = 'key[{note}] 135x5 185x5*3 bwx8 | key …'  (bw = bodyweight, no load)
      v_pos := 0;
      for t in select btrim(s) from unnest(string_to_array(coalesce(e.spec, ''), '|')) s where btrim(s) <> '' loop
        v_key  := substring(t from '^([a-z0-9-]+)');
        v_note := substring(t from '^[a-z0-9-]+[{]([^}]*)[}]');
        v_body := btrim(regexp_replace(t, '^[a-z0-9-]+([{][^}]*[}])?', ''));
        v_name := null;
        select f.name into v_name from fl_ex f where f.key = v_key;
        if v_name is null then raise exception 'unknown exercise key % in %', v_key, e.label; end if;
        v_weid := pg_temp.fl_id('we:' || e.label || ':' || v_pos);
        insert into public.workout_exercises (id, workout_id, catalog_key, name, section, position, notes)
        values (v_weid, v_wid, v_key, v_name, 'main', v_pos, v_note);
        v_si := 0;
        for x in select tok from unnest(string_to_array(v_body, ' ')) tok where tok <> '' loop
          v_w    := nullif(split_part(x.tok, 'x', 1), 'bw')::numeric;
          v_reps := split_part(split_part(x.tok, 'x', 2), '*', 1)::int;
          v_n    := coalesce(nullif(split_part(x.tok, '*', 2), '')::int, 1);
          for v_i in 1..v_n loop
            insert into public.workout_sets (id, workout_exercise_id, set_index, weight, weight_unit, reps)
            values (pg_temp.fl_id('ws:' || e.label || ':' || v_pos || ':' || v_si), v_weid, v_si, v_w, 'lb', v_reps);
            v_si := v_si + 1;
          end loop;
        end loop;
        v_pos := v_pos + 1;
      end loop;

      -- PRs exactly as the app decides them (metrics.ts detectPRs): main section, load > 0, 1–5 reps, strictly
      -- heavier than the stored best (reps ≤ 5); the first mark on a lift is written as a baseline. Then the row
      -- and the ACCOMPLISHMENT timeline event save_workout writes for each (0242:154-158).
      for r in
        select we.catalog_key as key, we.name, we.position, max(ws.weight) as w
          from public.workout_exercises we
          join public.workout_sets ws on ws.workout_exercise_id = we.id
         where we.workout_id = v_wid and we.section = 'main' and ws.weight > 0 and ws.reps between 1 and 5
         group by we.catalog_key, we.name, we.position
         order by we.position
      loop
        select max(p.load_value) into v_prior
          from public.personal_records p
         where p.athlete_id = v_j and p.measure_kind = 'load' and p.load_value > 0 and p.load_reps between 1 and 5
           and (p.catalog_key = r.key or (p.catalog_key is null and p.exercise = r.name));
        if v_prior is null or r.w > v_prior then
          select ws.reps into v_reps
            from public.workout_sets ws
            join public.workout_exercises we on we.id = ws.workout_exercise_id
           where we.workout_id = v_wid and we.position = r.position and ws.weight = r.w and ws.reps between 1 and 5
           order by ws.set_index limit 1;
          insert into public.personal_records (id, athlete_id, exercise, catalog_key, achieved_on, measure_kind,
                                               load_value, load_unit, load_reps, workout_id, created_at)
          values (pg_temp.fl_id('pr:' || e.label || ':' || r.key), v_j, r.name, r.key, (v_saved at time zone 'UTC')::date,
                  'load', r.w, 'lb', v_reps, v_wid, v_saved);
          insert into public.timeline_events (id, athlete_id, event_type, object_name, chapter_id, occurred_at,
                                              source_entity_type, created_at)
          values (pg_temp.fl_id('tl:pr:' || e.label || ':' || r.key), v_j, 'ACCOMPLISHMENT',
                  r.name || ' — ' || r.w::text || ' lb PR', v_ch, v_saved, 'personal_record', v_saved);
        end if;
      end loop;

      update public.chapters set workout_count = workout_count + 1 where id = v_ch;   -- 0242:162

      -- Which program session this was, and graduation (0242:171-240).
      if e.prog_week is not null then
        insert into public.program_sessions (id, program_id, athlete_id, week_index, day_index, state, workout_id, created_at)
        values (pg_temp.fl_id('ps:' || e.prog_week || ':' || e.prog_day), v_prog, v_j, e.prog_week, e.prog_day,
                'completed', v_wid, v_saved);
        select count(*) into v_done from public.program_sessions ps where ps.program_id = v_prog;
        if v_done >= (select public.program_total_sessions(p.structure) from public.programs p where p.id = v_prog) then
          update public.programs set state = 'graduated', ended_at = v_saved, updated_at = v_saved
           where id = v_prog and state = 'active';
          if found then
            insert into public.timeline_events (id, athlete_id, event_type, object_name, chapter_id, occurred_at,
                                                source_entity_type, source_entity_id, created_at)
            select pg_temp.fl_id('tl:program-graduated'), v_j, 'PROGRAM_GRADUATED'::flm_event_type, p.name, v_ch, v_saved,
                   'program', v_prog, v_saved
              from public.programs p where p.id = v_prog;
          end if;
        end if;
      end if;

      perform pg_temp.fl_honors(v_j, v_saved);

    elsif e.kind = 'seal' then
      -- sealChapter() (chapter-detail-live.ts:220) + the next chapter (chapter-detail-live.ts:198 shape).
      update public.chapters
         set is_active = false, sealed_at = e.at, end_date = e.end_date, reflection = e.reflection
       where id = pg_temp.fl_id('chapter:jordan:' || e.chapter_n) and athlete_id = v_j;
      insert into public.chapters (id, athlete_id, name, start_date, is_active, workout_count, honor_count, created_at)
      values (pg_temp.fl_id('chapter:jordan:' || e.next_n), v_j, e.next_name, e.next_start, true, 0, 0, e.at);
      perform pg_temp.fl_honors(v_j, e.at);

    elsif e.kind = 'acc' then
      -- An accomplishment Jordan pins himself (accomplishments-live.ts; 0023). No note, so no metric moves.
      insert into public.accomplishments (id, athlete_id, name, date, chapter_id, featured, created_at)
      values (pg_temp.fl_id('acc:' || e.label), v_j, e.name, e.acc_date, pg_temp.fl_id('chapter:jordan:' || e.chapter_n),
              e.featured, e.at);

    elsif e.kind = 'squad' then
      -- Squad "Ironside" (0029 + later columns). Inserted AFTER this stage's workouts, as asked; its own trigger
      -- squads_set_invite_code_trg (0040/0161) fills invite_code.
      insert into public.squads (id, name, description, privacy, owner_id, motto, weekly_standard, created_at, updated_at)
      select pg_temp.fl_id('squad:ironside'), 'Ironside', 'We lift, we run, we show up.', 'private', v_j, 'Show up.', 3, e.at, e.at
       where not exists (select 1 from public.squads s where s.id = pg_temp.fl_id('squad:ironside'));
      -- push_squad_members (0120:442) fires per row and calls push_enqueue_for(owner = Jordan): Jordan has no
      -- push_baseline_at and no push_tokens, so it files nothing (0120:340-345).
      insert into public.squad_members (squad_id, user_id, role, joined_at)
      select pg_temp.fl_id('squad:ironside'), d.id, case when d.who = 'jordan' then 'owner' else 'member' end, j.joined_at
        from fl_demo d
        join (values ('jordan', timestamptz '2026-01-10 12:00:00-06'), ('dre', timestamptz '2026-01-10 18:10:00-06'), ('sam', timestamptz '2026-01-11 09:00:00-06'), ('alex', timestamptz '2026-01-12 20:30:00-06'), ('taylor', timestamptz '2026-01-14 19:00:00-06'), ('morgan', timestamptz '2026-01-16 07:45:00-06')) j(who, joined_at) on j.who = d.who
      on conflict (squad_id, user_id) do nothing;
      -- The five joins are 'member_joined' rows in Jordan's derived inbox (0251:395, unwindowed for the owner) and
      -- notification_unread_count() (0110) counts everything newer than notifications_seen_at: mark them read, so
      -- Home's bell carries no badge on camera.
      update public.profiles set notifications_seen_at = timestamptz '2026-01-16 08:00:00-06'
       where id = v_j and (notifications_seen_at is null or notifications_seen_at < timestamptz '2026-01-16 08:00:00-06');
      perform pg_temp.fl_honors(v_j, e.at);
    end if;
  end loop;
end $$;

-- ─── §1d · stored rank ───────────────────────────────────────────────────────────────────────────────────────
-- Stored rank = what rank-live would have stored by this date (rank-live.ts:252-264), so no ceremony fires on
-- capture. athlete_rank_state.rank_level is 1–25 (family×4+sub); profiles.rank_level is the SUB-TIER 1–4.
insert into public.athlete_rank_state (athlete_id, family, sub_tier, rank_level, journey_start_date, family_entry_date, updated_at)
select d.id, 'builder', 4, 8, date '2026-01-05', date '2026-02-09', '2026-05-10 08:45:00-05'
  from fl_demo d where d.who = 'jordan'
on conflict (athlete_id) do update
   set family = excluded.family, sub_tier = excluded.sub_tier, rank_level = excluded.rank_level,
       journey_start_date = excluded.journey_start_date, family_entry_date = excluded.family_entry_date,
       updated_at = excluded.updated_at;
update public.profiles p set rank_family = 'builder', rank_level = 4
  from fl_demo d where d.who = 'jordan' and p.id = d.id;

-- ─── §2 · assert ─────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT AND RAISE. Any failure rolls the whole stage back.
do $$
declare
  v_j  uuid := pg_temp.fl_id('user:jordan');
  v_n  bigint;
  v_wk int;
  v_dy int;
begin
  select count(*) into v_n from public.workouts where athlete_id = v_j and state = 'saved';
  if v_n <> 195 then raise exception 'saved workouts = %, expected 195', v_n; end if;
  if exists (select 1 from public.workouts where athlete_id = v_j and id::text not like 'f11de000%') then
    raise exception 'a non-seeded workout survived the rewind';
  end if;
  select count(*) into v_n from public.personal_records where athlete_id = v_j;
  if v_n <> 48 then raise exception 'personal_records = %, expected 48', v_n; end if;
  select count(*) into v_n from public.chapters where athlete_id = v_j and is_active;
  if v_n <> 1 then raise exception 'active chapters = %, expected exactly 1', v_n; end if;
  select workout_count into v_n from public.chapters where id = pg_temp.fl_id('chapter:jordan:1');
  if v_n is distinct from 82 then raise exception 'Chapter 1 workout_count is %, expected 82', v_n; end if;
  select workout_count into v_n from public.chapters where id = pg_temp.fl_id('chapter:jordan:2');
  if v_n is distinct from 89 then raise exception 'Chapter 2 workout_count is %, expected 89', v_n; end if;
  select workout_count into v_n from public.chapters where id = pg_temp.fl_id('chapter:jordan:3');
  if v_n is distinct from 24 then raise exception 'Chapter 3 workout_count is %, expected 24', v_n; end if;
  if (select state from public.programs where id = pg_temp.fl_id('program:return-to-strength')) <> 'graduated' then
    raise exception 'the program did not graduate';
  end if;
  if (select max(started_at) from public.workouts where athlete_id = v_j) <> timestamptz '2026-10-01 06:30:00-05' then
    raise exception 'newest workout is not 2026-10-01-UB';
  end if;
  if not exists (select 1 from public.honor_instances h where h.athlete_id = v_j and h.honor_type = 'club_1000'
                   and h.celebrated_at is null and h.date_earned = date '2026-05-12') then
    raise exception '1,000 Pound Club was not earned on 2026-05-12 (or is already celebrated) — the stage-4 ceremony would not play';
  end if;
  if exists (select 1 from public.honor_instances h where h.athlete_id = v_j and h.celebrated_at is null and h.honor_type <> 'club_1000') then
    raise exception 'an honor other than club_1000 is uncelebrated — it would stack a second ceremony';
  end if;
  -- Nothing may sit in the push outbox for, or about, any demo account (0120 push_outbox; 0137 signup alerts).
  if exists (select 1 from public.push_outbox o join fl_demo d on d.id = o.user_id or d.id = o.actor_id) then
    raise exception 'a push_outbox row exists for a demo account';
  end if;
  -- Nothing may have been written for anybody else: every row this stage dated on/after 2026-03-16 00:00:00-05 belongs to Jordan.
  if exists (select 1 from public.workouts w where w.saved_at >= '2026-03-16 00:00:00-05' and w.id::text like 'f11de000%' and w.athlete_id <> v_j) then
    raise exception 'a seeded workout belongs to someone other than Jordan';
  end if;
  if (select rank_level from public.athlete_rank_state where athlete_id = v_j) <> 8 then
    raise exception 'stored rank is not Builder IV';
  end if;
end $$;

commit;

-- ─── §3 · report ─────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE REPORT (read-only, the one result the SQL editor shows). "actual" must equal "expected" on every row.
select v.check_name, v.actual, v.expected, case when v.actual = v.expected then 'ok' else 'CHECK' end as verdict
  from (values
    ('1 · saved workouts (all-time)', (select count(*) from public.workouts where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and state = 'saved')::text, '195'),
    ('2 · of which runs · miles', (select count(*) || ' · ' || coalesce(sum(distance), 0) from public.workouts where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and activity_type = 'running'), '47 · 205.3'),
    ('3 · personal_records rows', (select count(*) from public.personal_records where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app'))::text, '48'),
    ('4 · squat best · bench best (lb)', (select coalesce(max(load_value) filter (where catalog_key = 'barbell-back-squat'), 0) || ' · ' || coalesce(max(load_value) filter (where catalog_key = 'barbell-bench-press'), 0) from public.personal_records where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), '315 · 235'),
    ('5 · honors (all) · uncelebrated', (select count(*) || ' · ' || count(*) filter (where celebrated_at is null) from public.honor_instances where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), '38 · 1'),
    ('6 · chapters (name: workouts, state)', (select string_agg(name || ': ' || workout_count || case when is_active then ' active' else ' sealed' end, ' | ' order by start_date) from public.chapters where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Chapter I — The Return: 82 sealed | Chapter II — Stronger Than Before: 89 sealed | Chapter III — Still Writing: 24 active'),
    ('7 · program · sessions done · next', (select p.state || ' · ' || (select count(*) from public.program_sessions ps where ps.program_id = p.id) || ' · ' || coalesce((select 'week ' || (s.week_index + 1) || ' ' || (p.structure -> 'days' -> s.day_index ->> 'name') from public.program_slots(p.structure) s where not exists (select 1 from public.program_sessions ps where ps.program_id = p.id and ps.week_index = s.week_index and ps.day_index = s.day_index) order by s.ordinal limit 1), 'none') from public.programs p where p.athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and p.name = 'Return to Strength'), 'graduated · 48 · none'),
    ('8 · newest workout (Chicago)', (select to_char(max(started_at) at time zone 'America/Chicago', 'Dy Mon DD HH24:MI') from public.workouts where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Thu Oct 01 06:30'),
    ('9 · stored rank', (select initcap(family) || ' ' || (array['I','II','III','IV'])[sub_tier] || ' (level ' || rank_level || ')' from public.athlete_rank_state where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Builder IV (level 8)'),
    ('10 · squad Ironside members', (select count(*)::text from public.squad_members m join public.squads s on s.id = m.squad_id where s.owner_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and s.name = 'Ironside'), '6'),
    ('11 · push_outbox rows for/about demo accounts', (select count(*)::text from public.push_outbox o join auth.users u on u.id in (o.user_id, o.actor_id) where u.email like '%.demo@forgelegacy.app'), '0'),
    ('12 · the ceremony honor', (select string_agg(display_name || ' · ' || date_earned, ', ') from public.honor_instances where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app') and celebrated_at is null), '1,000 Pound Club · 2026-05-12'),
    ('13 · accomplishments', (select string_agg(name, ' | ' order by date) from public.accomplishments where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')), 'Back Squat 225 × 5 | Bench Press 235')
  ) v(check_name, actual, expected);


-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- FILM SEED · STAGE 4b · Jordan's Legacy, filled in   (NOT a migration — data for the hero film)
--
-- PO 10-02: "more awards on the legacy page… some accomplishments… make it more in depth — that's where the
-- emotional hits". Runs AFTER stage 4 (it refuses before). Every line below is true to the seeded year:
--   Accomplishments (athlete-authored, 0023), five more beside stage 4's "Bench Press 235" and stage 2's
--   "Back Squat 225 × 5" — each one a moment the seed's own workouts contain:
--     Deadlift 405 × 3 (Apr 18) · 100 miles run (Jun 10) · First 10K — 6.2 mi (Jul 5) · Deadlift 475 (Jul 25) ·
--     Squat 315 (Aug 3). Featured (max 3 in the app): Bench Press 235, Deadlift 475, First 10K.
--   Pinned Legacy (pins, 0005 + 0024), six pins in this order: Bench Press 235 · 1,000 Pound Club · Chapter I — The
--   Return · First 10K — 6.2 mi · Squat 315 (honor) · Deadlift 475. Shaped exactly as the app's pinCandidate writes
--   them (legacy-pins-live.ts:60-85): title, subtitle, ref_id = the real row, position 0..5.
-- No note on any accomplishment, so no honor metric moves; no trigger exists on accomplishments or pins.
--
-- PASTE THE WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice (it replaces its own rows).
-- Undo: stage 4 (or 2-REDO) removes the accomplishments; 2-REDO also removes every pin of Jordan's.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

begin;
set local statement_timeout = '5min';
set local lock_timeout = '15s';
set local timezone = 'UTC';
set local search_path = public, extensions;

create or replace function pg_temp.fl_id(p text) returns uuid language sql immutable as $fn$
  select ('f11de000' || substr(md5('forge-film:' || p), 9, 4) || '4' || substr(md5('forge-film:' || p), 14, 3) || '8' || substr(md5('forge-film:' || p), 18, 15))::uuid
$fn$;

create temp table fl_demo on commit drop as
select v.who, u.id, u.email::text as email
  from (values ('jordan', 'jordan.demo@forgelegacy.app')) v(who, email)
  join auth.users u on lower(u.email) = v.email;

do $$
declare v_j uuid;
begin
  if exists (select 1 from fl_demo d where d.email not like '%.demo@forgelegacy.app') then
    raise exception 'REFUSED: a targeted account is not a .demo@forgelegacy.app address — nothing was changed.';
  end if;
  select d.id into v_j from fl_demo d where d.who = 'jordan';
  if v_j is null or v_j <> pg_temp.fl_id('user:jordan') then raise exception 'the seeded jordan.demo@ account is missing — run stages 0..4 first'; end if;
  if not exists (select 1 from public.chapters c where c.id = pg_temp.fl_id('chapter:jordan:2') and c.athlete_id = v_j) then
    raise exception 'stage 4 is not applied (Chapter II is missing) — paste seed-demo-jordan-4-year.sql first';
  end if;
  if not exists (select 1 from public.accomplishments a where a.id = pg_temp.fl_id('acc:bench-235')) then
    raise exception 'stage 4''s "Bench Press 235" accomplishment is missing — re-run stage 4';
  end if;
end $$;

-- §1 · accomplishments (replaces its own five rows)
delete from public.accomplishments a using fl_demo d where d.who = 'jordan' and a.athlete_id = d.id
   and a.id in (pg_temp.fl_id('acc:dl-405'), pg_temp.fl_id('acc:100-miles'), pg_temp.fl_id('acc:first-10k'),
                pg_temp.fl_id('acc:dl-475'), pg_temp.fl_id('acc:squat-315'));
insert into public.accomplishments (id, athlete_id, name, date, chapter_id, featured, created_at)
select pg_temp.fl_id('acc:' || v.label), d.id, v.name, v.dt::date, pg_temp.fl_id('chapter:jordan:' || v.ch), v.featured, v.at::timestamptz
  from fl_demo d,
       (values ('dl-405',    'Deadlift 405 × 3',   '2026-04-18', 1, false, '2026-04-18 09:10:00-05'),
               ('100-miles', '100 miles run',      '2026-06-10', 2, false, '2026-06-10 07:40:00-05'),
               ('first-10k', 'First 10K — 6.2 mi', '2026-07-05', 2, true,  '2026-07-05 08:30:00-05'),
               ('dl-475',    'Deadlift 475',       '2026-07-25', 2, true,  '2026-07-25 09:05:00-05'),
               ('squat-315', 'Squat 315',          '2026-08-03', 2, false, '2026-08-03 08:00:00-05')) v(label, name, dt, ch, featured, at)
 where d.who = 'jordan';

-- §2 · pins (Jordan's whole Pinned Legacy, in order)
delete from public.pins p using fl_demo d where d.who = 'jordan' and p.athlete_id = d.id;
insert into public.pins (id, athlete_id, kind, title, subtitle, ref_id, position, created_at)
select pg_temp.fl_id('pin:' || v.pos), d.id, v.kind::pin_kind, v.title, v.subtitle, v.ref, v.pos, timestamptz '2026-09-01 06:00:00-05' + (v.pos || ' minutes')::interval
  from fl_demo d,
       (values (0, 'accomplishment', 'Bench Press 235',        'May 12, 2026 · Chapter II — Stronger Than Before', pg_temp.fl_id('acc:bench-235')),
               (1, 'honor',          '1,000 Pound Club',       'Honor · May 12, 2026',
                  (select h.id from public.honor_instances h where h.athlete_id = pg_temp.fl_id('user:jordan') and h.honor_type = 'club_1000' limit 1)),
               (2, 'chapter',        'Chapter I — The Return', 'Sealed chapter', pg_temp.fl_id('chapter:jordan:1')),
               (3, 'accomplishment', 'First 10K — 6.2 mi',     'Jul 5, 2026 · Chapter II — Stronger Than Before', pg_temp.fl_id('acc:first-10k')),
               (4, 'honor',          'Squat 315',              'Honor · Aug 3, 2026',
                  (select h.id from public.honor_instances h where h.athlete_id = pg_temp.fl_id('user:jordan') and h.display_name = 'Squat 315' limit 1)),
               (5, 'accomplishment', 'Deadlift 475',           'Jul 25, 2026 · Chapter II — Stronger Than Before', pg_temp.fl_id('acc:dl-475'))) v(pos, kind, title, subtitle, ref)
 where d.who = 'jordan';

-- §3 · assert
do $$
begin
  if (select count(*) from public.accomplishments a where a.athlete_id = pg_temp.fl_id('user:jordan')) <> 7 then
    raise exception 'expected 7 accomplishments, found %', (select count(*) from public.accomplishments a where a.athlete_id = pg_temp.fl_id('user:jordan'));
  end if;
  if (select count(*) from public.accomplishments a where a.athlete_id = pg_temp.fl_id('user:jordan') and a.featured) <> 3 then
    raise exception 'expected 3 featured accomplishments';
  end if;
  if exists (select 1 from public.pins p where p.athlete_id = pg_temp.fl_id('user:jordan') and p.ref_id is null) then
    raise exception 'a pin has no ref_id (an honor it points at is missing)';
  end if;
end $$;

commit;

-- §4 · report (the one result the SQL editor shows)
select 'accomplishments' as what,
       (select string_agg(a.name || case when a.featured then ' ★' else '' end, ' · ' order by a.date)
          from public.accomplishments a join auth.users u on u.id = a.athlete_id where u.email = 'jordan.demo@forgelegacy.app') as actual,
       '7 (★ Bench Press 235, First 10K, Deadlift 475)' as expected
union all
select 'pins',
       (select string_agg(p.position || ' ' || p.kind || ': ' || p.title, ' · ' order by p.position)
          from public.pins p join auth.users u on u.id = p.athlete_id where u.email = 'jordan.demo@forgelegacy.app'),
       '6, in order';
