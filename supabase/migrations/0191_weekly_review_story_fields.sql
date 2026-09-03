-- Forge Legacy — 0191: the weekly review can finally see the week it is describing
--
-- PO: *"I want to make weekly and monthly reviews more meaningful and emotionally pulling. Not just
-- numbers."* — and the four questions the design brief demanded are answered in
-- `Docs/Review-Emotional-Depth-Proposal-v1.0.md` §9.
--
-- ══ THE DIAGNOSIS THIS IMPLEMENTS ══
--
-- The emotional content of a review lives in the sections that are usually EMPTY. The brief states the
-- common week plainly — **3 sessions, some volume, no PR, no honor** — so everything GUARANTEED to
-- appear is a total, and a total is unfeelable. The fix is not styling; it is that the snapshot stores
-- seven fields and not one of them says WHEN, WHICH SESSION, or WHAT WAS NEW. A screen cannot narrate a
-- week it cannot see.
--
-- Four additions, all inside `review` jsonb — no new columns, no new table:
--
--   `top_lift.day`      "Wednesday — Back Squat, 225 × 5" is a memory. Without the day it is a statistic.
--   `sessions[]`        {name, day, duration_sec} — lets the week read as WHAT YOU DID, not HOW MANY TIMES.
--   `first_time[]`      exercises performed for the first time EVER. The highest-value addition: PRs are
--                       rare, firsts are common, and a first is a FACT — the same kind of fact a PR is,
--                       which is why §0's no-comparison bar does not reach it.
--   `longest_session`   the hero's fallback on a cardio-only week, and often the week's actual story.
--
-- ══ ⚠ SNAPSHOTS ARE FROZEN. THIS CHANGES THE FUTURE ONLY. ══
--
-- `ensure_weekly_review()` returns the stored row untouched once written, and this migration does not
-- backfill. Every week already generated keeps the seven fields it was born with, and the screen must
-- treat all four additions as ABSENT-BY-DEFAULT. That is correct: a review is a record of what that week
-- was, not a document that improves as the app does.
--
-- ══ ⚠ THE COLUMN IS `workout_name`, NOT `name` ══
--
-- `workouts` has no `name`. 0091 shipped `w.name` against it, the function raised at RUN time rather
-- than at create time (PL/pgSQL binds late), and 0094 exists solely to fix it — 0106's header calls it
-- out a second time. Every reference below is `w.workout_name`.
--
-- Idempotent — `create or replace` only. Depends on 0001 (workouts, workout_exercises.catalog_key),
-- 0099 (profiles.tz), 0140 (the function this replaces). RUN AFTER 0190.

begin;

create or replace function public.ensure_weekly_review()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_tz     text;
  v_start  timestamptz;
  v_prev   timestamptz;
  v_row    public.athlete_weekly_reviews%rowtype;
  v_workouts int;
  v_days   int;
  v_volume numeric;
  v_seconds bigint;
  v_prs    jsonb;
  v_honors jsonb;
  v_top    jsonb := null;
  v_sessions jsonb;
  v_firsts jsonb := '[]'::jsonb;
  v_longest jsonb := null;
  v_trained_before boolean;
  v_review jsonb;
