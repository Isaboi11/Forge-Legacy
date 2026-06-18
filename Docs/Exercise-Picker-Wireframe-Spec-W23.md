# W-23 Exercise Picker
## Wireframe Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Exercise Domain Architecture v1.0 + Amendment 001 (LOCKED), ED-1–ED-6 (LOCKED), W-21 (LOCKED), W-22 (LOCKED), Product DNA (LOCKED)
**Implements:** ED-4 (Context-Aware Behavior — LOCKED), ED-5 (GIF Autoplay Policy — LOCKED), Exercise entity model, Custom Exercise architecture
**Navigated from:** W-24 (Workout Builder), W-9 (Active Workout), future surfaces
**Navigates to:** Caller screen (exercise selected), W-22 (detail sheet above W-23), Custom Exercise creation (sheet above W-23)

---

## 1. Screen Purpose

W-23 Exercise Picker is the task-completion interface for exercise selection in Forge Legacy.

It exists to answer one question: **Which exercise do I need right now?**

The athlete who opens W-23 has already made a decision: they need to add an exercise to a workout or a program slot. W-23's job is to help them find the correct exercise as quickly as possible and return them to what they were doing.

**W-23 is not W-21.** W-21 is a browsing and discovery surface. W-23 is an operational tool. The design prioritizes speed, scan-ability, and selection accuracy over exploration, discovery, and education.

**W-23 is not W-22.** W-22 is an educational destination. W-23 surfaces just enough information to identify an exercise. When an athlete needs more context before committing to a selection, W-23 provides a seamless path to W-22 — without losing their place in W-23.

**What W-23 is:**
- A task-completion screen for exercise selection
- A search interface for the exercise catalog
- A filter interface for narrowing by muscle, equipment, difficulty, and source
- A quick-access surface for Favorites and Recently Used exercises
- An entry point to custom exercise creation
- A gateway to W-22 exercise detail without abandoning the selection task

**What W-23 is not:**
- An educational destination (that is W-22)
- A browsing and discovery surface (that is W-21)
- A workout-building surface (that is W-24)
- A workout-logging surface (that is W-9)
- A general-purpose exercise catalog

**Emotional tone:** Efficient. Purposeful. Confident. Fast.

**The governing test:** At every design decision, ask: *Does this help the athlete find the right exercise quickly?* If the answer is no, the feature does not belong in W-23.

---

## 2. Entry Points

### 2.1 Current Entry Points (MVP)

| Source | Trigger | Context Passed | Expected State |
|--------|---------|---------------|---------------|
| W-24 Workout Builder | "Add Exercise" button on a slot | `WORKOUT_BUILDER`, slot index | Full catalog |
| W-9 Active Workout | "Add Exercise" during active strength session | `ACTIVE_WORKOUT`, `activityType: STRENGTH` | Full catalog |
| W-9 Active Workout | "Replace Exercise" on an existing exercise | `ACTIVE_WORKOUT`, `activityType: STRENGTH`, `replacingExerciseId` | Full catalog |
| W-15 Mobility / Yoga | "Add Exercise" during mobility session | `ACTIVE_WORKOUT`, `activityType: MOBILITY` | Filtered catalog (§ 4.3) |

### 2.2 Future Entry Points (Noted — Not Specced)

| Source | Trigger | Notes |
|--------|---------|-------|
| W-24 Program slot | Slot with no exercise assigned | Opens W-23 with workout-builder context |
| H-1 Quick workout | Ad hoc strength workout start | Opens W-23 to populate exercises before W-9 |

### 2.3 Presentation Mode

W-23 is always presented as a **full-screen modal** — it covers the calling screen entirely. It is not a push navigation. It is not a sheet.

**Rationale:** W-23 needs the full screen for search, filter, browse, and quick-access rows simultaneously. A half-height sheet cannot accommodate all required content. A push navigation does not convey the "task overlay" nature of the picker — the athlete should know they are temporarily leaving their context to find an exercise, and they will return immediately on selection.

The full-screen modal also allows W-22 and Custom Exercise creation to be presented as sheets *above* W-23, creating a clean layered hierarchy: calling screen → W-23 (modal) → W-22 or Custom Create (sheet above modal).

---

## 3. Exit Points

| Destination | Trigger | What Is Returned |
|-------------|---------|-----------------|
| Caller screen | Athlete selects an exercise (row tap, card tap, or "Select" from W-22) | `exerciseId` of the selected exercise |
| Caller screen | Cancel (button or back gesture) | Nothing (nil / null) |
| W-22 Detail Sheet | Tap detail icon on any exercise row | W-22 opens as sheet above W-23; W-23 state fully preserved |

**On exercise selected:** W-23 dismisses immediately. No transition animation delay — dismiss is instant so the athlete returns to their task without waiting.

**On Cancel:** W-23 dismisses. No confirmation dialog required — the athlete has not committed to any action.

**W-22 exit:** Dismissing W-22 (back or sheet drag-to-dismiss) returns the athlete to W-23 at their exact scroll position with their search query, filter state, and section positions all preserved. The athlete may select the exercise from W-22 (§ 16) or return to W-23 without selecting.

---

## 4. Context Architecture

### 4.1 The Context Parameter

W-23 requires a context parameter at launch time. The context governs:
- Which exercises are included in the catalog (scope)
- The header title
- Return behavior on selection

The context is defined by two values:

```
PickerContext {
  source:       'WORKOUT_BUILDER' | 'ACTIVE_WORKOUT' | 'DEFAULT'
  activityType: ActivityType | null   // only populated when source === 'ACTIVE_WORKOUT'
  slotIndex:    number | null         // which workout slot is being filled
  replacingExerciseId: string | null  // set when replacing an existing exercise
}
```

### 4.2 Supported Contexts

| Context Value | Source Screen | Activity Type | Catalog Scope | Header |
|---------------|--------------|--------------|--------------|--------|
| `WORKOUT_BUILDER` | W-24 | null | Full catalog | "Add Exercise" |
| `ACTIVE_WORKOUT` + `STRENGTH` | W-9 | STRENGTH | Full catalog | "Add Exercise" |
| `ACTIVE_WORKOUT` + `HIIT` | W-14 | HIIT | Full catalog | "Add Exercise" |
| `ACTIVE_WORKOUT` + `MOBILITY` | W-15 | MOBILITY | Mobility-filtered catalog (§ 4.3) | "Add Exercise" |
| `ACTIVE_WORKOUT` + `YOGA` | W-15 | YOGA | Mobility-filtered catalog (§ 4.3) | "Add Exercise" |
| `DEFAULT` | Any other | null | Full catalog | "Add Exercise" |

### 4.3 Catalog Scope by Context

**Full catalog:** All active system exercises + all active custom exercises for this athlete. No exclusions beyond `isActive: false`.

