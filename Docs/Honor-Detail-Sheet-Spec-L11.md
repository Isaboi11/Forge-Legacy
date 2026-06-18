# L-11 Honor Detail Sheet
## Wireframe Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Honor-Catalog-v1.0-LOCKED.md, HonorInstance-Architecture-v1.0.md, Honor-Evaluation-Service-Architecture-v1.0.md, L-10 Honors Hub Spec v1.0, M-2 Honor Earned Modal Spec v1.1, L-1 Legacy Hub Spec v1.0, Master PRD §13, Product DNA

---

## 1. Purpose

L-11 is a historical record with celebration.

It is not another ceremony. It is not a trophy popup. It is not a notification that lingers. When the athlete reaches L-11, the honor has already been recognized — by M-2 at the time of earning, by the L-10 card in the permanent list. L-11 is something different: the permanent artifact itself.

L-11 should feel like:

- A museum plaque
- An achievement record
- A meaningful moment inside the athlete's legacy

Not:

- An achievement notification
- A celebration modal
- A summary card

The athlete arrives at L-11 when they want to revisit an accomplishment — to understand it more fully, to reflect on when and why it happened, to feel what it meant. L-11 honors that intent.

**Emotional tone:** Earned. Still. Permanent.

---

## 2. Entry Points

| Source | Trigger | Data Passed | Return Destination |
|--------|---------|-------------|-------------------|
| L-10 honor card tap | Tap any honor card (Recent Honors or expanded category) | `HonorInstance.id` | L-10 — scroll position and category state preserved |
| M-2 Honor Earned Modal, honor row tap | Tap an individual honor name in the multi-honor list | `HonorInstance.id` | M-2 — modal remains below |
| L-1 FLM Honor Earned card tap | Tap the featured honor card on the Legacy Hub | `HonorInstance.id` | L-1 |

L-11 always receives a specific `HonorInstance.id`. It never opens without a target honor. There is no generic "honors" destination — every entry point is honor-specific.

L-11 is presented as a bottom sheet regardless of entry point. The originating screen is always visible and dimmed beneath the sheet.

---

## 3. Presentation Style

**Container:** Standard Forge Legacy bottom sheet.

- Partial height. Content determines height within the sheet container.
- Expandable to ~75% of screen height if content requires it.
- Full-height expansion not used — L-11 is a moment, not a screen.
- Drag handle at top center.
- Dimmed background overlay. Originating screen visible and dimmed beneath.
- Content scrolls if it exceeds the partial-height container.

**Dismissal:**
- Drag handle pulled down
- Tap outside the sheet on the dimmed background

**On dismissal, by entry point:**

| Entry Point | Dismissal Behavior |
|-------------|-------------------|
| L-10 | Return to L-10 — scroll position preserved, category expansion state preserved, focus restored to tapped honor card |
| M-2 | Return to M-2 — modal state unchanged |
| L-1 FLM | Return to L-1 — scroll position and state preserved |

No back navigation within L-11. Bottom sheets do not use back-gesture navigation in Forge Legacy.

---

## 4. Sheet Layout

### 4.1 Anatomy

```
┌────────────────────────────────────────────┐
│              ——  (drag handle)             │
│                                            │
│                                            │
│              [Honor Badge]                 │  ← Centered, category-based
│                                            │
│  Honor Name                                │  ← Headline, primary weight
│  Earned March 14, 2025                     │  ← Date line, secondary weight, muted
│                                            │
│  ─────────────────────────────────────    │  ← Divider
│                                            │
│  CHAPTER                                   │  ← Attribution label (conditional)
│  Summer of Iron                         ›  │  ← Attribution value (tappable if navigable)
│                                            │
│  ─────────────────────────────────────    │  ← Divider (conditional, present only when attribution shown)
│                                            │
│  [Generated description text]              │  ← 1–3 lines
│                                            │
│  [bottom safe area]                        │
└────────────────────────────────────────────┘
```

### 4.2 Layout Without Attribution

For honors with no attribution (e.g., Training, Strength, Longevity):

```
┌────────────────────────────────────────────┐
│              ——  (drag handle)             │
│                                            │
│              [Honor Badge]                 │
│                                            │
│  Honor Name                                │
│  Earned March 14, 2025                     │
│                                            │
│  ─────────────────────────────────────    │  ← Single divider before description
│                                            │
│  [Generated description text]              │
│                                            │
│  [bottom safe area]                        │
└────────────────────────────────────────────┘
```

### 4.3 Content Order

Content always renders in this fixed order, top to bottom:

1. Drag handle
2. Honor Badge
3. Honor Name
4. Earned date line
5. Divider
6. Attribution section (conditional — omit entirely when not applicable)
7. Second divider (conditional — present only when attribution is shown)
8. Description

