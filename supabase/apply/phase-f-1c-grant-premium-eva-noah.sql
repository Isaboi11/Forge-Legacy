-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- PHASE F, STEP 1c — FREE PREMIUM FOR 2 MORE TESTERS (release day, 2026-11-09)
--
-- PO decision 2026-11-09, from `roster-who-gets-premium.sql` run the same day:
--   Granted (2):  evaruiz (Eva Ruiz) · ladiesman217 (Noah)
--   Not granted:  shortstack (Brittany) — PO's choice; lands on Free when default_tier flips
--
-- Same shape as phase-f-1b: permanent (no premium_until), seat-free (MA3-D25), idempotent,
-- a no-op while default_tier is still PREMIUM.
--
-- ⚠ MATCHED BY HANDLE. A misspelled handle grants nobody, silently — the assertion below turns that
--   into an error and nothing is written. Do not remove it.
-- ══════════════════════════════════════════════════════════════════════════════════════════════

insert into public.athlete_entitlement (athlete_id, tier, premium_kind, grant_note)
select id, 'PREMIUM', 'GRANT', 'Active tester - permanent, seat-free (MA3-D25). PO decision 2026-11-09.'
  from public.profiles
 where handle in ('evaruiz','ladiesman217')
on conflict (athlete_id) do update
  set tier = 'PREMIUM', premium_kind = 'GRANT', premium_until = null,
      grant_note = excluded.grant_note, updated_at = now();

-- ── Assert, then report. One row, because the editor shows only the LAST statement's result. ──
do $$
declare
  v_granted int;
  v_seats   int;
begin
  select count(*) into v_granted
    from public.profiles p
    join public.athlete_entitlement e on e.athlete_id = p.id
   where p.handle in ('evaruiz','ladiesman217')
     and e.tier = 'PREMIUM' and e.premium_kind = 'GRANT' and e.premium_until is null;

  if v_granted <> 2 then
    raise exception
      'ABORTED: expected 2 grants, got %. A handle did not match a profile - check spelling against the roster. Nothing was written.',
      v_granted;
  end if;

  select count(*) into v_seats
    from public.athlete_entitlement where founder_seat is not null;

  if v_seats <> 0 then
    raise exception 'ABORTED: a grant consumed % founder seat(s). MA3-D25 says grants occupy none.', v_seats;
  end if;
end $$;

-- Expected: granted_premium 23 (21 before + these 2) · of_which_today 2 · founder_seats_used 0 · default_tier_still PREMIUM
select
  (select count(*) from public.athlete_entitlement
    where tier = 'PREMIUM' and premium_kind = 'GRANT')                        as granted_premium,
  (select count(*) from public.athlete_entitlement
    where grant_note like '%PO decision 2026-11-09%')                         as of_which_today,
  (select count(*) from public.athlete_entitlement
    where founder_seat is not null)                                           as founder_seats_used,
  (select default_tier from public.entitlement_config where id)               as default_tier_still;
