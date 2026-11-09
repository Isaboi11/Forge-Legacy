-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- PHASE F, STEP 2 — COUNT THE PROGRAMS PEOPLE ALREADY HAVE (release day, 2026-11-09)
--
-- Run BEFORE flipping default_tier to FREE. Safe to run twice: `greatest` never lowers a count.
--
-- WHY: the Free plan allows 3 programs + 3 training weeks, LIFETIME. The counters only started counting
-- when 0145 (programs) and 0158 (training weeks) went in, so anything made before then reads 0 — and a
-- Free athlete would be handed 3 more. This sets each counter to at least what the tables actually hold.
--
-- Counted the way the triggers count them today (0158):
--   programs_created        = programs of 4+ weeks (program_earns_credit), not started from a saved week
--   short_programs_created  = programs under 4 weeks, not started from a saved week  +  saved weeks
-- A program started from a saved week is skipped: the week was already counted (MA4-D4).
--
-- Under-counts on purpose: deleted programs left no row and can't be recovered (0145 footer).
-- Not backfilled: holt_programs_used (nothing marks which old programs Holt built) and the free import.
-- ══════════════════════════════════════════════════════════════════════════════════════════════

with prog as (
  select athlete_id,
         count(*) filter (where source_week_template_id is null and     public.program_earns_credit(structure)) as long_n,
         count(*) filter (where source_week_template_id is null and not public.program_earns_credit(structure)) as short_n
    from public.programs
   group by athlete_id
), weeks as (
  select athlete_id, count(*) as n
    from public.week_templates
   group by athlete_id
), totals as (
  select coalesce(p.athlete_id, w.athlete_id)            as athlete_id,
         coalesce(p.long_n, 0)                            as long_n,
         coalesce(p.short_n, 0) + coalesce(w.n, 0)        as short_n
    from prog p
    full join weeks w on w.athlete_id = p.athlete_id
)
insert into public.athlete_usage (athlete_id, programs_created, short_programs_created)
select athlete_id, long_n, short_n
  from totals
on conflict (athlete_id) do update
   set programs_created       = greatest(public.athlete_usage.programs_created,       excluded.programs_created),
       short_programs_created = greatest(public.athlete_usage.short_programs_created, excluded.short_programs_created),
       updated_at = now();

-- ── Report: the 10 real people who land on Free (PO list, 11-09). Free allows 3 of each. ──
select p.handle,
       p.name,
       coalesce(u.programs_created, 0)        as programs_used_of_3,
       coalesce(u.short_programs_created, 0)  as training_weeks_used_of_3,
       (select default_tier from public.entitlement_config where id) as default_tier_still
  from public.profiles p
  left join public.athlete_usage u on u.athlete_id = p.id
 where p.handle in ('shortstack','carnivalgames','zachattack','drewboyer8','diz','boo34',
                    'fulbruh','jtruong','chasinggains')
    or (p.handle is null and p.name = 'Connor Boss')
 order by programs_used_of_3 desc, p.name;
