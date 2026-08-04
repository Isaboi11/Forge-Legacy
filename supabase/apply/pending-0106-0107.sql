-- Forge Legacy — convenience bundle: migrations 0106 → 0107, in dependency order.
--
-- NOT a new migration. Every statement below is already numbered in supabase/migrations/; this file
-- exists so the outstanding chain can be pasted into the Supabase SQL editor in one go.
--
--   0106  workout_exercises.group_* + save_workout        — a superset created mid-session survives being
--         + save_workout_as_template                        saved, and a template keeps the pairing
--   0107  squad_member_contributions / squad_goal_weeks   — everything Squad Goal Detail renders, and the
--         + squad_goal_detail                               expired-goal drift 0103 recorded and deferred
--
-- ══ RUN IT AS ONE PASTE. IT IS ONE TRANSACTION. ══
--
-- The per-file `begin;` / `commit;` have been removed, so the Supabase editor runs the whole bundle in a
-- single implicit transaction: either both land or neither does. That is the point — this repo's recorded
-- failure mode is a PARTIAL run that leaves an older function body behind and errors nothing.
--
-- SAFE TO RE-RUN, including any part already applied: every column add is `if not exists`, the one
-- constraint is guarded by a `pg_constraint` lookup, and every function is `create or replace`.
--
-- ══ ⚠ NOTHING HERE IS PROVEN BY APPLYING IT ══
--
-- Both files redefine PL/pgSQL, which resolves record fields and column references at RUN time. A
-- function with a wrong column name compiles cleanly, reports success, and fails only when somebody
-- presses a button — which is exactly how `save_workout_as_template` shipped a 42703 in 0091 that took
-- until 0094 to find. There is no backfill and no destructive statement in this bundle; the risk is
-- entirely that it looks applied and is not.
--
-- AFTER RUNNING, DO THESE TWO THINGS:
--
--   1. Log a workout with a superset in it (⋯ → "Superset with next exercise"), finish it, then on
--      The Record tap "Save this day as a template". Open the template: the pairing should be there.
--   2. Open a squad with a goal and tap the goal card. The per-member figures should add up to the
--      squad total shown above them.
--
-- Verify queries for each are at the bottom of their own migration files.
--
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 0106_superset_groups.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0106: a superset survives being saved
--
-- ══ THE GAP ══
--
-- The session model has carried circuit membership since 0096 (`groupId` / `groupName` / `groupRounds` /
-- `groupCapSec` on every exercise), and the program layer has carried it since the prescription model
-- grew ladders and AMRAPs. `workout_exercises` never learned any of it. That was survivable while a
-- circuit only ever came DOWN from a program — the program still held the truth, and the log was just a
-- record of the work — but a superset is created IN the session, by the athlete, on the day. Without
-- these columns, pairing two lifts mid-workout produced a pairing that existed until Finish and then
-- did not: Activity Detail showed two unrelated exercises, and a template saved from that session kept
-- no memory of the pairing at all.
--
-- ══ WHY `group_kind` EXISTS AND WHY ABSENT MEANS CIRCUIT ══
--
-- A superset and a circuit are the same GROUPING with two different performances: a superset alternates
-- set for set and rests only at the end of a round; a circuit runs rounds under a banner and sometimes a
-- clock. Every block that existed before this migration was a circuit, so NULL reads as 'circuit' and the
-- shipped programs, the Bridger Logan import and every AMRAP render exactly as they did.
--
-- ══ WHY THE FUNCTION SIGNATURE DOES NOT CHANGE ══
--
-- The group fields ride inside the `p_exercises` jsonb, so `save_workout` keeps the same 11 arguments it
-- has had since 0095. `create or replace` is enough: no drop, no second overload, no PostgREST
-- `PGRST203` ambiguity for the client to trip over.
--
-- ⚠ PL/pgSQL RESOLVES RECORD FIELDS AT RUN TIME. Applying this proves nothing — this very pair of
-- functions has already shipped one error that only appeared when a button was pressed (0094, 42703).
-- After applying: log a superset, finish it, and save it as a template.
--
-- Depends on 0001 (workout_exercises) and 0097. Idempotent. RUN AFTER 0105.

