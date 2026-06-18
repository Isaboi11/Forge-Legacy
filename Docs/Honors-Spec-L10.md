# L-10 Honors Hub
## Wireframe Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Honor-Catalog-v1.0-LOCKED.md, HonorInstance-Architecture-v1.0.md, Honor-Evaluation-Service-Architecture-v1.0.md, M-2 Honor Earned Modal Spec v1.1, L-11 Honor Detail Sheet Spec v1.1, FLM Standards v1.0, Master PRD §13, Product DNA

---

## 1. Purpose

L-10 is the athlete's primary destination for reviewing their earned honors — the complete recognition record of what they have built.

L-10 is simultaneously:

- **Recognition** — an acknowledgment of what the athlete has achieved
- **History** — the chronological and categorical story of their journey
- **Identity** — who they are as an athlete, as measured by the system

L-10 is not a badge collector screen. Unearned honors do not exist on this screen. The athlete sees only what they have actually earned. There is no catalog to fill. There is no completion to pursue. There is no percentage to reach.

The Recent Honors section brings the most recent recognition to the surface. The category sections preserve the complete record in a structure the athlete can navigate intentionally.

**Emotional tone:** Earned. Still. A record, not a destination.

---

## 2. Navigation Entry Points

| Source | Trigger | Data Passed | Condition |
|--------|---------|-------------|-----------|
| L-1 Legacy Hub, Section 7 | Tap "View All [N] Honors ›" | None — L-10 loads from local cache | Only displayed when N ≥ 1 |
| P-1 Profile, Honors section | Tap "View all ›" | None | Only displayed when N ≥ 1 |

L-10 has no entry point when the athlete has zero earned honors. Both links are absent until the first honor is earned. The athlete reaches L-10 only after recognition has occurred.

No deep-link entry point in MVP. Future surfaces (M-2 extended navigation, sharing, notifications) may introduce direct navigation. These are post-MVP concerns.

---

## 3. Screen Layout

L-10 is a full navigation stack screen. Standard Forge Legacy navigation pattern: back-navigable, not a modal, not a sheet.

**Default view (at least one honor earned):**

```
┌──────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                               │
├──────────────────────────────────────────────────┤
│  ‹                    Honors                     │  ← Navigation bar (sticky)
├──────────────────────────────────────────────────┤
│                                                  │
│  RECENT HONORS                                   │  ← Section label
│  ─────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────┐   │
│  │ [Honor Name]                          ›  │   │
│  │ Month D, YYYY  ·  [Preview Line]        │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ [Honor Name]                          ›  │   │
│  │ Month D, YYYY  ·  [Preview Line]        │   │
│  └──────────────────────────────────────────┘   │
│  (up to 5 cards total)                          │
│                                                  │
│  ─────────────────────────────────────────────  │
│                                                  │
│  Training                      [N]          ∨   │  ← Category header (collapsed)
│  ─────────────────────────────────────────────  │
│  Strength                      [N]          ∨   │
│  ─────────────────────────────────────────────  │
│  Goals                         [N]          ∨   │
│  ─────────────────────────────────────────────  │
│  Programs                      [N]          ∨   │
│  ─────────────────────────────────────────────  │
│  Community                     [N]          ∨   │
│  ─────────────────────────────────────────────  │
│  Chapters                      [N]          ∨   │
│  ─────────────────────────────────────────────  │
│  Longevity                     [N]          ∨   │
│  ─────────────────────────────────────────────  │
│                                                  │
│  [bottom safe area]                              │
└──────────────────────────────────────────────────┘
```

**View with one category expanded:**

```
│  Training                      [N]          ∧   │  ← Expanded (chevron rotated)
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ First Session                         ›  │   │
│  │ March 14, 2025  ·  The beginning…       │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ 50 Sessions                           ›  │   │
│  │ July 2, 2025  ·  50 sessions logged     │   │
│  └──────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────  │
│  Strength                      [N]          ∨   │
```

**Layout rules:**
- Navigation bar title: "Honors" (centered or leading, per platform convention)
- Back chevron `‹` navigates to originating screen (L-1 or P-1)
- No overflow menu (⋯). No filter control. No sort control. No search.
- Content area scrolls. Navigation bar is sticky.
- Categories with 0 earned honors are entirely absent — not shown with a 0 count, not shown as locked. They do not exist visually.

---

## 4. Recent Honors Section

### 4.1 Data Source and Sorting

| Property | Value |
|----------|-------|
| Source | HonorInstance records |
| Sort | `dateEarned` DESC (most recent first) |
| Limit | 5 |
| Tiebreaker | `awardedAt` DESC (for honors earned in the same session) |

### 4.2 Section Label

Label text: "RECENT HONORS" — secondary weight, muted caps, left-aligned.

