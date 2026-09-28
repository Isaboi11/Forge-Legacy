-- 0237 — Nutrition opens to Premium accounts (PO 2026-09-28: "let's open it … the nutrition on the premium accounts")
--
-- Supersedes the HELD 0216 ("open to every signed-in athlete"), which is never to be pasted now.
-- One function body changes. Every Nutrition door reads it — the 17+ RLS policies, my_entitlement()'s
-- `nutrition` key (which shows the tab) and the food-search Edge Function — so no app update and no
-- function redeploy is needed.
--
-- WHO GETS IN:
--   · anyone on the 0206 allowlist (the PO + claudetest — kept so their access never depends on a plan), OR
--   · anyone whose athlete_tier() is PREMIUM: a paid/comped Premium row, a Premium AI buyer (Premium AI
--     grants premium, MA6-D3), a Founder — or, while entitlement_config.default_tier is still PREMIUM
--     (testing), every account. When default_tier flips to FREE at launch, Free accounts lose the tab by
--     themselves; nothing else needs to change.
--
-- ⚠ PLACEMENT NOTE: MA6/MA8 put food logging + barcode on EVERY plan and only the meal planner + grocery list
-- in Premium. This gate is stricter — the whole tab is Premium — by PO decision for now. Revisit before launch.
--
-- To close it again: restore 0206's body (allowlist only).

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
