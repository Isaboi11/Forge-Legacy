-- Forge Legacy — 0261: nobody can LIST another athlete's photo files (launch QA B10 / UX-007, 2026-11-09)
--
-- ══ THE DEFECT ══
--
-- Three public buckets hold athletes' own pictures and video, and each kept the SELECT policy its first
-- migration gave it — `for select using (bucket_id = …)`, no `to` clause, no owner check:
--
--   transformation-media  progress poses + posing video      0044_transformation.sql:38-39
--   chapter-photos        chapter album photos               0085_chapter_photos.sql:79-80
--   squad-media           squad / friends post photos, check-in video   0042_squad_post_media.sql:25-26
--
-- On `storage.objects` a SELECT policy is what the LIST endpoint obeys. So anyone holding the app's
-- public anon key — no account — could list every file in those buckets and then open each one by its
-- public URL. 0146 §"Still open" recorded the read as open but assumed the paths were unguessable; the
-- 11-09 UX sweep listed `transformation-media` with the anon key, which makes guessing unnecessary.
--
-- ══ THE FIX ══
--
-- Each SELECT policy becomes `to authenticated … and owner = auth.uid()`: an athlete can see (list,
-- upsert over, remove) their OWN objects and nobody else's. This is the same owner predicate 0075 and
-- 0146 already put on UPDATE and DELETE for these buckets.
--
-- ══ WHAT DOES NOT CHANGE ══
--
-- ⚠ THE BUCKETS STAY PUBLIC (PO decision 09-03; privatising them once took 21 photos off the live app).
--   A public bucket serves `/storage/v1/object/public/…` WITHOUT consulting RLS, and every screen in the
--   app shows these pictures by that public URL (`getPublicUrl`). So every photo keeps loading for
--   everyone allowed to see the post — only the LIST (and authenticated download) is closed.
--   The pending file asserts the three buckets are still public, because if one were private this
--   change WOULD hide other athletes' photos.
-- ⚠ Account deletion (`account-live.ts`) removes the athlete's OWN objects by path — still allowed.
-- ⚠ Uploads use fresh paths under the uploader; an upsert only ever meets the uploader's own object.
-- ⚠ Not touched: `squad-photos` (squad avatars, nothing private), `avatars` / `media` (keyed by athlete id),
--   `form-frames` (private since 0221). Deleted posts' files staying at their URL is B11 (UX-001), separate.
--
-- Idempotent: drop-if-exists + create.

drop policy if exists xform_media_read on storage.objects;
create policy xform_media_read on storage.objects for select to authenticated
  using (bucket_id = 'transformation-media' and owner = auth.uid());

drop policy if exists chapter_photos_read on storage.objects;
create policy chapter_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'chapter-photos' and owner = auth.uid());

drop policy if exists squad_media_read on storage.objects;
create policy squad_media_read on storage.objects for select to authenticated
  using (bucket_id = 'squad-media' and owner = auth.uid());
