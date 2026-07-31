-- Forge Legacy - apply bundle: 0086 through 0093, IN ORDER.
--
-- NOT new migrations. All eight are numbered in supabase/migrations/; this file exists so the whole
-- chain can be pasted in one go. ORDER IS NOT OPTIONAL - each later file reads or replaces something an
-- earlier one creates. SAFE TO RE-RUN throughout.


-- =============================================================================
-- 0086_training_presence.sql
-- =============================================================================

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


-- =============================================================================
-- 0087_friend_challenges.sql
-- =============================================================================

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


-- =============================================================================
-- 0088_challenge_invite_notification.sql
-- =============================================================================

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


-- =============================================================================
-- 0089_training_status_on_profile.sql
-- =============================================================================

-- Forge Legacy — 0089: make "Everyone" mean something for Live Workout Status
--
-- 0086 put `training` on the visibility ladder, so Settings → Privacy offers all four audiences for it:
-- Everyone / Squads / Friends / Only me. Three of those work. **Everyone did nothing**, because the only
-- reader was `training_now()`, which by design looks at squad-mates and accepted friends and nobody else.
-- An athlete could set their status to Everyone and remain visible to exactly the same people as before.
--
-- A setting that promises more than it delivers is worse than one that isn't offered, so this is the
-- reader that makes it true: anyone who opens your profile sees you're training, if your audience lets
-- them.
--
-- ══ WHAT "EVERYONE" DOES AND DOESN'T MEAN ══
--
-- It means: a stranger looking at your profile can see you're mid-workout.
-- It does NOT mean: you appear in strangers' Home feeds. `training_now()` stays circle-scoped, because
-- Your Circle is about YOUR circle — a stranger training is not news to you, and a global "who's lifting
-- right now" list is a different product nobody asked for.
--
-- ══ WHY NOT JUST ADD A KEY TO `athlete_profile()` ══
--
-- Presence is volatile and the profile is not. `athlete_profile` is a large `stable` function returning a
-- record that changes when the athlete does something deliberate; training status changes on its own
-- every few minutes and expires on a clock. Bolting one onto the other would mean rewriting a hundred
-- lines to add a field, and would tie a fast-moving fact to a slow-moving read. Separate function,
-- separate cadence — and the profile screen can refresh one without refetching the other.
--
-- Same four-hour staleness floor as `training_now()`: one rule for "is this person actually training",
-- applied in both places, so the two can never disagree.
--
-- Depends on 0022 (visibility), 0069 (vis_clears), 0073 (friendships), 0086 (training_since).
-- Idempotent. RUN AFTER 0088.

create or replace function public.athlete_training_status(p_athlete uuid)
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
begin
  if v_uid is null then
    return null;
  end if;

  select * into p from public.profiles where id = p_athlete;
  if not found then
    return null;
  end if;

  -- Same ladder every other section uses (0069), with `friend` now reachable (0073).
  v_clear := case
    when p.id = v_uid then 'owner'
    when exists (
      select 1 from public.friendships f
       where f.status = 'ACCEPTED'
         and ((f.low_id = v_uid and f.high_id = p.id) or (f.low_id = p.id and f.high_id = v_uid))
    ) then 'friend'
    when exists (
      select 1
        from public.squad_members a
        join public.squad_members b on b.squad_id = a.squad_id
       where a.user_id = v_uid and b.user_id = p_athlete
    ) then 'squad'
    else 'stranger'
  end;

  -- Not cleared: the status never leaves the server. Null is "not yours to read", which the client
  -- renders identically to "not training" — a viewer cannot tell a private athlete from a resting one,
  -- and that is the point.
  if not public.vis_clears(coalesce(p.visibility->>'training', 'squads'), v_clear) then
    return null;
  end if;

  if p.training_since is null or p.training_since <= now() - interval '4 hours' then
    return jsonb_build_object('training', false);
  end if;

  return jsonb_build_object(
    'training', true,
    'label', p.training_label,
    'started_at', p.training_since
  );
end;
$$;

comment on function public.athlete_training_status(uuid) is
  'Whether this athlete is mid-workout, gated on their own visibility.training audience. This is what makes the Everyone option real — training_now() is circle-scoped and always will be.';


-- =============================================================================
-- 0090_photo_lift.sql
-- =============================================================================

