-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- PHASE F, STEP 3 — NEW AND UNGRANTED ACCOUNTS ARE FREE (release day, 2026-11-09)
--
-- Run AFTER phase-f-1c (Eva + Noah granted) and phase-f-2 (program counts backfilled) — both done 11-09.
-- Anyone with a PREMIUM row keeps Premium; everyone else resolves to FREE from this moment.
--
-- UNDO (instant, if anything looks wrong):
--   update public.entitlement_config set default_tier = 'PREMIUM', updated_at = now() where id;
-- ══════════════════════════════════════════════════════════════════════════════════════════════

update public.entitlement_config
   set default_tier = 'FREE', updated_at = now()
 where id;

-- Expected: default_tier FREE · premium_rows 25 (19 people + alex.review, jordan_reyes, claude, sandbox,
-- qa1109four, qa1109comped) · founder_seats_used 0
select
  (select default_tier from public.entitlement_config where id)                    as default_tier,
  (select count(*) from public.athlete_entitlement where tier = 'PREMIUM')          as premium_rows,
  (select count(*) from public.athlete_entitlement where founder_seat is not null)  as founder_seats_used;
