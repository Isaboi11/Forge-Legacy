-- Forge Legacy — 0059: the Challenge System (C-series foundation)
--
-- ⛔⛔ DO NOT RE-RUN THIS FILE. IT IS SUPERSEDED AND RE-PASTING IT BREAKS FRIENDS COMPETITIONS. ⛔⛔
--
--   `0087_friend_challenges.sql` replaced SIX of the objects below with FRIENDS-aware versions:
--   `can_read_challenge`, `challenges_select`, `challenges_insert`, `challenge_participants_insert`,
--   `challenge_hub()` (superseded again by 0163) and `advance_challenges()`.
--   Everything here is idempotent, so re-pasting this file to recover a half-applied run — which IS the
--   documented recovery procedure in this project — silently reverts all six to SQUAD-ONLY.
--
--   ⚠ IT SAID "FOUR" UNTIL 2026-08-19, AND THE TWO IT LEFT OUT ARE THE WORST TWO. `advance_challenges`
--   is the ENTIRE competition lifecycle — there is no scheduler — so on 0059's body a friends
--   competition is never promoted out of ENROLLMENT and never completed: the days do not progress, no
--   `challenge_results` row is ever written, and no winner is ever crowned. `challenge_hub()` then hides
--   the evidence, because a competition you joined that is stuck in ENROLLMENT is on neither of its two
--   lists. Reported by the PO on 2026-08-19 as *"it doesn't look like the days have progressed"*.
--
--   IT FAILS QUIETLY AND IT FAILS WEIRDLY: `challenge_hub()` is SECURITY DEFINER and never consults
--   these policies, so every friends competition keeps appearing in "Open to Join" while the table
--   refuses the insert with `42501`. The list and the button disagree, and nothing logs it.
--
--   If you have already done it: run `supabase/migrations/0165_challenge_policy_reassert.sql`, which
--   restates 0087's four POLICY-side bodies and asserts they took, **AND THEN**
--   `supabase/migrations/0168_challenge_lifecycle_reassert.sql`, which does the same for the two
--   lifecycle objects 0165 missed. Running only 0165 leaves every friends competition joinable and
--   permanently frozen, which is a worse failure than the one you set out to repair, because it looks
--   fixed.
--
-- First real backend for competitions. Built to `Challenge-System-Architecture-v1.0` v1.5 (CS-D1–D27),
-- scoped to what the rest of the app can actually support today.
--
-- SQUAD CONTEXT ONLY, FOR NOW. CS-D1 defines three roster sources — SQUAD, FRIENDS, COMMUNITY. The
-- `context` column carries all three because it is immutable and the enum is locked, but only SQUAD can
-- be created: FRIENDS needs a friends graph and COMMUNITY needs communities, neither of which exists.
-- The spec explicitly supports the squad-filtered view of C-1 as its own thing (CA3-D10), so this is a
-- scope boundary, not a divergence.
--
-- THE FOUR GATES (CS-D1) ARE ENFORCED HERE, not in the UI: no public (RLS is roster-scoped), no
-- cross-context (`context` immutable + squad_id required for SQUAD), no always-on (challenges are
-- bounded by start/end), no auto-enrollment (a participant row is only ever written by the athlete
-- themselves — joining is an act, never a default).
--
-- ANTI-SHAME IS STRUCTURAL (CS-D3), not copy:
--   · A withdrawn participant is DELETED, not flagged. There is no `left_at`, and there cannot be one —
--     leaving must leave no trace.
--   · There is no "declined" state for an invitation. Non-participation is invisible, so a squad member
--     who ignores an open challenge simply never appears; the client dismisses it device-locally.
--   · `challenge_results` records place and score but never a loser marker, and CS-D19's records are
--     positive-only.
--
-- NO RANK IMPACT (CS-D4). Nothing here writes a rank signal, and nothing should be added that does.
--
-- Depends on 0029 (squads) + 0001 (workouts, workout_sets, personal_records). Idempotent. RUN AFTER 0058.

