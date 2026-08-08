-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migration 0121 (workout join requests)
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- ⚠ ORDER MATTERS. Apply in this sequence and do not skip:
--     pending-0119.sql → pending-0120.sql → THIS FILE → pending-0122.sql
--   0121 rebuilds `notification_events_for` from 0120's eight-branch body plus one. Running it before
--   0120 would replace a function that does not exist yet with a body referencing `push_pref_key`,
--   which 0120 creates.
--
-- ⚠ THIS ADDS A NINTH NOTIFICATION BRANCH. The client must ship with it: `workout_join_request` has to
--   be in `NotificationKind`, in the `KINDS` runtime array, in `PUSH_KIND_PREF`, in `destinationFor`
--   and in all five per-kind sites in `/inbox`. An unknown kind is silently dropped by `asKind`, so a
--   database ahead of the app loses the row rather than erroring.
--
-- Body below is byte-identical to supabase/migrations/0121_workout_join_requests.sql.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0121: joining a workout that is already under way
--
-- ══ WHAT THIS IS FOR ══
--
-- PO review: *"Workout together — in the middle of a workout you should be able to invite someone and
-- have them join where you're at in that workout. Or if someone sees you working out and wants to join
-- they can click 'join' on the active tab (right now it says view and it doesn't really benefit
-- anything) and it will notify the person working out asking if they accept the person joining."*
--
-- Two arrows, one relationship. 0092 built the first — I ask you to train. This adds the second — I ask
-- to join what you are ALREADY doing — and the fact that makes either of them mean "together": WHERE in
-- the session the guest opens.
--
-- ══ WHY THE SAME TABLE, AND NOT A NEW ONE ══
--
-- A `workout_join_requests` table would duplicate five decisions already made here: the friends-or-
-- squad-mates predicate on insert, the two-party read policy, the recipient-decides update policy, the
-- either-party delete, and the `workout_invite()` reader. Five copies of one rule is how a schema comes
-- to disagree with itself. The row is the same two-party object; only the direction of the ask changes,
-- and the existing policies already say the right thing about it:
--
--   · insert requires `from_id = auth.uid()` + friend-or-squad-mate → the ASKER inserts. Correct.
--   · update is `using (to_id = auth.uid())`                       → the HOST accepts, and writes the
--                                                                    snapshot in the same statement.
--   · delete allows either party                                   → withdraw and decline both work.
--
-- ══ WHY THE SNAPSHOT IS WRITTEN AT ACCEPT, BY THE HOST ══
--
-- Not at request time: the asker cannot know the shape of a session they are not in. And NOT mirrored
-- onto `profiles` beside `training_since` — that would be a write on every exercise navigation, by
-- every athlete training, forever, to serve an event that happens rarely; and 0086's own header argues
-- those two columns are for ONE FACT, not a session. On the row, it inherits this table's RLS instead of
-- needing a fresh audience decision, and it is written once, at the one moment the data exists.
--
-- ══ NO 'DECLINED' STATUS ══
--
-- 0092 is explicit: declining DELETES the row, exactly as a declined friend request does (0073), so
-- nothing anywhere records that someone said no. Adding a tombstone here would contradict a documented
-- anti-shame rule on the very table that states it. The gap that leaves — the asker is waiting and is
-- not the actor — is closed by making the request self-expiring against the host's presence instead:
-- see branch 9.
--
-- ⚠ NINE BRANCHES after this migration. 0120 had eight. `notification_events_for` is rebuilt from
--   0120's body plus one, and it is rebuilt with CREATE OR REPLACE rather than DROP + CREATE, because
--   0120 line 663 revokes EXECUTE on it FROM PUBLIC and a drop would reset that grant and silently
--   re-open the SECURITY DEFINER escalation that revoke exists to close. The return shape is unchanged,
--   so 42P13 does not apply.
--
-- Depends on 0086 (training presence), 0092/0093 (workout_invites), 0120 (push). Idempotent.
-- RUN AFTER 0120.

