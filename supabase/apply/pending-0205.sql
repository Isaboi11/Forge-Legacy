-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0205: nutrition core (the food diary, its targets, and the catalogue that fills itself)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded (`if not exists`, and `drop policy if exists` before
-- each `create policy`), and §3 is read-only.
--
-- ⚠ APPLYING THIS CHANGES NOTHING AN ATHLETE CAN SEE. The Nutrition tab, Log Food and the `food-search`
-- Edge Function all ship separately and none of them is deployed yet. `0153` applied perfectly clean and
-- nothing appeared in the app for eleven migrations for exactly this reason.
-- **Order to ship: paste this → deploy `food-search` (with `FDC_API_KEY`) → deploy web.**
--
-- ⚠ This is not the only migration awaiting application — check `supabase/apply/` for other `pending-*`
-- files before assuming the database is otherwise current.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- `Docs/Nutrition-Architecture-v1.0.md` Phase 1 (tracking). Seven tables — a shared food catalogue, the
-- athlete's own foods, the diary itself, favourites, saved meals and their items, and calorie/macro
-- targets — plus three nullable `profiles` columns that Phase 2's *recommended* targets will need.
--
-- ══ FOUR THINGS A FUTURE READER NEEDS ══
--
-- ⚠ **PRIVACY IS THE SCHEMA, NOT A SETTING** (`P-6-Amendment-002-Nutrition-Data` P6-A2-D1/D2). Every
-- athlete table is owner-only and there is deliberately **no visibility column**, so a future "open the
-- defaults for testing" migration like `0189` cannot reach nutrition — there is nothing for it to open.
-- `food_catalog` is the single exception: public-domain reference data, readable by any signed-in
-- athlete and writable only by the service role (the Edge Function), so a device cannot poison it.
--
-- ⚠ **THE CATALOGUE IS A CACHE, NOT AN IMPORT.** `food_catalog` starts EMPTY and stays empty until
-- somebody searches: `food-search` reads USDA FoodData Central live and upserts what it fetched. USDA's
-- bulk dump is 3 GB and loading it needs database access this project does not have. USDA is CC0, so a
-- diary row may keep its own numbers forever either way — which is the whole reason it was chosen.
--
-- ⚠ **THE DIARY ROW KEEPS ITS OWN NUMBERS.** `food_log_entries` stores kcal/protein/carb/fat as columns,
-- never a join. If a source re-states a food, a cached row is evicted, or a vendor is dropped, yesterday
-- still reads as it did yesterday. It is also what makes FatSecret usable at all:
-- `Docs/Legal/FatSecret-Storage-Permission-2026-09-22.md` permits storing **calories and macros only**,
-- which is why `micros` is filled for `usda`/`custom`/`off` and left null for `fs`.
--
-- ⚠ **THE PRIMARY KEY COMES FROM THE CLIENT.** Food is logged in kitchens on bad signal, so `addEntries()`
-- mints the uuid and upserts on it — a retry can never double-log. The workout pending-save queue has no
-- such key and needs `findCommittedWorkout` before every replay; nutrition does not repeat that.
--
-- `pg_trgm` is created here for the search index. If the extension is restricted on this project, §2
-- raises rather than leaving food search quietly slow.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  the statements — **verbatim from `supabase/migrations/0205_nutrition_core.sql` sections 1–5**
--     (checked by diffing non-comment lines, not by eye: 0 missing)
-- §2  asserts all seven tables exist, that RLS is on for all six athlete tables, that none of them grew
--     a visibility-shaped column, that the three `profiles` columns landed, and that `pg_trgm` is there.
--     RAISES if any of that is false.
-- §3  reports what is there and how many rows each table holds. Read-only.
--
-- ══ WHAT §3 SHOULD SAY (predicted before running) ══
--
-- `tables_of_7 = 7` · `rls_missing = 0` · `profiles_columns_of_3 = 3`, and **every row count 0** —
-- including `catalogue_foods`, because nothing has searched yet. A non-zero count anywhere would mean
-- something is already writing to these tables, and nothing should be: the client is not deployed.
-- The policy list should show one `select` policy on `food_catalog` and owner policies everywhere else,
-- with nothing granting one athlete access to another's rows.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- ═══ §1 — THE STATEMENTS ═══════════════════════════════════════════════════════════════════════

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

