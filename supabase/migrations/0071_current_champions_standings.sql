-- Forge Legacy — 0071: Current Champions carries scores and standings (PD-7)
--
-- Supersedes 0070's recognition-only shape. `Current-Champions-Wireframe-Spec-C7` §7/§9/§12 said
-- "recognition only — no scores, no ranks, no leaderboard"; `Forge Current Champions.dc.html` prints the
-- champion's value on every tile and opens a standings sheet with the whole field. Under **PD-7 the design
-- governs and the docs are corrected**, and the product owner has ruled for the design. C-7's spec is
-- amended by `Challenge-Architecture-Amendment-006-Current-Champions-Standings.md`; this is the read that
-- backs it.
--
-- WHAT THIS ADDS: `score` + `unit_type` per title, and a `standings` array per title — every finisher with
-- place, score and an is-self flag, ranked. That is the design's sheet.
--
-- WHY IT IS DEFENSIBLE ON THE DATA SIDE. These numbers are not new disclosures: every one is already
-- readable by the same viewer on C-3 (live) and C-4 (frozen), both gated by the same
-- `can_read_challenge` roster rule. This changes WHERE a squad member sees standings they could already
-- reach, not WHO can see them. No new athlete gains access to anything.
--
-- THE ANTI-SHAME FLOOR STILL HOLDS, because it is not the spec line being amended: places are places,
-- there is no "last" label, no deficit framing, no dethroned-former-champion copy, and a cancelled
-- season still never appears. CC-D3 is untouched — what moved is the recognition-only restriction, which
-- was a placement rule about which surface may show standings, not an anti-shame rule.
--
-- Reads frozen `challenge_results`, never `challenge_score` — a title's standings are the immutable
-- result of the season that awarded it (CS-D14/D17), so they cannot drift after the fact.
--
-- Depends on 0070 (replaces its function). Idempotent. RUN AFTER 0070.

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
                 'field', (select count(*) from public.challenge_results r where r.challenge_id = t.id),

                 -- The winning score, for the tile.
                 'score', (
                   select max(r.score) from public.challenge_results r
                    where r.challenge_id = t.id and r.is_winner
                 ),

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
                 ), '[]'::jsonb),

                 -- The design's standings sheet: the full field for the season that awarded this title.
                 'standings', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'user_id', x.user_id,
                              'name', x.name,
                              'avatar_url', x.avatar_url,
                              'score', x.score,
                              'place', x.place,
                              'tied', x.shared > 1,
                              'is_winner', x.is_winner,
                              'is_self', x.user_id = v_uid
                            ) order by x.place, x.name)
                     from (
                       select r.user_id, coalesce(pr.name, 'Athlete') as name, pr.avatar_url,
                              r.score, r.place, r.is_winner,
                              count(*) over (partition by r.place) as shared
                         from public.challenge_results r
                         join public.profiles pr on pr.id = r.user_id
                        where r.challenge_id = t.id
                     ) x
                 ), '[]'::jsonb)
               ) order by t.end_at desc)
        from (
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
