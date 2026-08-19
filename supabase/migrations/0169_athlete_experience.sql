-- Forge Legacy — 0169: the athlete's training experience, asked at onboarding
--
-- THE LAST OF THE FOUR THINGS THE COACH WAS ALWAYS TOLD IT WOULD BE GIVEN.
--
-- `src/domain/coach/constraints.ts` has said since it was written that "goal and experience come from
-- onboarding, equipment from the Home Gym profile, units from Settings", and `missingFor()` was built to
-- ask only for what is left. Three of those four had somewhere to live — athlete_type (0001),
-- environment (0007), home_gym_equipment (0021). Experience had nowhere, so onboarding could not collect
-- it, so Coach Holt asked every athlete their experience level on every single build, forever.
--
-- WHY TEXT + CHECK AND NOT AN ENUM: it mirrors `environment` (0007), which is the neighbouring column
-- doing the same job. `athlete_type` is an enum because Rank reads it as a domain in its own right and
-- has four fixed families; this is three values read by one engine. A check constraint is cheaper to
-- widen and does not need a type migration if the coach's own scale ever gains a rung.
--
-- WHY THE VALUES ARE LOWERCASE: they must round-trip into `Experience` in `domain/coach/constraints.ts`
-- with no translation layer, and that type is deliberately the catalogue's own `Difficulty` vocabulary
-- lowercased — "never a second scale to reconcile". Storing 'Beginner' would create exactly that.
--
-- WHY NULLABLE WITH NO DEFAULT, AND WHY THAT MATTERS MORE HERE THAN USUAL:
--   null           — never asked. Holt ASKS.
--   'beginner'     — they said so. Holt believes them.
-- A default of 'beginner' would be indistinguishable from an answer, and the coach would hand a ten-year
-- lifter beginner progressions with total confidence. This repo's own standing lesson: "a value that is
-- only ever its default is worse than an absent one — absent renders nothing, a stale default renders a
-- confident, specific, false claim about the athlete." Every athlete already onboarded stays null and is
-- asked once, by Holt, exactly as they are today.
--
-- Additive and idempotent; profiles' existing owner-scoped RLS already covers reads and updates.

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

-- ── THE GOAL ITSELF, AND WHY athlete_type IS NOT ENOUGH ────────────────────────────────────────────
--
-- Onboarding derives athlete_type from the primary goal (ONB-D8), and that derivation is LOSSY on
-- purpose: three of the six goals — fatloss, health, athletic — all map to 'Hybrid', because Rank has
-- four families and the goal list has six entries. Reading the goal back out of athlete_type would
-- therefore be a guess dressed as a lookup, and Coach Holt would open by asking a fat-loss athlete
-- whether they want to build muscle.
--
-- ARRAY, NOT A SCALAR, AND [1] IS THE PRIMARY. `src/lib/home-intake.ts` already stores goals this way
-- (`primaryGoal = goals[0]`), and the locked onboarding architecture asks for up to three with one
-- primary. One ordered column expresses both without a second column that could disagree with it — the
-- failure this repo has hit repeatedly, most recently with the two equipment stores this migration
-- exists to collapse.
--
-- ⚠ Postgres arrays are 1-indexed; the TypeScript that reads this is 0-indexed. The client is the only
-- reader, so the array is passed through whole and `goals[0]` is resolved there.
--
-- The check runs over every element rather than the first, so a bad id cannot ride in as a secondary
-- goal and surface months later as an unmatchable key.

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
