-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0237: open Nutrition to Premium accounts (supersedes the held 0216 — do NOT paste 0216)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- §1 — THE CHANGE (verbatim from supabase/migrations/0237_nutrition_for_premium.sql)

create or replace function public.has_nutrition_access()
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

comment on function public.has_nutrition_access() is
  '0237 (was 0206 allowlist). True when the CALLER is on the nutrition_preview allowlist OR athlete_tier() is PREMIUM (paid, comped, Premium AI, Founder, or default_tier while it is PREMIUM). Zero-argument on purpose (see 0129). Consulted by every nutrition RLS policy, my_entitlement() and the food-search Edge Function.';

revoke all on function public.has_nutrition_access() from public;
grant execute on function public.has_nutrition_access() to authenticated;


-- §2 — ASSERT IT LANDED (checked by SOURCE: calling it here as `postgres` has no auth.uid())

do $$
declare src text;
begin
  select p.prosrc into src from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'has_nutrition_access' and p.pronargs = 0;
  if src is null then raise exception '0237: has_nutrition_access() is missing'; end if;
  if position('athlete_tier' in src) = 0 or position('nutrition_preview' in src) = 0 then
    raise exception '0237 DID NOT APPLY: has_nutrition_access() is not 0237''s body';
  end if;
  if has_function_privilege('anon', 'public.has_nutrition_access()', 'execute') then
    raise exception '0237 WRONG: anon can execute has_nutrition_access()';
  end if;
  raise notice '0237 OK — Nutrition is open to Premium accounts and the allowlist.';
end $$;


-- §3 — WHO NOW HAS NUTRITION. Read-only, one row.
-- Predicted while default_tier is PREMIUM: premium_accounts = total_accounts, nutrition_accounts = total_accounts.

select
  (select c.default_tier from public.entitlement_config c where c.id)                          as default_tier,
  (select count(*) from public.profiles)                                                         as total_accounts,
  (select count(*) from public.profiles p where public.athlete_tier(p.id) = 'PREMIUM')           as premium_accounts,
  (select count(*) from public.profiles p
    where public.athlete_tier(p.id) = 'PREMIUM'
       or exists (select 1 from public.nutrition_preview n where n.user_id = p.id))              as nutrition_accounts,
  position('athlete_tier' in (select p.prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                               where n.nspname = 'public' and p.proname = 'has_nutrition_access'
                                 and p.pronargs = 0)) > 0                                         as gate_is_0237;
