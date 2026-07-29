-- Forge Legacy — 0065: the frozen result (C-4)
--
-- C-3 computes a live leaderboard. C-4 must NOT: `Challenge-Results-Wireframe-Spec-C4` §8 and CS-D17
-- make the result immutable — "later imported history never alters them". So every standing here is
-- read from `challenge_results`, the row set `advance_challenges()` wrote once at completion, and never
-- from `challenge_score()`. If an athlete backfills a workout into a closed season next month, this
-- screen does not move. That is the whole point of the table.
--
-- CO-WINNERS ARE FIRST-CLASS (CS-D15). `challenge_results.place` comes from `rank()`, so a tie at the
-- top produces several rows at place 1, each with `is_winner`. The design renders `FINAL[0]` — one
-- champion, always — which would silently drop a co-champion from their own victory. `winners` is an
-- array here, and the screen is built to render more than one.
--
-- CANCELLED NEVER REACHES C-4 (§8). A cancelled challenge has no result, and returning null for any
-- state outside COMPLETED/ARCHIVED enforces that in the database rather than trusting the caller.
--
-- WHAT IS NOT HERE, DELIBERATELY:
--   · No honor rows. `Honor-Catalog-Amendment-001`'s ChallengeEvaluator and HonorInstance do not exist
--     in this schema yet, so there is nothing truthful to return. The design names a specific earned
--     honor ("Forge League — Silver", "Added to your Legacy · tap to view"); shipping that against an
--     unbuilt Honors backend would be a claim the app cannot honour.
--   · No streak comparison. §6.3 is explicit: participation streaks are personal stats feeding honors,
--     with "no squad-surface streak comparison (Firewall)". The design's "Longest Streak" card is
--     precisely that surface, so it is not computed and not returned.
--
-- Depends on 0063 (metric_over) + 0059 (challenge_results). Idempotent. RUN AFTER 0064.

