-- Forge Legacy — 0168: the two objects 0165 missed, and the reason a competition stopped moving
--
-- ══ THE REPORT ══
--
-- PO, 2026-08-19: *"look at my competition with @kingmo. It doesn't look like the days have progressed
-- and it should've been done by now from when it started."*
--
-- ══ 0165 SAID "FOUR OBJECTS". THERE ARE SIX. ══
--
-- `0059_challenges.sql` and `0087_friend_challenges.sql` both define a set of objects, and 0059's are
-- SQUAD-ONLY. 0165 restated four of them and asserts those four. It named the wrong number:
--
--   1. `can_read_challenge`            — 0165 ✅
--   2. `challenges_select`             — 0165 ✅
--   3. `challenges_insert`             — 0165 ✅
--   4. `challenge_participants_insert` — 0165 ✅
--   5. `challenge_hub()`               — ⛔ NOT RESTATED, NOT ASSERTED   (0059 → 0087 → 0163)
--   6. `advance_challenges()`          — ⛔ NOT RESTATED, NOT ASSERTED   (0059 → 0087)
--
-- 0059's `advance_challenges` carries `and context = 'SQUAD' and public.is_squad_member(squad_id, v_uid)`
-- on BOTH of its clauses. Under that body a friends competition:
--
--   · is never promoted ENROLLMENT → ACTIVE, so it sits at its start date forever, and
--   · is never completed ACTIVE → COMPLETED, so no `challenge_results` row is ever written, no winner is
--     ever crowned, and the podium ceremony has nothing to play.
--
-- **THE DAYS DO NOT PROGRESS. THAT IS THE SYMPTOM, EXACTLY AS REPORTED.**
--
-- ══ AND IT IS INVISIBLE FROM EVERY DIRECTION ══
--
-- Three independent things hide it, which is why this survived 0163, 0164 AND 0165:
--
--   · `challenge_hub()` lists `open` (state ENROLLMENT/ACTIVE, and you have NOT joined) and `active`
--     (state ACTIVE, and you HAVE joined). A competition you created — so you are a participant — that
--     is stuck in ENROLLMENT matches NEITHER. **It vanishes off the hub entirely.** The only way back to
--     it is the inbox row or the push, both of which open `/challenge/<id>`.
--   · `/challenge/<id>` did not call `advance_challenges()` at all — only the hub and the Trophy Case
--     did. So the one screen a stuck competition is still reachable from was the one screen that could
--     not un-stick it. Fixed in the client, this pass.
--   · `fetchChallengeHub` threw the RPC's result away (`await supabase.rpc(...)` with no error check).
--     supabase-js REJECTS NOTHING — it returns `{ data, error }`. A permission failure, a raise, a
--     reverted body: all of them rendered as a hub that looked completely fine. Also fixed this pass.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1 restates 0087's `advance_challenges` VERBATIM (machine-copied from 0087, not retyped). On a healthy
--    database it changes nothing.
-- §2 asserts BOTH missed objects, so the next reversion cannot be silent — the lesson 0165 wrote down
--    and then applied to two thirds of the surface.
-- §3 REPORTS EVERY COMPETITION'S ACTUAL STATE AND DATES. Read-only. This is the half that answers the
--    PO's question rather than guessing at it: if the row says `ENROLLMENT` with a start date in the
--    past, §1 was the fault; if it says `ACTIVE` with an end date in the past, §1 already repaired it and
--    the next screen-open will close the season.
--
-- ⚠ `challenge_hub()` IS ASSERTED BUT NOT RESTATED. Its newest body is 0163's, which is two revisions
--   past 0087 — restating it here would mean copying 0163 into a second file, and two copies of a
--   function drift. If §2 fails on it, re-run `0163_competition_invite_and_standings.sql`.
--
-- Depends on 0087 + 0163. Idempotent. Safe to run twice. RUN ANY TIME.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1 · 0087'S LIFECYCLE FUNCTION, VERBATIM
-- ═════════════════════════════════════════════════════════════════════════════
--
-- The scope test is "a competition I can read", not "a competition whose squad I'm in", so a friends
-- season starts and closes on exactly the same terms as a squad one.

