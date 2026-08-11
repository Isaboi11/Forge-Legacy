-- Forge Legacy — 0130: the seven read models behind /admin
--
-- ══ SHAPE ══
--
-- Seven functions, one per dashboard SECTION — never one per metric. One screen is seven round trips,
-- each independently refetchable by `useQuery`, each a single planned statement rather than thirty.
--
-- Every one of them: `returns jsonb`, `security definer`, `stable`, `set search_path = public, pg_temp`,
-- and `perform public.admin_guard()` as the FIRST STATEMENT OF THE BODY. That guard is the whole
-- authorization story (0129, AA-D5). It raises 42501 rather than returning empty, because an empty
-- result is indistinguishable from "there is no data yet" and would hide a broken guard for months.
--
-- ⚠ ADDING AN EIGHTH FUNCTION HERE MEANS ADDING ITS NAME TO `supabase/seed/admin-roundtrip.mjs` IN THE
--   SAME COMMIT. That script loops every function name as a non-admin and asserts 42501; it is the only
--   thing standing between "somebody forgot admin_guard()" and total population exposure.
--
-- ⚠ NO VIEWS. There is not one `create view` in the other 128 migrations — every read model in this
--   schema is a jsonb-returning definer function, and a view here would be the first place an RLS
--   assumption could quietly differ from the rest of the codebase.
--
-- ══ AA-D2: AGGREGATES ONLY ══
--
-- Not one function below returns a named athlete beside a number. Histograms, distributions and counts;
-- never a roster. `Docs/Admin-Analytics-Architecture-v1.0.md` §3 explains why that constraint is what
-- keeps this surface outside the Performance Firewall rather than in breach of it. A per-athlete
-- drill-down is a new amendment, not an incremental feature.
--
-- ══ TIMEZONE ══
--
-- All day/week bucketing uses ONE dashboard timezone, passed by the client
-- (`Intl.DateTimeFormat().resolvedOptions().timeZone`) — never each athlete's `profiles.tz`. Summing
-- per-athlete local days produces a DAU whose day boundaries differ per row, which is unauditable.
-- `profiles.tz` stays reserved for metrics where the athlete's own wall clock IS the fact (hour-of-day
-- training patterns, as `honor_metrics` uses it), and there `coalesce(p.tz,'UTC')` is mandatory because
-- `tz` is null for anyone who has not launched since 0099.
--
-- ══ WHAT "ACTIVE" MEANS ══
--
-- Phase 1 has no app-open signal — there is no telemetry in this product and no `last_active` anywhere.
-- So ACTIVE MEANS "SAVED A WORKOUT". Every payload carries `active_def` so the screen can say so out
-- loud, and so Phase 2 can flip it to 'app_open' without a chart silently changing meaning.
--
-- ══ SCHEMA FACTS THAT COST ME AN HOUR, RECORDED SO THEY COST NOBODY ELSE ONE ══
--
--   · `squad_checkins` has NO `checkin_date` and NO `status`. 0049 DROPPED 0048's daily trained/rest
--     table and rebuilt it as video stories. Bucket on `created_at`.
--   · `goals` has NO state/status column. Achieved is `achieved_at is not null`, full stop.
--   · Case is inconsistent and load-bearing: `programs.state` and `program_sessions.state` are
--     lowercase; `challenges.state` and `friendships.status` are UPPERCASE.
--   · Owner columns are not uniform: `athlete_id` on the personal spine, `author_id` on
--     `custom_exercises` and `squad_posts`, `user_id` on the social/push tables, `owner_id` on `squads`.
--   · `honor_instances` keys on `honor_type`, not `honor_id`.
--   · `athlete_lift_maxes` has no `created_at` — only `updated_at` / `tested_at`.
--   · `workout_sets` has no `unit` column; it is `weight_unit` (lb|kg, unconstrained text).
--
-- Idempotent. Depends on 0129 (admin_guard). RUN AFTER 0129.

