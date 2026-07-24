# W-21 Exercise Library — Wireframe Specification
## Screen Specification: Exercise Library Hub
### June 2026

**Status:** LOCKED

**Type:** Screen Wireframe Specification

**Date:** June 2026

**Implements:** Exercise-Library-Architecture-v1.0.md (LOCKED), Exercise-001-Custom-Exercise-Architecture.md (LOCKED), Exercise-002-Exercise-Substitution-Architecture.md (LOCKED), Exercise-003-Exercise-Favorites-Architecture.md (LOCKED)

**Authority Chain:**
- Exercise-Library-Architecture-v1.0.md (LOCKED) — 6-category browse taxonomy, ExerciseDefinition data model, CUSTOM visibility rules
- Exercise-001-Custom-Exercise-Architecture.md (LOCKED) — §EX-001-D16: "Exercise-001 fully defines the My Exercises browse surface in W-21... When W-21's full wireframe spec is written, it must implement these rules." This document is that implementation.
- Exercise-002-Exercise-Substitution-Architecture.md (LOCKED) — confirms alternatives/substitution UI lives in W-22, not W-21
- Exercise-003-Exercise-Favorites-Architecture.md (LOCKED) — §4.1.2: favorite toggle behavior on W-21 rows
- Exercise-Detail-Wireframe-Spec-W22.md (LOCKED) — Authority line names "W-21 (LOCKED)" as a co-authority; its entry-point table (six W-21 contexts) is the navigation contract this document implements
- Exercise-Picker-Wireframe-Spec-W23.md (LOCKED) — explicitly distinguishes itself from W-21: *"W-23 is not W-21. W-21 is a browsing and discovery surface. W-23 is an operational tool."*
- Workout-Builder-Wireframe-Spec-W24.md (LOCKED) — *"An exercise browsing or discovery surface (that is W-21)"*
- W-28-Create-Edit-Custom-Exercise.md (LOCKED) — §1.3: *"W-21 (Exercise Library Hub, My Exercises section) is the entry point to W-28 CREATE mode."*

**Downstream Dependents:** None. No screen is unspecced because of this document.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Screen Purpose

W-21 is a **browsing and discovery surface** — explicitly not an operational tool. W-23's own spec draws this exact line: *"W-23 is not W-21. W-21 is a browsing and discovery surface. W-23 is an operational tool."* W-24 makes the same distinction in reverse: it is *"not... an exercise browsing or discovery surface (that is W-21)."*

The athlete comes to W-21 to research, favorite, and manage their own exercise library — not to build a workout. There is no "select and confirm" flow here; every tap either opens W-22 (Exercise Detail) for research, or opens W-28 (Create/Edit Custom Exercise) for managing their own exercises.

---

## Section 2 — Navigation Entry & Tab Context

W-21 is a primary tab-stack screen, not a Profile-modal child (unlike P-4–P-9). It uses standard tab-stack push/pop navigation with a system app bar — back chevron + title — not the Profile modal's handle-bar/dismiss pattern.

