-- Forge Legacy — 0166: teach the /admin programs panel the 'finished' state
--
-- ══ WHAT WAS WRONG ══
--
-- `admin_feature_adoption` was written in 0130, when `program_state` was `future | active | graduated |
-- ended_early`. 0155 added 'finished' (a program under four DESIGNED weeks that completed — no rank
-- credit, no Programs Graduated honors, per D-RCM-30), and 0156/0158 route short programs into it.
-- Nothing ever taught this function about it. Two numbers on the shipped dashboard are wrong today:
--
--   1. NO BUCKET COUNTS 'finished'. The key is absent from the jsonb entirely, and `num()` in
--      `src/data/admin-live.ts` coerces a missing key to 0 rather than throwing — so every completed
--      short program is invisible, and the state buckets no longer sum to the population.
--
--   2. THE DROP-OFF CHART FABRICATES A NON-ZERO. This is the worse one. The exclusion list read
--      `state in ('graduated','ended_early')`, so a program somebody SUCCESSFULLY FINISHED and then
--      stopped touching for 21 days was counted as someone who QUIT in that week. The panel did not
--      read low — it invented abandonment out of completions.
--
-- ⚠ The stale comment at `src/data/admin-live.ts:373` said this "reads 0 until migration 0157 teaches
--   `admin_program_metrics` the new state". Both halves are false: 0157 is `week_templates`, and there
--   has never been a function named `admin_program_metrics` in this schema. The fix was never written.
--   That comment is corrected in the same commit as this file.
--
-- ══ SHAPE ══
--
-- A `create or replace` of the whole function, per 0130's rule that a read model is one definer function
-- per dashboard SECTION. Signature is unchanged — `(int, text)` — so:
--
--   · the existing ACL is PRESERVED (`create or replace` does not reset privileges, and does not re-apply
--     default privileges the way a fresh `create` would). 0147's anon revoke is not undone by this file.
--   · `supabase/seed/admin-roundtrip.mjs` needs NO edit. This adds no eighth function name; it replaces
--     one already in that list.
--
-- The grant/revoke pair at the foot is restated anyway, so this file stands alone if it is ever replayed
-- against a database where 0130's tail did not run.
--
-- Depends on 0129 (admin_guard), 0130 (the function), 0155 (the 'finished' enum label).
-- Idempotent — replaces by definition, and re-running changes nothing.

begin;

