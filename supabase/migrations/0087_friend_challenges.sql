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
