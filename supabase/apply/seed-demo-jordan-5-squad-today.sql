-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- FILM SEED · STAGE 5 · "the whole squad trained today"   (NOT a migration — data for the hero film's squad shot)
--
-- PO 10-02: add Squads to the film. The shot is the Squads tab's own Ironside card, which reads
-- "N / 6 trained today" with one bar per member ((tabs)/squads.tsx:274-287). It counts members with a SAVED workout
-- since the viewer's local midnight (squad_trained_since, 0108:48-80). Today the five squadmates have never trained,
-- so it reads 0 / 6. This gives all six members — Jordan and his five squadmates — one session TODAY (America/Chicago),
-- every one of them earlier than the moment you paste, so the card reads 6 / 6.
--
-- PASTE THE WHOLE FILE into the Supabase SQL editor and run it once. Safe to run again (it replaces its own six rows;
-- run on another day, it moves them to that day).
-- Needs stage RESTORE-YEAR (or stage 4) applied. Paste it after 13:30 Chicago time on the day of the capture.
--
-- Writes: 6 workouts (+ workout_exercises / workout_sets for the four lifting sessions), one per demo account, ids
-- 'f11de000…' (label 'workout:squad-today:<who>'); each account's chapters.workout_count recounted (as save_workout
-- keeps it, 0242:162); Jordan's notifications_seen_at = now() so the six "Session logged" inbox rows (0251:569) put no
-- badge on his bell.
-- Not written, on purpose: no squad posts (the shot is the tab card), no PR rows and no honors for anyone (nothing
-- here beats Jordan's records; the squadmates' rows are first sessions and the film never shows their records).
-- Side effects outside the six demo accounts: NONE. The only trigger is push_workout_saved (0234:344) →
-- push_enqueue_for(each Ironside member) → 0, because every member is a demo account with no push token and no
-- push_baseline_at (0246:33-34). §2 asserts both: every Ironside member is a demo account, and no push_outbox row
-- exists for or about one.
--
-- Expected result: 6 / 6 trained today, every row 'ok'.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

begin;

set local statement_timeout = '2min';
set local lock_timeout = '15s';
set local timezone = 'UTC';
set local search_path = public, extensions;

create or replace function pg_temp.fl_id(p text) returns uuid language sql immutable as $fn$
  select ('f11de000' || substr(md5('forge-film:' || p), 9, 4) || '4' || substr(md5('forge-film:' || p), 14, 3) || '8' || substr(md5('forge-film:' || p), 18, 15))::uuid
$fn$;

create temp table fl_demo on commit drop as
select v.who, u.id, u.email::text as email
  from (values ('jordan', 'jordan.demo@forgelegacy.app'), ('dre', 'dre.demo@forgelegacy.app'), ('sam', 'sam.demo@forgelegacy.app'), ('alex', 'alex.demo@forgelegacy.app'), ('taylor', 'taylor.demo@forgelegacy.app'), ('morgan', 'morgan.demo@forgelegacy.app')) v(who, email)
  join auth.users u on lower(u.email) = v.email;

-- §2-guard (before anything is written): only '.demo@forgelegacy.app' accounts, and Ironside holds nobody else.
do $$
begin
  if exists (select 1 from fl_demo d where d.email not like '%.demo@forgelegacy.app') then
    raise exception 'REFUSED: a targeted account is not a .demo@forgelegacy.app address — nothing was changed.';
  end if;
  if exists (select 1 from public.squad_members m join auth.users u on u.id = m.user_id
              where m.squad_id = pg_temp.fl_id('squad:ironside') and u.email not like '%.demo@forgelegacy.app') then
    raise exception 'REFUSED: Ironside has a member who is not a demo account (a push could reach a real person) — nothing was changed.';
  end if;
end $$;

-- §0 — PREFLIGHT.
do $$
declare
  v_j     uuid;
  v_local timestamp := now() at time zone 'America/Chicago';
