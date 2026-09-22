-- Forge Legacy — 0206: Nutrition is a PREVIEW — only the allowlist may reach it
--
-- ══ WHAT WAS ASKED ══
--
-- PO, 2026-09-22: *"is there a way to only give access to me for the nutrition part? It's not done yet
-- so I don't want people using it. Me and the claudetest account."*
--
-- ══ WHY THIS IS A SERVER CHANGE AND NOT A HIDDEN TAB ══
--
-- Hiding the tab in the client is not a gate — 0203 says so in its own header, about this exact class of
-- mistake, and it was right: any signed-in account could have called the AI functions while the tab was
-- hidden. The same is true here twice over. `food_log_entries` and friends accept writes from anybody
-- holding a session, and `food-search` spends the project's FatSecret/FDC quota on every miss. So the
-- allowlist lives in the database, every nutrition policy consults it, and the Edge Function refuses
-- before it calls out. The client hiding the tab is the courtesy, not the control.
--
-- ══ WHAT THIS DOES ══
--
--   1. `nutrition_preview` — the allowlist. Same shape and same posture as `app_admins` (0129): RLS
--      ENABLED WITH ZERO POLICIES, so it is unreadable by `anon` and `authenticated` alike and cannot be
--      enumerated; read only by the definer function below, written only here in the SQL editor.
--
--      ⚠ DELIBERATELY NOT `app_admins`. "May preview an unfinished feature" and "may read every
--      athlete's metrics on /admin" are different powers, and collapsing them means the next preview
--      tester silently gets the operator dashboard. A separate table costs one migration and keeps that
--      from ever being a question.
--
--      ⚠ AND DELIBERATELY NOT AN `athlete_entitlement` COLUMN. `coach_ai` has `set_my_premium_ai()`, so
--      ANY account can switch its own Premium AI on (0203 §4, PO-accepted for testing). That is the
--      opposite of what was asked for here — the PO's words were *"I don't want people using it"* — so
--      there is no self-serve write anywhere in this migration.
--
--   2. `has_nutrition_access()` — zero-argument, `security definer`, `stable`. Zero-argument for the
--      reason 0129 gives: a definer function taking an arbitrary uuid is a footgun. Safe to grant to
--      `authenticated` because it reveals only whether YOU hold it, never who else does.
--
--   3. Every one of 0205's 17 nutrition policies is recreated with `and public.has_nutrition_access()`.
--      Nothing else about them changes — the owner checks are 0205's, character for character.
--
--   4. Seeds the two accounts by EMAIL out of `auth.users`, so this file is self-contained and nobody has
--      to paste a uuid: `isaiahaltamirano@gmail.com` and `claudetest@test.com`.
--
--      ⚠ A missing account is a WARNING, not a failure. If `claudetest@test.com` has been wiped by
--      `reset-all-accounts.sql` it simply is not seeded, and §2 tells you which one was missing rather
--      than aborting a migration that was otherwise correct.
--
--   5. `my_entitlement()` returns `nutrition`, so the client can hide the tab without a second round trip.
--
--      ⛔ ITS BODY IS 0145'S, COPIED, NOT RETYPED. `create or replace` rewrites the WHOLE body, and this
--      function carries the lazy holt-days refill and the founder/premium fields. The ONLY difference
--      from 0145 is the one line marked `0206`. Diff it against 0145 before believing otherwise.
--
-- Depends on 0129 (posture copied), 0145 (`my_entitlement`) and 0205 (the tables). Idempotent — safe to
-- run twice: the table is `if not exists`, every policy is dropped before it is created, and the seed is
-- an upsert.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The allowlist
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.nutrition_preview (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  -- Free text, for whoever reads this table in a year wondering why these two accounts.
  note       text,
  granted_at timestamptz not null default now()
);

alter table public.nutrition_preview enable row level security;

-- ⚠ NO POLICIES. NOT AN OMISSION — the same deliberate deny-by-default as `app_admins`. The only reader
-- is the definer function below (which runs as the table owner and is not subject to RLS); the only
-- writer is this file, in the SQL editor.

comment on table public.nutrition_preview is
  'The Nutrition preview allowlist (0206). Nutrition Phase 1 is unfinished and the PO asked that only his own account and the claudetest account reach it. RLS is ENABLED WITH ZERO POLICIES on purpose, so the roster is not enumerable. Read only by public.has_nutrition_access(); written only by hand in the SQL editor — there is no self-serve grant, which is the whole point. Remove the gate (not this table) when Nutrition ships publicly.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. The check
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.has_nutrition_access()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.nutrition_preview p where p.user_id = auth.uid());
$$;

comment on function public.has_nutrition_access() is
  '0206. True when the CALLER may use the Nutrition preview. Zero-argument on purpose (see 0129). Safe to grant to authenticated: it reveals only whether YOU hold access, never who else does. Consulted by every nutrition RLS policy and by the food-search Edge Function.';

revoke all on function public.has_nutrition_access() from public;
grant execute on function public.has_nutrition_access() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Every nutrition policy now consults the allowlist
--
-- The owner half of each `using` / `with check` is 0205's, unchanged. The only edit is the appended
-- `and public.has_nutrition_access()`. 17 policies across 7 tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 food_catalog (1) — shared reference data, but there is no reason for an athlete who cannot log
-- food to read the catalogue, and gating it keeps the preview from being discoverable by probing.
drop policy if exists food_catalog_read on public.food_catalog;
create policy food_catalog_read on public.food_catalog for select to authenticated
  using (public.has_nutrition_access());

