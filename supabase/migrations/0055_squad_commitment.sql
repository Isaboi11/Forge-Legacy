-- Forge Legacy — 0055: the squad Commitment, and the acceptance gate on joining (SQ-D14)
--
-- SQ-D14 is LOCKED and was explicitly flagged as "a requirement that flow must satisfy when authored":
--
--   "an athlete accepting a squad invitation is shown the current Commitment text and must
--    acknowledge it before completing the join."
--
-- The join flows (0040 invite code, 0050/0052 request→approval) were authored without it. This closes
-- that. Every door into a squad now refuses to open until the athlete has seen and accepted the values
-- the squad states — enforced HERE, not just in the UI, so the gate actually holds.
--
--   squads.commitment          — the values statement. Null / blank = the squad hasn't written one,
--                                and the gate is skipped (nothing to accept).
--   squad_by_code(code)        — resolve a code to its squad WITHOUT joining, so the athlete can be
--                                shown the Commitment before committing. 0040's join RPC did both at
--                                once, which left nowhere to put the gate.
--   p_accept on both joins     — refuses with `commitment_required` when the squad states values and
--                                the caller hasn't accepted them.
--
-- SQ-D14 §4 is respected: this is acceptance, not enforcement. Nothing scores, reports, or polices
-- behaviour against the Commitment afterwards.
--
-- LENGTH: SQ-D14 §2 deferred the cap to "S-3 implementation", citing S-3's 60-character purpose field
-- as the precedent for "short". 60 is too tight for the doc's own example (four values run ~62 chars),
-- so this sets 200 — enough for a short list or a short paragraph, and still unmistakably short.
--
-- GOVERNANCE: SQ-D14 §1 says any member may edit the Commitment, "same governance as squad name/purpose
-- (S-3 §4.3)". S-3 §4.3 does say all members can edit squad identity — but `Squad Settings Member.dc.html`
-- renders the member view READ-ONLY, and under PD-7 the design governs. The Commitment therefore follows
-- what is built and drawn: owner-edited, via the existing owner-only `squads` UPDATE policy. Recorded in
-- Squad-Architecture-Amendment-003 §5 as a doc correction owed to S-3, not a silent divergence.
--
-- Depends on 0052. Idempotent. RUN BY HAND in the Supabase SQL editor, after 0054.

alter table public.squads add column if not exists commitment text;

alter table public.squads drop constraint if exists squads_commitment_len;
alter table public.squads add constraint squads_commitment_len
  check (commitment is null or char_length(commitment) <= 200);

comment on column public.squads.commitment is
  'SQ-D14 values statement, shown and accepted at join. Null/blank = no gate. Owner-edited (PD-7, see Amendment-003 §5).';

-- ── Resolve a code without joining ────────────────────────────────────────────
-- SECURITY DEFINER for the same reason join_squad_by_code is: the code is the gate, so it has to
-- resolve a PRIVATE squad that RLS would otherwise hide. Returns identity only — never the roster.
create or replace function public.squad_by_code(p_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_sq   public.squads%rowtype;
  v_norm text := upper(btrim(coalesce(p_code, '')));
begin
  if v_norm = '' then
    return null;
  end if;

  select * into v_sq from public.squads where upper(invite_code) = v_norm limit 1;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id',           v_sq.id,
    'name',         v_sq.name,
    'motto',        v_sq.motto,
    'crest',        v_sq.crest,
    'photo_url',    v_sq.photo_url,
    'commitment',   nullif(btrim(coalesce(v_sq.commitment, '')), ''),
    'member_count', (select count(*)::int from public.squad_members m where m.squad_id = v_sq.id),
    'already',      v_uid is not null and public.is_squad_member(v_sq.id, v_uid)
  );
end;
$$;

-- ── Join by code, gated ───────────────────────────────────────────────────────
-- Drop 0040's 1-arg form so the named-argument call can't go ambiguous against the 2-arg one.
drop function if exists public.join_squad_by_code(text);

