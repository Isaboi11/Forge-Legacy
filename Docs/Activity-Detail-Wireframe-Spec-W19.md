# W-19 Activity Detail
## Wireframe Specification v1.1 | June 2026

**Status:** LOCK CANDIDATE
**Authority:** W-9 v1.1 (LOCKED), W-17 v1.1 (LOCKED), W-18 v1.0 (LOCKED), W-24 v1.1 (LOCKED), WwF Architecture v1.1 (LOCKED), Exercise Domain Architecture v1.0 + Amendment 001 (LOCKED), ED-5 (LOCKED), L-3/L-4 v1.0 (LOCKED), Product DNA (LOCKED)
**Reads from:** Session record written by W-9 / W-17
**Navigated from:** W-18 Activity History (session row tap)
**Navigates to:** W-18 (back), Limited Athlete Profile modal (Trained With row), L-3 or L-4 (chapter link), W-3 (program link)

---

## 1. Screen Purpose

W-19 Activity Detail answers one question: **What happened during this session?**

It is the complete historical record of a single workout session. It presents what was logged — exactly as logged — without interpretation, correction, or enhancement.

**W-19 is a historical record.** The session is over. The data is permanent. What is displayed already happened.

**W-19 is not a workout editor.** No field in W-19 can be modified. Not the reps, not the weight, not the time. Not the name. Not the notes.

**W-19 is not a workout logger.** W-9 is execution. W-19 is review.

**W-19 is not a planning surface.** W-24 is planning. W-19 shows what the plan became.

**W-19 is not a coaching screen.** No suggestions, no trend lines, no "you could have done better." Nothing here has an opinion.

**W-19 is not an analytics dashboard.** No PRs highlighted, no volume totals, no week-over-week deltas. A number is a number. It represents what the athlete did that day.

**The distinction from W-17:** W-17 (Workout Summary) is the immediate post-session transition — the moment of "Done." It prioritizes chapter attribution first because the athlete needs to feel that this session belongs to something bigger. W-19 is later review — the athlete already knows the session exists. They are looking for the data. Data leads.

**The distinction from L-3 / L-4:** L-3 and L-4 show sessions as entries in a chapter narrative. W-19 shows a session as a standalone record. The chapter is context, not the frame.

**Emotional tone:** Grounded. Factual. Complete. The athlete should feel: *Here is what I did. It is permanent.*

---

## 2. Entry Points

### 2.1 Current Entry Points (MVP)

| Source | Trigger | Context Passed |
|--------|---------|---------------|
| W-18 Activity History | Session row tap | `sessionId` |

W-18 passes `sessionId`. W-19 loads the complete session record from that ID.

### 2.2 Presentation Mode

W-19 is a **push navigation screen** within the Workouts tab stack. It extends the W-18 navigation stack (W-1 → W-18 → W-19).

W-19 is not a modal, not a sheet. The athlete navigates into it through intentional row selection and returns with the back arrow.

### 2.3 Future Entry Points (Noted — Not Specced)

| Source | Trigger | Notes |
|--------|---------|-------|
| W-1 Recent Workouts | Individual session row tap | Direct W-9 → W-19 shortcut — V1.1 (W1-A2) |
| L-3 / L-4 Session section | Individual session row tap | Chapter-scoped entry — V1.1 |
| W-3 Workout Slot (history) | Completed session reference | Program-scoped entry — V1.1 |

---

## 3. Exit Points

| Destination | Trigger |
|-------------|---------|
| W-18 | Back button |
| Limited Athlete Profile modal | Trained With row tap |
| L-3 (Active Chapter Detail) | Chapter attribution tap — chapter is active |
| L-4 (Archived Chapter Detail) | Chapter attribution tap — chapter is archived |
| W-3 (Program Detail) | Program attribution tap |

W-19 has no other exit points. All actions are read-only. No CTAs, no modals beyond Limited Athlete Profile.

---

## 4. Information Architecture

### 4.1 Screen Layout

```
┌────────────────────────────────────────────────────┐
│  [←]                                               │
├────────────────────────────────────────────────────┤
│                                                    │
│  [activity icon 40pt]  Leg Day A                   │
│                        Tuesday, June 10, 2026      │
│                        6:42 AM · 45 min            │
│                        3 exercises · 12 sets       │
│                                                    │
│  ────────────────────────────────────────────────  │
│                                                    │
│  EXERCISES                                         │
│                                                    │
│  [exercise card — fully expanded]                  │
│  [exercise card — fully expanded]                  │
│  [exercise card — fully expanded]                  │
│                                                    │
│  ────────────────────────────────────────────────  │
│                                                    │
│  TRAINED WITH                                      │
│  [partner row]                    [›]              │
│                                                    │
│  ────────────────────────────────────────────────  │
│                                                    │
│  CHAPTER                                           │
│  Season 1 — The Foundation        [›]              │
│                                                    │
│  ────────────────────────────────────────────────  │
│                                                    │
│  PROGRAM                                           │
│  The Big Lifts — Leg Day A        [›]              │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 4.2 Section Order

The content of W-19 flows top to bottom in the following order:

1. Session Hero (§ 5)
2. Exercise List or Activity Data, depending on activity type (§ 7)
3. Notes — per-exercise, inline in Exercise List (§ 8)
4. Workout With Friend Attribution (§ 12) — omitted if no confirmed partners
5. Chapter Attribution (§ 11) — omitted if unchaptered
6. Program Attribution (§ 10) — omitted if not a program workout
7. Import Origin (§ 13) — omitted if not imported

Sections with no content are **absent** — no placeholder, no empty label, no "—". A W-19 with no WwF partners and no chapter and no program shows only the session hero and the exercise list.

---

## 5. Session Hero

### 5.1 Hero Anatomy

```
[activity type icon 40pt]  Leg Day A

                           Tuesday, June 10, 2026
                           6:42 AM · 45 min
                           3 exercises · 12 sets