create or replace function public.challenge_results_detail(p_challenge uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  c       public.challenges%rowtype;
  tz      text;
  k       text;
  v_mid   timestamptz;
  v_base  text;
  v_gain  boolean;
  v_field int;
begin
  if v_uid is null or not public.can_read_challenge(p_challenge, v_uid) then
    return null;
  end if;

  select * into c from public.challenges where id = p_challenge;
  -- A season that never closed has no final standings to show.
  if not found or c.state not in ('COMPLETED', 'ARCHIVED') then
    return null;
  end if;

  k  := nullif(btrim(coalesce(c.metric_key, '')), '');
  tz := coalesce(nullif(btrim(c.tz), ''), 'UTC');
  begin
    perform now() at time zone tz;
  exception when others then
    tz := 'UTC';
  end;

  v_base := case c.type
    when 'GAIN_MAX_LIFT' then 'MAX_LIFT'
    when 'GAIN_VOLUME'   then 'MOST_VOLUME'
    when 'GAIN_REPS'     then 'MOST_REPS'
    when 'GAIN_DISTANCE' then 'DISTANCE_TOTAL'
    else c.type
  end;
  v_gain := v_base <> c.type;
  v_mid  := c.start_at + (c.end_at - c.start_at) / 2;

  select count(*) into v_field from public.challenge_results r where r.challenge_id = c.id;

  return jsonb_build_object(
    'id', c.id, 'name', c.name, 'description', c.description,
    'type', c.type, 'metric_key', c.metric_key, 'context', c.context, 'state', c.state,
    'start_at', c.start_at, 'end_at', c.end_at,
    'squad_id', c.squad_id,
    'squad_name', (select s.name from public.squads s where s.id = c.squad_id),
    'field', v_field,

    -- ── Final standings — frozen, everyone, ranked (§5: no truncation, no withdrawals) ──
    'standings', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'user_id', t.user_id, 'name', t.name, 'avatar_url', t.avatar_url,
                 'score', t.score, 'place', t.place, 'is_winner', t.is_winner,
                 'tied', t.shared > 1, 'is_self', t.user_id = v_uid
               ) order by t.place, t.name)
        from (
          select r.user_id,
                 coalesce(p.name, 'Athlete') as name,
                 p.avatar_url, r.score, r.place, r.is_winner,
                 count(*) over (partition by r.place) as shared
            from public.challenge_results r
            join public.profiles p on p.id = r.user_id
           where r.challenge_id = c.id
        ) t
    ), '[]'::jsonb),

    -- CS-D15: every athlete at place 1, not just the first one sorted.
    'winners', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', r.user_id, 'name', coalesce(p.name, 'Athlete'),
               'avatar_url', p.avatar_url, 'score', r.score) order by coalesce(p.name, 'Athlete'))
        from public.challenge_results r
        join public.profiles p on p.id = r.user_id
       where r.challenge_id = c.id and r.is_winner
    ), '[]'::jsonb),

    -- ── The season, in aggregate. Every figure below is counted, none estimated. ──
    'summary', jsonb_build_object(
      -- Summing personal bests would be meaningless, so a max-lift field reports its best single lift.
      'total', case when c.type in ('MAX_LIFT', 'GAIN_MAX_LIFT')
        then (select coalesce(max(r.score), 0) from public.challenge_results r where r.challenge_id = c.id)
        else (select coalesce(sum(r.score), 0) from public.challenge_results r where r.challenge_id = c.id)
      end,
      'athletes', v_field,
      'prs', (
        select count(*) from public.personal_records pr
         where pr.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
           and pr.achieved_on >= c.start_at::date and pr.achieved_on < c.end_at::date
      ),
      -- Athlete-days: one athlete training on ten days contributes ten. A field-level total, never a
      -- per-athlete comparison, so §6.3's Firewall line is not crossed.
      'athlete_days', (
        select count(*) from (
          select distinct w.athlete_id, (w.saved_at at time zone tz)::date as d
            from public.workouts w
           where w.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
             and w.saved_at >= c.start_at and w.saved_at < c.end_at
        ) x
      )
    ),

    -- ── Derived badges (§6.1, CC-D4: squad-scoped, positive only) ──
    -- Both are earned distinctions, computed at read time and never stored. Either can be absent when
    -- there is no honest answer — an unanimated season simply shows no badges.
    'badges', (
      select coalesce(jsonb_agg(b.obj), '[]'::jsonb) from (

        -- Most days trained during the season. Requires more than one day, so a one-session field
        -- doesn't crown somebody for showing up once.
        select jsonb_build_object(
                 'kind', 'MOST_CONSISTENT', 'user_id', t.user_id,
                 'name', coalesce(p.name, 'Athlete'), 'value', t.days) as obj
          from (
            select w.athlete_id as user_id,
                   count(distinct (w.saved_at at time zone tz)::date) as days
              from public.workouts w
             where w.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
               and w.saved_at >= c.start_at and w.saved_at < c.end_at
             group by w.athlete_id
             order by days desc, w.athlete_id
             limit 1
          ) t
          join public.profiles p on p.id = t.user_id
         where t.days > 1

        union all

        -- Biggest climb from the halfway standings to the final ones. Positive by construction: the
        -- `>= 1` filter means only a rise is ever reported, never a slide.
        select jsonb_build_object(
                 'kind', 'BIGGEST_CLIMB', 'user_id', m.user_id,
                 'name', coalesce(p.name, 'Athlete'), 'value', m.climb) as obj
          from (
            select r.user_id, (mid.mp - r.place) as climb
              from public.challenge_results r
              join (
                select r2.user_id,
                       rank() over (order by
                         case when v_gain then greatest(0,
                           public.metric_over(v_base, r2.user_id, c.start_at, v_mid, k, tz)
                           - public.metric_over(v_base, r2.user_id, c.start_at - (v_mid - c.start_at), c.start_at, k, tz))
                         else public.metric_over(v_base, r2.user_id, c.start_at, v_mid, k, tz) end
                       desc) as mp
                  from public.challenge_results r2
                 where r2.challenge_id = c.id
              ) mid on mid.user_id = r.user_id
             where r.challenge_id = c.id
             order by climb desc, r.place
             limit 1
          ) m
          join public.profiles p on p.id = m.user_id
         where m.climb >= 1
      ) b
    )
  );
end;
$$;