No other content. No navigation header. No close button. No title bar. No action buttons.

---

## 5. Hero Section

The hero section is the top zone of the sheet, above the first divider. It contains three elements: badge, honor name, and earned date.

### 5.1 Honor Badge

Centered within the sheet width. Positioned above the honor name.

See Section 6 for badge rules.

### 5.2 Honor Name

Source: `HonorInstance.displayName` — the snapshotted display name from earn time. No catalog lookup.

Typography: Headline weight. Maximum 2 lines. Truncates with ellipsis if needed (rare — display names are short by design).

Alignment: Left-aligned (consistent with sheet typography hierarchy).

### 5.3 Earned Date Line

Text: `"Earned [Month D, YYYY]"` — the word "Earned" is part of the line.

Source: `HonorInstance.dateEarned`. Never display `awardedAt`.

Format examples: `"Earned March 14, 2025"` / `"Earned June 1, 2026"`

Typography: Secondary body weight, muted. Below the honor name. Left-aligned.

The word "Earned" is fixed static text. The date resolves from `dateEarned`. The combined line reads as an artifact label — "Earned [when]" — matching the museum plaque tone.

---

## 6. Badge Rules

### 6.1 Purpose

The honor badge is a category-level visual element that supports the accomplishment. The honor name is always the primary content — the badge reinforces and frames it.

One badge variant per display category. Seven badge types for the seven L-10 display categories (Training, Strength, Goals, Programs, Community, Chapters, Longevity).

### 6.2 Category-to-Badge Mapping

| Display Category | Honor Types | Badge Represents |
|-----------------|-------------|-----------------|
| Training | 12 training types | Training / endurance / volume |
| Strength | 12 strength + 6 club | Power / strength |
| Goals | 4 goal types | Achievement / ambition |
| Programs | 4 program types | Structure / completion |
| Community | 3 community types | Partnership / community |
| Chapters | 8 chapter types | Story / chapter lifecycle |
| Longevity | 4 longevity types | Time / consistency |

Club honors (`club_1000/1200/1500`, `club_400kg/500kg/600kg`) use the Strength badge. Club is a Strength-family concept in L-10 and L-11.

### 6.3 Badge Specifications

| Attribute | Value |
|-----------|-------|
| Size | 72pt × 72pt |
| Shape | To be defined by visual design |
| Artwork | Category-specific graphic — defined by visual design |
| Position | Horizontally centered in sheet; top of content area (below drag handle) |
| Spacing | 16pt below badge to honor name |

Badge artwork and visual treatment are owned by the visual design system. This spec defines placement, size, and category-badge mapping. Badge visuals should be designed to communicate category at a glance without competing with the honor name for attention.

### 6.4 Badge Fallback

If the honor type cannot be mapped to a display category (data error, future catalog entry not yet recognized by client), display a neutral generic badge. Never render an empty badge area.

---

## 7. Earned Date Rules

| Rule | Value |
|------|-------|
| Source field | `HonorInstance.dateEarned` |
| Display format | `"Earned Month D, YYYY"` |
| Never use | `HonorInstance.awardedAt` |
| Position | Below honor name, in hero section |
| Typography | Secondary body, muted |

For honors where `dateEarned` and `awardedAt` differ significantly (offline sync, import), the athlete sees only `dateEarned` — the historical date they qualified for the honor, not the system write date. This is the correct display: L-11 records when the accomplishment happened, not when the database was updated.

Example: An athlete who imported historical training data may see `"Earned September 12, 2023"` for an honor awarded during the import in June 2026. The import date never surfaces.

---

## 8. Attribution Section

### 8.1 Purpose

Contextual honors carry meaningful context about where, for what, or with whom they were earned. The attribution section surfaces that context as a navigable connection to the athlete's legacy.

### 8.2 Attribution Types

| Attribution Type | Rendered When | Label | Value Source | Navigation Destination |
|-----------------|---------------|-------|-------------|----------------------|
| Chapter | `chapterId` is not null | "CHAPTER" | `metadata.chapterName` | L-3 (active) or L-4 (sealed) |
| Goal | `metadata.goalId` is set | "GOAL" | `metadata.goalName` | G-2 Goal Detail |
| Program | `metadata.programId` is set | "PROGRAM" | `metadata.programName` | W-3 Program Detail |
| Partner | `metadata.partnerId` is set | "TRAINED WITH" | `metadata.partnerDisplayName` | Limited Athlete Profile modal |

Each honor type carries at most one attribution. No honor carries more than one attribution type.

### 8.3 Attribution by Honor Type