-- Forge Legacy — 0090: a photo can be OF a lift
--
-- Most Legacy photos belong to a chapter and nothing narrower — a progress shot, a gym, a moment. A PR
-- photo is different: it is a picture of a specific lift at a specific weight, and filing it under
-- "somewhere in Chapter III" loses the only thing that made it worth taking.
--
-- The workout logger already knows. It detects a PR mid-set and opens a card that says "Capture the
-- moment — add a photo or video to your legacy", with a button that has always just dismissed. This is
-- the column that lets that button mean something.
--
-- ══ ONE COLUMN, NOT A JOIN ══
--
-- The obvious shape is `personal_record_id`, and it cannot work: `personal_records` rows are written by
-- `save_workout` at the END of a session, so at the moment the PR fires — which is the moment worth
-- photographing — there is no row to point at. The exercise's catalog key is available immediately, is
-- stable, and does not depend on the workout ever being saved.
--
-- The LOAD is deliberately not stored. `personal_records` already holds what was lifted on that date for
-- that exercise, so duplicating it here would be a second copy free to drift from the first. Exercise +
-- date is enough to recover it, and recovering a fact beats storing it twice.
--
-- Null for the ordinary case, which is most photos.
--
-- Depends on 0085 (chapter_photos). Idempotent. RUN AFTER 0089.

alter table public.chapter_photos add column if not exists exercise text;

comment on column public.chapter_photos.exercise is
  'Catalog key of the lift this photo is OF, when it is of one (a PR shot). Null for an ordinary chapter photo. Not a foreign key to personal_records: those rows are written at save time, and the moment worth photographing is mid-set, before one exists. The load is recoverable from personal_records by exercise + date rather than copied here.';

create index if not exists chapter_photos_exercise on public.chapter_photos (athlete_id, exercise, taken_on desc)
  where exercise is not null;

-- ── The album read has to return it ───────────────────────────────────────────
-- Identical to 0085's function apart from carrying `exercise` through, so the gallery and the viewer can
-- say what a PR shot is a photo OF. Without this the column would be written and never read.

create or replace function public.chapter_album(p_chapter uuid)
returns jsonb
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.chapters%rowtype;
begin
  if v_uid is null then
    return null;
  end if;

  select * into c from public.chapters where id = p_chapter and athlete_id = v_uid;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'chapter_id', c.id,
    'name', c.name,
    'subtitle', c.reflection,
    'start_date', c.start_date,
    'end_date', coalesce(c.end_date, c.sealed_at::date),
    'is_active', c.is_active,
    'sealed', c.sealed_at is not null,
    'weeks', greatest(1, ceil((
      coalesce(c.end_date, c.sealed_at::date, current_date) - c.start_date
    )::numeric / 7)::int),

    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'url', p.url,
               'taken_on', p.taken_on,
               'pose', p.pose,
               'caption', p.caption,
               'is_video', p.is_video,
               'is_starred', p.is_starred,
               'role', p.role,
               'exercise', p.exercise,
               -- The event for this photo's DATE. Chapter boundaries first, then the day's best PR.
               -- Null on an ordinary day, which is most of them.
               'event', case
                 when p.taken_on = c.start_date then 'Chapter opened'
                 when c.sealed_at is not null and p.taken_on = c.sealed_at::date then 'Chapter sealed'
                 else (
                   -- `exercise` is a catalog slug, so it is spoken rather than printed raw, and the load
                   -- keeps a half-plate without growing a ".0": FM drops trailing fraction zeros and the
                   -- rtrim removes the bare decimal point it leaves behind. 405 → "405", 227.5 → "227.5".
                   select 'PR · ' || initcap(replace(pr.exercise, '-', ' ')) || ' '
                          || rtrim(to_char(pr.load_value, 'FM999999.99'), '.')
                     from public.personal_records pr
                    where pr.athlete_id = v_uid
                      and pr.achieved_on = p.taken_on
                      and pr.measure_kind = 'load'
                    order by pr.load_value desc nulls last limit 1
                 )
               end
             ) order by p.taken_on desc, p.created_at desc)
        from public.chapter_photos p
       where p.chapter_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;


-- =============================================================================
-- 0091_workout_templates.sql
-- =============================================================================