**Mobility-filtered catalog:** Exercises where `movementPattern` belongs to the mobility/flexibility/yoga movement pattern set. The specific movement pattern set that qualifies is defined in the Exercise Domain Architecture movement pattern taxonomy. If no taxonomy match is defined for a given exercise, it is excluded from the mobility-filtered catalog. Custom exercises with no movement pattern set are **included** in the mobility-filtered catalog — the athlete created them, they decide if they are appropriate.

**If `activityType` is unrecognized or context is malformed:** Default to full catalog. W-23 must never fail to open due to a context parameter error.

### 4.4 Context Behavior: Replacing an Exercise

When `replacingExerciseId` is set (the athlete is replacing an exercise in an active workout):
- W-23 opens normally with full catalog or filtered catalog per context
- The exercise being replaced is NOT excluded from the picker results — the athlete may re-select the same exercise if they change their mind
- On selection: the exercise previously at that slot is replaced; W-23 passes back the new `exerciseId` to the caller

### 4.5 Context and Filtering Interaction

When the context pre-filters the catalog (Mobility context), this is a hard filter — it is not visible to the athlete as a "filter chip" and cannot be overridden by the athlete's manual filter selections. The athlete's manual filters apply within the context-scoped catalog, not to the full catalog.

Exception: If the athlete creates a custom exercise while in Mobility context, that custom exercise immediately appears in the picker regardless of movement pattern.

---

## 5. Screen Structure

### 5.1 Layout Regions

W-23 has four layout regions, stacked vertically:

```
┌────────────────────────────────────────────────────┐
│  HEADER                                            │
│  [Cancel]    Add Exercise              [⊞ Filter]  │
├────────────────────────────────────────────────────┤
│  SEARCH BAR                                        │
│  [🔍  Search exercises...]                         │
├────────────────────────────────────────────────────┤
│  FILTER CHIPS (conditional — when filters active)  │
│  [Chest ×] [Barbell ×]         [Clear all]         │
├────────────────────────────────────────────────────┤
│                                                    │
│  CONTENT AREA (scrollable)                         │
│                                                    │
│  [Default view — when no search, no filters]       │
│    MY EXERCISES  (§ 7, § 8)                        │
│    ALL EXERCISES (§ 9)                             │
│                                                    │
│  [Search results — when search is active]          │
│    Flat ranked list of exercise rows (§ 10)        │
│                                                    │
│  [Filtered results — when filters, no search]      │
│    Flat filtered list of exercise rows (§ 11)      │
│                                                    │
│  [Combined — search + filters both active]         │
│    Flat ranked + filtered list (§ 11.5)            │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 5.2 Header

```
[Cancel]         Add Exercise            [⊞ Filter]
```

- **Cancel button:** Left-aligned, 44pt touch target, primary text color. Tap → dismiss W-23 with no selection.
- **Title:** "Add Exercise" — centered, 17sp, primary weight.
- **Filter button:** Right-aligned, 44pt touch target. Filter icon + "Filter" label. When one or more filters are active: "Filter (N)" where N = number of active filter selections across all categories.
- **No back arrow:** The Cancel button is always the dismiss mechanism. The title never collapses to an exercise name (unlike W-22). The header never changes.

### 5.3 Search Bar

```
[🔍  Search exercises...]
```

- Full-width input, below the header, always visible
- Placeholder: "Search exercises..."
- Search icon (🔍) as leading decoration in the input
- Clear icon (×) appears at trailing end when the field has content — tap to clear
- **Does NOT auto-focus on W-23 open.** The keyboard does not appear automatically. Rationale: many athletes open W-23 to tap a Favorite or Recently Used exercise without typing. Auto-focus would occlude the quick-access rows and force the athlete to dismiss the keyboard first.
- **Does auto-focus when W-23 is opened with no Favorites and no Recents.** In this state, search is the only useful first action.

### 5.4 Filter Chips (Conditional)

Visible only when one or more filters are active. Appears below the search bar as a horizontally scrollable chip row.

Each active filter dimension is shown as one chip: "[Filter Value] ×". The × dismisses that individual filter value.

"Clear all" link at the trailing end of the chip row. Tap → removes all active filters and the chip row disappears.

---

## 6. Default View (No Search, No Filters)

When no search query is entered and no filters are active, the content area shows the default view in this order:

```
─────────────────────────────────────────
MY EXERCISES

Favorites ›
[Bench Press] [Squat] [OHP]  [Romanian DL] →

Recently Used ›
[Bench Press] [Dumbbell Row] [OHP]          →

─────────────────────────────────────────
ALL EXERCISES

  Push (Upper Body)      12 exercises  ›
  Pull (Upper Body)       9 exercises  ›
  Legs & Glutes          18 exercises  ›
  Hinge                   6 exercises  ›
  Core & Stability        8 exercises  ›
  Carry & Full Body       5 exercises  ›
  Mobility & Flexibility  9 exercises  ›

─────────────────────────────────────────
[+ Create Custom Exercise]
```

**MY EXERCISES** appears only when the athlete has at least one Favorite OR at least one Recently Used exercise. If neither exists, the MY EXERCISES section is absent and the content area begins with ALL EXERCISES.

**ALL EXERCISES** section header is not tappable. It is a label only.

**Category rows** in ALL EXERCISES are tappable (§ 9).

**Create Custom Exercise** is always at the bottom of the default view (§ 15).

---

## 7. Favorites

### 7.1 Display Model

Favorites are displayed as a horizontal scroll row of compact exercise cards immediately after the "MY EXERCISES" section label.

```
Favorites                                             ›
[Bench    ] [Squat    ] [OHP      ] [Romanian ] →
[Press    ] [         ] [         ] [DL       ]
```

Section label "Favorites" is left-aligned, 13sp, secondary muted text. The "›" at the trailing end navigates to a full-screen see-all view within W-23 (W-23-Favorites — not W-21).

**Compact exercise card anatomy:**

```
┌──────────────┐
│              │
│  [56×56 img] │  ← gifThumbnailUrl, static (ED-5: no autoplay in W-23)
│              │
│  Bench Press │  ← 12sp, primary weight, max 2 lines, center-aligned
│              │
└──────────────┘
```

- Card width: ~88pt
- Thumbnail: 56pt × 56pt, rounded corners 6pt
- Exercise name: 12sp, 2-line max
- No muscle chips on compact card — space does not allow it
- No favorite icon — all cards in Favorites row are already favorites
- No custom indicator — identified if needed in W-22

### 7.2 Tap Behavior

**Full card tap → immediately selects the exercise and returns to caller.** No confirmation. No secondary step. This is the fastest possible selection path.

Because Favorites cards have no detail affordance, if the athlete needs W-22 detail they must use the exercise row view (from Browse or Search) which includes the detail icon. The Favorites row is for fast re-selection of known exercises.

### 7.3 Favorites Count Display

Maximum visible without scrolling: 3.5 cards (the half-visible card signals more content to the right).

If the athlete has no Favorites: the Favorites row is entirely absent from the default view (not shown as empty). No "You have no Favorites yet" placeholder.

### 7.4 See All Favorites

"Favorites ›" row header tap → navigates to a full-screen list view within W-23 showing all Favorites as exercise rows (full row anatomy per § 10, with detail icon). Header becomes "Favorites" with a back arrow returning to the default W-23 view.

---

## 8. Recently Used

### 8.1 Display Model

Recently Used follows Favorites (or appears first if no Favorites). Same horizontal scroll compact card format.

```
Recently Used                                         ›
[Bench    ] [Dumbbell ] [OHP      ] [Deadlift ] →
[Press    ] [Row      ] [         ] [         ]
```

### 8.2 Ordering

Recently Used exercises are ordered by **most recently selected in W-23** (the last time the athlete selected this exercise from the picker). This is distinct from W-21 Recently Used which is ordered by session history.

Rationale: W-23 is a task-completion context. The athlete most often needs the exercise they last added, not the exercise they did most recently in a workout. Recent picker selections are a more accurate proxy for "what I'll need next."

Maximum exercises shown in Recently Used: 8. Scroll reveals additional entries. The row shows up to 3.5 cards before scrolling.

### 8.3 Context Interaction with Recently Used

When the context filters the catalog (Mobility context), exercises in Recently Used that are outside the filtered catalog are hidden from the Recently Used row. Only context-compatible exercises appear.

### 8.4 Deduplication

If an exercise appears in both Favorites and Recently Used, it appears in both rows. No deduplication between sections. The athlete may find the same exercise via their faster path.

### 8.5 Tap Behavior

Full card tap → immediately selects the exercise and returns to caller. Same as Favorites (§ 7.2).

---

## 9. Browse Categories

### 9.1 Display Model

ALL EXERCISES section shows a vertical list of movement categories matching the W-21 BROWSE tab categories.

```
ALL EXERCISES

  Push (Upper Body)      12 exercises  ›
  Pull (Upper Body)       9 exercises  ›
  Legs & Glutes          18 exercises  ›
  Hinge                   6 exercises  ›
  Core & Stability        8 exercises  ›
  Carry & Full Body       5 exercises  ›
  Mobility & Flexibility  9 exercises  ›
