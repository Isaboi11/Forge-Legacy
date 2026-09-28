-- 0233_squad_week_story.sql
--
-- ══ THE WEEKLY SUMMARY TELLS THE STORY OF THE WEEK ══
--
-- PO, 2026-09-28: "How can we make the squad summaries feel more emotionally … grabbing? Right now it's
-- just a list of things. How can we tell a story of the week? Shout people out? Help everyone feel amazing
-- that they contributed?" Approved mockup: https://claude.ai/artifact/C2coURw351Dggbq4eTSKYE
-- Governed by Docs/Squad-Architecture-Amendment-008 (amends SQ-D8).
--
-- 1. `squad_week_story(squad, from, to)` — the facts each member's shout-out is written from (workouts,
--    days, lb, miles, bests, honors, first week / comeback / best week, their piece of the squad goal),
--    plus the squad's together totals, last week's workout count and the goal's starting point. The
--    WORDS are written in the app (`src/domain/squad/week-story.ts`) so they can be tuned without SQL.
--    Internal only: execute is revoked from every client role; the recap generator calls it as owner.
-- 2. `ensure_weekly_recap` gains ONE key, `story`. Spliced from 0200's body programmatically — every
--    other line is byte-identical (see `migration-restatements.test.mjs`).
-- 3. `squad_recap_cheers` — the flame on each shout-out. One per (summary, person, cheerer); squad
--    members only; never on yourself.
-- 4. Backfill: summaries from the last 14 days get their story now, so the squad sees it this week.
--
-- ⚠ NO RANKING, STILL. Members are ordered by name. Nothing here scores or orders anyone by size.
-- ⚠ A summary that fails to build its story still posts (the function returns null on any error).