The section label appears above the first honor card. It is present whenever at least 1 honor exists. It is absent on the empty state. The label is not tappable and has no collapse behavior — Recent Honors is always visible.

### 4.3 Card Format

Each card in the Recent Honors section follows the Honor Card design defined in Section 8.

### 4.4 Same-Honor Appearance in Both Sections

The Recent Honors section and the category sections are independent views. A honor earned recently appears in Recent Honors AND in its category section when that category is expanded. There is no deduplication or cross-section coordination. This is correct and expected — the athlete sees the same honor from two perspectives: "What did I just earn?" (Recent Honors) and "How does this fit into my strength story?" (expanded category).

### 4.5 Fewer Than 5 Honors

If the athlete has earned 1–4 honors total, Recent Honors displays all earned honors (N cards, N < 5). The section does not pad with placeholders. The label still reads "RECENT HONORS."

### 4.6 Repeatable Honors in Recent Honors

Each HonorInstance represents a distinct accomplishment. When multiple repeatable honors are awarded in the same evaluation transaction — for example, `workouts_in_chapter_10`, `workouts_in_chapter_25`, and `workouts_in_chapter_50` earned within the same chapter — all three HonorInstances appear as separate cards in Recent Honors.

No deduplication. No grouping by honor type. No suppression of lower thresholds because a higher one was also earned.

**Example — three depth honors earned in one session:**

```
RECENT HONORS
─────────────────────────────────────────────────────
50 Workouts in a Chapter                          ›
June 14, 2026  ·  Fatherhood
─────────────────────────────────────────────────────
25 Workouts in a Chapter                          ›
June 14, 2026  ·  Fatherhood
─────────────────────────────────────────────────────
10 Workouts in a Chapter                          ›
June 14, 2026  ·  Fatherhood
─────────────────────────────────────────────────────
```

All three appear. Order within the same `dateEarned` is determined by `awardedAt` DESC — the highest threshold earned last in the evaluation sequence appears first, producing a descending display (50 → 25 → 10) that reflects the natural evaluation order.

Reasoning: Recent Honors is sourced directly from HonorInstance records. Each HonorInstance is a permanent accomplishment record. Deduplication would conceal legitimately earned recognition and contradict the HonorInstance uniqueness model (AD-55), which intentionally creates separate records for each repeatable instance.

---

## 5. Category Section Architecture

### 5.1 Seven Display Categories

L-10 organizes all 53 MVP honor types into seven display categories, in this fixed order:

| # | Display Category | Catalog Families Included | Honor Type Count |
|---|-----------------|--------------------------|-----------------|
| 1 | Training | Training | 12 |
| 2 | Strength | Strength + Club | 18 |
| 3 | Goals | Goals | 4 |
| 4 | Programs | Programs | 4 |
| 5 | Community | Community | 3 |
| 6 | Chapters | Chapter Count + Chapter Depth | 8 |
| 7 | Longevity | Longevity | 4 |
| | **Total** | | **53** |

**Club honors (merged into Strength):** The Honor Catalog defines Club as a separate family (combined lift totals). L-10 groups Club honors under the Strength display category. This represents the full strength narrative — individual lift milestones and combined total milestones — in one section. The catalog family separation is an architecture detail; the display category is Strength.

### 5.2 Default State

All category sections are **collapsed** when L-10 loads. The athlete sees Recent Honors (always visible) and category headers (collapsed, showing earned count). No category is pre-expanded on load.

### 5.3 State Not Persisted

Category expand/collapse state is not persisted between L-10 sessions. Every visit to L-10 begins with all categories collapsed and Recent Honors visible.

### 5.4 Hidden Categories

A category with zero earned honors is entirely absent from the screen. It is not shown as locked, empty, or grayed. It does not appear at all.

Example: An athlete who has never sealed a chapter sees no "Chapters" category header. When they earn their first chapter honor, the Chapters category appears on next load of L-10.

---

## 6. Category Header Design

```
  [Category Name]                           [N]  ∨
```

| Element | Position | Typography | Behavior |
|---------|----------|-----------|---------|
| Category name | Left-aligned | 16sp, medium weight | Static text |
| Honor count [N] | Right of category name, muted | 13sp, muted | Count of earned HonorInstances in this category |
| Expand indicator ∨ / ∧ | Trailing | Standard chevron | ∨ = collapsed; ∧ = expanded; rotates on tap |

**Full header row is tappable.** Touch target spans full row width and height.

**Minimum header height:** 52pt.

**Divider:** Horizontal rule appears below each category header (in both collapsed and expanded states).

### 6.1 Honor Count Definition

The count [N] represents:

- Total earned HonorInstances in this category
- Repeatable chapter depth honors count once per earned instance (not once per honor type)
- Never a count of catalog definitions or possible honors

