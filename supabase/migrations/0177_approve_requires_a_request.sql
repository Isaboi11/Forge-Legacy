-- Forge Legacy — 0177: approving a squad request requires that a request was actually made.
--
-- ══ THE DEFECT ══
--
-- `approve_squad_join_request` (0052) checks three things: that the caller owns the squad, that the
-- target is not already a member, and that the roster has room. It then INSERTS THE MEMBERSHIP. It
-- never checks that the athlete asked for it.
--
-- Found 2026-08-24 by `supabase/seed/two-account-roundtrip.mjs`, driving two real accounts through
-- every feature that needs two people, and then measured end to end by `supabase/seed/qa-consent-probe.mjs`:
--
--   · zero rows in `squad_join_requests` for the target
--   · `approve_squad_join_request(squad, them)` returns `{"ok":true,"already":false}`
--   · they are a member, role `member`
--   · they receive NO NOTIFICATION OF ANY KIND
--
-- ══ WHY IT IS WORTH A MIGRATION AND NOT A BACKLOG ROW ══
--
-- Squad membership is not cosmetic. `profiles.visibility.training` DEFAULTS TO `squads` (0086), so the
-- moment somebody is in your squad you can see their Live Now — the label of the session they are in and
-- the time they started it. The probe confirmed exactly that against a real account. `find_athlete_by_handle`
-- returns ids, so the whole path is: search a handle → create a squad → "approve" them → watch when they
-- are at the gym. On a fitness app that is a location-and-routine signal about a person who was never asked.
--
-- ⚠ THIS IS THE ONLY PLACE IN THE SCHEMA WHERE ONE ATHLETE'S MEMBERSHIP IS CREATED BY SOMEBODY ELSE.
--   Every other `insert into public.squad_members` — 0029, 0030, 0040, 0050 ×2, 0053, 0055 — inserts
--   `v_uid`, the caller adding themselves. Grepped before writing this, because a guard here is only
--   worth having if there is no second door.
--
-- ══ WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT ══
--
-- One condition: a `pending` row must exist for `p_user` in `p_squad` before the insert. `pending` and
-- not "any row", because a `declined` request must not authorise a later insert — 0052 keeps declined
-- rows on purpose, and re-asking updates one back to `pending` (0055's upsert).
--
-- ⚠ THE ALREADY-A-MEMBER BRANCH IS UNTOUCHED AND MUST STAY ABOVE THE NEW GUARD. It exists for the
--   double-tap, returns before any insert, and creates no membership — so it is not a consent path.
--   Moving the new check above it would make a second tap on a just-approved request fail.
--
-- ⚠ NO CLIENT CHANGE IS REQUIRED. `approveSquadJoinRequest` in `data/squad-discover-live.ts` already
--   throws "Couldn't approve that request." for any `ok:false` it does not recognise, so the new
--   `no_request` reason surfaces as a plain failure rather than a crash. And no legitimate call can
--   reach it: `squad_pending_requests` — the ONLY source of the ids that screen passes — filters to
--   `q.status = 'pending'`, which is precisely what this guard now requires.
--
-- Rebuilt from 0052's body, which is the current one: no later migration redefines this function.
-- Return type is unchanged (jsonb), so `create or replace` cannot raise 42P13, and the function already
-- exists, so its grants are preserved. Idempotent. Safe to run twice.

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