create or replace function public.admin_feature_adoption(p_days int default 30, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz     text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_days   int  := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from   timestamptz;
  v_total  int;
  v_active int;
  v_out    jsonb;
begin
  perform public.admin_guard();
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;
  v_from := now() - make_interval(days => v_days);

  select count(*) into v_total from public.profiles;
  select count(distinct athlete_id) into v_active
    from public.workouts where state = 'saved' and saved_at >= v_from;

  -- Two denominators on purpose. `in_window / active` answers "what are people using right now";
  -- `ever / total` answers "has this feature ever found anyone" — which at this population size is
  -- the number that actually decides whether something gets built on or cut.
  --
  -- ⚠ The owner column differs per table and getting it wrong is a silent zero, not an error.
  select jsonb_build_object(
    'days',   v_days,
    'total_athletes',  v_total,
    'active_athletes', v_active,
    'features', jsonb_build_array(
      jsonb_build_object('key','workout','label','Logged a workout',
        'ever',(select count(distinct athlete_id) from public.workouts where state='saved'),
        'in_window',(select count(distinct athlete_id) from public.workouts where state='saved' and saved_at>=v_from)),
      jsonb_build_object('key','program','label','Started a program',
        'ever',(select count(distinct athlete_id) from public.programs),
        'in_window',(select count(distinct athlete_id) from public.programs where created_at>=v_from)),
      jsonb_build_object('key','template','label','Saved a template',
        'ever',(select count(distinct athlete_id) from public.workout_templates),
        'in_window',(select count(distinct athlete_id) from public.workout_templates where created_at>=v_from)),
      jsonb_build_object('key','goal','label','Set a goal',
        'ever',(select count(distinct athlete_id) from public.goals),
        'in_window',(select count(distinct athlete_id) from public.goals where created_at>=v_from)),
      jsonb_build_object('key','honor','label','Earned an honor',
        'ever',(select count(distinct athlete_id) from public.honor_instances),
        'in_window',(select count(distinct athlete_id) from public.honor_instances where awarded_at>=v_from)),
      jsonb_build_object('key','pr','label','Recorded a PR',
        'ever',(select count(distinct athlete_id) from public.personal_records where athlete_id is not null),
        'in_window',(select count(distinct athlete_id) from public.personal_records where athlete_id is not null and created_at>=v_from)),
      jsonb_build_object('key','chapter_sealed','label','Sealed a chapter',
        'ever',(select count(distinct athlete_id) from public.chapters where sealed_at is not null),
        'in_window',(select count(distinct athlete_id) from public.chapters where sealed_at>=v_from)),
      -- squad_members keys on user_id and timestamps as joined_at — no created_at on this table.
      jsonb_build_object('key','squad','label','Joined a squad',
        'ever',(select count(distinct user_id) from public.squad_members),
        'in_window',(select count(distinct user_id) from public.squad_members where joined_at>=v_from)),
      -- squad_posts keys on author_id, not athlete_id.
      jsonb_build_object('key','squad_post','label','Posted to a squad',
        'ever',(select count(distinct author_id) from public.squad_posts),
        'in_window',(select count(distinct author_id) from public.squad_posts where created_at>=v_from)),
      -- 0049 rebuilt squad_checkins as video stories: no checkin_date, bucket on created_at.
      jsonb_build_object('key','checkin','label','Posted a check-in',
        'ever',(select count(distinct user_id) from public.squad_checkins),
        'in_window',(select count(distinct user_id) from public.squad_checkins where created_at>=v_from)),
      jsonb_build_object('key','challenge','label','Entered a challenge',
        'ever',(select count(distinct user_id) from public.challenge_participants),
        'in_window',(select count(distinct user_id) from public.challenge_participants where joined_at>=v_from)),
      -- friendships is an undirected edge: both endpoints count as having used the feature.
      jsonb_build_object('key','friend','label','Made a friend',
        'ever',(select count(distinct u) from (
                  select low_id u from public.friendships where status='ACCEPTED'
                  union select high_id from public.friendships where status='ACCEPTED') t),
        'in_window',(select count(distinct u) from (
                  select low_id u from public.friendships where status='ACCEPTED' and accepted_at>=v_from
                  union select high_id from public.friendships where status='ACCEPTED' and accepted_at>=v_from) t)),
      -- custom_exercises keys on author_id.
      jsonb_build_object('key','custom_exercise','label','Made a custom exercise',
        'ever',(select count(distinct author_id) from public.custom_exercises where deleted_at is null),
        'in_window',(select count(distinct author_id) from public.custom_exercises where deleted_at is null and created_at>=v_from)),
      jsonb_build_object('key','favorite','label','Favourited an exercise',
        'ever',(select count(distinct athlete_id) from public.exercise_favorites),
        'in_window',(select count(distinct athlete_id) from public.exercise_favorites where created_at>=v_from)),
      jsonb_build_object('key','body','label','Logged a body entry',
        'ever',(select count(distinct athlete_id) from public.body_entries),
        'in_window',(select count(distinct athlete_id) from public.body_entries where created_at>=v_from)),
      jsonb_build_object('key','transformation','label','Added a transformation',
        'ever',(select count(distinct athlete_id) from public.transformation_entries),
        'in_window',(select count(distinct athlete_id) from public.transformation_entries where created_at>=v_from)),
      jsonb_build_object('key','photo','label','Added a chapter photo',
        'ever',(select count(distinct athlete_id) from public.chapter_photos),
        'in_window',(select count(distinct athlete_id) from public.chapter_photos where created_at>=v_from)),
      jsonb_build_object('key','accomplishment','label','Added an accomplishment',
        'ever',(select count(distinct athlete_id) from public.accomplishments),
        'in_window',(select count(distinct athlete_id) from public.accomplishments where created_at>=v_from)),
      -- athlete_lift_maxes has NO created_at — updated_at is the only timestamp it carries.
      jsonb_build_object('key','lift_max','label','Entered a lift max',
        'ever',(select count(distinct athlete_id) from public.athlete_lift_maxes),
        'in_window',(select count(distinct athlete_id) from public.athlete_lift_maxes where updated_at>=v_from)),
      jsonb_build_object('key','push','label','Enabled push',
        'ever',(select count(distinct user_id) from public.push_tokens where disabled_at is null),
        'in_window',(select count(distinct user_id) from public.push_tokens where disabled_at is null and last_seen_at>=v_from))
    ),

    'programs', (
      with pp as (
        select ps.program_id, ps.athlete_id,
               max(ps.week_index)                             as last_week,
               count(*) filter (where ps.state = 'completed') as done,
               count(*) filter (where ps.state = 'skipped')   as skipped,
               max(ps.created_at)                             as last_touch
          from public.program_sessions ps group by 1, 2
      )
      select jsonb_build_object(
        'adherence_pct', (select round(100.0 * sum(done) / nullif(sum(done + skipped), 0), 1) from pp),
        'sessions_completed', (select coalesce(sum(done), 0) from pp),
        'sessions_skipped',   (select coalesce(sum(skipped), 0) from pp),
        -- programs.state is a lowercase enum, in lifecycle order (0155 inserted 'finished' before
        -- 'ended_early'): future | active | graduated | finished | ended_early.
        --
        -- ⚠ 'graduated' and 'finished' are BOTH completions and must stay SEPARATE keys, never summed
        --   here. D-RCM-30: a program under four designed weeks earns no rank credit and no Programs
        --   Graduated honors, and 0155 chose a distinct state precisely so `honor_metrics()` and
        --   `rank-live.ts` — which both filter `state = 'graduated'` — needed zero changes. Merging the
        --   two on this screen would make the dashboard disagree with the rank engine.
        'graduated',   (select count(*) from public.programs where state = 'graduated'),
        'finished',    (select count(*) from public.programs where state = 'finished'),
        'ended_early', (select count(*) from public.programs where state = 'ended_early'),
        'active',      (select count(*) from public.programs where state = 'active'),
        -- ⚠ STALLED, not merely in progress. Without the last_touch floor this histogram counts
        --   everybody who is currently mid-week-2 as having QUIT in week 2.
        --   week_index is 0-based, so +1 to render it as a human week number.
        --
        -- ⚠ ALL THREE SEALED STATES ARE EXCLUDED. 'finished' was missing here until 0166, which meant a
        --   successfully completed short program left alone for three weeks was rendered as a drop-off.
        --   The on-screen subtitle at `src/app/admin.tsx:368` has always claimed "and not finished" —
        --   this is the line that finally makes that copy true. Any state added to `program_state` in
        --   future that means "this program is over" belongs in this list on the same day.
        'dropoff_by_week', (
          select coalesce(jsonb_agg(jsonb_build_object('week', last_week + 1, 'programs', c) order by last_week), '[]'::jsonb)
            from (select last_week, count(*) c from pp
                   where last_touch < now() - interval '21 days'
                     and program_id not in (select id from public.programs where state in ('graduated','finished','ended_early'))
                   group by 1) t)
      )
    )
  ) into v_out;

  return v_out;
end;
$$;

comment on function public.admin_feature_adoption(int, text) is
  'Feature adoption (two denominators: ever/total and in_window/active) plus the programs panel. Aggregates only, AA-D2. 0166 taught the programs block the ''finished'' state from 0155: it is counted as its own completion bucket, kept separate from ''graduated'' per D-RCM-30, and excluded from dropoff_by_week alongside the other sealed states.';

-- Restated for self-containment. `create or replace` preserves the existing ACL, so these are no-ops
-- against a database where 0130's tail ran — which is every database that has this function.
revoke execute on function public.admin_feature_adoption(int, text) from public;
grant  execute on function public.admin_feature_adoption(int, text) to   authenticated;

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure here reports rather than rolling back a migration that worked.
-- Asserts the FIX, not merely the function's existence — 0130 already guaranteed the latter, and "the
-- migration ran" and "the objects are correct" are the two facts that have come apart before here.
do $$
declare
  v_src text;
begin
  if to_regprocedure('public.admin_feature_adoption(int, text)') is null then
    raise exception '0166 self-check: admin_feature_adoption is missing';
  end if;

  if not exists (
    select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid
     where t.typname = 'program_state' and e.enumlabel = 'finished'
  ) then
    raise exception '0166 self-check: program_state has no ''finished'' label — apply 0155 first';
  end if;

  select p.prosrc into v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'admin_feature_adoption';

  -- The drop-off exclusion is the fix that actually changes a rendered number. Assert it by source,
  -- because a partial paste that dropped the tail of the body would still leave a callable function.
  if v_src not like '%''graduated'',''finished'',''ended_early''%' then
    raise exception '0166 self-check: dropoff_by_week still excludes only two states — the replace did not take';
  end if;

  -- Matched on the predicate rather than the jsonb key, because the key is followed by alignment
  -- whitespace that a reformat would change; `where state = 'finished'` appears exactly once and only
  -- in the line this migration adds.
  if v_src not like '%where state = ''finished''%' then
    raise exception '0166 self-check: the ''finished'' count bucket is missing from the programs block';
  end if;

  raise notice '0166 OK: admin_feature_adoption now counts ''finished'' and excludes it from drop-off.';
end;
$$;

-- ══ VERIFY BY HAND (paste separately, as an admin) ═══════════════════════════════════════════════════
--   select jsonb_pretty(public.admin_feature_adoption(30, 'UTC') -> 'programs');
-- Expect a 'finished' key to be present. A 0 there is now a real zero rather than a missing key —
-- cross-check against:  select state, count(*) from public.programs group by 1 order by 1;