begin
  if v_uid is null then return null; end if;

  -- The athlete's own clock, falling back to UTC. See 0140's header for why this differs from 0057.
  select coalesce(p.tz, 'UTC') into v_tz from public.profiles p where p.id = v_uid;
  if v_tz is null then return null; end if;

  v_start := date_trunc('week', now() at time zone v_tz) at time zone v_tz;
  v_prev  := v_start - interval '7 days';

  -- Already generated for the week that just ended? Hand it back untouched — snapshotted, not recomputed.
  select * into v_row
    from public.athlete_weekly_reviews
   where athlete_id = v_uid and week_start = v_prev::date;
  if found then
    return jsonb_build_object('week_start', v_row.week_start, 'week_end', v_row.week_end, 'review', v_row.review, 'note', v_row.note);
  end if;

  select count(*)::int,
         count(distinct date_trunc('day', w.saved_at at time zone v_tz))::int,
         coalesce(sum(w.duration_sec), 0)
    into v_workouts, v_days, v_seconds
    from public.workouts w
   where w.athlete_id = v_uid and w.saved_at >= v_prev and w.saved_at < v_start;

  /*
   * ⚠ VOLUME IS DERIVED, NOT STORED. `workouts` has no `volume` column — it never has — so this sums
   * the sets, which is the same arithmetic `computeStats` does client-side. A bodyweight set carries
   * `weight = 0` (a real answer meaning "nothing on the bar") and contributes nothing, which is
   * correct; a set with a NULL weight was never logged and is excluded rather than counted as zero.
   */
  select coalesce(sum(ws.weight * ws.reps), 0)
    into v_volume
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
   where w.athlete_id = v_uid
     and w.saved_at >= v_prev and w.saved_at < v_start
     and ws.weight is not null and ws.reps is not null;

  -- ⚠ SILENCE BEATS ZERO. Nothing is written, so nothing can be shown — see 0140's header.
  if v_workouts = 0 then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('exercise', pr.exercise, 'value', pr.load_value) order by pr.achieved_on), '[]'::jsonb)
    into v_prs
    from public.personal_records pr
   where pr.athlete_id = v_uid and pr.achieved_on >= v_prev::date and pr.achieved_on < v_start::date;

  select coalesce(jsonb_agg(jsonb_build_object('honor', h.display_name) order by h.date_earned), '[]'::jsonb)
    into v_honors
    from public.honor_instances h
   where h.athlete_id = v_uid and h.date_earned >= v_prev::date and h.date_earned < v_start::date;

  /*
   * The single heaviest working set of the week — now carrying the DAY it happened.
   * ⚠ `FMDay` not `Day`: without the FM prefix Postgres blank-pads the name to nine characters, so
   * "Monday" arrives as "Monday   " and every layout that trusts it inherits three spaces.
   */
  select jsonb_build_object(
           'name', we.name,
           'weight', ws.weight,
           'reps', ws.reps,
           'day', to_char(w.saved_at at time zone v_tz, 'FMDay'))
    into v_top
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
   where w.athlete_id = v_uid and w.saved_at >= v_prev and w.saved_at < v_start and ws.weight is not null
   order by ws.weight desc, ws.reps desc
   limit 1;

  /*
   * THE WEEK AS DAYS, NOT AS A COUNT.
   * ⚠ The screen renders ONLY the days that happened — never seven slots with three filled. Three of
   * seven IS a ring however it is styled, and §0 of the design brief bars rings, meters and grades.
   */
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', coalesce(nullif(btrim(w.workout_name), ''), 'Session'),
           'day', to_char(w.saved_at at time zone v_tz, 'FMDay'),
           'duration_sec', w.duration_sec) order by w.saved_at), '[]'::jsonb)
    into v_sessions
    from public.workouts w
   where w.athlete_id = v_uid and w.saved_at >= v_prev and w.saved_at < v_start;

  -- The hero's fallback when nothing was loaded — a cardio-only week still has a longest session.
  select jsonb_build_object(
           'name', coalesce(nullif(btrim(w.workout_name), ''), 'Session'),
           'day', to_char(w.saved_at at time zone v_tz, 'FMDay'),
           'duration_sec', w.duration_sec)
    into v_longest
    from public.workouts w
   where w.athlete_id = v_uid and w.saved_at >= v_prev and w.saved_at < v_start
     and w.duration_sec is not null and w.duration_sec > 0
   order by w.duration_sec desc, w.saved_at
   limit 1;

  /*
   * ══ FIRSTS — and three decisions inside one query ══
   *
   * PO chose EVER, not chapter-scoped: *"a first means you had genuinely never done it."* The rejected
   * alternative would produce far more of them, but a lift done two years ago returning is not a first,
   * and calling it one makes the word softer every time it appears.
   *
   * ⚠ 1 · AN ATHLETE'S FIRST WEEK IS NOT A WEEK OF FIRSTS. With no history at all, EVERY exercise is a
   * first and the section becomes a twenty-row list of everything they did — which says nothing while
   * occupying the space of something that would. Gated on having trained before the window.
   *
   * ⚠ 2 · IDENTITY IS catalog_key OR THE NORMALISED NAME, AND A MATCH ON EITHER DISQUALIFIES. Custom
   * exercises carry no `catalog_key`, and the same movement can appear once keyed and once not. Erring
   * toward NOT calling something a first is the safe direction: a missed first is invisible, a false one
   * devalues every real one.
   *
   * ⚠ 3 · CAPPED AT SIX. This is a section on a review, not an audit log.
   */
  select exists (
    select 1 from public.workouts w
     where w.athlete_id = v_uid and w.saved_at < v_prev
  ) into v_trained_before;

  if v_trained_before then
    select coalesce(jsonb_agg(jsonb_build_object('exercise', f.label) order by f.label), '[]'::jsonb)
      into v_firsts
      from (
        select min(we.name) as label, we.catalog_key as ck, lower(btrim(we.name)) as nk
          from public.workout_exercises we
          join public.workouts w on w.id = we.workout_id
         where w.athlete_id = v_uid and w.saved_at >= v_prev and w.saved_at < v_start
         group by we.catalog_key, lower(btrim(we.name))
      ) f
     where not exists (
       select 1
         from public.workout_exercises we2
         join public.workouts w2 on w2.id = we2.workout_id
        where w2.athlete_id = v_uid
          and w2.saved_at < v_prev
          and ((f.ck is not null and we2.catalog_key = f.ck)
               or lower(btrim(we2.name)) = f.nk)
     )
     limit 6;
  end if;

  v_review := jsonb_build_object(
    'workouts', v_workouts,
    'days_trained', v_days,
    'volume_lb', round(v_volume),
    'duration_sec', v_seconds,
    'prs', v_prs,
    'honors', v_honors,
    'top_lift', v_top,
    -- ⚠ The four below did not exist before 0191. Reviews written earlier do not carry them and are
    -- never rewritten, so every reader must treat them as optional.
    'sessions', v_sessions,
    'first_time', v_firsts,
    'longest_session', v_longest
  );

  insert into public.athlete_weekly_reviews (athlete_id, week_start, week_end, review)
  values (v_uid, v_prev::date, (v_start - interval '1 day')::date, v_review)
  on conflict (athlete_id, week_start) do nothing;

  return jsonb_build_object('week_start', v_prev::date, 'week_end', (v_start - interval '1 day')::date, 'review', v_review, 'note', null);
end;
$$;

comment on function public.ensure_weekly_review() is
  'Writes and returns the athlete''s review for the week that just closed, or null when they did not train. Lazy and idempotent — the first call in a new week generates, every later one reads. Bucketed in profiles.tz, unlike 0057''s squad recap, because one athlete has one clock. ⚠ 0191 added sessions[], first_time[], longest_session and top_lift.day; snapshots are FROZEN, so reviews written before it do not carry them and every reader must treat all four as optional.';

revoke execute on function public.ensure_weekly_review() from public;
revoke execute on function public.ensure_weekly_review() from anon;
grant  execute on function public.ensure_weekly_review() to authenticated;

commit;
