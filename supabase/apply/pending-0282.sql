-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0282: the app can no longer write its own AI cost rows (coach_ai_record_usage revoked)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: revoking twice is a no-op, §2 only checks, §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══ (AI re-audit 2026-11-20)
--
-- `coach_ai_record_usage` is the OLD metering path. Since 0268 every metered Edge Function reserves and settles
-- instead, and 0268 said "a later migration revokes it" — this is that one. Checked 2026-11-20: no function in the
-- repo calls it, and the live ledger has 0 rows written without a reservation since 2026-11-17 12:00 UTC.
-- While it stayed granted to `authenticated`, any Premium AI account could write its own cost rows. No credits
-- could be gained that way, but /admin-ai's cost, the failure alert and the invoice check all read those rows.
--
-- ⚠ The orphan `recipe-phot-read` (misspelt duplicate, on the PO's delete list) still calls it; after this its
-- record call fails. It has had 0 calls. Delete it from the dashboard.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  revokes EXECUTE from public, anon and authenticated (service_role keeps it; the function is unchanged)
-- §2  RAISES if anon or authenticated can still run it
-- §3  reports who can run it now. Read-only.
--
-- ══ WHAT §3 SHOULD SAY ══
--
-- One row: anon_can = false, authenticated_can = false, service_role_can = true.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- §1 — the statements (verbatim from supabase/migrations/0282_revoke_coach_ai_record_usage.sql)

revoke execute on function public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean) from public;
revoke execute on function public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean) from anon;
revoke execute on function public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean) from authenticated;

-- §2 — the assertion

do $$
declare
  f regprocedure := 'public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean)'::regprocedure;
begin
  if has_function_privilege('anon', f, 'execute') then
    raise exception '0282: anon can still run coach_ai_record_usage';
  end if;
  if has_function_privilege('authenticated', f, 'execute') then
    raise exception '0282: authenticated can still run coach_ai_record_usage';
  end if;
end $$;

-- §3 — the report (read-only)

select
  'coach_ai_record_usage' as function_name,
  has_function_privilege('anon', 'public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean)'::regprocedure, 'execute') as anon_can,
  has_function_privilege('authenticated', 'public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean)'::regprocedure, 'execute') as authenticated_can,
  has_function_privilege('service_role', 'public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean)'::regprocedure, 'execute') as service_role_can;
