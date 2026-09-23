-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0210: Meal Plan Setup keeps what the athlete told Forge about how they eat
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded (`if not exists`, `drop policy if exists`), and §3 is
-- read-only.
--
-- ⚠ Supabase's editor shows only the LAST statement's result, so §3 is the only output you will see.
--   §2 RAISES — the run fails loudly — if anything below did not land.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  creates `meal_plan_prefs` (one row per athlete), seven check constraints, owner-only RLS behind
--     the 0206 preview gate (`has_nutrition_access()`), and the grant
-- §2  asserts the table, all seven constraints, RLS on, and the policy carrying the gate — RAISES if not
-- §3  reports what landed and how many athletes have a saved setup
--
-- ⚠ ORDER AGAINST THE CLIENT: paste this BEFORE the Meal Plan Setup screen is deployed. The screen
--   saves here; against a database without the table, "Build my week" fails with an error toast.
--   Nothing that is deployed today reads or writes this table.
--
-- ⚠ EXPECTED §3: `rows = 0` until the screen is deployed and someone completes it. A non-zero count
--   before then means something else is writing it.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — the migration, verbatim from supabase/migrations/0210_meal_plan_prefs.sql
-- ───────────────────────────────────────────────────────────────────────────────────────────────

-- 0210 — Meal Plan Setup: what the athlete told Forge about how they eat.
--
-- ══ WHY ══
--
-- `Meal Plan Setup.dc.html` (Claude Design b029488a) is the first screen of Nutrition Phase 3. It asks
-- diet, allergies, dislikes, which meals, time to cook, how many people, and an optional weekly budget
-- — Architecture §3 "ask at the moment of need": the first Meal Plan asks these, and nothing earlier
-- does. The planner (§6) reads them; until it exists, this row is the athlete's answers kept.
--
-- ══ SHAPE ══
--
-- One row per athlete. The row EXISTING means the setup was completed — in particular that the allergy
-- question was ANSWERED. An empty `allergens` array on a present row is "No allergies", said on
-- purpose; there is no row at all for someone who never answered. NUT-D6 makes allergens a hard
-- constraint, so "never asked" and "none" must not look the same.
--
-- Values are stable keys, not labels, so a relabelled chip never orphans a stored answer.
--
-- ══ PRIVACY (P6-A2-D1 / NUT-D7) + THE PREVIEW GATE (0206) ══
--
-- Owner-only RLS, and the same `has_nutrition_access()` gate every other nutrition table carries, so
-- the allowlist stays the one door. `on delete cascade` from `profiles` covers account deletion.

create table if not exists public.meal_plan_prefs (
  athlete_id        uuid primary key references public.profiles(id) on delete cascade,
  diet              text not null default 'anything',
  allergens         text[] not null default '{}',
  dislikes          text[] not null default '{}',
  meals             text[] not null default '{breakfast,lunch,dinner}',
  cook_minutes      smallint,                 -- null = no limit
  household         smallint not null default 1,
  weekly_budget_usd integer,                  -- null = no budget; an ESTIMATE target, never a price (NUT-D3)
  updated_at        timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_diet_chk') then
    alter table public.meal_plan_prefs add constraint meal_plan_prefs_diet_chk
      check (diet in ('anything', 'vegetarian', 'vegan', 'pescatarian'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_allergens_chk') then
    alter table public.meal_plan_prefs add constraint meal_plan_prefs_allergens_chk
      check (allergens <@ array['peanuts','tree_nuts','dairy','eggs','gluten','soy','fish','shellfish','sesame']::text[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_meals_chk') then
    alter table public.meal_plan_prefs add constraint meal_plan_prefs_meals_chk
      check (cardinality(meals) >= 1 and meals <@ array['breakfast','lunch','dinner','snacks']::text[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_dislikes_chk') then
    alter table public.meal_plan_prefs add constraint meal_plan_prefs_dislikes_chk
      check (cardinality(dislikes) <= 50);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_cook_chk') then
    alter table public.meal_plan_prefs add constraint meal_plan_prefs_cook_chk
      check (cook_minutes is null or cook_minutes in (15, 30, 45));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_household_chk') then
    alter table public.meal_plan_prefs add constraint meal_plan_prefs_household_chk
      check (household between 1 and 8);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_budget_chk') then
    alter table public.meal_plan_prefs add constraint meal_plan_prefs_budget_chk
      check (weekly_budget_usd is null or weekly_budget_usd between 1 and 99999);
  end if;
end $$;

alter table public.meal_plan_prefs enable row level security;

drop policy if exists meal_plan_prefs_owner_all on public.meal_plan_prefs;
create policy meal_plan_prefs_owner_all on public.meal_plan_prefs for all
  using (athlete_id = auth.uid() and public.has_nutrition_access())
  with check (athlete_id = auth.uid() and public.has_nutrition_access());

grant select, insert, update, delete on public.meal_plan_prefs to authenticated;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — the assertion. RAISES if anything in §1 is missing.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  missing text[] := '{}';
  c text;
begin
  if to_regclass('public.meal_plan_prefs') is null then
    raise exception '0210: table public.meal_plan_prefs is missing';
  end if;

  foreach c in array array['meal_plan_prefs_diet_chk','meal_plan_prefs_allergens_chk','meal_plan_prefs_meals_chk',
                           'meal_plan_prefs_dislikes_chk','meal_plan_prefs_cook_chk','meal_plan_prefs_household_chk',
                           'meal_plan_prefs_budget_chk'] loop
    if not exists (select 1 from pg_constraint where conname = c) then missing := missing || c; end if;
  end loop;
  if cardinality(missing) > 0 then
    raise exception '0210: constraints missing: %', missing;
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.meal_plan_prefs'::regclass) then
    raise exception '0210: RLS is not enabled on meal_plan_prefs';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'meal_plan_prefs' and policyname = 'meal_plan_prefs_owner_all'
       and qual like '%has_nutrition_access%' and with_check like '%has_nutrition_access%'
  ) then
    raise exception '0210: meal_plan_prefs_owner_all is missing or does not carry the 0206 gate';
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — the report. Read-only.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

select
  (select count(*) from pg_constraint where conname like 'meal_plan_prefs_%_chk')           as constraints,  -- expect 7
  (select relrowsecurity from pg_class where oid = 'public.meal_plan_prefs'::regclass)       as rls_on,       -- expect true
  (select count(*) from pg_policies where tablename = 'meal_plan_prefs')                     as policies,     -- expect 1
  (select count(*) from public.meal_plan_prefs)                                              as rows;         -- expect 0
