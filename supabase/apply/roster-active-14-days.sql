-- Forge Legacy — WHO USED THE APP IN THE LAST 14 DAYS AND DOES NOT YET HOLD FREE PREMIUM
--
-- Read-only. Nothing is written. Paste the whole file, run it, read every row.
--
-- PO 2026-09-21: "anyone that has logged in the past two weeks that isn't getting premium for free,
-- they should get premium for free." This is the list; the grant is a separate file, written from the
-- handles you confirm here (same process as 2026-08-23 — a typo must grant nobody, loudly).
--
-- "USED THE APP" = any ONE of these in the last 14 days:
--   last_active    — the app was opened (athlete_activity, 0132). The best signal.
--   last_sign_in   — a sign-in. Weak on its own: the app keeps people signed in for weeks.
--   last_workout   — a saved workout.
--
-- Already holding a GRANT (the 14 from 2026-08-23) are left OUT — they already have it forever.
-- One statement, one result set, on purpose: the SQL editor shows only the LAST statement's result.

with active as (
  select
    p.id,
    p.handle,
    p.name,
    p.created_at::date                          as signed_up,
    a.last_active_at                            as last_active,
    u.last_sign_in_at                           as last_sign_in,
    (select max(w.saved_at) from public.workouts w where w.athlete_id = p.id) as last_workout,
    (select count(*) from public.workouts w where w.athlete_id = p.id and w.saved_at is not null) as workouts_logged,
    p.onboarded_at is not null                  as finished_onboarding
  from public.profiles p
  left join public.athlete_activity a on a.user_id = p.id
  left join auth.users u              on u.id = p.id
)
select
  act.handle,
  act.name,
  act.signed_up,
  act.last_active::date   as last_opened_app,
  act.last_sign_in::date  as last_signed_in,
  act.last_workout::date  as last_workout,
  act.workouts_logged,
  case when act.finished_onboarding then 'yes' else 'NO — never finished onboarding' end as onboarded,
  coalesce(e.tier || ' / ' || coalesce(e.premium_kind, '?'), '- none -') as current_row
from active act
left join public.athlete_entitlement e on e.athlete_id = act.id
where greatest(
        coalesce(act.last_active,  '-infinity'),
        coalesce(act.last_sign_in, '-infinity'),
        coalesce(act.last_workout, '-infinity')
      ) >= now() - interval '14 days'
  -- coalesce, so "no row at all" and a null premium_kind both count as NOT granted (never silently dropped)
  and not coalesce(e.tier = 'PREMIUM' and e.premium_kind = 'GRANT', false)
order by greatest(
        coalesce(act.last_active,  '-infinity'),
        coalesce(act.last_sign_in, '-infinity'),
        coalesce(act.last_workout, '-infinity')
      ) desc;