-- ── Indexes ──────────────────────────────────────────────────────────────────
--
-- Every scan below is time-bounded, but the two hot predicates deserve their own index because the
-- dashboard runs all seven at once. The partial index carries only saved workouts, which is the only
-- kind any metric counts.
create index if not exists workouts_saved_at
  on public.workouts (saved_at) where state = 'saved';
create index if not exists profiles_created_at
  on public.profiles (created_at);
create index if not exists program_sessions_athlete_created
  on public.program_sessions (athlete_id, created_at);


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. OVERVIEW — headline tiles, each with a delta against the preceding window
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_overview(p_days int default 30, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz   text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_days int  := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from timestamptz;
  v_prev timestamptz;
  v_out  jsonb;
begin
  perform public.admin_guard();
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;

  v_from := now() - make_interval(days => v_days);
  v_prev := now() - make_interval(days => v_days * 2);

  select jsonb_build_object(
    'days',       v_days,
    'tz',         v_tz,
    -- Stated in the payload so the screen can label the charts honestly. Phase 2 flips this.
    'active_def', 'saved_workout',
    'tiles', jsonb_build_object(
      'athletes_total',    (select count(*) from public.profiles),
      'onboarded_total',   (select count(*) from public.profiles where onboarded_at is not null),
      'workouts_all_time', (select count(*) from public.workouts where state = 'saved'),
      -- duration_sec is nullable on old rows; coalesce so one null does not void the sum.
      'hours_all_time',    (select round(coalesce(sum(coalesce(duration_sec, 0)), 0) / 3600.0, 1)
                              from public.workouts where state = 'saved'),

      'signups',      (select count(*) from public.profiles where created_at >= v_from),
      'signups_prev', (select count(*) from public.profiles where created_at >= v_prev and created_at < v_from),

      -- ACTIVATED = the athlete's FIRST saved workout fell in the window. Not "signed up and has a
      -- workout" — that would re-count the same person every window forever.
      'activated',      (select count(*) from (
                            select athlete_id, min(saved_at) as f from public.workouts
                             where state = 'saved' and saved_at is not null group by athlete_id
                          ) t where t.f >= v_from),
      'activated_prev', (select count(*) from (
                            select athlete_id, min(saved_at) as f from public.workouts
                             where state = 'saved' and saved_at is not null group by athlete_id
                          ) t where t.f >= v_prev and t.f < v_from),

      'active',      (select count(distinct athlete_id) from public.workouts
                       where state = 'saved' and saved_at >= v_from),
      'active_prev', (select count(distinct athlete_id) from public.workouts
                       where state = 'saved' and saved_at >= v_prev and saved_at < v_from),

      'workouts',      (select count(*) from public.workouts where state = 'saved' and saved_at >= v_from),
      'workouts_prev', (select count(*) from public.workouts
                         where state = 'saved' and saved_at >= v_prev and saved_at < v_from),

      -- Median, not mean: one athlete logging every day drags a mean into fiction at this population size.
      'median_workouts_per_active', (select coalesce(
          percentile_cont(0.5) within group (order by n), 0)
          from (select count(*) as n from public.workouts
                 where state = 'saved' and saved_at >= v_from
                 group by athlete_id) t)
    ),
    'series', (
      with days as (
        select generate_series(
                 (now() at time zone v_tz)::date - (v_days - 1),
                 (now() at time zone v_tz)::date,
                 interval '1 day')::date as d
      )
      select jsonb_agg(jsonb_build_object(
               'd', days.d,
               'signups',  (select count(*) from public.profiles p
                             where (p.created_at at time zone v_tz)::date = days.d),
               'active',   (select count(distinct w.athlete_id) from public.workouts w
                             where w.state = 'saved' and (w.saved_at at time zone v_tz)::date = days.d),
               'workouts', (select count(*) from public.workouts w
                             where w.state = 'saved' and (w.saved_at at time zone v_tz)::date = days.d)
             ) order by days.d)
        from days
    )
  ) into v_out;

  return v_out;
end;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. GROWTH — daily series + the acquisition funnel
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_growth(p_days int default 90, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz   text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_days int  := least(greatest(coalesce(p_days, 90), 1), 365);
  v_from timestamptz;
  v_out  jsonb;
begin
  perform public.admin_guard();
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;
  v_from := now() - make_interval(days => v_days);

  select jsonb_build_object(
    'days', v_days,
    'tz',   v_tz,

    'series', (
      with days as (
        select generate_series(
                 (now() at time zone v_tz)::date - (v_days - 1),
                 (now() at time zone v_tz)::date,
                 interval '1 day')::date as d
      ),
      firsts as (
        select athlete_id, min(saved_at) as first_at from public.workouts
         where state = 'saved' and saved_at is not null group by athlete_id
      )
      -- LEFT-joined onto a generated spine so an empty day is 0, not missing. A chart that skips days
      -- lies about slope, and the days with nothing on them are exactly the ones worth seeing.
      select jsonb_agg(jsonb_build_object(
               'd',          days.d,
               'signups',    (select count(*) from public.profiles p
                               where (p.created_at at time zone v_tz)::date = days.d),
               'activated',  (select count(*) from firsts f
                               where (f.first_at at time zone v_tz)::date = days.d),
               'cumulative', (select count(*) from public.profiles p
                               where (p.created_at at time zone v_tz)::date <= days.d)
             ) order by days.d)
        from days
    ),

    'funnel', (
      with base as (
        select p.id, p.created_at, p.onboarded_at
          from public.profiles p
         where p.created_at >= v_from
      ),
      w as (
        select b.id, b.created_at, b.onboarded_at, s.n, s.wk2
          from base b
          left join lateral (
            select count(*) as n,
                   count(*) filter (
                     where wk.saved_at >= b.created_at + interval '7 days'
                       and wk.saved_at <  b.created_at + interval '14 days') as wk2
              from public.workouts wk
             where wk.athlete_id = b.id and wk.state = 'saved' and wk.saved_at is not null
          ) s on true
      )
      select jsonb_build_object(
        'signed_up',      count(*),
        'onboarded',      count(*) filter (where onboarded_at is not null),
        'first_workout',  count(*) filter (where n >= 1),
        'second_workout', count(*) filter (where n >= 2),
        -- ⚠ THE WEEK-2 STAGE HAS ITS OWN DENOMINATOR. An athlete who signed up yesterday CANNOT have
        --   returned in week two. Counting them in the same base makes the last funnel stage a
        --   function of how fast you are growing — the exact opposite of what a funnel is for.
        'week2_eligible', count(*) filter (where created_at <= now() - interval '14 days'),
        'week2_return',   count(*) filter (where created_at <= now() - interval '14 days' and wk2 > 0)
      ) from w
    )
  ) into v_out;

  return v_out;
end;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. RETENTION COHORTS — weekly signup cohort × weeks-since grid
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_retention_cohorts(p_weeks int default 12, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz    text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_weeks int  := least(greatest(coalesce(p_weeks, 12), 1), 52);
  v_out   jsonb;
begin
  perform public.admin_guard();
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;

  with cohorts as (
    select p.id,
           date_trunc('week', p.created_at at time zone v_tz)::date as cw
      from public.profiles p
     where p.created_at >= date_trunc('week', now() at time zone v_tz) - make_interval(weeks => v_weeks)
  ),
  sizes as (select cw, count(*)::int as n from cohorts group by 1),
  -- Alias `co`, not `c`: `squad_checkins c` appears later in this same file, and one letter bound to
  -- two tables in one migration is unreadable to a person and indistinguishable to the contract
  -- scanner in `catalog-contract.test.mjs`, which flags `c.<col>` against the wrong table's shape.
  acts as (
    select co.cw,
           -- `date - date` is an integer day count in Postgres, so /7 is exact. No extract(epoch).
           ((date_trunc('week', w.saved_at at time zone v_tz)::date - co.cw) / 7)::int as k,
           w.athlete_id
      from cohorts co
      join public.workouts w
        on w.athlete_id = co.id and w.state = 'saved' and w.saved_at is not null
  ),
  grid as (
    select cw, k, count(distinct athlete_id)::int as retained
      from acts where k between 0 and v_weeks group by 1, 2
  )
  select jsonb_build_object(
    'weeks', v_weeks,
    'tz',    v_tz,
    -- The client greys this column and labels it. It is PARTIAL and therefore always dips; left
    -- unmarked it reads as retention collapsing when in fact it is Tuesday.
    'current_week', date_trunc('week', now() at time zone v_tz)::date,
    'cohorts', coalesce((
      select jsonb_agg(jsonb_build_object(
               'week', s.cw,
               'size', s.n,
               -- ⚠ HOW FAR THIS COHORT HAS ACTUALLY AGED. A cell beyond max_k is NOT 0% — it is
               --   UNKNOWN. Rendering it as an empty ramp step is the single most common way a
               --   cohort grid lies to the person reading it.
               'max_k', ((date_trunc('week', now() at time zone v_tz)::date - s.cw) / 7)::int,
               'cells', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'k',   g.k,
                          'n',   g.retained,
                          'pct', round(100.0 * g.retained / s.n, 1)
                        ) order by g.k)
                   from grid g where g.cw = s.cw), '[]'::jsonb)
             ) order by s.cw desc)
        from sizes s), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. ENGAGEMENT — DAU/WAU/MAU, stickiness, churn risk
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_engagement(p_days int default 90, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz   text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_days int  := least(greatest(coalesce(p_days, 90), 1), 365);
  v_out  jsonb;
begin
  perform public.admin_guard();
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;

  select jsonb_build_object(
    'days',       v_days,
    'tz',         v_tz,
    'active_def', 'saved_workout',

    'series', (
      with days as (
        select generate_series(
                 (now() at time zone v_tz)::date - (v_days - 1),
                 (now() at time zone v_tz)::date,
                 interval '1 day')::date as d
      ),
      act as (
        -- ⚠ THE `+ 30` IS NOT SLACK. A 30-day MAU on the FIRST day of the range needs the 30 days
        --   BEFORE it. Omitting that is why the left edge of every MAU chart ramps up from zero for
        --   a month and looks like growth that did not happen.
        select distinct (w.saved_at at time zone v_tz)::date as d, w.athlete_id
          from public.workouts w
         where w.state = 'saved'
           and w.saved_at >= now() - make_interval(days => v_days + 30)
      )
      -- One day×activity range join, not three correlated subqueries per day.
      select jsonb_agg(x.o order by x.d) from (
        select days.d as d,
               jsonb_build_object(
                 'd',   days.d,
                 'dau', count(distinct a.athlete_id) filter (where a.d = days.d),
                 'wau', count(distinct a.athlete_id) filter (where a.d >  days.d - 7),
                 'mau', count(distinct a.athlete_id)
               ) as o
          from days
          left join act a on a.d <= days.d and a.d > days.d - 30
         group by days.d
      ) x
    ),

    -- Days between consecutive sessions, median. The honest read on "how often do people train".
    'median_days_between', (
      with gaps as (
        select extract(epoch from (
                 saved_at - lag(saved_at) over (partition by athlete_id order by saved_at)
               )) / 86400.0 as g
          from public.workouts
         where state = 'saved' and saved_at is not null
           and saved_at >= now() - make_interval(days => v_days)
      )
      select round(coalesce(percentile_cont(0.5) within group (order by g), 0)::numeric, 1)
        from gaps where g is not null
    ),

    'churn_risk', (
      with last as (
        select p.id, max(w.saved_at) as last_at
          from public.profiles p
          left join public.workouts w on w.athlete_id = p.id and w.state = 'saved'
         group by p.id
      )
      select jsonb_build_array(
        jsonb_build_object('label', '0–6 days',     'n', count(*) filter (where last_at >  now() - interval '7 days')),
        jsonb_build_object('label', '7–13 days',    'n', count(*) filter (where last_at <= now() - interval '7 days'  and last_at > now() - interval '14 days')),
        jsonb_build_object('label', '14–29 days',   'n', count(*) filter (where last_at <= now() - interval '14 days' and last_at > now() - interval '30 days')),
        jsonb_build_object('label', '30–59 days',   'n', count(*) filter (where last_at <= now() - interval '30 days' and last_at > now() - interval '60 days')),
        jsonb_build_object('label', '60+ days',     'n', count(*) filter (where last_at <= now() - interval '60 days')),
        -- Signed up and never trained. At this stage of the product it is usually the biggest bucket,
        -- and it is the one that says something actionable.
        jsonb_build_object('label', 'never trained','n', count(*) filter (where last_at is null))
      ) from last
    )
  ) into v_out;

  return v_out;
end;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. FEATURE ADOPTION — who touched what, plus program adherence
-- ═════════════════════════════════════════════════════════════════════════════
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
        -- programs.state is a lowercase enum: future | active | graduated | ended_early
        'graduated',   (select count(*) from public.programs where state = 'graduated'),
        'ended_early', (select count(*) from public.programs where state = 'ended_early'),
        'active',      (select count(*) from public.programs where state = 'active'),
        -- ⚠ STALLED, not merely in progress. Without the last_touch floor this histogram counts
        --   everybody who is currently mid-week-2 as having QUIT in week 2.
        --   week_index is 0-based, so +1 to render it as a human week number.
        'dropoff_by_week', (
          select coalesce(jsonb_agg(jsonb_build_object('week', last_week + 1, 'programs', c) order by last_week), '[]'::jsonb)
            from (select last_week, count(*) c from pp
                   where last_touch < now() - interval '21 days'
                     and program_id not in (select id from public.programs where state in ('graduated','ended_early'))
                   group by 1) t)
      )
    )
  ) into v_out;

  return v_out;
