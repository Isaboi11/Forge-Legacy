-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migration 0120 (push notifications)
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- APPLIED THROUGH 0118 as of 2026-08-07. ⚠ 0119 (program_session_log) is NOT recorded as applied —
-- apply supabase/apply/pending-0119.sql FIRST if it has not been run. 0120 does not depend on 0119,
-- but the ledger should not skip.
--
-- ⚠ TWO EXTENSIONS. The first two statements enable pg_net and pg_cron. If either errors under the
-- dashboard role, enable it in Database → Extensions, then re-run this file from the top — every
-- statement in it is idempotent.
--
-- ⚠ THIS MIGRATION ALONE SENDS NOTHING. Push is a NATIVE change: expo-notifications shifts the runtime
-- fingerprint, so the phone needs a NEW eas build + submit. An eas update cannot deliver it. Until that
-- build is installed no device has a token, and with no token nothing is ever enqueued — applying this
-- early is safe and silent.
--
-- Body below is byte-identical to supabase/migrations/0120_push_notifications.sql.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0120: push notifications
--
-- ══ WHAT WAS MISSING ══
--
-- `profiles.notif_prefs` has stored nine push preferences since 0022, and the P-5 screen has saved them
-- on every toggle since. There was no sender, no token column, and nowhere to send to. The preferences
-- recorded intent for a delivery mechanism that did not exist.
--
-- ══ THE ARCHITECTURAL PROBLEM, AND THE DECISION ══
--
-- `notification_events()` is a DERIVED read: a union over source tables that are already true. Nothing is
-- ever inserted as an event, so there was no row and no insert moment to hang a send on.
--
-- A push is not a derivation. It is a DELIVERY — once it leaves, it cannot be withdrawn the way a derived
-- row vanishes when its underlying fact stops being true. So push needs a record of "this was sent," and
-- that ledger is `push_outbox` below. That is the ONLY thing that becomes stored. The feed stays derived,
-- `/inbox` is untouched, and the property 0109 and 0110 both defend — a notification here can never lie,
-- because withdrawing the request removes it — survives intact.
--
-- PO decision (2026-08-07): triggers, over a parameterised union.
--
--   `notification_events_for(p_user)` holds the real body. `notification_events()` becomes a one-line
--   wrapper over it at `auth.uid()`. The eight branches are therefore defined EXACTLY ONCE and both the
--   viewer and the sender read the same definition.
--
-- The rejected alternative was triggers that each compute their own recipient. It avoids touching this
-- function, but it copies every branch's WHERE clause into trigger logic — in a schema that has now lost
-- branches to exactly that kind of duplication three times (0088, 0092, 0106). The triggers here are
-- deliberately stupid: they know WHO to re-scan, never WHAT an event is.
--
-- ══ ⚠ REBUILT FROM 0110's BODY — EIGHT BRANCHES ══
--
-- 0110 is the current definition, not 0109. It added the `program_shared` branch and the `share_id`
-- column, and 0109's own comment (written before it) says SEVEN. Rebuilding from 0109 would have deleted
-- `program_shared` silently and made it the fourth instance of this failure. All EIGHT branches are
-- below; count them before editing this again.
--
-- ══ NO BACKLOG BLAST ══
--
-- Every pending friend request, squad invite and shared program in the database is, right now, a live
-- event in that union. Without a floor, the first athlete to register a device would be pushed the entire
-- history of their account in one burst. `profiles.push_baseline_at` is that floor: it is stamped once,
-- when the first device registers, and only events NEWER than it are ever enqueued.

-- ── Extensions ───────────────────────────────────────────────────────────────
-- pg_net sends the HTTP request; pg_cron runs the drain. If either `create extension` errors under the
-- dashboard's role, enable it in Database → Extensions and re-run from here.
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ── Device tokens ────────────────────────────────────────────────────────────
create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token       text not null unique,
  platform    text not null default 'ios' check (platform in ('ios', 'android')),
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Set when Expo answers DeviceNotRegistered. The row is kept, not deleted: a reinstall hands back the
  -- same token and re-registration simply clears this.
  disabled_at timestamptz
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id) where disabled_at is null;

alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_own_select on public.push_tokens;
create policy push_tokens_own_select on public.push_tokens
  for select using (user_id = auth.uid());

drop policy if exists push_tokens_own_write on public.push_tokens;
create policy push_tokens_own_write on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The floor. Stamped once, never moved.
alter table public.profiles add column if not exists push_baseline_at timestamptz;
comment on column public.profiles.push_baseline_at is
  'Set when this athlete first registers a device. Only notification events NEWER than this are ever pushed — without it, registering a device would replay the account''s whole history as notifications.';

