-- Forge Legacy — 0163: a competition you can still join, and a variable the standings could not name
--
-- Two defects, both reported from one session: a friend was named in a competition and never heard about
-- it, and opening the competition returned `column reference "tz" is ambiguous` (42702).
--
-- ══ 1 · THE STANDINGS READ HAS BEEN DEAD SINCE 0099 ══
--
-- `challenge_detail()` (0064) declares a PL/pgSQL variable named `tz`. Its standings subquery selects
-- from `challenge_participants` JOINED TO `profiles` — and 0099 added `profiles.tz`. From that moment an
-- unqualified `tz` inside that scope names both a variable and a column, and PostgreSQL refuses to guess:
-- 42702, every time, for every athlete, on every competition. C-3 has not loaded since.
--
-- The fix is the naming convention every function written after 0099 already uses: `v_tz`, `v_k`. Nothing
-- else about the function changes.
--
-- `challenge_results_detail()` (0072) gets the same rename and is NOT broken today — its `tz` references
-- all sit inside derived tables that `profiles` is not in scope for. It declares the same two bare names
-- one join away from the identical failure, and leaving that standing is how 0064 got here.
--
-- Left alone: `challenge_score`, `challenge_baseline` (0063) and `challenge_type_leader` (0062) also
-- declare `tz`/`k`, but every reference is in an expression with no FROM clause. There is no relation in
-- scope to be ambiguous with, so there is nothing there to repair.
--
-- ══ 2 · AN INVITED FRIEND COULD NEVER SEE THE COMPETITION ══
--
-- Create Challenge defaults to "Starts Today", and today means midnight this morning — already past. The
-- creator is then routed straight to `/competitions`, whose first act is `advance_challenges()`. So a
-- competition is ACTIVE within seconds of being created, before its invitee has opened anything.
--
-- Both surfaces that offer a competition to somebody who has not joined tested `state = 'ENROLLMENT'`:
--
--   · `notification_events_for()` branch 6 — the invite in `/inbox`, the bell count, and (via
--     `push_enqueue_for`) the push. The event is DERIVED, so when the state flipped the notification did
--     not go unread — it stopped ever having existed.
--   · `challenge_hub()`'s `open` list — the "Open to Join" row, which is the only place the Join button
--     lives.
--
-- The invitee therefore had no notification and no way in. Nothing was broken in the sending: there was
-- nothing left to send.
--
-- Both gates now read `state in ('ENROLLMENT', 'ACTIVE')`, which is exactly what the
-- `challenge_participants_insert` policy (0087) has always permitted. Joining a running competition was
-- already legal at the table; only the surfaces disagreed with the rule they were meant to expose.
--
-- SCORING IS UNAFFECTED. `challenge_score()` measures every athlete over `c.start_at → c.end_at`, so a
-- late joiner is scored across the same window as everyone else, from a standing start. Nobody's number
-- moves because somebody else opted in on day three.
--
-- THIS WIDENS SQUAD TOO, DELIBERATELY. A member who did not opt in before their squad's competition
-- started hit the identical dead end, and the same policy always allowed them in.
--
-- THE NOTIFICATION NOW OUTLIVES ENROLLMENT. It used to disappear when enrollment closed; it now
-- disappears when the competition does. CS-D3 is untouched — joining still makes the condition false,
-- ignoring it still leaves no row anywhere, and nothing records that you passed. The row simply stays for
-- as long as it is still an offer you could take.
--
-- ══ 3 · WHAT THIS DOES NOT FIX ══
--
-- The lock screen. `push_pref_default('challenge_updates')` is FALSE (0120), so a competition invite
-- reaches `/inbox` and the bell and never a device, unless the recipient turned Challenge Updates on
-- themselves. That is P-5's locked default, it is mirrored by `NOTIF_DEFAULTS` in
-- `src/domain/settings/notifications.ts` with a test asserting the two agree, and flipping it is a
-- product decision about one toggle that currently bundles an invitation aimed at you with ambient
-- standing changes. Not a repair, so not done here.
--
-- ⚠ `notification_events_for` is rebuilt from 0153's body VERBATIM — all sixteen branches, one predicate
-- changed. 0088, 0092 and 0106 each rebuilt it from a predecessor and silently dropped a shipped feature.
--
-- Depends on 0064, 0072, 0087, 0099, 0153. Idempotent. RUN AFTER 0162.

