-- Forge Legacy — apply bundle: 0086 → 0087 → 0088, IN ORDER.
--
-- NOT new migrations. All three are numbered in supabase/migrations/; this file exists so the whole
-- chain can be pasted in one go.
--
-- ORDER IS NOT OPTIONAL. 0087 adds `invited_ids`, which 0088's notification derivation reads; running
-- 0088 first fails with `42703: column c.invited_ids does not exist`.
--
--   0086  training presence — profiles.training_since + set_training_status() + training_now()
--   0087  competitions between friends — invited_ids, the FRIENDS branch through every policy,
--         and challenge_hub()/advance_challenges() generalised off squad-only
--   0088  the invite notification — notification_events/feed/unread_count DROPPED and rebuilt
--         (the return type gains challenge_id, which create-or-replace cannot do)
--
-- SAFE TO RE-RUN: columns are `if not exists`, constraints are dropped before being re-added,
-- policies are dropped before being recreated, and every function is create-or-replace.


-- ═══════════════════════════════════════════════════════════════════════════
-- 0086_training_presence.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0086: training presence ("Live Now")
--
-- Home's Your Circle has shown a Live Now block since the first build, fed by a fixture that named two
-- squad-mates and claimed they were mid-workout. Nothing could ever have been true there: an in-progress
-- workout lived only in a client-side session, and `workouts` gets its row at SAVE time — so the database
-- knew who had finished and never who had started. This is the missing half.
--
-- ══ TWO COLUMNS, NOT A TABLE ══
--
-- Presence is one fact per athlete that is almost always null, replaced rather than appended, and never
-- historical. A row per session would accumulate a log of every workout anyone ever began — including the
-- abandoned ones — which is a record the product deliberately does not keep (CS-D3's instinct: nothing
-- surfaces a thing someone didn't finish).
--
-- ══ STALENESS IS THE HARD PART ══
--
-- An app that dies mid-set never clears its own flag, so "training since" alone leaves a ghost training
-- forever. Three guards, and the last is the one that matters:
--
--   1. The session ends the status on finish and on abandon.
--   2. A client-side stale timer already ends the session after its own timeout.
--   3. `training_now()` will not report a start older than 4 HOURS, whatever the column says. So a ghost
--      expires on its own, and nobody has to trust a client to have cleaned up after itself.
--
-- ══ WHO CAN SEE IT ══
--
-- `training` joins `profiles.visibility` (0022) as a section, so it rides the audience ladder every other
-- section uses — everyone / squads / friends / private — and `private` IS the off switch. Default is
-- `squads`: the people you train alongside see it, strangers never do. No new privacy concept, no second
-- settings surface, and `vis_clears()` (0069) already implements the rule.
--
-- Depends on 0022 (visibility), 0029 (squads), 0069 (vis_clears), 0073 (friendships). Idempotent.
-- RUN AFTER 0085.

alter table public.profiles add column if not exists training_since timestamptz;
alter table public.profiles add column if not exists training_label text;

comment on column public.profiles.training_since is
  'When the current workout started, or null. Presence only — never history. Reads ignore anything older than 4h so a crashed client cannot leave a ghost training forever.';
comment on column public.profiles.training_label is
  'The workout being trained ("Pull Day B"), shown beside the name in Live Now.';

-- Only ever your own row, and only ever these two columns.
create or replace function public.set_training_status(p_active boolean, p_label text default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
     set training_since = case when p_active then now() else null end,
         training_label = case when p_active then nullif(btrim(coalesce(p_label, '')), '') else null end
   where id = auth.uid();
end;
$$;

-- ── Who is training right now ─────────────────────────────────────────────────
-- Squad-mates and accepted friends, each gated on THEIR OWN `training` audience. Definer, because the
-- gate has to read a column the viewer cannot select directly — the whole point is that the decision
-- happens here rather than shipping everyone's status to a device that promises to look away.
create or replace function public.training_now()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cut timestamptz;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  v_cut := now() - interval '4 hours';

  return coalesce((
    select jsonb_agg(t.obj order by
             -- Squad first: the people you actually train alongside outrank a friend you have never
             -- lifted with. Then whoever started most recently, so the row keeps moving.
             case when t.source = 'squad' then 0 else 1 end,
             t.training_since desc)
      from (
        select distinct on (p.id)
               p.id,
               p.training_since,
               case when sm.squad_id is not null then 'squad' else 'friend' end as source,
               jsonb_build_object(
                 'user_id', p.id,
                 'name', coalesce(p.name, 'Athlete'),
                 'avatar_url', p.avatar_url,
                 'label', p.training_label,
                 'started_at', p.training_since,
                 'source', case when sm.squad_id is not null then 'squad' else 'friend' end,
                 'squad_name', s.name
               ) as obj
          from public.profiles p

          -- A squad we share. `distinct on` keeps one row per athlete when we share several.
          left join lateral (
            select a.squad_id
              from public.squad_members a
              join public.squad_members b on b.squad_id = a.squad_id
             where a.user_id = p.id and b.user_id = v_uid
             limit 1
          ) sm on true
          left join public.squads s on s.id = sm.squad_id

         where p.id <> v_uid
           and p.training_since is not null
           and p.training_since > v_cut
           and (
             sm.squad_id is not null
             or exists (
               select 1 from public.friendships f
                where f.status = 'ACCEPTED'
                  and ((f.low_id = v_uid and f.high_id = p.id) or (f.low_id = p.id and f.high_id = v_uid))
             )
           )
           -- Their audience, not ours. `private` is the off switch.
           and public.vis_clears(
                 coalesce(p.visibility->>'training', 'squads'),
                 case when sm.squad_id is not null then 'squad' else 'friend' end
               )
         order by p.id, p.training_since desc
      ) t
  ), '[]'::jsonb);
end;
$$;

comment on function public.training_now() is
  'Squad-mates and accepted friends currently training, squad first then most recent. Gated on each athlete''s own visibility.training audience (default squads; private = off). Ignores starts older than 4h.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 0087_friend_challenges.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0087: competitions between friends (CS-D1's second context)
--
-- `Challenge-System-Architecture` CS-D1 defines three roster sources — SQUAD, FRIENDS, COMMUNITY — and
-- 0059 built only the first, because the friends graph did not exist. It does now (0073), so a
-- competition no longer has to route through a squad. Creating one told you to "open Competitions from a
-- squad", which for two friends who share no squad is a dead end.
--
-- ══ WHERE THE ROSTER COMES FROM ══
--
-- A SQUAD challenge takes its roster from the squad: everyone in it can see the challenge and opt in.
-- Friends are not a group — there is no "my friends" object to point at, only a graph of pairs — so a
-- FRIENDS challenge names who it is for. `invited_ids` is that list.
--
-- This is NOT auto-enrollment, and CS-D1 still holds: being invited puts the challenge in front of you,
-- it does not enter you. You still opt in yourself, and `challenge_participants`' insert policy still
-- only ever lets you add YOURSELF. Invitation decides who can see it; joining stays the athlete's act.
--
-- CS-D3 (nothing records non-participation) survives too: an invited athlete who never joins leaves no
-- row anywhere. `invited_ids` is a property of the challenge — who it was opened to — not a per-person
-- status table with a "declined" state.
--
-- ══ ONLY REAL FRIENDS ══
--
-- The insert policy checks every invited id is an ACCEPTED friend of the creator, so a FRIENDS challenge
-- cannot be used to put your name in front of someone who has not accepted you. That check lives in the
-- database rather than the screen, because a client-side one is a suggestion.
--
-- Depends on 0059 (challenges), 0073 (friendships). Idempotent. RUN AFTER 0086.

alter table public.challenges add column if not exists invited_ids uuid[] not null default '{}';

comment on column public.challenges.invited_ids is
  'FRIENDS context only: who the competition was opened to. Being here means you can SEE and JOIN it — never that you are entered (CS-D1). Empty for SQUAD, whose roster is the squad.';

-- A FRIENDS challenge has no squad, the same way a SQUAD challenge must have one.
alter table public.challenges drop constraint if exists challenge_friends_no_squad;
alter table public.challenges add constraint challenge_friends_no_squad
  check (context <> 'FRIENDS' or squad_id is null);

-- ── Are all of these accepted friends of mine? ────────────────────────────────
create or replace function public.all_accepted_friends(p_ids uuid[], p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_length(p_ids, 1), 0) > 0
     and not exists (
       select 1 from unnest(p_ids) as t(id)
        where t.id = p_uid
           or not exists (
             select 1 from public.friendships f
              where f.status = 'ACCEPTED'
                and ((f.low_id = p_uid and f.high_id = t.id) or (f.low_id = t.id and f.high_id = p_uid))
           )
     );
$$;

-- ── Visibility ────────────────────────────────────────────────────────────────
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

-- Any squad member may open a SQUAD challenge; anyone may open a FRIENDS one against people who have
-- actually accepted them.
drop policy if exists challenges_insert on public.challenges;
create policy challenges_insert on public.challenges for insert with check (
  creator_id = auth.uid()
  and (
    (context = 'SQUAD' and public.is_squad_member(squad_id, auth.uid()))
    or (context = 'FRIENDS' and squad_id is null and public.all_accepted_friends(invited_ids, auth.uid()))
  )
);

-- Still no auto-enrollment: you may only ever add YOURSELF, and only while enrollment is open. The
-- FRIENDS branch widens who is eligible, not who does the adding.
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

-- ── Hub: friends competitions belong in the same three lists ──────────────────
-- Identical to 0059's shape apart from generalising every squad-only clause. The squad join becomes a
-- LEFT join throughout, so a FRIENDS challenge (which has no squad) is no longer silently dropped by an
-- inner join it can never satisfy.
create or replace function public.challenge_hub()
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
    return jsonb_build_object('open', '[]'::jsonb, 'active', '[]'::jsonb, 'history', '[]'::jsonb, 'stats', '{}'::jsonb);
  end if;

  return jsonb_build_object(
    -- Open to me: a squad I'm in, or a friend's competition I was named in, is running enrollment and I
    -- haven't opted in. Still not an "invitation" in the data — no row records that I didn't join.
    'open', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
               'squad_id', c.squad_id, 'squad_name', s.name,
               'creator_name', coalesce(p.name, 'Athlete'),
               'start_at', c.start_at, 'end_at', c.end_at,
               'roster', (select count(*)::int from public.challenge_participants cp where cp.challenge_id = c.id)
             ) order by c.start_at)
        from public.challenges c
        left join public.squads s on s.id = c.squad_id
        left join public.profiles p on p.id = c.creator_id
       where c.state = 'ENROLLMENT'
         and (
           (c.context = 'SQUAD' and public.is_squad_member(c.squad_id, v_uid))
           or (c.context = 'FRIENDS' and (c.creator_id = v_uid or v_uid = any(c.invited_ids)))
         )
         and not exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = v_uid)
    ), '[]'::jsonb),

    'active', coalesce((
      select jsonb_agg(x.obj order by x.end_at)
        from (
          select c.end_at,
                 jsonb_build_object(
                   'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
                   'squad_id', c.squad_id, 'squad_name', s.name,
                   'start_at', c.start_at, 'end_at', c.end_at,
                   'roster', (select count(*)::int from public.challenge_participants cp where cp.challenge_id = c.id),
                   'my_score', public.challenge_score(c.id, v_uid),
                   'my_place', (
                     select count(*) + 1
                       from public.challenge_participants cp2
                      where cp2.challenge_id = c.id
                        and public.challenge_score(c.id, cp2.user_id) > public.challenge_score(c.id, v_uid)
                   ),
                   'leader_score', (
                     select coalesce(max(public.challenge_score(c.id, cp3.user_id)), 0)
                       from public.challenge_participants cp3 where cp3.challenge_id = c.id
                   )
                 ) as obj
            from public.challenges c
            left join public.squads s on s.id = c.squad_id
            join public.challenge_participants cp on cp.challenge_id = c.id and cp.user_id = v_uid
           where c.state = 'ACTIVE'
        ) x
    ), '[]'::jsonb),

    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
               'squad_name', s.name, 'end_at', c.end_at,
               'place', r.place, 'score', r.score, 'is_winner', r.is_winner,
               'roster', (select count(*)::int from public.challenge_results rr where rr.challenge_id = c.id)
             ) order by c.end_at desc)
        from public.challenge_results r
        join public.challenges c on c.id = r.challenge_id
        left join public.squads s on s.id = c.squad_id
       where r.user_id = v_uid and c.state in ('COMPLETED', 'ARCHIVED')
    ), '[]'::jsonb),

    'stats', (
      select jsonb_build_object(
               'entered', count(*)::int,
               'wins',    count(*) filter (where r.is_winner)::int,
               'podiums', count(*) filter (where r.place <= 3)::int,
               'fav_type', (
                 select c2.type from public.challenge_results r2
                   join public.challenges c2 on c2.id = r2.challenge_id
                  where r2.user_id = v_uid
                  group by c2.type order by count(*) desc, c2.type limit 1
               )
             )
        from public.challenge_results r
        join public.challenges c on c.id = r.challenge_id
       where r.user_id = v_uid and c.state in ('COMPLETED', 'ARCHIVED')
    )
  );
