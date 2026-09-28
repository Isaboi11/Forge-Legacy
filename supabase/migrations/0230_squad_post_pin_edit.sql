-- 0230 — Pin a squad post to the top; edit a squad post.
--
-- ══ WHY ══
--
-- PO 2026-09-28 (Squatober): "we need to be able to pin posts to the top of the squad so that they don't get buried,
-- and need to be able to edit posts just in general." A daily workout posted the night before sinks under the day's
-- check-ins and recaps before anybody has taken it.
--
-- Recorded as `Docs/Amendments/Squad-Architecture-Amendment-007-Pinned-And-Edited-Posts.md` — it amends SOC-D10
-- (reverse-chronological feed, LOCKED) for squads the way CF-D4 already did for communities.
--
-- ══ SHAPE ══
--
-- squad_posts.pinned_at  timestamptz  set = pinned; pinned posts sit above the feed, most recently pinned first.
-- squad_posts.edited_at  timestamptz  set when the author last changed the post.
--
-- pin_squad_post(p_post_id, p_pin)  — the SQUAD OWNER only (moderation is theirs, as delete already is, 0041), at most
--                                     3 pinned per squad. Returns the new state.
-- edit_squad_post(p_post_id, p_body, p_layout) — the AUTHOR only (0186's rule: nobody puts words in somebody else's
--                                     mouth). Writes the body, and — on a posted workout only — the workout. Nothing
--                                     else: never type, audience, squad, media, workout_id, or a pin.
--
-- ⚠ NO UPDATE POLICY, still (0186's reason): these two functions are the only doors, and each writes only its columns.
-- ⚠ SQ-A5-D1.1 holds: editing a posted workout never reaches a copy somebody already TOOK — `planned_workouts` holds
-- its own snapshot (0192), and nothing here touches it.
-- ⚠ squad_feed / squad_post_one are `returns table` and are NOT rebuilt (0186, 0117): the app reads pinned ids and
-- edited_at with its own RLS-scoped selects. Rebuilding a function body from an older copy is how this schema has
-- lost features before.

alter table public.squad_posts add column if not exists pinned_at timestamptz;
alter table public.squad_posts add column if not exists edited_at timestamptz;

create index if not exists squad_posts_pinned on public.squad_posts (squad_id, pinned_at desc) where pinned_at is not null;

create or replace function public.pin_squad_post(p_post_id uuid, p_pin boolean)
returns boolean
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_squad  uuid;
  v_pinned int;
begin
  if v_uid is null or p_post_id is null then
    raise exception 'Not signed in.';
  end if;

  select sp.squad_id into v_squad from public.squad_posts sp where sp.id = p_post_id;

  -- The squad's OWNER. Same message for "no such post" and "not yours" (0186), so it confirms nothing.
  if v_squad is null or not exists (select 1 from public.squads s where s.id = v_squad and s.owner_id = v_uid) then
    raise exception 'That post could not be pinned.';
  end if;

  if coalesce(p_pin, false) then
    select count(*) into v_pinned
      from public.squad_posts sp
     where sp.squad_id = v_squad
       and sp.pinned_at is not null
       and sp.id <> p_post_id;
    if v_pinned >= 3 then
      raise exception 'You can pin up to 3 posts. Unpin one first.';
    end if;
    update public.squad_posts sp set pinned_at = now() where sp.id = p_post_id;
    return true;
  end if;

  update public.squad_posts sp set pinned_at = null where sp.id = p_post_id;
  return false;
end;
$$;

revoke all on function public.pin_squad_post(uuid, boolean) from public;
grant execute on function public.pin_squad_post(uuid, boolean) to authenticated;
comment on function public.pin_squad_post(uuid, boolean) is
  'Pins (true) or unpins (false) a squad post; the squad owner only, at most 3 pinned per squad (0230, Squad Amendment 007).';

create or replace function public.edit_squad_post(p_post_id uuid, p_body text, p_layout jsonb default null)
returns timestamptz
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_type  text;
  v_body  text;
  v_now   timestamptz := now();
begin
  if v_uid is null or p_post_id is null then
    raise exception 'Not signed in.';
  end if;

  select sp.type into v_type from public.squad_posts sp where sp.id = p_post_id and sp.author_id = v_uid;
  if v_type is null then
    raise exception 'That post could not be edited.';
  end if;

  v_body := nullif(btrim(coalesce(p_body, '')), '');
  if v_body is not null and char_length(v_body) > 2000 then
    v_body := left(v_body, 2000);
  end if;
  -- A note is its words: a discussion or an announcement edited down to nothing is a delete, and delete is its own door.
  if v_body is null and v_type in ('discussion', 'announcement') then
    raise exception 'A post needs some words. Delete it instead.';
  end if;

  if p_layout is not null then
    -- Only a posted workout's workout, and only whole and well-formed (0192's own test at take time).
    if v_type <> 'workout'
       or p_layout ->> 'kind' is distinct from 'posted-workout'
       or nullif(btrim(coalesce(p_layout ->> 'name', '')), '') is null
       or jsonb_typeof(p_layout -> 'exercises') is distinct from 'array'
       or jsonb_array_length(p_layout -> 'exercises') = 0 then
      raise exception 'That workout could not be saved.';
    end if;
  end if;

  update public.squad_posts sp
     set body      = v_body,
         layout    = coalesce(p_layout, sp.layout),
         edited_at = v_now
   where sp.id = p_post_id
     and sp.author_id = v_uid;

  return v_now;
end;
$$;

revoke all on function public.edit_squad_post(uuid, text, jsonb) from public;
grant execute on function public.edit_squad_post(uuid, text, jsonb) to authenticated;
comment on function public.edit_squad_post(uuid, text, jsonb) is
  'Edits a squad post the CALLER AUTHORED (0230): its body, and on a posted workout its workout. Never type, audience, squad, media, workout_id or pin. Copies already taken are untouched (SQ-A5-D1.1).';