-- Forge Legacy — 0091: save a day as a template
--
-- The Workouts tab has offered "Your Templates · Reusable workouts you can start any time" since the
-- first build, pointing at nothing. This is the entity behind it, built from the CAPTURE end rather than
-- the browse end — a templates screen with nothing to browse is a screen about an empty table.
--
-- ══ WHERE A TEMPLATE COMES FROM ══
--
-- Not authored. A template is a session you already did and want again: a free workout you built as you
-- went, or a program day you reshaped enough that the program no longer describes it. Those are exactly
-- the sessions with no home — a program day is already reusable BY the program, which is why saving one
-- adds nothing and this never appears as an obligation.
--
-- So the input is a `workout_id`, not a structure. The workout is already durably saved by the time the
-- offer appears, so the database can derive the template from what actually happened rather than trusting
-- a client to describe a session it has already navigated away from.
--
-- ══ WHY jsonb AND NOT TWO MORE TABLES ══
--
-- A template's exercises are read all at once, written all at once, never queried across, and never
-- joined. `template_exercises` + `template_sets` would be two tables and four policies to express a list
-- that is only ever handled whole. The same call the program definitions already make.
--
-- WHAT IS KEPT is the SHAPE — the lifts, in order, and how many sets of roughly how many reps. WHAT IS
-- DROPPED is the load. A template is a plan, and last Tuesday's weights are a record, not a plan;
-- carrying them would mean starting every session by deleting someone else's numbers. The logger already
-- surfaces your last performance per lift when you train, which is the right place for that fact.
--
-- Depends on 0001 (workouts, workout_exercises, workout_sets). Idempotent. RUN AFTER 0090.

