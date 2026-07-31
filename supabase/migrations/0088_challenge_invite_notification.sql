-- Forge Legacy — 0088: tell someone they've been challenged
--
-- 0087 let an athlete name friends in a competition, and `invited_ids` put it in their hub's "Open to
-- you" list. Nothing told them it was there. A challenge you have to go looking for is not a challenge
-- anybody answers, so this is the other half: the invite becomes a notification.
--
-- ══ WHY THE RETURN TYPE CHANGES ══
--
-- `notification_events()` returned (kind, at, squad_id, actor_id) — a shape that assumes every event
-- belongs to a squad. A challenge invite has no squad, and a row that says "you were challenged" without
-- saying to WHAT cannot be rendered or routed. Adding `challenge_id` changes the OUT columns, and
-- `create or replace` cannot do that (`42P13`), so all three functions are dropped and rebuilt together.
--
-- ══ THE BUG THIS FIXES ON THE WAY ══
--
-- `notification_feed()` joined `squads` with an INNER join. Any event whose `squad_id` is null — which is
-- every challenge invite — would have been derived correctly and then silently dropped before it reached
-- the feed. Same class of defect as the challenge hub's inner join to the same table (0087). LEFT join.
--
-- ══ STILL DERIVED, STILL NOT STORED ══
--
-- No invite table, no per-person status, no "declined" state. The event IS the challenge row: you are in
-- its `invited_ids`, it is in ENROLLMENT, and you have not joined. Join it and the notification stops
-- existing, because the condition that produced it stopped being true. Ignore it and it disappears when
-- enrollment closes. Nothing anywhere records that you passed (CS-D3).
--
-- Depends on 0054 (notification feed), 0087 (invited_ids). Idempotent. RUN AFTER 0087.

drop function if exists public.notification_feed(int);
drop function if exists public.notification_unread_count();
drop function if exists public.notification_events();

create or replace function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- Someone is waiting on you.
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = auth.uid() and q.status = 'pending'

  union all

  -- Someone joined a squad you own — by your approval, or by your invite code.
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = auth.uid() and m.user_id <> auth.uid()

  union all

  -- A squad answered you. `decided_at` is the moment, not when you asked.
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = auth.uid()
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all

  -- A friend named you in a competition and you haven't opted in. Derived, not stored: joining makes the
  -- condition false and the notification simply stops existing.
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and auth.uid() = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = auth.uid()
     );
$$;

create or replace function public.notification_feed(p_limit int default 50)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'kind',             e.kind,
             'at',               e.at,
             'unread',           e.at > coalesce((select notifications_seen_at from public.profiles where id = auth.uid()), '-infinity'::timestamptz),
             'squad_id',         e.squad_id,
             'squad_name',       s.name,
             'squad_crest',      s.crest,
             'squad_photo_url',  s.photo_url,
             'actor_id',         e.actor_id,
             'actor_name',       p.name,
             'actor_avatar_url', p.avatar_url,
             'challenge_id',     e.challenge_id,
             'challenge_name',   ch.name
           )
           order by e.at desc
         ), '[]'::jsonb)
    from (select * from public.notification_events() order by at desc limit greatest(p_limit, 0)) e
    -- LEFT, not inner: an event without a squad is a real event now, and an inner join would have
    -- dropped every challenge invite between deriving it and rendering it.
    left join public.squads s on s.id = e.squad_id
    left join public.profiles p on p.id = e.actor_id
    left join public.challenges ch on ch.id = e.challenge_id;
$$;

create or replace function public.notification_unread_count()
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
    from public.notification_events() e
   where e.at > coalesce((select notifications_seen_at from public.profiles where id = auth.uid()), '-infinity'::timestamptz);
$$;