create or replace function public.advance_challenges(p_squad uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.challenges%rowtype;
begin
  if v_uid is null then
    return;
  end if;

  update public.challenges ch
     set state = 'ACTIVE', updated_at = now()
   where ch.state = 'ENROLLMENT' and ch.start_at <= now()
     and (p_squad is null or ch.squad_id = p_squad)
     and public.can_read_challenge(ch.id, v_uid);

  for c in
    select * from public.challenges ch
     where ch.state = 'ACTIVE' and ch.end_at <= now()
       and (p_squad is null or ch.squad_id = p_squad)
       and public.can_read_challenge(ch.id, v_uid)
  loop
    insert into public.challenge_results (challenge_id, user_id, score, place, is_winner)
      select c.id, t.user_id, t.score, t.place, t.place = 1
        from (
          select cp.user_id,
                 public.challenge_score(c.id, cp.user_id) as score,
                 rank() over (order by public.challenge_score(c.id, cp.user_id) desc) as place
            from public.challenge_participants cp
           where cp.challenge_id = c.id
        ) t
      on conflict (challenge_id, user_id) do nothing;

    update public.challenges set state = 'COMPLETED', updated_at = now() where id = c.id;
  end loop;
end;
$$;

-- 0147 revoked EXECUTE from `public` and `anon` and granted it directly to `authenticated`. A
-- `create or replace` preserves the existing grants, so this is belt-and-braces rather than a repair —
-- but a client that cannot execute this function is indistinguishable, from the app, from one whose
-- body was reverted, and that ambiguity cost this pass a day.
grant execute on function public.advance_challenges(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2 · THE ASSERTIONS 0165 SHOULD HAVE CARRIED
-- ═════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_advance text;
  v_hub     text;
begin
  select prosrc into v_advance
    from pg_proc where proname = 'advance_challenges' and pronamespace = 'public'::regnamespace;
  select prosrc into v_hub
    from pg_proc where proname = 'challenge_hub' and pronamespace = 'public'::regnamespace;

  if v_advance is null then
    raise exception '0168: advance_challenges does not exist — run 0087 first';
  end if;

  -- The tell is positive AND negative. 0087's body calls `can_read_challenge`; 0059's does not, and
  -- instead pins both clauses to `context = 'SQUAD'`. Testing only for the absent string is how 0160
  -- describes `preflight-0146-0153` missing an entire broken schema, so both are checked.
  if v_advance !~ 'can_read_challenge' then
    raise exception '0168: advance_challenges is on 0059''s SQUAD-only body — no friends competition will ever start or finish. Re-run this file.';
  end if;
  if v_advance ~ 'is_squad_member' then
    raise exception '0168: advance_challenges still gates on is_squad_member — that is 0059''s body. Re-run this file.';
  end if;

  if v_hub is null then
    raise exception '0168: challenge_hub does not exist — run 0087 then 0163';
  end if;
  if v_hub !~ 'FRIENDS' then
    raise exception '0168: challenge_hub is on 0059''s SQUAD-only body — friends competitions are invisible on C-1. Re-run 0163_competition_invite_and_standings.sql.';
  end if;
  -- 0163's widening, which the invite notification and the Join row both depend on.
  if v_hub !~ 'ENROLLMENT' then
    raise exception '0168: challenge_hub no longer offers ENROLLMENT competitions — re-run 0163.';
  end if;

  raise notice '0168 applied. advance_challenges and challenge_hub are both on their FRIENDS-aware bodies.';
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3 · WHAT THE ROWS ACTUALLY SAY — READ-ONLY
-- ═════════════════════════════════════════════════════════════════════════════
--
-- The SQL editor runs as `postgres`, so `auth.uid()` is NULL here and nothing user-scoped can be
-- evaluated. This lists every competition instead. `due` is the whole answer:
--
--   `START OVERDUE`  → it should be ACTIVE and is not. §1 was the fault; the next screen-open fixes it.
--   `END OVERDUE`    → it should be COMPLETED and is not. Same.
--   `on schedule`    → the lifecycle is fine and the dates are simply not what was expected.
--
-- `results` is the second half: a COMPLETED season with 0 result rows never crowned anybody, and the
-- podium has nothing to play.

select
  c.name,
  c.context,
  c.state,
  c.start_at,
  c.end_at,
  case
    when c.state = 'ENROLLMENT' and c.start_at <= now() then 'START OVERDUE'
    when c.state = 'ACTIVE'     and c.end_at   <= now() then 'END OVERDUE'
    when c.state in ('COMPLETED', 'ARCHIVED', 'CANCELLED') then 'closed'
    else 'on schedule'
  end                                                                          as due,
  (select count(*) from public.challenge_participants cp where cp.challenge_id = c.id) as roster,
  (select count(*) from public.challenge_results     r  where r.challenge_id  = c.id) as results,
  (select coalesce(p.name, 'Athlete') from public.profiles p where p.id = c.creator_id) as creator,
  (select string_agg(coalesce(p.name, 'Athlete'), ', ')
     from public.profiles p where p.id = any(c.invited_ids))                   as invited
from public.challenges c
order by c.created_at desc
limit 50;
