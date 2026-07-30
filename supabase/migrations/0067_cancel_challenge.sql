-- Forge Legacy — 0067: cancel a competition before it closes (CS-D5)
--
-- CS-D5 already defines this transition and nothing implemented it: CANCELLED is "ended before
-- completion; no winner, no result, no honors", reachable by "creator/owner action, pre-COMPLETED", and
-- terminal. So the answer to "should there be a button to end a competition early" is yes, and the
-- shape it must take is already decided.
--
-- CANCELLING IS NOT "END NOW AND CROWN THE LEADER", AND THAT DISTINCTION IS THE WHOLE POINT.
-- CS-D5 r4: cancelling produces no ChallengeResult, no winner and no honor. An early finish that DID
-- crown someone would hand the creator a button that ends the season the moment they happen to be
-- ahead — the roster would be racing a clock only one of them controls. There is no honest way to
-- offer that, so a cancelled season simply never happened: no result row, no place for anybody, and per
-- CS-D3 no negative record for anyone. Nobody is recorded as having lost a competition that was called
-- off, including the people who were behind when it stopped.
--
-- WHO. The creator (challenge-scoped commissioner, CS-D6/SA-D3) or the squad owner. The owner is
-- included because CS-D5 names "creator/owner" and because CS-D23 r4 already makes squad deletion
-- cancel that squad's live challenges — an owner who can dissolve the whole squad can certainly stop
-- one of its competitions.
--
-- WHY A FUNCTION AT ALL, given `challenges_update` already lets a creator write the row: the policy
-- cannot express "only from a pre-COMPLETED state", so without this a creator could flip a COMPLETED
-- season to CANCELLED and silently void standings CS-D14 calls immutable. The state guard is the
-- reason this exists, not the permission check.
--
-- Depends on 0059. Idempotent. RUN ANY TIME after 0059.

create or replace function public.cancel_challenge(p_challenge uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.challenges%rowtype;
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into c from public.challenges where id = p_challenge;
  if not found then
    raise exception 'competition not found';
  end if;

  select s.owner_id into v_owner from public.squads s where s.id = c.squad_id;

  if c.creator_id <> v_uid and coalesce(v_owner, '00000000-0000-0000-0000-000000000000'::uuid) <> v_uid then
    raise exception 'only the creator or the squad owner can call off this competition';
  end if;

  -- Terminal states stay terminal. A closed season's standings are immutable (CS-D14) and cancelling
  -- must never be a route around that.
  if c.state not in ('DRAFT', 'ENROLLMENT', 'ACTIVE') then
    raise exception 'this competition has already closed';
  end if;

  update public.challenges set state = 'CANCELLED', updated_at = now() where id = p_challenge;

  -- Deliberately NO writes beyond the state: no challenge_results rows (CS-D5 r4), and the participant
  -- roster is left intact rather than deleted, because the roster is not a record of failure — it is
  -- just who had opted in when it stopped. `challenge_hub` never selects CANCELLED, so it disappears
  -- from every surface without anything being erased.
end;
$$;
