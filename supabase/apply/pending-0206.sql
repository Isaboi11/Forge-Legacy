-- ═══ PENDING — 0206: Nutrition is a PREVIEW — only the allowlist may reach it ═══
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: the table is `create ... if not exists`, every policy is dropped before it is
-- created, the seed is an upsert, and §3 is read-only.
--
-- ⚠ THIS ONE HAS A CLIENT HALF AND THE ORDER IS **SQL FIRST** — the opposite of a privatising
-- migration. Here the SQL only ever REMOVES access, and the currently deployed client does not ask for
-- `nutrition` yet, so it reads `undefined` → falsy → the tab hides. That is the safe failure.
-- Order: paste this → deploy web → redeploy `food-search`.
--
-- ⚠ AFTER THIS RUNS, NUTRITION STOPS WORKING FOR EVERY ACCOUNT NOT ON THE LIST — which is the point.
-- Anyone who logged food while it was open KEEPS their rows; they just cannot read them until the gate
-- is lifted. Nothing is deleted.
--
-- ⚠ IF `claudetest@test.com` HAS BEEN WIPED, §2 warns and does NOT raise. Re-run this file once the
-- account exists again and the seed picks it up.
--
-- WHAT §3 SHOULD SAY (predicted before running — read the real output against this):
--   • ⭐ **§3a IS THE ANSWER TO "will it be on my account?"** — it lists the exact email addresses that
--     will see the Nutrition tab. Expect `isaiahaltamirano@gmail.com` and `claudetest@test.com`.
--     §3a-ii lists EVERY account with a yes/no, so a missing seed explains itself at a glance.
--   • allowlist_rows: **2** normally — the PO and claudetest, which are the same two accounts §4 seeds by
--     email. It can be **1** if claudetest has been wiped, and it stays 2 (not 3) because the PO is
--     already an operator, so §4b's `app_admins` bootstrap hits `on conflict do nothing`.
--     Never 0 — §2 aborts rather than leave the PO locked out of his own feature.
--   • policies_gated / policies_total: **17 of 17**. A lower gated count means a policy was added to
--     0205 after this file was written and is now UNGATED — find it before trusting the gate.
--   • preview_table_policy_count: **0** — zero is correct and deliberate, not an omission.
--   • my_entitlement_has_nutrition: **true**.
--   • you_have_access: **true** when the SQL editor runs as the PO, but the editor usually runs as
--     `postgres` with no `auth.uid()`, in which case **false** is expected and means nothing.
--   • food_log_rows / athletes_who_logged: whatever the open period produced. If athletes_who_logged
--     is greater than 2, other people HAD started using it — worth knowing, and their rows survive.
-- ════════════════════════════════════════════════════════════════════════════════════

-- ═══ §1 — THE STATEMENTS (verbatim from supabase/migrations/0206_nutrition_preview_gate.sql) ═══

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
       case lower(u.email)
         when 'isaiahaltamirano@gmail.com' then 'PO — Nutrition preview (0206)'
         else 'claudetest — Nutrition preview (0206)'
       end
  from auth.users u
  join public.profiles p on p.id = u.id
 where lower(u.email) in ('isaiahaltamirano@gmail.com', 'claudetest@test.com')
    on conflict (user_id) do nothing;

-- 4b. ⭐ AND WHOEVER ALREADY HOLDS ADMIN, so the PO's access does not depend on an email string.
--
-- The list above is the same address `pending-0129-0130.sql` STEP 2 used to bootstrap `app_admins`, and
-- `/admin` works, so it did match a real account. But "the PO's account" is a fact about the database, not
-- about a literal in this file: if he ever signs in under a different address, the line above silently
-- grants nobody and §2 aborts the migration. `app_admins` already answers "which account is the creator's"
-- authoritatively, so ask it too. 0203 §3 did exactly this for the same reason.
--
-- ⚠ THIS IS A ONE-SHOT BOOTSTRAP, NOT A RULE. It copies today's operators into the allowlist; it does not
-- make admin imply nutrition. A future operator gets no preview access, and a future preview tester gets
-- no admin — which is the whole reason `nutrition_preview` is its own table.
insert into public.nutrition_preview (user_id, note)
select a.user_id, 'operator (app_admins) — Nutrition preview (0206)'
  from public.app_admins a
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


-- ═══ §2 — THE ASSERTION ═════════════════════════════════════════════════════
--
-- Raises if anything above did not land. A migration that returns a tidy green while having done
-- nothing is the exact failure this section exists to prevent.

do $checks$
declare
  v_gated int;
  v_total int;
  v_rows  int;
  v_po    boolean;
  v_ct    boolean;
  v_admin boolean;
  v_tabs  text[] := array['food_catalog','user_foods','food_log_entries','food_favorites',
                          'saved_meals','saved_meal_items','nutrition_targets'];