create or replace function public.join_squad_by_code(p_code text, p_accept boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_squad public.squads%rowtype;
  v_norm  text := upper(btrim(coalesce(p_code, '')));
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if v_norm = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into v_squad from public.squads where upper(invite_code) = v_norm limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if exists (select 1 from public.squad_members where squad_id = v_squad.id and user_id = v_uid) then
    return jsonb_build_object('ok', true, 'squad_id', v_squad.id, 'already', true);
  end if;

  -- SQ-D14: a squad that states values doesn't admit anyone who hasn't accepted them.
  if nullif(btrim(coalesce(v_squad.commitment, '')), '') is not null and not coalesce(p_accept, false) then
    return jsonb_build_object('ok', false, 'reason', 'commitment_required', 'squad_id', v_squad.id);
  end if;

  insert into public.squad_members (squad_id, user_id, role) values (v_squad.id, v_uid, 'member');
  return jsonb_build_object('ok', true, 'squad_id', v_squad.id, 'already', false);
end;
$$;

-- ── Request to join, gated ────────────────────────────────────────────────────
-- Accepted at REQUEST time: that's the last moment the athlete acts, and approval happens later
-- without them. Drop 0052's 2-arg form for the same ambiguity reason.
drop function if exists public.request_squad_join(uuid, text);

create or replace function public.request_squad_join(p_squad uuid, p_note text default null, p_accept boolean default false)
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

  if nullif(btrim(coalesce(v_sq.commitment, '')), '') is not null and not coalesce(p_accept, false) then
    return jsonb_build_object('ok', false, 'reason', 'commitment_required');
  end if;

  insert into public.squad_join_requests (squad_id, user_id, status, note)
    values (p_squad, v_uid, 'pending', nullif(btrim(p_note), ''))
    on conflict (squad_id, user_id) do update
      set status = 'pending', created_at = now(), decided_at = null, note = nullif(btrim(p_note), '');

  return jsonb_build_object('ok', true);
end;
$$;

-- ── Preview carries the Commitment ────────────────────────────────────────────
-- So a non-member reads the values BEFORE deciding to ask. Scalar return, so replace is safe here.
create or replace function public.squad_preview(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_sq       public.squads%rowtype;
  v_members  int;
  v_today    int;
  v_progress numeric := 0;
  v_roster   jsonb;
  v_state    text;
begin
  select * into v_sq from public.squads where id = p_squad;
  if not found then
    return null;
  end if;

  if v_sq.privacy <> 'public' and not public.is_squad_member(p_squad, v_uid) then
    return null;
  end if;

  select count(*)::int into v_members from public.squad_members where squad_id = p_squad;

  select count(distinct c.user_id)::int into v_today
    from public.squad_checkins c
   where c.squad_id = p_squad and c.created_at >= now() - interval '24 hours';

  if v_sq.goal_target is not null and v_sq.goal_started_at is not null then
    v_progress := public.squad_metric_sum(
      p_squad,
      coalesce(v_sq.goal_metric_kind, 'workout_count'),
      v_sq.goal_metric_key,
      v_sq.goal_started_at
    );
  end if;

  select coalesce(jsonb_agg(t.obj order by t.ord), '[]'::jsonb) into v_roster
    from (
      select
        jsonb_build_object(
          'id',              r.user_id,
          'name',            coalesce(p.name, 'Athlete'),
          'avatar_url',      p.avatar_url,
          'is_owner',        r.role = 'owner',
          'rank_family',     p.rank_family,
          'athlete_type',    p.athlete_type::text,
          'checked_in',      r.checked_in,
          'last_workout_at', r.last_at
        ) as obj,
        r.ord
      from (
        select
          m.user_id,
          m.role,
          lw.last_at,
          exists (
            select 1 from public.squad_checkins c
             where c.squad_id = p_squad and c.user_id = m.user_id
               and c.created_at >= now() - interval '24 hours'
          ) as checked_in,
          row_number() over (order by (m.role = 'owner') desc, lw.last_at desc nulls last, m.user_id) as ord
        from public.squad_members m
        left join lateral (
          select max(w.saved_at) as last_at from public.workouts w where w.athlete_id = m.user_id
        ) lw on true
        where m.squad_id = p_squad
      ) r
      join public.profiles p on p.id = r.user_id
      where r.ord <= 3
    ) t;

  v_state := case
    when v_uid is null then null
    when public.is_squad_member(p_squad, v_uid) then 'joined'
    when exists (
      select 1 from public.squad_join_requests q
       where q.squad_id = p_squad and q.user_id = v_uid and q.status = 'pending'
    ) then 'requested'
    else null
  end;

  return jsonb_build_object(
    'id',               v_sq.id,
    'name',             v_sq.name,
    'motto',            v_sq.motto,
    'description',      v_sq.description,
    'commitment',       nullif(btrim(coalesce(v_sq.commitment, '')), ''),
    'crest',            v_sq.crest,
    'photo_url',        v_sq.photo_url,
    'category',         v_sq.category,
    'member_cap',       v_sq.member_cap,
    'created_at',       v_sq.created_at,
    'member_count',     v_members,
    'trained_today',    v_today,
    'goal',             v_sq.goal,
    'goal_target',      v_sq.goal_target,
    'goal_metric_kind', coalesce(v_sq.goal_metric_kind, 'workout_count'),
    'goal_metric_key',  v_sq.goal_metric_key,
    'goal_progress',    v_progress,
    'my_state',         v_state,
    'roster',           v_roster
  );
end;
$$;