| Honor Type | Attribution Type |
|-----------|-----------------|
| `first_chapter_sealed` | Chapter |
| `chapters_sealed_5` | Chapter |
| `chapters_sealed_10` | Chapter |
| `chapters_sealed_25` | Chapter |
| `workouts_in_chapter_10` | Chapter |
| `workouts_in_chapter_25` | Chapter |
| `workouts_in_chapter_50` | Chapter |
| `workouts_in_chapter_100` | Chapter |
| `first_goal_achieved` | Goal |
| `first_program_graduated` | Program |
| `first_workout_with_friend` | Partner |
| All other 42 honor types | None — attribution section omitted |

For chapter count honors (`chapters_sealed_5/10/25`): the attributed chapter is the specific chapter that was the 5th, 10th, or 25th sealed — the milestone chapter. This is stored in `chapterId` at earn time per the HonorInstance Architecture.

### 8.4 Attribution Layout

```
  CHAPTER                                        ← Label: 11sp, muted caps, left-aligned
  Summer of Iron                              ›  ← Value: 15sp, primary weight, accent color if tappable
```

```
  TRAINED WITH
  Isaiah Altamirano                           ›
```

The label communicates the type of connection. The value is the snapshotted name from `metadata`. The full row (label + value) or the value row alone is tappable when navigation is available.

**Minimum tappable area:** 44pt height.

**Tappable state:** accent color on value, trailing chevron `›`.

**Non-tappable state (underlying object inaccessible):** value displayed at standard text color, no chevron, row not interactive. Label unchanged.

### 8.5 Navigation State Resolution (L11-D6)

Attribution objects are tappable only when the underlying object currently exists and is accessible.

| Scenario | Display | Chevron | Navigation |
|----------|---------|---------|-----------|
| Object exists and is accessible | Value in accent color | ` ›` present | Navigates to destination |
| Object inaccessible or deleted | Value in standard body color | No chevron | No navigation |

Navigation destination is resolved at tap time, not at render time:

**Chapter navigation:**
- Tap → system checks chapter state at that moment
- Active chapter → L-3 Active Chapter Detail
- Sealed chapter → L-4 Archived Chapter Detail
- Chapter not found → no navigation (state should have been detected at render, but handled gracefully)

**Goal navigation:**
- Active or achieved goal → G-2 Goal Detail
- Goal record not accessible → no navigation

**Program navigation:**
- Any program state (Future, Active, Graduated, Ended Early) → W-3 Program Detail
- Program record not accessible → no navigation

**Partner navigation:**
- Partner athlete account exists → Limited Athlete Profile modal
- Partner account deleted or inaccessible → no navigation

### 8.6 Attribution Name Accuracy

Attribution names are always sourced from `HonorInstance.metadata` — the name snapshotted at earn time. Live lookups are never performed for display. If a chapter, goal, program, or partner's name has changed since the honor was earned, L-11 displays the name as it was at earn time. This is correct historical behavior — the record preserves what was true when the accomplishment happened.

The value displayed in the attribution section may differ from the current name of the entity. This is intentional.

### 8.7 No Attribution State

When no attribution applies to the honor (42 of 53 honor types):

- The attribution section is entirely omitted from the layout
- No label, no value, no empty row, no divider for the attribution zone
- The first divider separates the hero section from the description directly
- Layout contracts to: hero → divider → description

---

## 9. Description Section

### 9.1 Philosophy (L11-D4)

Generated legacy descriptions explain why the accomplishment matters — not what triggered it. Descriptions are:

- **Meaningful:** they capture the significance of what the athlete achieved
- **Permanent:** they feel like something written to last
- **Concise:** 1–3 lines; never a paragraph
- **Human:** written in plain language with warmth, not system-speak
- **Accomplishment-focused:** about the athlete's achievement, not about the app's mechanics

Not:
- "Earned after completing your 10th workout in [Chapter Name]." — explains the trigger condition
- "Honor unlocked." — system text
- A long narrative that exhausts the moment

The description is the why. The badge, name, date, and attribution are the what.

For attributed honors: the attribution section handles the specific context (which chapter, which goal, which partner). The description focuses on the meaning of the achievement itself, without repeating the attributed entity. Descriptions are written to be read alongside their attribution — the two together form the complete record.

### 9.2 Typography and Layout

Typography: 15sp, primary body weight, standard body color. Line height comfortable for 2–3 lines.
Position: Below the second divider (or first divider when no attribution).
Alignment: Left-aligned.

A description is always present. Never render an empty description area. If the template cannot be resolved, use the fallback described in Section 9.4.

### 9.3 Description Templates (All 53 Honor Types)

#### Training

