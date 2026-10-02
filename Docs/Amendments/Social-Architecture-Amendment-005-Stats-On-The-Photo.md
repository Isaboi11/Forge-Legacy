# Social Architecture Amendment 005 — a workout post can carry its stats ON the photo

**Status:** BUILT 2026-10-02 on PO direction, branch `feat/photo-overlay-post`. Not published.
**Date:** 2026-10-02
**Owner:** Product
**Amends:** `WSR-001-Workout-Share-Result-Architecture.md` and `Share-Card-Renderer-Architecture.md`, which kept
app-drawn pictures to sharing OUTSIDE Forge. Clarifies `Social-System-Architecture-v1.0` SOC-D7 ("Photos and/or
videos"): the overlay picture is the athlete's own photo with their own numbers on it, posted only by their tap.
**Unchanged:** SOC-A2-D1/D2 (a recap is posted by the athlete's choice), D-RS-3 (the map only when ticked on this
post), and auto-post's rule that it never carries a photo.
**Governs:** `src/domain/share/story-card.ts` (`composePostPicture`, `POST_W`/`POST_H`),
`src/components/forge/PhotoLookChoice.tsx`, `src/app/workout-complete.tsx`, `ShareSessionSheet.tsx`
(`photoOverlay`), `LedgerPost.tsx` (`workoutStats`), `WorkoutSummary.photoLook`.

## Why

PO, 2026-10-02: *"when we go to share a workout with the squad do we have the same ability to do the summary
overlay on the picture there too?"* No: the 10-01 share pictures only left the app. Then: *"add it after the
workout and if they add a picture in that slot it gives them the option for the overlays or to have the strip
underneath."*

## Decisions

### SO-D1 — The choice appears on Workout Complete once a photo is added.

Two tiles, each drawn as the feed will show it: **Stats on the photo** and **Stats under the photo**. Under is the
default, so a post looks the way it always has until the athlete picks the other. The first photo (not a video)
gets the numbers; any others post beside it as before.

### SO-D2 — The feed picture is 4:5, not the story's 9:16.

The feed crops every post photo to 4:5, which would cut a story picture's badge and numbers. Photo Stats (lifting)
and Photo Route (runs) are laid out again at 1080×1350 from the same draw list as the story pictures.

### SO-D3 — Drawn at post time, uploaded once, posted in place of the photo.

The picture is drawn when the athlete taps Post, using that post's map tick (D-RS-3). It is uploaded once to the
`squad-media` bucket, and every squad and friends row it goes to references that one image. If it can't be built,
the post goes out the old way (photo plus strip) and the athlete is told. It is never posted without its photo.

### SO-D4 — The card shows no strip under an overlay.

`photoLook: 'overlay'` on the post's snapshot makes `workoutStats` return nothing, so the numbers don't show twice.
The post's own page still shows the full breakdown.
