# Photos Architecture — Amendment 002: Progress Photos In The Album

## Status: LOCKED · v1.0 · 2026-09-30

**Authority:** PO decision, 2026-09-30 — asked "should a chapter's album also show its progress photos?", answered *"Yes. it should."*
**Amends:** `Docs/Transformation-Gallery-Architecture-v1.0.md` §2 (the two archives never show each other's photos) and its §7 line *"No change to Photos (L-15/L-16)"*.
**Amends:** `Docs/Amendments/Photos-Architecture-Amendment-001-Chapter-Albums.md` §1 (an album is a chapter's `chapter_photos`).
**Built as:** `src/domain/legacy/album-progress.ts`, `src/data/photos-live.ts`, `src/data/legacy-archive-live.ts`, `src/app/photos.tsx`, `src/app/chapter/[id].tsx`. No migration.

---

## 1 · Why

The PO reported that the photos from Chapter I "didn't save". They had saved. The diagnostic
(`supabase/apply/diagnose-po-chapter-photos.sql`, run 09-30) showed:

| Chapter | Album photos | Progress photos |
|---|---|---|
| Chapter I (Aug 3 – Aug 14, sealed) | 0 | 5, taken Aug 10 |
| Chapter II (Aug 14 – now) | 10 | 15 |

Storage held exactly 10 album files and 20 progress files. Nothing was missing.

The album read `chapter_photos` only. A chapter with progress photos and no album photos therefore had
no album at all, and the athlete's first chapter looked empty. The Transformation Gallery architecture
drew the two archives as siblings that never show each other's photos. That line is correct about
storage and wrong about what the athlete expects to see: photos taken during a chapter belong in that
chapter's album.

## 2 · Decisions

**PA2-D1 — An album shows its chapter's progress photos.** Every pose photo and posing clip of every
progress set tied to a chapter appears in that chapter's album, on the day the set was captured.

**PA2-D2 — Nothing is copied.** A progress photo is stored once, on its progress set. The album is a
second view of it. One photograph never exists in two places, and it counts once against the photo
allowance (which already counted both kinds — Monetization Amendment 003, MA3-D8).

**PA2-D3 — Read-only in the album.** Editing and deleting a progress set stay in the Transformation
gallery. The album's rule is unchanged: it changes nothing that already exists.

**PA2-D4 — A chapter with only progress photos is an album.** It is listed with the newest progress
photo as its cover. When a chapter also has album photos, the cover rule of Amendment 001 is unchanged.

**PA2-D5 — Counts include them.** The album card, the album's Photos and Videos numbers, the Photos
screen's headline count and the Legacy tab's Photos tile all count progress photos, so the numbers agree
with each other and with what the album shows.

**PA2-D6 — A progress set tied to no chapter appears in no album.** An album is a chapter. Such a set is
still in the Transformation gallery.

**PA2-D7 — The label is the pose.** A progress photo shows its pose ("Front Relaxed") where an album
photo shows its label, and its set's reflection where an album photo shows its caption.

**PA2-D8 — Milestone days are worked out the same way.** A day that already has an album photo keeps
what the album says about it. A day with only progress photos is marked by the same rule: chapter
opened, chapter sealed, or that day's heaviest PR.

**PA2-D9 — A chapter's "View album" opens that chapter's album.** It used to open the list of all
albums, which does not list a chapter with no photos. An empty album says so and offers Add.

## 3 · Unchanged

- Owner-only. No squad or friend can read either kind of photo through the album.
- The Transformation gallery itself: its order, its comparison tools, its share formats.
- The five-tier cover rule for a chapter that has album photos.
- No filter or sort control in the album.

## 4 · Not built

- The album does not mark a progress photo as different from an album photo beyond its pose label.
- A progress photo tapped in the album opens the album's viewer, not the progress set's own screen.
- The "Chapter sealed" mark on a day with only progress photos uses the chapter's end date. If a chapter's
  end date and its seal date ever differ, the album photos' rule (the seal date) and this one could mark
  different days.

## Change Log

- v1.0 — 2026-09-30 — Initial. LOCKED.
