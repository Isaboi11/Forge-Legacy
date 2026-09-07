-- exercise-media upload window — NOT a migration, nothing here is meant to stay.
--
-- The exercise-media bucket is public-read with no insert policy (0116) by design, and the service key
-- is not handed out. To push a batch of re-cut loops (scripts/animation-processing/upload_fixed.py) the
-- bucket is opened to the anon role for the minutes the upload takes, then closed again.
--
--   1. run the OPEN block
--   2. python upload_fixed.py <fixed_dir>      with SUPABASE_UPLOAD_KEY=<anon key> in the env
--   3. run the CLOSE block   (verify: the last query returns 0 rows)
--
-- While the window is open anyone holding the anon key can write to this one bucket and nothing else.
-- Reads are unaffected (media_public_read stays). Close it as soon as the upload prints "done".

-- ---------------------------------------------------------------- OPEN
drop policy if exists "exercise_media_window_insert" on storage.objects;
drop policy if exists "exercise_media_window_update" on storage.objects;

create policy "exercise_media_window_insert" on storage.objects
  for insert to anon
  with check ( bucket_id = 'exercise-media' );

create policy "exercise_media_window_update" on storage.objects
  for update to anon
  using ( bucket_id = 'exercise-media' )
  with check ( bucket_id = 'exercise-media' );

-- ---------------------------------------------------------------- CLOSE
-- drop policy if exists "exercise_media_window_insert" on storage.objects;
-- drop policy if exists "exercise_media_window_update" on storage.objects;
--
-- select policyname from pg_policies
--  where schemaname = 'storage' and tablename = 'objects' and policyname like 'exercise_media_window_%';
