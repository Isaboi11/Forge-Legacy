-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0169: the athlete's training experience and their actual goals
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
--
-- This is the ONLY migration awaiting application. 0168 is already in. The working-tree edits to
-- `0059_challenges.sql` and `0165_challenge_policy_reassert.sql` are COMMENT-ONLY — verified as zero
-- changed non-comment lines — so neither needs re-running, and 0059 in particular must NOT be
-- (re-pasting it reverts friends competitions to squad-only; its own header says so).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- `src/domain/coach/constraints.ts` has always said "goal and experience come from onboarding, equipment
-- from the Home Gym profile, units from Settings", and `missingFor()` asks only for what is left. Three
-- of those four had somewhere to live — athlete_type (0001), environment (0007), home_gym_equipment
-- (0021). **Experience had nowhere.** So onboarding could not collect it, so Coach Holt asked every
-- athlete their level on every single build, forever.
--
-- ⚠ AND THE GOAL WAS NEVER STORED EITHER. Onboarding derives `athlete_type` from the primary goal, and
-- that derivation is LOSSY on purpose — fatloss, health and athletic all collapse to 'Hybrid'. Reading
-- the goal back out of it would be a guess dressed as a lookup, and Holt would open by asking a fat-loss
-- athlete whether they want to build muscle.
--
-- ⚠ BOTH COLUMNS ARE NULLABLE WITH NO DEFAULT, DELIBERATELY. null means *never asked*, and Holt asks. A
-- default of 'beginner' would be indistinguishable from an answer and would hand a ten-year lifter
-- beginner progressions with total confidence. Every athlete already onboarded stays null and is asked
-- once. Do not "helpfully" backfill these.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  adds `profiles.experience` (text + check) and `profiles.training_goals` (text[] + check)
-- §2  asserts both columns and both constraints actually exist, and RAISES if not
-- §3  reports what is now there, and how many athletes have answered. Read-only.
--
-- Additive and idempotent. `profiles` already has owner-scoped RLS covering reads and updates, so there
-- is no policy work here. No table is rewritten; both are `add column if not exists` on a nullable
-- column, which Postgres does without touching existing rows.
--
-- ⚠ APPLYING IS NOT THE SAME AS WORKING. The client code that writes these columns is committed but NOT
-- yet deployed and NOT yet published as an OTA. Expect §3 to report 0 answered until that ships — that
-- is correct, not a failed migration. (0153 landed cleanly and nothing appeared for exactly this reason.)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE COLUMNS
-- ═════════════════════════════════════════════════════════════════════════════

alter table profiles add column if not exists experience text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_experience_check'
  ) then
    alter table profiles
      add constraint profiles_experience_check
      check (experience is null or experience in ('beginner', 'intermediate', 'advanced'));
  end if;
end $$;

comment on column profiles.experience is
  'Training experience, asked at onboarding (ONB-D9). Matches Experience in src/domain/coach/constraints.ts. null = never asked, and Coach Holt then asks; there is deliberately no default.';

-- Lowercase on purpose: these round-trip into `Experience` in domain/coach/constraints.ts with no
-- translation layer, and that type is the catalogue's own Difficulty vocabulary lowercased. Storing
-- 'Beginner' would create the second scale this repo keeps refusing to create.

alter table profiles add column if not exists training_goals text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_training_goals_check'
  ) then
    alter table profiles
      add constraint profiles_training_goals_check
      check (
        training_goals is null
        or (
          array_length(training_goals, 1) is null
          or (
            array_length(training_goals, 1) <= 3
            and training_goals <@ array['strength', 'muscle', 'fatloss', 'endurance', 'health', 'athletic']::text[]
          )
        )
      );
  end if;
end $$;

comment on column profiles.training_goals is
  'Up to 3 goal ids (see GoalId in src/domain/onboarding/derive.ts), ordered — element 1 is the PRIMARY and is what athlete_type was derived from. null = never asked.';


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  missing text := '';
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'experience'
  ) then missing := missing || ' profiles.experience'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'training_goals'
  ) then missing := missing || ' profiles.training_goals'; end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_experience_check'
  ) then missing := missing || ' profiles_experience_check'; end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_training_goals_check'
  ) then missing := missing || ' profiles_training_goals_check'; end if;

  if missing <> '' then
    raise exception '0169 DID NOT FULLY APPLY. Missing:%', missing;
  end if;

  raise notice '0169 OK — both columns and both constraints are present.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — WHAT IS NOW THERE. Read-only.
-- ═════════════════════════════════════════════════════════════════════════════

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_name = 'profiles'
  and column_name in ('experience', 'training_goals')
order by column_name;

-- ⚠ Both counts SHOULD be 0 right now. The client that writes them is not deployed yet. A non-zero
--   count before that ships would mean something is writing these columns that should not be.
select
  count(*)                                          as athletes_total,
  count(*) filter (where experience is not null)     as have_answered_experience,
  count(*) filter (where training_goals is not null) as have_answered_goals
from profiles;
