-- 0241 — A BLOCK ALSO STOPS SQUAD-MATE WORKOUT MESSAGES (App Store Guideline 1.2 · QA R2-F2, follow-up)
--
-- ══ WHY ══
--
-- 0225 (applied 09-26) closed R2-F2: friend requests, the inbox and push, presence, the live workout view,
-- Ask to Join, and the pending asks on block/unblock. Two days later 0231 added a new way to reach somebody —
-- a squad-mate's message that Coach Holt reads out mid-workout — and 0240 let the recipient answer it with a
-- push back to the sender. 0231's INSERT policy refuses a NEW message across a block, but nothing else does:
--
--   · a message sent BEFORE the block is still unseen, so the blocker's Holt reads it out after the block;
--   · answering it (0240) pushes the blocked athlete ("Isaiah: 🔥 Let's go") — contact across a block;
--   · either side can still read the pair's messages.
--
-- ══ WHAT THIS DOES ══
--
-- One RESTRICTIVE policy on `workout_cheers`, for every command: while either athlete has blocked the other,
-- the pair's messages do not exist to either of them. Not readable (Holt's poll finds nothing), not updatable
-- (so no `seen_at`, no `reply`, and so 0240's reply-push trigger never fires), not deletable, not insertable
-- (0231's INSERT policy already refused that; this states it once for all four).
--
-- RESTRICTIVE, never permissive: a permissive policy is OR-ed with 0231's and would WIDEN access. §2 raises
-- if it is not restrictive.
--
-- Nothing is deleted, so an unblock restores the pair's history as it was. Nothing can have been SENT during
-- the block (0231's INSERT policy, and now this one), and the workout screen only polls for messages from
-- the few hours before the current session began, so an old message does not resurface later as new.
--
-- ⚠ RESTATES NO FUNCTION. `notification_events_for`, `request_friend`, `block_athlete`, the presence readers
--   and 0240's `workout_cheers_reply_push` are untouched, so this paste cannot roll any of them back.
--
-- ⚠ Removes access, but only to rows the client already treats as optional: `fetchUnseenCheers` returns []
--   on an empty result, and `markCheerSeen`/`replyToCheer` are best-effort updates that simply match 0 rows.
--   Checked against the DEPLOYED lane (`ota/build9-js`: src/data/cheers-live.ts), not this branch. No client
--   change is needed, so this can be pasted at any time.
--
-- Depends on 0171 (`is_blocked`, granted to authenticated) and 0231 (`workout_cheers`). 0240 is not required.
-- Idempotent: drop-policy-if-exists + create. Safe to run twice.

begin;

drop policy if exists workout_cheers_not_blocked on public.workout_cheers;
create policy workout_cheers_not_blocked on public.workout_cheers
  as restrictive for all
  using (not public.is_blocked(from_id, to_id))
  with check (not public.is_blocked(from_id, to_id));

comment on policy workout_cheers_not_blocked on public.workout_cheers is
  'QA R2-F2 / 0241: while either athlete has blocked the other, their workout messages cannot be read, answered (no 0240 reply push), deleted or sent. RESTRICTIVE — AND-ed with 0231''s policies.';

-- ── self-check — RAISES rather than reporting green on nothing ─────────────────
do $$
begin
  if to_regprocedure('public.is_blocked(uuid, uuid)') is null then
    raise exception '0241: public.is_blocked(uuid, uuid) is missing — apply 0171 first';
  end if;
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'workout_cheers'
       and policyname = 'workout_cheers_not_blocked'
       and permissive = 'RESTRICTIVE' and cmd = 'ALL'
       and qual ~ 'is_blocked' and with_check ~ 'is_blocked'
  ) then
    raise exception '0241: workout_cheers_not_blocked is missing, not RESTRICTIVE, or not for ALL — a PERMISSIVE one would WIDEN reads';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.workout_cheers'::regclass and relrowsecurity) then
    raise exception '0241: RLS is off on workout_cheers';
  end if;
  if not has_function_privilege('authenticated', 'public.is_blocked(uuid, uuid)', 'execute') then
    raise exception '0241: authenticated cannot execute is_blocked — every workout_cheers read would fail';
  end if;
  raise notice '0241 OK: workout_cheers_not_blocked is RESTRICTIVE for ALL; RLS on; is_blocked callable.';
end $$;

commit;