begin
  if not exists (select 1 from pg_class
                  where relname = 'nutrition_preview' and relnamespace = 'public'::regnamespace) then
    raise exception '0206 FAILED: table public.nutrition_preview does not exist';
  end if;

  if not exists (select 1 from pg_proc
                  where proname = 'has_nutrition_access' and pronamespace = 'public'::regnamespace) then
    raise exception '0206 FAILED: function public.has_nutrition_access() does not exist';
  end if;

  -- Every nutrition policy must mention the gate. `pg_policies` renders back what Postgres actually
  -- STORED, not what we think we wrote, which is the only version that matters.
  select count(*) into v_total
    from pg_policies where schemaname = 'public' and tablename = any(v_tabs);

  select count(*) into v_gated
    from pg_policies
   where schemaname = 'public' and tablename = any(v_tabs)
     and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%has_nutrition_access%';

  if v_gated <> v_total then
    raise exception
      '0206 FAILED: % of % nutrition policies are gated — % are UNGATED and reachable by any signed-in account',
      v_gated, v_total, v_total - v_gated;
  end if;

  if v_total <> 17 then
    raise warning
      '0206: expected 17 nutrition policies, found %. All % ARE gated so access is correct, but 0205 has gained or lost a policy — reconcile the count.',
      v_total, v_total;
  end if;

  -- The allowlist table itself must have NO policies. If someone "helpfully" adds one, the roster
  -- becomes enumerable and this stops being an allowlist.
  if exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'nutrition_preview') then
    raise exception '0206 FAILED: nutrition_preview has RLS policies — it must have ZERO (see the header)';
  end if;

  if (public.my_entitlement() -> 'nutrition') is null then
    raise exception '0206 FAILED: my_entitlement() does not return a nutrition key';
  end if;

  select count(*) into v_rows from public.nutrition_preview;

  select exists (select 1 from public.nutrition_preview p
                   join auth.users u on u.id = p.user_id
                  where lower(u.email) = 'isaiahaltamirano@gmail.com') into v_po;
  select exists (select 1 from public.nutrition_preview p
                   join auth.users u on u.id = p.user_id
                  where lower(u.email) = 'claudetest@test.com') into v_ct;

  select exists (select 1 from public.nutrition_preview p
                   join public.app_admins a on a.user_id = p.user_id) into v_admin;

  -- The PO must be reachable by ONE of the two paths, or this migration has locked HIM out too, which is
  -- the one outcome nobody wants. Email is the expected path; the app_admins bootstrap is the safety net.
  if not v_po and not v_admin then
    raise exception
      '0206 FAILED: nobody identifiable has access — isaiahaltamirano@gmail.com matched no auth.users row AND app_admins is empty. Run: select email from auth.users; then put the real address in §4 and re-run this file.';
  end if;

  if not v_po and v_admin then
    raise warning
      '0206: isaiahaltamirano@gmail.com matched NO account, but % operator account(s) from app_admins were seeded and DO have access. Confirm you sign in as one of them — §3a lists the emails.',
      (select count(*) from public.nutrition_preview p join public.app_admins a on a.user_id = p.user_id);
  end if;

  if not v_ct then
    raise warning
      '0206: claudetest@test.com was not seeded (no auth.users/profiles row — probably wiped). The PO HAS access. Re-run this file after recreating the account.';
  end if;

  raise notice '0206 OK — % of % policies gated, % allowlist row(s), PO present, claudetest %',
    v_gated, v_total, v_rows, case when v_ct then 'present' else 'MISSING (see warning)' end;
end $checks$;

-- ═══ §3 — THE REPORT (read-only) ══════════════════════════════════════════════

-- 3a. ⭐ WHO MAY USE NUTRITION — read this one first. These are the exact accounts that will see the tab
-- in the app. If the address you sign in with is not in this list, you will NOT see Nutrition.
select u.email,
       p_prof.handle,
       p.note,
       p.granted_at
  from public.nutrition_preview p
  join auth.users u on u.id = p.user_id
  left join public.profiles p_prof on p_prof.id = p.user_id
 order by p.granted_at;

-- 3a-ii. And every account that exists, so a missing seed is one glance away from an explanation.
select u.email,
       exists (select 1 from public.nutrition_preview n where n.user_id = u.id) as has_nutrition,
       exists (select 1 from public.app_admins a where a.user_id = u.id)       as is_operator
  from auth.users u
 order by has_nutrition desc, u.email;

-- 3b. Every nutrition policy and whether it consults the gate. EVERY row must say `true`.
select tablename,
       policyname,
       cmd,
       (coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%has_nutrition_access%' as gated
  from pg_policies
 where schemaname = 'public'
   and tablename in ('food_catalog','user_foods','food_log_entries','food_favorites',
                     'saved_meals','saved_meal_items','nutrition_targets')
 order by tablename, policyname;

-- 3c. The counts, in one row.
select (select count(*) from public.nutrition_preview) as allowlist_rows,
       (select count(*) from pg_policies
         where schemaname = 'public'
           and tablename in ('food_catalog','user_foods','food_log_entries','food_favorites',
                             'saved_meals','saved_meal_items','nutrition_targets')
           and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%has_nutrition_access%')
         as policies_gated,
       (select count(*) from pg_policies
         where schemaname = 'public'
           and tablename in ('food_catalog','user_foods','food_log_entries','food_favorites',
                             'saved_meals','saved_meal_items','nutrition_targets'))
         as policies_total,
       (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'nutrition_preview')
         as preview_table_policy_count,
       (public.my_entitlement() -> 'nutrition') is not null as my_entitlement_has_nutrition,
       public.has_nutrition_access() as you_have_access;

-- 3d. What the gate is now HIDING rather than deleting. If athletes_who_logged > 2, other people had
-- already started using Nutrition while it was open — their rows survive and come back if granted.
select (select count(*) from public.food_log_entries)                    as food_log_rows,
       (select count(distinct athlete_id) from public.food_log_entries)  as athletes_who_logged,
       (select count(*) from public.nutrition_targets)                   as target_rows,
       (select count(*) from public.food_catalog)                        as catalogue_rows;