```

- Category label: 15sp, primary text
- Exercise count: 13sp, muted text, right-aligned
- Chevron ›: trailing
- Row height: 52pt (comfortable tap target)
- No separator lines between rows — rely on spacing

### 9.2 Category Tap Behavior

Tapping a category applies an implicit category filter and shows all exercises in that category as a scrollable list of exercise rows (full row anatomy, § 10).

The transition:
- MY EXERCISES section disappears
- ALL EXERCISES section disappears
- Filter chips area shows: [Push (Upper Body) ×]
- Exercise rows fill the content area

The "Push (Upper Body) ×" chip dismisses the category filter and returns the athlete to the default view.

This is treated as a filter chip (not a navigation) — the header remains "Add Exercise" with Cancel. No back arrow in the header. The back behavior is handled by the "×" on the category chip.

### 9.3 Category Exercise Count

Exercise counts reflect the context-filtered catalog. If the athlete is in Mobility context, "Push (Upper Body)" may show 0 exercises and would be absent from the list.

Categories with 0 exercises in the current context are not shown.

---

## 10. Exercise Row Anatomy

### 10.1 Purpose

The exercise row is the primary content unit in W-23 search results, filtered results, browse category results, and the "see all" favorites view. It contains enough information to confidently identify an exercise and take one of three actions: select, favorite, or view detail.

### 10.2 Row Layout

```
┌──────────────────────────────────────────────────────┐
│ [img ] Exercise Name                      [♡]  [ⓘ]  │
│        [Chest] [Triceps]                            │
└──────────────────────────────────────────────────────┘
```

- **Thumbnail:** 48pt × 48pt, rounded corners 4pt, static gifThumbnailUrl. If null: dark placeholder with exercise name initial, 16sp, warm muted text.
- **Exercise Name:** 15sp, primary weight, leading text. Single line preferred; wraps to 2 lines max for long names.
- **Primary Muscle Chips:** 11sp, max 2 chips. If more than 2 primary muscles exist, first 1 is named + "[+N]" condensed chip. Muted filled chips (lighter than W-22 filled chips — compact context).
- **Favorite icon (♡/♥):** 24pt icon, 44pt × 44pt touch target. Outline = not favorited (muted). Filled warm accent = favorited. Tap → toggle favorite. Does NOT trigger row selection.
- **Detail icon (ⓘ):** 24pt icon, 44pt × 44pt touch target. Opens W-22 as a sheet above W-23. Does NOT trigger row selection.
- **Row height:** 72pt minimum (accommodates name + 1 chip line + padding).

### 10.3 Tap Zones

| Tap Zone | Action |
|----------|--------|
| Row body (thumbnail, name, chips) | Select exercise → returns exerciseId to caller, W-23 dismisses |
| Favorite icon | Toggle favorite state (no navigation) |
| Detail icon | Open W-22 detail sheet above W-23 (no selection, no navigation from W-23) |

### 10.4 Custom Exercise Indicator

Custom exercises show a "Custom" label below the exercise name:

```
┌──────────────────────────────────────────────────────┐
│ [img ] My Custom Exercise                 [♡]  [ⓘ]  │
│        Custom   [Chest] [Triceps]                    │
└──────────────────────────────────────────────────────┘
```

- "Custom" label: 11sp, muted secondary text, appears as first element in the chips row before muscle chips
- No icon, no badge — the text label is sufficient

### 10.5 Difficulty — Not Displayed in Row

Per W22-D15 (LOCKED): equipment is the primary actionable signal; difficulty is supporting context. In W-23's compact row, neither equipment nor difficulty is displayed inline — these are selection criteria handled by filters (§ 14), not row attributes. The athlete identifies an exercise by name and muscles; they filter by equipment and difficulty before or while scanning.

### 10.6 GIF Thumbnail Policy

Per ED-5 (LOCKED): GIFs do NOT autoplay in W-23. The thumbnail (`gifThumbnailUrl`) is shown as a static image. GIF autoplay is exclusively a W-22 behavior.

---

## 11. Search Architecture

### 11.1 Primary Interaction Model

Search is the primary interaction for athletes who know what they are looking for. The search bar is always visible (§ 5.3). No tap required to reach search — the bar is immediately accessible.

As the athlete types, results update in real-time (debounced at 150ms to avoid excessive computation during fast typing). There is no "Search" button. Results are always live.

### 11.2 Query Scope

A search query runs against the following exercise fields, in priority order:

| Field | Match Weight | Notes |
|-------|-------------|-------|
| `name` — exact match | Highest | "Bench Press" finds Bench Press immediately |
| `name` — prefix match | High | "Bench" finds Bench Press, Bench Row, etc. |
| `name` — contains match | Medium | "Press" finds Bench Press, Overhead Press, Incline Press |
| `primaryMuscles` | Low | "Chest" finds all exercises targeting chest |
| `equipment` | Low | "Barbell" finds all barbell exercises |
| `tags` (if present) | Low | General keyword matching |

**Case-insensitive. Whitespace-trimmed. Special characters normalized.**

### 11.3 Result Ranking

Results are sorted by:
1. Match weight (exact name > prefix name > contains name > muscle > equipment)
2. Within the same weight tier: exercises with `isFavorite: true` ranked first
3. Within favorites/non-favorites at the same weight: recently used exercises ranked first
4. Remaining exercises: alphabetical by name

### 11.4 Custom Exercises in Search

Custom exercises are included in search results when the query matches their name. They compete on match quality equally with system exercises. Custom exercises are identified by the "Custom" label in the row (§ 10.4).

### 11.5 Search + Filters Combined

When both a search query and filters are active:
1. Apply context-scope filter first (Mobility context if applicable)
2. Apply athlete's manual filters
3. Run search query against the filtered set
4. Rank results per § 11.3

Search operates within the filtered set. It does not override filters.

### 11.6 Empty Search State

When the search query returns no results:

```
─────────────────────────────────────────
No exercises found for "[query]"

