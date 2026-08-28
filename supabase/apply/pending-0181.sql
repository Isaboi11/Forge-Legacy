-- ═══════════════════════════════════════
-- PENDING — 0181: live sessions — what a friend can see of a workout while it is happening
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded (`if not exists` / `create or replace`), and §3 is
-- read-only.
--
-- This is the ONLY migration awaiting application. 0180 is comment-only and needs nothing.
-- ═══════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO (2026-08-27): "I see a friend working out rn I should be able to see what they've logged and have
-- planned." Until now the only live fact was `profiles.training_since` + `training_label` (0086); the
-- session itself never left the phone until it was finished. This adds ONE ROW PER ATHLETE that their
-- own phone overwrites while they train (`publish_live_session`), deletes when they finish
-- (`clear_live_session`), and a friend reads through `live_session_of()`.
--
-- ⚠ OPT-IN, DEFAULT PRIVATE. The read is gated on a NEW visibility key `live_session` (default
--   'private') on top of the existing `training` gate. Nobody sees anybody's sets until that athlete
--   flips "Live Workout Detail" in Settings → Privacy. The client ships the setting in the same pass.
-- ⚠ NOT A LOG. One row, overwritten, deleted at the end, ignored after 4 hours — the record the product
--   deliberately does not keep (0086's own header) is still not kept.
-- ⚠ The read is SECURITY DEFINER for 0086's reason: the gate reads a column the viewer cannot select.
--   Every column inside the functions is qualified (the 42702 lesson from 0163).
--
-- §1  creates `live_sessions` (RLS on, owner-only policy) and three functions
-- §2  asserts the table, the policy and all three functions exist, and RAISES if not
-- §3  reports what is there. Read-only.
--
-- ══ PREDICTED §3 OUTPUT ══
--   live_rows = 0 — nothing publishes until the client that publishes is on a phone, and it is
--   published from an OTA/web deploy made in the same pass; a non-zero count on first run means
--   something else is writing this table, which nothing should.
--   athletes_opted_in = 0 — the key does not exist in anybody's visibility map yet.
--
-- ═══════════════════════════════════════
-- §1 — THE TABLE, THE POLICY, THE FUNCTIONS (verbatim from 0181_live_sessions.sql)
-- ═══════════════════════════════════════

-- 0181 — live sessions: what a friend can see of a workout while it is happening
--
-- PO (2026-08-27): "I see a friend working out rn I should be able to see what they've logged and have
-- planned." Until now the only live fact was two columns on `profiles` (0086: `training_since`,
-- `training_label`). The session itself never left the phone until it was finished and saved.
--
-- ══ THE SHAPE ══
--
-- ONE ROW PER ATHLETE, NOT A LOG. `live_sessions` is keyed on the athlete and overwritten on every
-- publish; it is deleted when the session ends and ignored after four hours (the same ceiling 0086
-- uses). 0086's own header explains why this is not a table of every session anyone ever began —
-- "including the abandoned ones — which is a record the product deliberately does not keep" — and this
-- table keeps that promise: the finished workout is `save_workout`'s, and this row is gone by then.
--
-- ══ THE GATE ══
--
-- ⚠ OPT-IN. The read is gated on a NEW visibility key, `live_session`, whose default is `private`.
-- `training` (0086) answers "are they training?"; this answers "what are they doing?", and the settings
-- copy for `training` promises only the fact. Broadening that key would make it deliver more than it
-- says. So: a friend who clears `training` can see the athlete is training; only a viewer who ALSO
-- clears `live_session` gets the plan and the log. CC-D2 / WSR-D6 forbid live performance on always-on
-- surfaces; an athlete choosing to publish it is the same door 0117 opens for a posted workout.
--
-- The read is a DEFINER function for the same reason 0086's are: the decision has to happen here,
-- against a column the viewer cannot select, rather than shipping everyone's session to a device that
-- promises to look away. Every column inside the functions is qualified (the 42702 lesson).
--
-- Depends on 0022 (visibility), 0029 (squads), 0069 (vis_clears), 0073 (friendships), 0086. Idempotent.

-- ── The row ───────────────────────────────────────────────────────────────────

create table if not exists public.live_sessions (
  athlete_id uuid primary key references public.profiles(id) on delete cascade,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.live_sessions is
  'One row per athlete: the plan and the log of the session they are in right now. Overwritten on every publish, deleted at the end, ignored after 4 hours. Read only through live_session_of(), which gates on visibility.live_session (default private).';

alter table public.live_sessions enable row level security;

-- The owner may do anything to their own row. Nobody else has a policy at all — every other read goes
-- through the definer function below, which is the whole point.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'live_sessions' and policyname = 'live_sessions_owner_all'
  ) then
    create policy live_sessions_owner_all on public.live_sessions
      for all to authenticated
      using (athlete_id = auth.uid())
      with check (athlete_id = auth.uid());
  end if;
