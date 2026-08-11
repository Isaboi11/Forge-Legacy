-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migration 0128 (custom exercises)
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- WHAT IT ADDS: the table behind Exercise-001 and W-28 — two LOCKED specs that had no code behind them.
-- Until this runs the app degrades honestly rather than lying: "My Exercises" reads as empty (a missing
-- table is PGRST205, which the reads map to an empty list), and trying to CREATE one reports that the
-- migration has not been applied instead of accepting an exercise that nothing stores.
--
-- SAFE TO RUN TWICE: `create table if not exists`, and every policy and trigger is dropped before it is
-- created. The dashboard is the whole deployment mechanism here, and the only recovery from a run that
-- stops part-way is to paste the file again from the top.
--
-- VERIFY AFTER RUNNING:
--   select count(*) from public.custom_exercises;
--   -- 0 rows and no error is the pass. Then add one in the app: Exercise Library → My Exercises → + New.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0128: an athlete can add a lift the catalogue does not have
--
-- ══ WHAT THIS CLOSES ══
--
-- PO review: *"Should we be able to add our own exercises if it's not on there?"*
--
-- Yes, and the answer has been LOCKED and unbuilt for months. `Exercise-001-Custom-Exercise-Architecture`
-- and `W-28-Create-Edit-Custom-Exercise` are both locked specs describing this feature in full. Nothing
-- existed: no table, so the Exercise Library's own header carries the note *"Custom Exercises section +
-- Create — Exercise-001 is locked but has no table; there is nothing to"*, and the Picker's Source
-- filter (All / System / Custom / Favorites) is deliberately omitted for the same reason — *"a filter
-- that cannot change the result set would be a decoration"*.
--
-- The READ half already worked by accident: a template row whose `catalog_key` is null renders as
-- "Custom", and logged sets have always snapshotted `workout_exercises.name`. Only the WRITE half was
-- missing.
--
-- ══ THE SHAPE, AND THE THREE DECISIONS IT ENCODES ══
--
--   EX-001-D3  NAME IS THE ONLY REQUIRED FIELD. Every column below except `name` is nullable or has a
--              default. Creation has to survive being done mid-workout, in ten seconds, by somebody who
--              only wants the row to exist so they can log a set against it.
--   EX-001-D7  SOFT DELETE. `deleted_at`, never a `DELETE`. A template or a program can reference a
--              custom exercise, and hard-deleting one would leave a dangling id that renders as nothing;
--              a tombstone renders as a tombstone, and restoring the exercise recovers every reference
--              at once. It also means "I deleted it by mistake" is recoverable, which for hand-authored
--              content it must be.
--   EX-001-D2  PRIVATE. RLS is `author_id = auth.uid()` on all four verbs. Future SQUAD/PUBLIC
--              visibility is additive — a `visibility` column and a widened SELECT policy — and needs
--              no change to what is stored here.
--
-- ══ WHY `unit` IS ON THIS TABLE ══
--
-- The shipped catalogue gained `unit` (reps | time) in the same release, so a Plank prescribes a clock
-- and a curl prescribes reps. An athlete adding their own hold — a Copenhagen variation, a weighted
-- dead hang — has exactly the same need, and a custom table that could not express it would make the
-- feature strictly worse than the catalogue it extends.
--
-- ══ WHAT IS DELIBERATELY NOT HERE ══
--
-- No `visibility`, no share table, no coach ownership: EX-001-D1 makes athlete ownership the MVP and
-- says the rest is additive. No media columns: W-28 §7 defers upload post-MVP. No relationship edges —
-- a custom exercise has no alternatives, because the graph is generated from the shipped catalogue and
-- inventing substitutes for a movement only one person has described would be guessing.
--
-- Idempotent. Depends on 0001 (profiles). RUN AFTER 0127.

