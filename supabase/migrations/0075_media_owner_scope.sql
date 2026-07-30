-- Forge Legacy — 0075: scope squad-media writes to their owner
--
-- NOT part of the Friends Feed work — found while reusing the bucket for it, and worth closing on its own.
--
-- 0042's storage policies check only `bucket_id = 'squad-media'`:
--
--     create policy squad_media_delete on storage.objects for delete to authenticated
--       using (bucket_id = 'squad-media');
--
-- So ANY authenticated athlete could delete or overwrite ANY object in that bucket — every squad's post
-- photos, every form-check video, every check-in recording, including for squads they have never been in.
-- Nothing in the app does that, which is why it has gone unnoticed, but the policy is what actually holds
-- the line and it wasn't holding one.
--
-- `storage.objects.owner` is set to the uploading user automatically, so scoping update and delete to the
-- owner is enough and needs no path convention. INSERT stays open to any authenticated athlete (the bucket
-- is where composed media lands before a post row exists, so there is no post to check against yet) and
-- SELECT stays open because the bucket is deliberately public-read — squad media URLs are handed to
-- `expo-image` directly.
--
-- Idempotent. RUN ANY TIME.

drop policy if exists squad_media_update on storage.objects;
create policy squad_media_update on storage.objects for update to authenticated
  using (bucket_id = 'squad-media' and owner = auth.uid())
  with check (bucket_id = 'squad-media' and owner = auth.uid());

drop policy if exists squad_media_delete on storage.objects;
create policy squad_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'squad-media' and owner = auth.uid());
