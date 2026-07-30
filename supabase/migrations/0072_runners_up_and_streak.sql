-- Forge Legacy — 0072: runners-up on C-5, Longest Streak on C-4 (PD-7)
--
-- Two more spec-over-design calls reversed by product-owner ruling, recorded in
-- `Challenge-Architecture-Amendment-007-Runners-Up-And-Streak.md`:
--
--   C-5  `Hall-of-Champions-Wireframe-Spec-C5` §6/§12 — "Only winners are named. No 'runner-up'."
--        The design's card ends with a podium strip naming 2nd and 3rd. Design wins: `runners` returned.
--
--   C-4  `Challenge-Results-Wireframe-Spec-C4` §6.3 — "No squad-surface streak comparison (Firewall)."
--        The design's third Season Moment is Longest Streak. Design wins: computed and returned.
--
-- ON THE STREAK, A CORRECTION TO AN EARLIER CLAIM. Squad Records (0058) left Longest Streak out on the
-- grounds that "nothing tracks streaks: no table, no definition of what breaks one", and that reasoning was
-- carried forward here. It was overstated. A squad RECORD needs an all-time streak with a stable
-- definition across the athlete's whole history — that genuinely does not exist. A CHALLENGE streak is
-- bounded by the season, and inside a fixed window it is fully determined:
--
--   A day counts when the athlete saved at least one workout on it, in the challenge's own timezone
--   (`challenges.tz`, 0062). A streak is a maximal run of consecutive counting days. A day with no
--   session ends the run.
--
-- That is computed below by gaps-and-islands: subtract a per-athlete row number from the date, and
-- consecutive dates collapse to a constant group key. No new table, no stored state, and it cannot drift
-- because the window is closed.
--
-- Streaks of 1 are not reported. A single session is not a streak, and crowning someone for one would put
-- a "Longest Streak: 1 day" card on a finished season.
--
-- Depends on 0065 (challenge_results_detail), 0068 (squad_hall_of_champions), 0063 (metric_over).
-- Idempotent. RUN AFTER 0071.

-- ── C-5: name the runners-up ───────────────────────────────────────────────────
create or replace function public.squad_hall_of_champions(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_squad_member(p_squad, v_uid) then
    return null;
  end if;

  return jsonb_build_object(
    'squad_id',   p_squad,
    'squad_name', (select s.name from public.squads s where s.id = p_squad),
    'founded_at', (select s.created_at from public.squads s where s.id = p_squad),

    'entries', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key,
                 'end_at', c.end_at,
                 'field', (select count(*) from public.challenge_results r2 where r2.challenge_id = c.id),
                 'score', (
                   select max(r3.score) from public.challenge_results r3
                    where r3.challenge_id = c.id and r3.is_winner
                 ),
                 'champions', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'user_id', r.user_id, 'name', coalesce(p.name, 'Athlete'),
                              'avatar_url', p.avatar_url, 'is_self', r.user_id = v_uid
                            ) order by coalesce(p.name, 'Athlete'))
                     from public.challenge_results r
                     join public.profiles p on p.id = r.user_id
                    where r.challenge_id = c.id and r.is_winner
                 ), '[]'::jsonb),

                 -- The design's podium strip: 2nd and 3rd, named. Winners-only was the spec's rule and
                 -- is struck by CA7-D1 (PD-7). Still no "last" and no deficit — CC-D3 is untouched.
                 'runners', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'user_id', r.user_id, 'name', coalesce(p.name, 'Athlete'),
                              'place', r.place, 'is_self', r.user_id = v_uid
                            ) order by r.place, coalesce(p.name, 'Athlete'))
                     from public.challenge_results r
                     join public.profiles p on p.id = r.user_id
                    where r.challenge_id = c.id and not r.is_winner and r.place <= 3
                 ), '[]'::jsonb)
               ) order by c.end_at desc)
        from public.challenges c
       where c.squad_id = p_squad
         and c.state in ('COMPLETED', 'ARCHIVED')
         and exists (select 1 from public.challenge_results r where r.challenge_id = c.id and r.is_winner)
    ), '[]'::jsonb)
  );
end;
$$;

-- ── C-4: add the Longest Streak badge ─────────────────────────────────────────
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

    'standings', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'user_id', t.user_id, 'name', t.name, 'avatar_url', t.avatar_url,
                 'score', t.score, 'place', t.place, 'is_winner', t.is_winner,
                 'tied', t.shared > 1, 'is_self', t.user_id = v_uid
               ) order by t.place, t.name)
        from (
          select r.user_id, coalesce(p.name, 'Athlete') as name,
                 p.avatar_url, r.score, r.place, r.is_winner,
                 count(*) over (partition by r.place) as shared
            from public.challenge_results r
            join public.profiles p on p.id = r.user_id
           where r.challenge_id = c.id
        ) t
    ), '[]'::jsonb),

    'winners', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', r.user_id, 'name', coalesce(p.name, 'Athlete'),
               'avatar_url', p.avatar_url, 'score', r.score) order by coalesce(p.name, 'Athlete'))
        from public.challenge_results r
        join public.profiles p on p.id = r.user_id
       where r.challenge_id = c.id and r.is_winner
    ), '[]'::jsonb),

    'summary', jsonb_build_object(
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
      'athlete_days', (
        select count(*) from (
          select distinct w.athlete_id, (w.saved_at at time zone tz)::date as d
            from public.workouts w
           where w.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
             and w.saved_at >= c.start_at and w.saved_at < c.end_at
        ) x
      )
    ),

    'badges', (
      select coalesce(jsonb_agg(b.obj), '[]'::jsonb) from (

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

        union all

        -- LONGEST STREAK (CA7-D2, PD-7 — §6.3's Firewall bar struck).
        -- Gaps-and-islands: date minus a per-athlete row number is constant across consecutive days, so
        -- grouping on it counts each unbroken run. Bounded by the season, so the definition is complete
        -- and the value cannot drift after the close.
        select jsonb_build_object(
                 'kind', 'LONGEST_STREAK', 'user_id', st.user_id,
                 'name', coalesce(p.name, 'Athlete'), 'value', st.run) as obj
          from (
            select g.athlete_id as user_id, count(*) as run
              from (
                select d.athlete_id, d.day,
                       d.day - (row_number() over (partition by d.athlete_id order by d.day))::int as grp
                  from (
                    select distinct w.athlete_id, (w.saved_at at time zone tz)::date as day
                      from public.workouts w
                     where w.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
                       and w.saved_at >= c.start_at and w.saved_at < c.end_at
                  ) d
              ) g
             group by g.athlete_id, g.grp
             order by count(*) desc, g.athlete_id
             limit 1
          ) st
          join public.profiles p on p.id = st.user_id
         -- A single session is not a streak.
         where st.run > 1
      ) b
    )
  );
end;
$$;
