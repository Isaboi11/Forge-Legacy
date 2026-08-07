-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- WHY DID THIS ATHLETE GET THAT HONOR?
--
-- Run in the Supabase SQL editor. Set the handle on the next line and run the whole file.
-- Read-only — it inserts, updates and deletes nothing.
--
-- Written 2026-08-06 after a tester (@kingmo) received what looked like a consistency honor on his
-- FIRST workout. Reading the catalog ruled out the obvious candidates — `active_weeks` needs 10,
-- `best_week_sessions` needs 3, `perfect_weeks` needs every squad member at `weekly_standard` (3) —
-- so the answer has to come from his actual rows rather than from another guess.
--
-- ⚠ The whole point is QUERY 3: it puts what he was AWARDED next to what he has ACTUALLY DONE. Any row
-- where `earned_but_metric_says` reads SHORTFALL is an honor the evaluator should not have given.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

\set handle 'kingmo'

-- ── 1 · Who, and how much training is actually behind them ─────────────────────────────────────────
with athlete as (
  select id, handle, display_name, created_at
    from public.profiles
   where handle = lower(btrim(:'handle'))
)
select
  a.handle,
  a.display_name,
  a.created_at                                                          as account_created,
  (select count(*) from public.workouts w
    where w.athlete_id = a.id and w.state = 'saved')                    as saved_workouts,
  (select min(w.saved_at) from public.workouts w
    where w.athlete_id = a.id and w.state = 'saved')                    as first_workout,
  (select max(w.saved_at) from public.workouts w
    where w.athlete_id = a.id and w.state = 'saved')                    as last_workout,
  (select count(distinct w.saved_at::date) from public.workouts w
    where w.athlete_id = a.id and w.state = 'saved')                    as distinct_training_days,
  (select count(*) from public.squad_members m where m.user_id = a.id)  as squads
from athlete a;

-- ── 2 · Every honor they hold, newest first ────────────────────────────────────────────────────────
select
  h.awarded_at,
  h.honor_type,
  h.display_name,
  h.category,
  h.source,
  h.chapter_id
from public.honor_instances h
join public.profiles p on p.id = h.athlete_id
where p.handle = lower(btrim(:'handle'))
order by h.awarded_at desc;

-- ── 3 · ⚠ THE ONE THAT ANSWERS THE QUESTION ────────────────────────────────────────────────────────
-- Awarded honor  ×  its catalog rule  ×  the athlete's CURRENT value for that metric.
--
-- `honor_metrics` is the same SECURITY DEFINER function the evaluator itself calls, so this reads the
-- exact numbers the award was made from. A SHORTFALL row means the honor was granted against a metric
-- that does not support it — either the metric is computed wrong, or the row was written by something
-- other than the evaluator.
select
  h.honor_type,
  h.display_name,
  c.metric,
  c.metric_key,
  c.threshold,
  (public.honor_metrics(p.id) ->> c.metric)          as current_metric_value,
  case
    when c.metric is null then 'NO CATALOG ROW — awarded by something outside the catalog'
    when (public.honor_metrics(p.id) ? c.metric) is not true then 'METRIC MISSING from honor_metrics()'
    when (public.honor_metrics(p.id) ->> c.metric)::numeric >= c.threshold then 'ok'
    else '⚠ SHORTFALL — threshold not met'
  end                                                as earned_but_metric_says,
  h.awarded_at,
  h.source
from public.honor_instances h
join public.profiles p      on p.id = h.athlete_id
left join public.honor_catalog c on c.honor_type = h.honor_type
where p.handle = lower(btrim(:'handle'))
order by
  case when c.metric is null then 0
       when (public.honor_metrics(p.id) ? c.metric) is not true then 1
       when (public.honor_metrics(p.id) ->> c.metric)::numeric >= c.threshold then 3
       else 2 end,
  h.awarded_at desc;

-- ── 4 · The full metric snapshot, for reading by eye ───────────────────────────────────────────────
-- If one of these is wildly wrong (an `active_weeks` of 12 on a one-week-old account, say), the defect
-- is in `honor_metrics` rather than in the catalog.
select key as metric, value
from public.profiles p,
     lateral jsonb_each_text(public.honor_metrics(p.id))
where p.handle = lower(btrim(:'handle'))
order by key;

-- ── 5 · What the catalog would award them RIGHT NOW, from scratch ──────────────────────────────────
-- The same predicate the evaluator uses. Compare against query 2: anything here that is NOT in query 2
-- is simply unearned yet; anything in query 2 that is NOT here was awarded when it should not have been.
select c.honor_type, c.display_name, c.category, c.metric, c.threshold,
       (public.honor_metrics(p.id) ->> c.metric) as value
from public.honor_catalog c, public.profiles p
where p.handle = lower(btrim(:'handle'))
  and c.scope = 'account'
  and c.metric_key is null
  and (public.honor_metrics(p.id)) ? c.metric
  and (public.honor_metrics(p.id) ->> c.metric)::numeric >= c.threshold
order by c.sort_order;
