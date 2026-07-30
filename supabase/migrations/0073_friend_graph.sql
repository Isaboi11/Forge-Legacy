-- Forge Legacy — 0073: the Friend graph (FR-001 / SOC-D5)
--
-- The substrate the whole Friends pillar sits on, and the thing several already-shipped surfaces have been
-- waiting for: `transformation` and `photos` default to the `friends` audience and are currently viewable
-- by nobody, the Add Friend button on every athlete profile is inert, and FRIENDS-context challenges are
-- schema-ready but unreachable.
--
-- ONE ROW PER PAIR, CANONICALLY ORDERED. `low_id < high_id` with a composite primary key makes a duplicate
-- friendship structurally impossible — there is no (a,b) plus (b,a) to reconcile, no way to end up
-- half-friends, and no trigger needed to keep two directional rows in step. `requested_by` preserves who
-- asked, which the ordering would otherwise lose. Symmetric by construction, which is what FR-D1 means by
-- mutual.
--
-- THERE IS NO 'DECLINED' STATE, AND THERE CANNOT BE ONE. Declining DELETES the row, exactly as withdrawing
-- from a challenge deletes the participant row (CS-D3) and as the squad-membership model treats
-- non-participation. A stored decline is a permanent record that someone said no to someone, which is the
-- single most shame-adjacent thing this flow could hold. Nothing here can answer "who rejected me".
--
-- DECLINING IS ALSO SILENT — no notification. Squad join requests notify on decline because you asked to
-- enter a group and are owed an answer by its owner; a friend request is one person asking another, and
-- "N declined your request" is a notification whose only content is a small rejection. The requester's UI
-- simply returns to Add Friend, because the row is gone. Accepting notifies (FR-D7), because that is worth
-- knowing.
--
-- NO FOLLOWERS. Deliberately absent, not unimplemented: FR-D2 (titled "Why this is NOT a follower
-- system"), FR-D3, `Social-System-Architecture` §143, and Product DNA §10 all bar asymmetric or
-- unconsented relationships. `Forge Public Profile.dc.html` draws a Follow button; it is not being built.
-- The product-owner reasoning: a follower would receive nothing (posts carry Friends/Squad audiences, and
-- a public audience means public performance data, which is the actually-barred item), and a visible
-- follower count becomes a number people optimize. Communities is the creator/audience surface if one is
-- ever needed.
--
-- DISCOVERY IS EXACT-HANDLE ONLY (SOC-D15). `find_athlete_by_handle` matches the whole handle and returns
-- at most one athlete. A prefix or fuzzy search that returned a LIST would be a discovery surface the
-- system populates, which is precisely what SOC-D15 bars — "Suggested Friends, People You May Know,
-- mutual-friend recommendations, or any discovery algorithm". You must already know who you are looking
-- for. QR codes and profile links are sanctioned future additions because they are equally deliberate.
--
-- FRIEND LISTS ARE PRIVATE (FR-D3): never public, never squad-visible. The RLS policy is the enforcement —
-- a row is selectable only by its two participants, so there is no query that walks the graph.
--
-- Depends on 0001 (profiles), 0054 (notification feed), 0069 (athlete_profile). Idempotent.

-- ── The relationship ──────────────────────────────────────────────────────────
create table if not exists public.friendships (
  low_id       uuid not null references public.profiles(id) on delete cascade,
  high_id      uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED')),
  requested_at timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (low_id, high_id),
  -- Canonical ordering: one row can only ever describe one pair, in one direction.
  constraint friendship_canonical check (low_id < high_id),
  -- The requester must be one of the two people in it.
  constraint friendship_requester check (requested_by in (low_id, high_id))
);

-- The PK already indexes low_id; this serves lookups from the other side.
create index if not exists friendships_high on public.friendships (high_id, status);

alter table public.friendships enable row level security;

-- FR-D3: visible ONLY to the two athletes. No third party can read any edge of the graph.
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select
  using (auth.uid() in (low_id, high_id));

-- No insert/update/delete policies by design. Every write goes through a definer function below so the
-- state transitions can be enforced — a policy cannot express "only the recipient may accept".

-- ── Clearance helper ──────────────────────────────────────────────────────────
-- Used by `athlete_profile()` to resolve `friend` clearance. Definer, because it must answer for a pair
-- neither of whom is necessarily the caller.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
     where f.low_id = least(a, b) and f.high_id = greatest(a, b)
       and f.status = 'ACCEPTED'
  );