alter table public.workout_exercises add column if not exists group_id     text;
alter table public.workout_exercises add column if not exists group_name   text;
alter table public.workout_exercises add column if not exists group_kind   text;
alter table public.workout_exercises add column if not exists group_rounds int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workout_exercises_group_kind_valid') then
    alter table public.workout_exercises
      add constraint workout_exercises_group_kind_valid
      check (group_kind is null or group_kind in ('superset', 'circuit'));
  end if;
end $$;

comment on column public.workout_exercises.group_id is
  'Adjacent rows sharing this id are ONE block. Adjacency, not the id alone, defines the block — two blocks may reuse an id, and filtering by id would fuse them.';
comment on column public.workout_exercises.group_kind is
  '''superset'' (alternated set for set, rest only after the last member) or ''circuit'' (rounds, optionally under a clock). NULL reads as ''circuit'' — every block that existed before 0106 was one.';
comment on column public.workout_exercises.group_rounds is
  'Times through the block. For a superset this is the number of sets each member gets.';

-- ── save_workout carries the block ────────────────────────────────────────────
-- Identical to 0097's apart from the four columns on the exercise insert.
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

  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors);
end;
$$;

-- ── a template keeps the pairing ──────────────────────────────────────────────
-- Identical to 0097's deriver apart from the four group keys, so repeating a session that was built
-- around a superset gives you the superset back rather than four loose lifts in a suggestive order.
--
-- `w.workout_name` — NOT `w.name`. 0091 wrote `w.name`, which does not exist on `workouts`, and because
-- PL/pgSQL binds record fields at run time the function compiled cleanly and failed only when an athlete
-- pressed the button (0094). Every later revision has had to carry that correction forward by hand;
-- this one does too.
create or replace function public.save_workout_as_template(p_workout uuid, p_name text default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  w      public.workouts%rowtype;
  v_ex   jsonb;
  v_id   uuid;
  v_name text;
begin
  if v_uid is null then
    return null;
  end if;

  select * into w from public.workouts where id = p_workout and athlete_id = v_uid;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(t.obj order by t.position), '[]'::jsonb) into v_ex
    from (
      select we.position,
             jsonb_build_object(
               'catalogKey', we.catalog_key,
               'name', we.name,
               'section', we.section,
               'groupId', we.group_id,
               'groupName', we.group_name,
               'groupKind', we.group_kind,
               'groupRounds', we.group_rounds,
               -- A block is recognised by having carried distance or duration, not by a stored flag: the
               -- evidence of what it was is the measurement itself.
               'kind', case when max(coalesce(ws.distance, 0)) > 0 or max(coalesce(ws.duration_sec, 0)) > 0
                            then 'cardio' else 'strength' end,
               'modality', max(ws.modality),
               'sets', count(ws.id)::int,
               'targetReps', coalesce(
                 (percentile_disc(0.5) within group (order by ws.reps) filter (where ws.reps is not null))::int,
                 0
               ),
               'targetMi', nullif(sum(coalesce(ws.distance, 0)), 0),
               'targetDurationSec', nullif(sum(coalesce(ws.duration_sec, 0)), 0)
             ) as obj
        from public.workout_exercises we
        left join public.workout_sets ws on ws.workout_exercise_id = we.id
       where we.workout_id = w.id
       group by we.id, we.position, we.catalog_key, we.name, we.section, we.group_id, we.group_name, we.group_kind, we.group_rounds
    ) t;

  if v_ex = '[]'::jsonb then
    return null;
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    v_name := left(coalesce(nullif(btrim(w.workout_name), ''), 'Saved Workout'), 60);
  end if;

  insert into public.workout_templates (athlete_id, name, exercises, source_workout_id)
  values (v_uid, v_name, v_ex, w.id)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.save_workout_as_template(uuid, text) is
  'Turns a finished workout into a reusable template. Keeps the shape (lifts, order, block pairings, sets, median target reps) and deliberately drops the load — a template is a plan, and last session''s weights are a record.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 0107_squad_goal_detail.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0107: the Squad Goal Detail screen's data
--
-- ══ WHAT EXISTED ══
--
-- One scalar. `squad_metric_total` returns the squad's aggregate figure, which is exactly enough to draw
-- the Current Goal card on S-2 and nothing more. `Squad Goal Detail.dc.html` asks five further questions:
-- who contributed what, how the last eight weeks went, which milestones have been crossed and when, what
-- moved the number recently, and what happened to the goals before this one.
--
-- ══ THE ONE THIS MIGRATION EXISTS TO FIX ══
--
-- 0103's own header records the defect and declines to fix it, correctly, because the fix did not belong
-- in the function it was writing:
--
--     "on an EXPIRED squad goal a member's 'your contribution' line keeps counting past the deadline
--      while the squad total is frozen. Fixing that wants a squad-scoped function of its own, not a
--      change to the shared one."
--
-- `goal_metric_value` (0039) computes the signed-in athlete's own figure and is SHARED with the personal
-- Goals system, including body-composition readings that are deliberately unwindowed. Bounding it there
-- would reach outside squads and change how personal goals score. So this is that squad-scoped function:
-- `squad_member_contributions` applies the SAME window as `squad_metric_sum` — `goal_started_at` to
-- `squad_goal_window_end` — per member. A screen that puts your figure next to the squad's would have
-- surfaced that mismatch on day one, as two numbers that cannot both be true.
--
-- ══ ACCESS ══
--
-- Every function here is `security definer`, so every one carries the gate `squad_metric_sum` carries:
-- a member of the squad, or a public squad. 0101 had to retrofit exactly this onto `archive_squad_goal`
-- after it became a disclosure oracle over private squads — a definer function without a caller check is
-- a read of somebody else's data wearing the owner's permissions.
--
-- ⚠ PL/pgSQL and SQL functions resolve column references at RUN time. Applying this proves nothing.
-- After applying: open a squad's goal card and check the numbers add up.
--
-- Depends on 0031, 0036, 0039, 0051, 0099, 0103. Idempotent. RUN AFTER 0106.


-- ── per-member contribution, windowed exactly as the squad total is ──────────
--
-- Mirrors `squad_metric_sum` branch for branch — same five kinds, same predicates — differing only in
-- grouping by athlete instead of summing across them. The two must agree: if the per-member figures did
-- not add up to the total on the same screen, one of them would be lying and the athlete would have no
-- way to know which.
create or replace function public.squad_member_contributions(p_squad uuid)
returns table (athlete_id uuid, name text, handle text, avatar_url text, value numeric)
language sql
security definer
stable
set search_path = public
as $$
  with gate as (
    select public.is_squad_member(p_squad, auth.uid())
        or exists (select 1 from public.squads s where s.id = p_squad and s.privacy = 'public') as ok
  ),
  g as (
    select coalesce(s.goal_metric_kind, 'workout_count') as kind,
           s.goal_metric_key                             as key,
           coalesce(s.goal_started_at, '-infinity'::timestamptz) as from_at,
           public.squad_goal_window_end(p_squad)         as to_at
      from public.squads s where s.id = p_squad
  ),
  roster as (
    select sm.user_id from public.squad_members sm where sm.squad_id = p_squad
  ),
  vals as (
    select r.user_id as uid,
           case (select kind from g)
             when 'workout_count' then coalesce((
               select count(*) from public.workouts w
                where w.athlete_id = r.user_id
                  and w.saved_at >= (select from_at from g) and w.saved_at < (select to_at from g)
             ), 0)
             when 'distance_total' then coalesce((
               select sum(w.distance) from public.workouts w
                where w.athlete_id = r.user_id and w.distance is not null
                  and ((select key from g) is null or w.activity_type::text = (select key from g))
                  and w.saved_at >= (select from_at from g) and w.saved_at < (select to_at from g)
             ), 0)
             when 'volume_total' then coalesce((
               select sum(ws.weight * ws.reps)
                 from public.workout_sets ws
                 join public.workout_exercises we on we.id = ws.workout_exercise_id
                 join public.workouts w on w.id = we.workout_id
                where w.athlete_id = r.user_id
                  and w.saved_at >= (select from_at from g) and w.saved_at < (select to_at from g)
             ), 0)
             when 'time_total' then coalesce((
               select sum(w.duration_sec) from public.workouts w
                where w.athlete_id = r.user_id
                  and w.saved_at >= (select from_at from g) and w.saved_at < (select to_at from g)
             ), 0) / 3600.0
             -- `personal_records.achieved_on` is a DATE, so its bound is a date too (0103's own note).
             when 'pr_count' then coalesce((
               select count(*) from public.personal_records pr
                where pr.athlete_id = r.user_id
                  and pr.achieved_on >= (select from_at from g)::date
                  and pr.achieved_on < (select to_at from g)::date + 1
             ), 0)
             else 0
           end as value
      from roster r
  )
  select v.uid, p.name, p.handle::text, p.avatar_url, v.value
    from vals v
    join public.profiles p on p.id = v.uid
   where (select ok from gate)
   order by v.value desc, p.name asc;
$$;

grant execute on function public.squad_member_contributions(uuid) to authenticated;

comment on function public.squad_member_contributions(uuid) is
  'Per-member contribution to the squad''s current goal, windowed identically to squad_metric_sum. The squad-scoped counterpart 0103 asked for: goal_metric_value is shared with personal Goals and cannot be bounded there.';


-- ── the last N weeks of the goal metric, squad-wide ──────────────────────────
-- Weeks are generated rather than derived from the data so a quiet week is a ZERO rather than a gap. A
-- rhythm chart that silently omits the week nobody trained is a chart about a different squad.
create or replace function public.squad_goal_weeks(p_squad uuid, p_weeks int default 8)
returns table (week_start timestamptz, value numeric)
language sql
security definer
stable
set search_path = public
as $$
  with gate as (
    select public.is_squad_member(p_squad, auth.uid())
        or exists (select 1 from public.squads s where s.id = p_squad and s.privacy = 'public') as ok
  ),
  g as (
    select coalesce(s.goal_metric_kind, 'workout_count') as kind,
           s.goal_metric_key as key,
           public.squad_goal_window_end(p_squad) as to_at
      from public.squads s where s.id = p_squad
  ),
  weeks as (
    select date_trunc('week', (select to_at from g)) - (make_interval(weeks => n)) as ws
      from generate_series(greatest(0, p_weeks) - 1, 0, -1) n
  )
  select w.ws,
         case (select kind from g)
           when 'distance_total' then coalesce((
             select sum(x.distance) from public.workouts x
              join public.squad_members sm on sm.user_id = x.athlete_id
              where sm.squad_id = p_squad and x.distance is not null
                and ((select key from g) is null or x.activity_type::text = (select key from g))
                and x.saved_at >= w.ws and x.saved_at < w.ws + interval '7 days'
                and x.saved_at < (select to_at from g)
           ), 0)
           when 'volume_total' then coalesce((
             select sum(ws2.weight * ws2.reps)
               from public.workout_sets ws2
               join public.workout_exercises we2 on we2.id = ws2.workout_exercise_id
               join public.workouts x on x.id = we2.workout_id
               join public.squad_members sm on sm.user_id = x.athlete_id
              where sm.squad_id = p_squad
                and x.saved_at >= w.ws and x.saved_at < w.ws + interval '7 days'
                and x.saved_at < (select to_at from g)
           ), 0)
           when 'time_total' then coalesce((
             select sum(x.duration_sec) from public.workouts x
              join public.squad_members sm on sm.user_id = x.athlete_id
              where sm.squad_id = p_squad
                and x.saved_at >= w.ws and x.saved_at < w.ws + interval '7 days'
                and x.saved_at < (select to_at from g)
           ), 0) / 3600.0
           when 'pr_count' then coalesce((
             select count(*) from public.personal_records pr
              join public.squad_members sm on sm.user_id = pr.athlete_id
              where sm.squad_id = p_squad
                and pr.achieved_on >= w.ws::date and pr.achieved_on < (w.ws + interval '7 days')::date
                and pr.achieved_on < (select to_at from g)::date + 1
           ), 0)
           else coalesce((
             select count(*) from public.workouts x
              join public.squad_members sm on sm.user_id = x.athlete_id
              where sm.squad_id = p_squad
                and x.saved_at >= w.ws and x.saved_at < w.ws + interval '7 days'
                and x.saved_at < (select to_at from g)
           ), 0)
         end
    from weeks w
   where (select ok from gate)
   order by w.ws asc;
$$;

grant execute on function public.squad_goal_weeks(uuid, int) to authenticated;


-- ── everything the screen renders, in one round trip ─────────────────────────
-- One call, following `template_detail` (0095). A screen that made five is five chances for one of them
-- to fail alone and leave a page that is partly about a goal.
create or replace function public.squad_goal_detail(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  s     public.squads%rowtype;
  v_ok  boolean;
  v_total numeric;
begin
  select * into s from public.squads where id = p_squad;
  if not found then
    return null;
  end if;

  v_ok := public.is_squad_member(p_squad, v_uid) or s.privacy = 'public';
  if not v_ok then
    return null; -- not an error: "you cannot see this" and "this does not exist" answer the same way
  end if;

  v_total := public.squad_metric_sum(p_squad, coalesce(s.goal_metric_kind, 'workout_count'), s.goal_metric_key, s.goal_started_at);

  return jsonb_build_object(
    'squadId', s.id,
    'squadName', s.name,
    'goal', s.goal,
    'target', s.goal_target,
    'metricKind', coalesce(s.goal_metric_kind, 'workout_count'),
    'metricKey', s.goal_metric_key,
    'startedAt', s.goal_started_at,
    'endsAt', s.goal_ends_at,
    'total', v_total,
    'isOwner', s.owner_id = v_uid,
    'memberCount', (select count(*) from public.squad_members m where m.squad_id = p_squad),
    'contributions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'athleteId', c.athlete_id, 'name', c.name, 'handle', c.handle,
               'avatarUrl', c.avatar_url, 'value', c.value,
               'isSelf', c.athlete_id = v_uid))
        from public.squad_member_contributions(p_squad) c
    ), '[]'::jsonb),
    'weeks', coalesce((
      select jsonb_agg(jsonb_build_object('weekStart', w.week_start, 'value', w.value) order by w.week_start)
        from public.squad_goal_weeks(p_squad, 8) w
    ), '[]'::jsonb),
    -- What moved the number, most recent first. Names the member and the session, because "+1" with
    -- nobody attached to it is a counter, not a record of anybody's work.
    'events', coalesce((
      select jsonb_agg(e order by e->>'at' desc)
        from (
          select jsonb_build_object(
                   'workoutId', w.id, 'at', w.saved_at, 'who', p.name,
                   'isSelf', w.athlete_id = v_uid, 'name', w.workout_name,
                   'distance', w.distance, 'durationSec', w.duration_sec) as e
            from public.workouts w
            join public.squad_members sm on sm.user_id = w.athlete_id
            join public.profiles p on p.id = w.athlete_id
           where sm.squad_id = p_squad
             and w.saved_at >= coalesce(s.goal_started_at, '-infinity'::timestamptz)
             and w.saved_at < public.squad_goal_window_end(p_squad)
           order by w.saved_at desc
           limit 8
        ) t
    ), '[]'::jsonb),
    -- The goals before this one. Read from `squad_goal_completions`, which has banked every MET goal
    -- since 0099 and which, until this screen, nothing in the app had ever read.
    'past', coalesce((
      select jsonb_agg(jsonb_build_object(
               'goal', h.goal, 'target', h.target, 'metricKind', h.metric_kind,
               'startedAt', h.started_at, 'completedAt', h.completed_at) order by h.completed_at desc)
        from public.squad_goal_completions h where h.squad_id = p_squad
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.squad_goal_detail(uuid) to authenticated;

comment on function public.squad_goal_detail(uuid) is
  'Everything Squad Goal Detail renders, in one round trip: the goal, the squad total, per-member contributions, an 8-week series, recent contributing sessions, and past completed goals. Member-or-public gated.';


-- ── VERIFY (run these; applying proves nothing) ─────────────────────────────
--   -- 1. the per-member figures add up to the squad total
--   select sum(value) from public.squad_member_contributions('<squad-uuid>');
--   select public.squad_metric_sum('<squad-uuid>', 'workout_count', null,
--          (select goal_started_at from public.squads where id = '<squad-uuid>'));
--   -- expect the same number
--
--   -- 2. eight weeks come back, quiet ones as zeros rather than missing rows
--   select count(*) from public.squad_goal_weeks('<squad-uuid>', 8);   -- expect 8
--
--   -- 3. a non-member gets null, not somebody else's squad
--   select public.squad_goal_detail('<a-private-squad-you-are-not-in>');  -- expect null
