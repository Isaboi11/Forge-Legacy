-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY 0170 — one row, every answer. Read-only, safe to run any time.
--
-- ⚠ WHY ONE ROW RATHER THAN FIVE SELECTS: the Supabase SQL editor shows only the LAST statement's
--    result set, so a bundle ending in several selects silently hides all but one of them. That is how
--    `pending-0170.sql`'s two security checks went unread — they ran, and nobody could see them.
--
-- ⛔ NO `my_*` FUNCTION IS CALLED HERE. The editor runs as `postgres` with no auth context, so every one
--    of them raises 28000 — and inside a bundle that rolls back everything before it. This file is
--    catalogue reads only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

select
  -- ── did the migration land ──────────────────────────────────────────────────────────────────
  (to_regclass('public.referral_attribution') is not null)                     as table_exists,
  (to_regprocedure('public.record_referral_attribution(text, text)') is not null) as capture_fn_exists,
  (to_regprocedure('public.my_referral_attribution()') is not null)            as read_fn_exists,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'referral_attribution')::int   as policies_expect_1,
  (select relrowsecurity from pg_class where relname = 'referral_attribution') as rls_on,

  -- ── ⛔ THE SECURITY FIX. Both MUST be 0. ────────────────────────────────────────────────────
  --
  -- `client_reachable_fns` counts how many of the five internal functions a signed-in athlete can still
  -- call. Anything above 0 means the revoke did not hold and `claim_founder_seat` is still handing out
  -- free lifetime Founder entitlements.
  (select count(*)
     from information_schema.role_routine_grants
    where routine_schema = 'public'
      and routine_name in ('claim_founder_seat', 'grant_referral_credit',
                           'athlete_tier', 'athlete_caps', 'athlete_live_counts')
      and grantee in ('authenticated', 'anon', 'PUBLIC'))::int                as client_reachable_fns,

  -- Any Founder seat at all was written by a client through that hole — the purchase webhook that is
  -- supposed to call `claim_founder_seat` does not exist yet (Launch Checklist §4.2). Each one is a free
  -- lifetime Premium entitlement that SURVIVES Phase F and must be revoked by hand before the flip.
  (select count(*) from public.athlete_entitlement
    where founder_seat is not null or premium_kind = 'FOUNDER')::int          as founder_seats_claimed,

  -- ── context, expected 0/0 until the client deploys ──────────────────────────────────────────
  (select count(*) from public.referral_attribution)::int                     as attributions,
  (select count(*) from public.referral_codes)::int                           as codes_issued;

-- ⚠ IF `founder_seats_claimed` IS NOT 0, run this to see who holds them before deciding anything:
--
--   select athlete_id, tier, premium_kind, founder_seat, updated_at
--     from public.athlete_entitlement
--    where founder_seat is not null or premium_kind = 'FOUNDER'
--    order by founder_seat;