[+ Create "[query]" as a custom exercise]

Clear search
```

- "Create '[query]' as a custom exercise": Pre-fills the exercise name in the custom exercise creation sheet with the search query text. (§ 15)
- "Clear search": Tapping clears the search bar and returns to the default view or filtered view.
- No image, no illustration — brief, direct.

### 11.7 Partial Results (Fuzzy Matching)

W-23 does NOT implement fuzzy matching in V1.0. Typos return empty results. The empty state (§ 11.6) and the "Create Custom" option handle the case where the athlete can't find what they're looking for. Fuzzy matching is a V1.1 enhancement.

---

## 12. Favorites (Reference)

*(See § 7 for complete Favorites specification.)*

The see-all Favorites view within W-23 uses the full exercise row anatomy (§ 10) with detail icon. All behaviors (selection, detail, favorite toggle) apply identically.

---

## 13. Recently Used (Reference)

*(See § 8 for complete Recently Used specification.)*

---

## 14. Filters

### 14.1 Filter Entry

The Filter button in the W-23 header (§ 5.2) opens the Filter Sheet — a bottom sheet, ~72% of screen height, non-expandable.

```
┌──────────────────────────────────────────────┐
│  Filter Exercises               [Reset All]  │
├──────────────────────────────────────────────┤
│                                              │
│  MUSCLE GROUP                                │
│  [Chest] [Back] [Shoulders] [Arms]           │
│  [Legs] [Core] [Full Body]                   │
│                                              │
│  EQUIPMENT                                   │
│  [Barbell] [Dumbbell] [Bodyweight]           │
│  [Cable] [Machine] [Kettlebell]              │
│  [Resistance Band] [Pull-up Bar]             │
│                                              │
│  DIFFICULTY                                  │
│  [Beginner] [Intermediate] [Advanced]        │
│                                              │
│  SOURCE                                      │
│  [All] [System] [Custom] [Favorites]         │
│                                              │
│         ────────────────────────             │
│              [ Apply Filters ]               │
└──────────────────────────────────────────────┘
```

### 14.2 Filter Categories

| Category | Values | Selection Mode |
|----------|--------|---------------|
| Muscle Group | All muscle groups in the catalog | Multi-select |
| Equipment | All equipment tags in the catalog | Multi-select |
| Difficulty | Beginner, Intermediate, Advanced | Multi-select |
| Source | All, System Only, Custom Only, Favorites | Single-select (mutually exclusive) |

**Source "Favorites":** Shows only exercises the athlete has favorited. This replaces the need for a separate "search within favorites" toggle.

**Source "All":** Default. No source filter applied.

### 14.3 Filter Logic

Filters within a category are combined with OR logic.
Filters across categories are combined with AND logic.

Example: Muscle Group = [Chest, Shoulders] AND Equipment = [Barbell] AND Difficulty = [Intermediate] returns exercises that target Chest OR Shoulders, AND require a Barbell, AND are rated Intermediate.

### 14.4 Apply Button

Filters are applied via an explicit "Apply Filters" primary CTA at the bottom of the filter sheet. The sheet dismisses and results update immediately.

**Rationale for explicit Apply vs. live update:** Exercise picker results should not flicker as the athlete selects multiple filter options in sequence. The Apply model lets the athlete compose a complete filter set before seeing results.

### 14.5 Reset

- **Reset All** (in filter sheet header): Clears all filter selections without dismissing the sheet. The athlete can re-select options before applying.
- **Individual × chips** (in the main W-23 filter chips row): Removes a single filter dimension. Remaining filters stay active.
- **"Clear all"** (in the main W-23 filter chips row): Removes all active filters and dismisses the chip row.

### 14.6 Filter Persistence

Filters **do NOT persist** between W-23 sessions. When W-23 is dismissed (by selection or Cancel), all filter state is cleared. The next W-23 open begins with no filters.

**Exception:** Context-based filters (Mobility catalog scope, § 4.3) are always applied and cannot be cleared.

### 14.7 Filter + Search Interaction

When filters are active and the athlete begins typing in the search bar, the search runs within the filtered result set (§ 11.5). Filter chips remain visible. Clearing the search returns to the filtered browse view.

---

## 15. Create Custom Exercise

### 15.1 Entry Points from W-23

1. **"Create Custom Exercise" at the bottom of the default view** (always accessible, § 6)
2. **"Create '[query]' as a custom exercise" in the empty search state** (§ 11.6, pre-fills the name field)

### 15.2 Presentation

Custom Exercise creation opens as a **sheet modal above W-23** — not a new navigation, not W-23 being replaced. W-23 remains behind the sheet in its current state.

The sheet is ~85% screen height, non-expandable. It has its own navigation chrome:

```
[Cancel]    New Exercise             [Save]
─────────────────────────────────────────
Exercise Name *
[__________________________________]

Muscle Groups (optional)
[Chest] [Back] [Shoulders] [Arms]
[Legs] [Core]

Equipment (optional)
[Barbell] [Dumbbell] [Bodyweight]
[Cable] [Machine] [Kettlebell]

