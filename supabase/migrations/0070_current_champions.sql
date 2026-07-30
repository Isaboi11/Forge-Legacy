-- Forge Legacy — 0070: Current Champions (C-7, CS-D20)
--
-- Who currently holds each title in this squad. One holder per challenge type: the winner of the most
-- recently completed challenge of that type — the "Defending Champion projection" (CS-D16/D20).
--
-- NO SCORES ARE RETURNED, AND THAT IS THE SPEC, NOT AN OMISSION.
-- `Current-Champions-Wireframe-Spec-C7` §7 says "No score read (recognition only)", and both the §9
-- Firewall checklist and the §12 validation list repeat it: "Recognition only — no scores/ranks/
-- leaderboard on C-7". The design does the opposite — its tiles print the champion's value and unit, and
-- tapping one opens a sheet with the full standings, names and numbers. That sheet is a leaderboard on a
-- permanent recognition surface, which is the one thing this screen may not be: a wall of champions that
-- also ranks everybody turns recognition into a standing comparison table. Scores live on C-3 (live) and
-- C-4 (frozen), and a tile routes to C-4 — so the number is one tap away, in the place that owns it.
--
-- Because of that, `challenge_score` is never called here and no score column is selected.
--
-- DEPARTED CHAMPIONS ARE RETAINED UNTIL SUPERSEDED (§12). The join is on `profiles`, not on current
-- squad membership: you held the title when you won it, and only the next winner of that type takes it.
--
-- EMPTY CATEGORIES ARE ABSENT (§12), not rendered as vacant tiles. A type this squad has never finished a
-- challenge in simply has no title yet, and an empty "Most Volume — nobody" tile would be an invitation
-- to notice an absence.
--
-- CO-CHAMPIONS (CS-D15) share a title, consistent with C-4, C-5 and the podium.
--
-- CANCELLED never appears: no result rows, and the state filter excludes it.
--
-- Depends on 0059. Idempotent. RUN ANY TIME after 0059.

create or replace function public.squad_current_champions(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Squad-scoped (§10): any member may view, no public or cross-squad path exists.
  if v_uid is null or not public.is_squad_member(p_squad, v_uid) then
    return null;
  end if;

  return jsonb_build_object(
    'squad_id',   p_squad,
    'squad_name', (select s.name from public.squads s where s.id = p_squad),

    'titles', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'type', t.type,
                 'metric_key', t.metric_key,
                 'challenge_id', t.id,
                 'challenge_name', t.name,
                 'won_at', t.end_at,
                 'champions', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'user_id', r.user_id,
                              'name', coalesce(pr.name, 'Athlete'),
                              'avatar_url', pr.avatar_url,
                              'is_self', r.user_id = v_uid
                            ) order by coalesce(pr.name, 'Athlete'))
                     from public.challenge_results r
                     join public.profiles pr on pr.id = r.user_id
                    where r.challenge_id = t.id and r.is_winner
                 ), '[]'::jsonb)
               ) order by t.end_at desc)
        from (
          -- One row per type: the latest completed challenge of that type that actually crowned somebody.
          select distinct on (c.type)
                 c.id, c.type, c.metric_key, c.name, c.end_at
            from public.challenges c
           where c.squad_id = p_squad
             and c.state in ('COMPLETED', 'ARCHIVED')
             and exists (select 1 from public.challenge_results r where r.challenge_id = c.id and r.is_winner)
           order by c.type, c.end_at desc
        ) t
    ), '[]'::jsonb)
  );
end;
$$;
