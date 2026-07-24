# L-15 / L-16 Photos — Wireframe Specification
## Screen Specifications: Photos Gallery, Photo Detail
### June 2026

**Status:** LOCKED

**Type:** Screen Wireframe Specification (two screen codes, one document — same pairing convention as Chapter-Detail-Wireframe-Spec-L3-L4.md and Accomplishments-Wireframe-Spec-L12-L14.md)

**Date:** June 2026

**Implements:** L-15-Photos-Architecture.md (LOCKED) — closes Legacy-Hub-Wireframe-Spec-L1.md's Risk 5 ("L-15 Photos Unspecced; Photo Tap Uses L-4 Fallback"), the final Priority 1 MVP gap identified by the Global Architecture Status Audit.

**Authority Chain:**
- L-15-Photos-Architecture.md (LOCKED) — ownership, data model, chapter-scoping, the corrected mutability table (original photos non-deletable; memory photos removable only via Chapter Architecture), navigation model
- Legacy-Hub-Wireframe-Spec-L1.md (LOCKED) §4 — preview strip format, ordering rule, Risk 5
- Legacy-Timeline-Wireframe-Spec-L2.md (LOCKED) §4, §8 — empty-state convention, infinite-scroll convention reused here
- Chapter-Detail-Wireframe-Spec-L3-L4.md (LOCKED) §11.2, §17.3, §19.4 — memory-card layout and removal mechanism, reused (not duplicated) by L-16
- Featured-Legacy-Moment-Standards.md (LOCKED) — confirms no manual "feature this" mechanism is needed on L-16
- Monetization-Architecture-Amendment-001.md (LOCKED) §3, §5 — exact counter text
- Critical-Decisions-Amendment-001.md (LOCKED) Decision 3 — account-wide limit enforcement
- M-7-Premium-Upsell-Spec.md (LOCKED) — confirms L-15 has no upsell-triggering action of its own

**Downstream Dependents:** None. No screen is unspecced because of this document.

**Amendment Log:** Initial. v1.0 LOCKED.

> **Cross-reference note (2026-07-02) — differentiation from Transformation Gallery (L-17/L-18).** A second, sibling Legacy feature, `Transformation-Gallery-Architecture-v1.0.md` / `Transformation-Gallery-Wireframe-Spec-L17-L18.md`, was added per direct stakeholder direction. It is **not** a replacement for or extension of L-15/L-16 — it is a distinct feature specifically for documenting physical transformation (before/progress/after, physique check-ins, posing/competition/milestone videos), supports video in addition to photos, and — unlike L-15/L-16 — supports optional captions/reflections and tags. L-15/L-16 remain unchanged: a general, untyped, caption-less photo archive with no video support. An athlete may use either feature independently; nothing here requires migrating existing Photos content into the Transformation Gallery, and nothing in the Transformation Gallery architecture alters any rule in this document.

---

## Section 1 — Screen Purpose

L-15 is the athlete's complete photo gallery — every photo across every chapter, account-wide, browse-only. It closes L-1's "View All [N] Photos ›" destination and is the canonical home for the account-wide photo counter (already assumed by P-8, M-7, and the Monetization Amendment before this document existed).

L-16 is a single photo's detail view. It replaces L-1's documented Risk-5 fallback — previously, tapping a thumbnail on L-1 landed the athlete on L-4 (the photo's chapter), *"not on the photo itself."* L-16 is that missing destination.

**Required audit, resolved directly against locked text rather than assumed:**
- **Which photo classes can be removed, which cannot:** L-15-Photos-Architecture.md's Section 13 table is reused verbatim — only memory photos (added post-sealing, via L-4's "Add a Memory" flow) are removable; original photos (added pre-sealing, active or now-archived) have no delete action anywhere in this architecture.
- **Whether any existing screen already defines photo-detail behavior:** No. L-1's Risk 5 explicitly names the L-4 landing as an *"MVP fallback"* — a chapter screen, not a photo screen. Chapter-Detail-Wireframe-Spec-L3-L4.md's own in-chapter photo strip (§19.4, *"Chapter photos strip + 'Add Photo' secondary"*) never defines a tap behavior for its own thumbnails either — confirmed by direct search. L-16 is genuinely new ground, not a duplicate of something already specified.
- **Whether chapter photos and memory photos require different UI treatment:** Yes, confirmed directly. The memory card format in L-3/L-4 (§17.1) bundles a photo with a note and a mandatory, always-visible timestamp: *"Added [Date] · [X time] after sealing."* This document extends that same distinguishing treatment to L-16 (Section 6) rather than treating every photo identically — not assumed by symmetry with original photos, but read directly from the locked memory-card pattern.

