-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — DIAGNOSTIC: "new row violates row-level security policy for challenge_participants"
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste this whole file → Run. It READS ONLY — no
-- insert, update, delete or DDL anywhere in it. Safe at any time.
--
-- ══ WHY A SCRIPT RATHER THAN AN ANSWER ══
--
-- Reported on 2026-08-17: the invitee sees the competition in "Open to Join", taps Join, and gets
-- 42501. Those two things go through DIFFERENT machinery, which is what makes this narrow:
--
--   · The LIST comes from `challenge_hub()`, which is SECURITY DEFINER — it runs as the function's
--     owner and RLS on `public.challenges` does not apply to it.
--   · The JOIN is a plain client insert, so `challenge_participants_insert` is evaluated AS THE
--     ATHLETE, and its `exists (select … from public.challenges …)` subquery is itself filtered by
--     `challenges_select`.
--
-- So "it is listed" is not evidence the athlete can read the row, and every clause below is a
-- separate thing that can be false on its own. Reading the migrations did not settle which — 0087's
-- policy permits exactly this insert — so the remaining candidates are live state, and this asks.
--
-- ⚠ §1 IS THE CHEAPEST THING TO RULE OUT, AND THE EVIDENCE ALREADY ARGUES AGAINST IT.
-- `0059_challenges.sql` and `0087_friend_challenges.sql` both define `challenge_participants_insert`,
-- and 0059's version requires `c.context = 'SQUAD'`. Both files are idempotent, so 0059 re-run at any
-- point since would have silently reverted it — this project's documented recurring failure.
--
-- BUT 0059 WOULD HAVE REVERTED `challenges_insert` IN THE SAME BREATH, and creating a friends
-- competition plainly worked. So the policies are probably 0087's and the cause is probably in §4 —
-- most likely `clause_in_invited_ids` being false for whoever actually tapped, i.e. the device was
-- signed in as a different account from the one named. §1 is still first because it costs one row and
-- it is the only candidate that would make this reproducible for everybody rather than for one person.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- ⛔⛔ READ THIS BEFORE RUNNING: THIS FILE IS FIVE STATEMENTS AND YOU WILL ONLY SEE THE LAST ONE. ⛔⛔
--
--   The Supabase SQL editor returns only the final statement's result set. Run on 2026-08-17, §1–§4
--   executed and were silently discarded; the operator saw §5, which is the least decisive section,
--   and had no way to know four answers had been thrown away. **Highlight one section and Run
--   selection**, or use the single-statement extracts:
--
--     · `preflight-0163-0165.sql`        — answers §1, §2 and §3 (all green as of 2026-08-17)
--     · `diagnose-challenge-join-who.sql` — answers §4, the per-athlete breakdown, widened to the
--                                           five most recent competitions instead of only the newest
--
-- ── 1 · THE VERDICT — does the live insert policy still know FRIENDS exists? ──────────────────────
select
  case
    when with_check is null                then '⚠ NO WITH CHECK AT ALL — unexpected; read §2'
    when with_check like '%FRIENDS%'       then '✅ 0087 is live. The policy permits a friends competition; the cause is DATA, see §4'
    when with_check like '%SQUAD%'         then '⛔ 0059 IS LIVE — SQUAD ONLY. A friends competition can never be joined. Re-apply 0087.'
    else                                        '⚠ Neither — somebody wrote a third version; read it below'
  end                                                                as verdict,
  with_check                                                         as live_policy_body
from pg_policies
where schemaname = 'public'
  and tablename  = 'challenge_participants'
  and policyname = 'challenge_participants_insert';

-- ── 2 · Every policy on both tables, as the database actually holds them ──────────────────────────
-- `challenges_select` matters as much as the insert policy: the insert's subquery reads `challenges`
-- under it, so a SQUAD-only select policy makes the insert's `exists` false without the insert policy
-- itself being wrong.
select tablename, policyname, cmd, qual as using_expr, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('challenges', 'challenge_participants')
order by tablename, cmd, policyname;

