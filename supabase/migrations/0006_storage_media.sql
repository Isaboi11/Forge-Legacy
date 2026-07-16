-- Forge Legacy — 0006: media storage bucket + policies (Phase 3 follow-up)
-- The public `media` bucket holds pin media (the 485 deadlift clip + poster, later transformation
-- footage). Same owner-scoped-by-folder shape as `avatars` (objects at `<uid>/<file>`): public-read so
-- the clip plays by URL; writes/updates/deletes are the owner's only. Idempotent.

-- Force public even if a `media` bucket already existed (Phase 1's dashboard step created one as
-- PRIVATE by default) — on-conflict-do-nothing would have left it private.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "media_public_read"  on storage.objects;
drop policy if exists "media_owner_insert" on storage.objects;
drop policy if exists "media_owner_update" on storage.objects;
drop policy if exists "media_owner_delete" on storage.objects;

create policy "media_public_read" on storage.objects
  for select using ( bucket_id = 'media' );

create policy "media_owner_insert" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "media_owner_update" on storage.objects
  for update to authenticated
  using ( bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "media_owner_delete" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text );