---

## Section 2 — Navigation Entry Points

| From | Action | To |
|---|---|---|
| L-1 | "View All [N] Photos ›" | L-15 |
| L-1 | Tap a strip thumbnail | **L-16** (replaces the documented L-4 fallback, per L-15-Photos-Architecture.md §15 — this is the one navigation edge this document changes from L-1's currently-written behavior; L-1's own body text is not edited here, flagged again in Section 12) |
| L-15 | Tap a grid thumbnail | L-16 |
| L-16 | "View Chapter ›" | L-3 (active) or L-4 (archived), evaluated at tap time |

No other screen links directly to L-15 or L-16 — single-entry-point shape, consistent with this project's established navigation convention (L-2, L-12, W-21).

---

## Section 3 — L-15 Layout

```
┌─────────────────────────────────────────┐
│  ‹ Photos                                │
│                                           │
│  38 of 50 photos                         │  ← counter, always shown
│                                           │
│  ┌────┐ ┌────┐ ┌────┐                   │
│  │    │ │    │ │    │                   │  ← 3-column grid, square thumbnails
│  └────┘ └────┘ └────┘                   │
│  ┌────┐ ┌────┐ ┌────┐                   │
│  │    │ │    │ │    │                   │
│  └────┘ └────┘ └────┘                   │
│  ┌────┐ ┌────┐ ┌────┐                   │
│  │    │ │    │ │    │                   │
│  └────┘ └────┘ └────┘                   │
│                                           │
│  [ loading more… ]                       │
└─────────────────────────────────────────┘
```

- **App bar:** back chevron (left) → L-1. Title: "Photos." No other app-bar controls — no Add Photo button (L-15-Photos-Architecture.md §6: *"L-15 is browse-only"*).
- **Counter:** *"X of 50 photos"* (free) or *"X photos"* (premium) — exact text per Monetization-Architecture-Amendment-001.md §5. Always visible, directly below the app bar, regardless of grid state (loaded, loading, or empty).
- **Grid:** 3-column, equal-size square thumbnails, clipped square from the full image — same clipping convention L-1's strip already uses.
- **Order:** reverse-chronological by `dateAdded`, account-wide — reusing L-1's exact ordering rule (*"most recently added photo first, regardless of which chapter it belongs to"*), not re-derived.
- **No chapter labels on thumbnails** — same rule as L-1's strip, extended consistently (accessibility labels still carry chapter context — Section 9).
- **No grouping, filtering, or sort control** — none evidenced anywhere; not introduced.

---

## Section 4 — L-15 States

**Loading (initial):** a skeleton grid — gray placeholder squares in the same 3-column layout — shown briefly while the first page of photos loads. The counter loads independently and may appear before the grid resolves (it is a lightweight count, not an image fetch).

**Loaded (default):** grid + counter, as in Section 3.

**Loading more (infinite scroll):** scrolling to the bottom triggers the next page; a *"loading more…"* footer indicator appears — same convention and copy as Legacy-Timeline-Wireframe-Spec-L2.md §8's infinite scroll, reused rather than inventing a new pattern.

**Empty (zero photos):**

```
┌─────────────────────────────────────────┐
│  ‹ Photos                                │
│                                           │
│  0 of 50 photos                          │
│                                           │
│                                           │
│   Your photos will appear here as        │
│   you add them to your chapters.         │
│                                           │
└─────────────────────────────────────────┘
```

Single centered line, no illustration, **no CTA** — consistent with this project's "silence is the correct empty state" convention (L-2 §8) and directly required by the architecture's "no Add Photo CTA on L-15" rule: the empty state cannot invite an action this screen doesn't support. The copy points to where photos *are* added (chapters) without a button, the same resolution L-2 used for chapter/goal creation. The counter remains visible even when empty — it is a persistent header element, not grid content.

This state is reachable even though L-1 omits its own Photos section at zero photos (and thus offers no entry point at that moment) — an athlete can reach zero photos *while already on L-15*, by having only memory photos and removing all of them via L-3/L-4 in the same session, then returning to a previously-loaded L-15.

---

## Section 5 — L-15 Navigation

