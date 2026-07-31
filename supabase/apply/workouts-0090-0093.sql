-- Forge Legacy - APPLY BUNDLE 0090-0093 (workouts: PR photos, templates, train together)
--
-- 0086-0089 are already applied. This is the remainder of the chain, in order.
-- Every statement is idempotent, so a re-run is safe if you are unsure what landed.
--
--   0090 photo -> lift        chapter_photos.exercise, so a PR photo attaches to the lift
--   0091 workout templates    workout_templates + save_workout_as_template()
--   0092 train together       workout_invites + training_partners() + invite notifications
--   0093 invite shape         the invite carries the workout, not a pointer to it
--
-- RUN AS ONE BATCH. 0093 alters and replaces what 0092 creates.


-- ==========================================================================
-- 0090_photo_lift.sql
-- ==========================================================================

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


-- ==========================================================================
-- 0091_workout_templates.sql
-- ==========================================================================

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


-- ==========================================================================
-- 0092_train_together.sql
-- ==========================================================================

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


-- ==========================================================================
-- 0093_invite_shape.sql
-- ==========================================================================

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