**Example:** An athlete who has earned `workouts_in_chapter_10` in 3 different chapters contributes 3 to the Chapters category count.

---

## 7. Expanded Category Behavior

### 7.1 Expand / Collapse

Tapping a category header toggles expansion. Multiple categories may be expanded simultaneously. There is no accordion — expanding one category does not collapse another.

When expanded, the category header remains visible and sticky within the scrollable view. Honor cards appear below the header. The expand indicator rotates to ∧.

### 7.2 Within-Category Sort Order

Within each category, earned honors appear in **catalog progression order** — the sequence of milestones from lowest to highest, as defined by the catalog.

The athlete should see the path they climbed. Within a category, older milestones appear before newer milestones. The honor earned most recently is not necessarily first — its position is determined by where it sits in the progression, not when it was earned.

**Category progression order:**

#### Training
Workout count family first (ascending threshold), then Hours Forged family (ascending threshold):

1. `first_workout_logged`
2. `workouts_logged_50`
3. `workouts_logged_100`
4. `workouts_logged_250`
5. `workouts_logged_500`
6. `workouts_logged_1000`
7. `hours_forged_100`
8. `hours_forged_250`
9. `hours_forged_500`
10. `hours_forged_1000`
11. `hours_forged_2500`
12. `hours_forged_5000`

#### Strength
Bench family (ascending threshold) → Squat family (ascending threshold) → Deadlift family (ascending threshold) → Club family (ascending threshold):

