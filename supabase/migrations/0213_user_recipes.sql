-- 0213 — My Recipes: meals the athlete already eats, which the planner can use.
--
-- ══ WHY ══
--
-- `My Recipes.dc.html` (Claude Design b029488a): add a recipe from ingredients, confirm its allergens,
-- and let the planner pick it. The design kept these in localStorage; they belong to the athlete, on
-- every device, so they live here.
--
-- ══ SHAPE ══
--
-- `ingredients` is a jsonb array of `{ key, g, unit, qty }` — `key` names an ingredient in Forge's USDA
-- catalogue (`domain/nutrition/recipes-data.ts`), `g` is grams for the WHOLE recipe. Numbers are never
-- stored: calories and macros are recomputed from the catalogue every time (NUT-D4).
--
-- `allergens` are what the athlete CONFIRMED (Forge pre-fills what it detects; they add what it missed).
-- `confirmed` gates the planner: an unconfirmed recipe is saved but never planned (NUT-D6 — allergens are
-- a hard constraint, and only a confirmed tag can be one).
--
-- ══ PRIVACY (P6-A2-D1 / NUT-D7) + THE PREVIEW GATE (0206) ══
--
-- Owner-only RLS behind `has_nutrition_access()`, like every nutrition table. Cascades with the profile.

create table if not exists public.user_recipes (
  id           uuid primary key,
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  meal_types   text[] not null,
  minutes      smallint not null default 20,
  yield        smallint not null default 1,
  ingredients  jsonb not null default '[]'::jsonb,
  allergens    text[] not null default '{}',
  confirmed    boolean not null default false,
  steps        text[] not null default '{}',
  use_plan     boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists user_recipes_athlete on public.user_recipes (athlete_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_recipes_name_chk') then
    alter table public.user_recipes add constraint user_recipes_name_chk
      check (char_length(btrim(name)) between 1 and 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_recipes_meal_types_chk') then
    alter table public.user_recipes add constraint user_recipes_meal_types_chk
      check (cardinality(meal_types) >= 1 and meal_types <@ array['breakfast','lunch','dinner','snacks']::text[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_recipes_minutes_chk') then
    alter table public.user_recipes add constraint user_recipes_minutes_chk check (minutes between 1 and 600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_recipes_yield_chk') then
    alter table public.user_recipes add constraint user_recipes_yield_chk check (yield between 1 and 24);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_recipes_ingredients_chk') then
    alter table public.user_recipes add constraint user_recipes_ingredients_chk
      check (jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_recipes_allergens_chk') then
    alter table public.user_recipes add constraint user_recipes_allergens_chk
      check (allergens <@ array['peanuts','tree_nuts','dairy','eggs','gluten','soy','fish','shellfish','sesame']::text[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_recipes_steps_chk') then
    alter table public.user_recipes add constraint user_recipes_steps_chk check (cardinality(steps) <= 40);
  end if;
end $$;

alter table public.user_recipes enable row level security;

drop policy if exists user_recipes_owner_all on public.user_recipes;
create policy user_recipes_owner_all on public.user_recipes for all
  using (athlete_id = auth.uid() and public.has_nutrition_access())
  with check (athlete_id = auth.uid() and public.has_nutrition_access());

grant select, insert, update, delete on public.user_recipes to authenticated;