(Consolidated with Section 2 — no destinations beyond what's listed there. Back chevron always returns to L-1.)

---

## Section 6 — L-16 Layout

```
┌─────────────────────────────────────────┐
│  ‹                                       │
│                                           │
│         [ Full-size photo ]              │
│                                           │
│  Jun 11, 2026                            │
│  Road to 405 ›                           │  ← chapter context, omitted on L-15
│                                           │
└─────────────────────────────────────────┘
```

**Memory photo variant** (per Section 1's audit finding — distinct treatment, reusing L-3/L-4's exact memory-card pattern):

```
┌─────────────────────────────────────────┐
│  ‹                                       │
│                                           │
│         [ Full-size photo ]              │
│                                           │
│  Jun 11, 2026                            │
│  Added 3 days after sealing              │  ← memory-photo subtitle, always shown
│  Road to 405 ›                           │
│                                           │
└─────────────────────────────────────────┘
```

- **App bar:** back chevron only. Returns to whichever screen launched L-16 — L-15 (gallery tap) or L-1 (retargeted strip tap, Section 2) — same "return to caller" convention already used elsewhere in this project (P-8's two-entry-context dismiss).
- **Image:** full-size, centered.
- **Date:** `dateAdded`, always shown.
- **Memory subtitle:** shown only when the photo is a memory photo (derived from `dateAdded` vs. its chapter's `sealedAt`, per L-15-Photos-Architecture.md §4 — no separate flag). Copy reuses the exact phrasing pattern from the L-3/L-4 memory card (*"Added [Date] · [X time] after sealing"*), adapted to L-16's layout. **No memory note/caption text is shown** — that belongs to the separate Memory entity, owned by Chapter Architecture, explicitly out of this document's scope (L-15-Photos-Architecture.md §4's stated boundary).
- **Chapter name + "View Chapter ›":** the context L-15 deliberately omits. Always present, for every photo.
- **No Delete button on this screen, for any photo — resolved explicitly, not assumed:** the locked direction states memory photos *"remain governed by Chapter Architecture and retain their existing removability rules"* — i.e., the removal mechanism stays where it already lives: L-3/L-4's Memory card (*"Entire memory: can be deleted with M-6 Confirmation"* / *"Memory photos: can be removed"*). Duplicating that action onto L-16 would create two places governing the same removal, with two different confirmation flows. **L-16 is read-only display plus a single navigation action.** An athlete who wants to remove a memory photo taps "View Chapter ›" and uses the existing flow there.
- **No edit, no Featured toggle, no chapter reassignment** — all per L-15-Photos-Architecture.md, not revisited.

---

## Section 7 — L-16 States

**Loading:** the image area shows a placeholder/spinner while the full-size image fetches. Date and chapter name appear as soon as the underlying record resolves — typically immediate, since that data is lightweight text already available from the L-15/L-1 row the athlete tapped.

**Loaded (default):** as in Section 6, original or memory variant.

**Image-unavailable (record exists, image fails to load):** a broken-image placeholder icon in place of the photo, with a small caption *"Photo unavailable."* Date and chapter metadata still display normally — this is an image-fetch failure, not a record failure, and the two are independent.

**Record-load failure (photo cannot be resolved at all — e.g., a stale reference):** a centered message, *"This photo couldn't be loaded."*, with the back chevron as the only available action. No retry control — smallest-MVP, consistent with this screen's otherwise minimal action set.

**Chapter-state changes (Question 5, resolved as routing, not a visual state):** if the photo's chapter has since been archived, this has no effect on L-16's appearance — "View Chapter ›" simply routes to L-4 instead of L-3, evaluated at tap time against the chapter's current state. No special "chapter archived" notice is shown; this is ordinary, expected behavior for any photo old enough to have outlived its chapter's active period.

---

## Section 8 — L-16 Navigation

| From | Action | To |
|---|---|---|
| L-16 | Back chevron | Caller (L-15 or L-1) |
| L-16 | "View Chapter ›" | L-3 if the chapter is currently active; L-4 if archived |

No delete, edit, or share action exists on this screen (Section 6).

---

## Section 9 — Accessibility

| Element | accessibilityLabel | Notes |
|---|---|---|
| L-15 back chevron | "Back" | Returns to L-1 |
| L-15 thumbnail | "Photo from [Chapter Name], added [date]" | Chapter name included in the label even though not shown visually — same pattern L-1 already uses for its own strip (§accessibility) |
| L-15 loading-more indicator | "Loading more photos" | Announced when infinite scroll fetch begins |
| L-16 back chevron | "Back" | Returns to caller |
| L-16 image | "Photo from [Chapter Name], added [date]" | `accessibilityRole`: "image" |
| L-16 "View Chapter ›" | "View [Chapter Name]" | `accessibilityHint`: "Opens chapter detail" |
| L-16 memory subtitle (if present) | "Added [X time] after this chapter was sealed" | Read as static text |

**Focus order:** top to bottom, matching visual order, on both screens.

---

## Section 10 — Non-Behaviors

- **No Add Photo CTA on L-15** — creation remains exclusively at L-3/L-4.
- **No filtering, grouping, or sort control on L-15.**
- **No edit of any photo, on either screen.**
- **No Delete button on L-16, for any photo type** — memory-photo removal remains a Chapter Architecture action (L-3/L-4), not duplicated here.
- **No "Featured" or curation control on L-16.**
- **No chapter reassignment, on either screen.**
- **No memory note/caption text shown on L-16** — that belongs to the separate Memory entity.
- **No retry control on a hard record-load failure.**
- **No change to L-1, L-2, L-3/L-4, FLM Standards, Monetization Amendment, Critical Decisions Amendment 001, or M-7** — all cited as authority, never redesigned.

---

## Section 11 — Validation Checklist

### Navigation
- [ ] L-15 reachable only from L-1's "View All [N] Photos ›"
- [ ] L-1's strip-thumbnail tap routes to L-16, not L-4
- [ ] L-15 thumbnail tap routes to L-16
- [ ] L-16 back chevron returns to whichever screen launched it (L-15 or L-1)
- [ ] L-16 "View Chapter ›" routes to L-3 (active) or L-4 (archived), evaluated at tap time

### L-15
- [ ] Counter text matches "X of 50 photos" (free) / "X photos" (premium) exactly
- [ ] No Add Photo CTA present anywhere on this screen
- [ ] Grid is 3-column, reverse-chronological, account-wide, no chapter labels
- [ ] Empty state: counter still shown; single centered line; no CTA
- [ ] Infinite scroll matches L-2's "loading more…" convention

### L-16
- [ ] Date and chapter name always shown
- [ ] Memory-photo subtitle shown only for memory photos, using the L-3/L-4 timestamp phrasing
- [ ] No memory note/caption text shown
- [ ] No Delete button present for any photo
- [ ] No Edit, Featured, or chapter-reassignment control present
- [ ] Image-unavailable and record-load-failure states are visually distinct from each other

### Accessibility
- [ ] L-15 thumbnails carry chapter name in accessibilityLabel despite no visible label
- [ ] All interactive elements have accessibilityLabel/Hint per Section 9
- [ ] Focus order matches visual top-to-bottom order on both screens

---

## Section 12 — Open Issues

**None blocking.** L-15-Photos-Architecture.md resolved every structural question before this spec was written; this document is layout work against a fixed contract.

Carried forward, not blocking:
- **L-1's Risk 5 text is now stale** — it documents the L-4 fallback as the current behavior; this spec changes that to L-16. L-1's own body is not edited by this document (citation-only, same discipline used throughout this project's documentation-lag findings) — recommended for the existing consolidated cleanup backlog (Global-Architecture-Status-Audit.md §7).
- **Chapter-Detail-Wireframe-Spec-L3-L4.md's own in-chapter photo strip never defines a tap behavior for its thumbnails.** This document does not assert one (modifying L-3/L-4 is outside this task's scope), but for consistency, a future amendment could reasonably route those taps to L-16 as well, now that it exists. Recommended, not performed.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. |

---

*L-15 / L-16 Photos — Wireframe Specification*
*Screen Specifications: Photos Gallery, Photo Detail*
*June 2026*
*Authority: L-15-Photos-Architecture.md (LOCKED), Legacy-Hub-Wireframe-Spec-L1.md (LOCKED), Legacy-Timeline-Wireframe-Spec-L2.md (LOCKED), Chapter-Detail-Wireframe-Spec-L3-L4.md (LOCKED), Featured-Legacy-Moment-Standards.md (LOCKED), Monetization-Architecture-Amendment-001.md (LOCKED), Critical-Decisions-Amendment-001.md (LOCKED), M-7-Premium-Upsell-Spec.md (LOCKED)*
*Status: LOCKED*
