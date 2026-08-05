-- Forge Legacy — 0116: the exercise demonstration bucket
--
-- W-22's FIRST section in `Forge Exercise Detail.dc.html` is the demonstration loop, and it has been
-- the one deferred block on that screen since it was built ("no media exists for any of the 794
-- exercises"). `scripts/animation-processing` now produces them: transparent looping WebP, the target
-- muscle recoloured to app bronze, warm-graded for the dark UI.
--
-- READ-ONLY TO EVERY CLIENT. This is app content, not athlete content — the difference from `avatars`,
-- `squad-media` and `transformation-media`, which all carry owner-write policies because an athlete
-- puts things in them. Nothing in the app uploads here; the library is processed on a workstation and
-- pushed from the dashboard or a service key. So there is a public read policy and NO insert, update or
-- delete policy at all, which is the narrowest grant that serves the screen.
--
-- ── THE PATH CONVENTION IS THE CONTRACT ──────────────────────────────────────────────────────────
--
--     exercise-media/male/<exerciseId>.webp
--     exercise-media/female/<exerciseId>.webp
--
-- `<exerciseId>` is the catalog id from `exercises.json` — `barbell-bench-press`, `pull-up`. NOT the
-- library's source filename (`Barbell-Bench-Press_Chest_.webp`).
--
-- WHY THE RENAME, since the pipeline currently writes source-named files: keying on the catalog id
-- means the app DERIVES the URL from the id it already has, so there is no manifest to ship, nothing
-- to keep in step, and no 800-row lookup table in the bundle. `catalog_match_review.csv` already holds
-- both columns (`exercise_id`, `male_file`, `female_file`), so the rename is a read of the sheet that
-- is being reviewed by hand anyway — and reviewing it is the step that has to happen regardless.
--
-- A missing file is an ORDINARY STATE, not an error: the app renders the design's empty demo frame and
-- says nothing. Exercises can be added to the catalog before the library has a clip for them, and some
-- (strongman, mobility) are not in this library at all.

insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "exercise_media_public_read" on storage.objects;

create policy "exercise_media_public_read" on storage.objects
  for select using ( bucket_id = 'exercise-media' );