begin
  select d.id into v_j from fl_demo d where d.who = 'jordan';
  if v_j is null then raise exception 'jordan.demo@forgelegacy.app does not exist — paste seed-demo-jordan-0-accounts.sql first'; end if;
  if v_j <> pg_temp.fl_id('user:jordan') then raise exception 'jordan.demo@ exists with an id this seed did not create'; end if;
  if (select count(*) from fl_demo) <> 6 then raise exception 'expected 6 demo accounts, found %', (select count(*) from fl_demo); end if;
  if (select count(*) from public.squad_members m where m.squad_id = pg_temp.fl_id('squad:ironside')) <> 6 then
    raise exception 'Ironside should have 6 members — stage 1 is not applied';
  end if;
  if not exists (select 1 from public.workouts w where w.athlete_id = v_j and w.saved_at >= timestamptz '2026-10-01 00:00:00-05'
                    and w.id::text like 'f11de000%' and w.id <> pg_temp.fl_id('workout:squad-today:jordan')) then
    raise exception 'the year is not applied (no seeded Oct 1 workout) — paste seed-demo-jordan-RESTORE-YEAR.sql first';
  end if;
  if v_local::time < time '13:30' then
    raise exception 'it is % in Chicago — paste this after 13:30 so every session below is already over', to_char(v_local, 'HH24:MI');
  end if;
end $$;

-- ─── §1a · rewind: this stage's own six rows (from any day it ran before). Sets and exercises cascade (0001:89, :101).
delete from public.workouts w using fl_demo d
 where w.athlete_id = d.id and w.id = pg_temp.fl_id('workout:squad-today:' || d.who);

-- ─── §1b · today's six sessions. Times are Chicago wall-clock TODAY; each saved_at = its real end.
create temp table fl_ex (key text primary key, name text not null) on commit drop;
insert into fl_ex values
  ('barbell-bench-press', 'Barbell Bench Press'),
  ('barbell-bent-over-row', 'Barbell Bent-Over Row'),
  ('pull-up', 'Pull-Up'),
  ('barbell-overhead-press', 'Barbell Overhead Press'),
  ('barbell-back-squat', 'Barbell Back Squat'),
  ('barbell-romanian-deadlift', 'Barbell Romanian Deadlift'),
  ('barbell-deadlift', 'Barbell Deadlift'),
  ('dumbbell-split-squat', 'Dumbbell Split Squat');

-- spec = 'key 135x5*3 bwx8 | key …' (bw = bodyweight, no load) — the stage-4 shape. Jordan's loads stay under his
-- records (bench 235, row never 1–5 reps), so a real save of the same session would write no PR either.
create temp table fl_today (who text, name text, kind text, at_local time, dur_min int, miles numeric, spec text) on commit drop;
insert into fl_today values
  ('jordan', 'Upper A',         'lift', '06:15', 62, null, 'barbell-bench-press 205x5*5 | barbell-bent-over-row 155x8*4 | pull-up bwx8*3'),
  ('dre',    'Push Day',        'lift', '05:40', 58, null, 'barbell-bench-press 185x5*5 | barbell-overhead-press 115x6*3'),
  ('sam',    'Morning Run',     'run',  '06:30', 31, 3.1,  null),
  ('alex',   'Lower Body',      'lift', '07:05', 55, null, 'barbell-back-squat 205x5*5 | barbell-romanian-deadlift 155x8*3'),
  ('taylor', 'Full Body',       'lift', '12:10', 48, null, 'barbell-deadlift 225x5*3 | dumbbell-split-squat 35x8*3 | pull-up bwx6*3'),
  ('morgan', 'Lunch Run',       'run',  '11:45', 38, 4.0,  null);

do $$
declare
  e      record;
  t      text;
  x      record;
  v_day  date := (now() at time zone 'America/Chicago')::date;
  v_uid  uuid;
  v_wid  uuid;
  v_weid uuid;
  v_ch   uuid;
  v_at   timestamptz;
  v_end  timestamptz;
  v_pos  int;
  v_si   int;
  v_key  text;
  v_name text;
  v_body text;
  v_w    numeric;
  v_reps int;
  v_n    int;
  v_i    int;