-- ── 3 · And the helper both of them lean on ──────────────────────────────────────────────────────
-- 0059's `can_read_challenge` is SQUAD-only; 0087's knows about `invited_ids`. If §1 says 0059 is
-- live, expect this to be SQUAD-only too — they were reverted together.
select
  case when prosrc like '%FRIENDS%' then '✅ 0087' else '⛔ 0059 — SQUAD only' end as can_read_challenge_version,
  prosrc
from pg_proc
where proname = 'can_read_challenge'
  and pronamespace = 'public'::regnamespace;

-- ── 4 · The competition itself, and every clause of the policy, per athlete ───────────────────────
-- One row per person who should be able to join the most recent FRIENDS competition. Read across:
-- the first FALSE is the reason. `would_pass` is the whole WITH CHECK, evaluated the way Postgres
-- evaluates it — except for `auth.uid()`, which is NULL in the SQL editor and is therefore supplied
-- per row from the invite list instead.
with c as (
  select *
    from public.challenges
   where context = 'FRIENDS'
   order by created_at desc
   limit 1
),
who as (
  select c.id as challenge_id, unnest(c.invited_ids) as uid, 'invited' as role from c
  union all
  select c.id, c.creator_id, 'creator' from c
)
select
  coalesce(p.name, '(no profile row)')                                    as athlete,
  w.role,
  w.uid                                                                   as user_id,
  c.name                                                                  as competition,
  c.state,
  (c.state in ('ENROLLMENT', 'ACTIVE'))                                   as clause_state_ok,
  (w.uid = any(c.invited_ids))                                            as clause_in_invited_ids,
  (c.creator_id = w.uid)                                                  as clause_is_creator,
  -- Can this athlete SELECT the challenge row? The insert's subquery cannot see what this hides.
  (
    exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = w.uid)
    or (c.context = 'FRIENDS' and (c.creator_id = w.uid or w.uid = any(c.invited_ids)))
  )                                                                       as clause_can_select_row,
  -- Already in? Then Join would raise 23505 (duplicate key), NOT 42501 — a different bug entirely.
  exists (select 1 from public.challenge_participants cp
           where cp.challenge_id = c.id and cp.user_id = w.uid)           as already_joined,
  (
    c.state in ('ENROLLMENT', 'ACTIVE')
    and (c.creator_id = w.uid or w.uid = any(c.invited_ids))
  )                                                                       as would_pass_0087_policy
from c
join who w on w.challenge_id = c.id
left join public.profiles p on p.id = w.uid
order by w.role desc, athlete;

-- ── 5 · Is it still joinable at all, by the clock? ────────────────────────────────────────────────
-- `advance_challenges()` closes a competition when `end_at` passes, and a COMPLETED one fails the
-- state clause for everybody. This is the one cause that is nobody's mistake.
select name, state, start_at, end_at, now() as checked_at,
       (now() >= start_at)                as has_started,
       (now() >= end_at)                  as has_ended,
       (state in ('ENROLLMENT','ACTIVE')) as joinable_by_state
from public.challenges
where context = 'FRIENDS'
order by created_at desc
limit 5;

-- ── 6 · What to do with the answer ────────────────────────────────────────────────────────────────
--
--   §1 says ⛔ 0059              → run `supabase/apply/pending-0165.sql`. It restates 0087's three
--                                 policies and asserts they took, so a stray re-run cannot revert
--                                 them silently again.
--
--   §4 `clause_in_invited_ids` false for the person who tapped
--                               → they were not the athlete invited. Whoever tapped Join is signed in
--                                 as a different account from the one named in the competition.
--
--   §4 `already_joined` true     → the error was not 42501 at all; look again, it will be 23505.
--
--   §5 `has_ended` true          → the competition closed. Working as designed, and the Join row
--                                 should not have been offered — tell me and I will chase THAT.
--
--   All green, still failing     → the athlete's session is stale, so `auth.uid()` is NULL on the
--                                 server while the client still believes it has a user. Sign out and
--                                 back in on that device and it will go away; if it recurs, the token
--                                 refresh is the bug and not this policy.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
