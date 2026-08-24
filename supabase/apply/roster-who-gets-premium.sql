-- Forge Legacy — THE LAUNCH ROSTER: who is on the app, and who already holds an exception.
--
-- Read-only. Nothing is written. Paste the whole file, run it, read every row.
--
-- WHY THIS EXISTS: six documents say "grant the 20 OG testers their seat-free PREMIUM row"
-- and not one of them names anybody. This is the list that decision was always about.
--
-- HOW TO READ IT:
--   existing_row = '- none -'  → they hold NOTHING. When default_tier flips to FREE, they land on Free.
--   existing_row = 'PREMIUM'   → already decided. GRANT = a gift, FOUNDER = they paid for a seat.
--   account_state = NEVER FINISHED ONBOARDING → a dead account. Needs no decision.
--
-- One statement, one result set, on purpose: the SQL editor shows only the LAST statement's result.

select
  p.handle,
  p.name,
  p.created_at::date                                as signed_up,
  case when p.onboarded_at is null
       then 'NEVER FINISHED ONBOARDING'
       else 'active'
  end                                               as account_state,
  count(w.id) filter (where w.saved_at is not null) as workouts_logged,
  max(w.saved_at)::date                             as last_workout,
  coalesce(e.tier, '- none -')                      as existing_row,
  e.premium_kind,
  e.grant_note
from public.profiles p
left join public.workouts w            on w.athlete_id = p.id
left join public.athlete_entitlement e on e.athlete_id = p.id
group by p.id, p.handle, p.name, p.created_at, p.onboarded_at,
         e.tier, e.premium_kind, e.grant_note
order by p.created_at;
