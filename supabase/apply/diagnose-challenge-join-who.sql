-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — DIAGNOSTIC: WHO can actually join each recent friends competition?
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- READS ONLY. One statement, so the editor shows all of it.
--
-- ══ WHY THIS FILE EXISTS SEPARATELY FROM `diagnose-challenge-join-42501.sql` ══
--
-- That file is five statements, and **the Supabase SQL editor returns only the last one's result
-- set.** Its §1–§4 ran on 2026-08-17 and were silently discarded; the operator saw §5 and
-- reasonably assumed it was the whole answer. This is section 4, extracted so it can be seen.
--
-- §1–§3 of that file are already answered by `preflight-0163-0165.sql`, run the same evening:
-- `challenge_participants_insert`, `challenges_select`, `challenges_insert` and
-- `can_read_challenge` are all live in their FRIENDS-aware 0087 form. **Policy is ruled out.**
-- What is left is data, and this asks who the data actually names.
--
-- ══ HOW TO READ IT ══
--
-- One row per person who could plausibly join, per competition. Read left to right: **the first
-- FALSE is the reason.** `would_pass_policy` is the whole WITH CHECK evaluated the way Postgres
-- evaluates it — except `auth.uid()`, which is NULL in the SQL editor and is therefore supplied
-- per row from the invite list instead.
--
--   `clause_state_ok` false        → the competition is CANCELLED or COMPLETED. Nobody can join it.
--                                    If the app still offered a Join button, that is the bug.
--   `clause_in_invited_ids` false  → whoever tapped Join is signed in as a different account from
--     and `clause_is_creator` false   the one named in the competition. No migration fixes this.
--   `already_joined` true          → the error was never 42501; it is 23505, a duplicate key.
--   all true, still failing        → the athlete's session is stale, so `auth.uid()` is NULL on the
--                                    server while the client still believes it has a user. Sign out
--                                    and back in. If it recurs, token refresh is the bug.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

with c as (
  select id, name, state, creator_id, invited_ids, created_at, start_at, end_at
    from public.challenges
   where context = 'FRIENDS'
   order by created_at desc
   limit 5
),
who as (
  select c.id as cid, unnest(c.invited_ids) as uid, 'invited'::text as role from c
  union all
  select c.id, c.creator_id, 'creator'::text from c
)
select
  c.name                                                as competition,
  c.state,
  coalesce(p.name, '(no profile row)')                  as athlete,
  w.role,
  w.uid                                                 as user_id,
  (c.state in ('ENROLLMENT', 'ACTIVE'))                 as clause_state_ok,
  (w.uid = any(c.invited_ids))                          as clause_in_invited_ids,
  (c.creator_id = w.uid)                                as clause_is_creator,
  exists (
    select 1 from public.challenge_participants cp
     where cp.challenge_id = c.id and cp.user_id = w.uid
  )                                                     as already_joined,
  (
    c.state in ('ENROLLMENT', 'ACTIVE')
    and (c.creator_id = w.uid or w.uid = any(c.invited_ids))
  )                                                     as would_pass_policy,
  c.created_at
from who w
join c on c.id = w.cid
left join public.profiles p on p.id = w.uid
order by c.created_at desc, w.role desc, athlete;
