# Photos Architecture — Amendment 001: Chapter Albums

## Status: LOCKED · v1.1 · 2026-07-30

**Amends:** `Docs/Photos-Wireframe-Spec-L15-L16.md` (LOCKED, June 2026) §3, §4, §5, §10
**Amends:** `Docs/L-15-Photos-Architecture.md` §6 (browse-only) — see §5 below. Every other decision in it survives intact.
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

- **No edit, delete, reassign or curate.** L-15 changes nothing that already exists. The mutability line
  is untouched: additions are permitted, the archive itself is not editable here.
- **Creation is still a chapter action.** Every path — Chapter Detail, Workout Complete's Reflect step,
  and now the album view — targets one chapter and routes to one shared screen. There is no
  chapter-less upload anywhere. *(Adding FROM an album is amended in §5.)*
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

## 5 · Adding from the gallery — §10 and §4's no-CTA rule are struck

**v1.1.** `L-15-Photos-Architecture` §6 and wireframe §10 ban an add control on L-15; §4 bans a CTA in
its empty state. Both rested on one premise, stated plainly in §4: *"the empty state cannot invite an
action this screen doesn't support."*

The premise was true of the screen those documents describe. A flat, account-wide, reverse-chronological
grid has **no target** — a photo must belong to a chapter, and the grid does not know which. Banning the
control was the right call for that screen.

It is not that screen any more. §1 of this amendment replaced the grid with chapter albums, and **an
album IS a chapter**. Adding from inside one has exactly one unambiguous destination — the same
destination the chapter screen offers, reached through a different door. The reason for the ban did not
survive the change of shape, and a rule that outlives its reason is just an obstacle: without it, an
athlete standing on the screen named Photos, inside the album they want to add to, has to leave, find the
chapter, and come back.

Amended:

- **Album view gains an add control** in the app bar, targeting that album's chapter.
- **Albums root does not.** There the original objection still holds — you may be browsing a chapter
  sealed three years ago, and "add" would have to guess.
- **The empty state gains one CTA.** There is always exactly one active chapter (`chapters` carries a
  unique index enforcing it), so "your first photo" has a single unambiguous home. *"Your photos will
  appear here as you add them to your chapters"* pointed the athlete away from the screen they were
  standing on, which is the worse answer, not the humbler one.

Unchanged: no edit, no delete, no reassignment, no curation control anywhere on L-15. The ban that
mattered was never on *adding* — `Chapter-Detail-Wireframe-Spec-L3-L4` §17.3 permits additions and
forbids edits, and that line is exactly where it was.

**Owed on M-7:** the upsell spec names "any photo upload surface" as a trigger. The album view is now
one. M-7 is unbuilt, and this joins the counter in §2 as owed on P-8.

## Change Log

- v1.1 — 2026-07-30 — §5 added: the album view and the empty state may add. Wireframe §10 and §4's
  no-CTA rule struck; `L-15-Photos-Architecture` §6 narrowed from "browse-only" to "no edit, delete or
  reassign". LOCKED.
- v1.0 — 2026-07-30 — Initial. LOCKED.
