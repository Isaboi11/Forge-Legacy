# Photos Architecture — Amendment 001: Chapter Albums

## Status: LOCKED · 2026-07-30

**Amends:** `Docs/Photos-Wireframe-Spec-L15-L16.md` (LOCKED, June 2026) §3, §4, §5
**Does not amend:** `Docs/L-15-Photos-Architecture.md` — every decision in it survives intact.
**Authority:** PD-7 (the design is the north star; where a locked doc and the design disagree on
presentation, the design governs and the doc is corrected).
**Design source:** `Forge Photos Gallery.dc.html`
**Built as:** `src/app/photos.tsx`, `src/data/photos-live.ts`, migration `0085_chapter_photos.sql`

---

## 1 · What changed

The wireframe spec describes a **flat 3-column square grid**: reverse-chronological, account-wide, no
grouping, no chapter labels on thumbnails, no filter or sort, with L-16 as a separate photo-detail
screen.

The design is a **chapter-albums browser**: a list of album cards (chapter cover, status chip, chapter
name, its reflection line, date range, photo and week counts, headline PR), opening into a
**month-grouped timeline** where milestone days are physically larger and bronze-edged, journal text
appears as a bronze-ruled pull-quote, and a full-screen viewer pages through the album.

These are not two renderings of one screen. They are different screens, and the design's is better for
the reason the archive exists: a photo archive organised by *chapter* tells the story of a period of
training, while a reverse-chronological grid is a camera roll. Under PD-7 the design governs.

### Amended

| § | Was | Now |
|---|---|---|
| §3 Grid | 3-column square thumbnails, account-wide, reverse-chronological | Album cards per chapter → month-grouped day timeline inside an album |
| §3 Order | Flat reverse-chronological by `dateAdded` | Albums: active chapter first, then by start date descending. Inside an album: newest first |
| §3 Labels | "No chapter labels on thumbnails" | The chapter IS the grouping; its name, status and reflection head the album |
| §3 Controls | "No grouping, filtering, or sort control" | No filter or sort control (**kept**). Grouping is now the structure of the screen |
| §4 Loading more | Infinite scroll with a "loading more…" footer | Not built — an album is one chapter's photos, which is a bounded set. Revisit if any album passes a few hundred |
| §5 / §6 L-16 | A separate photo-detail screen | A full-screen viewer inside L-15, as the design composes it. Same content, no route change |

### Kept — these were never layout

- **Browse-only.** `L-15-Photos-Architecture` §6 and wireframe §10 stand: L-15 creates, edits, deletes and
  reassigns nothing. Creation remains exclusively L-3/L-4, and is now actually built there — an **Add a
  Photo** control on Chapter Detail, which before this work did not exist anywhere in the app. The
  gallery has no add control of any kind.
- **No CTA in the empty state.** Wireframe §4's reasoning holds and gets stronger: this screen cannot
  act, so an invitation would be a button that lies. Copy retained nearly verbatim — *"Your photos will
  appear here as you add them to your chapters."*
- **Owner-only.** No squad or friend read path exists for Legacy photos in any locked document, and
  `chapter_photos` RLS is owner-only for every verb.
- **Additions vs. edits.** `Chapter-Detail-Wireframe-Spec-L3-L4` §17.3 draws the line at adding to the
  archive versus editing it. A sealed chapter still accepts photos; nothing already in it can be changed.

---

## 2 · The 50-photo counter is OWED, not dropped

`Monetization-Architecture-Amendment-001` §3/§5 sets a 50-photo free ceiling, account-wide, and requires
the counter *"X of 50 photos"* on L-15. `Critical-Decisions-Amendment-001` Decision 3 makes the limit
account-wide rather than per-chapter. `M-7` triggers an upsell on the 51st photo.

**None of that is built, and the missing piece is the paid tier itself.** P-8 Subscription is unbuilt,
M-7 is unbuilt, and there is no premium flag on a profile. Shipping "23 of 50 photos" today would show
every athlete a ceiling with no way to raise it — a threat rather than a counter, and one that would
land hardest on the athlete with the longest record, which is precisely backwards for a product whose
monetization amendment is titled *Never Charge For History*.

So the screen shows the true count and no ceiling.

**This amendment does not repeal the limit.** It records it as owed:

> When P-8 Subscription ships, the count header takes its ceiling and the M-7 upsell trigger, in the same
> release. Neither the cap nor the counter may ship before the tier that lifts them.

---

## 3 · Two things the design got wrong, corrected in the build

**Weeks were a literal.** The design's album card carries `weeksNum: 8` over a range spanning nine and a
half, with a caption inside the same album reading "Twelve weeks in" — three durations for one chapter on
one screen. Weeks are derived from the chapter's own dates.

**Events were authored strings.** The design types `event: 'PR · Squat 405'` per day as fixture text.
Stored as free text, the timeline could claim a PR that never happened. Every event is now derived in
`chapter_album()` from records the app already keeps — a photo on the chapter's start date reads *Chapter
opened*, one on its seal date reads *Chapter sealed*, one sharing a date with a `personal_records` row
reads that PR — and a day carrying an event is what makes it a milestone. The emphasis is earned by the
record instead of assigned by hand.

The remaining build deltas (the app bar reading a literal "ALBUM", ranges stripping the year, the
connector line off-centre behind milestone rows, 40px viewer arrows, captions rendering only in the
viewer) are documented in the screen's own header.

---

## 4 · What this closes

`Legacy-Hub-Wireframe-Spec-L1` §4's *"View All [N] Photos ›"* destination and its Risk 5 are closed: the
count is real, the destination exists, and photo taps land on the photo rather than falling back to the
chapter.

## Change Log

- v1.0 — 2026-07-30 — Initial. LOCKED.
