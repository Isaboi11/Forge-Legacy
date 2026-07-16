-- Forge Legacy — 0004: avatars storage bucket + policies (Phase 3 follow-up, media)
-- Phase 1's storage step never landed, so create the PUBLIC `avatars` bucket here and scope writes to
-- the owner via a per-user folder (objects live at `<uid>/avatar.<ext>`). Public bucket → images are
-- readable by their public URL; writes/updates/deletes are the owner's only. Idempotent.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read"  on storage.objects;
drop policy if exists "avatars_owner_insert" on storage.objects;
drop policy if exists "avatars_owner_update" on storage.objects;
drop policy if exists "avatars_owner_delete" on storage.objects;

create policy "avatars_public_read" on storage.objects
  for select using ( bucket_id = 'avatars' );

create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
