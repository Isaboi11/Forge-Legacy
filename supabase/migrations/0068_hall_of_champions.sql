-- Forge Legacy — 0068: Hall of Champions (C-5, CS-D18)
--
-- Every finished competition this squad has ever run, newest first, with its champion(s). A terminal
-- read over `challenge_results` — it feeds nothing and computes nothing live (CS-D14: results are frozen
-- snapshots, so a workout backfilled into a closed season can never rewrite the hall).
--
-- WINNERS ONLY, AND THAT IS A RULE NOT A SHORTCUT. `Hall-of-Champions-Wireframe-Spec-C5` §6 is explicit:
-- "Only winners are named. No 'runner-up,' no per-challenge loser, no 'X never won'" (CC-D3), repeated as
-- a validation item in §12. The design's card carries a "subtle podium" footer naming 2nd and 3rd, and
-- that is the one thing a browsable hall must not do — C-4 can show a full field because you opened one
-- specific result, but a scrollable list of every season that repeatedly names who came second becomes a
-- record of who kept losing. `field` is returned instead, so a card can say "5 competed" and name nobody.
--
-- CANCELLED SEASONS ARE ABSENT (§6.2) with no special-casing: a cancelled challenge never reaches
-- COMPLETED and never gets a result row, so both filters below exclude it for free.
--
-- DEPARTED WINNERS ARE KEPT (§6.3). The join is on `profiles`, not on current squad membership — someone
-- who won and later left is still the champion of that season. No de-emphasis, no removal.
--
-- CO-WINNERS ARE PLURAL (CS-D15), consistent with C-4 and the podium.
--
-- Depends on 0059. Idempotent. RUN ANY TIME after 0059.

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
  -- Squad-scoped (§10): any member may read, nobody outside has a path.
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
                 -- Field size, not a runner-up list. Says how big the win was without naming anybody.
                 'field', (select count(*) from public.challenge_results r2 where r2.challenge_id = c.id),
                 'score', (
                   select max(r3.score) from public.challenge_results r3
                    where r3.challenge_id = c.id and r3.is_winner
                 ),
                 'champions', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'user_id', r.user_id,
                              'name', coalesce(p.name, 'Athlete'),
                              'avatar_url', p.avatar_url,
                              'is_self', r.user_id = v_uid
                            ) order by coalesce(p.name, 'Athlete'))
                     from public.challenge_results r
                     join public.profiles p on p.id = r.user_id
                    where r.challenge_id = c.id and r.is_winner
                 ), '[]'::jsonb)
               ) order by c.end_at desc)
        from public.challenges c
       where c.squad_id = p_squad
         and c.state in ('COMPLETED', 'ARCHIVED')
         -- A completed season with no recorded field has no champion to enshrine.
         and exists (select 1 from public.challenge_results r where r.challenge_id = c.id and r.is_winner)
    ), '[]'::jsonb)
  );
end;
$$;