end;
$$;

-- ── Lifecycle: advance a friends competition too ──────────────────────────────
-- Same lazy pattern (no scheduler). The scope test becomes "one I can read" rather than "one whose squad
-- I'm in", so a friends season starts and closes on exactly the same terms as a squad one.
create or replace function public.advance_challenges(p_squad uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.challenges%rowtype;
begin
  if v_uid is null then
    return;
  end if;

  update public.challenges ch
     set state = 'ACTIVE', updated_at = now()
   where ch.state = 'ENROLLMENT' and ch.start_at <= now()
     and (p_squad is null or ch.squad_id = p_squad)
     and public.can_read_challenge(ch.id, v_uid);

  for c in
    select * from public.challenges ch
     where ch.state = 'ACTIVE' and ch.end_at <= now()
       and (p_squad is null or ch.squad_id = p_squad)
       and public.can_read_challenge(ch.id, v_uid)
  loop
    insert into public.challenge_results (challenge_id, user_id, score, place, is_winner)
      select c.id, t.user_id, t.score, t.place, t.place = 1
        from (
          select cp.user_id,
                 public.challenge_score(c.id, cp.user_id) as score,
                 rank() over (order by public.challenge_score(c.id, cp.user_id) desc) as place
            from public.challenge_participants cp
           where cp.challenge_id = c.id
        ) t
      on conflict (challenge_id, user_id) do nothing;

    update public.challenges set state = 'COMPLETED', updated_at = now() where id = c.id;
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 0088_challenge_invite_notification.sql
-- ═══════════════════════════════════════════════════════════════════════════

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