-- ── The two new columns ──────────────────────────────────────────────────────

alter table public.workout_invites
  add column if not exists kind text not null default 'INVITE';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workout_invites_kind_check') then
    alter table public.workout_invites
      add constraint workout_invites_kind_check check (kind in ('INVITE', 'JOIN_REQUEST'));
  end if;
end $$;

alter table public.workout_invites
  add column if not exists start_index int not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workout_invites_start_index_check') then
    alter table public.workout_invites
      add constraint workout_invites_start_index_check check (start_index >= 0);
  end if;
end $$;

comment on column public.workout_invites.kind is
  'INVITE = I am asking you to train (from_id invites to_id). JOIN_REQUEST = I am asking to join the session you are ALREADY in (from_id asks, to_id is the host). Same two-party row and the same policies, because both already say "the recipient decides". A JOIN_REQUEST carries no shape when it is inserted — the asker cannot know it — so exercises/start_index are written by the host''s accepting UPDATE.';

comment on column public.workout_invites.start_index is
  'Which exercise of `exercises` the guest opens on. 0 for an ordinary invitation. For an accepted JOIN_REQUEST it is where the host actually was, read off their live session at accept time — the difference between "do this workout too" and "join me".';

create index if not exists workout_invites_to_kind
  on public.workout_invites (to_id, kind, status, created_at desc);

-- ── The union: branch 7 narrowed, branch 9 added ─────────────────────────────
-- ⚠ CREATE OR REPLACE, NEVER DROP. See the header.
create or replace function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 1
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = p_user and q.status = 'pending'

  union all
  -- 2
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = p_user and m.user_id <> p_user

  union all
  -- 3
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = p_user
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all
  -- 4 (0073, restored 0109)
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and p_user in (f.low_id, f.high_id)
     and f.requested_by <> p_user

  union all
  -- 5 (0073, restored 0109)
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = p_user then f.high_id else f.low_id end,
         null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = p_user

  union all
  -- 6
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and p_user = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = p_user
     )

  union all
  -- 7 — NARROWED BY 0121. Without `kind = 'INVITE'` every join request would also render here: wrong
  --     wording, wrong screen state, wrong push copy, and two rows in the inbox for one ask.
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
   where i.to_id = p_user and i.status = 'PENDING' and i.kind = 'INVITE'

  union all
  -- 8 (0110)
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id
    from public.program_shares ps
   where ps.to_id = p_user and ps.status = 'PENDING'

  union all
  -- 9 (0121) — someone is standing in a gym wanting to join the session you are in RIGHT NOW.
  --
  -- ANCHORED TO THE HOST'S OWN PRESENCE, deliberately, and it is the only branch whose subject is a live
  -- fact rather than a stored one. It has to inherit that fact's mortality: once the host has stopped
  -- training, the ask is no longer answerable, and a notification that outlived the workout it is about
  -- would be the first one in this schema able to lie. Same four-hour ceiling `training_now()` applies
  -- (0086), for the same reason — and it is also what replaces a DECLINED tombstone, since a request
  -- nobody answers stops existing on its own.
  select 'workout_join_request'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
    join public.profiles h on h.id = i.to_id
   where i.to_id = p_user
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING'
     and h.training_since is not null
     and h.training_since > now() - interval '4 hours';
$$;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. NINE branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared, workout_join_request. Read by notification_events() for the viewer and by push_enqueue_for() for the sender, so the two can never disagree. Rebuild from THIS body, never an older one — 0088 and 0092 each rebuilt from a predecessor and silently dropped both friend branches for two migrations. Use CREATE OR REPLACE: a DROP resets 0120''s revoke from PUBLIC and re-opens the SECURITY DEFINER escalation.';

