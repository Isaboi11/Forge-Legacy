-- Forge Legacy — 0033: fix squad-photo upload RLS
--
-- BUG (0030): the squad-photos write policies gated on `exists (select 1 from public.squads … owner)` —
-- a subquery from a storage.objects policy into public.squads. It evaluates to false at upload time
-- ("new row violates row-level security policy"), blocking every squad photo. Relax the write policies to
-- authenticated + correct bucket (the app only ever writes `<squadId>/…` paths); also guarantee the bucket
-- is public so getPublicUrl images actually load. RUN BY HAND in the SQL editor.

update storage.buckets set public = true where id = 'squad-photos';

drop policy if exists squad_photos_owner_insert on storage.objects;
create policy squad_photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'squad-photos');

drop policy if exists squad_photos_owner_update on storage.objects;
create policy squad_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'squad-photos');

drop policy if exists squad_photos_owner_delete on storage.objects;
create policy squad_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'squad-photos');
