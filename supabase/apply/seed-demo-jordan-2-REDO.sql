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