```

| Component | Spec |
|-----------|------|
| Activity type icon | 40pt, category-appropriate tint color, left-aligned |
| Session name | 22sp, primary weight, up to 2 lines |
| Date | 15sp, muted secondary, full date format: "Tuesday, June 10, 2026" |
| Time + Duration | 14sp, muted secondary: "[H:MM AM/PM] · [duration]" |
| Activity stats | 14sp, muted secondary, activity-type-specific (§ 5.2) |

The hero has no trailing actions, no overflow icon, no edit trigger.

### 5.2 Activity Stats by Type

The stats line in the hero gives the athlete an immediate summary of the session.

| Activity Type | Stats Line |
|---------------|-----------|
| STRENGTH | "[N] exercises · [N] sets" |
| RUN | "[distance] [unit]" |
| WALK | "[distance] [unit]" |
| BIKE | "[distance] [unit]" |
| SWIM | "[distance] [unit]" or "[N] laps" |
| HIIT | "[N] rounds" |
| MOBILITY | *(duration already shown — no additional stat)* |
| YOGA | *(duration already shown — no additional stat)* |
| OTHER | "[custom activity name]" if named; otherwise blank |

For MOBILITY and YOGA, the duration alone defines the session. No additional stat line is shown; the third line ("6:42 AM · 45 min") is the complete hero summary.

### 5.3 Session Name Fallback

If the session has no explicit name (free-form workout, no program slot name):
- Display the activity type label: "Strength", "Run", "Walk", "Bike", "Swim", "HIIT", "Mobility", "Yoga", or the custom activity name from W-16.
- This is the same fallback used in W-9, W-17, and W-18.

### 5.4 Duration Display

| Duration | Format |
|----------|--------|
| Under 1 minute | "< 1 min" |
| 1–59 minutes | "[N] min" |
| 60–89 minutes | "1 hr [N] min" |
| 90+ minutes | "[N] hr [M] min" |
| Exact on-hour | "[N] hr" |

### 5.5 Hairline Separator

A 1pt hairline separator runs below the hero, full-width, before the first content section.

---

## 6. Section Headers

### 6.1 Format

Content sections in W-19 use a consistent header format:

```
EXERCISES
```

- Uppercase section label, 12sp, muted secondary weight
- No hairline above the label (content below the hero already has a separator)
- 16pt padding above section label (within scrollable content), 8pt below
- Section labels: EXERCISES, ACTIVITY DATA, TRAINED WITH, CHAPTER, PROGRAM
- No section label for the hero

### 6.2 Section Separators

A 1pt hairline separator appears between sections. Not above the first section (hero handles that separator) and not below the last section.

---

## 7. Exercise List and Activity Data

### 7.1 STRENGTH Sessions — Exercise List

For sessions where `activityType = STRENGTH` (or any session with logged exercise data), W-19 displays a fully expanded exercise list.

Exercises appear in the order they were logged — grouped by workout section (WARM-UP → MAIN → COOL-DOWN) if sections were used, or flat if the session was a single-section (MAIN only) or free-form workout.

Section header: **EXERCISES**

**Section grouping within the exercise list:**

If the session record contains exercises in multiple sections (WARM-UP, MAIN, COOL-DOWN), section labels appear as compact read-only dividers between exercise groups:

```
EXERCISES

  WARM-UP
  [exercise card]
  [exercise card]

  MAIN WORKOUT
  [exercise card]
  [exercise card]
  [exercise card]

  COOL-DOWN
  [exercise card]
```

- Section labels: 12sp, uppercase, muted secondary — same visual style as § 6.1 content section headers but indented or visually subordinate within the EXERCISES section to avoid ambiguity
- Section labels appear only for sections that contained at least one logged exercise
- Empty sections (plan had the section but no exercises logged in it) produce no label and no entry in W-19
- Single-section sessions (MAIN only, or any free-form workout without sections): flat exercise list, no section labels — consistent with W-17 behavior
- The EXERCISES section header remains a single "EXERCISES" label; it does not split into per-section headers

**Exercise Card:**

```
[thumbnail 40pt]  Bench Press

   Set 1    135 lbs × 8
   Set 2    135 lbs × 8
   Set 3    135 lbs × 7
   Set 4    135 lbs × 6

   Note: "Keep elbows tucked"
