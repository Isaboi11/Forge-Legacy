-- Forge Legacy — 0064: the standings read (C-3)
--
-- `Forge Challenge.dc.html` is the destination for every competition tap in the app, and in the design
-- every number on it is a typed literal: `yourRank: '2nd'`, `raceLine: 'Marcus leads by 2 workouts'`,
-- `yourScore: '5'`. They happen to agree with the seed roster, but nothing computes them — change one
-- seed and the summary silently lies. This is the read that makes them true.
--
-- TIES ARE HANDLED. The design gives two athletes on 4 workouts ranks 3 and 4 purely from array order,
-- and hands the third-place treatment to whichever sorted first. `rank()` shares the place, and the
-- screen marks it — a tie that renders as a clean 3rd/4th is a wrong answer, not a tidy one.
--
-- MOMENTUM IS POSITIVE-ONLY (CS-D3). The design carries a `stale` flag that greys out athletes who have
-- gone quiet, which is a soft failure marker on a leaderboard. What's returned instead is `recent` —
-- what you've added in the last 7 days — and the screen shows it only when it's above zero. Nobody is
-- ever annotated for absence; they simply have nothing extra next to their name.
--
-- Reuses `metric_over()` (0063) for the recent window, so "this week" is scored by exactly the same
-- rules as the challenge itself.
--
-- Depends on 0063. Idempotent. RUN AFTER 0063.

create or replace function public.challenge_detail(p_challenge uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.challenges%rowtype;
  tz    text;
  k     text;
begin
  if v_uid is null or not public.can_read_challenge(p_challenge, v_uid) then
    return null;
  end if;

  select * into c from public.challenges where id = p_challenge;
  if not found then
    return null;
  end if;

  k  := nullif(btrim(coalesce(c.metric_key, '')), '');
  tz := coalesce(nullif(btrim(c.tz), ''), 'UTC');
  begin
    perform now() at time zone tz;
  exception when others then
    tz := 'UTC';
  end;

  return jsonb_build_object(
    'id',          c.id,
    'name',        c.name,
    'description', c.description,
    'type',        c.type,
    'metric_key',  c.metric_key,
    'context',     c.context,
    'state',       c.state,
    'start_at',    c.start_at,
    'end_at',      c.end_at,
    'squad_id',    c.squad_id,
    'squad_name',  (select s.name from public.squads s where s.id = c.squad_id),
    'is_creator',  c.creator_id = v_uid,
    'i_joined',    exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = v_uid),

    'standings', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'user_id',     t.user_id,
                 'name',        t.name,
                 'avatar_url',  t.avatar_url,
                 'score',       t.score,
                 'place',       t.place,
                 -- Marked so the screen can say "T-3" rather than inventing an order between equals.
                 'tied',        t.tied,
                 'is_self',     t.user_id = v_uid,
                 'logged_today',t.logged_today,
                 'recent',      t.recent
               ) order by t.place, t.name)
        from (
          select
            cp.user_id,
            coalesce(p.name, 'Athlete') as name,
            p.avatar_url,
            public.challenge_score(c.id, cp.user_id) as score,
            rank() over (order by public.challenge_score(c.id, cp.user_id) desc) as place,
            count(*) over (partition by public.challenge_score(c.id, cp.user_id)) > 1 as tied,
            exists (
              select 1 from public.workouts w
               where w.athlete_id = cp.user_id
                 and (w.saved_at at time zone tz)::date = (now() at time zone tz)::date
            ) as logged_today,
            -- What they've added in the last 7 days, scored the same way the challenge is.
            public.metric_over(
              case c.type
                when 'GAIN_MAX_LIFT' then 'MAX_LIFT'
                when 'GAIN_VOLUME'   then 'MOST_VOLUME'
                when 'GAIN_REPS'     then 'MOST_REPS'
                when 'GAIN_DISTANCE' then 'DISTANCE_TOTAL'
                else c.type
              end,
              cp.user_id,
              greatest(c.start_at, now() - interval '7 days'),
              least(c.end_at, now()),
              k, tz
            ) as recent
          from public.challenge_participants cp
          join public.profiles p on p.id = cp.user_id
         where cp.challenge_id = c.id
        ) t
    ), '[]'::jsonb)
  );
end;
$$;
