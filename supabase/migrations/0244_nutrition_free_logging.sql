-- 0244 — Nutrition: logging is free, planning is Premium (PO 2026-09-29, decision "B")
--
-- Monetization Amendment 006 §4, as corrected by MA8-D8 (training-day targets were withdrawn, NUT-A3-D2):
--   FREE     food logging · foods · favorites · saved meals · barcode + community foods · targets + history
--   PREMIUM  meal planner · grocery list (it lives on meal_plan_weeks) · CREATING recipes
--   PREMIUM AI  meal photos, recipe photos, Holt's Kitchen — already gated by the AI credit functions.
--
-- Replaces 0237's "the whole tab is Premium". Two gates now:
--   has_nutrition_access()  — any signed-in athlete. Every Free table's policies, food-search, the
--                             community-food RPCs and my_entitlement().nutrition keep calling it
--                             unchanged, so they open with no policy edits.
--   has_nutrition_planner() — 0237's rule, verbatim: the 0206 allowlist OR athlete_tier() = PREMIUM.
--
-- ⚠ user_recipes is SPLIT, not moved. Log Food's "My Recipes" filter and My Foods' Recipes tab READ it, so
--   reading stays on the base gate — a downgraded athlete still logs the recipes they already saved.
--   Writing (create, edit, delete) is the planner gate.
--
-- ⚠ While entitlement_config.default_tier is PREMIUM (testing), every account passes BOTH gates; the
--   split only shows once default_tier flips to FREE at launch.
--
-- ⛔ my_entitlement() is 0206's body COPIED, not retyped, plus ONE line (`nutritionPlanner`). 0206 is the
--   last migration to define it (0145 → 0206). Diff before editing.

begin;

-- 1. The base gate: any signed-in athlete ────────────────────────────────────────────────────────
create or replace function public.has_nutrition_access()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null;
$$;

comment on function public.has_nutrition_access() is
  '0244 (was 0237 Premium-only, 0206 allowlist). True for ANY signed-in caller — food logging, foods, saved meals, barcode/community foods and targets are free on every plan (MA6 §4 / MA8-D8). The Premium part of Nutrition is has_nutrition_planner(). Zero-argument on purpose (see 0129).';

revoke all on function public.has_nutrition_access() from public;
grant execute on function public.has_nutrition_access() to authenticated;

-- 2. The planner gate: 0237's rule ────────────────────────────────────────────────────────────────
create or replace function public.has_nutrition_planner()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and (
       exists (select 1 from public.nutrition_preview p where p.user_id = auth.uid())
       or public.athlete_tier(auth.uid()) = 'PREMIUM'
     );
$$;

comment on function public.has_nutrition_planner() is
  '0244. The Premium part of Nutrition — meal planner, grocery list, creating recipes: the 0206 nutrition_preview allowlist OR athlete_tier() = PREMIUM (paid, comped, Premium AI, Founder, or default_tier while it is PREMIUM). Zero-argument on purpose (see 0129).';

revoke all on function public.has_nutrition_planner() from public;
grant execute on function public.has_nutrition_planner() to authenticated;

-- 3. Meal planner + grocery → planner gate ───────────────────────────────────────────────────────
drop policy if exists meal_plan_prefs_owner_all on public.meal_plan_prefs;
create policy meal_plan_prefs_owner_all on public.meal_plan_prefs for all
  using (athlete_id = auth.uid() and public.has_nutrition_planner())
  with check (athlete_id = auth.uid() and public.has_nutrition_planner());

drop policy if exists meal_plan_weeks_owner_all on public.meal_plan_weeks;
create policy meal_plan_weeks_owner_all on public.meal_plan_weeks for all
  using (athlete_id = auth.uid() and public.has_nutrition_planner())
  with check (athlete_id = auth.uid() and public.has_nutrition_planner());

-- 4. Recipes: read free, write Premium ────────────────────────────────────────────────────────────
drop policy if exists user_recipes_owner_all on public.user_recipes;

drop policy if exists user_recipes_owner_select on public.user_recipes;
create policy user_recipes_owner_select on public.user_recipes for select
  using (athlete_id = auth.uid() and public.has_nutrition_access());

drop policy if exists user_recipes_owner_insert on public.user_recipes;
create policy user_recipes_owner_insert on public.user_recipes for insert
  with check (athlete_id = auth.uid() and public.has_nutrition_planner());

drop policy if exists user_recipes_owner_update on public.user_recipes;
create policy user_recipes_owner_update on public.user_recipes for update
  using (athlete_id = auth.uid() and public.has_nutrition_planner())
  with check (athlete_id = auth.uid() and public.has_nutrition_planner());

drop policy if exists user_recipes_owner_delete on public.user_recipes;
create policy user_recipes_owner_delete on public.user_recipes for delete
  using (athlete_id = auth.uid() and public.has_nutrition_planner());

-- 5. my_entitlement() — 0206's body, plus ONE line ────────────────────────────────────────────────
create or replace function public.my_entitlement()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_tier   text;
  v_caps   jsonb;
  v_live   record;
  v_usage  public.athlete_usage%rowtype;
  v_ent    public.athlete_entitlement%rowtype;
  v_period date := date_trunc('month', now())::date;
begin
  if v_uid is null then
    raise exception 'my_entitlement: no authenticated athlete' using errcode = '28000';
  end if;

  v_tier := public.athlete_tier(v_uid);
  v_caps := public.athlete_caps(v_uid);

  select * into v_live from public.athlete_live_counts(v_uid);
  select * into v_usage from public.athlete_usage where athlete_id = v_uid;
  select * into v_ent   from public.athlete_entitlement where athlete_id = v_uid;

  return jsonb_build_object(
    'tier',        v_tier,
    'premiumKind', v_ent.premium_kind,
    'premiumUntil', v_ent.premium_until,
    -- Concurrent with Premium, never implied by it (MA3-D3).
    'coachAi',     coalesce(v_ent.coach_ai, false)
                     and (v_ent.coach_ai_until is null or v_ent.coach_ai_until > now()),
    -- 0206 — THE ONLY LINE THIS MIGRATION ADDS. Not a tier and not a purchase: an allowlist for an
    -- unfinished feature, so the client can hide the tab rather than render a screen that cannot load.
    'nutrition',   public.has_nutrition_access(),
    -- 0244 — the Premium part of Nutrition (meal planner, grocery, creating recipes).
    'nutritionPlanner', public.has_nutrition_planner(),
    'founderSeat', v_ent.founder_seat,
    'caps',        v_caps,
    'usage', jsonb_build_object(
      'programs',  coalesce(v_usage.programs_created, 0),
      'photos',    v_live.photos,
      'videos',    v_live.videos,
      'squads',    v_live.squads,
      'templates', v_live.templates,
      'imports',   case when coalesce(v_usage.has_used_free_import, false) then 1 else 0 end,
      'holtPrograms', coalesce(v_usage.holt_programs_used, 0),
      -- ⚠ ZERO WHEN THE STORED PERIOD IS LAST MONTH. The refill is lazy (see §3), so a stale row must
      -- read as refilled here too — otherwise the screen shows "0 of 2 left" on the 1st while the
      -- consume function would happily allow two.
      'holtDays',  case when v_usage.holt_days_period = v_period
                        then coalesce(v_usage.holt_days_used, 0) else 0 end
    )
  );
end;
$$;

commit;