create table if not exists public.workout_templates (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  -- [{ catalogKey, name, sets, targetReps }] in order.
  exercises    jsonb not null default '[]'::jsonb,
  -- What it was saved from. Soft — the template outlives the session that shaped it.
  source_workout_id uuid,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists workout_templates_athlete on public.workout_templates (athlete_id, last_used_at desc nulls last, created_at desc);

alter table public.workout_templates enable row level security;

drop policy if exists workout_templates_all on public.workout_templates;
create policy workout_templates_all on public.workout_templates for all
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- ── Save a finished session as a template ─────────────────────────────────────
-- Derives the shape from the workout itself. Returns the new template's id, or null when the workout
-- isn't yours or logged nothing worth repeating.
create or replace function public.save_workout_as_template(p_workout uuid, p_name text default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  w      public.workouts%rowtype;
  v_ex   jsonb;
  v_id   uuid;
  v_name text;
begin
  if v_uid is null then
    return null;
  end if;

  select * into w from public.workouts where id = p_workout and athlete_id = v_uid;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(t.obj order by t.position), '[]'::jsonb) into v_ex
    from (
      select we.position,
             jsonb_build_object(
               'catalogKey', we.catalog_key,
               'name', we.name,
               'sets', count(ws.id)::int,
               -- The set a plan should aim at, not the best one: the median rep count, rounded down, so
               -- one heavy triple among five eights doesn't rewrite the target.
               'targetReps', coalesce(
                 (percentile_disc(0.5) within group (order by ws.reps))::int,
                 0
               )
             ) as obj
        from public.workout_exercises we
        left join public.workout_sets ws on ws.workout_exercise_id = we.id and ws.reps is not null
       where we.workout_id = w.id
       group by we.id, we.position, we.catalog_key, we.name
    ) t;

  -- Nothing was logged; there is no shape to keep.
  if v_ex = '[]'::jsonb then
    return null;
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    v_name := left(coalesce(nullif(btrim(w.name), ''), 'Saved Workout'), 60);
  end if;

  insert into public.workout_templates (athlete_id, name, exercises, source_workout_id)
  values (v_uid, v_name, v_ex, w.id)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.save_workout_as_template(uuid, text) is
  'Turns a finished workout into a reusable template. Keeps the shape (lifts, order, sets, median target reps) and deliberately drops the load — a template is a plan, and last session''s weights are a record.';


-- =============================================================================
-- 0092_train_together.sql
-- =============================================================================

-- Forge Legacy — 0092: train together (S-10)
--
-- `workouts.partners` has existed since 0016. Activity History and Activity Detail both read it — the
-- "Trained With" row — and migration 0079 added TWENTY-FOUR honors that count partnered sessions,
-- distinct partners, and most-sessions-with-one-person.
--
-- Nothing has ever written a real name into it. The logger's partner tagger picks from a hardcoded roster
-- of invented people, so the only way to earn a partnership honor was to tag someone who does not exist.
-- This is the half that was missing, three migrations deep.
--
-- ══ EACH OF YOU DOES YOUR OWN COPY ══
--
-- The design is explicit: "You'll each do your own copy — log your own sets on your own screen. At the
-- end you'll both be credited for training together." That is not a compromise, it is the right model —
-- a synchronised session would mean one athlete waiting on another's rest timer, and neither of them
-- training. So there is no shared session object here. There is an INVITE, and two ordinary workouts that
-- each name the other person.
--
-- ══ DECLINING LEAVES NOTHING ══
--
-- Accepting sets a status; declining DELETES the row, exactly as a declined friend request does (0073).
-- No DECLINED state exists to find, so nothing anywhere records that someone said no — and a second
-- invite later is a fresh ask rather than a retry against a refusal.
--
-- Depends on 0001 (workouts.partners via 0016), 0029 (squads), 0073 (friendships), 0091 (templates).
-- Idempotent. RUN AFTER 0091.

create table if not exists public.workout_invites (
  id           uuid primary key default gen_random_uuid(),
  from_id      uuid not null references public.profiles(id) on delete cascade,
  to_id        uuid not null references public.profiles(id) on delete cascade,
  workout_name text not null check (char_length(btrim(workout_name)) between 1 and 60),
  -- The shape to train, when there is one. Null = you both start freestyle under a shared name.
  template_id  uuid references public.workout_templates(id) on delete set null,
  note         text,
  status       text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  constraint workout_invite_not_self check (from_id <> to_id)
);

create index if not exists workout_invites_to on public.workout_invites (to_id, status, created_at desc);
create index if not exists workout_invites_from on public.workout_invites (from_id, created_at desc);

alter table public.workout_invites enable row level security;

-- Both parties can read it; that is the whole audience.
drop policy if exists workout_invites_select on public.workout_invites;
create policy workout_invites_select on public.workout_invites for select
  using (from_id = auth.uid() or to_id = auth.uid());

-- You may only invite someone you actually train alongside: an accepted friend, or a squad-mate.
drop policy if exists workout_invites_insert on public.workout_invites;
create policy workout_invites_insert on public.workout_invites for insert with check (
  from_id = auth.uid()
  and to_id <> auth.uid()
  and (
    exists (
      select 1 from public.friendships f
       where f.status = 'ACCEPTED'
         and ((f.low_id = auth.uid() and f.high_id = to_id) or (f.low_id = to_id and f.high_id = auth.uid()))
    )
    or exists (
      select 1
        from public.squad_members a
        join public.squad_members b on b.squad_id = a.squad_id
       where a.user_id = auth.uid() and b.user_id = to_id
    )
  )
);

-- The recipient accepts (status), and either party can withdraw or decline by deleting.
drop policy if exists workout_invites_update on public.workout_invites;
create policy workout_invites_update on public.workout_invites for update
  using (to_id = auth.uid()) with check (to_id = auth.uid());

drop policy if exists workout_invites_delete on public.workout_invites;
create policy workout_invites_delete on public.workout_invites for delete
  using (from_id = auth.uid() or to_id = auth.uid());

-- ── Who you can train with ────────────────────────────────────────────────────
-- Accepted friends and squad-mates, deduplicated, with the squad named where one is shared. This is what
-- the logger's partner tagger should have been reading all along.
create or replace function public.training_partners()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(t.obj order by t.is_squad desc, t.name), '[]'::jsonb)
    from (
      select distinct on (p.id)
             p.id,
             coalesce(p.name, 'Athlete') as name,
             (sm.squad_id is not null) as is_squad,
             jsonb_build_object(
               'id', p.id,
               'name', coalesce(p.name, 'Athlete'),
               'handle', p.handle,
               'avatar_url', p.avatar_url,
               'squad_name', s.name
             ) as obj
        from public.profiles p
        left join lateral (
          select a.squad_id
            from public.squad_members a
            join public.squad_members b on b.squad_id = a.squad_id
           where a.user_id = p.id and b.user_id = auth.uid()
           limit 1
        ) sm on true
        left join public.squads s on s.id = sm.squad_id
       where p.id <> auth.uid()
         and (
           sm.squad_id is not null
           or exists (
             select 1 from public.friendships f
              where f.status = 'ACCEPTED'
                and ((f.low_id = auth.uid() and f.high_id = p.id) or (f.low_id = p.id and f.high_id = auth.uid()))
           )
         )
       order by p.id, sm.squad_id nulls last
    ) t;
$$;

-- ── The invite waiting on you ─────────────────────────────────────────────────
create or replace function public.workout_invite(p_invite uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', i.id,
           'from_id', i.from_id,
           'from_name', coalesce(p.name, 'Athlete'),
           'from_avatar_url', p.avatar_url,
           'workout_name', i.workout_name,
           'template_id', i.template_id,
           'template_summary', (
             select jsonb_build_object(
                      'lifts', jsonb_array_length(t.exercises),
                      'sets', (select coalesce(sum((e->>'sets')::int), 0) from jsonb_array_elements(t.exercises) e)
                    )
               from public.workout_templates t where t.id = i.template_id
           ),
           'note', i.note,
           'status', i.status,
           'created_at', i.created_at
         )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
   where i.id = p_invite
     and (i.to_id = auth.uid() or i.from_id = auth.uid());
