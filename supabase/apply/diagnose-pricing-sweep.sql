-- Forge Legacy — pricing sweep 2026-11-11 (Docs/QA/Pricing-Sweep-2026-11-11.md): the live-DB facts the
-- sweep could not read.
--
-- READ-ONLY. Changes nothing. ONE statement, ONE result row — the SQL editor only shows the last result.
-- ⚠ Calls no my_* function (they raise 28000 as `postgres`); 0262 is checked by reading the function's
-- source instead.

select
  c.default_tier                                                    as default_tier,            -- expect FREE (Phase F step 3, 11-09)
  c.free_caps ->> 'holt_in_workout'                                 as free_holt_in_workout,    -- G3: anything > 0 = unlimited on Free
  c.paid_caps                                                       as paid_caps_row,           -- C2: 1000 photos / 100 videos vs "Unlimited"
  c.founder_seats_total                                             as early_bird_seats_total,
  public.founder_seats_remaining()                                  as early_bird_seats_left,
  ai.metering_only                                                  as ai_metering_only,        -- expect false (Phase F step 4)
  ai.credits_per_period                                             as ai_credits_per_month,
  ai.action_credits ->> 'meal_photo'                                as meal_photo_credits,      -- expect 1 (on purpose)
  position('shortPrograms' in pg_get_functiondef('public.my_entitlement()'::regprocedure)) > 0
                                                                    as p5_0262_applied,         -- H66
  (select string_agg(p.handle, ', ' order by p.handle)
     from public.athlete_entitlement e
     join public.profiles p on p.id = e.athlete_id
    where e.premium_kind = 'GRANT'
      and not e.comped_tester
      and not exists (select 1 from public.app_admins a where a.user_id = e.athlete_id))
                                                                    as p8_grants_who_cannot_buy_ai,
  (select string_agg(p.handle, ', ' order by p.handle)
     from public.athlete_entitlement e
     join public.profiles p on p.id = e.athlete_id
    where e.comped_tester)                                          as comped_testers,
  (select count(*)
     from public.athlete_entitlement e
    where coalesce(e.coach_ai, false)
      and (e.coach_ai_until is null or e.coach_ai_until > now())
      and public.athlete_tier(e.athlete_id) <> 'PREMIUM')           as g6_ai_without_premium,
  (select count(*) from (
     select s.athlete_id
       from public.store_subscriptions s
      where s.expires_at > now()
      group by s.athlete_id
     having count(*) > 1) x)                                        as p7_athletes_with_two_live_store_rows,
  (select count(*) from public.store_events
    where coalesce(payload ->> 'environment', 'PRODUCTION') = 'PRODUCTION')
                                                                    as production_store_events,
  (select string_agg(o.outcome || ' x' || o.n, ', ' order by o.n desc)
     from (select coalesce(outcome, '(null)') as outcome, count(*) as n
             from public.store_events group by 1) o)                as store_event_outcomes
from public.entitlement_config c
cross join public.coach_ai_config ai
where c.id and ai.id;