begin
  for e in select * from fl_today loop
    select d.id into v_uid from fl_demo d where d.who = e.who;
    v_wid := pg_temp.fl_id('workout:squad-today:' || e.who);
    v_at  := (v_day + e.at_local) at time zone 'America/Chicago';
    v_end := v_at + make_interval(mins => e.dur_min);
    select c.id into v_ch from public.chapters c where c.athlete_id = v_uid and c.is_active;   -- as save_workout (0242:100)
    if v_ch is null then raise exception 'no active chapter for %', e.who; end if;

    insert into public.workouts (id, athlete_id, chapter_id, program_id, workout_name, activity_type, started_at, saved_at,
                                 duration_sec, state, distance, distance_unit, created_at)
    values (v_wid, v_uid, v_ch, null, e.name, (case when e.kind = 'run' then 'running' else 'strength' end)::modality,
            v_at, v_end, e.dur_min * 60, 'saved', e.miles, case when e.miles is not null then 'mi' end, v_end);

    v_pos := 0;
    for t in select btrim(s) from unnest(string_to_array(coalesce(e.spec, ''), '|')) s where btrim(s) <> '' loop
      v_key  := substring(t from '^([a-z0-9-]+)');
      v_body := btrim(regexp_replace(t, '^[a-z0-9-]+', ''));
      v_name := null;
      select f.name into v_name from fl_ex f where f.key = v_key;
      if v_name is null then raise exception 'unknown exercise key % for %', v_key, e.who; end if;
      v_weid := pg_temp.fl_id('we:squad-today:' || e.who || ':' || v_pos);
      insert into public.workout_exercises (id, workout_id, catalog_key, name, section, position, notes)
      values (v_weid, v_wid, v_key, v_name, 'main', v_pos, null);
      v_si := 0;
      for x in select tok from unnest(string_to_array(v_body, ' ')) tok where tok <> '' loop
        v_w    := nullif(split_part(x.tok, 'x', 1), 'bw')::numeric;
        v_reps := split_part(split_part(x.tok, 'x', 2), '*', 1)::int;
        v_n    := coalesce(nullif(split_part(x.tok, '*', 2), '')::int, 1);
        for v_i in 1..v_n loop
          insert into public.workout_sets (id, workout_exercise_id, set_index, weight, weight_unit, reps)
          values (pg_temp.fl_id('ws:squad-today:' || e.who || ':' || v_pos || ':' || v_si), v_weid, v_si, v_w, 'lb', v_reps);
          v_si := v_si + 1;
        end loop;
      end loop;
      v_pos := v_pos + 1;
    end loop;
  end loop;
end $$;

-- chapters.workout_count, as save_workout keeps it (0242:162) — recounted for all six accounts.
update public.chapters c set workout_count = (select count(*) from public.workouts w where w.chapter_id = c.id)
  from fl_demo d where c.athlete_id = d.id;

-- The six "Session logged" inbox rows (0251:569) are read-time; mark Jordan's inbox read so his bell shows no badge.
update public.profiles p set notifications_seen_at = now()
  from fl_demo d where d.who = 'jordan' and p.id = d.id;

-- §2 · assert (any failure rolls the whole paste back)
do $$
declare
  v_mid timestamptz := ((now() at time zone 'America/Chicago')::date)::timestamp at time zone 'America/Chicago';
begin
  if (select count(distinct w.athlete_id) from public.workouts w
        join public.squad_members m on m.user_id = w.athlete_id and m.squad_id = pg_temp.fl_id('squad:ironside')
       where w.state = 'saved' and w.saved_at >= v_mid and w.saved_at <= now()) <> 6 then
    raise exception 'expected all 6 Ironside members to have a saved session today';
  end if;
  if exists (select 1 from public.workouts w join fl_demo d on d.id = w.athlete_id where w.saved_at > now()) then
    raise exception 'a demo workout is saved in the future';
  end if;
  if exists (select 1 from public.push_outbox o join fl_demo d on d.id = o.user_id or d.id = o.actor_id) then
    raise exception 'a push_outbox row exists for or about a demo account';
  end if;
end $$;

commit;

-- §3 · report (the one result the SQL editor shows)
select 'Ironside · trained today (Chicago)' as what,
       (select count(distinct w.athlete_id)::text || ' / ' || (select count(*) from public.squad_members m2 where m2.squad_id = s.id)::text
          from public.workouts w join public.squad_members m on m.user_id = w.athlete_id and m.squad_id = s.id
         where w.state = 'saved' and w.saved_at >= ((now() at time zone 'America/Chicago')::date)::timestamp at time zone 'America/Chicago') as actual,
       '6 / 6' as expected
  from public.squads s where s.name = 'Ironside' and s.owner_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app')
union all
select 'today''s sessions',
       (select string_agg(split_part(u.email, '.', 1) || ' ' || w.workout_name || ' ' || to_char(w.saved_at at time zone 'America/Chicago', 'HH24:MI'), ' · ' order by w.saved_at)
          from public.workouts w join auth.users u on u.id = w.athlete_id
         where u.email like '%.demo@forgelegacy.app' and w.id::text like 'f11de000%'
           and w.saved_at >= ((now() at time zone 'America/Chicago')::date)::timestamp at time zone 'America/Chicago'),
       '6 sessions, all before now'
union all
select 'push_outbox rows for/about demo accounts',
       (select count(*)::text from public.push_outbox o join auth.users u on u.id in (o.user_id, o.actor_id) where u.email like '%.demo@forgelegacy.app'),
       '0';
