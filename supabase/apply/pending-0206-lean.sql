-- 0206 - Nutrition preview allowlist. Paste ALL of this and run once. Safe to re-run.
-- Comment-lean copy of supabase/apply/pending-0206.sql (that file is the record).

begin;

create table if not exists public.nutrition_preview (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  note       text,
  granted_at timestamptz not null default now()
);

alter table public.nutrition_preview enable row level security;

comment on table public.nutrition_preview is
  'The Nutrition preview allowlist (0206). Nutrition Phase 1 is unfinished and the PO asked that only his own account and the claudetest account reach it. RLS is ENABLED WITH ZERO POLICIES on purpose, so the roster is not enumerable. Read only by public.has_nutrition_access(); written only by hand in the SQL editor — there is no self-serve grant, which is the whole point. Remove the gate (not this table) when Nutrition ships publicly.';

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

drop policy if exists food_catalog_read on public.food_catalog;
create policy food_catalog_read on public.food_catalog for select to authenticated
  using (public.has_nutrition_access());

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

drop policy if exists food_favorites_owner_select on public.food_favorites;
drop policy if exists food_favorites_owner_insert on public.food_favorites;
drop policy if exists food_favorites_owner_delete on public.food_favorites;
create policy food_favorites_owner_select on public.food_favorites for select
  using (athlete_id = auth.uid() and public.has_nutrition_access());
create policy food_favorites_owner_insert on public.food_favorites for insert
  with check (athlete_id = auth.uid() and public.has_nutrition_access());
create policy food_favorites_owner_delete on public.food_favorites for delete
  using (athlete_id = auth.uid() and public.has_nutrition_access());

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

insert into public.nutrition_preview (user_id, note)
select a.user_id, 'operator (app_admins) — Nutrition preview (0206)'
  from public.app_admins a
    on conflict (user_id) do nothing;

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
    'coachAi',     coalesce(v_ent.coach_ai, false)
                     and (v_ent.coach_ai_until is null or v_ent.coach_ai_until > now()),
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
      'holtDays',  case when v_usage.holt_days_period = v_period
                        then coalesce(v_usage.holt_days_used, 0) else 0 end
    )
  );
end;
$$;

commit;

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

  if exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'nutrition_preview') then
    raise exception '0206 FAILED: nutrition_preview has RLS policies — it must have ZERO (see the header)';
  end if;

  if not exists (
    select 1 from pg_proc
     where proname = 'my_entitlement'
       and pronamespace = 'public'::regnamespace
       and pg_get_functiondef(oid) like '%has_nutrition_access%'
  ) then
    raise exception '0206 FAILED: my_entitlement() does not return the nutrition key';
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

select u.email,
       p_prof.handle,
       p.note,
       p.granted_at
  from public.nutrition_preview p
  join auth.users u on u.id = p.user_id
  left join public.profiles p_prof on p_prof.id = p.user_id
 order by p.granted_at;

select u.email,
       exists (select 1 from public.nutrition_preview n where n.user_id = u.id) as has_nutrition,
       exists (select 1 from public.app_admins a where a.user_id = u.id)       as is_operator
  from auth.users u
 order by has_nutrition desc, u.email;

select tablename,
       policyname,
       cmd,
       (coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%has_nutrition_access%' as gated
  from pg_policies
 where schemaname = 'public'
   and tablename in ('food_catalog','user_foods','food_log_entries','food_favorites',
                     'saved_meals','saved_meal_items','nutrition_targets')
 order by tablename, policyname;

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
       (select pg_get_functiondef(oid) like '%has_nutrition_access%' from pg_proc
         where proname = 'my_entitlement' and pronamespace = 'public'::regnamespace)
         as my_entitlement_gated,
       public.has_nutrition_access() as you_have_access;

select (select count(*) from public.food_log_entries)                    as food_log_rows,
       (select count(distinct athlete_id) from public.food_log_entries)  as athletes_who_logged,
       (select count(*) from public.nutrition_targets)                   as target_rows,
       (select count(*) from public.food_catalog)                        as catalogue_rows;
