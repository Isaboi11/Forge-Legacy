-- pending-0241 — a block also stops squad-mate workout messages (QA R2-F2 follow-up, App Store 1.2)
--
-- Paste THIS WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice: the policy is
-- drop-if-exists + create, and §3 is read-only.
--
-- §1  0241 verbatim: one RESTRICTIVE policy on `workout_cheers` (read, answer, delete, send) across a block
-- §2  0241's own self-check (inside §1's transaction) RAISES if the policy is missing, PERMISSIVE, not for
--     ALL, if RLS is off, or if `authenticated` cannot call `is_blocked`
-- §3  reports what landed. Read-only.
--
-- ⚠ The editor shows only the LAST result, which is §3's. If §2 raised, you will see the error instead.
-- ⚠ Predicted §3: policy_restrictive_for_all_expect_true = true, rls_on_expect_true = true,
--    authed_can_call_is_blocked_expect_true = true, other_cheer_policies_expect_4 = 4 (0231's select /
--    insert / update / delete, untouched), messages_now_hidden_by_a_block = 0 unless a blocked pair had
--    exchanged a workout message before the block (0 is the expected answer on today's data).
-- ⚠ It restates NO function (`notification_events_for`, `request_friend`, `block_athlete`, the presence
--    readers, 0240's reply push), so it cannot roll any of them back. Needs 0171 + 0231 (both applied).

-- ═══════════════════════════════════════════════════════════════════════════
-- §1 + §2 — 0241, verbatim
-- ═══════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════
-- §3 READ-ONLY — what the paste changed. One row (the editor shows only the last result).
-- Verified from the catalogs, never by calling app functions: the editor is `postgres`, auth.uid() is null.
-- ═══════════════════════════════════════════════════════════════════════════
select
  exists (select 1 from pg_policies
           where schemaname = 'public' and tablename = 'workout_cheers'
             and policyname = 'workout_cheers_not_blocked' and permissive = 'RESTRICTIVE' and cmd = 'ALL')
                                                                                   as policy_restrictive_for_all_expect_true,
  (select relrowsecurity from pg_class where oid = 'public.workout_cheers'::regclass) as rls_on_expect_true,
  has_function_privilege('authenticated', 'public.is_blocked(uuid, uuid)', 'execute') as authed_can_call_is_blocked_expect_true,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'workout_cheers'
      and policyname <> 'workout_cheers_not_blocked')                                as other_cheer_policies_expect_4,
  (select count(*) from public.workout_cheers c where public.is_blocked(c.from_id, c.to_id))
                                                                                   as messages_now_hidden_by_a_block;
