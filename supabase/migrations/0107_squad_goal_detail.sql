-- Forge Legacy — 0107: the Squad Goal Detail screen's data
--
-- ══ WHAT EXISTED ══
--
-- One scalar. `squad_metric_total` returns the squad's aggregate figure, which is exactly enough to draw
-- the Current Goal card on S-2 and nothing more. `Squad Goal Detail.dc.html` asks five further questions:
-- who contributed what, how the last eight weeks went, which milestones have been crossed and when, what
-- moved the number recently, and what happened to the goals before this one.
--
-- ══ THE ONE THIS MIGRATION EXISTS TO FIX ══
--
-- 0103's own header records the defect and declines to fix it, correctly, because the fix did not belong
-- in the function it was writing:
--
--     "on an EXPIRED squad goal a member's 'your contribution' line keeps counting past the deadline
--      while the squad total is frozen. Fixing that wants a squad-scoped function of its own, not a
--      change to the shared one."
--
-- `goal_metric_value` (0039) computes the signed-in athlete's own figure and is SHARED with the personal
-- Goals system, including body-composition readings that are deliberately unwindowed. Bounding it there
-- would reach outside squads and change how personal goals score. So this is that squad-scoped function:
-- `squad_member_contributions` applies the SAME window as `squad_metric_sum` — `goal_started_at` to
-- `squad_goal_window_end` — per member. A screen that puts your figure next to the squad's would have
-- surfaced that mismatch on day one, as two numbers that cannot both be true.
--
-- ══ ACCESS ══
--
-- Every function here is `security definer`, so every one carries the gate `squad_metric_sum` carries:
-- a member of the squad, or a public squad. 0101 had to retrofit exactly this onto `archive_squad_goal`
-- after it became a disclosure oracle over private squads — a definer function without a caller check is
-- a read of somebody else's data wearing the owner's permissions.
--
-- ⚠ PL/pgSQL and SQL functions resolve column references at RUN time. Applying this proves nothing.
-- After applying: open a squad's goal card and check the numbers add up.
--
-- Depends on 0031, 0036, 0039, 0051, 0099, 0103. Idempotent. RUN AFTER 0106.

begin;

