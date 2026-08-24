-- ══════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0177: approving a squad request requires that a request was actually made
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Idempotent — safe to run twice
-- (`create or replace` on a function that already exists, so its grants are preserved and the return
-- type is unchanged, which is the only thing that could raise 42P13).
--
-- ══ WHAT IT CLOSES ══
--
-- `approve_squad_join_request` checks that the caller owns the squad, that the target is not already a
-- member, and that the roster has room — and then INSERTS THE MEMBERSHIP. It never checks that the
-- athlete asked.
--
-- Found 2026-08-24 by `supabase/seed/two-account-roundtrip.mjs` and then measured end to end by
-- `supabase/seed/qa-consent-probe.mjs`, against two real accounts:
--
--     zero rows in squad_join_requests  →  {"ok":true,"already":false}  →  they are a member
--     Live Now              : VISIBLE — "Private Session" via QA Consent 20260824202932
--     B's training status   : VISIBLE — started 2026-08-24T20:29:32
--     Is B told?            : NO NOTIFICATION OF ANY KIND
--
-- `profiles.visibility.training` DEFAULTS TO `squads` (0086), which is why a membership is enough to
-- expose someone's session label and start time. `find_athlete_by_handle` returns ids, so the whole
-- path is: search a handle → create a squad → "approve" them → watch when they are at the gym.
--
-- ══ ⚠ WHY THIS CANNOT BREAK THE APP ══
--
-- `squad_pending_requests` — the ONLY source of the ids the approve screen passes — already filters to
-- `q.status = 'pending'`, which is exactly what the new guard requires. So every approval the UI can
-- produce still succeeds. The client needs no change: `approveSquadJoinRequest` already throws
-- "Couldn't approve that request." for any `ok:false` it does not recognise, so `no_request` surfaces
-- as a plain failure rather than a crash.
--
-- ⚠ AND ONE ORDERING DETAIL THAT LOOKS WRONG AND IS NOT: the already-a-member branch stays ABOVE the
--   new guard. It is the double-tap, it returns before any insert, and it creates no membership — so it
--   is not a consent path. Moving the check above it would make a second tap on a just-approved request
--   fail.
--
-- ⚠ THERE IS NO SECOND DOOR. Every other `insert into public.squad_members` in the schema — 0029, 0030,
--   0040, 0050 (×2), 0053, 0055 — inserts `v_uid`, the caller adding themselves. This is the only place
--   where one athlete's membership is created by somebody else. Grepped before writing the guard,
--   because a guard is only worth having if nothing routes around it.
--
-- ⚠ NO EXPLOIT COUNT IS REPORTED BELOW, AND THAT IS DELIBERATE. "A membership with no request row" is
--   NOT evidence of misuse: joining by invite code (0040/0055) and creating a squad both produce exactly
--   that, legitimately, and they are the normal case. A number here would be alarming and meaningless.
--   If you want to know whether it was ever used, the honest answer is that the schema cannot tell you.
-- ══════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- §1 · THE STATEMENTS — carried over from supabase/migrations/0177_approve_requires_a_request.sql
--      VERBATIM. Extracted by script and diffed, not retyped: 44 non-comment lines, 44 present.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.approve_squad_join_request(p_squad uuid, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cap int;
  v_n   int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select member_cap into v_cap from public.squads where id = p_squad and owner_id = v_uid;
  if not found then
    raise exception 'not authorized';
  end if;

  -- Unchanged, and deliberately still ABOVE the consent guard: this is the double-tap, it inserts
  -- nothing, and failing it would break approving the same request twice.
  if exists (select 1 from public.squad_members where squad_id = p_squad and user_id = p_user) then
    update public.squad_join_requests set status = 'approved', decided_at = now()
      where squad_id = p_squad and user_id = p_user;
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  -- 0177 — THE CONSENT GUARD. Every column qualified: `status` and `user_id` both exist on
  -- `squad_members` too, and a bare reference inside a function raises 42702 the day someone adds a join.
  if not exists (
    select 1
      from public.squad_join_requests q
     where q.squad_id = p_squad
       and q.user_id  = p_user
       and q.status   = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'no_request');
  end if;

  select count(*) into v_n from public.squad_members where squad_id = p_squad;
  if v_n >= v_cap then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  insert into public.squad_members (squad_id, user_id, role) values (p_squad, p_user, 'member');
  update public.squad_join_requests set status = 'approved', decided_at = now()
    where squad_id = p_squad and user_id = p_user;

  return jsonb_build_object('ok', true, 'already', false);
end;
$$;

comment on function public.approve_squad_join_request(uuid, uuid) is
  'Owner approves a PENDING join request and the membership is created. 0177 added the pending-request requirement: before it, this checked ownership, non-membership and roster room and then inserted, so an owner could put any athlete into their squad without being asked — and because visibility.training defaults to squads, that exposed the target''s Live Now with no notification to them. The already-a-member branch stays ABOVE that guard on purpose: it is the double-tap and it inserts nothing.';

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- §2 · THE ASSERTION — raise if the guard is not actually in the deployed body
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Asserted against `pg_get_functiondef` rather than against "the migration ran without error", because
-- those are the two facts that have come apart before on this project. A `create or replace` that
-- silently kept an older body is the exact failure this section exists to catch.

do $$
declare v_def text;
begin
  if to_regprocedure('public.approve_squad_join_request(uuid,uuid)') is null then
    raise exception '0177 self-check: approve_squad_join_request(uuid,uuid) does not exist';
  end if;

  v_def := pg_get_functiondef(to_regprocedure('public.approve_squad_join_request(uuid,uuid)')::oid);

  if position('no_request' in v_def) = 0 then
    raise exception '0177 self-check: the consent guard is NOT in the deployed body — an older definition is still live';
  end if;
  if position('q.status   = ''pending''' in v_def) = 0 and position('q.status = ''pending''' in v_def) = 0 then
    raise exception '0177 self-check: the pending-request test is missing from the deployed body';
  end if;

  -- The branch that must have SURVIVED. A rebuild that dropped it would break approving twice, and
  -- nothing else here would notice.
  if position('''already'', true' in v_def) = 0 then
    raise exception '0177 self-check: the already-a-member branch was lost in the rebuild';
  end if;

  raise notice '0177: consent guard present, already-a-member branch intact.';
end;
$$;


-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- §3 · THE REPORT — read-only. ONE row, because the editor shows only the last statement's result.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

select
  (to_regprocedure('public.approve_squad_join_request(uuid,uuid)') is not null)            as fn_exists,
  (position('no_request' in pg_get_functiondef(
     to_regprocedure('public.approve_squad_join_request(uuid,uuid)')::oid)) > 0)           as guard_present,
  (select count(*) from public.squad_join_requests where status = 'pending')               as pending_requests_queued,
  (select count(*) from public.squad_join_requests where status = 'approved')              as requests_approved_historically,
  (select count(*) from public.squads)                                                     as squads_total,
  (select count(*) from public.squad_members)                                              as memberships_total;
