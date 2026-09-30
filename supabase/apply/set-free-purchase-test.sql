-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- OPS · PUT `purchase@test.com` ON FREE — for the two paywall review screenshots (2026-09-28)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- The paywall shows the Premium / Premium AI tabs only to a FREE account (`subscription.tsx`, `tiers`
-- filter). Every real account is Premium, so the screenshots need this sandbox test account on Free.
--
-- It went Premium through a SANDBOX purchase on 09-27. Sandbox subscriptions renew a few times and then
-- lapse by themselves, and `athlete_tier()` reads a past `premium_until` as FREE — so it may ALREADY be
-- Free. §1 tells you; run §2 only if §1 says PREMIUM.
--
-- The Supabase SQL editor shows only the LAST result, so run §1 on its own, then §2 on its own.
-- No switch-back is needed: this is a test account, and Free is where it should sit.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════


-- ═══ §1 · WHAT IS IT NOW? — read-only. Run this first, on its own. ═══════════════════════════════════
select u.email,
       public.athlete_tier(u.id)                         as tier_now,
       e.tier, e.premium_kind, e.premium_until,
       e.coach_ai, e.coach_ai_until, e.founder_seat, e.comped_tester,
       (select count(*) from public.store_subscriptions s
         where s.athlete_id = u.id and s.expires_at > now()) as live_store_rows
  from auth.users u
  left join public.athlete_entitlement e on e.athlete_id = u.id
 where lower(u.email) = 'purchase@test.com';
-- Expect one row. tier_now = FREE → done, skip §2. tier_now = PREMIUM → run §2.
-- ⚠ live_store_rows > 0 means a sandbox subscription is still renewing: a renewal webhook will make it
--   Premium again. Cancel it on the phone (Settings → App Store → Sandbox Account) first.
-- ⚠ founder_seat not null means the sandbox purchase took an Early Bird seat. Tell Claude — that seat
--   should go back before launch so it does not count against the 100.


-- ═══ §2 · SET IT TO FREE — run only if §1 said PREMIUM. ════════════════════════════════════════════
do $$
declare
  v_id uuid;
  v_n  int;
begin
  select count(*) into v_n from auth.users where lower(email) = 'purchase@test.com';
  if v_n <> 1 then
    raise exception 'expected exactly one purchase@test.com, found %', v_n;
  end if;
  select id into v_id from auth.users where lower(email) = 'purchase@test.com';

  insert into public.athlete_entitlement (athlete_id, tier, grant_note)
  values (v_id, 'FREE', 'Sandbox test account set to Free for paywall screenshots (2026-09-28)')
  on conflict (athlete_id) do update
    set tier = 'FREE', premium_kind = null, premium_until = null,
        coach_ai = false, coach_ai_until = null,
        grant_note = excluded.grant_note, updated_at = now();

  if public.athlete_tier(v_id) <> 'FREE' then
    raise exception 'still not FREE after the update: %', public.athlete_tier(v_id);
  end if;
  raise notice 'purchase@test.com is FREE';
end $$;