**Entry:** Reached from Workouts-Hub-Wireframe-Spec-W1.md via an explicit navigation link (the exact W-1 CTA placement and copy are not specified by W-1's own locked spec — see Section 13, Open Issues). This document assumes a standard tab-stack push from W-1.

**Returns to W-21 from:**
- W-22 (Exercise Detail) — back navigation, scroll position preserved at the point of departure (per W-22's own stated rule: *"The source context... determines back navigation behavior but not content"*).
- W-28 CREATE mode, on save — returns to the Hub with the new exercise highlighted (per W-28-Create-Edit-Custom-Exercise.md §1.3).
- W-28 EDIT mode, on delete — returns to the Hub (per the same authority).

**Exits W-21 to:**
- W-22 — six distinct entry contexts (Section 9).
- W-28 CREATE mode — via `[+ New Exercise]` in the Custom Exercises section header.
- Back chevron — returns to W-1.

---

## Section 3 — Layout Structure

W-21 has four states, all within the same screen code (confirmed by W-22's own entry-point table, which lists "Catalog Grid," "Collection Detail," "Favorites Row," "Recently Used Row," "Search Results," and "See All Favorites" as six *contexts* of one screen — not six screen codes).

### 3.1 Hub (default state)

```
┌─────────────────────────────────────────┐
│  ‹ Exercise Library                      │
│                                           │
│  [ 🔍  Search exercises...           ]   │
│                                           │
│  ───────────────────────────────────     │
│                                           │
│  FAVORITES                    See All →  │
│  [img][img][img][img][img] ⟶             │
│                                           │
│  RECENTLY USED                           │
│  [img][img][img][img][img] ⟶             │
│                                           │
│  CUSTOM EXERCISES              [+ New]   │
│  [ 🔍  Search your exercises...     ]    │
│  [img] Exercise Name 1               ♡   │
│  [img] Exercise Name 2               ♡   │
│  [img] Exercise Name 3               ♡   │
│                                           │
│  ───────────────────────────────────     │
│  BROWSE                                  │
│                                           │
│  Push                          View All →│
│  [img][img][img][img][img] ⟶             │
│                                           │
│  Pull                          View All →│
│  [img][img][img][img][img] ⟶             │
│                                           │
│  Legs & Glutes                 View All →│
│  [img][img][img][img][img] ⟶             │
│                                           │
│  Core & Stability               View All →│
│  [img][img][img][img][img] ⟶             │
│                                           │
│  Carry & Full Body              View All →│
│  [img][img][img][img][img] ⟶             │
│                                           │
│  Mobility & Flexibility          View All →│
│  [img][img][img][img][img] ⟶             │
└─────────────────────────────────────────┘
```

The six category preview rows under BROWSE collectively form what W-22's entry-point table calls the "Catalog Grid" context — each row is a horizontal-scroll preview (a handful of cards) of one of the six locked categories (PUSH, PULL, LEGS_AND_GLUTES, CORE, FULL_BODY, MOBILITY, displayed using their athlete-facing names: Push, Pull, Legs & Glutes, Core & Stability, Carry & Full Body, Mobility & Flexibility — per Exercise-Library-Architecture-v1.0.md §3.2). This is the same preview-row-plus-"View All" pattern already established elsewhere in this product (L-1, P-2, Honors) — not a new pattern invented for this screen.

### 3.2 Collection Detail (e.g., "View All" tapped under Push)

```
┌─────────────────────────────────────────┐
│  ‹ Push                                  │
│                                           │
│  [img] Barbell Bench Press            ♡  │
│        Chest · Barbell                   │
│  [img] Overhead Press                 ♡  │
│        Shoulders · Barbell               │
│  [img] Dumbbell Incline Press         ♡  │
│        Chest · Dumbbell                  │
│  ...                                     │
└─────────────────────────────────────────┘
```

Full vertical list of every FORGE exercise in the tapped category. Custom exercises never appear here — per Exercise-Library-Architecture-v1.0.md §EX-001-D9, custom exercises are excluded from FORGE category browse entirely.

### 3.3 See All Favorites (Favorites row's "See All" tapped)

```
┌─────────────────────────────────────────┐
│  ‹ Favorites                             │
│                                           │
│  [img] Exercise Name 1                ♡  │
│  [img] Exercise Name 2                ♡  │
│  [img] Exercise Name 3                ♡  │
│  ...                                     │
└─────────────────────────────────────────┘
```

Full vertical list of every favorited exercise, FORGE and CUSTOM mixed (favorites are source-agnostic per Exercise-003 §4.1.2).

### 3.4 Search (active state)

```
┌─────────────────────────────────────────┐
│  ‹  [ 🔍  bench▮                Cancel]  │
│                                           │
│  [img] Barbell Bench Press            ♡  │
│  [img] Dumbbell Bench Press           ♡  │
│  [img] Close-Grip Bench Press         ♡  │
│  ...                                     │
└─────────────────────────────────────────┘
```

Tapping the Hub's global search bar transitions to this state. "Cancel" returns to the Hub.

---

## Section 4 — My Exercises Section Detail

### 4.1 Favorites Row
Horizontal-scroll, card anatomy (thumbnail over name) — the same card anatomy W-22 reuses for its own Alternatives row, per W-22's own text: *"the same card anatomy used in W-21 MY EXERCISES horizontal rows."* All-source (FORGE + CUSTOM). Ordered by favoriting recency, most recent first (per Exercise-003). "See All →" pushes to Section 3.3.

### 4.2 Recently Used Row
Horizontal-scroll, same card anatomy. Computed from the athlete's `ExerciseLog` history: the most recent N distinct exercises logged, most-recent-first. (N and the exact computation window are a display-rule choice not specified anywhere in the architecture — see Section 13, Open Issues. This document does not introduce a new data model field; it's a query-time computation over existing log data.) No "See All" — not evidenced as a locked entry context anywhere, so none is added.

### 4.3 Custom Exercises Subsection
- **Scoped search**: a second search input, local to this subsection, returns only the athlete's own CUSTOM exercises (per Exercise-001 §"Scoped search... returns athlete's CUSTOM exercises only").
- **`[+ New Exercise]`**: opens W-28 CREATE mode. Disabled with a static tooltip at the 500-exercise limit (*"Exercise limit reached (500). Delete unused exercises to create new ones."*) — this limit and its messaging are W-28's own locked rule, not redefined here.
- **List**: row anatomy (thumbnail + name + trailing heart icon), active custom exercises only — soft-deleted exercises never appear here (per Exercise-001).
- **Tap a row** → W-22 (exerciseId passed, same as any other exercise).
- **Delete**: swipe-left or long-press on the row (per Exercise-001's locked rule) — soft-deletes the exercise, removes it from this list immediately.
- **Edit**: not available directly from this list — the athlete opens the exercise in W-22 first, then taps the pen icon there, which opens W-28 EDIT mode (per W-28-Create-Edit-Custom-Exercise.md: *"pen icon edit destination confirmed as W-28"*).

---

## Section 5 — Browse Section Detail

Six category preview rows, in the fixed order: Push, Pull, Legs & Glutes, Core & Stability, Carry & Full Body, Mobility & Flexibility (the locked display order from Exercise-Library-Architecture-v1.0.md §3.2). Each row:
- Horizontal-scroll preview of FORGE exercises in that category (card anatomy, same as Favorites/Recently Used).
- "View All →" pushes to Collection Detail (Section 3.2) for that category.
- Tapping any card directly → W-22 (the "Catalog Grid" context).

No filters appear anywhere on W-21 — equipment, muscle, and difficulty filters are W-23's feature set, explicitly not duplicated here.

---

## Section 6 — Search Behavior

- Tap the Hub's search bar → transitions to the Search state (Section 3.4).
- Results update as the athlete types.
- **Ranking** (per Exercise-003, locked): exact name match > prefix match > contains match > muscle/equipment match; within each tier, favorited exercises rank first, then recently-used, then alphabetical.
- **Scope**: FORGE exercises + the athlete's own CUSTOM exercises only — never another athlete's custom exercises.
- **Result row anatomy**: same row format as Collection Detail (thumbnail, name, light metadata, trailing heart icon).
- **Empty results**: *"No exercises found for '[query]'"* — no call-to-action. Exercise creation is not offered from search; it remains the Custom Exercises subsection's job.
- **Cancel** → returns to the Hub, search state discarded.

---

## Section 7 — Favorite Toggle Behavior

- Heart icon at the trailing edge of every row (vertical lists) or as a corner overlay on every card (horizontal-scroll rows) — present on every exercise surface throughout W-21: Catalog Grid, Collection Detail, Favorites Row, Recently Used Row, Custom Exercises list, Search Results.
- Outlined when not favorited; filled, warm accent color when favorited (matching W-22's own visual treatment).
- **Single direct tap toggles state — no long-press required and no confirmation.** This is a deliberate contrast with W-23, where favoriting requires a long-press action sheet: *"No long-press required on W-21 rows — W-21 is a discovery and browse surface where the athlete is not mid-task; direct toggle is appropriate"* (Exercise-003 §4.1.2).
- Toggling off while viewing the Favorites Row or See All Favorites list removes the card/row from that list immediately — its presence in those specific surfaces is defined entirely by favorite status.
- State change syncs immediately and bidirectionally with W-22: favoriting in W-22 is reflected in W-21 on return, and vice versa (per W-22's own stated rule).

---

## Section 8 — Empty States

| Surface | Empty Condition | Behavior |
|---|---|---|
| Favorites row | No favorited exercises | Section (heading + row) omitted entirely — no placeholder, no "nothing here yet" copy, consistent with this product's established empty-state convention (L-1 and others). |
| Recently Used row | No logged exercise history | Section omitted entirely, same convention. |
| Custom Exercises subsection | No custom exercises created | Section **always renders** (it's actionable — `[+ New Exercise]` needs a permanent home) with a brief inline line beneath the search bar: *"You haven't created any exercises yet."* No fake row, no illustration. |
| Search | No results for query | *"No exercises found for '[query]'"* — text only, no CTA. |
| Collection Detail | N/A | Every category has FORGE exercises by catalog design (200–225 exercises across 6 categories) — this state cannot occur for FORGE categories and is not designed for. |

---

## Section 9 — Navigation Table

| From | Action | To | Context Passed |
|---|---|---|---|
| W-1 | Tap Exercise Library link | W-21 Hub | — |
| W-21 Hub | Tap a card in a Browse preview row | W-22 | exerciseId (context: Catalog Grid) |
| W-21 Hub | Tap "View All" on a Browse category | Collection Detail | category |
| Collection Detail | Tap an exercise row | W-22 | exerciseId (context: Collection Detail) |
| W-21 Hub | Tap a card in the Favorites row | W-22 | exerciseId (context: Favorites Row) |
| W-21 Hub | Tap "See All" on Favorites | See All Favorites | — |
| See All Favorites | Tap an exercise row | W-22 | exerciseId (context: See All Favorites) |
| W-21 Hub | Tap a card in Recently Used | W-22 | exerciseId (context: Recently Used Row) |
| W-21 Hub | Tap a row in Custom Exercises | W-22 | exerciseId |
| W-21 Hub | Tap `[+ New Exercise]` | W-28 (CREATE mode) | — (blank form) |
| W-28 CREATE | Save | W-21 Hub | New exercise highlighted in Custom Exercises |
| W-28 EDIT (reached via W-22's pen icon) | Delete | W-21 Hub | — |
| W-21 Hub | Tap search bar | Search state | — |
| Search state | Tap a result row | W-22 | exerciseId (context: Search Results) |
| Search state | Tap "Cancel" | W-21 Hub | Search discarded |
| W-22 (any context) | Back navigation | W-21 (originating state) | Scroll position preserved at point of departure |
| W-21 Hub | Tap back chevron | W-1 | — |
| Collection Detail / See All Favorites | Tap back chevron | W-21 Hub | — |

---

## Section 10 — Accessibility Requirements

| Element | accessibilityLabel | Notes |
|---|---|---|
| Back chevron | "Back" | Context-dependent destination per Section 9 |
| Search bar (Hub) | "Search exercises" | Opens Search state on focus |
| Search bar (Custom Exercises) | "Search your exercises" | Scoped to CUSTOM exercises only |
| "See All" (Favorites) | "See all favorites" | — |
| "View All" (per category) | "View all [Category Name] exercises" | — |
| `[+ New Exercise]` | "Add a new exercise" | `accessibilityHint`: "Opens at the 500-exercise limit" only when disabled |
| Exercise card/row | "[Exercise Name]" | `accessibilityHint`: "Opens exercise details" |
| Favorite heart icon | "Favorite" / "Unfavorite" | `accessibilityValue` = "favorited" / "not favorited"; toggling announces the new state |
| Custom exercise delete (swipe/long-press) | "Delete [Exercise Name]" | Standard swipe-action or action-sheet accessibility |

**Focus order:** Top to bottom, matching visual order, within each of the four states independently.

---

## Section 11 — Non-Behaviors

- **No filters** (equipment, muscle group, difficulty) anywhere on W-21 — that is W-23's feature set exclusively.
- **No progression/regression relationship UI** — Exercise-002 explicitly scopes this MVP behavior to W-22's Alternatives/Suggested Substitutes context, not W-21.
- **No PR indicators or performance data** — W-21 is discovery, not analytics.
- **No "Deleted Exercises" section** — restore is only ever initiated from a tombstone wherever one appears (W-27, program edit surfaces), never from a dedicated list in W-21.
- **No cross-athlete visibility of custom exercises** — every custom exercise list and search result is scoped to the requesting athlete only.
- **No popularity rankings or "most favorited" aggregates** — favorites are strictly per-athlete; no cross-athlete aggregation exists anywhere in the locked architecture.
- **No direct edit action from W-21** — editing a custom exercise always routes through W-22's pen icon first, never an inline edit affordance on this screen.
- **No confirmation step on favoriting/unfavoriting** — a single tap is sufficient, per Exercise-003's explicit rationale.
- **No new data model fields** — Recently Used is a query-time computation over existing `ExerciseLog` data, not a new persisted field.

---

## Section 12 — Validation Checklist

### Navigation
- [ ] W-21 reachable from W-1 via a standard tab-stack push
- [ ] Back chevron from the Hub returns to W-1
- [ ] Collection Detail and See All Favorites are sub-states of W-21, not separate screen codes
- [ ] All six W-22 entry contexts (Catalog Grid, Favorites Row, Recently Used Row, Search Results, Collection Detail, See All Favorites) are reachable exactly as described in Section 9
- [ ] Returning from W-22 preserves scroll position at the point of departure
- [ ] `[+ New Exercise]` opens W-28 CREATE mode with a blank form
- [ ] W-28 CREATE save returns to the Hub with the new exercise highlighted
- [ ] W-28 EDIT delete (reached via W-22's pen icon) returns to the Hub

### My Exercises
- [ ] Favorites row: all-source, ordered by favoriting recency, omitted entirely when empty
- [ ] Recently Used row: computed from ExerciseLog, omitted entirely when empty
- [ ] Custom Exercises subsection always renders, even with zero exercises
- [ ] Custom Exercises search is scoped to the athlete's own CUSTOM exercises only
- [ ] `[+ New Exercise]` disabled with tooltip at 500-exercise limit
- [ ] Custom exercise delete via swipe-left or long-press; no edit affordance directly on this screen

### Browse
- [ ] Exactly six category preview rows, in the locked order: Push, Pull, Legs & Glutes, Core & Stability, Carry & Full Body, Mobility & Flexibility
- [ ] Each category row has a "View All →" leading to Collection Detail
- [ ] Collection Detail shows FORGE exercises only — no custom exercises ever appear in category browse
- [ ] No filters present anywhere on this screen

### Search
- [ ] Ranking order: exact > prefix > contains > muscle/equipment match, then favorited-first, then recently-used, then alphabetical
- [ ] Scope: FORGE + the athlete's own CUSTOM exercises only
- [ ] Empty results show text only, no CTA
- [ ] Cancel discards search state and returns to the Hub

### Favorites
- [ ] Heart icon present on every exercise surface (Catalog Grid, Collection Detail, Favorites Row, Recently Used Row, Custom Exercises, Search Results)
- [ ] Single tap toggles, no long-press, no confirmation
- [ ] State syncs immediately and bidirectionally with W-22
- [ ] Un-favoriting while viewing Favorites Row or See All Favorites removes the item immediately

### Non-Behaviors
- [ ] No filters, progression/regression UI, PR data, Deleted Exercises section, cross-athlete visibility, popularity rankings, inline edit, or favoriting confirmation appear anywhere

---

## Section 13 — Open Issues

**None blocking.** Taxonomy, data model, and the full navigation graph are fully resolved by existing locked architecture; this document only adds layout and interaction design against that contract.

Carried forward, not blocking:
- **Exact W-1 entry-point CTA** (placement, copy) is not specified by Workouts-Hub-Wireframe-Spec-W1.md's own locked content. This document assumes a standard tab-stack push exists; a small amendment to W-1 (similar in spirit to the already-identified W3-A1/W9-A1 pattern) may be needed to formally add the entry CTA. Does not block this document.
- **Recently Used window/count (N)** is a display-rule choice made by this document (most recent N distinct logged exercises) rather than a value specified anywhere in the architecture. Not a blocker — the semantic contract (most-recent-first, distinct exercises) is stable regardless of the exact N chosen at implementation time.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 (Repository Correction) | June 2026 | Numbering correction only, no behavioral change: all references to the Create/Edit Custom Exercise screen (§1, §2, §4.3, §9 navigation table, §12 validation checklist, footer authority citation) updated from "W-24" to "W-28," resolving a screen-numbering collision with the unrelated, ecosystem-wide Program Slot Builder (which retains W-24 and is unaffected). See `W-28-Create-Edit-Custom-Exercise.md` Change Log v1.0 R2 for full audit trail. |

---

*W-21 Exercise Library — Wireframe Specification*
*Screen Specification: Exercise Library Hub*
*June 2026*
*Authority: Exercise-Library-Architecture-v1.0.md (LOCKED), Exercise-001-Custom-Exercise-Architecture.md (LOCKED), Exercise-002-Exercise-Substitution-Architecture.md (LOCKED), Exercise-003-Exercise-Favorites-Architecture.md (LOCKED), Exercise-Detail-Wireframe-Spec-W22.md (LOCKED), Exercise-Picker-Wireframe-Spec-W23.md (LOCKED), Workout-Builder-Wireframe-Spec-W24.md (LOCKED), W-28-Create-Edit-Custom-Exercise.md (LOCKED)*
*Status: LOCKED*
