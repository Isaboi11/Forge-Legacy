-- Forge Legacy — 0091: save a day as a template
--
-- The Workouts tab has offered "Your Templates · Reusable workouts you can start any time" since the
-- first build, pointing at nothing. This is the entity behind it, built from the CAPTURE end rather than
-- the browse end — a templates screen with nothing to browse is a screen about an empty table.
--
-- ══ WHERE A TEMPLATE COMES FROM ══
--
-- Not authored. A template is a session you already did and want again: a free workout you built as you
-- went, or a program day you reshaped enough that the program no longer describes it. Those are exactly
-- the sessions with no home — a program day is already reusable BY the program, which is why saving one
-- adds nothing and this never appears as an obligation.
--
-- So the input is a `workout_id`, not a structure. The workout is already durably saved by the time the
-- offer appears, so the database can derive the template from what actually happened rather than trusting
-- a client to describe a session it has already navigated away from.
--
-- ══ WHY jsonb AND NOT TWO MORE TABLES ══
--
-- A template's exercises are read all at once, written all at once, never queried across, and never
-- joined. `template_exercises` + `template_sets` would be two tables and four policies to express a list
-- that is only ever handled whole. The same call the program definitions already make.
--
-- WHAT IS KEPT is the SHAPE — the lifts, in order, and how many sets of roughly how many reps. WHAT IS
-- DROPPED is the load. A template is a plan, and last Tuesday's weights are a record, not a plan;
-- carrying them would mean starting every session by deleting someone else's numbers. The logger already
-- surfaces your last performance per lift when you train, which is the right place for that fact.
--
-- Depends on 0001 (workouts, workout_exercises, workout_sets). Idempotent. RUN AFTER 0090.

create table if not exists public.workout_templates (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  -- [{ catalogKey, name, sets, targetReps }] in order.
  exercises    jsonb not null default '[]'::jsonb,
  -- What it was saved from. Soft — the template outlives the session that shaped it.
  source_workout_id uuid,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists workout_templates_athlete on public.workout_templates (athlete_id, last_used_at desc nulls last, created_at desc);

alter table public.workout_templates enable row level security;

drop policy if exists workout_templates_all on public.workout_templates;
create policy workout_templates_all on public.workout_templates for all
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- ── Save a finished session as a template ─────────────────────────────────────
-- Derives the shape from the workout itself. Returns the new template's id, or null when the workout
-- isn't yours or logged nothing worth repeating.
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
               'sets', count(ws.id)::int,
               -- The set a plan should aim at, not the best one: the median rep count, rounded down, so
               -- one heavy triple among five eights doesn't rewrite the target.
               'targetReps', coalesce(
                 (percentile_disc(0.5) within group (order by ws.reps))::int,
                 0
               )
             ) as obj
        from public.workout_exercises we
        left join public.workout_sets ws on ws.workout_exercise_id = we.id and ws.reps is not null
       where we.workout_id = w.id
       group by we.id, we.position, we.catalog_key, we.name
    ) t;

  -- Nothing was logged; there is no shape to keep.
  if v_ex = '[]'::jsonb then
    return null;
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    v_name := left(coalesce(nullif(btrim(w.name), ''), 'Saved Workout'), 60);
  end if;

  insert into public.workout_templates (athlete_id, name, exercises, source_workout_id)
  values (v_uid, v_name, v_ex, w.id)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.save_workout_as_template(uuid, text) is
  'Turns a finished workout into a reusable template. Keeps the shape (lifts, order, sets, median target reps) and deliberately drops the load — a template is a plan, and last session''s weights are a record.';
