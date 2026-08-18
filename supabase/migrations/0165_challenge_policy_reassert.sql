-- Forge Legacy — 0165: the friends-competition policies, restated and made loud
--
-- A join failed on 2026-08-17 with `new row violates row-level security policy for table
-- "challenge_participants" (42501)`, on a competition the athlete could plainly see in "Open to Join".
--
-- ══ WHAT THIS IS, AND WHAT IT IS NOT ══
--
-- This is NOT a diagnosis. `supabase/apply/diagnose-challenge-join-42501.sql` is the diagnosis, and it
-- should be run first — the most likely cause is data (the device signed in as an account that is not
-- the one named in `invited_ids`), which no migration can or should fix.
--
-- This is the OTHER candidate, closed permanently. `0059_challenges.sql` and `0087_friend_challenges.sql`
-- both define these four objects, and 0059's versions are SQUAD-ONLY:
--
--   · `can_read_challenge`             — 0059: squad members and participants. 0087: + the invited.
--   · `challenges_select`              — 0059: squad only. 0087: + FRIENDS by creator/invited.
--   · `challenges_insert`              — 0059: squad only. 0087: + FRIENDS against accepted friends.
--   · `challenge_participants_insert`  — 0059: `c.context = 'SQUAD'`. 0087: + FRIENDS.
--
-- BOTH FILES ARE IDEMPOTENT AND 0059 IS STILL SITTING IN THE MIGRATIONS FOLDER. Anyone re-pasting it —
-- to recover a half-applied run, which is the documented recovery procedure in this project — silently
-- reverts every friends competition in the database to unreadable and unjoinable, with no error, and
-- with `challenge_hub()` still cheerfully listing them because it is SECURITY DEFINER and never
-- consults these policies at all. That is a trap, not a risk.
--
-- ══ SO THE POINT OF THIS FILE IS §2, NOT §1 ══
--
-- §1 restates 0087's four objects verbatim. On a healthy database it changes nothing.
--
-- §2 is the part that earns the migration: it ASSERTS all four still name FRIENDS, so the reversion
-- can never again be silent. `preflight-0146-0153.sql` asserted `invite_code` was hidden and could not
-- see that everything else had stopped being readable (0160) — a check that only tests what must be
-- absent cannot see what has gone missing by accident. This tests what must be PRESENT.
--
-- ⚠ IT DOES NOT TOUCH `challenge_participants_delete` or `challenges_update`, which 0059 and 0087 agree
-- on. Restating something for symmetry is how a file grows a copy that drifts.
--
-- Depends on 0087. Idempotent. Safe to run at any time, and safe to run twice.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1 · 0087'S FOUR OBJECTS, VERBATIM
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.can_read_challenge(p_challenge uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.challenges c
     where c.id = p_challenge
       and (
         exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = p_uid)
         or (c.context = 'SQUAD' and public.is_squad_member(c.squad_id, p_uid))
         -- FRIENDS: the creator, and whoever it was opened to.
         or (c.context = 'FRIENDS' and (c.creator_id = p_uid or p_uid = any(c.invited_ids)))
       )
  );
$$;

drop policy if exists challenges_select on public.challenges;
create policy challenges_select on public.challenges for select using (
  exists (select 1 from public.challenge_participants cp where cp.challenge_id = id and cp.user_id = auth.uid())
  or (context = 'SQUAD' and public.is_squad_member(squad_id, auth.uid()))
  or (context = 'FRIENDS' and (creator_id = auth.uid() or auth.uid() = any(invited_ids)))
);

drop policy if exists challenges_insert on public.challenges;
create policy challenges_insert on public.challenges for insert with check (
  creator_id = auth.uid()
  and (
    (context = 'SQUAD' and public.is_squad_member(squad_id, auth.uid()))
    or (context = 'FRIENDS' and squad_id is null and public.all_accepted_friends(invited_ids, auth.uid()))
  )
);

-- Still no auto-enrollment: you may only ever add YOURSELF, and only while the competition is one you
-- could still enter. ENROLLMENT *or* ACTIVE — 0163's surfaces were widened to match this, not the
-- other way round; this clause has permitted a late join since 0087.
drop policy if exists challenge_participants_insert on public.challenge_participants;
create policy challenge_participants_insert on public.challenge_participants for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.challenges c
     where c.id = challenge_id
       and c.state in ('ENROLLMENT', 'ACTIVE')
       and (
         (c.context = 'SQUAD' and public.is_squad_member(c.squad_id, auth.uid()))
         or (c.context = 'FRIENDS' and (c.creator_id = auth.uid() or auth.uid() = any(c.invited_ids)))
       )
  )
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 2 · THE PART THAT MATTERS: A REVERSION CAN NEVER BE SILENT AGAIN
-- ═════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_body text;
begin
  select prosrc into v_body
    from pg_proc
   where proname = 'can_read_challenge' and pronamespace = 'public'::regnamespace;
  if v_body is null or v_body !~ 'FRIENDS' then
    raise exception '0165: can_read_challenge does not know about FRIENDS — 0059''s body is live. Every friends competition is invisible.';
  end if;

  if (select count(*) from pg_policies
       where schemaname = 'public'
         and (
           (tablename = 'challenges' and policyname in ('challenges_select', 'challenges_insert'))
           or (tablename = 'challenge_participants' and policyname = 'challenge_participants_insert')
         )) <> 3 then
    raise exception '0165: one of the three friends-competition policies is missing entirely';
  end if;

  -- Each of the three must name FRIENDS. 0059's versions do not, and that is the whole tell.
  if exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and (
         (tablename = 'challenges' and policyname in ('challenges_select', 'challenges_insert'))
         or (tablename = 'challenge_participants' and policyname = 'challenge_participants_insert')
       )
       and coalesce(qual, '') || coalesce(with_check, '') !~ 'FRIENDS'
  ) then
    raise exception '0165: a friends-competition policy is still on 0059''s SQUAD-only body — re-run this file, and never re-paste 0059 on top of 0087';
  end if;

  -- And the late-join window, which 0163's two surfaces now depend on agreeing with.
  if (select with_check from pg_policies
       where schemaname = 'public' and tablename = 'challenge_participants'
         and policyname = 'challenge_participants_insert') !~ 'ACTIVE' then
    raise exception '0165: the insert policy no longer allows joining an ACTIVE competition — 0163''s Join row would offer something the table refuses';
  end if;

  raise notice '0165 applied. All four friends-competition objects are on 0087''s bodies.';
end;
$$;
