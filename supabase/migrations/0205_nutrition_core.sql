-- Forge Legacy — 0205: nutrition core (Nutrition Architecture v1.0, Phase 1)
--
-- Food logging, targets, and the food catalogue that fills itself from use.
--
-- ⚠ PRIVACY IS THE SCHEMA, NOT A SETTING. `P-6-Amendment-002-Nutrition-Data` P6-A2-D1/D2: every athlete
-- table here is owner-only, and there is deliberately NO visibility column — so no future "open the
-- defaults for testing" migration (0189) can reach nutrition. A squad-visible post is a `squad_posts` row
-- the athlete writes on purpose; nothing here is ever read by another athlete.
--
-- ══ THE CATALOGUE FILLS ITSELF ══
--
-- Nutrition-Architecture §4 chose USDA FoodData Central as the primary source because it is CC0 — a log
-- row may keep its own numbers forever. The architecture said "copy the bulk dump into Postgres"; Phase 1
-- does NOT, because loading 3 GB needs database access we do not have (every migration here is pasted
-- into the SQL editor by hand). Instead `food_catalog` is a CACHE: the Edge Function reads USDA live and
-- upserts each food the first time anybody looks at it. The bulk import becomes a later, optional
-- optimisation — the table shape is the same either way.
--
-- ⚠ AND THE LOG ROW KEEPS ITS OWN NUMBERS. `food_log_entries` stores kcal/protein/carbs/fat as columns,
-- not a join to `food_catalog`. If USDA re-states a food, or a vendor is dropped, or a cached row is
-- evicted, yesterday's diary still reads exactly as it did yesterday. This is also what makes the
-- FatSecret permission usable (`Docs/Legal/FatSecret-Storage-Permission-2026-09-22.md`): calories and
-- macros may be stored permanently; everything else from that source may not, which is why micronutrients
-- live in `micros` only for sources that allow it (`source in ('usda','custom','off')`).
--
-- ⚠ THE PRIMARY KEY COMES FROM THE CLIENT. A food log is written in a kitchen on bad signal. The workout
-- pending-save queue (`pending-save.ts`) has no idempotency key and needs `findCommittedWorkout` before
-- every replay; nutrition does not repeat that — the device mints the uuid, so a retry is an upsert.
--
-- Idempotent: safe to run repeatedly.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Catalogue (public reference data — CC0 USDA, or Open Food Facts under ODbL)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.food_catalog (
  -- `<source>:<id in that source>` — e.g. `usda:1750340`, `off:0049000042559`, `fs:33691`.
  key          text primary key,
  source       text not null check (source in ('usda', 'off', 'fs')),
  source_id    text not null,
  name         text not null,
  brand        text,
  gtin         text,                    -- normalised to 14 digits, left-padded (GTIN-14)
  -- Per 100 g/ml, so any serving is a multiplication. Null when a source gives only a label serving.
  kcal_100     numeric,
  protein_100  numeric,
  carb_100     numeric,
  fat_100      numeric,
  -- [{ label: 'cup', grams: 240 }, …] — the servings a person actually picks.
  servings     jsonb not null default '[]'::jsonb,
  micros       jsonb,                   -- only for sources whose licence permits storage
  fetched_at   timestamptz not null default now()
);

create index if not exists food_catalog_gtin on public.food_catalog (gtin) where gtin is not null;
-- Search ranking is ours (Nutrition-Architecture §5); trigram makes "chicken brest" still find it.
create extension if not exists pg_trgm;
create index if not exists food_catalog_name_trgm on public.food_catalog using gin (name gin_trgm_ops);

