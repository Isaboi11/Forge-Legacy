-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0230: Pin a squad post to the top; edit a squad post
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: columns and index are guarded, both functions are create-or-replace of NEW functions
-- (no existing function is restated), and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- §1  adds squad_posts.pinned_at and squad_posts.edited_at, a partial index, and two functions:
--     pin_squad_post(post, pin)   — the squad OWNER pins/unpins, at most 3 per squad
--     edit_squad_post(post, body, layout) — the AUTHOR edits the words (and a posted workout's workout)
-- §2  asserts every piece exists, and RAISES if not
-- §3  reports: posts, pinned (expect 0), edited (expect 0)
--
-- ⚠ BEFORE THIS IS PASTED the app shows no Pin and no Edit (it asks for the columns and hides both when they are
-- missing) — nothing else changes. Squad Amendment 007 records the decision.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — the migration, verbatim from supabase/migrations/0230_squad_post_pin_edit.sql
-- ═════════════════════════════════════════════════════════════════════════════

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


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'squad_posts' and column_name = 'pinned_at') then
    raise exception '0230 did not take — missing: squad_posts.pinned_at';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'squad_posts' and column_name = 'edited_at') then
    raise exception '0230 did not take — missing: squad_posts.edited_at';
  end if;
  if to_regprocedure('public.pin_squad_post(uuid, boolean)') is null then
    raise exception '0230 did not take — missing: pin_squad_post';
  end if;
  if to_regprocedure('public.edit_squad_post(uuid, text, jsonb)') is null then
    raise exception '0230 did not take — missing: edit_squad_post';
  end if;
  if has_function_privilege('anon', 'public.edit_squad_post(uuid, text, jsonb)', 'execute') then
    raise exception '0230 — edit_squad_post is executable by anon';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — REPORT. Read-only. Expected now: posts = today's count, pinned 0, edited 0.
-- ═════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from public.squad_posts)                           as posts,
  (select count(*) from public.squad_posts where pinned_at is not null) as pinned,
  (select count(*) from public.squad_posts where edited_at is not null) as edited;