1. `bench_milestone_1`
2. `bench_milestone_2`
3. `bench_milestone_3`
4. `bench_milestone_4`
5. `squat_milestone_1`
6. `squat_milestone_2`
7. `squat_milestone_3`
8. `squat_milestone_4`
9. `deadlift_milestone_1`
10. `deadlift_milestone_2`
11. `deadlift_milestone_3`
12. `deadlift_milestone_4`
13. `club_1000` or `club_400kg` (lower threshold for athlete's unit system)
14. `club_1200` or `club_500kg`
15. `club_1500` or `club_600kg`

An athlete earns either lbs Club honors or kg Club honors — not both. The display renders only the earned instances for the athlete's unit system. The position of Club honors within the Strength category is always at the end, regardless of which club type was earned.

#### Goals
Ascending threshold:

1. `first_goal_achieved`
2. `goals_achieved_10`
3. `goals_achieved_25`
4. `goals_achieved_50`

#### Programs
Ascending threshold:

1. `first_program_graduated`
2. `programs_graduated_5`
3. `programs_graduated_10`
4. `programs_graduated_25`

#### Community
Ascending threshold:

1. `first_workout_with_friend`
2. `workout_with_friend_10`
3. `workout_with_friend_50`

#### Chapters

Chapter Count family first (ascending threshold), then Chapter Depth family:

Count sub-family:
1. `first_chapter_sealed`
2. `chapters_sealed_5`
3. `chapters_sealed_10`
4. `chapters_sealed_25`

Depth sub-family (repeatable):
Chapter Depth honors are sorted by chapter (earliest chapter first, keyed by the earliest `dateEarned` of any depth honor within that chapter), then within each chapter by threshold (ascending):

```
workouts_in_chapter_10   [Chapter A — earliest chapter]
workouts_in_chapter_25   [Chapter A]
workouts_in_chapter_50   [Chapter A]
workouts_in_chapter_100  [Chapter A]
workouts_in_chapter_10   [Chapter B]
workouts_in_chapter_25   [Chapter B]
workouts_in_chapter_10   [Chapter C — most recent chapter]
...
```

This ordering reads: "First I built chapters. Then, here is how deep I went — chapter by chapter, in the order I lived them."

#### Longevity
Ascending threshold:

1. `longevity_1_year`
2. `longevity_3_years`
3. `longevity_5_years`
4. `longevity_10_years`

### 7.3 Unearned Honors Within a Category

Only earned HonorInstances appear in expanded category sections. Unearned honors are absent.

If an athlete has earned `workouts_logged_50` and `workouts_logged_250` but not `workouts_logged_100`, the expanded Training section shows `workouts_logged_50` at position 2 and `workouts_logged_250` at position 4 within the catalog ordering. There is no placeholder or gap indicator at position 3. Earned honors occupy their natural catalog positions; the absence of intermediate honors is silent.

---

## 8. Honor Card Design

### 8.1 Card Layout

```
┌──────────────────────────────────────────────────┐
│  [Honor Name]                                 ›  │
│  Month D, YYYY  ·  [Preview Line]               │
└──────────────────────────────────────────────────┘
```

| Element | Source | Typography | Notes |
|---------|--------|-----------|-------|
| Honor name | `HonorInstance.displayName` | 16sp, primary weight | Max 1 line; truncates with ellipsis if needed |
| Date | `HonorInstance.dateEarned` | 13sp, muted | Format: `Month D, YYYY` (e.g., `March 14, 2025`) |
| Separator dot `·` | Static | 13sp, muted | Between date and preview line |
| Preview line | See Section 8.2 | 13sp, muted | Max 1 line; truncates with ellipsis if needed |
| Chevron `›` | Static | Standard | Trailing; signals tappability to L-11 |

**Full card is tappable.** Touch target spans full card width and height.

**Minimum card height:** 60pt (two-line content area with padding).

**No icon.** No rarity label. No category badge. No rank contribution indicator. No progress bar.

### 8.2 Preview Line Templates

The preview line adds meaningful context beyond the honor name and date. It is derived from `honorType` and snapshotted `metadata` values at earn time.

Metadata values are always sourced from `HonorInstance.metadata` — never from live entity lookups. Snapshotted names remain accurate regardless of subsequent chapter renames, goal edits, program renames, or athlete display name changes.

#### Training

| Honor Type | Preview Line |
|-----------|-------------|
| `first_workout_logged` | "The beginning of your forge" |
| `workouts_logged_50` | "50 sessions logged" |
| `workouts_logged_100` | "100 sessions logged" |
| `workouts_logged_250` | "250 sessions logged" |
| `workouts_logged_500` | "500 sessions logged" |
| `workouts_logged_1000` | "1,000 sessions logged" |
| `hours_forged_100` | "100 hours forged" |
| `hours_forged_250` | "250 hours forged" |
| `hours_forged_500` | "500 hours forged" |
| `hours_forged_1000` | "1,000 hours forged" |
| `hours_forged_2500` | "2,500 hours forged" |
| `hours_forged_5000` | "5,000 hours forged" |

#### Strength

| Honor Type | Preview Line |
|-----------|-------------|
| `bench_milestone_1` | `[metadata.weightDisplay]` |
| `bench_milestone_2` | `[metadata.weightDisplay]` |
| `bench_milestone_3` | `[metadata.weightDisplay]` |
| `bench_milestone_4` | `[metadata.weightDisplay]` |
| `squat_milestone_1` | `[metadata.weightDisplay]` |
| `squat_milestone_2` | `[metadata.weightDisplay]` |
| `squat_milestone_3` | `[metadata.weightDisplay]` |
| `squat_milestone_4` | `[metadata.weightDisplay]` |
| `deadlift_milestone_1` | `[metadata.weightDisplay]` |
| `deadlift_milestone_2` | `[metadata.weightDisplay]` |
| `deadlift_milestone_3` | `[metadata.weightDisplay]` |
| `deadlift_milestone_4` | `[metadata.weightDisplay]` |
| `club_1000` | "1,000 lbs combined total" |
| `club_1200` | "1,200 lbs combined total" |
| `club_1500` | "1,500 lbs combined total" |
| `club_400kg` | "400 kg combined total" |
| `club_500kg` | "500 kg combined total" |
| `club_600kg` | "600 kg combined total" |

`metadata.weightDisplay` is a pre-formatted string snapshotted at earn time (e.g., "135 lbs" or "60 kg"). Unit-adaptive per the athlete's unit system at the time of earning.

#### Goals

| Honor Type | Preview Line |
|-----------|-------------|
| `first_goal_achieved` | `[metadata.goalName]` |
| `goals_achieved_10` | "10 goals achieved" |
| `goals_achieved_25` | "25 goals achieved" |
| `goals_achieved_50` | "50 goals achieved" |

#### Programs

| Honor Type | Preview Line |
|-----------|-------------|
| `first_program_graduated` | `[metadata.programName]` |
| `programs_graduated_5` | "5 programs graduated" |
| `programs_graduated_10` | "10 programs graduated" |
| `programs_graduated_25` | "25 programs graduated" |

#### Community

| Honor Type | Preview Line |
|-----------|-------------|
| `first_workout_with_friend` | `[metadata.partnerDisplayName]` |
| `workout_with_friend_10` | "10 sessions with a partner" |
| `workout_with_friend_50` | "50 sessions with a partner" |

#### Chapters

| Honor Type | Preview Line |
|-----------|-------------|
| `first_chapter_sealed` | `[metadata.chapterName]` |
| `chapters_sealed_5` | "5 chapters sealed" |
| `chapters_sealed_10` | "10 chapters sealed" |
| `chapters_sealed_25` | "25 chapters sealed" |
| `workouts_in_chapter_10` | `[metadata.chapterName]` |
| `workouts_in_chapter_25` | `[metadata.chapterName]` |
| `workouts_in_chapter_50` | `[metadata.chapterName]` |
| `workouts_in_chapter_100` | `[metadata.chapterName]` |

For chapter depth honors specifically: the preview line identifies which chapter the depth was built in. The honor name (e.g., "10 Workouts in a Chapter") communicates the threshold; the preview communicates the place.

#### Longevity

| Honor Type | Preview Line |
|-----------|-------------|
| `longevity_1_year` | "Year 1 of your forge" |
| `longevity_3_years` | "Year 3 of your forge" |
| `longevity_5_years` | "Year 5 of your forge" |
| `longevity_10_years` | "Year 10 of your forge" |

### 8.3 Preview Fallback

If `metadata` is absent or the required metadata field is missing for a metadata-sourced preview line, display:

`"Earned [dateEarned formatted as Month D, YYYY]"`

This fallback uses the earned date as the preview (without the date field separator above it). The goal is to never render a blank or broken preview area.

### 8.4 Preview Truncation

All preview lines are single-line. If the string exceeds the available width:
- Truncate with ellipsis (`...`)
- Applies particularly to athlete-authored strings: `chapterName`, `goalName`, `programName`, `partnerDisplayName`
- Fixed strings (e.g., "50 sessions logged") do not truncate under normal conditions

---

## 9. Empty State

Displayed when the athlete has zero earned honors.

```
┌──────────────────────────────────────────────────┐
│  ‹                    Honors                     │
├──────────────────────────────────────────────────┤
│                                                  │
│                                                  │
│                                                  │
│   Every legacy starts with a foundation.         │  ← Primary line
│                                                  │
│   Keep training and your accomplishments         │  ← Secondary line
│   will be recorded here.                         │
│                                                  │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Copy (exact):**
"Every legacy starts with a foundation.

Keep training and your accomplishments will be recorded here."

**Layout:** Centered vertically and horizontally in the content area. No icon. No CTA. No secondary action.

**What is absent:**
- No icon or trophy imagery
- No "Start Workout" or any action prompt
- No hint at how many honors exist or how to earn them
- No preview of any honor type
- No catalog exposure of any kind
- No "0 HONORS" count label
- No "RECENT HONORS" section label
- No category section headers
- No completion framing ("You're just getting started")

The navigation bar title "Honors" remains.

---

## 10. Loading State

L-10 reads from locally cached HonorInstance data. Under normal conditions (device online, cache warm), L-10 renders immediately from cache with no perceptible loading state.

**Skeleton loading:** If the honor list has not yet been cached (first app launch before sync, cache invalidation), display skeleton loaders:
- Recent Honors area: 3 placeholder card shapes (pulse-animated)
- Category headers: 4–5 placeholder row shapes (pulse-animated)

**Threshold:** Skeleton state becomes visible if load exceeds 1 second. Under 1 second, render synchronously.

**Transition:** Skeleton → populated state is a fade transition, not a jump.

**Performance target:** < 300ms from navigation tap to populated state (warm cache).

---

## 11. Error State

If honor data fails to load (cache miss + network error):

```
  Could not load your honors.
  [Retry]
```

**Copy:** "Could not load your honors."
**Action:** "Retry" — Secondary CTA. Triggers a new load attempt.
**Layout:** Centered vertically and horizontally in the content area.

**Retry behavior:** On tap: display loading skeleton → attempt reload. Success: fade to populated state. Failure: return to error state with retry available.

The navigation bar and back navigation remain functional during error state. The athlete can always leave L-10.

---

## 12. Navigation Rules

| Action | Destination |
|--------|------------|
| Back `‹` | Originating screen (L-1 or P-1) |
| Swipe back (iOS) | Originating screen |
| Category header tap | Expand / collapse category (same screen — no navigation) |
| Honor card tap | L-11 Honor Detail Sheet (passes `HonorInstance.id`) |

### 12.1 L-10 Scroll Position Preservation

L-10 scroll position is preserved when L-11 opens and closes. After L-11 dismissal, the athlete returns to the exact scroll position they were at when they tapped the card.

### 12.2 Category State Preservation

Category expand / collapse state is preserved when L-11 opens and closes. After L-11 dismissal, expanded categories remain expanded.

---

## 13. L-11 Integration

Every honor card in L-10 — in both the Recent Honors section and in expanded category sections — navigates to L-11 Honor Detail Sheet, passing `HonorInstance.id`.

L-11 opens as a bottom sheet overlaid on L-10. L-10 is visible but dimmed beneath the sheet. Dismissal (drag down or tap outside) returns to L-10.

**Division of responsibility:**

| Surface | Content |
|---------|---------|
| L-10 card | Honor name, earned date, one-line preview |
| L-11 sheet | Honor name at headline weight, earned date, chapter attribution (tappable), full generated description |

L-10 cards do not surface L-11 content. L-11 does not need to know how the athlete navigated to it — it receives only `honorId`.

**After L-11 dismissal:**
- Scroll position preserved
- Category expand/collapse state preserved
- Focus returns to the tapped card

---

## 14. HonorInstance Data Requirements

L-10 requires the following fields from each HonorInstance record:

| Field | Used For | Notes |
|-------|---------|-------|
| `id` | L-11 navigation | Passed on card tap |
| `honorType` | Category grouping; catalog ordering; preview line selection | Defines which category and position |
| `displayName` | Honor name on card | Snapshotted at earn time; no catalog lookup |
| `dateEarned` | Sort order (Recent Honors); displayed on card | Never display `awardedAt` |
| `awardedAt` | Tiebreaker within same-session honors | Internal use only; never displayed |
| `metadata.weightDisplay` | Preview for strength milestone honors | Pre-formatted string |
| `metadata.chapterName` | Preview for `first_chapter_sealed`, `workouts_in_chapter_*` | Snapshotted chapter name |
| `metadata.goalName` | Preview for `first_goal_achieved` | Snapshotted goal name |
| `metadata.programName` | Preview for `first_program_graduated` | Snapshotted program name |
| `metadata.partnerDisplayName` | Preview for `first_workout_with_friend` | Snapshotted display name |

**Fields not required by L-10:** `chapterId`, `source`, `schemaVersion`, `metadata.unitSystem`, `metadata.benchPR`, `metadata.squatPR`, `metadata.deadliftPR`, `metadata.goalId`, `metadata.programId`, `metadata.partnerId`.

`awardedAt` is used internally for tiebreaking within the same evaluation transaction. It is never rendered, never formatted, never shown.

---

## 15. Accessibility

| Element | Behavior |
|---------|---------|
| Screen | Announced as "Honors" |
| Recent Honors label | Announced as section heading: "Recent Honors" |
| Category headers | Announced as interactive buttons: "[Category Name], [N] earned, [collapsed / expanded] — double-tap to toggle" |
| Honor cards | Announced as: "[Honor Name], earned [Month D, YYYY] — double-tap for details" |
| Preview lines | Not announced separately; honor name + date are the semantic content for screen readers |
| Chevron `›` | Decorative; not announced |
| Expand indicators ∨ / ∧ | State communicated via category button announcement; indicators themselves not announced |
| Back button | "Back — double-tap to navigate to previous screen" |

**Focus behavior:**
- After L-11 opens and is dismissed, focus returns to the tapped honor card
- After a category header is tapped to expand, focus remains on the header (does not jump to first card)
- Tab / swipe order: Recent Honors cards (top to bottom) → category headers (top to bottom) → within each expanded section: category header, then honor cards within (top to bottom)

**Minimum touch targets:**
- Honor cards: 44pt height minimum
- Category headers: 52pt height minimum (enforced by design)

**List semantics:** Honor card lists within expanded categories use standard list semantics (VoiceOver list / TalkBack list).

---

## 16. Performance Requirements

| Metric | Target |
|--------|--------|
| Time to interactive from navigation tap (warm cache) | < 300ms |
| Skeleton display threshold | > 1,000ms |
| Category expand animation | < 150ms |
| L-11 open animation | Per L-11 spec (standard bottom sheet) |
| Offline rendering | Identical to online; full honor record from local cache |

**No pagination in MVP.** The full HonorInstance record renders in a single scrollable view. Athletes who train for years and earn many chapter depth honors may accumulate 100+ honor instances; the architecture supports this without pagination.

**Local cache requirement:** HonorInstance records must be available in local storage. L-10 must be fully functional offline. A network connection is never required to render the honors record.

---

## 17. Non-Behaviors

L-10 does not and will never:

| Non-Behavior |
|-------------|
| Display unearned honors in any form |
| Display locked, silhouetted, or ghosted honor placeholders |
| Display progress toward unearned honors |
| Display catalog totals ("3 of 12 Strength honors possible") |
| Display completion percentages for any category |
| Display a "X of Y earned" denominator anywhere on screen |
| Display rarity labels on any honor |
| Display honor points, XP, or rank contribution values |
| Display achievement recommendations ("Earn this next") |
| Display "coming soon" or future honor teasers |
| Display placeholder rows for absent categories |
| Display a search bar |
| Display a filter control |
| Display a sort control |
| Allow editing of any honor |
| Allow deletion of any honor |
| Allow hiding of any honor |
| Allow reordering of the list |
| Allow sharing of individual honors (MVP) |
| Display social reactions or comments |
| Display time-since-earned labels ("3 months ago") |
| Pre-expand any category on load |
| Persist category expand / collapse state between visits |

---

## 18. Validation Checklist

### Screen and Navigation
- [ ] Screen accessible from L-1 "View All [N] Honors ›" (only when N ≥ 1)
- [ ] Screen accessible from P-1 "View all ›" (only when N ≥ 1)
- [ ] "View All" links absent on L-1 and P-1 when N = 0
- [ ] Navigation bar title reads "Honors"
- [ ] Back navigation returns to originating screen (L-1 or P-1)
- [ ] Swipe back (iOS) returns to originating screen

### Recent Honors
- [ ] "RECENT HONORS" label visible when N ≥ 1
- [ ] Exactly 5 most recently earned honors displayed (or all honors if N < 5)
- [ ] Sorted by `dateEarned` DESC
- [ ] Same-session tiebreaker by `awardedAt` DESC
- [ ] Recent Honors section absent on empty state
- [ ] All 53 honor types can appear in Recent Honors
- [ ] No placeholders when athlete has 1–4 honors
- [ ] Multiple repeatable honors earned in the same session each appear as separate cards (no deduplication, no grouping)

### Category Sections
- [ ] All 7 display categories present when athlete has earned honors in those categories
- [ ] Category display order: Training → Strength → Goals → Programs → Community → Chapters → Longevity
- [ ] Categories with 0 earned honors are entirely absent from screen
- [ ] All categories start collapsed on every L-10 load
- [ ] Category expand/collapse state not persisted between L-10 visits
- [ ] Multiple categories can be expanded simultaneously
- [ ] Category header tap toggles expansion (∨ ↔ ∧)
- [ ] Category header count [N] reflects earned HonorInstances (not catalog definitions)
- [ ] Repeatable chapter depth honors counted once per earned instance in category count

### Catalog Coverage
- [ ] Training: all 12 types covered and orderable
- [ ] Strength: all 18 types covered (12 Strength + 6 Club) and orderable
- [ ] Goals: all 4 types covered and orderable
- [ ] Programs: all 4 types covered and orderable
- [ ] Community: all 3 types covered and orderable
- [ ] Chapters: all 8 types covered (4 Count + 4 Depth) and orderable
- [ ] Longevity: all 4 types covered and orderable
- [ ] Total: 53 types ✓

### Expanded Category Sort Order
- [ ] Training: workout count family (50→100→250→500→1000) then hours forged family (100→250→500→1000→2500→5000)
- [ ] Strength: bench then squat then deadlift (each 1→2→3→4) then club (lower→higher threshold)
- [ ] Goals: first → 10 → 25 → 50
- [ ] Programs: first → 5 → 10 → 25
- [ ] Community: first → 10 → 50
- [ ] Chapters: Count family (first → 5 → 10 → 25) then Depth family (by chapter chronologically, then threshold within each chapter)
- [ ] Longevity: 1 → 3 → 5 → 10 years
- [ ] Unearned honors not shown — no placeholders, no gaps visible

### Repeatable Chapter Depth Honors
- [ ] `workouts_in_chapter_10` earned in multiple chapters each displays as a separate card
- [ ] Chapter Depth honors sorted: earliest chapter first, then by threshold within each chapter (10→25→50→100)
- [ ] Preview line shows `metadata.chapterName` (snapshotted, not live chapter record)
- [ ] Category count for Chapters includes each depth honor earn separately

### Honor Cards
- [ ] Honor name sourced from `HonorInstance.displayName` (no catalog lookup performed)
- [ ] Date sourced from `HonorInstance.dateEarned` (never `awardedAt`)
- [ ] Date formatted as "Month D, YYYY"
- [ ] Preview line renders correctly for all 53 honor types (see Section 8.2 tables)
- [ ] `metadata.weightDisplay` resolves for strength milestone previews
- [ ] `metadata.chapterName` resolves for chapter honor previews
- [ ] `metadata.goalName` resolves for `first_goal_achieved` preview
- [ ] `metadata.programName` resolves for `first_program_graduated` preview
- [ ] `metadata.partnerDisplayName` resolves for `first_workout_with_friend` preview
- [ ] Fallback preview renders when metadata is missing or absent
- [ ] Preview truncates at 1 line with ellipsis
- [ ] Honor name truncates at 1 line with ellipsis
- [ ] No icon on any card
- [ ] No rarity label on any card
- [ ] No category badge on any card
- [ ] No progress indicator on any card
- [ ] Full card tappable (not just chevron)
- [ ] Card tap → L-11 with correct `HonorInstance.id`

### L-11 Integration
- [ ] L-11 opens as bottom sheet overlay on L-10
- [ ] L-11 receives correct `honorId` on every card tap (Recent Honors and category sections)
- [ ] L-10 scroll position preserved on L-11 dismissal
- [ ] L-10 category expand/collapse state preserved on L-11 dismissal
- [ ] Focus returns to tapped card after L-11 dismissal

### Empty State
- [ ] Empty state displayed when athlete has 0 earned honors
- [ ] Primary copy: "Every legacy starts with a foundation."
- [ ] Secondary copy: "Keep training and your accomplishments will be recorded here."
- [ ] No icon in empty state
- [ ] No CTA in empty state
- [ ] No category headers in empty state
- [ ] No "RECENT HONORS" label in empty state
- [ ] No hint at existing honors or catalog

### Loading and Error States
- [ ] Skeleton loading displays when load exceeds 1 second
- [ ] Skeleton → populated transition is a fade
- [ ] Error state displays "Could not load your honors."
- [ ] "Retry" CTA present in error state
- [ ] Retry triggers a new load attempt
- [ ] Back navigation available in error state

### Non-Behaviors
- [ ] No unearned honor visible anywhere on screen
- [ ] No locked or silhouetted placeholders
- [ ] No "X of Y earned" denominator
- [ ] No catalog total visible anywhere
- [ ] No completion percentage
- [ ] No filter or sort controls
- [ ] No share CTA
- [ ] No honor editing, deletion, or hiding

### Accessibility
- [ ] Screen announced as "Honors"
- [ ] Category headers announced as buttons with expand/collapse state
- [ ] Honor cards announced with name and date
- [ ] Focus returns to tapped card after L-11 dismissal
- [ ] Minimum touch targets: 44pt (cards), 52pt (category headers)
- [ ] Offline rendering identical to online

---

## 19. Closure Record

### Locked Inputs Incorporated

| Decision | Status |
|----------|--------|
| L10-D1 — Honors Hub Philosophy (Recognition + History + Identity) | ✓ |
| L10-D2 — Default Organization (Recent Honors + Category Sections) | ✓ |
| L10-D3 — Unearned Honors Visibility (never shown) | ✓ |
| L10-D4 — Category Ordering (Training → Strength → Goals → Programs → Community → Chapters → Longevity) | ✓ |
| L10-D5 — Expansion Behavior (Recent Honors visible, categories collapsed by default) | ✓ |
| L10-D6 — Recent Honors Count (5, dateEarned DESC) | ✓ |
| L10-D7 — Category Sort Order (catalog progression within each category) | ✓ |
| L10-D8 — Honor Card Density (Name + Date + Preview, tap → L-11) | ✓ |
| L10-D9 — Empty State (exact copy, no hints, no catalog exposure) | ✓ |
| L10-D10 — Category Count Meaning (earned HonorInstances, repeatable count per earn) | ✓ |

### Dependencies Confirmed

| Dependency | Status |
|-----------|--------|
| Honor Catalog v1.0 — 53 types | LOCKED |
| HonorInstance Architecture v1.0 | LOCKED |
| Honor Evaluation Service Architecture v1.0 | LOCKED |
| M-2 Honor Earned Modal v1.1 | LOCKED |
| L-11 Honor Detail Sheet v1.1 | LOCKED |

### Contradictions Found

**None.**

All locked decisions (L10-D1 through L10-D10) are internally consistent and non-contradictory.

**Design note — Club honors merged into Strength:** The Honor Catalog defines Club as a separate family (8th family) and L10-D4 defines 7 display categories. Club honors are merged into the Strength display category in L-10. This is a display decision consistent with L10-D4 (which lists Strength but not Club as a separate category). All 53 honor types are accounted for across the 7 display categories. No catalog types are orphaned.

### Architecture Coverage

| Area | Covered |
|------|---------|
| All 53 honor types categorized and orderable | ✓ |
| Repeatable chapter depth honors handled correctly | ✓ |
| Empty state philosophy (no catalog exposure) | ✓ |
| Category counts = earned HonorInstances only | ✓ |
| Recent Honors = `dateEarned` DESC, limit 5 | ✓ |
| All honor cards navigate to L-11 with `honorId` | ✓ |
| Unearned honors never visible | ✓ |
| Honor names from `displayName` — no catalog lookup | ✓ |
| Dates from `dateEarned` — never `awardedAt` | ✓ |
| Preview lines from snapshotted metadata | ✓ |
| Offline rendering specified | ✓ |

### Downstream Dependencies

- **L-1** must implement "View All [N] Honors ›" → L-10 (only when N ≥ 1). No spec change required — already defined.
- **P-1** must implement "View all ›" → L-10 (only when N ≥ 1). No spec change required — already defined.
- **L-11** receives `honorId` from L-10 card taps. No L-11 changes required.
- **Backend / local cache** must provide HonorInstance records with all fields listed in Section 14. Preview lines for strength milestones require `metadata.weightDisplay`.

---

## 20. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification — full L-10 Honors Hub architecture |
| v1.0.1 | June 2026 | Added §4.6: repeatable honors each display as separate cards in Recent Honors; no deduplication |

---

*L-10 Honors Hub — Wireframe Specification v1.0*
*Forge Legacy | June 2026*