```

| Component | Spec |
|-----------|------|
| Thumbnail | 40pt × 40pt, static `gifThumbnailUrl` per ED-5 (no autoplay in W-19) |
| Exercise name | 15sp, primary weight |
| Set row | 14sp: "Set [N]" in muted secondary, "[weight] × [reps]" in primary |
| Note (if present) | 13sp, italic, muted secondary, below set list |
| Spacing between exercises | 20pt |

**Set display formats:**

| Data Available | Display |
|----------------|---------|
| Weight + reps both logged | "135 lbs × 8" |
| Reps only (bodyweight) | "8 reps" |
| Weight only | "135 lbs × —" |
| Neither (exercise present but no sets logged) | "No sets logged" (13sp, muted italic) |
| Duration-based set (MOBILITY slot exercise) | "45 sec" |

No PR indicators. No comparisons to previous sessions. A number is what it is.

**Weight unit:** Displayed in the unit as logged at session time — `weightUnit` from the session record. Not converted. Not normalized. If the athlete logged in lbs, the record shows lbs. If in kg, kg.

**Deleted exercise handling (§ 7.3):** If an exercise in the session record references an `exerciseId` that no longer exists in the catalog:
- Name: "[Deleted Exercise]" in muted secondary text
- Thumbnail: dark placeholder with no initial
- Sets: displayed as logged, read-only
- Tap: no W-22 link (cannot link to a deleted exercise's detail)

The logged data is preserved and displayed. History Cannot Be Rewritten — the deleted exercise's record in this session is permanent.

### 7.2 Non-STRENGTH Sessions — Activity Data

For sessions where `activityType` is not STRENGTH (RUN, WALK, BIKE, SWIM, HIIT, MOBILITY, YOGA, OTHER), W-19 displays an activity data section instead of an exercise list.

Section header: **ACTIVITY DATA**

The activity data section shows the stats captured during the session. The exact fields depend on the activity type and what W-9 captured (W-10 through W-15 activity-type-specific interfaces). W-19 displays whatever is non-null in the session record for that type.

**Stat row format:**
```
Distance        3.1 mi
Avg Pace        10:00 /mi
Duration        31 min
```

- Label: 14sp, muted secondary, left-aligned
- Value: 14sp, primary, right-aligned
- Each stat on its own row, 36pt minimum height per row

**Activity-type expected stat fields:**

| Activity Type | Expected Fields (displayed when non-null) |
|---------------|------------------------------------------|
| RUN | Distance, Duration, Avg Pace |
| WALK | Distance, Duration |
| BIKE | Distance, Duration, Avg Speed |
| SWIM | Distance or Laps, Duration |
| HIIT | Rounds Completed, Duration |
| MOBILITY | Duration |
| YOGA | Duration |
| OTHER | Duration, Custom Activity Name (if set) |

Duration is already displayed in the hero. It is repeated in the Activity Data section for completeness and to maintain the stat table structure — the athlete scanning the data section expects to see duration there even if they already saw it in the hero.

If a field is null (was not captured or not applicable for this session), that row is absent. No "—" placeholder rows.

**Sessions with planned exercises from W-24 (MOBILITY/YOGA slots):** If the session record contains per-exercise logged data (e.g., a yoga session with individual pose durations logged via W-9's W-15 interface), that data appears as an exercise list (same format as § 7.1 with duration per set instead of weight × reps). W-19 renders whatever exercise log data is present in the session record; the Activity Data section and Exercise List are not mutually exclusive if both types of data exist.

### 7.3 Deleted Exercise Handling

Documented in § 7.1. Applies to any session that references a subsequently deleted exercise:
- Name shown as "[Deleted Exercise]"
- Set data shown as logged
- No W-22 tap target
- No error state — silent graceful degradation

---

## 8. Notes

Notes in Forge Legacy are per-exercise and are logged during the active session in W-9. They appear inline within the exercise card in § 7.1, below the set list for the relevant exercise.

**There is no session-level notes field in MVP.** A standalone "Notes" section in W-19 is absent. Per-exercise notes are the only notes system in the MVP session record.

**Note display within exercise card:**
```
Note: "Keep elbows tucked, don't flare"
```

- Prefix "Note:" in muted secondary 13sp
- Note text in muted italic 13sp
- Max display length: full text as written (no truncation in W-19 — this is the historical record)
- If no note exists for an exercise, the note line is absent. No "No note" placeholder.

**V1.1 consideration:** Session-level notes (a free-text field for the overall session rather than individual exercises) is a V1.1 enhancement. If added, a "NOTES" section would appear in W-19 between the exercise list and the attribution sections.

---

## 9. Photos

Session-attributed photos are **not displayed in W-19 (MVP).**

The Forge Legacy photo system is chapter-level in MVP. Photos are not captured at the session level during W-9, and no session-to-photo association exists in the current data model. If the athlete wants to see photos from the chapter that included this session, they navigate to L-3 or L-4 via the Chapter attribution link (§ 11).

Session-attributed photo capture and display in W-19 is a V1.1 enhancement contingent on session-level photo architecture being defined.

---

## 10. Program Attribution

### 10.1 Display

If the session was logged as part of a program workout:

```
PROGRAM
──────────────────────────────────────────
The Big Lifts — Leg Day A         [›]
```

- Section header: "PROGRAM", 12sp, muted uppercase
- Row: Program name + em-dash + workout slot name, 15sp, primary color
- Trailing chevron: 13pt ›, muted, right-aligned
- Full row is tappable → W-3 (Program Detail)

**Row format:** "[Program Name] — [Slot Name]"

Example: "The Big Lifts — Leg Day A"

If the program has no named slot (unnamed slot or slot name was lost): "[Program Name] — Workout [N]"

### 10.2 Routing

Tap on the program row → W-3 Program Detail for the referenced `programId`.

W-3 handles all program states (Future, Active, Graduated, Ended Early, Preview). W-19 does not need to know the program's current state — it passes `programId` and W-3 resolves the correct state presentation.

### 10.3 Attribution Snapshot

The program name and slot name stored in the session record are **snapshots taken at session start**. They are immutable. If the program was renamed or the slot was renamed after the session was logged, W-19 still shows the snapshotted names.

The athlete sees the name as it was when they trained. This is the correct historical record.

### 10.4 Absent Program Attribution

If the session was not a program workout, the PROGRAM section is entirely absent — no section header, no row, no placeholder.

---

## 11. Chapter Attribution

### 11.1 Display

If the athlete had an active chapter when the session was started:

```
CHAPTER
──────────────────────────────────────────
Season 1 — The Foundation         [›]
```

- Section header: "CHAPTER", 12sp, muted uppercase
- Row: Chapter name as snapshotted, 15sp, primary color
- Trailing chevron: 13pt ›, muted, right-aligned
- Full row is tappable → L-3 or L-4 based on chapter state

### 11.2 Routing

**Active chapter:** Row tap → L-3 (Active Chapter Detail) for the referenced `chapterId`.

**Archived chapter:** Row tap → L-4 (Archived Chapter Detail). W-19 determines this based on the chapter state in the current data model.

If the chapter no longer exists in the data model (edge case: chapter was somehow deleted — should not be possible given "History Cannot Be Rewritten," but defensive):
- Chapter name shown as snapshotted (still displayed)
- Row is not tappable (no chevron)
- Name shown in muted secondary (not primary) to signal inaccessibility

### 11.3 Attribution Snapshot

Chapter name is snapshotted at session start (same as W-17 behavior). The snapshotted name is displayed in W-19 permanently. If the chapter was renamed post-session, W-19 shows the name as it was during the session.

### 11.4 Absent Chapter Attribution

If the athlete had no active chapter when the session was started, the CHAPTER section is entirely absent. No "No Chapter" placeholder. No label. No row.

---

## 12. Workout With Friend Attribution

### 12.1 What Is Displayed

If the session has confirmed training partner attributions (athletes who claimed or approved the WwF tag per the WwF Architecture v1.1), a TRAINED WITH section appears:

```
TRAINED WITH
──────────────────────────────────────────
[avatar]  Marcus Williams              [›]
[avatar]  Sarah Chen                   [›]
```

- Section header: "TRAINED WITH", 12sp, muted uppercase
- One row per confirmed partner (max 3)
- Avatar: 32pt circular, initials fallback if no photo
- Display name: 15sp, primary color
- Trailing chevron: 13pt ›, muted
- Each row is tappable → Limited Athlete Profile modal

### 12.2 Partner Display Scope

Each partner row shows:
- Avatar (profile photo or initials)
- Display name

Nothing else. No username, no athlete type, no rank, no performance data, no "training partner since" context. This matches the WwF principle: "Reference entries contain only activity type + date + 'Trained with [Name]'" — W-19 surfaces the name, not the data.

### 12.3 Limited Athlete Profile Modal

Tap on a partner row → Limited Athlete Profile modal. The modal is the same as the one opened from S-2 member row tap: read-only, shows photo + display name + athlete type + rank name + Forging Since + top 3 accomplishments. Rank sub-tier hidden in squad context applies here as well.

### 12.4 Declined and Dismissed Partners

Athletes who declined the WwF tag do not appear. The session record only contains athletes who claimed or approved the tag. Declined athletes leave no trace in W-19.

### 12.5 Absent WwF Attribution

If the session has no confirmed training partners (solo session, or all partners declined), the TRAINED WITH section is entirely absent.

---

## 13. Imported Session Handling

### 13.1 Origin Attribution Display

Imported sessions display a subtle origin label in the session metadata area, below the hero and above the first content section:

```
Imported
```

- "Imported" in 13sp, muted secondary italic, left-aligned, below the hero separator
- No banner, no badge, no outlined chip, no alert styling
- One line only — the word "Imported" is sufficient

The origin label answers the implicit question "why is there less data here?" that the athlete might have when viewing an imported session with lower data fidelity.

### 13.2 Imported Session Data Fidelity

Imported sessions may have varying data fidelity depending on the import source and what the athlete's prior tracking captured:

- **Summary-only import** (session-level data: activity type, date, duration, optional distance): W-19 shows the session hero with available stats, the Activity Data section with available fields, and the origin label. The Exercise List section is absent (no exercise data).
- **Detailed import** (exercise-level data: exercises, sets, reps, weights): W-19 shows the full exercise list exactly as logged for a native session. The origin label remains.

W-19 renders whatever is present in the session record. No "this import is missing data" message — the absence of an Exercise List section is self-explanatory for a summary-level import.

### 13.3 Imported Session Date and Time

Imported sessions may have historical dates (years prior to account creation) from the original training records. The date and time display is identical to native sessions:
- "Tuesday, June 10, 2026" — from the imported session's `startedAt` timestamp
- "11:00 AM · 45 min"

If the imported session's time is unknown (the import source only had dates, not times): "Morning" / "Afternoon" / "Evening" time-of-day label based on a reasonable default, or just the date without time if no approximation is possible. This is a data question answered by the import pipeline; W-19 displays what's stored.

---

## 14. Partial Session Handling

### 14.1 Partial Indicator in W-19

Partial sessions (ended early via "Save & Exit" in W-9's abandonment flow) display a "Partial" label in the session hero, inline with the activity stats:

```
[activity icon 40pt]  Push A

                      Monday, June 8, 2026
                      6:15 AM · 18 min
                      2 exercises · 4 sets · Partial