Photo (optional)
[+ Add Photo]
```

### 15.3 Required Fields

- **Exercise Name:** Required. Minimum 1 non-whitespace character. Maximum 60 characters.
- All other fields are optional.

### 15.4 Save Validation

The "Save" button is disabled until Exercise Name has at least 1 non-whitespace character.

On Save:
1. Custom exercise is created and added to the athlete's catalog
2. Sheet dismisses
3. The new exercise is immediately **selected and returned to the caller** — W-23 also dismisses
4. The athlete is back in their task context with the new exercise already selected

**Rationale for auto-select on create:** The athlete created this exercise specifically because they needed it right now. Auto-selecting it saves a redundant step. If they change their mind, the caller can handle de-selection.

### 15.5 Cancel from Custom Create Sheet

Cancel → sheet dismisses. W-23 is visible in its prior state. No exercise is created. The athlete may continue browsing/searching.

### 15.6 Duplicate Name Handling

If the athlete enters a name that exactly matches an existing custom exercise (case-insensitive), a warning appears inline below the name field:

```
An exercise named "My Exercise" already exists.
```

The warning is informational only — the Save button remains active. The athlete may create a duplicate-named custom exercise if they choose.

### 15.7 Alignment with Locked Custom Exercise Architecture

Custom exercises are first-class entities (ED-3, LOCKED). The creation form in W-23 creates a full custom exercise entity — the simplified form (name + optional fields) produces the same entity model as any other custom exercise. Fields not provided at creation are set to null and may be expanded in W-22 (future custom exercise editing, V1.1+).

---

## 16. W-22 Integration

### 16.1 Opening W-22 from W-23

Tapping the detail icon (ⓘ) on any exercise row in W-23 opens W-22 as a **sheet modal above W-23**.

- W-23 remains fully intact behind the sheet
- W-23 scroll position is preserved
- W-23 search query is preserved
- W-23 filter state is preserved
- W-22 displays the exercise detail exactly as specified (W-22 spec, all sections)
- GIF autoplays in the W-22 sheet (ED-5: autoplay in W-22 regardless of entry point)

The W-22 sheet height: full-screen sheet (covers W-23 entirely). W-22 needs full height for its content.

### 16.2 "Select This Exercise" CTA in W-22 (W-23 Context)

When W-22 is opened from W-23 context, a **"Select This Exercise"** Primary CTA is injected at the bottom of the W-22 scroll content, below the ALTERNATIVES section.

```
─────────────────────────────────────────
[        Select This Exercise           ]  ← Primary CTA
```

- This CTA appears ONLY when W-22 is opened from W-23. It is not visible when W-22 is opened from W-21 or any other surface.
- Tap: selects the exercise, dismisses W-22, dismisses W-23, returns exerciseId to caller.
- Sticky behavior: "Select This Exercise" is sticky at the bottom of the screen — it remains visible as the athlete scrolls through W-22 content.

**Rationale:** The athlete may need to read instructions, coaching cues, or alternatives before committing to a selection. Presenting the "Select" action within W-22 closes the loop: learn → select, without navigating back to the list.

### 16.3 Favorites in W-22 (W-23 Context)

The Favorite icon in the W-22 header is active when W-22 is opened from W-23. The athlete may favorite an exercise from within the W-22 sheet. Favorite state changes in W-22 are immediately reflected in the W-23 rows behind the sheet.

### 16.4 Alternatives in W-22 (W-23 Context)

The ALTERNATIVES row in W-22 is fully functional when W-22 is opened from W-23. Tapping an alternative exercise card navigates to W-22 for that alternative — stacked above the first W-22 sheet.

The athlete may navigate through alternatives (W-22 A → W-22 B → W-22 C) via the alternatives row. Each alternative W-22 shows its own "Select This Exercise" CTA.

The navigation stack for this scenario:
```
Caller screen (W-24 or W-9)
  └─ W-23 [modal]
       └─ W-22 A [sheet]
            └─ W-22 B [sheet — via alternative]
```

Back from W-22 B → W-22 A. Back from W-22 A → W-23 (fully restored). "Select This Exercise" at any level → selects that exercise and clears the entire W-22 stack + dismisses W-23 + returns to caller.

### 16.5 Dismissing W-22 Without Selecting

The athlete may back out of W-22 without selecting the exercise. Back gesture or back button in W-22 → sheet dismisses → W-23 restored at exact prior state. No exercise is selected.

---

## 17. Empty States

### 17.1 No Favorites, No Recents (Default View)

MY EXERCISES section is absent. Content area begins with ALL EXERCISES category list. No placeholder or "You have no favorites" message.

### 17.2 No Favorites Only

Favorites row absent from MY EXERCISES. Recently Used row present if it has content.

### 17.3 No Recents Only

Recently Used row absent from MY EXERCISES. Favorites row present if it has content.

### 17.4 Search Returns No Results

Per § 11.6:
```
No exercises found for "[query]"

[+ Create "[query]" as a custom exercise]

Clear search
```

### 17.5 Filter Returns No Results

```
No exercises match these filters.

[Clear all filters]
```

No illustration. No secondary suggestions. The clear action is the next logical step.

### 17.6 Category Contains No Exercises

If the athlete taps a category (§ 9) that has no exercises in the current context:

```
No exercises in this category.

[Browse all exercises]
```

This state is unusual (categories with 0 exercises should not appear in the list — § 9.3). If it occurs due to a context filter edge case, this is the fallback.

### 17.7 Full Catalog Empty (Extreme Edge Case)

If both the system exercise catalog and the athlete's custom exercises are empty:

```
No exercises available.

[+ Create a custom exercise]
```

This state is a safety fallback only.

### 17.8 See-All Favorites Empty

If the athlete navigates to the See All Favorites view (§ 7.4) but has no Favorites:

```
No favorites yet.

Tap ♡ on any exercise to add it here.
```

---

## 18. Loading States

### 18.1 Initial W-23 Open

On W-23 presentation:

```
[Cancel]    Add Exercise            [Filter]
[Search bar]
─────────────────────────────────────────

MY EXERCISES

Favorites
[████████] [████████] [████████]          ← skeleton cards

Recently Used
[████████] [████████] [████████]

─────────────────────────────────────────

ALL EXERCISES

  [████████████████]    [██] exercises  ›
  [████████████████]    [██] exercises  ›
  [████████████████]    [██] exercises  ›
```

- Skeleton shimmer for cards and rows
- Header visible immediately (Cancel, title, Filter button — no data required)
- Search bar active immediately even during load (the athlete can begin typing before results load)
- If W-23 exercises are cached from W-21 or a prior W-23 session: suppress skeleton entirely, render instantly

### 18.2 Search Results Loading

When the athlete types a query that requires a server search (uncached query):
- Existing content fades to 50% opacity briefly
- Skeleton rows appear below the search bar
- Results replace skeleton on arrival
- If results arrive in < 100ms: suppress skeleton entirely (no flash)

For cached queries (the exercise catalog is typically fully cached after W-21 is opened): search results are instant. The search is a local filter operation, not a server request.

### 18.3 Filter Apply Loading

On "Apply Filters" tap:
- Sheet dismisses
- Filter chips appear
- Brief skeleton shimmer in the results area
- Results populate (typically instant from local filter)

### 18.4 Custom Exercise Creation

On "Save" tap in the custom exercise creation sheet:
- Save button enters loading state (spinner replaces button text)
- Sheet input is disabled (prevents duplicate submission)
- On success: sheet dismisses, W-23 dismisses, caller receives new exerciseId
- On error: error message appears inline above the Save button, inputs re-enable

### 18.5 Reduce Motion

All shimmer animations are replaced with static muted placeholders. No crossfades. Instant transitions.

---

## 19. Offline Behavior

### 19.1 Cached Exercise Catalog

If the exercise catalog is cached (athlete has previously opened W-21 or W-23 on this device):
- W-23 opens and operates fully offline
- All search, filter, browse, and selection functions work normally
- Favorite state changes are stored locally and synced on reconnect
- No offline indicator shown — the experience is seamless

### 19.2 Uncached Catalog (Full Offline)

If the exercise catalog is not cached and the device is offline:

```
[Cancel]    Add Exercise            [Filter]
[Search bar]
─────────────────────────────────────────

  ⚠  Exercise catalog unavailable offline.
     Connect to load exercises.

  (Custom exercises, if any)
  MY EXERCISES
  [Custom exercises are locally stored — shown if any exist]

  [+ Create Custom Exercise]
