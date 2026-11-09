-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- PHASE F, STEP 4 — TURN THE AI CREDIT LIMIT ON (release day, 2026-11-09)
--
-- Until now `metering_only = true`: AI spend was counted but never refused (0144's 60-day run).
-- From here a Premium AI account that has used its monthly credits (150 by default) is told so and
-- refused until the 1st of next month.
--
-- The report lists every account with Premium AI and what it has used THIS month, so anyone already
-- over the line (e.g. the PO's own testing) is visible straight away.
--
-- UNDO (instant):
--   update public.coach_ai_config set metering_only = true, updated_at = now() where id;
-- ══════════════════════════════════════════════════════════════════════════════════════════════

update public.coach_ai_config
   set metering_only = false, updated_at = now()
 where id;

select p.handle,
       p.name,
       coalesce(cp.spent, 0)                               as used_this_month,
       coalesce(cp.allowance, c.credits_per_period)        as allowance,
       c.metering_only                                     as metering_only_now
  from public.athlete_entitlement e
  join public.profiles p        on p.id = e.athlete_id
  cross join public.coach_ai_config c
  left join public.coach_ai_period cp
         on cp.athlete_id = e.athlete_id
        and cp.period = date_trunc('month', now())::date
 where e.coach_ai
 order by used_this_month desc, p.name;