create or replace function public.squad_week_story(p_squad uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_sq       public.squads%rowtype;
  v_kind     text;
  v_goal_on  boolean := false;
  v_gfrom    timestamptz;
  v_before   numeric := null;
  v_members  jsonb;
  v_together jsonb;
  v_prev     int;
  v_lb       numeric;
  v_mi       numeric;
begin
  select * into v_sq from public.squads s where s.id = p_squad;
  if not found then
    return null;
  end if;

  v_kind := coalesce(v_sq.goal_metric_kind, 'workout_count');
  v_goal_on := v_sq.goal_target is not null and v_sq.goal_started_at is not null
               and (v_sq.goal_closed_at is null or v_sq.goal_closed_at >= p_from);
  v_gfrom := greatest(p_from, coalesce(v_sq.goal_started_at, p_from));

  -- Workouts the week BEFORE — the "↑ 5 on last week" line.
  select count(*)::int into v_prev
    from public.workouts w
    join public.squad_members sm on sm.user_id = w.athlete_id
   where sm.squad_id = p_squad and w.saved_at >= p_from - interval '7 days' and w.saved_at < p_from;

  -- The squad's together numbers, in lb and miles whatever each athlete logs in.
  select coalesce(sum(ws.weight * ws.reps * case when lower(coalesce(ws.weight_unit, 'lb')) = 'kg' then 2.20462 else 1 end), 0)
    into v_lb
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
    join public.squad_members sm on sm.user_id = w.athlete_id
   where sm.squad_id = p_squad and w.saved_at >= p_from and w.saved_at < p_to
     and ws.weight is not null and ws.reps is not null and ws.weight > 0 and ws.reps > 0;

  select coalesce(sum(w.distance * case lower(coalesce(w.distance_unit, 'mi'))
                                     when 'km' then 0.621371 when 'm' then 0.000621371 else 1 end), 0)
    into v_mi
    from public.workouts w
    join public.squad_members sm on sm.user_id = w.athlete_id
   where sm.squad_id = p_squad and w.saved_at >= p_from and w.saved_at < p_to and w.distance is not null;

  -- Where the squad goal stood BEFORE this week, so the bar can show the week's pieces on top of it.
  if v_goal_on then
    v_before := case v_kind
      when 'workout_count' then (
        select count(*) from public.workouts w
        join public.squad_members sm on sm.user_id = w.athlete_id
        where sm.squad_id = p_squad and w.saved_at >= v_sq.goal_started_at and w.saved_at < v_gfrom)
      when 'distance_total' then (
        select coalesce(sum(w.distance), 0) from public.workouts w
        join public.squad_members sm on sm.user_id = w.athlete_id
        where sm.squad_id = p_squad and w.distance is not null
          and (v_sq.goal_metric_key is null or w.activity_type::text = v_sq.goal_metric_key)
          and w.saved_at >= v_sq.goal_started_at and w.saved_at < v_gfrom)
      when 'volume_total' then (
        select coalesce(sum(ws.weight * ws.reps), 0) from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
        join public.squad_members sm on sm.user_id = w.athlete_id
        where sm.squad_id = p_squad and w.saved_at >= v_sq.goal_started_at and w.saved_at < v_gfrom)
      when 'time_total' then (
        select coalesce(sum(w.duration_sec), 0) / 3600.0 from public.workouts w
        join public.squad_members sm on sm.user_id = w.athlete_id
        where sm.squad_id = p_squad and w.saved_at >= v_sq.goal_started_at and w.saved_at < v_gfrom)
      when 'pr_count' then (
        select count(*) from public.personal_records pr
        join public.squad_members sm on sm.user_id = pr.athlete_id
        where sm.squad_id = p_squad and pr.achieved_on >= v_sq.goal_started_at::date and pr.achieved_on < v_gfrom::date)
      else 0
    end;
  end if;

  -- ══ EVERYONE WHO TRAINED — the facts each shout-out is written from ══
  -- One row per member with at least one workout in the window. Ordered by name only: SQ-D8 §4 (as
  -- amended by Squad-Architecture-Amendment-008) still forbids ranking anyone inside the summary.
  select coalesce(jsonb_agg(to_jsonb(m) order by m.name), '[]'::jsonb) into v_members
    from (
      select
        sm.user_id as id,
        coalesce(p.name, 'Athlete') as name,
        wk.workouts,
        wk.days,
        round(coalesce(vol.lb, 0))::int as lb,
        round(coalesce(wk.mi, 0)::numeric, 1) as mi,
        (sm.joined_at >= p_from) as new_to_squad,
        (hist.last_before is null) as first_ever,
        case when hist.last_before is not null
             then floor(extract(epoch from (wk.first_this - hist.last_before)) / 86400)::int end as gap_days,
        (hist.best_before is not null and wk.workouts > hist.best_before) as best_week,
        coalesce(prs.list, '[]'::jsonb) as prs,
        coalesce(hon.list, '[]'::jsonb) as honors,
        case when v_goal_on then round(coalesce(gc.val, 0)::numeric, 1) end as goal
      from public.squad_members sm
      join public.profiles p on p.id = sm.user_id
      join lateral (
        select count(*)::int as workouts,
               array_agg(distinct extract(isodow from w.saved_at)::int order by extract(isodow from w.saved_at)::int) as days,
               min(w.saved_at) as first_this,
               sum(w.distance * case lower(coalesce(w.distance_unit, 'mi'))
                                  when 'km' then 0.621371 when 'm' then 0.000621371 else 1 end) as mi
          from public.workouts w
         where w.athlete_id = sm.user_id and w.saved_at >= p_from and w.saved_at < p_to
      ) wk on wk.workouts > 0
      left join lateral (
        select sum(ws.weight * ws.reps * case when lower(coalesce(ws.weight_unit, 'lb')) = 'kg' then 2.20462 else 1 end) as lb
          from public.workout_sets ws
          join public.workout_exercises we on we.id = ws.workout_exercise_id
          join public.workouts w on w.id = we.workout_id
         where w.athlete_id = sm.user_id and w.saved_at >= p_from and w.saved_at < p_to
           and ws.weight is not null and ws.reps is not null and ws.weight > 0 and ws.reps > 0
      ) vol on true
      left join lateral (
        select (select max(w.saved_at) from public.workouts w
                 where w.athlete_id = sm.user_id and w.saved_at is not null and w.saved_at < p_from) as last_before,
               (select max(c.n) from (
                  select count(*) as n from public.workouts w
                   where w.athlete_id = sm.user_id and w.saved_at is not null and w.saved_at < p_from
                   group by date_trunc('week', w.saved_at)) c) as best_before
      ) hist on true
      left join lateral (
        select jsonb_agg(jsonb_build_object('exercise', pr.exercise, 'value',
                 case pr.measure_kind::text
                   when 'load'     then trim(to_char(pr.load_value, 'FM999999990.##')) || ' ' || coalesce(pr.load_unit, 'lb')
                   when 'time'     then to_char((pr.time_seconds || ' seconds')::interval, 'MI:SS')
                   when 'distance' then trim(to_char(pr.distance_value, 'FM999999990.##')) || ' ' || coalesce(pr.distance_unit, 'mi')
                   when 'reps'     then pr.reps_count || ' reps'
                   else ''
                 end) order by pr.achieved_on, pr.exercise) as list
          from public.personal_records pr
         where pr.athlete_id = sm.user_id and pr.achieved_on >= p_from::date and pr.achieved_on < p_to::date
      ) prs on true
      left join lateral (
        select jsonb_agg(h.display_name order by h.awarded_at) as list
          from public.honor_instances h
         where h.athlete_id = sm.user_id and h.awarded_at >= p_from and h.awarded_at < p_to
      ) hon on true
      left join lateral (
        select case v_kind
          when 'workout_count' then (
            select count(*)::numeric from public.workouts w
             where w.athlete_id = sm.user_id and w.saved_at >= v_gfrom and w.saved_at < p_to)
          when 'distance_total' then (
            select coalesce(sum(w.distance), 0) from public.workouts w
             where w.athlete_id = sm.user_id and w.distance is not null
               and (v_sq.goal_metric_key is null or w.activity_type::text = v_sq.goal_metric_key)
               and w.saved_at >= v_gfrom and w.saved_at < p_to)
          when 'volume_total' then (
            select coalesce(sum(ws.weight * ws.reps), 0) from public.workout_sets ws
              join public.workout_exercises we on we.id = ws.workout_exercise_id
              join public.workouts w on w.id = we.workout_id
             where w.athlete_id = sm.user_id and w.saved_at >= v_gfrom and w.saved_at < p_to)
          when 'time_total' then (
            select coalesce(sum(w.duration_sec), 0) / 3600.0 from public.workouts w
             where w.athlete_id = sm.user_id and w.saved_at >= v_gfrom and w.saved_at < p_to)
          when 'pr_count' then (
            select count(*)::numeric from public.personal_records pr
             where pr.athlete_id = sm.user_id and pr.achieved_on >= v_gfrom::date and pr.achieved_on < p_to::date)
          else 0
        end as val
      ) gc on true
      where sm.squad_id = p_squad
    ) m;

  -- ══ TRAINED TOGETHER — an accepted Train Together invite between two members, this week ══
  select coalesce(jsonb_agg(jsonb_build_object('a', t.a, 'b', t.b, 'day', t.day) order by t.day, t.a, t.b), '[]'::jsonb)
    into v_together
    from (
      select distinct
             least(coalesce(pa.name, 'Athlete'), coalesce(pb.name, 'Athlete')) as a,
             greatest(coalesce(pa.name, 'Athlete'), coalesce(pb.name, 'Athlete')) as b,
             extract(isodow from i.accepted_at)::int as day
        from public.workout_invites i
        join public.squad_members ma on ma.user_id = i.from_id and ma.squad_id = p_squad
        join public.squad_members mb on mb.user_id = i.to_id and mb.squad_id = p_squad
        join public.profiles pa on pa.id = i.from_id
        join public.profiles pb on pb.id = i.to_id
       where i.status = 'ACCEPTED' and i.accepted_at >= p_from and i.accepted_at < p_to
    ) t;

  return jsonb_build_object(
    'v',             1,
    'prev_workouts', v_prev,
    'lb',            round(v_lb)::bigint,
    'mi',            round(v_mi, 1),
    'goal_before',   case when v_goal_on then round(coalesce(v_before, 0), 1) end,
    'members',       v_members,
    'together',      v_together
  );
exception when others then
  -- The story is the extra; the recap is the record. A failure here must never stop the week's
  -- summary from being posted — it posts without a story, and the app shows the plain version.
  return null;
end;
$$;

revoke all on function public.squad_week_story(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- ── the flame on each shout-out ──
create table if not exists public.squad_recap_cheers (
  post_id    uuid not null references public.squad_posts (id) on delete cascade,
  to_id      uuid not null references public.profiles (id) on delete cascade,
  from_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, to_id, from_id),
  constraint squad_recap_cheers_not_self check (from_id <> to_id)
);

alter table public.squad_recap_cheers enable row level security;

drop policy if exists squad_recap_cheers_select on public.squad_recap_cheers;
create policy squad_recap_cheers_select on public.squad_recap_cheers for select
  using (exists (
    select 1 from public.squad_posts sp
     where sp.id = squad_recap_cheers.post_id and public.is_squad_member(sp.squad_id, auth.uid())
  ));

drop policy if exists squad_recap_cheers_insert on public.squad_recap_cheers;
create policy squad_recap_cheers_insert on public.squad_recap_cheers for insert
  with check (
    from_id = auth.uid()
    and to_id <> auth.uid()
    and exists (
      select 1 from public.squad_posts sp
       where sp.id = squad_recap_cheers.post_id and sp.type = 'weekly'
         and public.is_squad_member(sp.squad_id, auth.uid())
         and public.is_squad_member(sp.squad_id, squad_recap_cheers.to_id)
    )
  );

drop policy if exists squad_recap_cheers_delete on public.squad_recap_cheers;
create policy squad_recap_cheers_delete on public.squad_recap_cheers for delete
  using (from_id = auth.uid());

grant select, insert, delete on public.squad_recap_cheers to authenticated;

create or replace function public.ensure_weekly_recap(p_squad uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_start   timestamptz := date_trunc('week', now());   -- Postgres weeks start Monday
  v_prev    timestamptz := date_trunc('week', now()) - interval '7 days';
  v_sq      public.squads%rowtype;
  v_id      uuid;
  v_total   int;
  v_active  int;
  v_workouts int;
  v_prs     jsonb;
  v_honors  jsonb;
  v_goal    jsonb := null;
  v_delta   numeric;
begin
  if v_uid is null or not public.is_squad_member(p_squad, v_uid) then
    return null;
  end if;

  -- Already generated for the week that just ended? Nothing to do.
  select id into v_id
    from public.squad_posts
   where squad_id = p_squad and type = 'weekly' and recap_week = v_prev::date
   limit 1;
  if found then
    return v_id;
  end if;

  select * into v_sq from public.squads where id = p_squad;
  if not found then
    return null;
  end if;

  -- The window is the PRIOR seven days — the week that just closed, not the one in progress.
  select count(*)::int into v_total from public.squad_members where squad_id = p_squad;

  select count(*)::int into v_workouts
    from public.workouts w
    join public.squad_members sm on sm.user_id = w.athlete_id
   where sm.squad_id = p_squad and w.saved_at >= v_prev and w.saved_at < v_start;

  select count(distinct w.athlete_id)::int into v_active
    from public.workouts w
    join public.squad_members sm on sm.user_id = w.athlete_id
   where sm.squad_id = p_squad and w.saved_at >= v_prev and w.saved_at < v_start;

  -- A week where nobody trained isn't a summary worth posting — silence beats "0 sessions".
  if v_workouts = 0 then
    return null;
  end if;

  -- PRs, named by member. No ordering by size: SQ-D8 §4 forbids ranking inside the summary.
  select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'exercise', x.exercise, 'value', x.value) order by x.name), '[]'::jsonb)
    into v_prs
    from (
      select coalesce(p.name, 'Athlete') as name,
             pr.exercise,
             case pr.measure_kind::text
               when 'load'     then trim(to_char(pr.load_value, 'FM999999990.##')) || ' ' || coalesce(pr.load_unit, 'lb')
               when 'time'     then to_char((pr.time_seconds || ' seconds')::interval, 'MI:SS')
               when 'distance' then trim(to_char(pr.distance_value, 'FM999999990.##')) || ' ' || coalesce(pr.distance_unit, 'mi')
               when 'reps'     then pr.reps_count || ' reps'
               else ''
             end as value
        from public.personal_records pr
        join public.squad_members sm on sm.user_id = pr.athlete_id
        join public.profiles p on p.id = pr.athlete_id
       where sm.squad_id = p_squad
         and pr.achieved_on >= v_prev::date and pr.achieved_on < v_start::date
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(p.name, 'Athlete'), 'honor', h.display_name) order by p.name), '[]'::jsonb)
    into v_honors
    from public.honor_instances h
    join public.squad_members sm on sm.user_id = h.athlete_id
    join public.profiles p on p.id = h.athlete_id
   where sm.squad_id = p_squad
     and h.awarded_at >= v_prev and h.awarded_at < v_start;

  -- Goal progress FOR THE WEEK: the same metric the squad's goal counts, measured over this window
  -- only. Reuses squad_metric_sum (0051) so the recap and the goal bar can't disagree.
  if v_sq.goal_target is not null and v_sq.goal_started_at is not null
     and (v_sq.goal_closed_at is null or v_sq.goal_closed_at >= v_prev) then
    v_delta := public.squad_metric_sum(
      p_squad,
      coalesce(v_sq.goal_metric_kind, 'workout_count'),
      v_sq.goal_metric_key,
      greatest(v_prev, v_sq.goal_started_at)
    );
    v_goal := jsonb_build_object(
      'title',  v_sq.goal,
      'kind',   coalesce(v_sq.goal_metric_kind, 'workout_count'),
      'delta',  round(coalesce(v_delta, 0), 1),
      'target', v_sq.goal_target
    );
  end if;

  insert into public.squad_posts (squad_id, author_id, type, body, recap_week, recap)
    values (
      p_squad,
      null,
      'weekly',
      null,
      v_prev::date,
      jsonb_build_object(
        'week_start',    v_prev,
        'week_end',      v_start,
        'workouts',      v_workouts,
        'participation', jsonb_build_object('active', v_active, 'total', v_total),
        'prs',           v_prs,
        'pr_count',      jsonb_array_length(v_prs),
        'honors',        v_honors,
        'honor_count',   jsonb_array_length(v_honors),
        'goal',          v_goal,
        -- 0233: the week as a story (Squad-Architecture-Amendment-008). Null when it cannot be built.
        'story',         public.squad_week_story(p_squad, v_prev, v_start)
      )
    )
    on conflict do nothing
    returning id into v_id;

  -- Lost the race to a concurrent caller — take theirs.
  if v_id is null then
    select id into v_id from public.squad_posts
     where squad_id = p_squad and type = 'weekly' and recap_week = v_prev::date limit 1;
  end if;

  return v_id;
end;
$$;

-- ── backfill: the last two weeks' summaries get their story now (idempotent — only where missing) ──
update public.squad_posts sp
   -- jsonb_strip_nulls: a story that could not be built adds nothing, rather than a JSON null that
   -- would read as "done" and never be retried.
   set recap = sp.recap || jsonb_strip_nulls(jsonb_build_object(
         'story', public.squad_week_story(sp.squad_id, (sp.recap->>'week_start')::timestamptz, (sp.recap->>'week_end')::timestamptz)))
 where sp.type = 'weekly'
   and sp.recap is not null
   and jsonb_typeof(sp.recap->'story') is distinct from 'object'
   and sp.recap_week >= current_date - 14;