end;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6. CONTENT POPULARITY — what people actually train
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_content_popularity(
  p_days int default 30, p_limit int default 20, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz    text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_days  int  := least(greatest(coalesce(p_days, 30), 1), 365);
  v_limit int  := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_from  timestamptz;
  v_out   jsonb;
begin
  perform public.admin_guard();
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;
  v_from := now() - make_interval(days => v_days);

  select jsonb_build_object(
    'days',  v_days,
    'limit', v_limit,

    -- ⚠ THERE IS NO EXERCISES TABLE. The catalogue is bundled client-side
    --   (`src/domain/exercise-library/`), so Postgres can only group on what it actually stores.
    --   `admin-live.ts` resolves catalog_key → display name against the bundle and falls back to
    --   sample_name for a custom lift.
    'exercises', (
      select coalesce(jsonb_agg(t.o order by t.athletes desc, t.workouts desc), '[]'::jsonb) from (
        select coalesce(we.catalog_key, 'custom:' || lower(btrim(we.name))) as key,
               count(distinct w.athlete_id)::int as athletes,
               count(distinct w.id)::int         as workouts,
               jsonb_build_object(
                 'key',         coalesce(we.catalog_key, 'custom:' || lower(btrim(we.name))),
                 'sample_name', min(we.name),
                 'is_custom',   we.catalog_key is null,
                 'athletes',    count(distinct w.athlete_id)::int,
                 'workouts',    count(distinct w.id)::int,
                 'entries',     count(*)::int
               ) as o
          from public.workout_exercises we
          join public.workouts w on w.id = we.workout_id
         where w.state = 'saved' and w.saved_at >= v_from
         group by 1, we.catalog_key
         -- ⚠ RANK BY DISTINCT ATHLETES, NEVER RAW ROWS. One athlete benching two hundred times is
         --   one person's preference, not the population's.
         order by athletes desc, workouts desc
         limit v_limit
      ) t
    ),

    -- workouts.activity_type is the `modality` enum (10 values since 0102's cardio machines).
    'activity_mix', (
      select coalesce(jsonb_agg(jsonb_build_object('key', a, 'workouts', c, 'athletes', ath) order by c desc), '[]'::jsonb)
        from (select activity_type::text a, count(*) c, count(distinct athlete_id) ath
                from public.workouts where state = 'saved' and saved_at >= v_from
               group by 1) t
    ),

    -- workout_sets.modality is plain text with no CHECK (0097) and is null on strength sets.
    'cardio_modality_mix', (
      select coalesce(jsonb_agg(jsonb_build_object('key', m, 'sets', c) order by c desc), '[]'::jsonb)
        from (select ws.modality m, count(*) c
                from public.workout_sets ws
                join public.workout_exercises we on we.id = ws.workout_exercise_id
                join public.workouts w on w.id = we.workout_id
               where w.state = 'saved' and w.saved_at >= v_from and ws.modality is not null
               group by 1) t
    ),

    -- Where a session came from. program_id (0018) and template_id (0095) are both nullable FKs.
    'session_source', (
      select jsonb_build_object(
               'program',   count(*) filter (where program_id is not null),
               'template',  count(*) filter (where program_id is null and template_id is not null),
               'freestyle', count(*) filter (where program_id is null and template_id is null))
        from public.workouts where state = 'saved' and saved_at >= v_from
    ),

    -- honor_instances keys on honor_type, NOT honor_id.
    'top_honors', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'honor_type', ht, 'label', lbl, 'athletes', ath, 'awards', c) order by ath desc, c desc), '[]'::jsonb)
        from (select honor_type ht, min(display_name) lbl,
                     count(distinct athlete_id) ath, count(*) c
                from public.honor_instances where awarded_at >= v_from
               group by 1 order by ath desc, c desc limit v_limit) t
    )
  ) into v_out;

  return v_out;
