-- Forge Legacy — 0111: the tested max a percentage-based program is loaded from
--
-- ══ WHAT WAS MISSING ══
--
-- The prescription model had no load field of any kind. Sets, reps, per-set ladders, timed work and
-- circuits — but nothing that could say "at 75%". A peaking block prescribes load as a fraction of a
-- tested one-rep max, so "Back Squat 5 × 5 @ 75%" could only be stored as "5 × 5": the same shape as the
-- session with the training removed.
--
-- `programs.structure` is jsonb, so the PRESCRIPTION side of this needed no migration at all — the new
-- `percentOfMax` / `percentScheme` / `percentOf` keys ride along inside it. What needs real columns is
-- the other half: the athlete's max, and which max a given RUN of a program was built from.
--
-- Governing doc: `Docs/Percent-Of-Max-Loading-Architecture-v1.0.md`.
--
-- ══ WHY TWO PLACES, NOT ONE ══
--
-- `athlete_lift_maxes` is what the athlete currently believes they can lift. It moves as they get
-- stronger and it is what pre-fills the entry gate.
--
-- `programs.lift_maxes` is what ONE RUN of a program was built from, snapshotted when it started. This
-- is not denormalisation for speed — the two answer different questions, and a program that read the
-- live figure would be a different program week to week:
--
--   * A PR in week 2 would silently raise every remaining prescription, and the week-4 rehearsal at 95%
--     would land somewhere the program never intended.
--   * Two athletes running the same block would be running different blocks, without either choosing to.
--   * Program history would have nothing true to say. "You ran this off a 405 lb max" is only sayable
--     if the 405 was kept.
--
-- The athlete may still change a run's max whenever they want — that is an explicit act that recomputes
-- the sessions they have not done yet, and never the ones they have. What is forbidden is the figure
-- moving on its own.
--
-- ══ POUNDS, CANONICALLY ══
--
-- `weight_lb` in pounds, like every other weight this app stores. Display converts (`useUnits`).
-- Rounding to a loadable plate happens in the DISPLAY unit, in `percent-max.ts`, because 5 lb and
-- 2.5 kg are different increments and rounding twice would drift the bar.
--
-- Idempotent. Depends on 0001 (profiles), 0013 (programs). RUN AFTER 0110.

begin;

-- ── what the athlete currently believes they can lift ────────────────────────
--
-- One row per athlete per lift. `catalog_key` is the exercise id from `exercises.json` and is
-- deliberately NOT a foreign key: the catalogue is shipped application content, not a table, and the one
-- authority on whether a key is real is the app that loads it.
create table if not exists public.athlete_lift_maxes (
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  catalog_key text not null check (char_length(btrim(catalog_key)) between 1 and 120),
  weight_lb   numeric not null check (weight_lb > 0 and weight_lb < 2000),
  -- HOW we came by this number, and it is shown to the athlete.
  --
  --   entered   — they typed it.
  --   estimated — computed from a set they reported, or from their logs. A guess, labelled as one.
  --   tested    — they actually took the single, in a session this app recorded.
  --
  -- `metrics.ts` refuses to let an estimate ever become a RECORD, and that rule is untouched here: this
  -- column exists so an estimate can be labelled as such wherever it is displayed, never so it can be
  -- laundered into a claim about what the athlete has lifted.
  source      text not null default 'entered' check (source in ('entered', 'estimated', 'tested')),
  -- When the max was last established, which is not the same as when the row was last written. Null for
  -- a number typed from memory — we genuinely do not know when they hit it, and inventing today's date
  -- would be a specific false claim.
  tested_at   timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (athlete_id, catalog_key)
);

alter table public.athlete_lift_maxes enable row level security;

-- Nobody else's business. A training max is not part of the public profile, is not on the Performance
-- Firewall's list of comparable figures, and has no reader outside the athlete themselves.
drop policy if exists athlete_lift_maxes_select on public.athlete_lift_maxes;
create policy athlete_lift_maxes_select on public.athlete_lift_maxes for select
  using (athlete_id = auth.uid());

drop policy if exists athlete_lift_maxes_insert on public.athlete_lift_maxes;
create policy athlete_lift_maxes_insert on public.athlete_lift_maxes for insert
  with check (athlete_id = auth.uid());

drop policy if exists athlete_lift_maxes_update on public.athlete_lift_maxes;
create policy athlete_lift_maxes_update on public.athlete_lift_maxes for update
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

drop policy if exists athlete_lift_maxes_delete on public.athlete_lift_maxes;
create policy athlete_lift_maxes_delete on public.athlete_lift_maxes for delete
  using (athlete_id = auth.uid());

-- ── what THIS RUN of THIS program was built from ─────────────────────────────
--
-- Shape, keyed by the same `catalog_key`:
--
--   {"back-squat": {"lb": 405, "source": "entered", "set_at": "2026-08-03T18:00:00Z"}}
--
-- `{}` — the default — means the gate has not been answered yet. That is a real and expected state: a
-- program can be adopted before its maxes are known, and every percentage in it renders as a bare
-- percentage until they are. It must NOT render as 0 lb; an absent value shows nothing, while a
-- defaulted one shows a confident, specific, false claim about the athlete.
--
-- Not copied by `runProgramAgain` on purpose. Running a block a second time re-asks, because the whole
-- reason to run it again is that the first run moved the number.
alter table public.programs
  add column if not exists lift_maxes jsonb not null default '{}'::jsonb;

comment on column public.programs.lift_maxes is
  'Frozen per-run snapshot of the maxes this program''s percentages resolve against. See 0111.';

-- An object, never an array or a scalar. Cheap, and it stops a malformed client write from making every
-- percentage in the program unreadable in a way that would only surface mid-session.
alter table public.programs
  drop constraint if exists programs_lift_maxes_is_object;
alter table public.programs
  add constraint programs_lift_maxes_is_object
  check (jsonb_typeof(lift_maxes) = 'object');

commit;

-- ══ AFTER APPLYING ══
--
-- Applying this proves only that the columns exist. To prove the feature:
--   1. Adopt a program carrying `percentOfMax` and confirm the entry gate asks for its lifts.
--   2. Enter a max; confirm the day list shows a resolved weight, not a bare percentage.
--   3. Complete a session, change the max, and confirm the completed session did NOT move.
