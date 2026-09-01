-- Forge Legacy — 0188: the photo archive stops being a public folder
--
-- ══ WHAT THIS CLOSES ══
--
-- `0146`'s "Still open" §1 — read on the media buckets is open to `anon`. Both of the personal photo
-- buckets were created `public: true` with a SELECT policy carrying NO `TO` clause and NO owner scope
-- (`create policy chapter_photos_read … using (bucket_id = 'chapter-photos')`, 0085), so every progress
-- photo any athlete has ever taken is fetchable by anyone holding the URL, forever, signed out.
--
-- 0146 could not close it and said so: *"Making the bucket private turns every one of those into a 404
-- — every photo in the app disappears. Closing it means moving to signed URLs across every media
-- surface, which is an app change and a release, not a migration."* That app change is
-- `src/lib/signed-media.ts`. This is the migration half.
--
-- ⛔ ══ ORDERING. THIS IS THE WHOLE RISK OF THE FILE ══
--
-- **Ship the OTA before pasting this.** Every athlete still running a bundle that calls
-- `getPublicUrl()` is calling it against a private bucket the moment this runs, and every photo in the
-- archive 404s on a screen that is nothing but photos. `createSignedUrl` works on a PUBLIC bucket too,
-- so the app change is a no-op until this lands — which is exactly what makes that order safe and the
-- reverse order a visible outage. Confirm the update is live, THEN paste.
--
-- ══ ⚠ WHY THE READ POLICY IS NOT JUST `owner = auth.uid()` ══
--
-- That is the obvious policy and it is a trap. `storage.objects.owner` is populated by the client on
-- upload; 0146 already relies on it for UPDATE and DELETE, where a null owner costs an athlete the
-- ability to re-upload or tidy up. On SELECT the same null costs them **the photo itself, permanently,
-- with no recovery path and no error anyone would think to report.** An archive is the one place in
-- this app where a false negative is unacceptable — the product's promise is that it is kept.
--
-- So ownership is established the way the schema actually establishes it. The object path is
-- `<chapterId>/<file>` (`photos-live.ts` builds it), `chapters` is owner-scoped, and a chapter IS an
-- album (0085). `owner = auth.uid()` stays as the fast path; the chapter lookup is the truth, and it
-- holds for every object ever uploaded regardless of what `owner` says.
--
-- The chapter id is cast TO text rather than casting the folder name to uuid — a stray non-uuid folder
-- must fail to match, not raise 22P02 and take the whole listing down with it.
--
-- ══ WHAT THIS DELIBERATELY DOES NOT TOUCH ══
--
-- `transformation-media` — the six poses, and the bucket a coach will eventually read (FC-D16). It
-- cannot be locked yet and the reason is a wiring fact, not a policy one: a progress post stores the
-- transformation object's URL **directly** (`progress-photo-post.tsx` hands `entry.photos[k]` to
-- `addSquadPost`), so squad-mates — who do not own that object and cannot sign it — read it straight
-- off the feed. Locking it today breaks every progress post already posted. The share path must copy
-- into `squad-media` first, the way every other post's media already does.
--
-- The four social buckets (`avatars`, `squad-photos`, `squad-media`, `media`) stay public by design:
-- they hold what an athlete chose to show people. `exercise-media` stays public because it is the
-- product's own 703 demo loops, keyed by exercise id, with no stored URL anywhere.
--
-- ══ WHAT ELSE MOVES, AND WHY IT BELONGS HERE ══
--
-- INSERT was `with check (bucket_id = 'chapter-photos')` — any authenticated user could write objects
-- into any chapter's folder. It is owner-scoped here, matching what 0146 did for `squad-photos`.
--
-- UPDATE and DELETE gain the same chapter clause as SELECT. Leaving them on a bare `owner` test would
-- mean a null-owner object an athlete can see and can never delete — and `delete_my_account()` walks
-- exactly these rows (`account-live.ts`), so an undeletable object is an orphan that outlives the
-- account that made it. 0142 built a ledger for that class; this stops adding to it.

-- ── The bucket ───────────────────────────────────────────────────────────────
update storage.buckets set public = false where id = 'chapter-photos';

-- ── The policies ─────────────────────────────────────────────────────────────
drop policy if exists chapter_photos_read on storage.objects;
create policy chapter_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'chapter-photos'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1] in (
        select c.id::text from public.chapters c where c.athlete_id = auth.uid()
      )
    )
  );

drop policy if exists chapter_photos_write on storage.objects;
create policy chapter_photos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chapter-photos'
    and owner = auth.uid()
    and (storage.foldername(name))[1] in (
      select c.id::text from public.chapters c where c.athlete_id = auth.uid()
    )
  );

drop policy if exists chapter_photos_update on storage.objects;
create policy chapter_photos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'chapter-photos'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1] in (
        select c.id::text from public.chapters c where c.athlete_id = auth.uid()
      )
    )
  );

drop policy if exists chapter_photos_delete on storage.objects;
create policy chapter_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'chapter-photos'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1] in (
        select c.id::text from public.chapters c where c.athlete_id = auth.uid()
      )
    )
  );