```

- "Partial" is appended with a "·" separator to the activity stats line
- 14sp, muted secondary, same line as other stats — not on its own line
- No chip, no badge, no outlined box around the word
- Neutral color only — not red, not orange, not any alarm color

### 14.2 Partial Exercise List

For partial STRENGTH sessions, the exercise list in W-19 shows:
- All exercises that appeared in the W-9 session (whether fully logged or partially logged)
- All sets that were logged before the session ended
- Exercises that were planned (from W-24) but never started: **absent** from W-19 — they were not logged

W-19 shows what happened, not what was planned. Unstarted exercises leave no record.

---

## 15. Empty States

### 15.1 Session Record Unavailable

If W-19 is launched with a `sessionId` that cannot be resolved (deleted record — should not be possible in normal flow, network error on uncached session):

```
[←]

This session is unavailable.

[back to Activity History]
```

- Primary copy: "This session is unavailable."
- Secondary link: "Back to Activity History" → W-18
- No further explanation, no error code
- Header back button still functional

This state should be rare in practice. Session records are permanent and locally cached.

### 15.2 Exercise Data Unavailable

If W-19 resolves the session record successfully but exercise data is missing (network error, uncached exercise catalog for deleted exercises):

The session hero, attribution sections, and any available metadata render normally. For the exercises section:

```
EXERCISES
──────────────────────────────────────────
Exercise data is loading.
```

- Skeleton exercise cards shimmer while loading
- If load fails: "Exercises could not be loaded." — 14sp, muted, inline in the exercises section
- The rest of W-19 (hero, attribution) remains fully rendered

---

## 16. Loading States

### 16.1 Initial Load (Cached Session)

If the session record and exercise catalog are locally cached:
- W-19 renders immediately with no loading state
- No skeleton, no spinner
- Sub-200ms render target for cached data

### 16.2 Initial Load (Network Required)

If the session record is not cached (athlete opened W-18 and immediately tapped a row before the cache populated):

```
[←]