alter table public.food_catalog enable row level security;
drop policy if exists food_catalog_read on public.food_catalog;
-- Reference data: any signed-in athlete may read it; only the Edge Function (service role) writes.
create policy food_catalog_read on public.food_catalog for select to authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. The athlete's own foods
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.user_foods (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references profiles(id) on delete cascade,
  name         text not null,
  brand        text,
  gtin         text,
  kcal_100     numeric,
  protein_100  numeric,
  carb_100     numeric,
  fat_100      numeric,
  servings     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists user_foods_athlete on public.user_foods (athlete_id, name);

alter table public.user_foods enable row level security;
drop policy if exists user_foods_owner_select on public.user_foods;
drop policy if exists user_foods_owner_insert on public.user_foods;
drop policy if exists user_foods_owner_update on public.user_foods;
drop policy if exists user_foods_owner_delete on public.user_foods;
create policy user_foods_owner_select on public.user_foods for select using (athlete_id = auth.uid());
create policy user_foods_owner_insert on public.user_foods for insert with check (athlete_id = auth.uid());
create policy user_foods_owner_update on public.user_foods for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy user_foods_owner_delete on public.user_foods for delete using (athlete_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. The diary
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.food_log_entries (
  -- ⚠ Client-minted (see header). Never `default gen_random_uuid()` in practice — the device sends it.
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references profiles(id) on delete cascade,
  logged_on    date not null default current_date,
  meal         text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snacks')),
  -- Where the numbers came from. `quick` is a Quick Add: calories/macros with no food behind them.
  source       text not null check (source in ('usda', 'off', 'fs', 'custom', 'quick')),
  source_key   text,                    -- food_catalog.key or user_foods.id; null for a Quick Add
  name         text not null,
  brand        text,
  serving_label text,                   -- what the athlete picked: "1 cup", "100 g", "2 slices"
  grams        numeric,                 -- null when the serving has no gram weight (e.g. Quick Add)
  quantity     numeric not null default 1,
  -- ⚠ The snapshot. Already multiplied out for this entry — never recomputed from the catalogue.
  kcal         numeric not null,
  protein      numeric not null default 0,
  carb         numeric not null default 0,
  fat          numeric not null default 0,
  micros       jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists food_log_athlete_day on public.food_log_entries (athlete_id, logged_on);
-- "Recent" and "Frequent" in Log Food read this; the partial index keeps Quick Adds out of both.
create index if not exists food_log_recent on public.food_log_entries (athlete_id, created_at desc) where source_key is not null;

alter table public.food_log_entries enable row level security;
drop policy if exists food_log_owner_select on public.food_log_entries;
drop policy if exists food_log_owner_insert on public.food_log_entries;
drop policy if exists food_log_owner_update on public.food_log_entries;
drop policy if exists food_log_owner_delete on public.food_log_entries;
create policy food_log_owner_select on public.food_log_entries for select using (athlete_id = auth.uid());
create policy food_log_owner_insert on public.food_log_entries for insert with check (athlete_id = auth.uid());
create policy food_log_owner_update on public.food_log_entries for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy food_log_owner_delete on public.food_log_entries for delete using (athlete_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3b. Favourites and saved meals — the two filters beside Recent in `Log Food.dc.html`
-- ─────────────────────────────────────────────────────────────────────────────
--
-- A favourite is a pointer, not a copy: `food_key` is a `food_catalog.key` or a `user_foods.id`, and the
-- numbers still come from wherever that food lives. A saved meal ("Usual Breakfast") is a list of the
-- same pointers plus the portion each was eaten in, so logging it writes N diary rows in one tap.

create table if not exists public.food_favorites (
  athlete_id  uuid not null references profiles(id) on delete cascade,
  food_key    text not null,
  name        text not null,          -- denormalised so the list draws without a second read
  brand       text,
  created_at  timestamptz not null default now(),
  primary key (athlete_id, food_key)
);

alter table public.food_favorites enable row level security;
drop policy if exists food_favorites_owner_select on public.food_favorites;
drop policy if exists food_favorites_owner_insert on public.food_favorites;
drop policy if exists food_favorites_owner_delete on public.food_favorites;
create policy food_favorites_owner_select on public.food_favorites for select using (athlete_id = auth.uid());
create policy food_favorites_owner_insert on public.food_favorites for insert with check (athlete_id = auth.uid());
create policy food_favorites_owner_delete on public.food_favorites for delete using (athlete_id = auth.uid());

create table if not exists public.saved_meals (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references profiles(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.saved_meal_items (
  id            uuid primary key default gen_random_uuid(),
  meal_id       uuid not null references saved_meals(id) on delete cascade,
  source        text not null check (source in ('usda', 'off', 'fs', 'custom', 'quick')),
  source_key    text,
  name          text not null,
  brand         text,
  serving_label text,
  grams         numeric,
  quantity      numeric not null default 1,
  kcal          numeric not null,
  protein       numeric not null default 0,
  carb          numeric not null default 0,
  fat           numeric not null default 0
);

create index if not exists saved_meals_athlete on public.saved_meals (athlete_id, name);
create index if not exists saved_meal_items_meal on public.saved_meal_items (meal_id);

alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;
drop policy if exists saved_meals_owner_all on public.saved_meals;
create policy saved_meals_owner_all on public.saved_meals for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
drop policy if exists saved_meal_items_owner_all on public.saved_meal_items;
-- Items are reachable only through their meal, so the owner check follows the parent row.
create policy saved_meal_items_owner_all on public.saved_meal_items for all
  using (exists (select 1 from saved_meals m where m.id = meal_id and m.athlete_id = auth.uid()))
  with check (exists (select 1 from saved_meals m where m.id = meal_id and m.athlete_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Targets — history rows, never overwritten
-- ─────────────────────────────────────────────────────────────────────────────
--
-- NUT-D5: "Forge never silently changes a target." A change writes a NEW row with a later
-- `effective_from`; the current target is the newest row at or before today. That is also what makes the
-- weekly adjust suggestion (Phase 2) honest — the old target stays readable.

create table if not exists public.nutrition_targets (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references profiles(id) on delete cascade,
  effective_from date not null default current_date,
  -- 'manual' = the athlete typed it · 'recommended' = Forge computed it and the athlete accepted it.
  method         text not null default 'manual' check (method in ('manual', 'recommended')),
  kcal           integer not null,
  protein_g      integer not null,
  carb_g         integer not null,
  fat_g          integer not null,
  -- Premium (MA6 §4): a training-day variant. Null = the same target every day.
  training_kcal  integer,
  training_protein_g integer,
  training_carb_g    integer,
  training_fat_g     integer,
  created_at     timestamptz not null default now()
);

create unique index if not exists nutrition_targets_one_per_day on public.nutrition_targets (athlete_id, effective_from);

alter table public.nutrition_targets enable row level security;
drop policy if exists nutrition_targets_owner_select on public.nutrition_targets;
drop policy if exists nutrition_targets_owner_insert on public.nutrition_targets;
drop policy if exists nutrition_targets_owner_update on public.nutrition_targets;
create policy nutrition_targets_owner_select on public.nutrition_targets for select using (athlete_id = auth.uid());
create policy nutrition_targets_owner_insert on public.nutrition_targets for insert with check (athlete_id = auth.uid());
create policy nutrition_targets_owner_update on public.nutrition_targets for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. The athlete facts a recommended target needs (Phase 2 uses them; asked in Nutrition setup)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ⚠ NOT asked in onboarding (Onboarding-Amendment-007 is held). `birth_year` is also the under-18 gate:
-- NUT-D5 gives no recommended target to a minor, and the floor is enforced in code, not here.

alter table public.profiles add column if not exists birth_year   smallint;
alter table public.profiles add column if not exists height_in    numeric;
alter table public.profiles add column if not exists activity_level text
  check (activity_level is null or activity_level in ('sedentary', 'light', 'moderate', 'very', 'extra'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Self-check
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  n_tables int;
  n_open   int;
begin
  select count(*) into n_tables from information_schema.tables
   where table_schema = 'public'
     and table_name in ('food_catalog', 'user_foods', 'food_log_entries', 'nutrition_targets',
                        'food_favorites', 'saved_meals', 'saved_meal_items');

  -- Every athlete table must be RLS-enabled. `food_catalog` is reference data and is read by everyone.
  select count(*) into n_open from pg_tables
   where schemaname = 'public'
     and tablename in ('user_foods', 'food_log_entries', 'nutrition_targets',
                       'food_favorites', 'saved_meals', 'saved_meal_items')
     and not rowsecurity;

  raise notice '0205 — tables: % of 7 · athlete tables without RLS: % (must be 0)', n_tables, n_open;
end $$;