-- 3.2 user_foods (4)
drop policy if exists user_foods_owner_select on public.user_foods;
drop policy if exists user_foods_owner_insert on public.user_foods;
drop policy if exists user_foods_owner_update on public.user_foods;
drop policy if exists user_foods_owner_delete on public.user_foods;
create policy user_foods_owner_select on public.user_foods for select
  using (athlete_id = auth.uid() and public.has_nutrition_access());
create policy user_foods_owner_insert on public.user_foods for insert
  with check (athlete_id = auth.uid() and public.has_nutrition_access());
create policy user_foods_owner_update on public.user_foods for update
  using (athlete_id = auth.uid() and public.has_nutrition_access())
  with check (athlete_id = auth.uid() and public.has_nutrition_access());
create policy user_foods_owner_delete on public.user_foods for delete
  using (athlete_id = auth.uid() and public.has_nutrition_access());

-- 3.3 food_log_entries (4)
drop policy if exists food_log_owner_select on public.food_log_entries;
drop policy if exists food_log_owner_insert on public.food_log_entries;
drop policy if exists food_log_owner_update on public.food_log_entries;
drop policy if exists food_log_owner_delete on public.food_log_entries;
create policy food_log_owner_select on public.food_log_entries for select
  using (athlete_id = auth.uid() and public.has_nutrition_access());
create policy food_log_owner_insert on public.food_log_entries for insert
  with check (athlete_id = auth.uid() and public.has_nutrition_access());
create policy food_log_owner_update on public.food_log_entries for update
  using (athlete_id = auth.uid() and public.has_nutrition_access())
  with check (athlete_id = auth.uid() and public.has_nutrition_access());
create policy food_log_owner_delete on public.food_log_entries for delete
  using (athlete_id = auth.uid() and public.has_nutrition_access());

-- 3.4 food_favorites (3)
drop policy if exists food_favorites_owner_select on public.food_favorites;
drop policy if exists food_favorites_owner_insert on public.food_favorites;
drop policy if exists food_favorites_owner_delete on public.food_favorites;
create policy food_favorites_owner_select on public.food_favorites for select
  using (athlete_id = auth.uid() and public.has_nutrition_access());
create policy food_favorites_owner_insert on public.food_favorites for insert
  with check (athlete_id = auth.uid() and public.has_nutrition_access());
create policy food_favorites_owner_delete on public.food_favorites for delete
  using (athlete_id = auth.uid() and public.has_nutrition_access());

-- 3.5 saved_meals + saved_meal_items (2). The items policy still reaches the owner through the parent
-- row, exactly as 0205 wrote it; the gate is appended to both halves.
drop policy if exists saved_meals_owner_all on public.saved_meals;
create policy saved_meals_owner_all on public.saved_meals for all
  using (athlete_id = auth.uid() and public.has_nutrition_access())
  with check (athlete_id = auth.uid() and public.has_nutrition_access());
drop policy if exists saved_meal_items_owner_all on public.saved_meal_items;
create policy saved_meal_items_owner_all on public.saved_meal_items for all
  using (exists (select 1 from saved_meals m where m.id = meal_id and m.athlete_id = auth.uid())
         and public.has_nutrition_access())
  with check (exists (select 1 from saved_meals m where m.id = meal_id and m.athlete_id = auth.uid())
         and public.has_nutrition_access());

-- 3.6 nutrition_targets (3)
drop policy if exists nutrition_targets_owner_select on public.nutrition_targets;
drop policy if exists nutrition_targets_owner_insert on public.nutrition_targets;
drop policy if exists nutrition_targets_owner_update on public.nutrition_targets;
create policy nutrition_targets_owner_select on public.nutrition_targets for select
  using (athlete_id = auth.uid() and public.has_nutrition_access());
create policy nutrition_targets_owner_insert on public.nutrition_targets for insert
  with check (athlete_id = auth.uid() and public.has_nutrition_access());
create policy nutrition_targets_owner_update on public.nutrition_targets for update
  using (athlete_id = auth.uid() and public.has_nutrition_access())
  with check (athlete_id = auth.uid() and public.has_nutrition_access());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seed the two accounts, by email
--
-- `auth.users` is the source of truth for an email; `profiles.id` is the same uuid. An account that does
-- not exist is skipped and reported by §2 rather than raising — see the header.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.nutrition_preview (user_id, note)
select p.id,
       case u.email
         when 'isaiahaltamirano@gmail.com' then 'PO — Nutrition preview (0206)'
         else 'claudetest — Nutrition preview (0206)'
       end
  from auth.users u
  join public.profiles p on p.id = u.id
 where lower(u.email) in ('isaiahaltamirano@gmail.com', 'claudetest@test.com')
    on conflict (user_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. my_entitlement() — 0145's body, plus ONE line
--
-- ⛔ COPIED FROM 0145, NOT RETYPED. Diff this against 0145's definition: the only difference is the
-- `'nutrition'` key marked below.
-- ─────────────────────────────────────────────────────────────────────────────
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