| Honor Type | Description |
|-----------|------------|
| `first_workout_logged` | "The first session is the hardest to start. You started." |
| `workouts_logged_50` | "Fifty sessions logged. The point where showing up becomes part of who you are." |
| `workouts_logged_100` | "A hundred workouts in your legacy. This is no longer something you are trying — it is something you do." |
| `workouts_logged_250` | "Two hundred and fifty sessions. The forge has become a permanent part of your life." |
| `workouts_logged_500` | "Five hundred workouts. Most athletes never reach this number. You did." |
| `workouts_logged_1000` | "One thousand sessions. A legacy that speaks for itself." |
| `hours_forged_100` | "A hundred hours given to the forge. The foundation of something lasting." |
| `hours_forged_250` | "Two hundred and fifty hours invested in this work. Every hour permanently part of your record." |
| `hours_forged_500` | "Five hundred hours forged. A commitment that most athletes never reach." |
| `hours_forged_1000` | "A thousand hours. The kind of investment that changes who you are." |
| `hours_forged_2500` | "Twenty-five hundred hours. This is not training anymore — this is your life." |
| `hours_forged_5000` | "Five thousand hours under the bar. A career's worth of time, given to the forge." |

#### Strength

| Honor Type | Description |
|-----------|------------|
| `bench_milestone_1` | "Your bench press reached [metadata.weightDisplay]. A number permanently on record." |
| `bench_milestone_2` | "A [metadata.weightDisplay] bench press. Evidence of months of committed work." |
| `bench_milestone_3` | "Your bench press reached [metadata.weightDisplay]. Strength that took serious time to build." |
| `bench_milestone_4` | "A [metadata.weightDisplay] bench press. The highest tier of this lift, earned through years of forging." |
| `squat_milestone_1` | "Your squat reached [metadata.weightDisplay]. The lower body foundation, recorded in your legacy." |
| `squat_milestone_2` | "A [metadata.weightDisplay] squat. Proof of what consistent training produces." |
| `squat_milestone_3` | "Your squat reached [metadata.weightDisplay]. Strength that most athletes never develop." |
| `squat_milestone_4` | "A [metadata.weightDisplay] squat. The result of years of deliberate work under the bar." |
| `deadlift_milestone_1` | "Your deadlift reached [metadata.weightDisplay]. Proof that the forge is working." |
| `deadlift_milestone_2` | "A [metadata.weightDisplay] deadlift. The bar records what the body has become." |
| `deadlift_milestone_3` | "Your deadlift reached [metadata.weightDisplay]. A pull that reflects serious commitment." |
| `deadlift_milestone_4` | "A [metadata.weightDisplay] deadlift. The highest expression of this lift, permanently on record." |

#### Club (displayed under Strength)

| Honor Type | Description |
|-----------|------------|
| `club_1000` | "Your bench, squat, and deadlift combined for 1,000 pounds. Total strength, measured and preserved." |
| `club_1200` | "A 1,200 lb combined total. Three lifts, one record of what you have built." |
| `club_1500` | "1,500 pounds across bench, squat, and deadlift. A mark that reflects a complete strength legacy." |
| `club_400kg` | "Your three lifts combined for 400 kilograms. Total strength, permanently on record." |
| `club_500kg` | "A 500 kg combined total. Strength measured across the three lifts that define the craft." |
| `club_600kg` | "600 kilograms across bench, squat, and deadlift. A total that defines an elite strength legacy." |

#### Goals

| Honor Type | Description |
|-----------|------------|
| `first_goal_achieved` | "A goal set and achieved. The first proof that you follow through." |
| `goals_achieved_10` | "Ten goals achieved across your legacy. A record of commitments made and kept." |
| `goals_achieved_25` | "Twenty-five goals achieved. The pattern of someone who finishes what they start." |
| `goals_achieved_50` | "Fifty goals achieved. A lifetime of commitments, honored." |

#### Programs

| Honor Type | Description |
|-----------|------------|
| `first_program_graduated` | "A program completed, start to finish. The first proof that you see things through." |
| `programs_graduated_5` | "Five programs completed. A record of structured work, seen through to the end." |
| `programs_graduated_10` | "Ten programs graduated. Each one a season of deliberate training." |
| `programs_graduated_25` | "Twenty-five programs completed. A legacy built on consistent, structured effort." |

#### Community

| Honor Type | Description |
|-----------|------------|
| `first_workout_with_friend` | "The first session alongside someone else. Training as something shared." |
| `workout_with_friend_10` | "Ten sessions trained alongside a partner. Strength built in community." |
| `workout_with_friend_50` | "Fifty sessions with a training partner. A commitment to training together, recorded." |

#### Chapters

Attribution (chapter name) handles the specific context. Descriptions focus on the meaning of the achievement.