-- ── The delivery ledger ──────────────────────────────────────────────────────
create table if not exists public.push_outbox (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null,
  event_at      timestamptz not null,
  actor_id      uuid,
  squad_id      uuid,
  challenge_id  uuid,
  invite_id     uuid,
  share_id      uuid,
  -- Worded at enqueue, so the sender is a dumb pipe and the copy is auditable in-table.
  title         text not null,
  body          text not null,
  route         text not null,
  status        text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED')),
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  attempts      int not null default 0,
  request_id    bigint,
  error         text
);

-- Idempotence. `event_at` is a stable source timestamp in every branch (requested_at, joined_at,
-- decided_at, created_at), so the same event always produces the same key and re-scanning is free.
-- An expression index, not a generated column: casting timestamptz to text is not IMMUTABLE.
create unique index if not exists push_outbox_event_uk on public.push_outbox (
  user_id, kind, event_at,
  (coalesce(actor_id, squad_id, challenge_id, invite_id, share_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

create index if not exists push_outbox_pending_idx on public.push_outbox (created_at) where status = 'PENDING';

alter table public.push_outbox enable row level security;

-- Readable by its owner for support and debugging. Nothing but the SECURITY DEFINER functions below
-- writes here — there is deliberately no insert/update/delete policy.
drop policy if exists push_outbox_own_select on public.push_outbox;
create policy push_outbox_own_select on public.push_outbox
  for select using (user_id = auth.uid());

-- ── The union, parameterised ─────────────────────────────────────────────────
-- ⚠ DROP AND REBUILD, ALWAYS (42P13). Rebuild from THIS body, never from an older one.
drop function if exists public.notification_events();

-- ⚠ AND DROP THE PARAMETERISED ONE TOO, or this file cannot be run twice.
--
-- This line was missing, and the omission surfaced the first time anyone re-ran the migration: a bare
-- `create function` on a function that already exists raises 42723, so a run that stopped anywhere after
-- this point could never be resumed by starting again from the top — which is the only recovery this
-- project has, since there is no CLI and the dashboard is the whole deployment mechanism. Every other
-- statement in this migration was already guarded (`if not exists`, `drop policy if exists`,
-- `drop trigger if exists`, `cron.unschedule … where exists`); this one was the single exception.
--
-- Dropping resets the EXECUTE grant back to PUBLIC, which for this function is the escalation the
-- revoke at the foot of this file exists to close. That is safe HERE and only here, because the revoke
-- is in this same file and runs on the same pass. Later migrations must use `create or replace`
-- instead — a drop there would reset the grant with nothing following to restore it, which is why
-- `push.test.mjs` asserts 0121 and 0122 never contain this statement.
drop function if exists public.notification_events_for(uuid);

create function public.notification_events_for(p_user uuid)
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
  -- 7
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
   where i.to_id = p_user and i.status = 'PENDING'

  union all
  -- 8 (0110)
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id
    from public.program_shares ps
   where ps.to_id = p_user and ps.status = 'PENDING';
$$;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. EIGHT branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared. Read by notification_events() for the viewer and by push_enqueue_for() for the sender, so the two can never disagree. Any column change must DROP and rebuild (42P13) — from THIS body, never an older one. 0088 and 0092 each rebuilt from a predecessor and silently dropped both friend branches for two migrations.';

-- The viewer's entry point, unchanged in name, signature and return type, so `notification_feed` and
-- `notification_unread_count` rebind to it on their next call and need no edit.
create function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select * from public.notification_events_for(auth.uid());
$$;

comment on function public.notification_events() is
  'Thin wrapper over notification_events_for(auth.uid()) since 0120. The body lives there — edit it, not this.';

-- ── Preferences ──────────────────────────────────────────────────────────────
-- The kind → preference map. `request_declined` returns NULL and is therefore NEVER pushed: 0073's rule
-- is that a notification whose entire content is a small rejection is worse than none. It still appears
-- in `/inbox`, where the athlete came looking; it is not delivered to a lock screen unasked.
create or replace function public.push_pref_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'join_request'     then 'squad_activity'
    when 'member_joined'    then 'squad_activity'
    when 'request_approved' then 'squad_activity'
    when 'friend_request'   then 'friend_requests'
    when 'friend_accepted'  then 'friend_requests'
    when 'challenge_invite' then 'challenge_updates'
    when 'workout_invite'   then 'workout_tags'
    when 'program_shared'   then 'program_shares'
    else null
  end;
$$;

-- ⚠ These MUST equal `NOTIF_DEFAULTS` in src/domain/settings/notifications.ts. A test parses this
-- function and asserts the two agree, because a default that differs between client and sender means the
-- screen shows one thing and the server does another, silently.
create or replace function public.push_pref_default(p_key text)
returns boolean
language sql
immutable
as $$
  select case p_key
    when 'squad_activity'    then false
    when 'friend_requests'   then true
    when 'challenge_updates' then false
    when 'workout_tags'      then true
    when 'program_shares'    then true
    else false
  end;
$$;

-- Mirrors `sanitizeNotif`: only a stored BOOLEAN counts; anything else falls back to the default.
create or replace function public.push_prefs_allows(p_prefs jsonb, p_kind text)
returns boolean
language sql
immutable
as $$
  select case
    when public.push_pref_key(p_kind) is null then false
    when jsonb_typeof(p_prefs -> public.push_pref_key(p_kind)) = 'boolean'
      then (p_prefs ->> public.push_pref_key(p_kind))::boolean
    else public.push_pref_default(public.push_pref_key(p_kind))
  end;
$$;

-- ── Registration ─────────────────────────────────────────────────────────────
create or replace function public.push_register_token(p_token text, p_platform text default 'ios')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, coalesce(p_platform, 'ios'))
  on conflict (token) do update
    set user_id      = excluded.user_id,   -- a shared device follows whoever signed in last
        platform     = excluded.platform,
        last_seen_at = now(),
        disabled_at  = null;               -- re-registering revives a token Expo had rejected

  -- Stamped once. coalesce keeps the original floor on every later registration.
  update public.profiles
     set push_baseline_at = coalesce(push_baseline_at, now())
   where id = auth.uid();
end;
$$;

create or replace function public.push_unregister_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

-- ── Enqueue ──────────────────────────────────────────────────────────────────
-- Re-scans one athlete's events and files anything new, wanted, and after their floor. Idempotent: the
-- unique index absorbs re-scans, so calling this too often costs a query and nothing else.
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

  -- No device registered yet, or no floor: nothing is deliverable, so nothing is filed.
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
      when 'join_request'     then 'Squad request'
      when 'member_joined'    then 'New member'
      when 'request_approved' then 'You''re in'
      when 'friend_request'   then 'Friend request'
      when 'friend_accepted'  then 'Friend request accepted'
      when 'challenge_invite' then 'Challenge'
      when 'workout_invite'   then 'Train together'
      when 'program_shared'   then 'Program shared'
    end,
    -- Worded to match `bodyFor` in src/app/inbox.tsx: the push and the row it opens say the same thing.
    case e.kind
      when 'join_request'     then coalesce(pr.name, 'An athlete') || ' asked to join ' || coalesce(sq.name, 'your squad')
      when 'member_joined'    then coalesce(pr.name, 'An athlete') || ' joined ' || coalesce(sq.name, 'your squad')
      when 'request_approved' then 'You joined ' || coalesce(sq.name, 'the squad')
      when 'friend_request'   then coalesce(pr.name, 'An athlete') || ' wants to be friends'
      when 'friend_accepted'  then coalesce(pr.name, 'An athlete') || ' accepted your request'
      when 'challenge_invite' then coalesce(pr.name, 'An athlete') || ' challenged you to ' || coalesce(ch.name, 'a competition')
      when 'workout_invite'   then coalesce(pr.name, 'An athlete') || ' wants to train ' || coalesce(wi.workout_name, 'together') || ' with you'
      when 'program_shared'   then coalesce(pr.name, 'An athlete') || ' sent you ' || coalesce(sh.name, 'a program')
    end,
    -- The destinations `/inbox` already uses, so a tapped push and a tapped row land identically.
    case e.kind
      when 'workout_invite'   then '/workout-invite?id=' || e.invite_id::text
      when 'program_shared'   then '/program-share/' || e.share_id::text
      when 'challenge_invite' then '/challenge/' || e.challenge_id::text
      when 'join_request'     then '/squad-requests?id=' || e.squad_id::text
      when 'friend_request'   then '/athlete/' || e.actor_id::text
      when 'friend_accepted'  then '/athlete/' || e.actor_id::text
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

-- ── Triggers ─────────────────────────────────────────────────────────────────
-- Deliberately stupid. Each one answers only "who might have a new event" and hands off; not one of them
-- knows what an event is. That knowledge lives in `notification_events_for` alone, which is why these
-- cannot drift away from the feed the way 0088 and 0092 drifted away from friends.
create or replace function public.push_tg_squad_join_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_owner uuid;
begin
  if tg_op = 'INSERT' then
    select owner_id into v_owner from public.squads where id = new.squad_id;
    perform public.push_enqueue_for(v_owner);
  else
    -- decided: the athlete who asked now has an answer
    perform public.push_enqueue_for(new.user_id);
  end if;
  return null;
end;
$$;

drop trigger if exists push_squad_join_requests on public.squad_join_requests;
create trigger push_squad_join_requests
  after insert or update of status on public.squad_join_requests
  for each row execute function public.push_tg_squad_join_requests();

create or replace function public.push_tg_squad_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.squads where id = new.squad_id;
  perform public.push_enqueue_for(v_owner);
  return null;
end;
$$;

drop trigger if exists push_squad_members on public.squad_members;
create trigger push_squad_members
  after insert on public.squad_members
  for each row execute function public.push_tg_squad_members();

create or replace function public.push_tg_friendships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'PENDING' then
    -- the side that did not ask
    perform public.push_enqueue_for(case when new.low_id = new.requested_by then new.high_id else new.low_id end);
  elsif new.status = 'ACCEPTED' then
    -- only the original asker is told; there is no decline event, by design (0073)
    perform public.push_enqueue_for(new.requested_by);
  end if;
  return null;
end;
$$;

drop trigger if exists push_friendships on public.friendships;
create trigger push_friendships
  after insert or update of status on public.friendships
  for each row execute function public.push_tg_friendships();

create or replace function public.push_tg_challenges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid;
begin
  if new.context = 'FRIENDS' and new.state = 'ENROLLMENT' and new.invited_ids is not null then
    foreach v_user in array new.invited_ids loop
      perform public.push_enqueue_for(v_user);
    end loop;
  end if;
  return null;
end;
$$;

drop trigger if exists push_challenges on public.challenges;
create trigger push_challenges
  after insert or update of state, invited_ids on public.challenges
  for each row execute function public.push_tg_challenges();

create or replace function public.push_tg_workout_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.push_enqueue_for(new.to_id);
  return null;
end;
$$;

drop trigger if exists push_workout_invites on public.workout_invites;
create trigger push_workout_invites
  after insert on public.workout_invites
  for each row execute function public.push_tg_workout_invites();

create or replace function public.push_tg_program_shares()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.push_enqueue_for(new.to_id);
  return null;
end;
$$;

drop trigger if exists push_program_shares on public.program_shares;
create trigger push_program_shares
  after insert on public.program_shares
  for each row execute function public.push_tg_program_shares();

-- ── The sender ───────────────────────────────────────────────────────────────
-- Postgres sends this itself, via pg_net. There is no Edge Function because there is no Supabase CLI and
-- no service key in this project — everything here has to be applicable by pasting SQL into the
-- dashboard, and this is.
--
-- Expo's push endpoint needs no credential for a standard send; the token IS the address. Nothing
-- secret is stored by this migration.
create or replace function public.push_drain(p_limit int default 50)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r          record;
  v_messages jsonb;
  v_req      bigint;
  v_sent     int := 0;
begin
  for r in
    select * from public.push_outbox
     where status = 'PENDING' and attempts < 5
     order by created_at
     limit greatest(p_limit, 0)
  loop
    -- One message per live device. A silent athlete with no token was never enqueued, so this is
    -- non-empty in the ordinary case; if every device was disabled between enqueue and drain it is not.
    select jsonb_agg(
             jsonb_build_object(
               'to', t.token,
               'title', r.title,
               'body', r.body,
               'sound', 'default',
               -- `kind` + the ids are what the client routes on, through the same `destinationFor`
               -- the inbox row uses. `route` rides along for auditing and support, not for navigation.
               'data', jsonb_build_object(
                 'kind', r.kind,
                 'route', r.route,
                 'outboxId', r.id,
                 'squadId', r.squad_id,
                 'actorId', r.actor_id,
                 'challengeId', r.challenge_id,
                 'inviteId', r.invite_id,
                 'shareId', r.share_id
               )
             )
           )
      into v_messages
      from public.push_tokens t
     where t.user_id = r.user_id and t.disabled_at is null;

    if v_messages is null then
      update public.push_outbox
         set status = 'FAILED', attempts = attempts + 1, error = 'no active device'
       where id = r.id;
      continue;
    end if;

    select net.http_post(
             url     := 'https://exp.host/--/api/v2/push/send',
             headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
             body    := v_messages
           )
      into v_req;

    update public.push_outbox
       set status = 'SENT', sent_at = now(), attempts = attempts + 1, request_id = v_req
     where id = r.id;

    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

-- Reads back what Expo said and retires tokens it rejected. `DeviceNotRegistered` is the one that
-- matters: the app was deleted, and every future send to that token is wasted until it is disabled.
create or replace function public.push_reconcile(p_limit int default 200)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r       record;
  v_body  jsonb;
  v_item  jsonb;
  v_idx   int;
  v_token text;
  v_fixed int := 0;
begin
  for r in
    select o.id, o.user_id, o.request_id
      from public.push_outbox o
     where o.status = 'SENT' and o.request_id is not null and o.error is null
       -- pg_net prunes `net._http_response` (6h by default). Past that the answer is gone for good, and
       -- without this cutoff those rows would be re-read on every pass forever, growing without bound.
       and o.sent_at > now() - interval '6 hours'
     order by o.sent_at
     limit greatest(p_limit, 0)
  loop
    select (resp.content)::jsonb into v_body
      from net._http_response resp
     where resp.id = r.request_id and resp.status_code is not null;

    continue when v_body is null;

    v_idx := 0;
    for v_item in select * from jsonb_array_elements(coalesce(v_body -> 'data', '[]'::jsonb)) loop
      if v_item ->> 'status' = 'error' then
        -- The response array is positional against the messages posted, which were ordered by token.
        select t.token into v_token
          from public.push_tokens t
         where t.user_id = r.user_id and t.disabled_at is null
         offset v_idx limit 1;

        if v_item -> 'details' ->> 'error' = 'DeviceNotRegistered' and v_token is not null then
          update public.push_tokens set disabled_at = now() where token = v_token;
        end if;

        update public.push_outbox set error = v_item ->> 'message' where id = r.id;
        v_fixed := v_fixed + 1;
      end if;
      v_idx := v_idx + 1;
    end loop;

    -- Mark it examined so it is not re-read forever.
    update public.push_outbox set error = coalesce(error, '') where id = r.id;
  end loop;

  return v_fixed;
end;
$$;

-- ── Schedule ─────────────────────────────────────────────────────────────────
-- Every minute. The trigger has already filed the row the instant the fact became true, so this is a
-- pipe, not a poll — the latency an athlete feels is the drain interval, not a scan.
select cron.unschedule('forge-push-drain') where exists (select 1 from cron.job where jobname = 'forge-push-drain');
select cron.schedule('forge-push-drain', '* * * * *', $cron$ select public.push_drain(50); $cron$);

select cron.unschedule('forge-push-reconcile') where exists (select 1 from cron.job where jobname = 'forge-push-reconcile');
select cron.schedule('forge-push-reconcile', '*/5 * * * *', $cron$ select public.push_reconcile(200); $cron$);

-- ── Grants ───────────────────────────────────────────────────────────────────
--
-- ⚠ REVOKE FROM PUBLIC, not from `authenticated`. Postgres grants EXECUTE to PUBLIC on every new
-- function by default, and revoking from a role that never held a direct grant removes nothing — the
-- function stays callable through PUBLIC. Every revoke below is deliberately `from public`.
--
-- `notification_events_for` is the one that matters. It is SECURITY DEFINER and takes ANY user id, so
-- left callable it would hand any signed-in athlete every notification event belonging to anyone else:
-- their friend requests, their squad invitations, their competitions. It replaced a function that could
-- only ever answer for `auth.uid()`, and that safety came from the missing parameter, not from RLS.
revoke execute on function public.notification_events_for(uuid) from public;
revoke execute on function public.push_enqueue_for(uuid) from public;
revoke execute on function public.push_drain(int) from public;
revoke execute on function public.push_reconcile(int) from public;

-- The viewer's wrapper stays reachable: it pins auth.uid() itself and can answer for nobody else.
grant execute on function public.notification_events() to authenticated;
grant execute on function public.push_register_token(text, text) to authenticated;
grant execute on function public.push_unregister_token(text) to authenticated;

comment on table public.push_outbox is
  'The delivery ledger — the ONLY stored part of the notification system. The feed itself stays derived (notification_events_for), because a derived notification cannot outlive the fact behind it. A push can: once delivered it cannot be withdrawn, so it needs a record that it happened. Deduped by (user, kind, event_at, subject) so re-scanning is free.';

comment on table public.push_tokens is
  'Expo push tokens, one row per device. Disabled rather than deleted when Expo answers DeviceNotRegistered, so a reinstall handing back the same token simply revives it.';