end $$;

-- ── Publish / clear (the athlete's own device) ────────────────────────────────

create or replace function public.publish_live_session(p_payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  -- A session cannot reach this through `liveSessionSnapshot`; anything that does is not one.
  if p_payload is null or pg_column_size(p_payload) > 65536 then
    return;
  end if;
  insert into public.live_sessions (athlete_id, payload, updated_at)
  values (auth.uid(), p_payload, now())
  on conflict (athlete_id) do update
     set payload = excluded.payload,
         updated_at = now();
end;
$$;

create or replace function public.clear_live_session()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  delete from public.live_sessions ls where ls.athlete_id = auth.uid();
end;
$$;

-- ── Read (a friend or squad-mate) ─────────────────────────────────────────────
--
-- Returns null when the viewer may not even know the athlete is training (the `training` gate — a
-- private athlete and a resting one look identical, as in 0089). Otherwise:
--   { training: false, name, avatar_url }                                     — not training now
--   { training: true, sharing: false, name, avatar_url, label, started_at }   — training, detail private
--   { training: true, sharing: true,  ..., payload, updated_at }              — the plan and the log
--     (payload is null when they opted in but the app that is training has not published — an older
--     build. The screen says "nothing shared yet" rather than inventing a session.)

create or replace function public.live_session_of(p_athlete uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  p        public.profiles%rowtype;
  v_clear  text;
  v_cut    timestamptz := now() - interval '4 hours';
  v_base   jsonb;
  ls       public.live_sessions%rowtype;
begin
  if v_uid is null then
    return null;
  end if;

  select * into p from public.profiles pr where pr.id = p_athlete;
  if not found then
    return null;
  end if;

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

  -- Gate 1: may they know the athlete is training at all? (0086/0089's rule, unchanged.)
  if not public.vis_clears(coalesce(p.visibility->>'training', 'squads'), v_clear) then
    return null;
  end if;

  v_base := jsonb_build_object(
    'name', coalesce(p.name, 'Athlete'),
    'avatar_url', p.avatar_url
  );

  if p.training_since is null or p.training_since <= v_cut then
    return v_base || jsonb_build_object('training', false);
  end if;

  v_base := v_base || jsonb_build_object(
    'training', true,
    'label', p.training_label,
    'started_at', p.training_since
  );

  -- Gate 2: may they see what the session IS? Default private — an opt-in, never an inheritance.
  if not public.vis_clears(coalesce(p.visibility->>'live_session', 'private'), v_clear) then
    return v_base || jsonb_build_object('sharing', false);
  end if;

  select * into ls
    from public.live_sessions l
   where l.athlete_id = p_athlete
     and l.updated_at > v_cut;
  if not found then
    return v_base || jsonb_build_object('sharing', true, 'payload', null);
  end if;

  return v_base || jsonb_build_object(
    'sharing', true,
    'payload', ls.payload,
    'updated_at', ls.updated_at
  );
end;
$$;

-- ── Grants: signed-in athletes only, never anon ───────────────────────────────

revoke all on function public.publish_live_session(jsonb) from public;
revoke all on function public.clear_live_session() from public;
revoke all on function public.live_session_of(uuid) from public;
grant execute on function public.publish_live_session(jsonb) to authenticated;
grant execute on function public.clear_live_session() to authenticated;
grant execute on function public.live_session_of(uuid) to authenticated;


-- ═══════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ═══════════════════════════════════════

do $$
declare
  missing text := '';
begin
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'live_sessions') then
    missing := missing || ' table live_sessions;';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'live_sessions' and policyname = 'live_sessions_owner_all') then
    missing := missing || ' policy live_sessions_owner_all;';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'publish_live_session') then
    missing := missing || ' function publish_live_session;';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'clear_live_session') then
    missing := missing || ' function clear_live_session;';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'live_session_of') then
    missing := missing || ' function live_session_of;';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'live_sessions' and c.relrowsecurity) then
    missing := missing || ' RLS on live_sessions;';
  end if;
  if missing <> '' then
    raise exception '0181 DID NOT FULLY APPLY. Missing:%', missing;
  end if;
end $$;

-- ═══════════════════════════════════════
-- §3 — WHAT IS NOW THERE. Read-only.
-- ═══════════════════════════════════════

select
  (select count(*) from public.live_sessions)                                                        as live_rows,
  (select count(*) from public.profiles p where coalesce(p.visibility->>'live_session','private') <> 'private') as athletes_opted_in,
  (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'live_session_of') as reader_is_definer,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'live_sessions')  as policies;