-- ── 1 · challenge_detail (0064) — v_tz/v_k, nothing else ────────────────────
create or replace function public.challenge_detail(p_challenge uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.challenges%rowtype;
  v_tz  text;
  v_k   text;
begin
  if v_uid is null or not public.can_read_challenge(p_challenge, v_uid) then
    return null;
  end if;

  select * into c from public.challenges where id = p_challenge;
  if not found then
    return null;
  end if;

  v_k  := nullif(btrim(coalesce(c.metric_key, '')), '');
  v_tz := coalesce(nullif(btrim(c.tz), ''), 'UTC');
  begin
    perform now() at time zone v_tz;
  exception when others then
    v_tz := 'UTC';
  end;

  return jsonb_build_object(
    'id',          c.id,
    'name',        c.name,
    'description', c.description,
    'type',        c.type,
    'metric_key',  c.metric_key,
    'context',     c.context,
    'state',       c.state,
    'start_at',    c.start_at,
    'end_at',      c.end_at,
    'squad_id',    c.squad_id,
    'squad_name',  (select s.name from public.squads s where s.id = c.squad_id),
    'is_creator',  c.creator_id = v_uid,
    'i_joined',    exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = v_uid),

    'standings', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'user_id',     t.user_id,
                 'name',        t.name,
                 'avatar_url',  t.avatar_url,
                 'score',       t.score,
                 'place',       t.place,
                 -- Marked so the screen can say "T-3" rather than inventing an order between equals.
                 'tied',        t.tied,
                 'is_self',     t.user_id = v_uid,
                 'logged_today',t.logged_today,
                 'recent',      t.recent
               ) order by t.place, t.name)
        from (
          select
            cp.user_id,
            coalesce(p.name, 'Athlete') as name,
            p.avatar_url,
            public.challenge_score(c.id, cp.user_id) as score,
            rank() over (order by public.challenge_score(c.id, cp.user_id) desc) as place,
            count(*) over (partition by public.challenge_score(c.id, cp.user_id)) > 1 as tied,
            exists (
              select 1 from public.workouts w
               where w.athlete_id = cp.user_id
                 and (w.saved_at at time zone v_tz)::date = (now() at time zone v_tz)::date
            ) as logged_today,
            -- What they've added in the last 7 days, scored the same way the challenge is.
            public.metric_over(
              case c.type
                when 'GAIN_MAX_LIFT' then 'MAX_LIFT'
                when 'GAIN_VOLUME'   then 'MOST_VOLUME'
                when 'GAIN_REPS'     then 'MOST_REPS'
                when 'GAIN_DISTANCE' then 'DISTANCE_TOTAL'
                else c.type
              end,
              cp.user_id,
              greatest(c.start_at, now() - interval '7 days'),
              least(c.end_at, now()),
              v_k, v_tz
            ) as recent
          from public.challenge_participants cp
          join public.profiles p on p.id = cp.user_id
         where cp.challenge_id = c.id
        ) t
    ), '[]'::jsonb)
  );
end;
$$;