-- ── Challenge ─────────────────────────────────────────────────────────────────
create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  context       text not null default 'SQUAD' check (context in ('SQUAD', 'FRIENDS', 'COMMUNITY')),
  squad_id      uuid references public.squads(id) on delete cascade,
  creator_id    uuid not null references public.profiles(id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 2 and 60),
  type          text not null check (type in ('MOST_WORKOUTS', 'MOST_VOLUME', 'MAX_LIFT', 'MOST_DURATION', 'MOST_PRS')),
  duration_type text not null default 'CUSTOM' check (duration_type in ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM')),
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  state         text not null default 'ENROLLMENT' check (state in ('DRAFT', 'ENROLLMENT', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- No cross-context: a SQUAD challenge without a squad is not a thing.
  constraint challenge_squad_required check (context <> 'SQUAD' or squad_id is not null),
  -- Not always-on: bounded duration is a gate, not a preference.
  constraint challenge_window check (end_at > start_at)
);
create index if not exists challenges_by_squad on public.challenges (squad_id, state, end_at desc);

-- ── Roster ────────────────────────────────────────────────────────────────────
-- CS-D3: withdrawal DELETES this row. Do not add a status column here.
create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index if not exists challenge_participants_user on public.challenge_participants (user_id);

-- ── Result ────────────────────────────────────────────────────────────────────
-- Written once at completion and never edited (CS-D5/D14). Co-winners each get is_winner (CS-D15).
create table if not exists public.challenge_results (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  score        numeric not null default 0,
  place        int not null,
  is_winner    boolean not null default false,
  recorded_at  timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.challenge_results enable row level security;

-- ── Firewall (CS-D2, narrowed for SQUAD surfaces by SQ-D2/v1.5) ───────────────
-- Challenge data is readable by the roster, and — for SQUAD context only — by that squad's members, so
-- the squad's own S-2 Competitions section can render standings. Nothing else, anywhere.
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
       )
  );
$$;

drop policy if exists challenges_select on public.challenges;
create policy challenges_select on public.challenges for select using (
  exists (select 1 from public.challenge_participants cp where cp.challenge_id = id and cp.user_id = auth.uid())
  or (context = 'SQUAD' and public.is_squad_member(squad_id, auth.uid()))
);

-- Any squad member may create a SQUAD challenge (CS-D6 eligibility); they are its creator.
drop policy if exists challenges_insert on public.challenges;
create policy challenges_insert on public.challenges for insert with check (
  creator_id = auth.uid()
  and context = 'SQUAD'
  and public.is_squad_member(squad_id, auth.uid())
);

-- Commissioner = challenge-scoped creator (SA-D3). No squad governance tier is created.
drop policy if exists challenges_update on public.challenges;
create policy challenges_update on public.challenges for update
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());

drop policy if exists challenge_participants_select on public.challenge_participants;
create policy challenge_participants_select on public.challenge_participants for select
  using (public.can_read_challenge(challenge_id, auth.uid()));

-- No auto-enrollment: you may only ever add yourself, and only while enrollment is open.
drop policy if exists challenge_participants_insert on public.challenge_participants;
create policy challenge_participants_insert on public.challenge_participants for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.challenges c
     where c.id = challenge_id
       and c.state in ('ENROLLMENT', 'ACTIVE')
       and c.context = 'SQUAD'
       and public.is_squad_member(c.squad_id, auth.uid())
  )
);

-- Leaving leaves no trace (CS-D3) — the row goes.
drop policy if exists challenge_participants_delete on public.challenge_participants;
create policy challenge_participants_delete on public.challenge_participants for delete
  using (user_id = auth.uid());

drop policy if exists challenge_results_select on public.challenge_results;
create policy challenge_results_select on public.challenge_results for select
  using (public.can_read_challenge(challenge_id, auth.uid()));