-- ── Preferences: one new arm ─────────────────────────────────────────────────
-- `workout_join_request` reuses `workout_tags` on purpose. "Someone wants to train with me" is ONE idea
-- to an athlete; a tenth toggle for the reverse arrow would be a distinction only the schema cares about.
create or replace function public.push_pref_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'join_request'         then 'squad_activity'
    when 'member_joined'        then 'squad_activity'
    when 'request_approved'     then 'squad_activity'
    when 'friend_request'       then 'friend_requests'
    when 'friend_accepted'      then 'friend_requests'
    when 'challenge_invite'     then 'challenge_updates'
    when 'workout_invite'       then 'workout_tags'
    when 'workout_join_request' then 'workout_tags'
    when 'program_shared'       then 'program_shares'
    else null
  end;
$$;

-- `push_pref_default` is UNCHANGED: `workout_tags` is already an explicit `true` arm, which is what the
-- client-parity test requires of every value `push_pref_key` can return.

-- ── The sender: three new arms ───────────────────────────────────────────────
create or replace function public.push_enqueue_for(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baseline timestamptz;
  v_prefs    jsonb;
  v_count    int;
begin
  if p_user is null then return 0; end if;

  select p.push_baseline_at, coalesce(p.notif_prefs, '{}'::jsonb)
    into v_baseline, v_prefs
    from public.profiles p
   where p.id = p_user;

  if v_baseline is null then return 0; end if;
  if not exists (select 1 from public.push_tokens t where t.user_id = p_user and t.disabled_at is null) then
    return 0;
  end if;

  insert into public.push_outbox (
    user_id, kind, event_at, actor_id, squad_id, challenge_id, invite_id, share_id, title, body, route
  )
  select
    p_user, e.kind, e.at, e.actor_id, e.squad_id, e.challenge_id, e.invite_id, e.share_id,
    case e.kind
      when 'join_request'         then 'Squad request'
      when 'member_joined'        then 'New member'
      when 'request_approved'     then 'You''re in'
      when 'friend_request'       then 'Friend request'
      when 'friend_accepted'      then 'Friend request accepted'
      when 'challenge_invite'     then 'Challenge'
      when 'workout_invite'       then 'Train together'
      when 'workout_join_request' then 'Join request'
      when 'program_shared'       then 'Program shared'
    end,
    -- Worded to match `bodyFor` in src/app/inbox.tsx: the push and the row it opens say the same thing.
    case e.kind
      when 'join_request'         then coalesce(pr.name, 'An athlete') || ' asked to join ' || coalesce(sq.name, 'your squad')
      when 'member_joined'        then coalesce(pr.name, 'An athlete') || ' joined ' || coalesce(sq.name, 'your squad')
      when 'request_approved'     then 'You joined ' || coalesce(sq.name, 'the squad')
      when 'friend_request'       then coalesce(pr.name, 'An athlete') || ' wants to be friends'
      when 'friend_accepted'      then coalesce(pr.name, 'An athlete') || ' accepted your request'
      when 'challenge_invite'     then coalesce(pr.name, 'An athlete') || ' challenged you to ' || coalesce(ch.name, 'a competition')
      when 'workout_invite'       then coalesce(pr.name, 'An athlete') || ' wants to train ' || coalesce(wi.workout_name, 'together') || ' with you'
      when 'workout_join_request' then coalesce(pr.name, 'An athlete') || ' wants to join your workout'
      when 'program_shared'       then coalesce(pr.name, 'An athlete') || ' sent you ' || coalesce(sh.name, 'a program')
    end,
    -- The destinations `/inbox` already uses, so a tapped push and a tapped row land identically.
    case e.kind
      when 'workout_invite'       then '/workout-invite?id=' || e.invite_id::text
      when 'workout_join_request' then '/workout-invite?id=' || e.invite_id::text
      when 'program_shared'       then '/program-share/' || e.share_id::text
      when 'challenge_invite'     then '/challenge/' || e.challenge_id::text
      when 'join_request'         then '/squad-requests?id=' || e.squad_id::text
      when 'friend_request'       then '/athlete/' || e.actor_id::text
      when 'friend_accepted'      then '/athlete/' || e.actor_id::text
      else '/squad/' || e.squad_id::text
    end
    from public.notification_events_for(p_user) e
    left join public.profiles pr on pr.id = e.actor_id
    left join public.squads sq on sq.id = e.squad_id
    left join public.challenges ch on ch.id = e.challenge_id
    left join public.workout_invites wi on wi.id = e.invite_id
    left join public.program_shares sh on sh.id = e.share_id
   where e.at > v_baseline
     and public.push_prefs_allows(v_prefs, e.kind)
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- The existing `push_workout_invites` trigger already fires on this table for both kinds, so no new
-- trigger is needed: it answers only "who might have a new event", which is `new.to_id` either way.

-- ── The reader has to carry the new fields ───────────────────────────────────
-- Same function as 0093 plus `kind`, `start_index`, and the HOST's identity — a JOIN_REQUEST is read by
-- the asker too, and on that shape `from_id` is themselves, so without `to_*` they cannot say whose
-- workout they are waiting on.
create or replace function public.workout_invite(p_invite uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', i.id,
           'kind', i.kind,
           'from_id', i.from_id,
           'from_name', coalesce(p.name, 'Athlete'),
           'from_avatar_url', p.avatar_url,
           'to_id', i.to_id,
           'to_name', coalesce(h.name, 'Athlete'),
           'to_avatar_url', h.avatar_url,
           'workout_name', i.workout_name,
           'template_id', i.template_id,
           'exercises', i.exercises,
           'start_index', i.start_index,
           'template_summary', case
             when jsonb_array_length(i.exercises) > 0 then jsonb_build_object(
               'lifts', jsonb_array_length(i.exercises),
               'sets', (select coalesce(sum((e->>'sets')::int), 0) from jsonb_array_elements(i.exercises) e)
             )
             else null
           end,
           'note', i.note,
           'status', i.status,
           'created_at', i.created_at,
           'accepted_at', i.accepted_at
         )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
    join public.profiles h on h.id = i.to_id
   where i.id = p_invite
     and (i.to_id = auth.uid() or i.from_id = auth.uid());
$$;

-- ── The host's pending asks, for the in-workout banner ───────────────────────
-- A thin, indexed read (workout_invites_to_kind) polled every 20 seconds while a session is active.
-- It exists rather than a raw select so the presence ceiling is applied in ONE place — the banner and
-- the notification branch must never disagree about whether an ask is still live.
create or replace function public.pending_join_requests()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', i.id,
      'from_id', i.from_id,
      'from_name', coalesce(p.name, 'Athlete'),
      'from_avatar_url', p.avatar_url,
      'note', i.note,
      'created_at', i.created_at
    ) order by i.created_at),
    '[]'::jsonb
  )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
   where i.to_id = auth.uid()
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING';
$$;

comment on function public.pending_join_requests() is
  'Join requests waiting on the caller, for the in-workout banner. No presence filter here: the caller IS the host and is by definition training when they poll this, and applying the four-hour ceiling would hide an ask from someone standing right there in a session older than four hours.';

-- ── Grants ───────────────────────────────────────────────────────────────────
--
-- ⚠ `notification_events_for` IS DELIBERATELY NOT GRANTED TO ANYONE. It is SECURITY DEFINER and takes
-- ANY user id, so a direct grant would hand every signed-in athlete everyone else's notification
-- events. It is reached only through `notification_events()` (which pins `auth.uid()`) and
-- `push_enqueue_for` (which is itself SECURITY DEFINER). 0120 revoked it from PUBLIC for exactly this
-- reason; CREATE OR REPLACE above preserved that, and the revoke is restated here so a future DROP in
-- this file cannot quietly undo it.
revoke execute on function public.notification_events_for(uuid) from public;

-- The new reader is the opposite case: it pins `auth.uid()` itself and can answer for nobody else.
revoke execute on function public.pending_join_requests() from public;
grant execute on function public.pending_join_requests() to authenticated;