-- ── 2 · challenge_results_detail (0072) — the same two names, pre-emptively ──
create or replace function public.challenge_results_detail(p_challenge uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  c       public.challenges%rowtype;
  v_tz    text;
  v_k     text;
  v_mid   timestamptz;
  v_base  text;
  v_gain  boolean;
  v_field int;
begin
  if v_uid is null or not public.can_read_challenge(p_challenge, v_uid) then
    return null;
  end if;

  select * into c from public.challenges where id = p_challenge;
  if not found or c.state not in ('COMPLETED', 'ARCHIVED') then
    return null;
  end if;

  v_k  := nullif(btrim(coalesce(c.metric_key, '')), '');
  v_tz := coalesce(nullif(btrim(c.tz), ''), 'UTC');
  begin
    perform now() at time zone v_tz;
  exception when others then
    v_tz := 'UTC';
  end;

  v_base := case c.type
    when 'GAIN_MAX_LIFT' then 'MAX_LIFT'
    when 'GAIN_VOLUME'   then 'MOST_VOLUME'
    when 'GAIN_REPS'     then 'MOST_REPS'
    when 'GAIN_DISTANCE' then 'DISTANCE_TOTAL'
    else c.type
  end;
  v_gain := v_base <> c.type;
  v_mid  := c.start_at + (c.end_at - c.start_at) / 2;

  select count(*) into v_field from public.challenge_results r where r.challenge_id = c.id;

  return jsonb_build_object(
    'id', c.id, 'name', c.name, 'description', c.description,
    'type', c.type, 'metric_key', c.metric_key, 'context', c.context, 'state', c.state,
    'start_at', c.start_at, 'end_at', c.end_at,
    'squad_id', c.squad_id,
    'squad_name', (select s.name from public.squads s where s.id = c.squad_id),
    'field', v_field,

    'standings', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'user_id', t.user_id, 'name', t.name, 'avatar_url', t.avatar_url,
                 'score', t.score, 'place', t.place, 'is_winner', t.is_winner,
                 'tied', t.shared > 1, 'is_self', t.user_id = v_uid
               ) order by t.place, t.name)
        from (
          select r.user_id, coalesce(p.name, 'Athlete') as name,
                 p.avatar_url, r.score, r.place, r.is_winner,
                 count(*) over (partition by r.place) as shared
            from public.challenge_results r
            join public.profiles p on p.id = r.user_id
           where r.challenge_id = c.id
        ) t
    ), '[]'::jsonb),

    'winners', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', r.user_id, 'name', coalesce(p.name, 'Athlete'),
               'avatar_url', p.avatar_url, 'score', r.score) order by coalesce(p.name, 'Athlete'))
        from public.challenge_results r
        join public.profiles p on p.id = r.user_id
       where r.challenge_id = c.id and r.is_winner
    ), '[]'::jsonb),

    'summary', jsonb_build_object(
      'total', case when c.type in ('MAX_LIFT', 'GAIN_MAX_LIFT')
        then (select coalesce(max(r.score), 0) from public.challenge_results r where r.challenge_id = c.id)
        else (select coalesce(sum(r.score), 0) from public.challenge_results r where r.challenge_id = c.id)
      end,
      'athletes', v_field,
      'prs', (
        select count(*) from public.personal_records pr
         where pr.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
           and pr.achieved_on >= c.start_at::date and pr.achieved_on < c.end_at::date
      ),
      'athlete_days', (
        select count(*) from (
          select distinct w.athlete_id, (w.saved_at at time zone v_tz)::date as d
            from public.workouts w
           where w.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
             and w.saved_at >= c.start_at and w.saved_at < c.end_at
        ) x
      )
    ),

    'badges', (
      select coalesce(jsonb_agg(b.obj), '[]'::jsonb) from (

        select jsonb_build_object(
                 'kind', 'MOST_CONSISTENT', 'user_id', t.user_id,
                 'name', coalesce(p.name, 'Athlete'), 'value', t.days) as obj
          from (
            select w.athlete_id as user_id,
                   count(distinct (w.saved_at at time zone v_tz)::date) as days
              from public.workouts w
             where w.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
               and w.saved_at >= c.start_at and w.saved_at < c.end_at
             group by w.athlete_id
             order by days desc, w.athlete_id
             limit 1
          ) t
          join public.profiles p on p.id = t.user_id
         where t.days > 1

        union all

        select jsonb_build_object(
                 'kind', 'BIGGEST_CLIMB', 'user_id', m.user_id,
                 'name', coalesce(p.name, 'Athlete'), 'value', m.climb) as obj
          from (
            select r.user_id, (mid.mp - r.place) as climb
              from public.challenge_results r
              join (
                select r2.user_id,
                       rank() over (order by
                         case when v_gain then greatest(0,
                           public.metric_over(v_base, r2.user_id, c.start_at, v_mid, v_k, v_tz)
                           - public.metric_over(v_base, r2.user_id, c.start_at - (v_mid - c.start_at), c.start_at, v_k, v_tz))
                         else public.metric_over(v_base, r2.user_id, c.start_at, v_mid, v_k, v_tz) end
                       desc) as mp
                  from public.challenge_results r2
                 where r2.challenge_id = c.id
              ) mid on mid.user_id = r.user_id
             where r.challenge_id = c.id
             order by climb desc, r.place
             limit 1
          ) m
          join public.profiles p on p.id = m.user_id
         where m.climb >= 1

        union all

        -- LONGEST STREAK (CA7-D2, PD-7 — §6.3's Firewall bar struck).
        -- Gaps-and-islands: date minus a per-athlete row number is constant across consecutive days, so
        -- grouping on it counts each unbroken run. Bounded by the season, so the definition is complete
        -- and the value cannot drift after the close.
        select jsonb_build_object(
                 'kind', 'LONGEST_STREAK', 'user_id', st.user_id,
                 'name', coalesce(p.name, 'Athlete'), 'value', st.run) as obj
          from (
            select g.athlete_id as user_id, count(*) as run
              from (
                select d.athlete_id, d.day,
                       d.day - (row_number() over (partition by d.athlete_id order by d.day))::int as grp
                  from (
                    select distinct w.athlete_id, (w.saved_at at time zone v_tz)::date as day
                      from public.workouts w
                     where w.athlete_id in (select r.user_id from public.challenge_results r where r.challenge_id = c.id)
                       and w.saved_at >= c.start_at and w.saved_at < c.end_at
                  ) d
              ) g
             group by g.athlete_id, g.grp
             order by count(*) desc, g.athlete_id
             limit 1
          ) st
          join public.profiles p on p.id = st.user_id
         -- A single session is not a streak.
         where st.run > 1
      ) b
    )
  );
