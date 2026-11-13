-- Forge Legacy — mark the 8 later-granted testers as comped (pricing sweep P8, PO "yes" 2026-11-11).
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice.
--
-- ══ WHY ══
--
-- `set-comped-testers-0214.sql` (09-24) marked the 11 original testers + `alex.review`. The six granted
-- free Premium in Phase F step 1b (09-21) and the two in step 1c were never marked, so
-- `my_paywall_offer()` (0214) gives them NOTHING to buy: their "Add Holt AI" section read "Plans aren't
-- available on this device yet", and they could not get AI at any price. Marked comped, they are offered
-- the Tester AI add-on ($7.99/mo · $69.99/yr, `coach_ai` only — MA7-D7) like the other testers.
--
-- Changes ONLY `comped_tester`. Their free Premium (premium_kind = 'GRANT') is untouched.
--
-- ⚠ MATCHED BY HANDLE, so a misspelled or deleted handle would mark nobody silently — this refuses to
-- write anything unless all 8 match a live GRANT row, and names the ones that don't.

begin;

do $$
declare
  v_handles text[] := array['jordang','natedawg','benjamin','wiggy027','kade','pastel','evaruiz','ladiesman217'];
  v_missing text;
  v_n int;
begin
  select string_agg(h, ', ' order by h) into v_missing
    from unnest(v_handles) as h
   where not exists (select 1
                       from public.profiles p
                       join public.athlete_entitlement e on e.athlete_id = p.id
                      where p.handle = h
                        and e.premium_kind = 'GRANT');
  if v_missing is not null then
    raise exception 'ABORTED: no live GRANT row for: %. Nothing was written. Check the roster before re-running.', v_missing;
  end if;

  update public.athlete_entitlement e
     set comped_tester = true, updated_at = now()
    from public.profiles p
   where p.id = e.athlete_id
     and p.handle = any (v_handles)
     and e.premium_kind = 'GRANT'
     and not e.comped_tester;
  get diagnostics v_n = row_count;
  raise notice 'comped_tester set on % account(s) (0 = already done).', v_n;
end $$;

commit;

-- The one result: every comped account. Expect 20 rows (the 12 from 09-24 + these 8).
select p.handle, e.tier, e.premium_kind, e.comped_tester, e.coach_ai
  from public.athlete_entitlement e
  join public.profiles p on p.id = e.athlete_id
 where e.comped_tester
 order by p.handle;