| Honor Type | Description |
|-----------|------------|
| `first_chapter_sealed` | "A chapter sealed. A period of your forge, documented and permanently preserved." |
| `chapters_sealed_5` | "Five chapters of your legacy sealed. Five periods of life, completed and kept." |
| `chapters_sealed_10` | "Ten chapters sealed. A legacy that spans multiple seasons of your forge." |
| `chapters_sealed_25` | "Twenty-five sealed chapters. The mark of an athlete who keeps coming back." |
| `workouts_in_chapter_10` | "Ten sessions in one chapter. A chapter worth returning to." |
| `workouts_in_chapter_25` | "Twenty-five workouts inside one chapter. A chapter built on consistent presence." |
| `workouts_in_chapter_50` | "Fifty sessions in one chapter. A serious investment in one period of your forge." |
| `workouts_in_chapter_100` | "A hundred workouts in one chapter. A chapter that defined a part of your legacy." |

#### Longevity

| Honor Type | Description |
|-----------|------------|
| `longevity_1_year` | "One year since you started forging your legacy. Whatever the year brought — you stayed." |
| `longevity_3_years` | "Three years in the forge. Most athletes have moved on. You are still here." |
| `longevity_5_years` | "Five years of forging. This is no longer a habit — it is part of who you are." |
| `longevity_10_years` | "A decade of forging. The kind of consistency that changes a life." |

### 9.4 Description Fallback

If the description template cannot be resolved (unrecognized honor type, metadata required for template is absent), display:

`"An accomplishment permanently recorded in your legacy."`

Never render a blank description area. The fallback is a valid, meaningful sentence.

---

## 10. Navigation Rules

### 10.1 Dismissal

| Method | Behavior |
|--------|---------|
| Drag handle pulled down | Dismiss sheet, return to originating screen |
| Tap dimmed background outside sheet | Dismiss sheet, return to originating screen |

There is no "Close" button. No back arrow. Dismissal is drag or tap-outside only, consistent with Forge Legacy bottom sheet conventions.

### 10.2 Attribution Navigation

When the attribution row is tappable (underlying object accessible):

| Attribution Type | Destination | Behavior |
|-----------------|-------------|---------|
| Chapter | L-3 (active) or L-4 (sealed) — resolved at tap time | Full navigation — L-11 sheet dismissed; L-3 or L-4 pushed onto stack |
| Goal | G-2 Goal Detail | Full navigation — L-11 sheet dismissed; G-2 pushed onto stack |
| Program | W-3 Program Detail | Full navigation — L-11 sheet dismissed; W-3 pushed onto stack |
| Partner | Limited Athlete Profile modal | Modal presented over current screen |

When attribution taps result in full navigation (Chapter, Goal, Program), the athlete returns from the destination via standard back navigation. The originating screen for L-11 (L-10, M-2, or L-1) is the screen they return to after back-navigating from the destination.

When attribution tap opens the Limited Athlete Profile modal (Partner), the modal is dismissed with drag or tap-outside. L-11 remains open beneath.

### 10.3 No Other Navigation in L-11

L-11 does not offer any other navigation. There are no:
- "Next honor" or "Previous honor" arrows
- Links to L-10
- "View all [Category] honors" links
- Links to external content

---

## 11. L-10 Integration

When L-11 is opened from L-10:

- L-10 is visible and dimmed beneath the sheet
- L-11 receives `HonorInstance.id` from the tapped card
- On dismissal:
  - L-10 scroll position is restored to the exact position when the card was tapped
  - Category expand/collapse state is preserved exactly as it was
  - Focus is restored to the honor card that was tapped

When L-11 is opened from Recent Honors, it behaves identically to opening from an expanded category card. The `id` is the only input — L-11 has no concept of which section the card came from.

---

## 12. Data Requirements

L-11 receives `HonorInstance.id` and resolves all display data from the local HonorInstance cache.

| Field | Used For |
|-------|---------|
| `id` | Record identity (received as input) |
| `honorType` | Badge category mapping; description template selection; attribution type determination |
| `displayName` | Honor name in hero section |
| `dateEarned` | Earned date display |
| `chapterId` | Attribution presence check (not null = Chapter attribution); navigation state check |
| `metadata.chapterName` | Chapter attribution value |
| `metadata.goalId` | Goal attribution navigation (not null = Goal attribution) |
| `metadata.goalName` | Goal attribution value |
| `metadata.programId` | Program attribution navigation (not null = Program attribution) |
| `metadata.programName` | Program attribution value |
| `metadata.partnerId` | Partner attribution navigation (not null = Partner attribution) |
| `metadata.partnerDisplayName` | Partner attribution value |
| `metadata.weightDisplay` | Strength milestone description template `[metadata.weightDisplay]` token |

