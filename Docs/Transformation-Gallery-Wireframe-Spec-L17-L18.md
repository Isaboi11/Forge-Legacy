# Forge Legacy — Transformation Gallery Wireframe Specification
## L-17 (Gallery) / L-18 (Entry Detail) | Version 1.0 — 2026-07-02

**Status:** Lock-Ready
**Tab:** Not a tab — reached from the Legacy tab (L-1 §8a "View All [N] Entries ›" and thumbnail taps)
**Authority:** `Transformation-Gallery-Architecture-v1.0.md` (governs all data/mutability decisions below — this document is layout only), `Legacy-Hub-Wireframe-Spec-L1.md` v1.1 §8a, `Photos-Wireframe-Spec-L15-L16.md` (structural precedent for the paired-screen convention), `Component-Library-Architecture-v1.0.md`
**Depends on:** L-1, L-3/L-4 (chapter context), M-6 (delete confirmation)

---

## Preamble: What L-17/L-18 Are For

L-17 answers: **"What has my body's story looked like, chapter by chapter?"**
L-18 answers: **"What was this moment?"**

Neither screen is a social feed, a before/after comparison tool against other athletes, or a fitness-influencer content gallery. Both are quiet, documentary, chapter-anchored records — closer in tone to a photo album kept in a drawer than to a public gallery. Per `Transformation-Gallery-Architecture-v1.0.md` TG-D7, there is no like, comment, feed, view count, or comparison mechanic anywhere in either screen.

---

## Architecture Decisions

### Decision 1 — L-17 Groups by Chapter, Chronological Within Each Group

