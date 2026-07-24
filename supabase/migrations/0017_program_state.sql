-- Forge Legacy — 0017: program lifecycle state (Program Detail, `Forge Program.dc`)
--
-- The Program Detail screen renders one of five states (preview / planned / active / graduated /
-- ended early). `preview` is a catalog program the athlete does not own, so it needs no row; the other
-- four are per-athlete facts about a saved program. 0013 stored only the structure blob, so this adds
-- the lifecycle alongside it.
--
-- The design's hard rule (`onPrimary` conflict sheet): "Only one program can be active at a time."
-- That is enforced here as a partial unique index rather than left to the client, so the invariant
-- holds even if two devices race.
--
-- NOT included: attributing logged workouts to a program (workouts.program_id) — that is what the
-- progress bar, "Your Log" and the stat tiles need. It touches the save_workout RPC signature and is
-- deliberately left to its own migration rather than half-done here.

do $$ begin
  create type program_state as enum ('future', 'active', 'graduated', 'ended_early');
exception when duplicate_object then null;
end $$;

alter table public.programs
  add column if not exists state       program_state not null default 'future',
  add column if not exists started_at  timestamptz,
  add column if not exists ended_at    timestamptz;

-- One active program per athlete.
create unique index if not exists programs_one_active_per_athlete
  on public.programs (athlete_id)
  where state = 'active';

create index if not exists programs_athlete_state on public.programs (athlete_id, state);

-- Start `p_program_id`, ending whatever is currently active. Atomic so the one-active invariant can
-- never be observed broken (the unique index would reject a non-atomic two-step anyway).
create or replace function start_program(p_program_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid    uuid := auth.uid();
  v_ended  uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  if not exists (select 1 from programs where id = p_program_id and athlete_id = v_uid) then
    raise exception 'program not found';
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
