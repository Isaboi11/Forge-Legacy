-- Forge Legacy — 0216: Nutrition opens to every signed-in athlete (ends the 0206 preview allowlist)
--
-- ══ WHY ══
--
-- ⛔ HELD: PO 2026-09-25 — Nutrition opens to everyone on App Store approval, not before ("wait").
--
-- PO 2026-09-25, answering "open it up, or mark it coming soon on the site": *"open it up."* The new
-- forgelegacy.app sells Nutrition to everyone who asks for a TestFlight invite, and 0206 still limited it
-- to the PO + claudetest.
--
-- ══ WHAT THIS DOES ══
--
-- Rewrites ONE function body. `has_nutrition_access()` is the single gate every part of Nutrition asks:
-- all 17 RLS policies, the `nutrition` key of my_entitlement() (which shows or hides the tab), and the
-- food-search Edge Function's 403. Returning true for any signed-in caller opens all of it at once, with
-- no client deploy and no Edge Function redeploy.
--
-- ⚠ The body is copied from 0206 and changed in ONE place (the select). Signature, SECURITY DEFINER,
-- STABLE, search_path and grants are identical — `create or replace` rewrites the whole body, so nothing
-- else may drift. Anonymous callers still get false.
--
-- ⚠ `nutrition_preview` is KEPT, untouched. To close Nutrition again, restore 0206's body:
--     select exists (select 1 from public.nutrition_preview p where p.user_id = auth.uid());

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
  '0216 (was 0206 allowlist). True for any signed-in caller: Nutrition is open to every athlete. Zero-argument on purpose (see 0129). Consulted by every nutrition RLS policy, by my_entitlement() and by the food-search Edge Function. nutrition_preview is kept but no longer read.';

revoke all on function public.has_nutrition_access() from public;
grant execute on function public.has_nutrition_access() to authenticated;