**Fields not required by L-11:** `awardedAt`, `source`, `schemaVersion`, `metadata.unitSystem`, `metadata.benchPR`, `metadata.squatPR`, `metadata.deadliftPR`.

**Attribution navigation check:** At tap time, L-11 requests the navigation destination from the system. The system determines whether the underlying object is accessible (chapter active vs. sealed, goal/program exists, partner account exists). L-11 does not independently query the status of these records at render time.

**Badge mapping:** Derived from `honorType` → display category → badge variant. No catalog lookup required.

---

## 13. Loading State

L-11 reads from locally cached HonorInstance data. Under normal conditions, L-11 renders immediately.

**Skeleton loading:** If the HonorInstance record is not yet in cache, display a skeleton within the sheet:
- Badge placeholder (circle skeleton, 72pt)
- Honor name placeholder (rectangle, ~60% width)
- Date line placeholder (rectangle, ~40% width)
- Description placeholder (2 line rectangles, ~90% width each)

**Threshold:** Skeleton visible if load exceeds 500ms.

**Transition:** Skeleton → populated content is a fade.

---

## 14. Error State

If the HonorInstance cannot be loaded (cache miss + network error):

```
  Could not load this honor.
  [Retry]
```

**Copy:** "Could not load this honor."
**Action:** "Retry" — Secondary CTA. Triggers a new load attempt.

Sheet remains open during error state. Drag-to-dismiss remains available. The athlete can dismiss and return to L-10.

---

## 15. Accessibility

| Element | Accessibility Behavior |
|---------|----------------------|
| Sheet | Announced as modal dialog: "Honor detail" |
| Drag handle | Accessible label: "Dismiss" |
| Honor Badge | Decorative; announced as category label: "[Category] honor" |
| Honor Name | Announced as heading (h1 equivalent) |
| Earned date line | Announced as static text |
| Attribution label | Announced as static text (not interactive) |
| Attribution value — tappable | Announced as button: "[Value], double-tap to view [chapter / goal / program / profile]" |
| Attribution value — non-tappable | Announced as static text: "[Value]" |
| Description | Announced as static text |
| Background dimmed area | Accessible: "Double-tap to dismiss" |

**Focus behavior:**
- On open: focus set to the sheet or the honor name (first meaningful element)
- Focus is trapped within the sheet while open (standard modal behavior)
- On dismiss: focus returns to the element that triggered L-11 (the honor card in L-10, the honor row in M-2, the FLM card in L-1)

**Minimum touch targets:**
- Attribution row (tappable): 44pt height minimum
- Drag handle: accessible tap area extended beyond visual size

---

## 16. Performance Requirements

| Metric | Target |
|--------|--------|
| Time from card tap to sheet open | < 200ms (warm cache) |
| Skeleton display threshold | > 500ms |
| Sheet open animation | Standard bottom sheet spring animation |
| Attribution navigation resolution | At tap time — no pre-fetch required |
| Offline rendering | Identical to online; all display data from local cache |

HonorInstance records are stored in local cache as part of standard data sync. L-11 must render fully offline — no network request required for display.

Attribution navigation destinations (chapter active vs. sealed, object accessibility) are resolved at tap time. If the device is offline at tap time, navigation may degrade gracefully (system determines behavior based on locally cached state of the destination record).

---

## 17. Non-Behaviors

L-11 does not and will never:

| Non-Behavior |
|-------------|
| Re-trigger M-2 or any ceremony |
| Display rarity labels |
| Display honor points or XP |
| Display rank contribution messaging |
| Display completion percentages |
| Display unearned honors |
| Display neighboring honors ("Next: 100 Workouts") |
| Display "next honor" hints or recommendations |
| Display "previous honor" navigation |
| Display a list of honors earned in the same session |
| Allow editing of any displayed field |
| Allow deleting the honor record |
| Allow changing attribution |
| Allow sharing of the honor (MVP) |
| Allow the athlete to hide the honor |
| Display a celebration animation |
| Play a sound effect |
| Show a confetti or particle effect |
| Show social reactions or comments |
| Display a progress bar toward any next milestone |
| Display a "Back to Honors" button (dismissal is the only exit) |
| Perform live lookups for display names (all values from metadata snapshots) |
| Display `awardedAt` in any form |

---

## 18. Validation Checklist

### Sheet and Presentation
- [ ] L-11 opens as a bottom sheet (not full-screen, not modal)
- [ ] Originating screen visible and dimmed beneath
- [ ] Drag-down dismisses sheet
- [ ] Tap-outside (dimmed background) dismisses sheet
- [ ] L-10 scroll position preserved on dismissal from L-10
- [ ] L-10 category state preserved on dismissal from L-10
- [ ] Focus restored to originating element on dismissal

