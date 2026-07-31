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
