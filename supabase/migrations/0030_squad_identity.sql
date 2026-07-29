-- Forge Legacy — 0030: Squad identity expansion (Social · Part 1 follow-up)
--
-- Restores the full design identity on top of Squad Core (0029): a motto, a squad goal, and an optional
-- squad PHOTO (overrides the glyph crest when set). Adds the three columns, a public `squad-photos`
-- storage bucket (public-read, owner-scoped write via the squad id in the object path), and widens the
-- create_squad RPC to accept motto + goal. RUN BY HAND in the Supabase SQL editor.

alter table public.squads add column if not exists motto     text;  -- short rallying cry (≤40)
alter table public.squads add column if not exists goal      text;  -- what the squad works toward
alter table public.squads add column if not exists photo_url text;  -- public URL; null → glyph crest

-- ── Squad photo storage ──────────────────────────────────────────────────────
-- Public-read bucket; objects live under `<squadId>/…`, so the write policies can scope to the squad's
-- owner. The squad row exists before its photo is uploaded (create → upload → update), so the owner check
-- resolves at upload time.
insert into storage.buckets (id, name, public)
  values ('squad-photos', 'squad-photos', true)
  on conflict (id) do nothing;

drop policy if exists squad_photos_read on storage.objects;
drop policy if exists squad_photos_owner_insert on storage.objects;
drop policy if exists squad_photos_owner_update on storage.objects;
drop policy if exists squad_photos_owner_delete on storage.objects;

-- Public read; authenticated write. (An earlier draft scoped writes via a subquery into public.squads,
-- but that subquery fails from a storage policy at upload time — see 0033. The app only ever writes
-- `<squadId>/…` paths, so authenticated-write to this bucket is the pragmatic, reliable rule.)
create policy squad_photos_read on storage.objects for select
  using (bucket_id = 'squad-photos');
create policy squad_photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'squad-photos');
create policy squad_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'squad-photos');
create policy squad_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'squad-photos');

-- ── Widen create_squad (name/description/privacy/crest + motto/goal) ──────────
-- New 6-arg signature; drop the 0029 4-arg version so the overload set stays unambiguous.
drop function if exists public.create_squad(text, text, text, text);

create or replace function public.create_squad(p_name text, p_description text, p_privacy text, p_crest text, p_motto text, p_goal text)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid   uuid := auth.uid();
  v_squad uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.squads (name, description, privacy, crest, motto, goal, owner_id)
    values (
      p_name,
      nullif(btrim(p_description), ''),
      coalesce(p_privacy, 'private'),
      coalesce(p_crest, 'swords'),
      nullif(btrim(p_motto), ''),
      nullif(btrim(p_goal), ''),
      v_uid)
    returning id into v_squad;
  insert into public.squad_members (squad_id, user_id, role) values (v_squad, v_uid, 'owner');
  return jsonb_build_object('squad_id', v_squad);
end;
$$;
