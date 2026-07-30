-- Forge Legacy — 0084: the Trophy Case (one athlete's competitive legacy)
--
-- The squad has a Hall of Champions (0068) and a set of Current Champions (0070). This is the personal
-- counterpart: every championship and podium finish ONE athlete has earned, across every squad they
-- compete in, with the career record behind it.
--
-- ══ WHY THIS IS AN RPC AND NOT `challenge_hub()` FILTERED IN THE CLIENT ══
--
-- `challenge_hub()` already returns the caller's own finished competitions with place, score and roster,
-- and for a self-only screen that would very nearly do. Three things it cannot give:
--
--   1. MARGIN. The design puts "86.4k lb · +4,200 lb" on every championship tile. The gap to the
--      runner-up requires reading OTHER athletes' final scores, which `challenge_results`' RLS policy
--      correctly refuses to a caller reading the table directly. It is computed here, definer-side, and
--      only ever as the champion's own winning margin — never as anyone's deficit (CC-D3).
--
--   2. ANOTHER ATHLETE. The design is entered from the profile, so it must work for someone who is not
--      you. `challenge_hub()` is hard-scoped to `auth.uid()`.
--
--   3. THE STREAK. Longest run of consecutive titles is a window over the athlete's whole ordered result
--      history, which the hub does not expose in an orderable form.
--
-- ══ WHAT A VIEWER MAY SEE ══
--
-- Two gates, doing two different jobs.
--
-- THE SCREEN is gated on the athlete's own `stats` visibility (0022 / 0069), default `squads`. A
-- competitive record is performance data — scores, volumes, lifts — so it belongs behind the same
-- audience control as workouts and PRs, and the Performance Firewall (CC-D2) is lifted for squad-mates
-- exactly as SQ-D2 intends. A stranger gets null: no screen, not an empty one.
--
-- EACH FINISH is gated on `can_read_challenge` (0059). A cleared viewer sees the athlete's TRUE totals
-- but only the finishes from competitions they can actually read — a championship won in a squad the
-- viewer isn't in stays unnamed. The alternative, filtering the totals too, would print "1 championship"
-- for someone who has six. Under-reporting on a screen titled Competitive Legacy is its own kind of lie,
-- so the counts are true and the detail is gated, with `withheld` saying plainly how many are missing.
--
-- For the owner the two sets are identical and `withheld` is always 0.
--
-- ══ NO RESULT, NO ROW ══
--
-- Everything here reads `challenge_results`, which `advance_challenges()` writes once at completion and
-- never rewrites (CS-D17). A cancelled season produces no result row (0067), so it can never appear in a
-- trophy case, and a workout backfilled into a closed season cannot move a trophy.
--
-- Depends on 0059 (challenge_results, can_read_challenge), 0069 (vis_clears), 0022 (visibility).
-- Idempotent. RUN AFTER 0083.

create or replace function public.athlete_trophy_case(p_athlete uuid default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  p        public.profiles%rowtype;
  v_clear  text;
  v_vis    jsonb;
  v_entered   int;
  v_titles    int;
  v_silvers   int;
  v_bronzes   int;
  v_podiums   int;
  v_visible   int;
  v_streak    int;
  v_first_yr  int;
  v_last_yr   int;
  v_best      text;
begin
  if v_uid is null then
    return null;
  end if;

  v_target := coalesce(p_athlete, v_uid);

  select * into p from public.profiles where id = v_target;
  if not found then
    return null;
  end if;

  v_clear := case
    when p.id = v_uid then 'owner'
    when exists (
      select 1
        from public.squad_members a
        join public.squad_members b on b.squad_id = a.squad_id
       where a.user_id = v_uid and b.user_id = v_target
    ) then 'squad'
    else 'stranger'
  end;

  v_vis := coalesce(p.visibility, '{}'::jsonb);

  -- Not cleared for this athlete's performance data: the record does not leave the server at all.
  if not public.vis_clears(coalesce(v_vis->>'stats', 'squads'), v_clear) then
    return null;
  end if;

  -- ── True career totals (ungated — counts only, no names, no squads, no scores) ──
  -- The medal tally is counted here rather than from the returned rows so it cannot disagree with the
  -- career grid when a viewer is cleared for the record but not for every competition in it.
  select count(*)::int,
         count(*) filter (where r.is_winner)::int,
         count(*) filter (where r.place = 2 and not r.is_winner)::int,
         count(*) filter (where r.place = 3 and not r.is_winner)::int,
         count(*) filter (where r.place <= 3)::int,
         count(*) filter (where r.place <= 3 and public.can_read_challenge(r.challenge_id, v_uid))::int
    into v_entered, v_titles, v_silvers, v_bronzes, v_podiums, v_visible
    from public.challenge_results r
   where r.user_id = v_target;

  select min(extract(year from c.end_at))::int, max(extract(year from c.end_at))::int
    into v_first_yr, v_last_yr
    from public.challenge_results r
    join public.challenges c on c.id = r.challenge_id
   where r.user_id = v_target;

  -- ── Longest run of consecutive titles ──
  -- Gaps-and-islands over the athlete's whole ordered result history: subtracting a partitioned row
  -- number from a global one gives every unbroken run of wins the same group key. Computed over the
  -- FULL set, like the totals, so a partially-cleared viewer never reads a shortened streak as the
  -- athlete's real one. Only ever a run of wins — there is no losing streak to compute (CC-D3).
  select coalesce(max(cnt), 0)::int into v_streak
    from (
      select count(*) as cnt
        from (
          select r.is_winner,
                 row_number() over (order by c.end_at, r.challenge_id)
               - row_number() over (partition by r.is_winner order by c.end_at, r.challenge_id) as grp
            from public.challenge_results r
            join public.challenges c on c.id = r.challenge_id
           where r.user_id = v_target
        ) x
       where x.is_winner
       group by x.grp
    ) y;

  -- ── Best event: the metric they have won most, then placed most. Null until there is an answer. ──
  select c.type into v_best
    from public.challenge_results r
    join public.challenges c on c.id = r.challenge_id
   where r.user_id = v_target and r.place <= 3
   group by c.type
   order by count(*) filter (where r.is_winner) desc, count(*) desc, c.type
   limit 1;

  return jsonb_build_object(
    'athlete_id', p.id,
    'name', p.name,
    'handle', p.handle,
    'initials', p.initials,
    'avatar_url', p.avatar_url,
    'is_self', p.id = v_uid,

    'entered', v_entered,
    'championships', v_titles,
    'silvers', v_silvers,
    'bronzes', v_bronzes,
    'podiums', v_podiums,
    -- How many podium finishes the viewer is NOT cleared to see. Always 0 for the owner.
    'withheld', greatest(0, v_podiums - v_visible),
    'title_streak', v_streak,
    'best_type', v_best,
    'first_year', v_first_yr,
    'last_year', v_last_yr,

    -- ── The finishes themselves: podium only, newest first, gated per competition ──
    'finishes', coalesce((
      select jsonb_agg(t.obj order by t.end_at desc)
        from (
          select c.end_at,
                 jsonb_build_object(
                   'challenge_id', c.id,
                   'name', c.name,
                   'type', c.type,
                   'metric_key', c.metric_key,
                   'context', c.context,
                   'squad_name', s.name,
                   'end_at', c.end_at,
                   'place', r.place,
                   'score', r.score,
                   'is_winner', r.is_winner,
                   'field', (select count(*)::int from public.challenge_results f where f.challenge_id = c.id),
                   -- Shared titles stay shared (CS-D15): the tile reads Co-Champion rather than
                   -- claiming a solo win, and every co-champion carries the same margin.
                   'co_winners', (select count(*)::int from public.challenge_results w
                                   where w.challenge_id = c.id and w.is_winner),
                   -- The gap to the next place down. Null when nobody finished below them, which is the
                   -- honest answer for a field where everyone tied. Never negative by construction.
                   'margin', (
                     select r.score - max(n.score)
                       from public.challenge_results n
                      where n.challenge_id = c.id and n.place > r.place
                   )
                 ) as obj
            from public.challenge_results r
            join public.challenges c on c.id = r.challenge_id
            left join public.squads s on s.id = c.squad_id
           where r.user_id = v_target
             and r.place <= 3
             and public.can_read_challenge(r.challenge_id, v_uid)
        ) t
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.athlete_trophy_case(uuid) is
  'One athlete''s championships and podium finishes. Screen gated on their `stats` visibility; each finish gated on can_read_challenge, so totals are true while detail stays scoped to the viewer.';
