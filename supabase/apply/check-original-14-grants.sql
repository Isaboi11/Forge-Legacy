-- Forge Legacy — which of the 14 grants from 2026-08-23 is no longer a GRANT?
--
-- Read-only. After step 1b the total read 19, not 20 (14 + 6). The 6 were asserted, so one of the
-- original 14 has changed. One row per original handle; the odd one out is the row that is not
-- "PREMIUM / GRANT".
--
--   no profile      → the account was deleted (entitlement cascades with it), or the handle changed
--   - none -        → the profile exists but its entitlement row is gone
--   anything else   → the row was changed (e.g. by the Premium AI switch or a test)

select
  h.handle,
  coalesce(p.name, 'no profile with this handle')                          as name,
  coalesce(e.tier || ' / ' || coalesce(e.premium_kind, '?'), '- none -')   as current_row,
  e.premium_until,
  e.grant_note,
  e.updated_at
from unnest(array['jaceypie','racinealta','isaboi11','lilred','kimjovi','kingmo',
                  'brady','selene','wildwes','poop','bailee','locolando',
                  'alex.review','sam.torres']) as h(handle)
left join public.profiles p            on p.handle = h.handle
left join public.athlete_entitlement e on e.athlete_id = p.id
order by (e.tier = 'PREMIUM' and e.premium_kind = 'GRANT') nulls first, h.handle;