### Entry Points
- [ ] L-10 honor card tap → L-11 with correct `honorId`
- [ ] M-2 multi-honor row tap → L-11 with correct `honorId`
- [ ] L-1 FLM Honor Earned card tap → L-11 with correct `honorId`

### Hero Section
- [ ] Honor badge displayed, centered, 72pt, category-appropriate
- [ ] Honor name from `HonorInstance.displayName` (no catalog lookup)
- [ ] Earned date displays as "Earned [Month D, YYYY]"
- [ ] Date sourced from `HonorInstance.dateEarned` — never `awardedAt`
- [ ] Fallback badge renders for unrecognized honor types

### Badge Rules
- [ ] Training honors: Training badge
- [ ] Strength honors (bench/squat/deadlift milestones): Strength badge
- [ ] Club honors: Strength badge (Club honors use the Strength category badge)
- [ ] Goal honors: Goals badge
- [ ] Program honors: Programs badge
- [ ] Community honors: Community badge
- [ ] Chapter honors (count and depth): Chapters badge
- [ ] Longevity honors: Longevity badge

### Attribution Section — Presence
- [ ] `first_chapter_sealed`: Chapter attribution shown
- [ ] `chapters_sealed_5`: Chapter attribution shown
- [ ] `chapters_sealed_10`: Chapter attribution shown
- [ ] `chapters_sealed_25`: Chapter attribution shown
- [ ] `workouts_in_chapter_10/25/50/100`: Chapter attribution shown
- [ ] `first_goal_achieved`: Goal attribution shown
- [ ] `first_program_graduated`: Program attribution shown
- [ ] `first_workout_with_friend`: Partner attribution shown
- [ ] All other 42 honor types: attribution section entirely absent

### Attribution Section — Values
- [ ] Chapter attribution value from `metadata.chapterName` (snapshot, not live lookup)
- [ ] Goal attribution value from `metadata.goalName` (snapshot)
- [ ] Program attribution value from `metadata.programName` (snapshot)
- [ ] Partner attribution value from `metadata.partnerDisplayName` (snapshot)
- [ ] Attribution label correct for each type (CHAPTER / GOAL / PROGRAM / TRAINED WITH)

### Attribution Section — Navigation
- [ ] Chapter attribution (accessible): tappable, chevron shown; routes to L-3 or L-4 based on chapter state at tap time
- [ ] Goal attribution (accessible): tappable, chevron shown; routes to G-2
- [ ] Program attribution (accessible): tappable, chevron shown; routes to W-3
- [ ] Partner attribution (accessible): tappable, chevron shown; opens Limited Athlete Profile modal
- [ ] Chapter attribution (inaccessible): displayed, no chevron, not tappable
- [ ] Goal attribution (inaccessible): displayed, no chevron, not tappable
- [ ] Program attribution (inaccessible): displayed, no chevron, not tappable
- [ ] Partner attribution (inaccessible): displayed, no chevron, not tappable
- [ ] Partner attribution tap → Limited Athlete Profile modal (not full-screen navigation)
- [ ] L-11 remains open beneath Limited Athlete Profile modal

### Description Section
- [ ] Description present for all 53 honor types
- [ ] Description template correct per Section 9.3 tables
- [ ] Training descriptions match templates (no metadata substitution required)
- [ ] Strength milestone descriptions substitute `[metadata.weightDisplay]` correctly
- [ ] Club descriptions use hardcoded threshold copy (1,000 lbs / 1,200 lbs etc.)
- [ ] Goal/Program/Community volume descriptions match templates
- [ ] Chapter descriptions focus on meaning without repeating chapter name (attribution handles context)
- [ ] Longevity descriptions match templates
- [ ] Fallback description renders when template cannot be resolved
- [ ] Description is never blank or empty

### All 53 Honor Types Covered
- [ ] Training: 12 types — all templates verified
- [ ] Strength: 12 types — all templates verified
- [ ] Club: 6 types — all templates verified
- [ ] Goals: 4 types — all templates verified
- [ ] Programs: 4 types — all templates verified
- [ ] Community: 3 types — all templates verified
- [ ] Chapters: 8 types — all templates verified
- [ ] Longevity: 4 types — all templates verified
- [ ] Total: 53 types ✓

### Date Rules
- [ ] `awardedAt` never displayed anywhere in L-11
- [ ] `dateEarned` used for "Earned [date]" display
- [ ] Import honors show historical `dateEarned` correctly (may be years before app use)
- [ ] Offline-sync honors show original session `dateEarned` (not sync timestamp)

