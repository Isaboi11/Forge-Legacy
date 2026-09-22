-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- PHASE F, STEP 1b — FREE PREMIUM FOR 6 MORE TESTERS
--
-- PO decision 2026-09-21: "anyone that has logged in the past two weeks that isn't getting premium
-- for free, they should get premium for free." Chosen from `roster-active-14-days.sql` the same day.
--
--   Granted (6):  jordang · natedawg · benjamin · wiggy027 · kade · pastel
--   Not granted:  testing (test account) · athlete_5b0abf29 / athlete_8475ffa3 / athlete_2c6c8633
--                 (never finished onboarding) · claude (test account — already holds a PREMIUM row
--                 with no premium_kind, which is permanent; remove it before launch, separately)
--
-- Same shape as phase-f-1-grant-premium.sql: permanent (no premium_until), seat-free (MA3-D25),
-- idempotent, safe to run early (a no-op while default_tier is still PREMIUM).
--
-- ⚠ MATCHED BY HANDLE. A misspelled handle grants nobody, silently — the assertion below turns that
--   into an error and nothing is written. Do not remove it.
-- ══════════════════════════════════════════════════════════════════════════════════════════════

insert into public.athlete_entitlement (athlete_id, tier, premium_kind, grant_note)
select id, 'PREMIUM', 'GRANT', 'Active tester - permanent, seat-free (MA3-D25). PO decision 2026-09-21.'
  from public.profiles
 where handle in ('jordang','natedawg','benjamin','wiggy027','kade','pastel')
on conflict (athlete_id) do update
  set tier = 'PREMIUM', premium_kind = 'GRANT', premium_until = null, updated_at = now();

-- ── Assert, then report. One row, because the editor shows only the LAST statement's result. ──
do $$
declare
  v_granted int;
  v_seats   int;
begin
  select count(*) into v_granted
    from public.profiles p
    join public.athlete_entitlement e on e.athlete_id = p.id
   where p.handle in ('jordang','natedawg','benjamin','wiggy027','kade','pastel')
     and e.tier = 'PREMIUM' and e.premium_kind = 'GRANT' and e.premium_until is null;

  if v_granted <> 6 then
    raise exception
      'ABORTED: expected 6 grants, got %. A handle did not match a profile - check spelling against the roster. Nothing was written.',
      v_granted;
  end if;

  select count(*) into v_seats
    from public.athlete_entitlement where founder_seat is not null;

  if v_seats <> 0 then
    raise exception 'ABORTED: a grant consumed % founder seat(s). MA3-D25 says grants occupy none.', v_seats;
  end if;
end $$;

-- Expected: granted_premium 20 (14 from 2026-08-23 + these 6) · founder_seats_used 0 · default_tier_still PREMIUM
select
  (select count(*) from public.athlete_entitlement
    where tier = 'PREMIUM' and premium_kind = 'GRANT')                        as granted_premium,
  (select count(*) from public.athlete_entitlement
    where grant_note like 'Active tester%')                                   as of_which_today,
  (select count(*) from public.athlete_entitlement
    where founder_seat is not null)                                           as founder_seats_used,
  (select default_tier from public.entitlement_config where id)               as default_tier_still;
