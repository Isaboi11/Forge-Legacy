-- Forge Legacy — 0052: Squad join-request review (owner approve / decline) + the request note
--
-- Closes the join loop 0050 opened. `Squad Join Requests.dc.html` is the owner's queue: it reads each
-- pending requester's identity, the note they wrote, how long they've been waiting, and a trust signal
-- (squads you're both already in), then approves or declines.
--
-- Three things it needs that 0050 didn't have:
--   squad_join_requests.note      — the athlete's optional message. The design renders it as a clamped
--                                   italic quote with Read more; nothing could write one, so requesting
--                                   now carries an optional note (Squad Preview collects it).
--   squad_pending_requests(squad) — the queue itself. The owner can read the request ROWS under 0050's
--                                   RLS, but "squads you're both in" means reading squad_members for
--                                   squads the owner may not belong to → SECURITY DEFINER.
--   approve / decline             — owner-gated writes. Approve is the ONLY path that adds a member
--                                   without the athlete acting, so it enforces the size cap itself.
--
-- Depends on 0050. Idempotent. RUN BY HAND in the Supabase SQL editor, after 0051.

alter table public.squad_join_requests add column if not exists note text;

-- ── Requesting, with an optional note ─────────────────────────────────────────
-- Drop 0050's 1-arg version so the named-argument call can't go ambiguous against the 2-arg one.
drop function if exists public.request_squad_join(uuid);

create or replace function public.request_squad_join(p_squad uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sq  public.squads%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_sq from public.squads where id = p_squad;
  if not found or v_sq.privacy <> 'public' then
    return jsonb_build_object('ok', false, 'reason', 'not_public');
  end if;

  if exists (select 1 from public.squad_members where squad_id = p_squad and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'already_member');
  end if;

  insert into public.squad_join_requests (squad_id, user_id, status, note)
    values (p_squad, v_uid, 'pending', nullif(btrim(p_note), ''))
    on conflict (squad_id, user_id) do update
      set status = 'pending', created_at = now(), decided_at = null, note = nullif(btrim(p_note), '');

  return jsonb_build_object('ok', true);
end;
$$;

-- ── The owner's queue ─────────────────────────────────────────────────────────
-- Named `squad_pending_requests`, not `squad_join_requests` — a function sharing its table's name is
-- legal in Postgres but ambiguous to PostgREST. Newest first (the design's default sort).
create or replace function public.squad_pending_requests(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from public.squads s where s.id = p_squad and s.owner_id = v_uid) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'user_id',       q.user_id,
               'name',          coalesce(p.name, 'Athlete'),
               'avatar_url',    p.avatar_url,
               'rank_family',   p.rank_family,
               'athlete_type',  p.athlete_type::text,
               'note',          q.note,
               'created_at',    q.created_at,
               -- Trust signal: squads you and this athlete are BOTH already in (this one excluded).
               'mutual_squads', (
                 select count(*)::int
                   from public.squad_members a
                   join public.squad_members b on b.squad_id = a.squad_id and b.user_id = q.user_id
                  where a.user_id = v_uid and a.squad_id <> p_squad
               )
             )
             order by q.created_at desc
           )
      from public.squad_join_requests q
      join public.profiles p on p.id = q.user_id
     where q.squad_id = p_squad and q.status = 'pending'
  ), '[]'::jsonb);
end;
$$;

-- ── Approve ───────────────────────────────────────────────────────────────────
-- The only path that adds a member without that member acting, so the size ceiling is enforced HERE.
-- A full squad refuses rather than silently overfilling — the request stays pending for a free spot.
create or replace function public.approve_squad_join_request(p_squad uuid, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cap int;
  v_n   int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select member_cap into v_cap from public.squads where id = p_squad and owner_id = v_uid;
  if not found then
    raise exception 'not authorized';
  end if;

  if exists (select 1 from public.squad_members where squad_id = p_squad and user_id = p_user) then
    update public.squad_join_requests set status = 'approved', decided_at = now()
      where squad_id = p_squad and user_id = p_user;
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  select count(*) into v_n from public.squad_members where squad_id = p_squad;
  if v_n >= v_cap then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  insert into public.squad_members (squad_id, user_id, role) values (p_squad, p_user, 'member');
  update public.squad_join_requests set status = 'approved', decided_at = now()
    where squad_id = p_squad and user_id = p_user;

  return jsonb_build_object('ok', true, 'already', false);
end;
$$;

-- ── Decline ───────────────────────────────────────────────────────────────────
-- The row is kept (not deleted) so a re-request is an update rather than a silent duplicate, and so the
-- owner isn't shown the same declined athlete again until they ask a second time.
create or replace function public.decline_squad_join_request(p_squad uuid, p_user uuid)
returns jsonb
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
  if not exists (select 1 from public.squads s where s.id = p_squad and s.owner_id = v_uid) then
    raise exception 'not authorized';
  end if;

  update public.squad_join_requests set status = 'declined', decided_at = now()
    where squad_id = p_squad and user_id = p_user and status = 'pending';

  return jsonb_build_object('ok', true);
end;
$$;
