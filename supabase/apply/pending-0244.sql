-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0244: Nutrition logging is FREE, the meal planner / grocery / creating recipes are PREMIUM
--
-- PO decision "B", 2026-09-29 (Monetization Amendment 006 §4 as corrected by MA8-D8). Replaces 0237's
-- "the whole tab is Premium".
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice.
--
-- What changes:
--   · has_nutrition_access()  → any signed-in athlete (logging, foods, saved meals, barcode, targets)
--   · has_nutrition_planner() → NEW, 0237's rule: 0206 allowlist OR athlete_tier() = PREMIUM
--   · meal_plan_prefs / meal_plan_weeks (planner + grocery) → planner gate
--   · user_recipes → READ on the base gate (so saved recipes still log), WRITE on the planner gate
--   · my_entitlement() gains `nutritionPlanner` (0206's body copied, one line added — diffed: 2 lines)
--
-- ⚠ Safe before the app update: the current app only reads `nutrition`, which stays true for Premium
--   (and now for everyone). Until the update ships, a Free athlete who opens Meal Plan on an old bundle
--   is sent to /subscription by the existing tier check; creating a recipe would fail on the write.
-- ⚠ While entitlement_config.default_tier is PREMIUM, every account passes both gates — no visible change
--   until launch flips default_tier to FREE.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- §1 — THE CHANGE (verbatim from supabase/migrations/0244_nutrition_free_logging.sql)

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

-- §2 — ASSERT IT LANDED (by SOURCE and by pg_policies; calling the gates here as `postgres` has no auth.uid())

do $$
declare src text; q text; c text;
begin
  select p.prosrc into src from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'has_nutrition_access' and p.pronargs = 0;
  if src is null or position('athlete_tier' in src) > 0 or position('auth.uid() is not null' in src) = 0 then
    raise exception '0244 DID NOT APPLY: has_nutrition_access() is not the open body';
  end if;

  select p.prosrc into src from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'has_nutrition_planner' and p.pronargs = 0;
  if src is null or position('athlete_tier' in src) = 0 or position('nutrition_preview' in src) = 0 then
    raise exception '0244 DID NOT APPLY: has_nutrition_planner() is missing or wrong';
  end if;

  if has_function_privilege('anon', 'public.has_nutrition_access()', 'execute')
     or has_function_privilege('anon', 'public.has_nutrition_planner()', 'execute') then
    raise exception '0244 WRONG: anon can execute a nutrition gate';
  end if;

  for q in select unnest(array['meal_plan_prefs_owner_all','meal_plan_weeks_owner_all']) loop
    select coalesce(pp.qual,'') || coalesce(pp.with_check,'') into c from pg_policies pp where pp.schemaname = 'public' and pp.policyname = q;
    if c is null or position('has_nutrition_planner' in c) = 0 then
      raise exception '0244 DID NOT APPLY: policy % is not on the planner gate', q;
    end if;
  end loop;

  if exists (select 1 from pg_policies where schemaname = 'public' and policyname = 'user_recipes_owner_all') then
    raise exception '0244 DID NOT APPLY: user_recipes_owner_all still exists';
  end if;
  select qual into c from pg_policies where schemaname = 'public' and policyname = 'user_recipes_owner_select';
  if c is null or position('has_nutrition_access' in c) = 0 then
    raise exception '0244 DID NOT APPLY: user_recipes read is not on the base gate';
  end if;
  for q in select unnest(array['user_recipes_owner_insert','user_recipes_owner_update','user_recipes_owner_delete']) loop
    select coalesce(pp.qual,'') || coalesce(pp.with_check,'') into c from pg_policies pp where pp.schemaname = 'public' and pp.policyname = q;
    if c is null or position('has_nutrition_planner' in c) = 0 then
      raise exception '0244 DID NOT APPLY: policy % is not on the planner gate', q;
    end if;
  end loop;

  select p.prosrc into src from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'my_entitlement' and p.pronargs = 0;
  if src is null or position('nutritionPlanner' in src) = 0 or position('founderSeat' in src) = 0 then
    raise exception '0244 DID NOT APPLY: my_entitlement() lacks nutritionPlanner (or lost its body)';
  end if;

  raise notice '0244 OK — logging is free, planner/grocery/recipe-writing are Premium.';
end $$;


-- §3 — WHAT LANDED. Read-only, one row.
-- Predicted while default_tier is PREMIUM:
--   default_tier PREMIUM · planner_accounts = total_accounts · policies_on_planner 5 · recipe_read_free true
--   · old_recipe_policy_gone true · entitlement_has_planner_key true

select
  (select c.default_tier from public.entitlement_config c where c.id)                          as default_tier,
  (select count(*) from public.profiles)                                                         as total_accounts,
  (select count(*) from public.profiles p
    where public.athlete_tier(p.id) = 'PREMIUM'
       or exists (select 1 from public.nutrition_preview n where n.user_id = p.id))              as planner_accounts,
  (select count(*) from pg_policies where schemaname = 'public'
     and position('has_nutrition_planner' in coalesce(qual,'') || coalesce(with_check,'')) > 0)  as policies_on_planner,
  (select position('has_nutrition_access' in qual) > 0 from pg_policies
    where schemaname = 'public' and policyname = 'user_recipes_owner_select')                    as recipe_read_free,
  not exists (select 1 from pg_policies where schemaname = 'public'
                 and policyname = 'user_recipes_owner_all')                                      as old_recipe_policy_gone,
  position('nutritionPlanner' in (select p.prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                  where n.nspname = 'public' and p.proname = 'my_entitlement'
                                    and p.pronargs = 0)) > 0                                      as entitlement_has_planner_key;