### Loading and Error States
- [ ] Skeleton loading displays when load exceeds 500ms
- [ ] Error state displays "Could not load this honor."
- [ ] Retry CTA present in error state
- [ ] Sheet dismissal available in error state

### Accessibility
- [ ] Sheet announced as "Honor detail"
- [ ] Honor name announced as heading
- [ ] Tappable attribution announced as button with destination
- [ ] Non-tappable attribution announced as static text
- [ ] Focus trapped in sheet while open
- [ ] Focus restored to originating element on dismissal
- [ ] Drag handle has accessible label "Dismiss"

### Non-Behaviors
- [ ] No ceremony or animation
- [ ] No rarity or XP display
- [ ] No "next honor" recommendation
- [ ] No editing, deletion, or hiding
- [ ] No re-triggering of M-2
- [ ] No sharing CTA (MVP)

---

## 19. Closure Record

### Locked Decisions Incorporated

| Decision | Status |
|----------|--------|
| L11-D1 — Historical record with celebration; museum plaque feel | ✓ |
| L11-D2 — Hero element: Honor Badge + Honor Name | ✓ |
| L11-D3 — Earned date as "Earned [Month D, YYYY]"; source = `dateEarned` | ✓ |
| L11-D4 — Generated legacy descriptions; why-focused, not what-focused | ✓ |
| L11-D5 — Attribution section for contextual honors; 4 attribution types; no placeholders | ✓ |
| L11-D6 — Attribution tappable when object exists; display-only when inaccessible; historical record preserved | ✓ |

### Dependencies Confirmed

| Dependency | Status |
|-----------|--------|
| Honor Catalog v1.0 — 53 types | LOCKED |
| HonorInstance Architecture v1.0 | LOCKED |
| Honor Evaluation Service Architecture v1.0 | LOCKED |
| L-10 Honors Hub Spec v1.0 | LOCKED |
| M-2 Honor Earned Modal Spec v1.1 | LOCKED |

### Contradictions Found

**None.**

All locked decisions (L11-D1 through L11-D6) are internally consistent. The description philosophy (L11-D4) and the attribution section (L11-D5/D6) create a clean division of responsibility: attribution carries the specific context, description carries the meaning. These two elements reinforce rather than duplicate each other.

### Architecture Coverage

| Area | Status |
|------|--------|
| All 53 honor types: descriptions defined | ✓ |
| All 53 honor types: badge category mapped | ✓ |
| Attribution presence rules: 11 types with attribution, 42 without | ✓ |
| Attribution navigation: object-accessible vs. inaccessible states | ✓ |
| `dateEarned` used exclusively; `awardedAt` never displayed | ✓ |
| `displayName` used for honor name; no catalog lookup | ✓ |
| All metadata values from snapshot; no live entity lookups | ✓ |
| Offline rendering: all data from local cache | ✓ |
| L-10 → L-11 flow: scroll position, category state, focus restoration | ✓ |
| M-2 → L-11 entry point | ✓ |
| L-1 FLM → L-11 entry point (resolves Architecture Risk 3) | ✓ |
| Historical record philosophy: immutable, snapshotted, never rewritten | ✓ |

### Remaining Honors Workstream Items

**The Honors architecture workstream is complete.**

The following three documents form the complete Honors architecture:
- `Docs/Honor-Catalog-v1.0-LOCKED.md` — LOCKED
- `Docs/HonorInstance-Architecture-v1.0.md` — LOCKED
- `Docs/Honor-Evaluation-Service-Architecture-v1.0.md` — LOCKED

The following three documents form the complete Honors UX specification:
- `Docs/M-2-Honor-Earned-Modal-Spec.md` v1.1 — LOCKED
- `Docs/Honors-Spec-L10.md` v1.0 — LOCKED
- `Docs/Honor-Detail-Sheet-Spec-L11.md` v1.0 — LOCKED

No remaining Honors workstream items exist. The system is implementation-ready:
- Honor types defined and locked (53 types)
- Data model locked (HonorInstance Architecture)
- Evaluation service locked (Honor Evaluation Service Architecture)
- Ceremony experience locked (M-2)
- Browse experience locked (L-10)
- Detail experience locked (L-11)

Remaining Honors items are **implementation concerns**, not specification concerns:
- Database schema (statistics tables, PR records)
- Evaluation service code (8 evaluator families)
- Badge artwork (7 category variants — visual design)
- M-5 Chapter Sealing ceremony spec (governs chapter-seal honor ceremony path, not yet written)

---

## 20. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification — full L-11 Honor Detail Sheet architecture |

---

*L-11 Honor Detail Sheet — Wireframe Specification v1.0*
*Forge Legacy | June 2026*
