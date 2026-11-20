-- 0282 — coach_ai_record_usage is no longer callable by the app (AI re-audit 2026-11-20, P-D7's follow-up).
--
-- 0268 hardened the old metering path and kept it callable "for the deployed functions that still call it; a later
-- migration revokes it." This is that migration. Since 0268 every metered function reserves and settles
-- (coach_ai_reserve / coach_ai_settle). Checked 2026-11-20:
--   · no file under supabase/functions/ calls coach_ai_record_usage (only tests name it, to say nothing does);
--   · the live ledger has 0 coach_ai_spend rows without a reservation since 2026-11-17 12:00 UTC.
-- While it stayed granted to `authenticated`, any Premium AI account could write its own cost rows (any action it
-- holds, up to 5M tokens a field) — no credits gained, but /admin-ai's cost, the failure alert and the invoice
-- check all read those rows.
--
-- ⚠ The orphan `recipe-phot-read` (a misspelt duplicate, on the PO's delete list) still calls it. After this its
-- record call fails; it has had 0 calls and is to be deleted from the dashboard.
--
-- Revoked from public, anon AND authenticated (Supabase grants new functions to anon and authenticated directly).
-- service_role keeps it. The function itself is unchanged. Idempotent: revoking twice is a no-op.

revoke execute on function public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean) from public;
revoke execute on function public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean) from anon;
revoke execute on function public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean) from authenticated;
