-- Forge Legacy — mark the comped testers (MA7-D6 / MA7-D7). RUN AFTER pending-0214.sql.
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice.
--
-- `comped_tester = true` means two things and only two:
--   · MA7-D6 — free Premium forever (they already hold the GRANT row from phase-f-1-grant-premium.sql)
--   · MA7-D7 — the ONLY accounts `my_paywall_offer()` will show the Tester AI add-on to
--
-- These are the 12 testers from `phase-f-1-grant-premium.sql`, by the same handles. ⚠ The two Apple
-- review accounts (alex.review, sam.torres) are deliberately NOT here — they are not testers. Whether
-- one of them should see the Tester AI add-on so App Review can find that product is a separate PO
-- decision; if yes, add its handle below and change the 12 in the assertion to 13.
--
-- ⚠ MATCHED BY HANDLE. A misspelled handle marks nobody, silently — so the file asserts exactly 12 and
-- rolls back otherwise.

begin;

update public.athlete_entitlement e
   set comped_tester = true, updated_at = now()
  from public.profiles p
 where p.id = e.athlete_id
   and p.handle in ('jaceypie','racinealta','isaboi11','lilred','kimjovi','kingmo',
                    'brady','selene','wildwes','poop','bailee','locolando')
   and e.premium_kind = 'GRANT';

do $$
declare
  v int;
begin
  select count(*) into v from public.athlete_entitlement where comped_tester;
  if v <> 12 then
    raise exception 'ABORTED: expected 12 comped testers, got %. A handle did not match, or a row is no longer a GRANT (check-original-14-grants.sql shows which). Nothing was written.', v;
  end if;
end $$;

commit;

select p.handle, e.tier, e.premium_kind, e.comped_tester, e.coach_ai
  from public.athlete_entitlement e
  join public.profiles p on p.id = e.athlete_id
 where e.comped_tester
 order by p.handle;