$$;

-- ── Where do I stand with this athlete? ───────────────────────────────────────
-- 'self' · 'friends' · 'outgoing' (I asked) · 'incoming' (they asked) · 'none'
create or replace function public.friendship_with(p_athlete uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  f     public.friendships%rowtype;
begin
  if v_uid is null or p_athlete is null then
    return 'none';
  end if;
  if v_uid = p_athlete then
    return 'self';
  end if;

  select * into f from public.friendships
   where low_id = least(v_uid, p_athlete) and high_id = greatest(v_uid, p_athlete);

  if not found then
    return 'none';
  end if;
  if f.status = 'ACCEPTED' then
    return 'friends';
  end if;
  return case when f.requested_by = v_uid then 'outgoing' else 'incoming' end;
end;
$$;

-- ── Discovery: one exact handle, one athlete (SOC-D15) ────────────────────────
create or replace function public.find_athlete_by_handle(p_handle text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  h     text := lower(btrim(coalesce(p_handle, '')));
  p     public.profiles%rowtype;
begin
  if v_uid is null or char_length(h) < 3 then
    return null;
  end if;

  -- `handle` is citext, so this is already case-insensitive. Exact match only — see the header.
  select * into p from public.profiles where handle = h limit 1;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'handle', p.handle,
    'avatar_url', p.avatar_url,
    'athlete_type', p.athlete_type,
    'rank_family', p.rank_family,
    'rank_level', p.rank_level,
    -- Returned in the same read so the screen can draw the right button without a second round trip.
    'state', public.friendship_with(p.id)
  );
end;
$$;

-- ── Ask ───────────────────────────────────────────────────────────────────────
create or replace function public.request_friend(p_athlete uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  f     public.friendships%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_athlete is null or p_athlete = v_uid then
    raise exception 'you cannot add yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_athlete) then
    raise exception 'athlete not found';
  end if;

  select * into f from public.friendships
   where low_id = least(v_uid, p_athlete) and high_id = greatest(v_uid, p_athlete);

  if found then
    if f.status = 'ACCEPTED' then
      return 'friends';
    end if;
    -- They already asked you, and now you have asked them: that is mutual consent. Accept it rather than
    -- leaving two people each waiting on the other.
    if f.requested_by <> v_uid then
      update public.friendships
         set status = 'ACCEPTED', accepted_at = now()
       where low_id = f.low_id and high_id = f.high_id;
      return 'friends';
    end if;
    return 'outgoing';
  end if;

  insert into public.friendships (low_id, high_id, requested_by, status)
  values (least(v_uid, p_athlete), greatest(v_uid, p_athlete), v_uid, 'PENDING');
  return 'outgoing';
end;
$$;

-- ── Accept ────────────────────────────────────────────────────────────────────
create or replace function public.accept_friend_request(p_athlete uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  n     int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Only the person who did NOT ask may accept. This is the rule a policy could not express.
  update public.friendships
     set status = 'ACCEPTED', accepted_at = now()
   where low_id = least(v_uid, p_athlete) and high_id = greatest(v_uid, p_athlete)
     and status = 'PENDING'
     and requested_by = p_athlete;

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'no pending request from that athlete';
  end if;
end;
$$;

-- ── Decline · cancel · unfriend — all the same erasure ─────────────────────────
-- One function, because all three are "this relationship no longer exists" and none of them may leave a
-- trace. Declining is not recorded, not notified, and not distinguishable afterwards from never having
-- been asked.
create or replace function public.remove_friendship(p_athlete uuid)
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

  delete from public.friendships
   where low_id = least(v_uid, p_athlete) and high_id = greatest(v_uid, p_athlete)
     and v_uid in (low_id, high_id);
end;
$$;

-- ── My friends (FR-D3: mine alone) ────────────────────────────────────────────
create or replace function public.friend_list()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('friends', '[]'::jsonb, 'incoming', '[]'::jsonb, 'outgoing', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.name, 'handle', p.handle, 'avatar_url', p.avatar_url,
               'since', f.accepted_at) order by p.name)
        from public.friendships f
        join public.profiles p on p.id = case when f.low_id = v_uid then f.high_id else f.low_id end
       where v_uid in (f.low_id, f.high_id) and f.status = 'ACCEPTED'
    ), '[]'::jsonb),

    -- Waiting on me.
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.name, 'handle', p.handle, 'avatar_url', p.avatar_url,
               'at', f.requested_at) order by f.requested_at desc)
        from public.friendships f
        join public.profiles p on p.id = f.requested_by
       where v_uid in (f.low_id, f.high_id) and f.status = 'PENDING' and f.requested_by <> v_uid
    ), '[]'::jsonb),

    -- Waiting on them. Shown so a request can be withdrawn, never as a count of who hasn't answered.
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.name, 'handle', p.handle, 'avatar_url', p.avatar_url,
               'at', f.requested_at) order by f.requested_at desc)
        from public.friendships f
        join public.profiles p on p.id = case when f.low_id = v_uid then f.high_id else f.low_id end
       where v_uid in (f.low_id, f.high_id) and f.status = 'PENDING' and f.requested_by = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