create table if not exists public.custom_exercises (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  -- EX-001-D3. Trimmed and length-checked at the boundary; the check is the backstop, not the message.
  name        text not null check (length(btrim(name)) between 1 and 60),
  -- One of the six locked browse categories, or null for "didn't say". NOT constrained to an enum: the
  -- category vocabulary is a client-side derivation (`catalog-core`) and duplicating it here would give
  -- the two places to disagree. An unknown value degrades to uncategorised on read.
  category    text,
  -- Home-gym item ids (`home-gym/equipment.ts`), muscle ids (`muscles.json`). Ids, never labels — the
  -- same rule the Home Gym profile follows, and for the same reason: renaming a label must not silently
  -- empty an athlete's data.
  equipment   text[] not null default '{}',
  primary_muscles   text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  environments      text[] not null default '{}',
  -- W-28 §4: form cues, setup notes. 300 chars.
  notes       text check (notes is null or length(notes) <= 300),
  -- 'reps' | 'time'. Absent reads as reps, exactly as the shipped catalogue's own `unit` does.
  unit        text not null default 'reps' check (unit in ('reps', 'time')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- EX-001-D7. Null = active. A soft-deleted row keeps every reference to it resolvable.
  deleted_at  timestamptz
);

-- The one query this table serves: "my exercises, active, newest first". Partial on `deleted_at` so the
-- index carries only the rows anybody browses.
create index if not exists custom_exercises_mine
  on public.custom_exercises (author_id, created_at desc)
  where deleted_at is null;

alter table public.custom_exercises enable row level security;

drop policy if exists custom_exercises_select on public.custom_exercises;
drop policy if exists custom_exercises_insert on public.custom_exercises;
drop policy if exists custom_exercises_update on public.custom_exercises;
drop policy if exists custom_exercises_delete on public.custom_exercises;

-- EX-001-D2 — private to the author, on every verb.
--
-- SELECT deliberately does NOT filter `deleted_at`: the client asks for active rows, and a restore has
-- to be able to read the row it is restoring. Hiding deleted rows at the policy level would make
-- EX-001-D7's restore unimplementable without a SECURITY DEFINER function.
create policy custom_exercises_select on public.custom_exercises for select
  using (author_id = auth.uid());
create policy custom_exercises_insert on public.custom_exercises for insert
  with check (author_id = auth.uid());
create policy custom_exercises_update on public.custom_exercises for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());
-- A real DELETE stays available for the athlete who wants a row genuinely gone (account cleanup, a
-- typo created and removed in the same minute). The APP soft-deletes; this is the escape hatch.
create policy custom_exercises_delete on public.custom_exercises for delete
  using (author_id = auth.uid());

comment on table public.custom_exercises is
  'Athlete-authored exercises (Exercise-001, W-28). Private to the author (EX-001-D2), name the only required field (EX-001-D3), soft-deleted so template and program references tombstone rather than dangle (EX-001-D7). Ids not labels in the array columns. `unit` mirrors the shipped catalogue''s own reps|time field.';

-- ── The 500 cap, enforced where it cannot be bypassed ────────────────────────
--
-- EX-001-D5 makes it a SOFT limit: the athlete is warned from 480 and blocked at 500. The warning is the
-- client's job. The BLOCK is here, because a cap that only exists in a screen is not a cap — the import
-- path auto-creates custom exercises for unmatched names (EX-001-D12) and never opens that screen.
--
-- Counts ACTIVE rows only. Soft-deleting to make room is a legitimate way under the limit, and counting
-- tombstones would make the cap permanent rather than a limit on what you keep.
create or replace function public.custom_exercise_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  select count(*) into v_count
    from public.custom_exercises
   where author_id = new.author_id and deleted_at is null;
  if v_count >= 500 then
    raise exception 'Exercise limit reached (500). Delete unused exercises to create new ones.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists custom_exercises_cap on public.custom_exercises;
create trigger custom_exercises_cap
  before insert on public.custom_exercises
  for each row execute function public.custom_exercise_cap();

-- ── `updated_at` keeps itself honest ─────────────────────────────────────────
create or replace function public.custom_exercise_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists custom_exercises_touch on public.custom_exercises;
create trigger custom_exercises_touch
  before update on public.custom_exercises
  for each row execute function public.custom_exercise_touch();
