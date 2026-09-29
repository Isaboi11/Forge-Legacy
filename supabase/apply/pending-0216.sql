-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ⛔ SUPERSEDED 2026-09-28 by 0237 (Nutrition for PREMIUM accounts, PO). Do NOT paste this file.
-- PENDING — 0216: open Nutrition to every signed-in athlete
--
-- ⛔ HELD UNTIL APP STORE APPROVAL (PO 2026-09-25: "wait"). Do NOT paste before ship day — see
--    Docs/App-Store-Submission-Checklist.md §6.
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice.
--
-- PO 2026-09-25: "open it up." One function body changes; every Nutrition door (tab, data, food search)
-- reads it, so this is the whole change — no app update, no Edge Function redeploy.
-- To close it again: restore 0206's body (see the migration header).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- §1 — THE CHANGE

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


-- §2 — ASSERT IT LANDED (checked by SOURCE: calling it here as `postgres` has no auth.uid())

do $$
declare src text;
begin
  select p.prosrc into src from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'has_nutrition_access' and p.pronargs = 0;
  if src is null then raise exception '0216: has_nutrition_access() is missing'; end if;
  if src !~ 'auth\.uid\(\)\s+is\s+not\s+null' or src ~ 'nutrition_preview' then
    raise exception '0216: has_nutrition_access() body is not the open version: %', src;
  end if;
  if not (select prosecdef from pg_proc where oid = 'public.has_nutrition_access()'::regprocedure) then
    raise exception '0216: has_nutrition_access() lost SECURITY DEFINER';
  end if;
  if not has_function_privilege('authenticated', 'public.has_nutrition_access()', 'execute') then
    raise exception '0216: authenticated cannot execute has_nutrition_access()';
  end if;
end $$;


-- §3 — REPORT (read-only). Expected: status '0216 applied', gate 'open to every signed-in athlete'.

select '0216 applied' as status,
       case when prosrc ~ 'auth\.uid\(\)\s+is\s+not\s+null' then 'open to every signed-in athlete' else 'STILL ALLOWLIST' end as gate
from pg_proc where oid = 'public.has_nutrition_access()'::regprocedure;