-- ═══ §2 — THE ASSERTION ════════════════════════════════════════════════════════════════════════
--
-- A migration that returns a tidy green having done nothing is the failure this section exists to catch.

do $$
declare
  n_tables  int;
  n_rls_off int;
  n_visible int;
  n_profile int;
  n_trgm    int;
begin
  select count(*) into n_tables from information_schema.tables
   where table_schema = 'public'
     and table_name in ('food_catalog', 'user_foods', 'food_log_entries', 'nutrition_targets',
                        'food_favorites', 'saved_meals', 'saved_meal_items');
  if n_tables <> 7 then
    raise exception '0205 FAILED: % of 7 nutrition tables exist', n_tables;
  end if;

  -- Every athlete table must have RLS on. `food_catalog` is reference data and is read by everyone.
  select count(*) into n_rls_off from pg_tables
   where schemaname = 'public'
     and tablename in ('user_foods', 'food_log_entries', 'nutrition_targets',
                       'food_favorites', 'saved_meals', 'saved_meal_items')
     and not rowsecurity;
  if n_rls_off <> 0 then
    raise exception '0205 FAILED: % athlete table(s) without RLS', n_rls_off;
  end if;

  -- P6-A2-D2: nutrition has no visibility setting to get wrong, now or later.
  select count(*) into n_visible from information_schema.columns
   where table_schema = 'public'
     and table_name in ('food_catalog', 'user_foods', 'food_log_entries', 'nutrition_targets',
                        'food_favorites', 'saved_meals', 'saved_meal_items')
     and column_name in ('visibility', 'audience', 'is_public');
  if n_visible <> 0 then
    raise exception '0205 FAILED: % visibility-shaped column(s) on nutrition tables', n_visible;
  end if;

  select count(*) into n_profile from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles'
     and column_name in ('birth_year', 'height_in', 'activity_level');
  if n_profile <> 3 then
    raise exception '0205 FAILED: % of 3 profiles columns present', n_profile;
  end if;

  select count(*) into n_trgm from pg_extension where extname = 'pg_trgm';
  if n_trgm <> 1 then
    raise exception '0205 FAILED: pg_trgm is not installed, so food search has no index';
  end if;

  raise notice '0205 OK — 7 tables · RLS on all 6 athlete tables · no visibility column · 3 profiles columns · pg_trgm present';
end $$;

-- ═══ §3 — THE REPORT (read-only) ═══════════════════════════════════════════════════════════════

select 'tables' as section,
       (select count(*) from information_schema.tables
         where table_schema = 'public'
           and table_name in ('food_catalog', 'user_foods', 'food_log_entries', 'nutrition_targets',
                              'food_favorites', 'saved_meals', 'saved_meal_items')) as tables_of_7,
       (select count(*) from pg_tables
         where schemaname = 'public'
           and tablename in ('user_foods', 'food_log_entries', 'nutrition_targets',
                             'food_favorites', 'saved_meals', 'saved_meal_items')
           and not rowsecurity) as rls_missing,
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles'
           and column_name in ('birth_year', 'height_in', 'activity_level')) as profiles_columns_of_3;

-- Every count here should be 0 on a first apply: nothing writes to these until the app is deployed.
select 'rows' as section,
       (select count(*) from public.food_catalog)      as catalogue_foods,
       (select count(*) from public.user_foods)        as custom_foods,
       (select count(*) from public.food_log_entries)  as diary_entries,
       (select count(*) from public.nutrition_targets) as targets,
       (select count(*) from public.food_favorites)    as favourites,
       (select count(*) from public.saved_meals)       as saved_meals;

-- The policies that make nutrition private. Expect a single `select` policy on `food_catalog`, owner
-- policies on everything else, and nothing granting one athlete access to another's rows.
select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('food_catalog', 'user_foods', 'food_log_entries', 'nutrition_targets',
                     'food_favorites', 'saved_meals', 'saved_meal_items')
 order by tablename, policyname;