-- ── Notifications (FR-D7) ─────────────────────────────────────────────────────
-- Two new kinds join the derived union. Still no notifications table: an event cannot outlive the fact
-- behind it, so a withdrawn request disappears from the feed by itself.
create or replace function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = auth.uid() and q.status = 'pending'

  union all

  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = auth.uid() and m.user_id <> auth.uid()

  union all

  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid
    from public.squad_join_requests q
   where q.user_id = auth.uid()
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all

  -- Someone wants to be your friend. No squad, hence the null.
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by
    from public.friendships f
   where f.status = 'PENDING'
     and auth.uid() in (f.low_id, f.high_id)
     and f.requested_by <> auth.uid()

  union all

  -- They said yes. Only the asker is told; there is no matching decline event, by design.
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = auth.uid() then f.high_id else f.low_id end
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = auth.uid();
$$;

-- The join to `squads` was INNER, so any event without a squad — every friend event — was silently
-- dropped from the feed. LEFT, so a squadless notification survives.
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
    left join public.squads s on s.id = e.squad_id
    left join public.profiles p on p.id = e.actor_id;
$$;

-- ── The payoff: friend clearance now resolves ─────────────────────────────────
-- Identical to 0069 except for one added branch. `transformation` and `photos` default to the `friends`
-- audience, so until now no viewer could clear them — the gates were correct and simply unreachable.
-- Nothing about the gating changed; the ladder just gained its missing rung.
create or replace function public.athlete_profile(p_athlete uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  p       public.profiles%rowtype;
  v_clear text;
  v_vis   jsonb;
begin
  if v_uid is null then
    return null;
  end if;

  select * into p from public.profiles where id = p_athlete;
  if not found then
    return null;
  end if;

  v_clear := case
    when p.id = v_uid then 'owner'
    -- Friend outranks squad-mate: the ladder is owner > friend > squad > stranger.
    when public.are_friends(v_uid, p_athlete) then 'friend'
    when exists (
      select 1
        from public.squad_members a
        join public.squad_members b on b.squad_id = a.squad_id
       where a.user_id = v_uid and b.user_id = p_athlete
    ) then 'squad'
    else 'stranger'
  end;

  v_vis := coalesce(p.visibility, '{}'::jsonb);

  return jsonb_build_object(
    'id', p.id, 'name', p.name, 'first_name', p.first_name, 'handle', p.handle,
    'initials', p.initials, 'avatar_url', p.avatar_url, 'athlete_type', p.athlete_type,
    'standard', p.standard, 'rank_family', p.rank_family, 'rank_level', p.rank_level,
    'joined_at', p.created_at, 'clearance', v_clear, 'is_self', p.id = v_uid,
    'friendship', public.friendship_with(p_athlete),

    'shared_squads', case when v_clear in ('squad', 'friend') then coalesce((
      select jsonb_agg(s.name order by s.name)
        from public.squads s
       where exists (select 1 from public.squad_members m1 where m1.squad_id = s.id and m1.user_id = v_uid)
         and exists (select 1 from public.squad_members m2 where m2.squad_id = s.id and m2.user_id = p_athlete)
    ), '[]'::jsonb) else '[]'::jsonb end,

    'chapter', case when public.vis_clears(coalesce(v_vis->>'chapter', 'everyone'), v_clear) then (
      select jsonb_build_object(
               'id', c.id, 'name', c.name, 'start_date', c.start_date,
               'workout_count', c.workout_count, 'honor_count', c.honor_count,
               'goal', (
                 select jsonb_build_object('name', g.name, 'current', g.current, 'target', g.target, 'unit', g.unit)
                   from public.goals g where g.chapter_id = c.id and g.is_primary limit 1
               ))
        from public.chapters c where c.athlete_id = p_athlete and c.is_active limit 1
    ) else null end,

    'history', case when public.vis_clears(coalesce(v_vis->>'history', 'everyone'), v_clear) then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'start_date', c.start_date,
               'sealed_at', c.sealed_at, 'workout_count', c.workout_count
             ) order by c.sealed_at desc nulls last)
        from public.chapters c where c.athlete_id = p_athlete and not c.is_active
    ), '[]'::jsonb) else null end,

    'accomplishments', case when public.vis_clears(coalesce(v_vis->>'accomplishments', 'everyone'), v_clear) then coalesce((
      select jsonb_agg(x.obj) from (
        select jsonb_build_object('id', a.id, 'name', a.name, 'date', a.date, 'note', a.note, 'featured', a.featured) as obj
          from public.accomplishments a
         where a.athlete_id = p_athlete
         order by a.featured desc, a.date desc nulls last, a.created_at desc
         limit 3
      ) x
    ), '[]'::jsonb) else null end,

    'stats', case when public.vis_clears(coalesce(v_vis->>'stats', 'squads'), v_clear) then jsonb_build_object(
      'workouts', (select count(*) from public.workouts w where w.athlete_id = p_athlete),
      'prs', (select count(*) from public.personal_records pr where pr.athlete_id = p_athlete),
      'chapters', (select count(*) from public.chapters c where c.athlete_id = p_athlete and not c.is_active)
    ) else null end,

    'timeline', case when public.vis_clears(coalesce(v_vis->>'timeline', 'squads'), v_clear) then coalesce((
      select jsonb_agg(t.obj order by t.at desc) from (
        select c.sealed_at as at,
               jsonb_build_object('kind', 'chapter', 'label', c.name, 'at', c.sealed_at) as obj
          from public.chapters c where c.athlete_id = p_athlete and c.sealed_at is not null
        union all
        select a.date::timestamptz as at,
               jsonb_build_object('kind', 'accomplishment', 'label', a.name, 'at', a.date) as obj
          from public.accomplishments a where a.athlete_id = p_athlete and a.date is not null
      ) t
    ), '[]'::jsonb) else null end,

    -- Now reachable: both default to the `friends` audience.
    'transformation', case when public.vis_clears(coalesce(v_vis->>'transformation', 'friends'), v_clear)
      then jsonb_build_object(
        'entries', (select count(*) from public.transformation_entries t where t.athlete_id = p_athlete)
      ) else null end
  );
end;
$$;
