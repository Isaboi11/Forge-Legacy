-- Forge Legacy — 0054: the notification feed
--
-- There is no `notifications` table here, and that is deliberate. A fanout table needs a writer for
-- every event type, and every writer is a place the feed can silently diverge from the thing it claims
-- to report. Instead the feed is DERIVED at read time from rows that already exist and are already
-- true: the join-request queue (0050/0052) and squad membership (0029). Nothing to keep in sync,
-- nothing to backfill, and an event can never outlive the fact behind it.
--
-- Read state is one timestamp per athlete — `profiles.notifications_seen_at`. Anything newer is unread.
-- That trades per-item read marks (which nothing needs yet) for having no second table to maintain.
--
-- Four event kinds, all squad-membership for now; the union grows as other pillars land real rows:
--   join_request     — someone asked to join a squad you own   (actor = the asker)
--   member_joined    — someone joined a squad you own          (actor = the new member)
--   request_approved — a squad accepted your request           (subject = the squad)
--   request_declined — a squad didn't accept your request      (subject = the squad)
--
-- Depends on 0052. Idempotent. RUN BY HAND in the Supabase SQL editor, after 0053.

alter table public.profiles add column if not exists notifications_seen_at timestamptz;
comment on column public.profiles.notifications_seen_at is
  'Everything in notification_feed() newer than this reads as unread. Set when the athlete opens the feed.';

-- ── The union ─────────────────────────────────────────────────────────────────
-- Kept as its own function so the feed and its unread count can never disagree about what an event is.
create or replace function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- Someone is waiting on you.
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = auth.uid() and q.status = 'pending'

  union all

  -- Someone joined a squad you own — by your approval, or by your invite code.
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = auth.uid() and m.user_id <> auth.uid()

  union all

  -- A squad answered you. `decided_at` is the moment, not when you asked.
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid
    from public.squad_join_requests q
   where q.user_id = auth.uid()
     and q.status in ('approved', 'declined')
     and q.decided_at is not null;
$$;

-- ── The feed ──────────────────────────────────────────────────────────────────
-- Newest first, with the identity each row needs to render itself. `unread` is resolved here rather
-- than client-side so the list and the badge always agree on the cutoff.
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
             'actor_avatar_url', p.avatar_url
           )
           order by e.at desc
         ), '[]'::jsonb)
    from (select * from public.notification_events() order by at desc limit greatest(p_limit, 0)) e
    join public.squads s on s.id = e.squad_id
    left join public.profiles p on p.id = e.actor_id;
$$;

-- ── The badge ─────────────────────────────────────────────────────────────────
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