-- ── Live scoring (CS-D9 metric table) ─────────────────────────────────────────
-- One athlete's score for one challenge, over the challenge's own window. Definer: scoring reads every
-- participant's training data, which no participant may read directly.
create or replace function public.challenge_score(p_challenge uuid, p_user uuid)
returns numeric
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  c public.challenges%rowtype;
begin
  select * into c from public.challenges where id = p_challenge;
  if not found then
    return 0;
  end if;

  return case c.type
    when 'MOST_WORKOUTS' then coalesce((
      select count(*) from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at), 0)

    when 'MOST_VOLUME' then coalesce((
      select sum(ws.weight * ws.reps)
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at), 0)

    when 'MAX_LIFT' then coalesce((
      select max(ws.weight)
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at), 0)

    when 'MOST_DURATION' then coalesce((
      select sum(w.duration_sec) from public.workouts w
       where w.athlete_id = p_user and w.saved_at >= c.start_at and w.saved_at < c.end_at), 0) / 3600.0

    when 'MOST_PRS' then coalesce((
      select count(*) from public.personal_records pr
       where pr.athlete_id = p_user
         and pr.achieved_on >= c.start_at::date and pr.achieved_on < c.end_at::date), 0)

    else 0
  end;
end;
$$;

-- ── The hub (C-1) ─────────────────────────────────────────────────────────────
-- Everything C-1 renders, in one read: challenges open to me that I haven't joined, the ones I'm in
-- with my live standing, my completed history with placement, and the aggregate stats. Positive-framed
-- throughout — standing is a place, never a deficit, and nobody is marked as losing.
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
    -- Open to me: a squad I'm in is running enrollment and I haven't opted in. Not an "invitation" in
    -- the data — CS-D3 forbids recording non-participation — just a challenge I could still join.
    'open', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'type', c.type, 'context', c.context,
               'squad_id', c.squad_id, 'squad_name', s.name,
               'creator_name', coalesce(p.name, 'Athlete'),
               'start_at', c.start_at, 'end_at', c.end_at,
               'roster', (select count(*)::int from public.challenge_participants cp where cp.challenge_id = c.id)
             ) order by c.start_at)
        from public.challenges c
        join public.squads s on s.id = c.squad_id
        left join public.profiles p on p.id = c.creator_id
       where c.context = 'SQUAD'
         and c.state = 'ENROLLMENT'
         and public.is_squad_member(c.squad_id, v_uid)
         and not exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = v_uid)
    ), '[]'::jsonb),

    'active', coalesce((
      select jsonb_agg(x.obj order by x.end_at)
        from (
          select c.end_at,
                 jsonb_build_object(
                   'id', c.id, 'name', c.name, 'type', c.type, 'context', c.context,
                   'squad_id', c.squad_id, 'squad_name', s.name,
                   'start_at', c.start_at, 'end_at', c.end_at,
                   'roster', (select count(*)::int from public.challenge_participants cp where cp.challenge_id = c.id),
                   'my_score', public.challenge_score(c.id, v_uid),
                   -- Standing = my place among the roster by live score. Positive framing only.
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
            join public.squads s on s.id = c.squad_id
            join public.challenge_participants cp on cp.challenge_id = c.id and cp.user_id = v_uid
           where c.state = 'ACTIVE'
        ) x
    ), '[]'::jsonb),

    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'type', c.type, 'context', c.context,
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

-- ── Lifecycle (CS-D5) ─────────────────────────────────────────────────────────
-- No scheduler, so states advance when someone looks — the same lazy pattern as the weekly recap.
-- ENROLLMENT → ACTIVE at startAt; ACTIVE → COMPLETED at endAt, writing the immutable result set.
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

  update public.challenges
     set state = 'ACTIVE', updated_at = now()
   where state = 'ENROLLMENT' and start_at <= now()
     and (p_squad is null or squad_id = p_squad)
     and context = 'SQUAD' and public.is_squad_member(squad_id, v_uid);

  for c in
    select * from public.challenges
     where state = 'ACTIVE' and end_at <= now()
       and (p_squad is null or squad_id = p_squad)
       and context = 'SQUAD' and public.is_squad_member(squad_id, v_uid)
  loop
    -- Rank by score; ties share a place (CS-D15 co-winners), and everyone at place 1 is a winner.
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