[skeleton hero block, 88pt]

[skeleton exercise card, 80pt]
[skeleton exercise card, 80pt]
[skeleton exercise card, 80pt]

[skeleton attribution block, 48pt]
[skeleton attribution block, 48pt]
```

- Skeleton shimmer for hero, exercise cards, attribution rows
- Back button visible and functional immediately
- Reduce Motion: static muted placeholder blocks, no shimmer
- If data arrives within 100ms: suppress skeleton entirely (no flash)

### 16.3 Avatar Loading (Trained With)

Partner avatars in the Trained With section load asynchronously. While loading: circular initials placeholder (display name initial, muted background). No shimmer per avatar — initials placeholder is sufficient.

---

## 17. Offline Behavior

### 17.1 Viewing Sessions Offline

All session records previously cached to the device are viewable offline without degradation. Exercise catalog is also cached — exercise names, thumbnails resolve locally.

### 17.2 Uncached Sessions Offline

If the session record was never cached (an edge case — would require the athlete to tap a W-18 row for a session that was never downloaded to the device):

- W-19 shows the unavailable state (§ 15.1)
- Back button returns to W-18
- No retry loop — the athlete navigates back when connectivity returns

### 17.3 Attribution Navigation Offline

Chapter link and Program link in W-19 are always tappable (they navigate to L-3/L-4 and W-3 which have their own offline behavior). W-19 does not gate attribution navigation on connectivity.

Limited Athlete Profile modal for Trained With partners: if partner profile data is not cached, the modal opens with initials avatar and display name, with muted secondary fields showing loading placeholder text until data resolves or fails.

---

## 18. Accessibility

### 18.1 Touch Targets

| Element | Minimum |
|---------|---------|
| Back button | 44pt |
| Chapter attribution row | 44pt height |
| Program attribution row | 44pt height |
| Trained With partner row | 44pt height |
| Exercise cards | Not independently tappable — no navigation |

Exercise cards are not tappable in W-19. There is no W-22 link from W-19 for exercises. The athlete is reviewing history, not researching exercises. W-22 is accessible from W-23 or W-24 context only.

### 18.2 Screen Reader Labels

| Element | Accessible Label |
|---------|----------------|
| Back button | "Back to Activity History" |
| Hero | "[Session Name]. [Activity Type]. [Full date and time]. [Duration]. [Activity stats]." |
| Exercise card | "[Exercise Name]. [N] sets." followed by each set as a sub-element |
| Set row | "Set [N], [weight] [unit], [reps] reps" or "Set [N], [reps] reps" for bodyweight |
| Exercise note | "Note: [note text]" |
| Trained With row | "[Partner Name]. Double-tap to view profile." |
| Chapter row | "Chapter: [Chapter Name]. Double-tap to view chapter detail." |
| Program row | "Program: [Program Name], [Slot Name]. Double-tap to view program." |
| "Partial" label | Announced as part of hero: "Partial session." |
| "Imported" label | Announced as: "Imported session." |

### 18.3 Focus Order

1. Back button
2. Session hero (single accessible element)
3. "Imported" label (if present)
4. For each exercise card:
   - Exercise card header (name, set count)
   - Each set row
   - Note (if present)
5. For each Trained With partner row
6. Chapter attribution row
7. Program attribution row

### 18.4 No Independent Exercise Taps

Exercise cards in W-19 are not interactive. They do not have tap targets, they do not navigate to W-22, they do not expand or collapse. In screen reader mode, they are navigated through as static informational elements.

### 18.5 Reduce Motion

- No skeleton shimmer — static muted placeholder blocks
- No entry animation for content
- Initials avatar placeholder loads instantly, no shimmer

### 18.6 Dynamic Type

Exercise card text scales with system font size. At larger sizes, the "Set [N]    [value]" format may require the set number and value to stack vertically. Minimum row height expands to accommodate. No truncation of any value — this is a historical record and all data must be fully readable at any text size.

---

## 19. Navigation Specification

### 19.1 Navigation Matrix

| Current State | Action | Result |
|---------------|--------|--------|
| W-19 | Back button | W-18 restored at prior scroll position |
| W-19 | Trained With partner row tap | Limited Athlete Profile modal opens |
| Limited Athlete Profile modal | Dismiss (back gesture or X) | Modal dismisses, W-19 restored |
| W-19 | Chapter row tap — active chapter | L-3 opens (push navigation) |
| W-19 | Chapter row tap — archived chapter | L-4 opens (push navigation) |
| W-19 | Program row tap | W-3 opens (push navigation) |
| L-3 / L-4 / W-3 | Back | Returns to W-19 |

### 19.2 Header

| Header Left | Header Title | Header Right |
|-------------|-------------|-------------|
| ← (back arrow) | — (no title) | — (no overflow) |

The header has a back arrow only. No title in the navigation bar — the session name in the hero content area serves as the screen identity. No overflow (⋯) — there are no actions on W-19.

### 19.3 Tab Bar

Bottom tab bar remains visible. W-19 is push navigation within the Workouts tab.

### 19.4 Back Navigation Behavior

Back button in W-19 → W-18 restores to the exact scroll position the athlete was at before selecting the session row. The previously selected row deselects (platform standard deselect animation).

Back navigation from L-3, L-4, or W-3 (navigated from W-19) → W-19 restores at the same scroll position the athlete left it at. Chapter and program links do not reset W-19's scroll state.

### 19.5 No W-22 from W-19

Exercise thumbnails and names in W-19 are **not tappable**. W-22 (Exercise Detail) is not accessible from W-19. The athlete reviewing a historical session is not in an exercise-research context — they are reading a record. If they want to research an exercise, they do so via W-21 or W-23.

---

## 20. Non-Behaviors

W-19 does not and will never:

| Non-Behavior |
|-------------|
| Allow editing any field — W-19 is strictly and permanently read-only |
| Allow deleting the session record — History Cannot Be Rewritten |
| Display PR indicators or "Personal Record" badges on any set |
| Compare sets to previous sessions or calculate deltas |
| Display total session volume (total lbs lifted, total distance across sessions) |
| Display calorie estimates or metabolic data |
| Display trend charts, progress graphs, or any analytics visualization |
| Provide coaching copy, suggestions, or improvement prompts |
| Display unstarted planned exercises — only what was logged is shown |
| Allow collapsing exercise cards — the exercise list is always fully expanded |
| Display a "Share" CTA (V1.1) |
| Display photos — the photo system is chapter-level, not session-level in MVP |
| Make exercise thumbnails tappable or link to W-22 from W-19 |
| Display a "Replay Workout" or "Repeat This Workout" CTA — repeating is initiated from W-3 |
| Display the W-24 planned prescription alongside the logged actuals — W-19 shows what happened, not what was planned |
| Recalculate or recompute any stat from the raw data — all stats are read directly from the session record as stored at W-17 save time |
| Show chapter attribution in alarm or muted style for archived chapters — archived chapter attribution is displayed identically to active chapter attribution |
| Display "[No Chapter]" or "[No Program]" placeholders — absent context = absent section |
| Navigate to W-22 from any exercise card (W-22 is accessible from W-23 and W-24 contexts only) |
| Show a "Loading…" indicator for exercise cards if the session record and catalog are cached — renders instantly |
| Highlight the current session as "most recent" relative to the training history — W-19 has no awareness of other sessions |
| Access deleted sessions — session records are permanent; if a sessionId is invalid, the unavailable state (§ 15.1) renders |

---

## 21. Validation Checklist

### Navigation and Presentation
- [ ] W-19 is push navigation within Workouts tab (not modal, not sheet)
- [ ] Tab bar remains visible
- [ ] Back button → W-18 at prior scroll position
- [ ] Header: back arrow only — no title, no overflow icon
- [ ] Navigation back from L-3/L-4/W-3 → W-19 at preserved scroll position

### Session Hero
- [ ] Activity type icon: 40pt, category tint color, left-aligned
- [ ] Session name: 22sp, primary weight, up to 2 lines; fallback = activity type label
- [ ] Date: "Tuesday, June 10, 2026", 15sp, muted
- [ ] Time + Duration: "[H:MM AM/PM] · [duration]", 14sp, muted
- [ ] Activity stats: activity-type-specific per § 5.2, 14sp, muted
- [ ] MOBILITY/YOGA: no additional stat line (duration is sufficient)
- [ ] Hairline separator below hero
- [ ] No tappable elements in hero

### Exercise List (STRENGTH sessions)
- [ ] Section header: "EXERCISES", 12sp, muted uppercase
- [ ] Exercises in logged order (matching session record `order` field)
- [ ] Thumbnail: 40pt × 40pt, static (ED-5 — no autoplay)
- [ ] Exercise name: 15sp, primary weight
- [ ] Set rows: "Set [N]" muted, "[weight] × [reps]" or "8 reps" (bodyweight) or "[duration]" (MOBILITY)
- [ ] Weight unit from session record snapshot — not converted
- [ ] No PR indicators, no comparison values
- [ ] Per-exercise note: 13sp, muted italic, below set list, absent if no note
- [ ] Deleted exercise: "[Deleted Exercise]" name, placeholder thumbnail, sets preserved, not tappable
- [ ] Exercise cards not tappable — no W-22 link
- [ ] Exercise list absent for non-STRENGTH sessions without exercise data

### Workout Sections in W-19
- [ ] Multi-section sessions: section labels (WARM-UP, MAIN WORKOUT, COOL-DOWN) appear as compact read-only dividers within the EXERCISES list
- [ ] Section labels appear only for sections with at least one logged exercise
- [ ] Empty sections (planned but no exercises logged) produce no label and no entry
- [ ] Single-section sessions (MAIN only, or free-form): flat exercise list, no section labels
- [ ] Section labels are not tappable — no navigation or overflow actions
- [ ] "EXERCISES" top-level section header is always a single label regardless of sections

### Activity Data (non-STRENGTH sessions)
- [ ] Section header: "ACTIVITY DATA", 12sp, muted uppercase
- [ ] Stat rows: label 14sp muted left, value 14sp primary right
- [ ] Only non-null fields displayed — no "—" placeholder rows
- [ ] Duration repeated in activity data section (even though shown in hero)
- [ ] Activity-type-appropriate fields per § 7.2

### Notes
- [ ] Notes are per-exercise, inline within exercise cards
- [ ] No standalone Notes section in MVP
- [ ] Exercise note prefix "Note:", 13sp, muted italic
- [ ] Full note text displayed — no truncation

### Photos
- [ ] No photos section in W-19 (MVP — session-level photos not in architecture)

### Program Attribution
- [ ] Section header: "PROGRAM", 12sp, muted uppercase
- [ ] Row: "[Program Name] — [Slot Name]", 15sp, primary, tappable → W-3
- [ ] Trailing chevron ›, 13pt, muted
- [ ] Program name and slot name are snapshotted values (not live-fetched)
- [ ] Section absent if session was not a program workout

### Chapter Attribution
- [ ] Section header: "CHAPTER", 12sp, muted uppercase
- [ ] Row: chapter name (snapshotted), 15sp, primary, tappable → L-3 or L-4
- [ ] Active chapter → L-3; archived chapter → L-4
- [ ] Trailing chevron ›, 13pt, muted
- [ ] Chapter name is snapshotted (not live-fetched)
- [ ] If chapter record inaccessible: name shown, muted color, not tappable, no chevron
- [ ] Section absent if unchaptered session — no "[No Chapter]" placeholder

### Workout With Friend Attribution
- [ ] Section header: "TRAINED WITH", 12sp, muted uppercase
- [ ] One row per confirmed partner (max 3)
- [ ] Avatar: 32pt circular, initials fallback
- [ ] Display name: 15sp, primary
- [ ] Trailing chevron ›, row tappable → Limited Athlete Profile modal
- [ ] Declined partners absent (not in session record)
- [ ] Section absent if no confirmed partners

### Imported Session Handling
- [ ] "Imported" label: 13sp, muted secondary italic, below hero separator
- [ ] No banner, no badge, no outlined chip
- [ ] Summary-only imports: Exercise List section absent, Activity Data section shows available fields
- [ ] Detailed imports: Exercise List renders as normal
- [ ] Historical dates display correctly

### Partial Session Handling
- [ ] "Partial" in hero activity stats line, preceded by "·"
- [ ] 14sp, muted secondary, same line as other stats — not alarmed
- [ ] Partial exercise list shows only logged exercises and sets (not planned-but-unstarted)

### Empty States
- [ ] Session unavailable: "This session is unavailable." + back link
- [ ] Exercise data load failure: inline "Exercises could not be loaded." — rest of W-19 renders

### Loading States
- [ ] Cached data: sub-200ms render, no skeleton
- [ ] Network required: skeleton hero + exercise cards + attribution blocks; back button always visible
- [ ] Data arriving within 100ms: suppress skeleton (no flash)
- [ ] Reduce Motion: static placeholder blocks, no shimmer

### Offline Behavior
- [ ] Cached sessions: fully viewable offline
- [ ] Uncached session: unavailable state (§ 15.1)
- [ ] Attribution navigation (chapter, program links) always tappable regardless of connectivity

### Accessibility
- [ ] Back button: 44pt touch target, "Back to Activity History"
- [ ] Attribution rows: 44pt minimum height, tappable
- [ ] Hero: announced as single accessible element with all fields
- [ ] Exercise card: announced with name + set count; sets announced individually
- [ ] Set rows: "[weight] [unit], [reps] reps" or "[reps] reps" for bodyweight
- [ ] Note: "Note: [text]"
- [ ] Trained With rows: "[Name]. Double-tap to view profile."
- [ ] Chapter row: "Chapter: [Name]. Double-tap to view chapter detail."
- [ ] Program row: "Program: [Name], [Slot]. Double-tap to view program."
- [ ] Reduce Motion: no shimmer, no entry animations
- [ ] Dynamic Type: no truncation at any text size

---

## 22. Decisions Record

| Decision | Value |
|----------|-------|
| W19-D1 — Completely read-only | "History Cannot Be Rewritten" is a locked product principle. The integrity of the session record is the value proposition. No field is editable. Not reps, not weight, not time, not notes. W-19 is a museum exhibit, not a form. Allowing even "minor" corrections opens a precedent that cannot be contained without architectural re-definition. |
| W19-D2 — Fully expanded exercise list | W-19 is a detail screen. The athlete is here to see the data. Collapsing exercises adds friction to a read-only review — the athlete has to interact with a screen that contains no interactive elements except attribution navigation. The data IS the record. Length is appropriate for a detail surface. |
| W19-D3 — No session photos | The photo system in MVP is chapter-level, not session-level. W-9 has no photo capture mechanism and the data model has no session-to-photo association. Displaying photos in W-19 would require architecture that does not exist. Chapter photos are accessible from W-19 via the chapter attribution link → L-3/L-4. V1.1 when session photo architecture is defined. |
| W19-D4 — WwF: display names in TRAINED WITH section | Training partners are part of the historical record. The WwF architecture (v1.1 LOCKED) stores confirmed partners in the session record. W-19 surfaces them as a named section with display names, matching the "Trained with [Name]" reference entry principle. No performance data, no partner stats. Partner tap → Limited Athlete Profile modal (same as S-2). |
| W19-D5 — Imported: subtle origin label | A session is a session. Origin does not change its validity as a historical record. However, the "Imported" label provides necessary context for athletes who notice lower data fidelity (no exercise list for summary-level imports). The label is 13sp italic muted — informational, not stigmatizing. No banner, no badge. |
| W19-D6 — Both chapter and program links | The session belongs to a chapter (the larger narrative context) and possibly a program (the training structure). Both links give the athlete natural navigation to zoom out from the session record. Chapter link routes to L-3 (active) or L-4 (archived); program link routes to W-3. Both sections absent when not applicable — no placeholder. |
| W19-D7 — No W-22 from exercise cards | W-19 exercise cards are not interactive. The athlete is reviewing history, not researching exercises. W-22 access from W-19 would conflate a historical review surface with an educational research surface. W-22 is contextually appropriate from W-23 (picker) and W-24 (builder). If the athlete wants to research an exercise, they navigate via W-21 or W-23. |
| W19-D8 — No PR indicators | PR indicators are analytics. W-19 is a history record. "135 lbs × 8" is exactly what happened on that set — not "135 lbs × 8 (PR!)". Surfacing PRs in W-19 would introduce a calculated overlay on raw history data, contradicting the principle that W-19 shows only what was logged without recalculation or reinterpretation. PRs are V1.1 on a dedicated analytics surface. |
| W19-D9 — Planned prescriptions not shown | W-19 shows what was logged during execution. Showing the W-24 planned prescription alongside logged actuals would require comparing plan records to execution records in a read-only historical surface. This conflates planning context with execution reality. The athlete who wants to compare can view W-24 and W-19 separately. |
| W19-D10 — Stats read directly from session record | W-19 displays stat values exactly as stored in the session record at W-17 save time. It does not recompute totals, recalculate paces, or re-derive any summary metric. If the session record says "12 sets," W-19 shows "12 sets" — it does not count the set rows and display the result. Recalculation would risk surfacing different values than what the athlete saw at session end. |
| W19-D11 — Archived chapter attribution same visual treatment as active | An archived chapter's session is not a lesser record than an active chapter's session. The chapter attribution link routes to L-4 instead of L-3, but the visual presentation in W-19 is identical. Muting archived chapter attribution would incorrectly imply that past chapters are less significant than the current one — the opposite of Forge Legacy's mission. |
| W19-D12 — Unstarted planned exercises absent | If a session ended before reaching planned exercises from W-24, those unstarted exercises leave no logged data and are not shown in W-19. W-19 shows what happened. Displaying planned-but-unexecuted exercises would mix the plan record with the execution record. The partial session label communicates that the session ended early — the athlete does not need to see what they didn't do. |
| W19-D13 — No session-level notes (MVP) | W-9 specifies per-exercise notes as the notes mechanism. No session-level notes field exists in the MVP session record. W-19 surfaces per-exercise notes inline within exercise cards. Session-level notes are V1.1 and would appear as a NOTES section if added to the session data model. |
| W19-D14 — No "Repeat This Workout" CTA | W-19 is a historical record surface, not a dispatch surface. Initiating a workout is the role of W-1 (Log Activity CTA) and W-3 ("Start Next Workout"). Adding a repeat CTA to W-19 conflates review with execution. The athlete who wants to repeat a program workout does so from W-3 which has the correct program context. |
| W19-D15 — No tab bar suppression | W-19 is push navigation within the Workouts tab stack. Unlike W-9 (active workout, full-screen) which suppresses the tab bar during execution, W-19 is a review surface where the tab bar remains visible. The athlete may want to navigate to Legacy tab after reviewing a session. |
| W19-D16 — Section labels within exercise list (WS-A4) | The session record's section structure is reflected in W-19 as compact read-only dividers within the EXERCISES section. This preserves the workout structure the athlete planned and executed — reviewing a W-19 for a session with WARM-UP / MAIN / COOL-DOWN sections shows that structure. Single-section and free-form sessions use the existing flat list. Empty sections (plan had the section, athlete logged no exercises in it) produce no entry — consistent with "W-19 shows what happened, not what was planned." Section labels are not interactive — no controls, no navigation, no tap targets. |

---

## 23. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Complete session detail record. Read-only throughout — no editing, no deletion. Fully expanded exercise list for STRENGTH (sets with weight × reps, per-exercise notes inline, deleted exercise graceful degradation). Activity Data section for non-STRENGTH types (type-appropriate captured stats). No session photos (chapter-level photo system only). WwF "Trained With" section (confirmed partners, display names, Limited Athlete Profile modal). Chapter attribution tappable → L-3 or L-4 by chapter state. Program attribution tappable → W-3. Imported session origin label (13sp italic muted). Partial sessions: hero "Partial" label in stats line, neutral treatment, unstarted exercises absent. Section-absent pattern for all optional sections (no placeholders). 15 decisions (W19-D1 through W19-D15). |
| v1.1 | June 2026 | WS-A4 applied (Workout Structure Amendment 001): section grouping within EXERCISES list. Section labels (WARM-UP, MAIN WORKOUT, COOL-DOWN) rendered as compact read-only dividers for multi-section sessions. Empty sections absent. Single-section/free-form sessions: flat list unchanged. W19-D16 added. Authority references updated to v1.1 for W-9, W-17, W-24. |

---

*W-19 Activity Detail — Wireframe Specification v1.0*
*Forge Legacy | June 2026*
