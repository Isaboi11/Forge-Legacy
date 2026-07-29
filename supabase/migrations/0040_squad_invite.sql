-- Forge Legacy — 0040: Squad invite codes + join-by-code (Social · Part 1 · Invites)
--
-- The keystone that makes squads MULTI-PERSON. Each squad carries a stable, shareable invite code; a
-- non-member joins by entering it. Code-based joining is the MVP invite mechanism (no friends graph /
-- directed invites yet — the design's "Add From Your Circle" + "Pending Invites" ride on those and are
-- deferred). RUN BY HAND in the Supabase SQL editor.
--
-- Model:
--   squads.invite_code            — human-shareable `PREFIX-XXXX` (prefix from the name, 4 random chars).
--                                    Set by a BEFORE INSERT trigger; backfilled for existing squads.
--   join_squad_by_code(code)      — SECURITY DEFINER so a PRIVATE squad can be joined by its code (the code
--                                    IS the gate; RLS otherwise hides private squads from non-members).
--   regenerate_squad_code(squad)  — owner-only; rolls the code (invalidates the old one).

-- ── Column + uniqueness ───────────────────────────────────────────────────────
alter table public.squads add column if not exists invite_code text;
-- Nulls are distinct in a Postgres unique index, so pre-backfill rows don't collide.
create unique index if not exists squads_invite_code_key on public.squads (invite_code);

-- ── Code generation ───────────────────────────────────────────────────────────
-- Ambiguity-free alphabet (no I/L/O/0/1) so a spoken/handwritten code round-trips cleanly.
create or replace function public._squad_code_rand(n int)
returns text
language sql
volatile
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, n);
$$;

-- `IRON-7Q2K` — a 4-char prefix from the squad name (letters/digits only, padded if short) + 4 random chars.
create or replace function public.gen_squad_code(p_name text)
returns text
language plpgsql
volatile
as $$
declare
  v_pre text;
begin
  v_pre := substr(regexp_replace(upper(coalesce(p_name, '')), '[^A-Z0-9]', '', 'g'), 1, 4);
  if length(v_pre) < 4 then
    v_pre := v_pre || public._squad_code_rand(4 - length(v_pre));
  end if;
  return v_pre || '-' || public._squad_code_rand(4);
end;
$$;

-- Assign a unique code on insert (unless the caller already supplied one).
create or replace function public.squads_set_invite_code()
returns trigger
language plpgsql
as $$
declare
  c     text;
  tries int := 0;
begin
  if new.invite_code is null then
    loop
      c := public.gen_squad_code(new.name);
      exit when not exists (select 1 from public.squads where invite_code = c);
      tries := tries + 1;
      if tries > 12 then
        c := public.gen_squad_code(new.name) || public._squad_code_rand(2); -- widen the space, give up looping
        exit;
      end if;
    end loop;
    new.invite_code := c;
  end if;
  return new;
end;
$$;

drop trigger if exists squads_set_invite_code_trg on public.squads;
create trigger squads_set_invite_code_trg before insert on public.squads
  for each row execute function public.squads_set_invite_code();

-- Backfill existing squads (sequential → each generated code sees the ones already assigned).
do $$
declare
  r record;
  c text;
begin
  for r in select id, name from public.squads where invite_code is null loop
    loop
      c := public.gen_squad_code(r.name);
      exit when not exists (select 1 from public.squads where invite_code = c);
    end loop;
    update public.squads set invite_code = c where id = r.id;
  end loop;
end $$;

-- ── Join by code ──────────────────────────────────────────────────────────────
-- SECURITY DEFINER: resolves the squad + inserts the caller's membership even for a PRIVATE squad (whose row
-- the squads_select RLS would otherwise hide). Idempotent — re-entering a code you're already in is a no-op.
create or replace function public.join_squad_by_code(p_code text)
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

  insert into public.squad_members (squad_id, user_id, role) values (v_squad.id, v_uid, 'member');
  return jsonb_build_object('ok', true, 'squad_id', v_squad.id, 'already', false);
end;
$$;

-- ── Regenerate (owner) ────────────────────────────────────────────────────────
-- Rolls to a fresh unique code, invalidating the old one. Owner-only (checked here, definer-side).
create or replace function public.regenerate_squad_code(p_squad uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  c      text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  select name into v_name from public.squads where id = p_squad and owner_id = v_uid;
  if not found then
    raise exception 'not authorized';
  end if;
  loop
    c := public.gen_squad_code(v_name);
    exit when not exists (select 1 from public.squads where invite_code = c);
  end loop;
  update public.squads set invite_code = c, updated_at = now() where id = p_squad;
  return c;
end;
$$;
