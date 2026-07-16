-- Forge Legacy — Phase 1 SPINE migration
-- Applies: profiles · chapters · workouts · workout_exercises · workout_sets ·
--          personal_records · timeline_events · rank_families (seed) · auth trigger · storage.
-- RLS: every table owner-scoped (athlete_id = auth.uid()). Reference table world-read.
-- Design authority: Docs/Supabase-Data-Model-v1.0.md §2.
-- NOTHING here reaches other-user data yet — the spine is single-athlete-owned.

begin;

-- ── extensions ──
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";

-- ── enums (spine subset) ──
create type sex             as enum ('male','female','unspecified');
create type athlete_type    as enum ('Strength','Bodybuilding','Endurance','Hybrid');
create type modality        as enum ('strength','running','walking','cycling','swimming','rowing','mobility','other');
create type workout_state   as enum ('in_progress','saved');
create type workout_section as enum ('warmup','main','cooldown');
create type measure_kind    as enum ('load','time','distance','reps');
create type flm_event_type  as enum ('CHAPTER_SEALED','GOAL_ACHIEVED','RANK_UP','PROGRAM_GRADUATED',
                                      'ACCOMPLISHMENT','HONOR_EARNED','REFLECTION_ADDED','MEMORY_ADDED','PHOTO_ADDED');

-- ── rank_families (static seed, world-read) ──
create table rank_families (
  family        text primary key,
  sort_order    smallint not null,
  has_sub_tiers boolean  not null default true
);
insert into rank_families (family, sort_order, has_sub_tiers) values
  ('foundation',0,true),('builder',1,true),('craftsman',2,true),('architect',3,true),
  ('established',4,true),('legend',5,true),('legacy',6,false);

-- ── profiles (1:1 auth.users) ──
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  first_name   text not null,
  handle       citext not null unique,
  username     citext unique,
  initials     text not null,
  sex          sex  not null default 'unspecified',
  athlete_type athlete_type,
  standard     text,
  rank_family  text references rank_families(family),
  rank_level   smallint check (rank_level between 1 and 4),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── chapters ──
create table chapters (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references profiles(id) on delete cascade,
  name          text not null,
  start_date    date not null,
  end_date      date,
  sealed_at     timestamptz,
  is_active     boolean not null default true,
  reflection    text,
  workout_count integer not null default 0,
  honor_count   integer not null default 0,
  created_at    timestamptz not null default now()
);
-- exactly one active chapter per athlete
create unique index chapters_one_active_per_athlete on chapters (athlete_id) where is_active;

-- ── workouts (Phase 3 write target) ──
create table workouts (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references profiles(id) on delete cascade,
  chapter_id    uuid references chapters(id),
  workout_name  text,
  activity_type modality not null default 'strength',
  started_at    timestamptz not null default now(),
  saved_at      timestamptz,
  duration_sec  integer,
  distance      numeric,
  distance_unit text,
  state         workout_state not null default 'in_progress',
  notes         text,
  created_at    timestamptz not null default now()
);
create index workouts_athlete_saved on workouts (athlete_id, saved_at desc);

-- ── workout_exercises ──
create table workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts(id) on delete cascade,
  catalog_key text,                         -- FK to exercises(id) added in 0002 (reference table)
  name        text not null,
  section     workout_section not null default 'main',
  position    integer not null,
  notes       text
);
create index workout_exercises_workout on workout_exercises (workout_id, position);

-- ── workout_sets ──
create table workout_sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_index           integer not null,
  weight              numeric,
  weight_unit         text,
  reps                integer,
  notes               text
);
create index workout_sets_exercise on workout_sets (workout_exercise_id, set_index);

-- ── personal_records (measure union → typed cols + CHECK) ──
create table personal_records (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid references profiles(id) on delete cascade,
  exercise       text not null,
  achieved_on    date,
  measure_kind   measure_kind not null,
  load_value     numeric,
  load_unit      text,
  load_reps      integer,
  time_seconds   integer,
  distance_value numeric,
  distance_unit  text,
  reps_count     integer,
  created_at     timestamptz not null default now(),
  constraint pr_measure_shape check (
    case measure_kind
      when 'load'     then load_value is not null and load_unit is not null
                           and time_seconds is null and distance_value is null and reps_count is null
      when 'time'     then time_seconds is not null
                           and load_value is null and distance_value is null and reps_count is null
      when 'distance' then distance_value is not null and distance_unit is not null
                           and load_value is null and time_seconds is null and reps_count is null
      when 'reps'     then reps_count is not null
                           and load_value is null and time_seconds is null and distance_value is null
    end
  )
);

-- ── timeline_events ──
create table timeline_events (
  id                 uuid primary key default gen_random_uuid(),
  athlete_id         uuid not null references profiles(id) on delete cascade,
  event_type         flm_event_type not null,
  object_name        text not null,
  chapter_id         uuid references chapters(id),   -- null = standalone (RANK_UP)
  occurred_at        timestamptz not null default now(),
  source_entity_type text,                            -- soft ref (no FK — history survives source deletion)
  source_entity_id   uuid,
  created_at         timestamptz not null default now()
);
create index timeline_athlete_occurred on timeline_events (athlete_id, occurred_at desc);

-- ── RLS: spine is owner-scoped ──
alter table profiles          enable row level security;
alter table chapters          enable row level security;
alter table workouts          enable row level security;
alter table workout_exercises enable row level security;
alter table workout_sets      enable row level security;
alter table personal_records  enable row level security;
alter table timeline_events   enable row level security;
alter table rank_families     enable row level security;

-- profiles: self full access; others read-only (public identity — the always-ungated core).
create policy profiles_self  on profiles for all    using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_read  on profiles for select using (true);

-- athlete-owned tables: full access to own rows only.
create policy chapters_own          on chapters          for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy workouts_own          on workouts          for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy personal_records_own  on personal_records  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy timeline_events_own   on timeline_events   for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
-- child tables: ownership via parent.
create policy workout_exercises_own on workout_exercises for all
  using (exists (select 1 from workouts w where w.id = workout_id and w.athlete_id = auth.uid()))
  with check (exists (select 1 from workouts w where w.id = workout_id and w.athlete_id = auth.uid()));
create policy workout_sets_own on workout_sets for all
  using (exists (select 1 from workout_exercises we join workouts w on w.id = we.workout_id
                 where we.id = workout_exercise_id and w.athlete_id = auth.uid()))
  with check (exists (select 1 from workout_exercises we join workouts w on w.id = we.workout_id
                 where we.id = workout_exercise_id and w.athlete_id = auth.uid()));
-- rank_families: world-read reference.
create policy rank_families_read on rank_families for select using (true);

-- ── auth: mint a profile row on signup ──
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, first_name, handle, initials)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', 'Athlete'),
          coalesce(new.raw_user_meta_data->>'first_name', 'Athlete'),
          coalesce(new.raw_user_meta_data->>'handle', 'athlete_' || left(new.id::text, 8)),
          coalesce(new.raw_user_meta_data->>'initials', 'A'));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

commit;

-- ── storage buckets (run via API/dashboard or supabase CLI; not transactional DDL) ──
-- avatars: public-read, owner-write.   media: signed-read, owner-write.
-- select storage.create_bucket('avatars', public => true);
-- select storage.create_bucket('media',   public => false);
-- storage RLS: (bucket_id in ('avatars','media')) and owner = auth.uid() for insert/update/delete.
