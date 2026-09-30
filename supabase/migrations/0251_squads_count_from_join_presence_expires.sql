-- Forge Legacy — 0251: squads count from when you joined, presence that expires, and two notices nobody got
--
-- QA 2026-09-26, round 2 — R2-B4 (social2-02/04/05), R2-B3 (social2-13/21/06/27). One migration for the lane.
--
-- ══ 1 · "SQUADS COUNT WHAT YOU DID BEFORE YOU JOINED" (R2-B4) ══
--
--   · INBOX + PUSH (social2-02). Joining a squad announced your last 24 hours of workouts to it — five
--     "finished a workout in QA Squad R2 · 11h" rows minutes after the squad was created. Branches 15/16 of
--     `notification_events_for` now need the session to postdate BOTH membership rows (the actor's and the
--     reader's). `push_enqueue_for` reads the same union, so the push is bounded by the same two lines.
--   · GOALS (social2-04). SQ-D3 Rule 6 (LOCKED): "a member who joins mid-Goal contributes from the moment
--     they join". `squad_metric_sum`, `squad_member_contributions` and the Recent Progress list in
--     `squad_goal_detail` counted from `goal_started_at` alone. They now count from the LATER of that and the
--     member's `joined_at`. Backdating a goal's start (0103) is untouched — it still reaches back as far as
--     each member has been in the squad, and no further.
--   · COMPETITIONS (social2-05). CS-D9.2: a session counts only inside [startAt, endAt], and C-2 §4.3: "start
--     may be now or future". Create Challenge sent "Starts today" as MIDNIGHT THIS MORNING, so a competition
--     was born with that day's earlier workouts already on the board. A BEFORE INSERT trigger moves a start
--     that is already past to now() and slides the end by the same amount (the length chosen is kept). Every
--     reader — score, standings, momentum, results — reads `start_at`, so none of them is restated. Live
--     competitions created that way are moved to their own `created_at` once, below.
--
-- ══ 2 · PRESENCE THAT EXPIRES (social2-13) ══
--
--   Close or reload the app mid-workout and friends saw "Training now" for the full four-hour ceiling, with
--   the "is training · ask to join" inbox row beside it. `training_heartbeat()` is called by the app every
--   two minutes while a session is open; `training_presence_sweep()` (pg_cron, every 5 min) clears
--   `training_since` for an athlete whose heartbeat went quiet for 10 minutes.
--
--   ⚠ IT CLEARS PRESENCE BY WRITING THE COLUMN, SO NO READER IS RESTATED. `training_now`,
--     `athlete_training_status`, `live_session_of`, `training_partners` and branches 9/15 of the union (all
--     0225/0234) already treat a null `training_since` as "not training". Nothing here can roll them back.
--   ⚠ A SWEEP IS A LEAVE, NOT A FINISH (0202): `training_announced_at` is HELD, so the athlete coming back
--     restores the same stamp and the squad is not told twice.
--   ⚠ OLD BUILDS ARE NEVER SWEPT. The sweep needs a heartbeat AT OR AFTER the session's start. A build that
--     sends none keeps today's four-hour ceiling exactly.
--   ⚠ `push_training_started` fires only `when (new.training_since is not null …)`, so a sweep notifies nobody.
--
-- ══ 3 · TWO NOTICES P-5 §3.3 SAYS ALWAYS FIRE, AND ONE PASSIVE ONE ══
--
--   · NEW OWNER (S-3 §10, P-5 item 5): "No squad-wide notification is sent about the transfer. The new
--     owner receives a notification: 'You are now the owner of [Squad Name].'" Nothing sent it.
--   · SQUAD DELETED (S-3 §11.1, P-5 item 6): "All members receive a notification: '[Squad Name] has been
--     deleted.'" Nothing sent that either — and a DERIVED feed cannot, because the squad row is gone.
--     So these two are STORED (`squad_notices`), written by `transfer_squad_ownership` and by a BEFORE DELETE
--     trigger on `squads`, pushed straight to `push_outbox` (0159/0200's shape, no preference: §3.3 "always
--     delivered, no toggle"), and read by `social_notices()`.
--   · A NEW SQUAD COMPETITION (social2-06). CS-D7: "Squad members see an opt-in invitation on the squad's
--     Challenge surface." Derived in `social_notices()` — INBOX ONLY. P5-D1 r4: "A non-participant receives
--     nothing", so it has no push, no preference key and no union branch.
--
--   ⚠ `social_notices()` IS ITS OWN FUNCTION, MERGED BY THE CLIENT — 0200's pattern, for a second reason:
--     `notification_unread_count()` counts every union kind, so a new union kind lights the bell on builds
--     that cannot draw the row. A side function is invisible to a build that does not call it.
--   ⛔ NOT ADDED, ON PURPOSE: a "you were removed" notice (S-3 §7.3 LOCKED — removal is silent, the squad
--     "simply disappears"), a "competition called off" notice (C-1 §9.4 LOCKED — "removed … silently — no
--     'cancelled' tombstone"), and any "declined" notice (P-5 §3.2b, WwF Principle 4 — decline is silent).
--
-- ══ 4 · THE STALE "JOINED" ROW (social2-27) ══
--
--   Branch 2 (`member_joined`) showed the owner every join in the squad's history, unwindowed. A new owner
--   was told about joins from before the hand-over. It now needs the join to postdate the reader's ownership
--   (`squads.owner_since`, new, stamped by the transfer) and the reader's own membership.
--
-- ══ FUNCTIONS RESTATED — EACH BUILT BY SCRIPT FROM THE NEWEST BODY, NEVER RETYPED ══
--
--   notification_events_for   ← 0234_apple_health_import.sql      (newest in migrations/ AND apply/)
--       + 2 predicates on branch 2 · + 2 on branch 15 · + 2 on branch 16. Nothing removed. 0225's
--       is_blocked wrapper and 0234's `w.source = 'forge'` are carried; §9 raises if either is gone.
--   transfer_squad_ownership  ← 0047_transfer_ownership.sql       (only definition)
--       + `owner_since = now()` on the one UPDATE · + the notice block after it.
--   squad_metric_sum          ← 0103_squad_goal_dates.sql         (newest; 0200 and 0233 only CALL it)
--       the five lower bounds become greatest(<bound>, sm.joined_at). All five metric kinds kept.
--   squad_member_contributions ← 0107_squad_goal_detail.sql       (only definition)
--       roster carries joined_at; the five lower bounds become greatest(<bound>, r.joined_at).
--   squad_goal_detail         ← 0107_squad_goal_detail.sql        (only definition)
--       one predicate: the Recent Progress lower bound becomes greatest(<bound>, sm.joined_at).
--   `src/app/__tests__/social2-0251-migration.test.mjs` re-derives each from its source and fails on any
--   other difference, and on a newer definition appearing between the source and this file.
--
--   NOT restated (so this paste cannot roll them back): push_enqueue_for (0246), push_pref_key /
--   push_pref_default (0202), set_training_status (0217), training_now / athlete_training_status /
--   live_session_of / training_partners / workout_invite (0225), challenge_score / challenge_baseline (0063),
--   challenge_detail / challenge_results_detail / challenge_hub (0163), advance_challenges (0168),
--   cancel_challenge (0067), join_squad_by_code (0055), every 0200 function, squad_goal_weeks (0107).
--
-- ══ CLIENT COMPATIBILITY, BOTH DIRECTIONS ══
--
--   · The client ships FIRST. Before this is pasted: `training_heartbeat` and `social_notices` answer
--     PGRST202 and the app treats both as "not there yet" (no heartbeat, no extra rows). Nothing else in the
--     client names anything this file creates.
--   · Builds that predate the client: no heartbeat → never swept. They do not call `social_notices`, so the
--     three new kinds never reach them. The two pushes open `/squad/<id>` (new owner) and `/inbox` (deleted)
--     through routes every build already has.
--
-- Idempotent: every statement is `if not exists`, `create or replace`, drop-if-exists + create, or an UPDATE
-- that matches nothing on a second run. Depends on 0029, 0047, 0059, 0086, 0103, 0107, 0120 (push_outbox,
-- push_tokens, pg_cron), 0171 (is_blocked), 0202, 0225, 0234 — all applied. Does NOT depend on 0200.

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · THE STORED NOTICES — a deleted squad cannot be derived from
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.squad_notices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('squad_owner_changed', 'squad_deleted')),
  -- ⚠ NO FOREIGN KEY. The `squad_deleted` row has to outlive the squad it is about.
  squad_id    uuid not null,
  squad_name  text not null,
  squad_crest text,
  created_at  timestamptz not null default now()
);

create index if not exists squad_notices_user_idx on public.squad_notices (user_id, created_at desc);

comment on table public.squad_notices is
  'The two squad events P-5 §3.3 says always fire and that cannot be derived at read time (0251): the new owner after a transfer (S-3 §10) and every member after a deletion (S-3 §11.1). Name and crest are SNAPSHOTS and squad_id has no FK, because a deleted squad''s notice outlives the squad. Written only by squad_notice_send; read through social_notices(). There is deliberately no "removed" kind (S-3 §7.3: removal is silent).';

alter table public.squad_notices enable row level security;

-- Readable by the athlete it is for. Nothing but the SECURITY DEFINER sender writes here — there is
-- deliberately no insert/update/delete policy.
drop policy if exists squad_notices_own_select on public.squad_notices;
create policy squad_notices_own_select on public.squad_notices
  for select using (user_id = auth.uid());

-- One notice, and its push. NO PREFERENCE CHECK — P-5 §3.3: "not user-mutable — always delivered, no toggle".
-- The outbox row carries no squad id for a deletion, so every build's tap lands on `/inbox` rather than on
-- the page of a squad that no longer exists.
create or replace function public.squad_notice_send(
  p_user        uuid,
  p_kind        text,
  p_squad_id    uuid,
  p_squad_name  text,
  p_squad_crest text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now  timestamptz := clock_timestamp();
  v_name text := coalesce(nullif(btrim(coalesce(p_squad_name, '')), ''), 'Your squad');
begin
  if p_user is null or p_squad_id is null or p_kind not in ('squad_owner_changed', 'squad_deleted') then
    return;
  end if;

  insert into public.squad_notices (user_id, kind, squad_id, squad_name, squad_crest, created_at)
  values (p_user, p_kind, p_squad_id, v_name, p_squad_crest, v_now);

  insert into public.push_outbox (user_id, kind, event_at, squad_id, title, body, route)
  select p_user,
         p_kind,
         v_now,
         case when p_kind = 'squad_deleted' then null else p_squad_id end,
         case when p_kind = 'squad_deleted' then 'Squad deleted' else 'Squad owner' end,
         -- S-3 §11.1 / §10, verbatim. Neutral: never "<name> deleted <squad>".
         case when p_kind = 'squad_deleted'
              then v_name || ' has been deleted.'
              else 'You are now the owner of ' || v_name || '.'
         end,
         case when p_kind = 'squad_deleted' then '/inbox' else '/squad/' || p_squad_id::text end
    from public.profiles pr
   where pr.id = p_user
     and pr.push_baseline_at is not null
     and pr.push_baseline_at < v_now
     and exists (select 1 from public.push_tokens t where t.user_id = p_user and t.disabled_at is null)
  on conflict do nothing;
end;
$$;

comment on function public.squad_notice_send(uuid, text, uuid, text, text) is
  'Record one squad notice (0251) and enqueue its push. Internal: called by transfer_squad_ownership and the squads BEFORE DELETE trigger, never by a client. No preference is consulted — P-5 §3.3 makes ownership transfer and squad deletion non-toggleable.';


-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · A NEW OWNER IS TOLD, AND THE SQUAD REMEMBERS SINCE WHEN
-- ══════════════════════════════════════════════════════════════════════════════

-- Null on every squad that has never changed hands — its owner has been the owner since it was created.
alter table public.squads add column if not exists owner_since timestamptz;

comment on column public.squads.owner_since is
  'When the CURRENT owner took the squad over (0251). Null = never transferred. Stamped by transfer_squad_ownership; read by branch 2 of notification_events_for so a new owner is not shown joins from before the hand-over.';

create or replace function public.transfer_squad_ownership(p_squad uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.squads where id = p_squad and owner_id = v_uid) then
    raise exception 'not authorized';
  end if;
  if not exists (select 1 from public.squad_members where squad_id = p_squad and user_id = p_new_owner) then
    raise exception 'not a member of this squad';
  end if;
  if p_new_owner = v_uid then
    return; -- already the owner
  end if;

  update public.squad_members set role = 'member' where squad_id = p_squad and user_id = v_uid;
  update public.squad_members set role = 'owner'  where squad_id = p_squad and user_id = p_new_owner;
  update public.squads set owner_id = p_new_owner, owner_since = now(), updated_at = now() where id = p_squad;

  -- 0251 (QA social2-27; S-3 §10, P-5 §3.3). The NEW OWNER alone is told — "no squad-wide notification
  -- is sent about the transfer". Never allowed to fail the hand-over itself.
  begin
    perform public.squad_notice_send(p_new_owner, 'squad_owner_changed', s.id, s.name, s.crest)
       from public.squads s
      where s.id = p_squad;
  exception when others then
    raise warning 'transfer_squad_ownership: squad % notice not recorded: %', p_squad, sqlerrm;
  end;
end;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · EVERY MEMBER IS TOLD WHEN A SQUAD IS DELETED
-- ══════════════════════════════════════════════════════════════════════════════
--
-- BEFORE DELETE, because by AFTER the cascade has already taken the roster this reads. The person deleting
-- it is not told (they did it); with no caller — an account deletion cascading through `owner_id` — that is
-- the outgoing owner.
--
-- ⚠ Never raises. Failing to write a notice must never stop an owner deleting their squad.
create or replace function public.squads_tell_members_deleted()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r    record;
  v_by uuid := coalesce(auth.uid(), old.owner_id);
begin
  begin
    for r in
      select m.user_id
        from public.squad_members m
       where m.squad_id = old.id
         and m.user_id is distinct from v_by
    loop
      perform public.squad_notice_send(r.user_id, 'squad_deleted', old.id, old.name, old.crest);
    end loop;
  exception when others then
    raise warning 'squads_tell_members_deleted: squad % notices not recorded: %', old.id, sqlerrm;
  end;
  return old;
end;
$$;

drop trigger if exists squads_tell_members_deleted on public.squads;
create trigger squads_tell_members_deleted
  before delete on public.squads
  for each row execute function public.squads_tell_members_deleted();


-- ══════════════════════════════════════════════════════════════════════════════
-- 4 · THE INBOX ROWS — its own function, merged by the client (see the header)
-- ══════════════════════════════════════════════════════════════════════════════
--
--   squad_owner_changed  — the new owner alone, and only while they still are the owner.
--   squad_deleted        — every member the squad had, from the snapshot.
--   squad_challenge_open — a squad competition you could still opt into and have not. DERIVED, never
--                          stored: joining it, its end, or its being called off makes the row stop
--                          existing, and ignoring it leaves no record that you passed (CS-D3).
--
-- Same 14-day window and the same read line (`notifications_seen_at`) as `notification_feed`.
create or replace function public.social_notices()
returns table (
  kind             text,
  at               timestamptz,
  unread           boolean,
  squad_id         uuid,
  squad_name       text,
  squad_crest      text,
  squad_photo_url  text,
  actor_id         uuid,
  actor_name       text,
  actor_avatar_url text,
  challenge_id     uuid,
  challenge_name   text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid  uuid := auth.uid();
  v_seen timestamptz;
begin
  if v_uid is null then
    return;
  end if;

  select coalesce(p.notifications_seen_at, '-infinity'::timestamptz) into v_seen
    from public.profiles p where p.id = v_uid;
  v_seen := coalesce(v_seen, '-infinity'::timestamptz);

  return query
    select n.kind::text,
           n.created_at,
           n.created_at > v_seen,
           n.squad_id,
           coalesce(s.name, n.squad_name)::text,
           coalesce(s.crest, n.squad_crest)::text,
           s.photo_url::text,
           null::uuid, null::text, null::text,
           null::uuid, null::text
      from public.squad_notices n
      left join public.squads s on s.id = n.squad_id
     where n.user_id = v_uid
       and n.created_at > now() - interval '14 days'
       and (
         n.kind = 'squad_deleted'
         -- Handed on again since: "you are now the owner" stopped being true.
         or (n.kind = 'squad_owner_changed' and s.owner_id = v_uid)
       );

  return query
    select 'squad_challenge_open'::text,
           c.created_at,
           c.created_at > v_seen,
           c.squad_id,
           s.name::text,
           s.crest::text,
           s.photo_url::text,
           c.creator_id,
           pr.name::text,
           pr.avatar_url::text,
           c.id,
           c.name::text
      from public.challenges c
      join public.squad_members m on m.squad_id = c.squad_id and m.user_id = v_uid
      join public.squads s on s.id = c.squad_id
      left join public.profiles pr on pr.id = c.creator_id
     where c.context = 'SQUAD'
       and c.state in ('ENROLLMENT', 'ACTIVE')
       and c.creator_id <> v_uid
       and c.created_at > now() - interval '14 days'
       and not exists (
         select 1 from public.challenge_participants cp
          where cp.challenge_id = c.id and cp.user_id = v_uid
       )
       and not public.is_blocked(v_uid, c.creator_id);
end;
$$;

comment on function public.social_notices() is
  'The caller''s inbox rows that are not branches of notification_events_for (0251): squad_owner_changed and squad_deleted from squad_notices, and squad_challenge_open derived from an open squad competition the caller has not joined. Inbox only for the third — no push exists for it (P5-D1 r4). Merged into /inbox by the client, exactly as squad_goal_notifications (0200) is.';


-- ══════════════════════════════════════════════════════════════════════════════
-- 5 · THE UNION — 0234's body, six predicates added
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ⚠ REBUILD FROM THIS BODY, NEVER FROM AN OLDER ONE. 0234's is now stale by six predicates.

create or replace function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid, post_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 0225. THE SEVENTEEN BRANCHES BELOW ARE 0164'S, VERBATIM. They are wrapped rather than edited one by one:
  -- a filter on the shared `actor_id` covers every branch at once, including any branch added later
  -- inside the wrapper. Rows with no actor (squad_recap, request_approved/declined) are the squad's or
  -- your own and stay. This also filters the push sender, which reads this same union.
  select e.kind, e.at, e.squad_id, e.actor_id, e.challenge_id, e.invite_id, e.share_id, e.post_id
    from (
  -- 1
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = p_user and q.status = 'pending'

  union all
  -- 2
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = p_user and m.user_id <> p_user
     -- 0251 (QA social2-27): only a join that happened on YOUR watch. A new owner was shown every join from
     -- before the hand-over. Both bounds are open-ended when there is nothing to compare against.
     and m.joined_at > coalesce(s.owner_since, '-infinity'::timestamptz)
     and m.joined_at >= coalesce((select o.joined_at from public.squad_members o where o.squad_id = m.squad_id and o.user_id = p_user), '-infinity'::timestamptz)

  union all
  -- 3
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = p_user
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all
  -- 4 (0073, restored 0109)
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and p_user in (f.low_id, f.high_id)
     and f.requested_by <> p_user

  union all
  -- 5 (0073, restored 0109)
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = p_user then f.high_id else f.low_id end,
         null::uuid, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = p_user

  union all
  -- 6 (widened 0163) — ENROLLMENT *or* ACTIVE. "Starts today" means midnight this morning, so the
  --   creator's own trip back to the hub calls advance_challenges() and flips the competition to ACTIVE
  --   within seconds of it being created. Gated on ENROLLMENT, this derived event stopped existing before
  --   the invited friend ever opened the app — no notification, no push, and no "Open to Join" row to opt
  --   in from. It now lasts as long as joining does.
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state in ('ENROLLMENT', 'ACTIVE')
     and p_user = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = p_user
     )

  union all
  -- 7 (narrowed 0121)
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid, null::uuid
    from public.workout_invites i
   where i.to_id = p_user and i.status = 'PENDING' and i.kind = 'INVITE'

  union all
  -- 8 (0110)
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id, null::uuid
    from public.program_shares ps
   where ps.to_id = p_user and ps.status = 'PENDING'

  union all
  -- 9 (0121)
  select 'workout_join_request'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid, null::uuid
    from public.workout_invites i
    join public.profiles h on h.id = i.to_id
   where i.to_id = p_user
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING'
     and h.training_since is not null
     and h.training_since > now() - interval '4 hours'

  union all
  -- 10 (0122, narrowed 0126) — THE FIRST FAN-OUT BRANCH. Windowed at 14 days; see 0122's header for why
  --     that predicate is load-bearing rather than tidy.
  --     `author_id is not null` keeps the AUTHORLESS weekly recap out of this branch and in branch 12,
  --     where it is worded as the squad's own summary instead of as somebody's post.
  select 'squad_post'::text, sp.created_at, sp.squad_id, sp.author_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.author_id is not null
     and sp.author_id <> p_user
     and sp.created_at > now() - interval '14 days'

  union all
  -- 11 (0122)
  select 'squad_checkin'::text, sc.created_at, sc.squad_id, sc.user_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_checkins sc
    join public.squad_members m on m.squad_id = sc.squad_id and m.user_id = p_user
   where sc.user_id <> p_user
     and sc.created_at > now() - interval '14 days'

  union all
  -- 12 (0126) — the weekly review. `actor_id` is null on purpose: the SQUAD wrote this, not a member,
  --     and the client draws the crest rather than an avatar for exactly that reason.
  select 'squad_recap'::text, sp.created_at, sp.squad_id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.type = 'weekly'
     and sp.author_id is null
     and sp.created_at > now() - interval '14 days'

  union all
  -- 13 (0135) — somebody commented on your post. `squad_posts.squad_id` rides along so the row can wear
  --     the squad's crest and open `/squad-post/<id>`; it is NULL on a FRIENDS post, which is how the
  --     client knows to open `/friends` instead. Not fan-out: one comment notifies one person.
  select 'post_comment'::text, c.created_at, sp.squad_id, c.author_id, null::uuid, null::uuid, null::uuid, sp.id
    from public.squad_post_comments c
    join public.squad_posts sp on sp.id = c.post_id
   where sp.author_id = p_user
     and c.author_id is distinct from p_user
     and c.created_at > now() - interval '14 days'

  union all
  -- 14 (0135) — somebody reacted to your post. Default OFF for push (SOC-D11), always present in the
  --     inbox (P-5 §4). The table's primary key is (post_id, user_id), so one reactor is one row and
  --     changing a reaction from respect to honor cannot notify twice.
  select 'post_reaction'::text, r.created_at, sp.squad_id, r.user_id, null::uuid, null::uuid, null::uuid, sp.id
    from public.squad_post_reactions r
    join public.squad_posts sp on sp.id = r.post_id
   where sp.author_id = p_user
     and r.user_id is distinct from p_user
     and r.created_at > now() - interval '14 days'

  union all
  -- 15 (0153) — A SQUAD-MATE STARTED TRAINING. The first branch whose subject is a fact about RIGHT NOW
  --     rather than a row somebody wrote, so it is bounded by the same 4-hour presence ceiling branch 9
  --     uses (0086) instead of the 14-day window: "they stopped training" and "this is over" are the
  --     same event, and a start from yesterday is not news.
  --
  --     THREE GATES, and each is somebody's decision:
  --       · `s.training_alerts`  — the squad LEADER turned this on for the squad. Off by default.
  --       · `me.notify_start`    — the RECIPIENT asked for starts, in this squad. Off by default.
  --       · `vis_clears(…)`      — the ACTOR's own training audience (0086/0069). An athlete who hides
  --                                their training from squads is not announced by it. Their setting
  --                                already governs the Live Now row; a push must not be the back door
  --                                around it.
  --
  --     `distinct on (p.id)`: two people can share several squads, and without it one start becomes one
  --     inbox row per shared squad. The push would already have collapsed (the outbox key coalesces
  --     actor_id first), so only the feed would have doubled — visible to nobody writing the branch.
  select 'squad_training_started'::text, t.at, t.squad_id, t.actor_id, null::uuid, null::uuid, null::uuid, null::uuid
    from (
      select distinct on (p.id)
             p.training_since as at,
             s.id             as squad_id,
             p.id             as actor_id
        from public.squad_members me
        join public.squads s on s.id = me.squad_id and s.training_alerts
        join public.squad_members other on other.squad_id = me.squad_id and other.user_id <> p_user
        join public.profiles p on p.id = other.user_id
       where me.user_id = p_user
         and me.notify_start
         and p.training_since is not null
         and p.training_since > now() - interval '4 hours'
         and p.training_since > other.joined_at   -- 0251 (QA social2-02): started AFTER they joined this squad…
         and p.training_since > me.joined_at      -- …and after you did
         and public.vis_clears(coalesce(p.visibility->>'training', 'squads'), 'squad')
       order by p.id, p.training_since desc, s.id
    ) t

  union all
  -- 16 (0153) — AND WHEN THEY FINISHED ONE. Same three gates, its own toggle, and a 24-hour window.
  --
  --     ⚠ NOT 14 DAYS. Every windowed branch before this one is about something written down that keeps
  --     its meaning — a post is worth reading a week later. A finished session is only news on the day,
  --     and the fan-out here is far wider than the feed branches: a 50-member squad training four times
  --     a week is ~200 rows a fortnight, per member, which would bury every other notification the
  --     athlete has. One day is the longest window that still survives not opening the app overnight.
  --
  --     `distinct on (w.id)`, keyed on the WORKOUT rather than the athlete: unlike a start, two sessions
  --     in one day are two separate pieces of news, and only the shared-squad duplication is collapsed.
  select 'squad_training_finished'::text, t.at, t.squad_id, t.actor_id, null::uuid, null::uuid, null::uuid, null::uuid
    from (
      select distinct on (w.id)
             w.saved_at   as at,
             s.id         as squad_id,
             w.athlete_id as actor_id
        from public.squad_members me
        join public.squads s on s.id = me.squad_id and s.training_alerts
        join public.squad_members other on other.squad_id = me.squad_id and other.user_id <> p_user
        join public.workouts w on w.athlete_id = other.user_id
        join public.profiles p on p.id = w.athlete_id
       where me.user_id = p_user
         and me.notify_finish
         and w.state = 'saved'
         and w.saved_at is not null
         and w.saved_at > now() - interval '24 hours'
         and w.saved_at > other.joined_at   -- 0251 (QA social2-02): finished AFTER they joined this squad…
         and w.saved_at > me.joined_at      -- …and after you did
         and w.source = 'forge'   -- 0234: an import is history, never "finished a workout"
         and public.vis_clears(coalesce(p.visibility->>'training', 'squads'), 'squad')
       order by w.id, s.id
    ) t

  union all
  -- 17 (0164) — SOMEBODY ANSWERED YOUR CHALLENGE. The other half of branch 6, missing since 0087: an
  --   invitation could be sent and accepted with the sender told neither. The creator found out by
  --   opening the competition and counting the roster.
  --
  --   NOT FAN-OUT. One join notifies exactly one person, the creator — unlike branches 10/11/12/15/16,
  --   where one row becomes one event per member. A 50-athlete squad competition is 50 rows for one
  --   person over its lifetime, which is why it is bounded twice:
  --     · 14 days, the window every WRITTEN branch uses (`joined_at` is a row somebody caused).
  --     · the competition's own life — who is in stops being news once it is over, and a COMPLETED
  --       season would otherwise keep its whole roster in the creator's inbox forever.
  --
  --   `cp.user_id <> p_user` because creating a competition inserts YOUR OWN participant row first
  --   (`createChallenge`), and being told you joined your own competition is not news either.
  select 'challenge_joined'::text, cp.joined_at, null::uuid, cp.user_id, c.id, null::uuid, null::uuid, null::uuid
    from public.challenge_participants cp
    join public.challenges c on c.id = cp.challenge_id
   where c.creator_id = p_user
     and cp.user_id <> p_user
     and c.state in ('ENROLLMENT', 'ACTIVE')
     and cp.joined_at > now() - interval '14 days'
    ) as e (kind, at, squad_id, actor_id, challenge_id, invite_id, share_id, post_id)
   where e.actor_id is null
      or not public.is_blocked(p_user, e.actor_id);   -- 0225
$$;

-- Restated, never granted: SECURITY DEFINER over ANY user id (0120, 0147 §3).
revoke execute on function public.notification_events_for(uuid) from public, anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 6 · A SQUAD GOAL COUNTS EACH MEMBER FROM THE MOMENT THEY JOINED (SQ-D3 Rule 6)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- The same edit in all three, so the hero, the contribution list and Recent Progress cannot disagree:
-- the window's lower edge is the LATER of the goal's start and that member's `joined_at`.
--
-- ⚠ `pr_count` stays a DATE comparison (0103's own note: `achieved_on` is a DATE), so a record set earlier
--   on the day somebody joined still counts. Every other kind compares timestamps.

create or replace function public.squad_metric_sum(p_squad uuid, p_kind text, p_key text, p_started_at timestamptz)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select case
    when not (
      public.is_squad_member(p_squad, auth.uid())
      or exists (select 1 from public.squads s where s.id = p_squad and s.privacy = 'public')
    ) then 0
    when p_kind = 'workout_count' then coalesce((
      select count(*) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= greatest(coalesce(p_started_at, '-infinity'::timestamptz), sm.joined_at)
        and w.saved_at < public.squad_goal_window_end(p_squad)
    ), 0)
    when p_kind = 'distance_total' then coalesce((
      select sum(w.distance) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.distance is not null
        and (p_key is null or w.activity_type::text = p_key)
        and w.saved_at >= greatest(coalesce(p_started_at, '-infinity'::timestamptz), sm.joined_at)
        and w.saved_at < public.squad_goal_window_end(p_squad)
    ), 0)
    when p_kind = 'volume_total' then coalesce((
      select sum(ws.weight * ws.reps) from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
      join public.workouts w on w.id = we.workout_id
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= greatest(coalesce(p_started_at, '-infinity'::timestamptz), sm.joined_at)
        and w.saved_at < public.squad_goal_window_end(p_squad)
    ), 0)
    when p_kind = 'time_total' then coalesce((
      select sum(w.duration_sec) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= greatest(coalesce(p_started_at, '-infinity'::timestamptz), sm.joined_at)
        and w.saved_at < public.squad_goal_window_end(p_squad)
    ), 0) / 3600.0
    -- `personal_records.achieved_on` is a DATE, so its bound is a date too.
    when p_kind = 'pr_count' then coalesce((
      select count(*) from public.personal_records pr
      join public.squad_members sm on sm.user_id = pr.athlete_id
      where sm.squad_id = p_squad and pr.achieved_on >= greatest(coalesce(p_started_at::date, '-infinity'::date), sm.joined_at::date)
        and pr.achieved_on < public.squad_goal_window_end(p_squad)::date + 1
    ), 0)
    else 0
  end;
$$;

create or replace function public.squad_member_contributions(p_squad uuid)
returns table (athlete_id uuid, name text, handle text, avatar_url text, value numeric)
language sql
security definer
stable
set search_path = public
as $$
  with gate as (
    select public.is_squad_member(p_squad, auth.uid())
        or exists (select 1 from public.squads s where s.id = p_squad and s.privacy = 'public') as ok
  ),
  g as (
    select coalesce(s.goal_metric_kind, 'workout_count') as kind,
           s.goal_metric_key                             as key,
           coalesce(s.goal_started_at, '-infinity'::timestamptz) as from_at,
           public.squad_goal_window_end(p_squad)         as to_at
      from public.squads s where s.id = p_squad
  ),
  roster as (
    select sm.user_id, sm.joined_at from public.squad_members sm where sm.squad_id = p_squad
  ),
  vals as (
    select r.user_id as uid,
           case (select kind from g)
             when 'workout_count' then coalesce((
               select count(*) from public.workouts w
                where w.athlete_id = r.user_id
                  and w.saved_at >= greatest((select from_at from g), r.joined_at) and w.saved_at < (select to_at from g)
             ), 0)
             when 'distance_total' then coalesce((
               select sum(w.distance) from public.workouts w
                where w.athlete_id = r.user_id and w.distance is not null
                  and ((select key from g) is null or w.activity_type::text = (select key from g))
                  and w.saved_at >= greatest((select from_at from g), r.joined_at) and w.saved_at < (select to_at from g)
             ), 0)
             when 'volume_total' then coalesce((
               select sum(ws.weight * ws.reps)
                 from public.workout_sets ws
                 join public.workout_exercises we on we.id = ws.workout_exercise_id
                 join public.workouts w on w.id = we.workout_id
                where w.athlete_id = r.user_id
                  and w.saved_at >= greatest((select from_at from g), r.joined_at) and w.saved_at < (select to_at from g)
             ), 0)
             when 'time_total' then coalesce((
               select sum(w.duration_sec) from public.workouts w
                where w.athlete_id = r.user_id
                  and w.saved_at >= greatest((select from_at from g), r.joined_at) and w.saved_at < (select to_at from g)
             ), 0) / 3600.0
             -- `personal_records.achieved_on` is a DATE, so its bound is a date too (0103's own note).
             when 'pr_count' then coalesce((
               select count(*) from public.personal_records pr
                where pr.athlete_id = r.user_id
                  and pr.achieved_on >= greatest((select from_at from g), r.joined_at)::date
                  and pr.achieved_on < (select to_at from g)::date + 1
             ), 0)
             else 0
           end as value
      from roster r
  )
  select v.uid, p.name, p.handle::text, p.avatar_url, v.value
    from vals v
    join public.profiles p on p.id = v.uid
   where (select ok from gate)
   order by v.value desc, p.name asc;
$$;

create or replace function public.squad_goal_detail(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  s     public.squads%rowtype;
  v_ok  boolean;
  v_total numeric;
begin
  select * into s from public.squads where id = p_squad;
  if not found then
    return null;
  end if;

  v_ok := public.is_squad_member(p_squad, v_uid) or s.privacy = 'public';
  if not v_ok then
    return null; -- not an error: "you cannot see this" and "this does not exist" answer the same way
  end if;

  v_total := public.squad_metric_sum(p_squad, coalesce(s.goal_metric_kind, 'workout_count'), s.goal_metric_key, s.goal_started_at);

  return jsonb_build_object(
    'squadId', s.id,
    'squadName', s.name,
    'goal', s.goal,
    'target', s.goal_target,
    'metricKind', coalesce(s.goal_metric_kind, 'workout_count'),
    'metricKey', s.goal_metric_key,
    'startedAt', s.goal_started_at,
    'endsAt', s.goal_ends_at,
    'total', v_total,
    'isOwner', s.owner_id = v_uid,
    'memberCount', (select count(*) from public.squad_members m where m.squad_id = p_squad),
    'contributions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'athleteId', c.athlete_id, 'name', c.name, 'handle', c.handle,
               'avatarUrl', c.avatar_url, 'value', c.value,
               'isSelf', c.athlete_id = v_uid))
        from public.squad_member_contributions(p_squad) c
    ), '[]'::jsonb),
    'weeks', coalesce((
      select jsonb_agg(jsonb_build_object('weekStart', w.week_start, 'value', w.value) order by w.week_start)
        from public.squad_goal_weeks(p_squad, 8) w
    ), '[]'::jsonb),
    -- What moved the number, most recent first. Names the member and the session, because "+1" with
    -- nobody attached to it is a counter, not a record of anybody's work.
    'events', coalesce((
      select jsonb_agg(e order by e->>'at' desc)
        from (
          select jsonb_build_object(
                   'workoutId', w.id, 'at', w.saved_at, 'who', p.name,
                   'isSelf', w.athlete_id = v_uid, 'name', w.workout_name,
                   'distance', w.distance, 'durationSec', w.duration_sec) as e
            from public.workouts w
            join public.squad_members sm on sm.user_id = w.athlete_id
            join public.profiles p on p.id = w.athlete_id
           where sm.squad_id = p_squad
             and w.saved_at >= greatest(coalesce(s.goal_started_at, '-infinity'::timestamptz), sm.joined_at)
             and w.saved_at < public.squad_goal_window_end(p_squad)
           order by w.saved_at desc
           limit 8
        ) t
    ), '[]'::jsonb),
    -- The goals before this one. Read from `squad_goal_completions`, which has banked every MET goal
    -- since 0099 and which, until this screen, nothing in the app had ever read.
    'past', coalesce((
      select jsonb_agg(jsonb_build_object(
               'goal', h.goal, 'target', h.target, 'metricKind', h.metric_kind,
               'startedAt', h.started_at, 'completedAt', h.completed_at) order by h.completed_at desc)
        from public.squad_goal_completions h where h.squad_id = p_squad
    ), '[]'::jsonb)
  );
end;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 7 · A COMPETITION CANNOT START BEFORE IT EXISTS (CS-D9.2, C-2 §4.3)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- "Starts today" is sent as local midnight by every build installed today. The start becomes now() and the
-- end slides by the same amount, so the run the creator picked is the run they get. A start in the future
-- is untouched. Invoker, no table reads: it only rewrites the row being inserted.
create or replace function public.challenges_start_not_before_now()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.start_at is not null and new.start_at < now() then
    if new.end_at is not null then
      new.end_at := new.end_at + (now() - new.start_at);
    end if;
    new.start_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists challenges_start_not_before_now on public.challenges;
create trigger challenges_start_not_before_now
  before insert on public.challenges
  for each row execute function public.challenges_start_not_before_now();

-- The competitions already running that were born that way. The END is left where it is — nobody's season
-- gets longer under them — so only the head start goes. `created_at < end_at` keeps `challenge_window` true.
-- Closed seasons are not touched: their standings are frozen in `challenge_results` (CS-D14).
update public.challenges c
   set start_at = c.created_at, updated_at = now()
 where c.state in ('ENROLLMENT', 'ACTIVE')
   and c.start_at < c.created_at
   and c.created_at < c.end_at;


-- ══════════════════════════════════════════════════════════════════════════════
-- 8 · PRESENCE THAT EXPIRES WHEN THE APP GOES QUIET
-- ══════════════════════════════════════════════════════════════════════════════

-- ⚠ ITS OWN TABLE, NOT A COLUMN ON `profiles`. 0149 revokes table-level SELECT on profiles and re-grants
--   column by column, so a new profiles column is either ungranted (0149's verify reports it) or granted by
--   the next re-run of 0149/0202's loop — publishing when every athlete's app last phoned home.
create table if not exists public.training_heartbeats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default now()
);

comment on table public.training_heartbeats is
  'When each athlete''s open workout last phoned home (0251). Written by training_heartbeat() every ~2 minutes while a session is open; read only by training_presence_sweep(). RLS on with NO policy and no grant: a client never reads it, because it is a last-seen time.';

alter table public.training_heartbeats enable row level security;
revoke all on public.training_heartbeats from anon, authenticated;

-- Returns whether the caller is still on Live Now. FALSE while their session is open means the sweep (or
-- the ceiling) took them off — the app answers by re-asserting with set_training_status(true, …), which
-- restores the held stamp (0202) and tells nobody twice.
create or replace function public.training_heartbeat()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_live boolean;
begin
  if v_uid is null then
    return null;
  end if;

  insert into public.training_heartbeats (user_id, seen_at)
  values (v_uid, now())
  on conflict (user_id) do update set seen_at = excluded.seen_at;

  select p.training_since is not null and p.training_since > now() - interval '4 hours'
    into v_live
    from public.profiles p
   where p.id = v_uid;

  return coalesce(v_live, false);
end;
$$;

comment on function public.training_heartbeat() is
  'The open workout phoning home (0251). Stamps training_heartbeats for auth.uid() and returns whether the caller still has live presence. SECURITY DEFINER for 0190''s reason: it reads training_since, which authenticated cannot select (0149).';

create or replace function public.training_presence_sweep()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  update public.profiles p
     set training_since = null,
         training_label = null
    from public.training_heartbeats h
   where h.user_id = p.id
     and p.training_since is not null
     -- This session has phoned home at least once, so its build does. A build that never does is left to
     -- the four-hour ceiling, exactly as before.
     and h.seen_at >= p.training_since
     and h.seen_at < now() - interval '10 minutes';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.training_presence_sweep() is
  'Run by pg_cron every 5 minutes (0251). Ends the presence of an athlete whose open workout stopped phoning home for 10 minutes — an app closed or reloaded mid-session. A LEAVE, not a finish: training_announced_at is held (0202), so coming back restores the same stamp and re-announces nothing.';


-- ══════════════════════════════════════════════════════════════════════════════
-- 9 · GRANTS, THEN A SELF-CHECK THAT RAISES
-- ══════════════════════════════════════════════════════════════════════════════

revoke execute on function public.squad_notice_send(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.squads_tell_members_deleted() from public, anon, authenticated;
revoke execute on function public.challenges_start_not_before_now() from public, anon, authenticated;
revoke execute on function public.training_presence_sweep() from public, anon, authenticated;
revoke execute on function public.social_notices() from public, anon;
grant execute on function public.social_notices() to authenticated;
revoke execute on function public.training_heartbeat() from public, anon;
grant execute on function public.training_heartbeat() to authenticated;

-- ⚠ VERIFIED BY SOURCE. The SQL editor runs as `postgres`, where auth.uid() is null — calling these would
-- only exercise their early returns and prove nothing.
do $$
declare
  v_body text;
begin
  -- A · the union kept what 0225 and 0234 put in it, and gained the join bounds.
  select pg_get_functiondef('public.notification_events_for(uuid)'::regprocedure) into v_body;
  if v_body !~ 'is_blocked\(p_user, e\.actor_id\)' then
    raise exception '0251: notification_events_for lost 0225''s block filter';
  end if;
  if v_body !~ 'w\.source = ''forge''' then
    raise exception '0251: notification_events_for lost 0234''s import filter';
  end if;
  if v_body !~ 'challenge_joined' or v_body !~ 'post_reaction' or v_body !~ 'squad_recap' then
    raise exception '0251: notification_events_for was rebuilt from a stale copy — a branch is missing';
  end if;
  if v_body !~ 'w\.saved_at > other\.joined_at' or v_body !~ 'p\.training_since > other\.joined_at' then
    raise exception '0251: the training branches are not bounded by the join';
  end if;
  if v_body !~ 'owner_since' then
    raise exception '0251: member_joined is not bounded by the hand-over';
  end if;
  if has_function_privilege('authenticated', 'public.notification_events_for(uuid)', 'execute') then
    raise exception '0251: authenticated can execute notification_events_for — it reads ANY user id';
  end if;

  -- B · the goal sum still answers all five kinds, and counts from the join.
  select pg_get_functiondef('public.squad_metric_sum(uuid, text, text, timestamptz)'::regprocedure) into v_body;
  if v_body !~ 'workout_count' or v_body !~ 'distance_total' or v_body !~ 'volume_total'
     or v_body !~ 'time_total' or v_body !~ 'pr_count' then
    raise exception '0251: squad_metric_sum lost a metric kind';
  end if;
  if v_body !~ 'sm\.joined_at' or v_body !~ 'squad_goal_window_end' then
    raise exception '0251: squad_metric_sum is missing the join bound or 0103''s deadline';
  end if;
  select pg_get_functiondef('public.squad_member_contributions(uuid)'::regprocedure) into v_body;
  if v_body !~ 'r\.joined_at' then
    raise exception '0251: squad_member_contributions is missing the join bound';
  end if;
  select pg_get_functiondef('public.squad_goal_detail(uuid)'::regprocedure) into v_body;
  if v_body !~ 'sm\.joined_at' or v_body !~ 'squad_goal_completions' then
    raise exception '0251: squad_goal_detail is missing the join bound or its past goals';
  end if;

  -- C · the transfer still checks its caller, and now tells the new owner.
  select pg_get_functiondef('public.transfer_squad_ownership(uuid, uuid)'::regprocedure) into v_body;
  if v_body !~ 'not authorized' or v_body !~ 'owner_since' or v_body !~ 'squad_notice_send' then
    raise exception '0251: transfer_squad_ownership lost its caller check, or gained neither the stamp nor the notice';
  end if;

  -- D · the new objects.
  if to_regclass('public.squad_notices') is null or to_regclass('public.training_heartbeats') is null then
    raise exception '0251: squad_notices or training_heartbeats was not created';
  end if;
  if not exists (select 1 from pg_trigger t where t.tgname = 'squads_tell_members_deleted' and not t.tgisinternal) then
    raise exception '0251: the squads BEFORE DELETE trigger is missing';
  end if;
  if not exists (select 1 from pg_trigger t where t.tgname = 'challenges_start_not_before_now' and not t.tgisinternal) then
    raise exception '0251: the challenges BEFORE INSERT trigger is missing';
  end if;
  if not has_function_privilege('authenticated', 'public.social_notices()', 'execute')
     or not has_function_privilege('authenticated', 'public.training_heartbeat()', 'execute') then
    raise exception '0251: authenticated cannot call social_notices or training_heartbeat';
  end if;
  if has_function_privilege('anon', 'public.social_notices()', 'execute')
     or has_function_privilege('anon', 'public.training_heartbeat()', 'execute') then
    raise exception '0251: anon can call social_notices or training_heartbeat';
  end if;
  if has_table_privilege('authenticated', 'public.training_heartbeats', 'select') then
    raise exception '0251: training_heartbeats is selectable by authenticated — it is a last-seen time';
  end if;

  -- E · nothing this file did not restate was touched.
  if (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'set_training_status' and p.pronargs = 3) !~ 'else profiles\.training_announced_at' then
    raise exception '0251: set_training_status no longer holds the announcement across a leave (0202) — the sweep depends on it';
  end if;

  raise notice '0251 applied. Squads count from the join; quiet presence expires; new owners and deleted squads are told.';
end $$;

commit;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10 · THE JOB — outside the transaction, like 0200's: a schedule is not worth rolling the migration back
-- ══════════════════════════════════════════════════════════════════════════════
select cron.unschedule('forge-presence-sweep') where exists (select 1 from cron.job where jobname = 'forge-presence-sweep');
select cron.schedule('forge-presence-sweep', '*/5 * * * *', $cron$ select public.training_presence_sweep(); $cron$);