end;
$$;

-- ── 3a · challenge_hub (0087) — "Open to Join" means joinable, not unstarted ─
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
    -- Open to me: a squad I'm in, or a friend's competition I was named in, is still joinable and I
    -- haven't opted in. Still not an "invitation" in the data — no row records that I didn't join.
    -- ENROLLMENT *or* ACTIVE (0163), matching `challenge_participants_insert`: a competition that started
    -- this morning is one you can still enter, and it was the only kind an invited friend ever saw.
    'open', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
               'squad_id', c.squad_id, 'squad_name', s.name,
               'creator_name', coalesce(p.name, 'Athlete'),
               'start_at', c.start_at, 'end_at', c.end_at, 'state', c.state,
               'roster', (select count(*)::int from public.challenge_participants cp where cp.challenge_id = c.id)
             ) order by c.start_at)
        from public.challenges c
        left join public.squads s on s.id = c.squad_id
        left join public.profiles p on p.id = c.creator_id
       where c.state in ('ENROLLMENT', 'ACTIVE')
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

-- ── 3b · notification_events_for (0153) — sixteen branches, one predicate ────
--
-- ⚠ REBUILD FROM THIS BODY, NEVER FROM AN OLDER ONE. 0153's is now stale by one predicate.
create or replace function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid, post_id uuid)
language sql
security definer
stable
set search_path = public
as $$
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
         and public.vis_clears(coalesce(p.visibility->>'training', 'squads'), 'squad')
       order by w.id, s.id
    ) t;
$$;

revoke execute on function public.notification_events_for(uuid) from public;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. SIXTEEN branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared, workout_join_request, squad_post, squad_checkin, squad_recap, post_comment, post_reaction, squad_training_started, squad_training_finished. squad_post/squad_checkin/squad_recap and both squad_training_* branches are FAN-OUT — one row becomes one event per opted-in member. Everything after branch 9 is windowed: 14 days for the written branches, 4 hours for a start (the presence ceiling) and 24 hours for a finish. Branch 6 fires for ENROLLMENT *and* ACTIVE since 0163 — gated on ENROLLMENT alone it expired before the invited friend could ever see it, because a competition starting "today" is ACTIVE within seconds. Read by notification_events() for the viewer and by push_enqueue_for() for the sender. Rebuild from 0163''s body, never an older one — 0088, 0092 and 0106 each rebuilt from a predecessor and silently dropped a shipped feature.';

comment on function public.challenge_detail(uuid) is
  'C-3''s standings read. Its locals are v_tz/v_k, NOT tz/k: profiles.tz (0099) made a bare `tz` ambiguous inside the standings subquery, which joins profiles, and this function raised 42702 on every call from 0099 until 0163. Never give a local here a name a joined table also carries.';

-- ── 4 · Assert the edits landed ──────────────────────────────────────────────
-- A rename that silently didn't apply looks exactly like a rename that did.
do $$
begin
  if pg_get_functiondef('public.challenge_detail(uuid)'::regprocedure) !~ 'v_tz' then
    raise exception '0163: challenge_detail still has no v_tz — the rename did not apply';
  end if;
  if pg_get_functiondef('public.challenge_results_detail(uuid)'::regprocedure) !~ 'v_tz' then
    raise exception '0163: challenge_results_detail still has no v_tz';
  end if;
  if pg_get_functiondef('public.challenge_hub()'::regprocedure) !~ 'ENROLLMENT'', ''ACTIVE' then
    raise exception '0163: challenge_hub still only offers ENROLLMENT competitions';
  end if;
  if pg_get_functiondef('public.notification_events_for(uuid)'::regprocedure) !~ 'ENROLLMENT'', ''ACTIVE' then
    raise exception '0163: the challenge_invite branch still only fires during ENROLLMENT';
  end if;
  -- 0153's sixteen branches must all still be here.
  if (length(pg_get_functiondef('public.notification_events_for(uuid)'::regprocedure))
      - length(replace(pg_get_functiondef('public.notification_events_for(uuid)'::regprocedure), 'union all', ''))) / 9 <> 15 then
    raise exception '0163: notification_events_for no longer has sixteen branches — it was rebuilt from an older body';
  end if;
end;
$$;
