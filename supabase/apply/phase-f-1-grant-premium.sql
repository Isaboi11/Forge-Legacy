-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- PHASE F, STEP 1 of 3 — GRANT FREE PREMIUM
--
-- PO decisions taken 2026-08-23, one account at a time, against the live roster.
-- Full Y/N record: Scratch/premium-grant-decisions.md
--
-- 14 of 27 accounts get a seat-free PREMIUM grant. The other 13 get NO row, which means they land
-- on FREE the moment step 3 flips `default_tier`. That is the intended outcome for them.
--
-- ⚠ RUN ORDER (Docs/GO-LIVE.md "Phase F — the exact order"):
--     step 1  backfill athlete_usage.programs_created   ← phase-f-0-backfill.sql, NOT YET WRITTEN
--     step 2  THIS FILE
--     step 3  update entitlement_config set default_tier = 'FREE'
--   Running this file EARLY is safe — a grant is a no-op while the default is still PREMIUM.
--   Running it LATE is not: between the flip and this file, all 14 would sit on Free.
--
-- ⚠ MATCHED BY HANDLE, NOT UUID. A misspelled handle matches no profile and grants nobody, silently.
--   The assertion at the foot is what makes that fail loudly instead. Do not remove it.
--
-- Idempotent: re-running re-asserts PREMIUM and cannot lower anyone.
-- Occupies NO founder seat (MA3-D25) — `founder_seat` stays null, all 100 paid seats remain.
-- ══════════════════════════════════════════════════════════════════════════════════════════════

-- ── The 12 testers ────────────────────────────────────────────────────────────────────────────
insert into public.athlete_entitlement (athlete_id, tier, premium_kind, grant_note)
select id, 'PREMIUM', 'GRANT', 'OG tester - permanent, seat-free (MA3-D25). PO decision 2026-08-23.'
  from public.profiles
 where handle in ('jaceypie','racinealta','isaboi11','lilred','kimjovi','kingmo',
                  'brady','selene','wildwes','poop','bailee','locolando')
on conflict (athlete_id) do update
  set tier = 'PREMIUM', premium_kind = 'GRANT', premium_until = null, updated_at = now();

-- ── The 2 Apple review accounts ───────────────────────────────────────────────────────────────
-- Separate note ON PURPOSE. Docs/Operator-Metrics-What-To-Track.md: grant holders must be broken
-- out of every paid figure. These two are not customers and never will be — they exist so the
-- reviewer can evaluate what is being sold. Counting them as anything else corrupts day-one
-- conversion, which is already the metric most at risk of reading ~100%.
insert into public.athlete_entitlement (athlete_id, tier, premium_kind, grant_note)
select id, 'PREMIUM', 'GRANT', 'APPLE REVIEW DEMO ACCOUNT - not a customer, exclude from ALL metrics.'
  from public.profiles
 where handle in ('alex.review','sam.torres')
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
   where p.handle in ('jaceypie','racinealta','isaboi11','lilred','kimjovi','kingmo',
                      'brady','selene','wildwes','poop','bailee','locolando',
                      'alex.review','sam.torres')
     and e.tier = 'PREMIUM' and e.premium_kind = 'GRANT';

  if v_granted <> 14 then
    raise exception
      'ABORTED: expected 14 grants, got %. A handle did not match a profile - check spelling against the roster. Nothing was written.',
      v_granted;
  end if;

  select count(*) into v_seats
    from public.athlete_entitlement where founder_seat is not null;

  if v_seats <> 0 then
    raise exception 'ABORTED: a grant consumed % founder seat(s). MA3-D25 says grants occupy none.', v_seats;
  end if;
end $$;

select
  (select count(*) from public.athlete_entitlement
    where tier = 'PREMIUM' and premium_kind = 'GRANT')                        as granted_premium,
  (select count(*) from public.athlete_entitlement
    where grant_note like 'APPLE REVIEW%')                                    as of_which_apple_review,
  (select count(*) from public.profiles p
    where not exists (select 1 from public.athlete_entitlement e
                       where e.athlete_id = p.id))                            as will_land_on_free,
  (select count(*) from public.athlete_entitlement
    where founder_seat is not null)                                           as founder_seats_used,
  (select default_tier from public.entitlement_config where id)               as default_tier_still;