-- ── per-member contribution, windowed exactly as the squad total is ──────────
--
-- Mirrors `squad_metric_sum` branch for branch — same five kinds, same predicates — differing only in
-- grouping by athlete instead of summing across them. The two must agree: if the per-member figures did
-- not add up to the total on the same screen, one of them would be lying and the athlete would have no
-- way to know which.
create or replace function public.squad_member_contributions(p_squad uuid)
returns table (athlete_id uuid, name text, handle text, avatar_url text, value numeric)
language sql
security definer
stable
set search_path = public
as $$
  with gate as (
    select public.is_squad_member(p_squad, auth.uid())
        or exists (select 1 from public.squads s where s.id = p_squad and s.privacy = 'public') as ok
  ),
  g as (
    select coalesce(s.goal_metric_kind, 'workout_count') as kind,
           s.goal_metric_key                             as key,
           coalesce(s.goal_started_at, '-infinity'::timestamptz) as from_at,
           public.squad_goal_window_end(p_squad)         as to_at
      from public.squads s where s.id = p_squad
  ),
  roster as (
    select sm.user_id from public.squad_members sm where sm.squad_id = p_squad
  ),
  vals as (
    select r.user_id as uid,
           case (select kind from g)
             when 'workout_count' then coalesce((
               select count(*) from public.workouts w
                where w.athlete_id = r.user_id
                  and w.saved_at >= (select from_at from g) and w.saved_at < (select to_at from g)
             ), 0)
             when 'distance_total' then coalesce((
               select sum(w.distance) from public.workouts w
                where w.athlete_id = r.user_id and w.distance is not null
                  and ((select key from g) is null or w.activity_type::text = (select key from g))
                  and w.saved_at >= (select from_at from g) and w.saved_at < (select to_at from g)
             ), 0)
             when 'volume_total' then coalesce((
               select sum(ws.weight * ws.reps)
                 from public.workout_sets ws
                 join public.workout_exercises we on we.id = ws.workout_exercise_id
                 join public.workouts w on w.id = we.workout_id
                where w.athlete_id = r.user_id
                  and w.saved_at >= (select from_at from g) and w.saved_at < (select to_at from g)
             ), 0)
             when 'time_total' then coalesce((
               select sum(w.duration_sec) from public.workouts w
                where w.athlete_id = r.user_id
                  and w.saved_at >= (select from_at from g) and w.saved_at < (select to_at from g)
             ), 0) / 3600.0
             -- `personal_records.achieved_on` is a DATE, so its bound is a date too (0103's own note).
             when 'pr_count' then coalesce((
               select count(*) from public.personal_records pr
                where pr.athlete_id = r.user_id
                  and pr.achieved_on >= (select from_at from g)::date
                  and pr.achieved_on < (select to_at from g)::date + 1
             ), 0)
             else 0
           end as value
      from roster r
  )
  select v.uid, p.name, p.handle::text, p.avatar_url, v.value
    from vals v
    join public.profiles p on p.id = v.uid
   where (select ok from gate)
   order by v.value desc, p.name asc;
$$;

grant execute on function public.squad_member_contributions(uuid) to authenticated;

comment on function public.squad_member_contributions(uuid) is
  'Per-member contribution to the squad''s current goal, windowed identically to squad_metric_sum. The squad-scoped counterpart 0103 asked for: goal_metric_value is shared with personal Goals and cannot be bounded there.';


-- ── the last N weeks of the goal metric, squad-wide ──────────────────────────
-- Weeks are generated rather than derived from the data so a quiet week is a ZERO rather than a gap. A
-- rhythm chart that silently omits the week nobody trained is a chart about a different squad.
create or replace function public.squad_goal_weeks(p_squad uuid, p_weeks int default 8)
returns table (week_start timestamptz, value numeric)
language sql
security definer
stable
set search_path = public
as $$
  with gate as (
    select public.is_squad_member(p_squad, auth.uid())
        or exists (select 1 from public.squads s where s.id = p_squad and s.privacy = 'public') as ok
  ),
  g as (
    select coalesce(s.goal_metric_kind, 'workout_count') as kind,
           s.goal_metric_key as key,
           public.squad_goal_window_end(p_squad) as to_at
      from public.squads s where s.id = p_squad
  ),
  weeks as (
    select date_trunc('week', (select to_at from g)) - (make_interval(weeks => n)) as ws
      from generate_series(greatest(0, p_weeks) - 1, 0, -1) n
  )
  select w.ws,
         case (select kind from g)
           when 'distance_total' then coalesce((
             select sum(x.distance) from public.workouts x
              join public.squad_members sm on sm.user_id = x.athlete_id
              where sm.squad_id = p_squad and x.distance is not null
                and ((select key from g) is null or x.activity_type::text = (select key from g))
                and x.saved_at >= w.ws and x.saved_at < w.ws + interval '7 days'
                and x.saved_at < (select to_at from g)
           ), 0)
           when 'volume_total' then coalesce((
             select sum(ws2.weight * ws2.reps)
               from public.workout_sets ws2
               join public.workout_exercises we2 on we2.id = ws2.workout_exercise_id
               join public.workouts x on x.id = we2.workout_id
               join public.squad_members sm on sm.user_id = x.athlete_id
              where sm.squad_id = p_squad
                and x.saved_at >= w.ws and x.saved_at < w.ws + interval '7 days'
                and x.saved_at < (select to_at from g)
           ), 0)
           when 'time_total' then coalesce((
             select sum(x.duration_sec) from public.workouts x
              join public.squad_members sm on sm.user_id = x.athlete_id
              where sm.squad_id = p_squad
                and x.saved_at >= w.ws and x.saved_at < w.ws + interval '7 days'
                and x.saved_at < (select to_at from g)
           ), 0) / 3600.0
           when 'pr_count' then coalesce((
             select count(*) from public.personal_records pr
              join public.squad_members sm on sm.user_id = pr.athlete_id
              where sm.squad_id = p_squad
                and pr.achieved_on >= w.ws::date and pr.achieved_on < (w.ws + interval '7 days')::date
                and pr.achieved_on < (select to_at from g)::date + 1
           ), 0)
           else coalesce((
             select count(*) from public.workouts x
              join public.squad_members sm on sm.user_id = x.athlete_id
              where sm.squad_id = p_squad
                and x.saved_at >= w.ws and x.saved_at < w.ws + interval '7 days'
                and x.saved_at < (select to_at from g)
           ), 0)
         end
    from weeks w
   where (select ok from gate)
   order by w.ws asc;
$$;

grant execute on function public.squad_goal_weeks(uuid, int) to authenticated;


-- ── everything the screen renders, in one round trip ─────────────────────────
-- One call, following `template_detail` (0095). A screen that made five is five chances for one of them
-- to fail alone and leave a page that is partly about a goal.
create or replace function public.squad_goal_detail(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  s     public.squads%rowtype;
  v_ok  boolean;
  v_total numeric;
begin
  select * into s from public.squads where id = p_squad;
  if not found then
    return null;
  end if;

  v_ok := public.is_squad_member(p_squad, v_uid) or s.privacy = 'public';
  if not v_ok then
    return null; -- not an error: "you cannot see this" and "this does not exist" answer the same way
  end if;

  v_total := public.squad_metric_sum(p_squad, coalesce(s.goal_metric_kind, 'workout_count'), s.goal_metric_key, s.goal_started_at);

  return jsonb_build_object(
    'squadId', s.id,
    'squadName', s.name,
    'goal', s.goal,
    'target', s.goal_target,
    'metricKind', coalesce(s.goal_metric_kind, 'workout_count'),
    'metricKey', s.goal_metric_key,
    'startedAt', s.goal_started_at,
    'endsAt', s.goal_ends_at,
    'total', v_total,
    'isOwner', s.owner_id = v_uid,
    'memberCount', (select count(*) from public.squad_members m where m.squad_id = p_squad),
    'contributions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'athleteId', c.athlete_id, 'name', c.name, 'handle', c.handle,
               'avatarUrl', c.avatar_url, 'value', c.value,
               'isSelf', c.athlete_id = v_uid))
        from public.squad_member_contributions(p_squad) c
    ), '[]'::jsonb),
    'weeks', coalesce((
      select jsonb_agg(jsonb_build_object('weekStart', w.week_start, 'value', w.value) order by w.week_start)
        from public.squad_goal_weeks(p_squad, 8) w
    ), '[]'::jsonb),
    -- What moved the number, most recent first. Names the member and the session, because "+1" with
    -- nobody attached to it is a counter, not a record of anybody's work.
    'events', coalesce((
      select jsonb_agg(e order by e->>'at' desc)
        from (
          select jsonb_build_object(
                   'workoutId', w.id, 'at', w.saved_at, 'who', p.name,
                   'isSelf', w.athlete_id = v_uid, 'name', w.workout_name,
                   'distance', w.distance, 'durationSec', w.duration_sec) as e
            from public.workouts w
            join public.squad_members sm on sm.user_id = w.athlete_id
            join public.profiles p on p.id = w.athlete_id
           where sm.squad_id = p_squad
             and w.saved_at >= coalesce(s.goal_started_at, '-infinity'::timestamptz)
             and w.saved_at < public.squad_goal_window_end(p_squad)
           order by w.saved_at desc
           limit 8
        ) t
    ), '[]'::jsonb),
    -- The goals before this one. Read from `squad_goal_completions`, which has banked every MET goal
    -- since 0099 and which, until this screen, nothing in the app had ever read.
    'past', coalesce((
      select jsonb_agg(jsonb_build_object(
               'goal', h.goal, 'target', h.target, 'metricKind', h.metric_kind,
               'startedAt', h.started_at, 'completedAt', h.completed_at) order by h.completed_at desc)
        from public.squad_goal_completions h where h.squad_id = p_squad
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.squad_goal_detail(uuid) to authenticated;

comment on function public.squad_goal_detail(uuid) is
  'Everything Squad Goal Detail renders, in one round trip: the goal, the squad total, per-member contributions, an 8-week series, recent contributing sessions, and past completed goals. Member-or-public gated.';

commit;

-- ── VERIFY (run these; applying proves nothing) ─────────────────────────────
--   -- 1. the per-member figures add up to the squad total
--   select sum(value) from public.squad_member_contributions('<squad-uuid>');
--   select public.squad_metric_sum('<squad-uuid>', 'workout_count', null,
--          (select goal_started_at from public.squads where id = '<squad-uuid>'));
--   -- expect the same number
--
--   -- 2. eight weeks come back, quiet ones as zeros rather than missing rows
--   select count(*) from public.squad_goal_weeks('<squad-uuid>', 8);   -- expect 8
--
--   -- 3. a non-member gets null, not somebody else's squad
--   select public.squad_goal_detail('<a-private-squad-you-are-not-in>');  -- expect null