**Locked.** Realizes `Transformation-Gallery-Architecture-v1.0.md` TG-D5 at the screen level: L-17 is organized into chapter-headed sections (active chapter's section first, then sealed chapters newest-sealed-first — the same convention as L-1's Chapter History and L-2's Legacy Timeline). Within each chapter section, entries run **oldest → newest**, so scrolling a chapter's section reads as a before→after story.

### Decision 2 — Add Entry via Lightweight Capture Sheet, Not a Third Screen

**Locked.** Creating an entry does not require a dedicated third screen. From L-17, "+ Add Entry" opens a bottom sheet: pick media (camera or library, photo or video) → confirm chapter (defaults to the Active chapter; a picker appears only if there is no Active chapter and the athlete must choose a sealed one, i.e. a Memory-style addition) → optional title/caption/tags → Save. This mirrors the lightweight-sheet pattern already used elsewhere in the product for low-frequency creation actions (e.g., W-23's inline custom-exercise-creation sheet) rather than inventing a new full-screen creation flow for what is fundamentally a short form.

### Decision 3 — L-18 Is a Documentary Detail View, Not a Comparison Tool

**Locked.** L-18 shows exactly one entry at a time — full media, chapter/date context, tags, caption. It does **not** offer a side-by-side or slider before/after comparison view against other entries. A slider/comparison UI, even shown privately to the athlete alone, was considered and rejected: it borrows a visual language from public fitness-transformation content elsewhere in the industry that this product deliberately avoids per its "documentary, not comparison" design intent. An athlete who wants to compare two entries does so the way they compare any two Legacy artifacts today — by scrolling between them.

### Decision 4 — Mutability Follows the Architecture Exactly

**Locked.** L-18's Edit/Delete affordances are gated exactly per `Transformation-Gallery-Architecture-v1.0.md` TG-D9/TG-D10 — no new mutability rule is introduced at the wireframe level. See Section 6.3.

---

## Section 1 — Purpose

L-17 is the browse/discovery surface: every Transformation Gallery entry the athlete owns, organized by chapter, told chronologically. L-18 is the single-entry documentary record, reached by tapping any entry from L-17 or from L-1's preview strip.

---

## Section 2 — Screen Goals

**L-17 succeeds when:**
1. The athlete can see their physical transformation unfold chapter by chapter, in order
2. Adding a new entry takes one tap to start and requires nothing but a media selection to finish
3. A chapter with no entries yet is simply absent from the gallery — never a placeholder

**L-18 succeeds when:**
1. The single entry is the obvious visual focus — media is the largest element on the screen
2. Chapter and date context is available at a glance without leaving the screen
3. Edit/delete affordances are present only when the architecture actually permits them — never shown as disabled/greyed-out buttons that invite confusion

**Both screens fail when:**
- Any comparison, ranking, like, comment, or view-count element appears
- The tone reads as "share this" rather than "remember this"

---

## Section 3 — L-17 Information Hierarchy / Full Scroll

```
┌─────────────────────────────────────────────────────────┐
│  ‹ Transformation Gallery                     [+]        │  ← App Bar (pushed from L-1)
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ROAD TO 405 · Active                                   │  ← Chapter section header
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                        │
│  │ ▓▓▓ │ │ ▓▓▓ │ │ ▶▓▓ │ │ ▓▓▓ │   ← oldest → newest      │
│  └─────┘ └─────┘ └─────┘ └─────┘                        │
│                                                         │
│  FOUNDATIONS · Sealed, Apr–Jun 2026                     │  ← Chapter section header
│  ┌─────┐ ┌─────┐                                        │
│  │ ▓▓▓ │ │ ▓▓▓ │                                        │
│  └─────┘ └─────┘                                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR (Legacy selected)                       │
└─────────────────────────────────────────────────────────┘
```

**App Bar:** "‹ Transformation Gallery" (pushed from L-1, back chevron returns to L-1) with a compact "[+]" action (44×44dp) that opens the Add Entry sheet (Section 5).

**Chapter section header:** Chapter name + status — "Active" or "Sealed, [date range]" — 13sp, muted, matching L-1's Chapter History date-range formatting convention. Active chapter's section always first; sealed chapters follow, newest-sealed-first.

**Grid within a section:** 3-column square thumbnails (`PhotoThumbnail`, CLA-C36 — same component as Photos, L-15/16), oldest-to-newest reading order (left-to-right, top-to-bottom). Video entries show a small play-glyph overlay; photo entries do not. Tagged entries show no visible tag chip on the thumbnail itself (kept clean — tags are visible on L-18 only), consistent with the product's general "detail lives one tap deeper" convention.

**Chapters with zero entries do not appear as sections at all** — consistent with Transformation-Gallery-Architecture-v1.0.md's chapter-scoping and the product-wide "Smart Omission" empty-state convention (CLA-C24).

---

## Section 4 — Add Entry Flow (Bottom Sheet)

Triggered by the "[+]" App Bar action on L-17.

```
┌─────────────────────────────────────────────────────────┐
│  ▬▬▬  (drag handle)                                     │
│                                                         │
│  Add Transformation Entry                                │
│                                                         │
│  [ Take Photo ]  [ Take Video ]  [ Choose from Library ] │
│                                                         │
│  Chapter: Road to 405 (Active)          [change ›]      │  ← only shown/editable if no Active chapter
│                                                         │
│  Title (optional)                                        │
│  [___________________________________]                   │
│                                                         │
│  Caption / Reflection (optional)                          │
│  [___________________________________]                   │
│                                                         │
│  Tags (optional): [Front] [Side] [Back] [Posing]          │
│                   [Competition] [Milestone]               │
│                                                         │
│  [           Save Entry           ]                     │
└─────────────────────────────────────────────────────────┘
```

**Media source:** three options — Take Photo, Take Video, Choose from Library (photo or video). Selecting one immediately opens the native OS camera/library picker; returning from it advances the sheet to the metadata fields below.

**Chapter assignment:** defaults silently to the Active chapter if one exists (no picker shown at all — one less step). If there is no Active chapter, a chapter picker (sealed chapters, most-recent-first) is shown and required — this is the Memory-style, post-sealing addition path per `Transformation-Gallery-Architecture-v1.0.md` TG-D9.

**Title/Caption/Tags:** all optional, per TG-D4/TG-D3. Tags render as a multi-select chip row (CLA-C09 Chip, Filter variant), the fixed six-value taxonomy only — no custom tag entry field.

**Save:** creates the `TransformationEntry` and returns to L-17, with the new entry visible in its chapter section at the correct chronological position (newest, since it was just added). No confirmation toast beyond the entry appearing — consistent with the product's general preference for showing the result rather than announcing it.

**Cancel/dismiss:** standard sheet dismiss (drag down or tap outside); nothing is saved until "Save Entry" is tapped, same discipline as every other creation form in the product (e.g., W-4 Program Creation's "no drafts" rule).

---

## Section 5 — Reaching L-18

Tapping any thumbnail — from L-17's grid or from L-1's §8a preview strip — opens **L-18 (Transformation Entry Detail)** for that specific entry, as a pushed screen (not a modal), consistent with other Legacy detail screens (L-4, L-13).

---

## Section 6 — L-18 Transformation Entry Detail

### 6.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  ‹                                              [⋯]      │  ← App Bar: back + overflow
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │                                                 │     │
│  │                                                 │     │
│  │              [ Photo or Video, full-width ]     │     │
│  │                                                 │     │
│  │                                                 │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  Leg Day — Week 6                        [15sp title]   │
│  Road to 405 · Jun 3, 2026                [13sp, muted] │
│                                                         │
│  [Front] [Side]                            [tag chips]  │
│                                                         │
│  "Starting to see the difference in my legs             │
│   after six weeks of consistent squatting."              │
│                                          [caption, 14sp] │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Media:** the single largest element on the screen — full-width, aspect-ratio-preserved. Video entries play inline with standard native playback controls (play/pause/scrub); no autoplay-on-arrival sound (muted by default, consistent with the product's restrained motion/audio conventions — see `Component-Library-Architecture-v1.0.md` §2 CLA-P5 and the Rest Timer's "no sound by default" precedent).

**Title:** shown if set (15sp, primary weight); the element is simply absent if no title was given — no placeholder.

**Chapter + date attribution:** "[Chapter Name] · [Month D, YYYY]" — 13sp, muted. Tappable → L-3 (if the chapter is Active) or L-4 (if sealed), the same "View Chapter" pattern already established for Photos' L-16 (`L-15-Photos-Architecture.md` §15).

**Tags:** shown as read-only chips if any are set; absent entirely if none were set.

**Caption/reflection:** shown as a quoted block if set (14sp); absent entirely if not set — no "no reflection added" placeholder, matching L-1's FLM card convention for the same situation.

### 6.2 Overflow Menu ("⋯")

- **Edit** — opens the same field set as the Add Entry sheet (title/caption/tags only — media itself is never re-selectable), shown **only if the entry's chapter is still Active** (TG-D10). Absent entirely from the menu once the chapter has sealed — not shown-and-disabled.
- **Set as Chapter Cover** — reserved per TG-D6; **not rendered in this pass** (no display destination exists yet for chapter cover media — see Architecture Risks). This action is intentionally withheld from the V1 build of L-18 rather than shown non-functionally.
- **Delete** — shown only if the entry is a **memory** (post-seal) entry, per TG-D9. Confirmation via the standard M-6 Destructive Action Confirmation pattern ("Delete this entry? This cannot be undone."). Absent entirely for original (pre-seal, once sealed) entries — deletion is not offered, not offered-and-blocked.
- **Share** — **not available.** Transformation Gallery entries are not eligible for WSR-001/SH-1 external sharing (TG-D8) — no share action exists on this menu.

### 6.3 Mutability Summary (reference only — governed by the Architecture doc)

| Entry state | Edit available? | Delete available? |
|---|---|---|
| Original, chapter still Active | Yes | No *(deletion of an in-progress original is not modeled — see Open Questions)* |
| Original, chapter now Sealed | No | No |
| Memory (added post-seal) | No | Yes, confirmation-gated |

**Open Question carried from the Architecture doc:** whether an original entry should be deletable while its own chapter is still Active (i.e., "I made a mistake, let me remove it before I seal") is not explicitly resolved by `Transformation-Gallery-Architecture-v1.0.md`. This wireframe spec takes the conservative reading — no delete for originals at any point — consistent with Photos' identical "no delete for original photos, active or sealed" rule (`L-15-Photos-Architecture.md` §13). Flagged here for confirmation, not silently assumed.

---

## Section 7 — Empty States

**L-17, zero entries anywhere:**

```
┌─────────────────────────────────────────────────────────┐
│  ‹ Transformation Gallery                     [+]        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [muted icon]                                            │
│                                                         │
│  Your transformation has a story.                        │
│  Start documenting it, one chapter at a time.             │
│                                                         │
│  [      Add Your First Entry      ]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Warm, inviting tone — matching L-1's "No Active Chapter" invitation register, not a failure state. "Add Your First Entry" opens the same sheet as the App Bar "[+]" action.

**L-17, some chapters have entries and others don't:** chapters with zero entries are simply absent — no "no entries in this chapter yet" sub-message per chapter.

---

## Section 8 — Navigation

| From | Action | To |
|---|---|---|
| L-1 | "View All [N] Entries ›" (§8a) | L-17 |
| L-1 | Tap a preview-strip thumbnail (§8a) | L-18 (that entry) |
| L-17 | Tap "[+]" | Add Entry sheet |
| L-17 | Tap a thumbnail | L-18 (that entry) |
| L-18 | Chapter/date attribution | L-3 (Active) or L-4 (Sealed) |
| L-18 | Overflow → Edit | Edit sheet (same fields as Add Entry) |
| L-18 | Overflow → Delete → confirm (M-6) | L-17, with a toast |
| L-17 | Back chevron | L-1 |

---

## Section 9 — Mobile UX

- **Screen type:** L-17 is a pushed screen (from L-1), not a tab root, not a modal. L-18 is pushed from L-17 (or directly from L-1's preview strip).
- **Grid:** 3-column, square thumbnails, 4dp gutter, consistent with Photos' L-15 grid density.
- **Tap targets:** thumbnails ≥ 64×64dp; "[+]" App Bar action 44×44dp; overflow menu rows ≥ 44dp height.
- **Video playback on L-18:** standard native inline player controls; no custom scrubber invented for this spec.
- **Portrait only**, consistent with every other Legacy screen.

---

## Section 10 — Accessibility

- L-17 thumbnail: `accessibilityLabel` = "[Chapter Name], [Month D, YYYY][, video]. Double-tap to view."
- L-17 chapter section header: announced as a heading, e.g. "Road to 405, Active" or "Foundations, sealed April to June 2026."
- L-18 media: `accessibilityLabel` = "Transformation entry photo/video, [Chapter Name], [date]" — caption text (if present) included as part of the same label.
- L-18 tag chips: each announced individually, e.g. "Tag: Front."
- Edit/Delete menu items: standard button accessibility; absent items are simply not present in the accessibility tree (not disabled-and-announced).

---

## Section 11 — Edge Cases

**11.1 First entry added to a brand-new chapter (Chapter I, silently created at onboarding):** L-17 shows one chapter section with one thumbnail. No special first-entry ceremony — consistent with the product's restrained-ceremony discipline (only M-1–M-7 are ceremonies, and this is not one of them).

**11.2 Athlete adds an entry, then immediately deletes it (same Active chapter):** Not offered per Section 6.3's conservative reading — an athlete who wants to "undo" an original entry within an Active chapter cannot currently do so from L-18. Flagged as an Open Question (Section 6.3), not silently resolved by adding an unauthorized delete path.

**11.3 Video entry with no caption or tags:** L-18 shows the video player, chapter/date attribution, and nothing else — no placeholder rows for the absent optional fields.

**11.4 Chapter seals while the Add Entry sheet or Edit sheet is open:** out of scope for this spec (a real-time-concurrency edge case); treat as an engineering-level race condition, not a design decision.

**11.5 Athlete has many chapters, each with several entries:** L-17 scrolls naturally, section by section, oldest-chapter-content-within-newest-chapter-first, matching L-1's Chapter History precedent for "many sealed chapters" (`Legacy-Hub-Wireframe-Spec-L1.md` §17.8).

---

## Section 12 — Architecture Risks

**Risk 1 — Chapter Cover Media has no display destination yet.** `isChapterCover` is reserved at the data-model level (TG-D6) but this wireframe spec deliberately does not render a "Set as Chapter Cover" action (Section 6.2), since no L-3/L-4/L-1 display integration exists. **Risk level: Low** — the field exists and is harmless unused; a future amendment adds both the setter UI and the display.

**Risk 2 — Deletability of an in-progress original entry is unresolved.** Section 6.3's Open Question. **Risk level: Low** — the conservative "no delete" reading is safe (never destroys data unexpectedly) and matches the Photos precedent exactly; loosening it later is a low-risk amendment.

**Risk 3 — Monetization limit undecided** (`Transformation-Gallery-Architecture-v1.0.md` Open Question 1). This wireframe spec assumes **no limit is enforced on L-17's Add Entry flow** until a limit is explicitly locked — i.e., M-7 Premium Upsell never fires from this flow in the current build. **Risk level: Medium** — if a limit is later added, the Add Entry sheet (Section 4) will need an M-7 trigger point analogous to W-4's `customProgramCount >= 3` check.

---

## Section 13 — Validation Checklist

### L-17
- [ ] Chapter-grouped sections, Active chapter first, then sealed newest-first
- [ ] Within each section, entries ordered oldest → newest
- [ ] Chapters with zero entries do not appear as sections
- [ ] "[+]" opens the Add Entry sheet
- [ ] Thumbnails use PhotoThumbnail (CLA-C36); video entries show a play-glyph overlay
- [ ] No tag chips visible on L-17 thumbnails (tags shown on L-18 only)
- [ ] Empty state (zero entries anywhere) shows warm invitation copy, not a failure message

### Add Entry Sheet
- [ ] Media source: Take Photo / Take Video / Choose from Library
- [ ] Chapter defaults silently to Active; picker shown only when no Active chapter exists
- [ ] Title, Caption/Reflection, Tags all optional
- [ ] Tags: fixed six-value set only (Front, Side, Back, Posing, Competition, Milestone) — no custom tag entry
- [ ] Nothing persists until "Save Entry" is tapped

### L-18
- [ ] Media is the single largest element on screen
- [ ] Title shown only if set; caption shown only if set; tags shown only if set — no placeholders for absent optional fields
- [ ] Chapter/date attribution tappable → L-3 or L-4
- [ ] Edit menu item present only while the entry's chapter is Active
- [ ] Delete menu item present only for memory (post-seal) entries, confirmation-gated via M-6
- [ ] No Share action anywhere on L-18
- [ ] "Set as Chapter Cover" is NOT rendered in this build (Risk 1)

### Non-Social Constraints (binding, re-verified at the screen level)
- [ ] No like, comment, view-count, or feed element anywhere on L-17 or L-18
- [ ] No side-by-side/slider comparison UI on L-18
- [ ] No leaderboard, ranking, or cross-athlete comparison of any kind

---

## Section 14 — Downstream Dependencies

| Dependency | What L-17/L-18 Requires | Status |
|---|---|---|
| `Transformation-Gallery-Architecture-v1.0.md` | Data model, mutability rules, tag taxonomy | LOCKED — this pass |
| `Legacy-Hub-Wireframe-Spec-L1.md` §8a | Entry point (preview strip + "View All") | LOCKED — updated this pass |
| L-3 / L-4 | Chapter/date attribution tap-through | Specced — locked |
| M-6 | Delete confirmation pattern | Specced — locked |
| Chapter cover media display (future) | "Set as Chapter Cover" UI + L-3/L-4/L-1 rendering | Not yet authored — Risk 1 |
| Monetization limit (future, if any) | M-7 trigger point in Add Entry sheet | Not yet authored — Risk 3 |

---

## Change Log

### v1.0 — 2026-07-02

Initial specification. L-17 (Transformation Gallery) and L-18 (Transformation Entry Detail) defined per `Transformation-Gallery-Architecture-v1.0.md`, formalizing a stakeholder-directed decision previously recorded only in `Docs/Forge-Design-Blueprint-v1.0.md`. Chapter-grouped, chronological-within-chapter browse (L-17); lightweight Add Entry bottom sheet (no third screen); documentary single-entry detail view with architecture-gated Edit/Delete (L-18); zero social/comparison mechanics anywhere. Three open risks carried forward, none blocking: chapter cover media display integration, in-progress-original delete policy, and monetization limit.

---

*Forge Legacy Transformation Gallery Wireframe Specification — L-17/L-18*
*v1.0 — 2026-07-02*
*Authority: Transformation-Gallery-Architecture-v1.0.md, Legacy-Hub-Wireframe-Spec-L1.md v1.1, Photos-Wireframe-Spec-L15-L16.md (structural precedent), Component-Library-Architecture-v1.0.md*