```

The athlete can still:
- View and select their custom exercises (stored locally)
- Create a new custom exercise (stored locally, syncs later)
- Cancel

The athlete cannot:
- Browse or search system exercises
- View Favorites or Recents for system exercises (if they are not locally cached)

### 19.3 Partial Offline (Catalog Cached, Writes Offline)

Favorite toggles and custom exercise creation work offline. Changes queue for sync.

### 19.4 W-22 from W-23 While Offline

If the athlete taps the detail icon on an exercise while offline:
- If W-22 for that exercise is cached: W-22 opens fully (per W-22 offline behavior)
- If W-22 is not cached: W-22 opens in offline degraded state (per W-22 § 16.2)
- "Select This Exercise" CTA remains functional in both cases

---

## 20. Accessibility

### 20.1 Touch Targets

| Element | Minimum |
|---------|---------|
| Cancel button | 44pt |
| Filter button | 44pt |
| Search bar | 44pt height |
| Exercise row (body) | 44pt height (row is 72pt, exceeds minimum) |
| Favorite icon | 44pt × 44pt touch target |
| Detail icon | 44pt × 44pt touch target |
| Compact Favorites/Recents card | 48pt height |
| Category row | 52pt height |
| Filter chip | 44pt height |
| Create Custom CTA | 44pt height |

### 20.2 Screen Reader Labels

| Element | Accessible Label |
|---------|----------------|
| Cancel button | "Cancel, closes exercise picker" |
| Filter button (no active filters) | "Filter exercises" |
| Filter button (filters active) | "Filter exercises, [N] filters active" |
| Search bar | "Search exercises" |
| Search bar clear button | "Clear search" |
| Favorites section | "Favorites, [N] exercises" |
| Recents section | "Recently used, [N] exercises" |
| Compact card | "[Exercise Name], double-tap to select" |
| Exercise row (body) | "[Exercise Name], [Primary Muscles], double-tap to select" |
| Favorite icon (unfavorited) | "Add [Exercise Name] to Favorites" |
| Favorite icon (favorited) | "Remove [Exercise Name] from Favorites" |
| Detail icon | "View [Exercise Name] detail" |
| Custom exercise row | "[Exercise Name], Custom exercise, [Primary Muscles], double-tap to select" |
| Category row | "[Category Name], [N] exercises, double-tap to browse" |
| Category chip × | "Remove [Category Name] filter" |
| Filter chip × | "Remove [Value] filter" |
| "Clear all" | "Clear all filters" |
| Create Custom Exercise | "Create a custom exercise" |
| "Select This Exercise" (in W-22 sheet) | "Select [Exercise Name] and return to workout" |

### 20.3 Focus Order

When W-23 opens:
1. Cancel button
2. Filter button
3. Search bar
4. Favorites section label (if present)
5. Favorites cards (left to right)
6. Recents section label (if present)
7. Recently used cards (left to right)
8. Category rows (top to bottom)
9. Create Custom Exercise

When search results are shown:
1. Cancel
2. Filter button
3. Search bar (focused, with text)
4. Exercise rows (top to bottom, each row: body → favorite → detail)

### 20.4 Search Accessibility

- Screen reader announces result count when search results update: "[N] exercises found" (announced once after debounce settles, not on every keystroke)
- Empty state: "No exercises found for [query]" announced when it appears
- Filter chips announced as a group: "[N] filters active: [Chest], [Barbell]"

### 20.5 Reduce Motion and Accessibility Settings

- No shimmer animations
- No crossfades on search result updates — content replaces instantly
- Favorite state toggle: no animation
- Sheet presentations: instant (no slide animation)
- The auto-focus exception (§ 5.3 — fires when both Favorites and Recents are empty) respects system accessibility settings that suppress automatic software keyboard presentation. When such settings are active, W-23 opens with the search bar visible but not focused regardless of Favorites/Recents state.

---

## 21. Navigation Specification

### 21.1 W-23 Entry Navigation

W-23 is presented as a full-screen modal. Standard modal presentation transition (slides up from bottom on iOS, full-screen overlay on Android). The calling screen is visible beneath the animation during the entry transition.

### 21.2 Navigation Matrix

| Current State | Action | Result |
|---------------|--------|--------|
| W-23 (any) | Cancel button | W-23 dismisses, caller receives nil |
| W-23 (any) | Back gesture | Same as Cancel |
| W-23 row/card | Tap body | W-23 dismisses, caller receives exerciseId |
| W-23 row | Tap favorite icon | Favorite toggled, no navigation |
| W-23 row | Tap detail icon | W-22 sheet opens above W-23 |
| W-23 Favorites › | Tap section header | See-all Favorites view opens within W-23 (header changes to "Favorites" + back arrow) |
| W-23 Recents › | Tap section header | See-all Recents view opens within W-23 (header changes to "Recently Used" + back arrow) |
| W-23 see-all view | Back arrow | Returns to W-23 default view |
| W-23 Category row | Tap | Category filter chip applied, exercise list fills content area |
| W-23 Category chip × | Tap | Category filter removed, default view restored |
| W-23 "Create Custom Exercise" | Tap | Custom exercise creation sheet opens above W-23 |
| Custom Create sheet | Save | New exercise created + selected, W-23 dismisses, caller receives new exerciseId |
| Custom Create sheet | Cancel | Sheet dismisses, W-23 restored |
| W-22 sheet (from detail icon) | "Select This Exercise" | W-22 + W-23 dismiss, caller receives exerciseId |
| W-22 sheet (from detail icon) | Back / dismiss gesture | W-22 sheet dismisses, W-23 restored |
| W-22 sheet | Alternative card tap | W-22 B sheet opens above W-22 A |
| W-22 B sheet | "Select This Exercise" | All W-22 sheets + W-23 dismiss, caller receives exerciseId |
| W-22 B sheet | Back | W-22 B dismisses, W-22 A visible |

### 21.3 Header State Changes

| View | Header Left | Header Title | Header Right |
|------|-------------|-------------|-------------|
| Default / Search / Filtered | "Cancel" | "Add Exercise" | "Filter" / "Filter (N)" |
| See-All Favorites | ← (back arrow) | "Favorites" | "Filter" |
| See-All Recents | ← (back arrow) | "Recently Used" | "Filter" |

The Filter button is always present in the W-23 header regardless of view state.

### 21.4 No Bottom Tab Bar

The bottom tab bar is not visible while W-23 is open. W-23 is a full-screen modal overlay — it covers the entire screen including the tab bar.

---

## 22. Non-Behaviors

W-23 does not and will never:

| Non-Behavior |
|-------------|
| Autoplay GIF animations in exercise rows, cards, or any W-23 surface (ED-5: GIF autoplay only in W-22 hero) |
| Build workouts or program slots (that is W-24) |
| Log sets, reps, or weights (that is W-9) |
| Teach exercises as its primary purpose (that is W-22) |
| Browse exercises for exploration or discovery (that is W-21) |
| Persist filter state between W-23 sessions |
| Persist search query between W-23 sessions |
| Allow editing of exercise content (system exercises are read-only; custom exercise editing is a future feature) |
| Allow deletion of exercises (system or custom) |
| Show performance history, PRs, or training analytics for exercises |
| Show which chapter, program, or workout contained an exercise (no "Used In" data) |
| Create timeline entries, honors, chapter events, or legacy data |
| Suggest exercises based on the athlete's history or goals |
| Rank exercises based on popularity or community data |
| Show how many athletes use a given exercise |
| Support multi-selection in V1.0 (one exercise returned per picker session) |
| Navigate to W-21 or any tab navigation from within W-23 (W-23 is a modal; it always returns to its caller) |
| Show or modify rank data |
| Display exercise feedback, ratings, or community comments |
| Apply context-based pre-filters visually as athlete-dismissable filter chips |
| Override the locked context-based catalog scope via athlete filter actions |

---

## 23. Validation Checklist

### Modal Behavior
- [ ] W-23 presents as full-screen modal (not push navigation)
- [ ] Cancel dismisses W-23 with no selection
- [ ] Back gesture behaves identically to Cancel
- [ ] Exercise selection dismisses W-23 and returns exerciseId to caller
- [ ] Tab bar not visible while W-23 is open

### Context Architecture
- [ ] `WORKOUT_BUILDER` context: full catalog shown
- [ ] `ACTIVE_WORKOUT` + STRENGTH: full catalog shown
- [ ] `ACTIVE_WORKOUT` + MOBILITY: mobility-filtered catalog shown
- [ ] Unknown or malformed context: full catalog shown (safe fallback)
- [ ] `replacingExerciseId` set: exercise being replaced is included in results (not excluded)
- [ ] Context-based filters: not visible as dismissable chips, not overridable by athlete

### Screen Structure
- [ ] Header: Cancel (left), "Add Exercise" (center), Filter button (right) — always present
- [ ] Filter button shows "(N)" count when N > 0 filters active
- [ ] Search bar always visible, not auto-focused on open (exception: no Favorites, no Recents)
- [ ] Auto-focus exception respects system accessibility settings that suppress keyboard presentation
- [ ] Filter chips row appears only when filters are active
- [ ] Individual × on filter chips dismisses that filter
- [ ] "Clear all" dismisses all filters

### Default View
- [ ] MY EXERCISES absent when no Favorites and no Recents
- [ ] Favorites row absent when athlete has no Favorites
- [ ] Recents row absent when athlete has no Recents
- [ ] ALL EXERCISES category list shown always
- [ ] Create Custom Exercise at bottom of default view
- [ ] Categories with 0 exercises in current context are absent

### Favorites
- [ ] Horizontal scroll compact card row
- [ ] Thumbnails static (not animated, ED-5)
- [ ] Full card tap → immediately selects exercise
- [ ] No favorite icon on compact cards (all are already favorites)
- [ ] "Favorites ›" header tap → see-all Favorites within W-23
- [ ] See-all view uses full exercise row anatomy with detail icon

### Recently Used
- [ ] Horizontal scroll compact card row
- [ ] Ordered by most recently selected in W-23 (not W-9 session history)
- [ ] Maximum 8 exercises in Recents
- [ ] Context-incompatible exercises hidden from Recents in Mobility context
- [ ] Full card tap → immediately selects exercise
- [ ] Deduplication: same exercise can appear in both Favorites and Recents

### Browse Categories
- [ ] Category list visible in default view below MY EXERCISES
- [ ] Exercise counts reflect context-filtered catalog
- [ ] Category tap → applies implicit filter chip, exercise list shown
- [ ] Category chip × → removes category filter, default view restored

### Exercise Row
- [ ] Thumbnail: 48pt, static gifThumbnailUrl (ED-5)
- [ ] Name: 15sp primary weight
- [ ] Primary muscle chips: max 2, 11sp
- [ ] Favorite icon: 44pt touch target, toggles without navigating
- [ ] Detail icon: 44pt touch target, opens W-22 sheet
- [ ] Row body tap → selects exercise (not detail icon or favorite icon)
- [ ] Custom exercises: "Custom" label in chips row
- [ ] Difficulty NOT displayed in row
- [ ] Equipment NOT displayed in row

### Search
- [ ] Search bar always visible
- [ ] Real-time results, debounced 150ms
- [ ] No "Search" button
- [ ] Clear icon appears when field has content
- [ ] Query scope: name (highest weight) → muscles → equipment
- [ ] Favorites ranked first within same match tier
- [ ] Recents ranked first within favorites tier
- [ ] Search + filters: search operates within filtered set
- [ ] Empty search state: shows query, Create Custom option, Clear search
- [ ] Context-filtered catalog: search operates within context scope

### Filters
- [ ] Filter button opens bottom sheet (~72% height)
- [ ] Four filter categories: Muscle Group, Equipment, Difficulty, Source
- [ ] Within category: OR logic
- [ ] Across categories: AND logic
- [ ] "Source: Favorites" shows only favorited exercises
- [ ] Apply Filters CTA applies and dismisses sheet
- [ ] Reset All clears selections without dismissing sheet
- [ ] Filters do NOT persist when W-23 is dismissed
- [ ] Context-based filters not dismissable via Reset All

### Create Custom Exercise
- [ ] Entry: "Create Custom Exercise" in default view + empty search state
- [ ] Presents as sheet above W-23 (W-23 remains behind)
- [ ] Required: Exercise Name (min 1 char, max 60 chars)
- [ ] Optional: Muscle Groups, Equipment, Photo
- [ ] Save disabled until name is valid
- [ ] On Save: creates exercise, auto-selects it, W-23 dismisses, caller receives new exerciseId
- [ ] Cancel from sheet: W-23 restored, no exercise created
- [ ] Duplicate name: warning shown, Save still active
- [ ] Empty search creates exercise with search query pre-filled as name

### W-22 Integration
- [ ] Detail icon on exercise row opens W-22 as sheet above W-23
- [ ] W-23 state fully preserved when W-22 is open (scroll, search, filters)
- [ ] GIF autoplays in W-22 sheet (ED-5: autoplay in W-22 regardless of entry point)
- [ ] "Select This Exercise" CTA visible in W-22 when opened from W-23
- [ ] "Select This Exercise" is sticky (visible while scrolling W-22 content)
- [ ] "Select This Exercise" tap → W-22 + W-23 dismiss, caller receives exerciseId
- [ ] Favorite toggle in W-22 immediately reflected in W-23 rows behind
- [ ] Alternatives in W-22 functional: tapping opens W-22 B for alternative
- [ ] "Select This Exercise" on W-22 B works identically
- [ ] Back from W-22 → W-23 fully restored, no selection made

### Empty States
- [ ] No Favorites/Recents: MY EXERCISES absent, no placeholder
- [ ] Empty search: query shown, Create Custom, Clear search
- [ ] Empty filtered view: "No exercises match" + Clear all filters
- [ ] Empty category: "No exercises in this category" + Browse all

### Loading States
- [ ] Initial open: skeleton shimmer for cards and category rows
- [ ] Header and search bar visible immediately
- [ ] Cached catalog: skeleton suppressed entirely, renders instantly
- [ ] Search results: brief skeleton if not cached (rare, catalog typically cached)
- [ ] Reduce Motion: static placeholders, no shimmer

### Offline Behavior
- [ ] Cached catalog: W-23 operates fully offline
- [ ] Uncached catalog: system exercises unavailable, custom exercises shown, offline notice
- [ ] Favorite toggles and Custom Exercise creation work offline (sync on reconnect)
- [ ] W-22 from W-23 while offline: "Select This Exercise" remains functional in both cached and uncached states

### Accessibility
- [ ] Cancel button: "Cancel, closes exercise picker"
- [ ] Filter button: "Filter exercises" / "Filter exercises, [N] filters active"
- [ ] Search bar: "Search exercises"
- [ ] Compact card: "[Name], double-tap to select"
- [ ] Exercise row body: "[Name], [Muscles], double-tap to select"
- [ ] Favorite icon: "Add [Name] to Favorites" / "Remove [Name] from Favorites"
- [ ] Detail icon: "View [Name] detail"
- [ ] Screen reader announces result count after search
- [ ] Reduce Motion: no animations
- [ ] Auto-focus exception: suppressed when system accessibility settings block keyboard presentation

---

## 24. Decisions Record

| Decision | Value |
|----------|-------|
| W23-D1 — Full-screen modal (not push) | W-23 covers the calling screen entirely. Rationale: conveys "task overlay" nature; allows W-22 and Custom Create sheets to layer above; prevents confusion about back navigation within a workout/builder context. |
| W23-D2 — No GIF autoplay | ED-5 LOCKED. Thumbnails only in W-23. GIF autoplay exclusively in W-22 hero. |
| W23-D3 — Search bar not auto-focused | Many athletes open W-23 to tap a Favorite or Recent without typing. Auto-focus occludes quick-access rows and forces keyboard dismissal. Exception: when no Favorites and no Recents exist, auto-focus is appropriate — search is the only useful action. Exception respects system accessibility settings that suppress keyboard auto-presentation. Confirmed W23-R1, June 2026. |
| W23-D4 — Compact card for Favorites/Recents | Horizontal scroll compact cards (88pt wide) in quick-access rows. Thumbnails only — no muscle chips, no icons. Rationale: these are known exercises; the athlete does not need metadata to identify them. Speed of selection is paramount. |
| W23-D5 — Exercise row, not grid | W-23 uses vertical exercise rows for search results and browse. Grid is for exploration (W-21). Rows allow more items visible per screen height and a faster vertical scan pattern for task completion. |
| W23-D6 — Difficulty not shown in exercise row | Difficulty is a filter, not a row attribute in W-23. The athlete selects by name and muscles; difficulty is screened before browsing via the filter sheet. Displaying it per row clutters the compact row format and is redundant with filtering. Consistent with W-22's equipment/difficulty split (W22-D15). |
| W23-D7 — Category selection applies filter chip (not drill-down navigation) | Tapping a category applies an implicit filter chip, showing filtered results inline without changing the header or navigation stack. Rationale: category selection is a filtering action, not a navigation action. The athlete can dismiss the chip to return to the default view without a back button. |
| W23-D8 — Filters do not persist between sessions | W-23 is task-specific. Persisting filters causes confusion ("why am I seeing only chest exercises?") across different workout sessions with different needs. Re-applying filters is low friction. |
| W23-D9 — Apply Filters CTA (not live) | Filters are applied via an explicit CTA rather than updating live as each chip is selected. Rationale: the athlete typically selects multiple filter options in sequence; live updates cause result flickering and visual instability that impedes the task. |
| W23-D10 — Custom exercise auto-selected on create | When the athlete creates a custom exercise from W-23, it is immediately selected and returned to the caller. Rationale: the athlete created the exercise to use it right now. Auto-selection removes a redundant tap. |
| W23-D11 — "Select This Exercise" CTA in W-22 (W-23 context) | When W-22 is opened from W-23, a sticky "Select This Exercise" CTA is injected at the bottom of W-22. This lets the athlete learn about an exercise and select it in one fluid sequence without navigating back to the picker list. The CTA is invisible in W-22 opened from any other context. |
| W23-D12 — Recently Used ordered by picker selection (not W-9 session) | Picker-specific recents reflect what the athlete last added, not what they did in their last workout. These are more predictive of immediate need. W-21 Recently Used remains ordered by session history for browsing/discovery purposes. |
| W23-D13 — Single selection only (V1.0) | W-23 V1.0 selects one exercise per session. Multi-selection deferred to V1.1 pending W-24 specification of whether multi-add workflows are needed. |
| W23-D14 — Source "Favorites" as a filter option | The Source filter category includes a "Favorites" option, enabling athletes to search/browse within only their favorited exercises. This is cleaner than a separate "Favorites only" toggle. |
| W23-D15 — Context-based catalog scope not visible to athlete | Mobility context filtering is a hard constraint — not a dismissable chip and not overridable by athlete filters. The athlete is not shown "You are in Mobility mode — X exercises are hidden." The filtered catalog is simply what W-23 shows; its scope is appropriate for the task. |

---

## 25. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Implements ED-4 (context-aware behavior), ED-5 (GIF thumbnail policy), custom exercise architecture. Defines full-screen modal presentation, context parameter model, compact card + row dual format, filter architecture, W-22 integration with "Select This Exercise" CTA injection. |
| v1.0 (R1) | June 2026 | W23-R1 resolved. W23-D3 (search auto-focus) confirmed: keyboard closed by default; auto-focus only when both Favorites and Recents are empty. § 20.5 amended: auto-focus exception respects system accessibility settings that suppress automatic keyboard presentation. Status: LOCKED. |

---

*W-23 Exercise Picker — Wireframe Specification v1.0*
*Forge Legacy | June 2026*