$$;

-- ── Notifications ─────────────────────────────────────────────────────────────
-- The return type gains `invite_id`, which `create or replace` cannot do (42P13), so all three are
-- dropped and rebuilt. Identical to 0088 apart from the new branch and column.
drop function if exists public.notification_feed(int);
drop function if exists public.notification_unread_count();
drop function if exists public.notification_events();

create or replace function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = auth.uid() and q.status = 'pending'

  union all

  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = auth.uid() and m.user_id <> auth.uid()

  union all

  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = auth.uid()
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all

  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and auth.uid() = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = auth.uid()
     )

  union all

  -- Someone asked you to train. Derived like the rest: accepting flips the status and the notification
  -- stops existing, declining deletes the row and it stops existing. Neither leaves a trace.
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id
    from public.workout_invites i
   where i.to_id = auth.uid() and i.status = 'PENDING';
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
             'challenge_name',   ch.name,
             'invite_id',        e.invite_id,
             'invite_name',      wi.workout_name
           )
           order by e.at desc
         ), '[]'::jsonb)
    from (select * from public.notification_events() order by at desc limit greatest(p_limit, 0)) e
    left join public.squads s on s.id = e.squad_id
    left join public.profiles p on p.id = e.actor_id
    left join public.challenges ch on ch.id = e.challenge_id
    left join public.workout_invites wi on wi.id = e.invite_id;
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

comment on table public.workout_invites is
  'S-10 Train Together. An invite, not a shared session: each athlete logs their own workout and both name the other in workouts.partners — which is what finally makes 0079''s partnership honors earnable.';


-- =============================================================================
-- 0093_invite_shape.sql
-- =============================================================================

-- Forge Legacy — 0093: an invite carries the workout, not a pointer to it
--
-- 0092 let an invite name a template. It could not offer the most likely thing you would ask someone to
-- do with you: the session you already have planned today.
--
-- ══ WHY A SNAPSHOT AND NOT A REFERENCE ══
--
-- The obvious shape is `program_id` + a session index. It cannot work, for two independent reasons:
--
--   1. THEY MAY NOT OWN THE PROGRAM. Pointing at Powerbuilding II day 3 is meaningless to someone who
--      has never run Powerbuilding II, and buying them a copy of it is not what "train with me" means.
--   2. "NEXT SESSION" IS PER-ATHLETE. It resolves from each athlete's own completed count, so the same
--      pointer would open a different workout for each of you — which is precisely not training together.
--
-- So the invite carries the SHAPE, snapshotted at send time, in the same `[{catalogKey, name, sets,
-- targetReps}]` form templates use. What you asked them to do is what they get, whatever your program
-- does afterwards. Same reasoning as a frozen challenge result (CS-D17): the record of an offer should
-- not move because its source did.
--
-- `template_id` stays as PROVENANCE — "this came from your Leg Day A" — not as the thing the guest reads.
-- Empty `exercises` means a freestyle session under a shared name, which is a real third option, not a
-- missing value.
--
-- Depends on 0092 (workout_invites). Idempotent. RUN AFTER 0092.

alter table public.workout_invites add column if not exists exercises jsonb not null default '[]'::jsonb;

comment on column public.workout_invites.exercises is
  'The workout, snapshotted at send time: [{catalogKey, name, sets, targetReps}]. NOT a reference — the recipient may not own the source program, and "next session" resolves per athlete, so a pointer would open a different workout for each of them. Empty = freestyle under a shared name.';

-- ── The invite read has to return it ──────────────────────────────────────────
-- Identical to 0092's function apart from carrying `exercises` through, and counting the shape from the
-- invite itself rather than from a template that may not be there.
create or replace function public.workout_invite(p_invite uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', i.id,
           'from_id', i.from_id,
           'from_name', coalesce(p.name, 'Athlete'),
           'from_avatar_url', p.avatar_url,
           'workout_name', i.workout_name,
           'template_id', i.template_id,
           'exercises', i.exercises,
           'template_summary', case
             when jsonb_array_length(i.exercises) > 0 then jsonb_build_object(
               'lifts', jsonb_array_length(i.exercises),
               'sets', (select coalesce(sum((e->>'sets')::int), 0) from jsonb_array_elements(i.exercises) e)
             )
             else null
           end,
           'note', i.note,
           'status', i.status,
           'created_at', i.created_at
         )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
   where i.id = p_invite
     and (i.to_id = auth.uid() or i.from_id = auth.uid());
$$;