end;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. SOCIAL HEALTH — squads, friends, challenges
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ AA-D2 bites hardest here. NOTHING below joins challenge_results to an athlete identity, and no
--   squad or challenge is named beside a performance number. Aggregates and histograms only.
create or replace function public.admin_social_health(p_days int default 30, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz   text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_days int  := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from timestamptz;
  v_out  jsonb;
begin
  perform public.admin_guard();
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;
  v_from := now() - make_interval(days => v_days);

  select jsonb_build_object(
    'days', v_days,

    'squads', jsonb_build_object(
      'total',       (select count(*) from public.squads),
      'created',     (select count(*) from public.squads where created_at >= v_from),
      'public',      (select count(*) from public.squads where privacy = 'public'),
      -- ACTIVE = somebody posted or checked in. A squad with members and silence is not a live squad,
      -- and counting it as one is how a social feature looks healthy while nobody uses it.
      'active',      (select count(*) from public.squads s
                       where exists (select 1 from public.squad_posts p where p.squad_id = s.id and p.created_at >= v_from)
                          or exists (select 1 from public.squad_checkins ck where ck.squad_id = s.id and ck.created_at >= v_from)),
      'posts',       (select count(*) from public.squad_posts where created_at >= v_from),
      'checkins',    (select count(*) from public.squad_checkins where created_at >= v_from),
      'median_size', (select coalesce(percentile_cont(0.5) within group (order by n), 0)
                        from (select count(*) n from public.squad_members group by squad_id) t),
      'size_histogram', (
        select coalesce(jsonb_agg(jsonb_build_object('label', b, 'n', c) order by ord), '[]'::jsonb) from (
          select case when n = 1 then '1 (solo)' when n <= 3 then '2–3' when n <= 5 then '4–5'
                      when n <= 10 then '6–10' else '11+' end as b,
                 case when n = 1 then 1 when n <= 3 then 2 when n <= 5 then 3
                      when n <= 10 then 4 else 5 end as ord,
                 count(*) c
            from (select count(*) n from public.squad_members group by squad_id) m
           group by 1, 2) t
      ),
      -- 0052's request→approve loop. A low acceptance rate means Discover is sending the wrong people.
      'join_requests',  (select count(*) from public.squad_join_requests where created_at >= v_from),
      'requests_decided',(select count(*) from public.squad_join_requests where decided_at >= v_from)
    ),

    -- friendships.status is UPPERCASE and has exactly PENDING|ACCEPTED — declining DELETES the row
    -- (0073), so "declined" is unmeasurable by construction and is deliberately not reported.
    'friends', jsonb_build_object(
      'accepted_total', (select count(*) from public.friendships where status = 'ACCEPTED'),
      'accepted',       (select count(*) from public.friendships where status = 'ACCEPTED' and accepted_at >= v_from),
      'pending',        (select count(*) from public.friendships where status = 'PENDING'),
      'requested',      (select count(*) from public.friendships where requested_at >= v_from),
      'median_friends', (select coalesce(percentile_cont(0.5) within group (order by n), 0)
                           from (select count(*) n from (
                                   select low_id u from public.friendships where status='ACCEPTED'
                                   union all select high_id from public.friendships where status='ACCEPTED') e
                                  group by u) t)
    ),

    -- challenges.state is UPPERCASE: DRAFT|ENROLLMENT|ACTIVE|COMPLETED|ARCHIVED|CANCELLED
    'challenges', jsonb_build_object(
      'created',   (select count(*) from public.challenges where created_at >= v_from),
      'completed', (select count(*) from public.challenges where state = 'COMPLETED'),
      'cancelled', (select count(*) from public.challenges where state = 'CANCELLED'),
      'live',      (select count(*) from public.challenges where state in ('ENROLLMENT','ACTIVE')),
      'by_type', (
        select coalesce(jsonb_agg(jsonb_build_object('key', ty, 'n', c) order by c desc), '[]'::jsonb)
          from (select type ty, count(*) c from public.challenges where created_at >= v_from group by 1) t),
      'median_participants', (select coalesce(percentile_cont(0.5) within group (order by n), 0)
                                from (select count(*) n from public.challenge_participants group by challenge_id) t)
    ),

    -- push_outbox.status is PENDING|SENT|FAILED; kind is unconstrained text.
    'push', jsonb_build_object(
      'sent',   (select count(*) from public.push_outbox where status = 'SENT'   and created_at >= v_from),
      'failed', (select count(*) from public.push_outbox where status = 'FAILED' and created_at >= v_from),
      'by_kind', (
        select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', c) order by c desc), '[]'::jsonb)
          from (select kind k, count(*) c from public.push_outbox where created_at >= v_from group by 1) t),
      'devices', (
        select coalesce(jsonb_agg(jsonb_build_object('key', pl, 'n', c) order by c desc), '[]'::jsonb)
          from (select platform pl, count(distinct user_id) c from public.push_tokens
                 where disabled_at is null group by 1) t)
    )
  ) into v_out;

  return v_out;
end;
$$;


-- ── Grants ───────────────────────────────────────────────────────────────────
--
-- ⚠ Revoke FROM PUBLIC (Postgres grants EXECUTE to PUBLIC on every new function). Revoking from
--   `authenticated` would remove nothing, because it never held a direct grant. 0120's header.
--
-- The GUARD, not the grant, is what refuses a signed-in non-admin — the grant only shuts out anon.
revoke execute on function public.admin_overview(int, text)                from public;
revoke execute on function public.admin_growth(int, text)                  from public;
revoke execute on function public.admin_retention_cohorts(int, text)       from public;
revoke execute on function public.admin_engagement(int, text)              from public;
revoke execute on function public.admin_feature_adoption(int, text)        from public;
revoke execute on function public.admin_content_popularity(int, int, text) from public;
revoke execute on function public.admin_social_health(int, text)           from public;

grant execute on function public.admin_overview(int, text)                to authenticated;
grant execute on function public.admin_growth(int, text)                  to authenticated;
grant execute on function public.admin_retention_cohorts(int, text)       to authenticated;
grant execute on function public.admin_engagement(int, text)              to authenticated;
grant execute on function public.admin_feature_adoption(int, text)        to authenticated;
grant execute on function public.admin_content_popularity(int, int, text) to authenticated;
grant execute on function public.admin_social_health(int, text)           to authenticated;

comment on function public.admin_overview(int, text) is
  'AA-D1/AA-D2. Operator dashboard: headline tiles + daily series, each with a delta against the preceding window. Population aggregates only — no athlete is ever named. Guarded by admin_guard().';
