# Forge Legacy — Activity Type Picker Specification
## W-8 | Phase 2C | Version 1.0 — June 2026

**Status:** Lock-Ready
**Screen:** Activity Type Picker (modal sheet)
**Authority:** Forge Legacy Master PRD § 8, W-8 Architecture Review (June 2026), Product DNA
**Depends on:** W-1, H-1, W-3, W-9, W-10, W-11, W-12, W-13, W-14, W-15, W-16

---

## Preamble

W-8 is the entry point to every manually initiated workout session. Its purpose is singular: accept an activity type selection and route the athlete into the correct logging screen.

W-8 is a routing screen. It captures no workout data. It starts no timer. It creates no session record. It validates nothing. The moment the athlete taps an activity type, W-8's job is complete — it hands off to the logging screen and exits the navigation stack.

The architecture underlying W-8 was fully resolved before this specification was written. All decisions documented here are locked. None are open for reconsideration within this spec.

---

## Architecture Decisions

All decisions in this section are locked per the W-8 Architecture Review (June 2026). No decision is open.

### Decision 1 — W-8 Is a Pure Routing Screen

**Locked.** W-8 selects an activity type and routes. It does not create a session record. It does not start the elapsed timer. It does not capture or persist any athlete data. The session record is created when the athlete arrives at the active workout screen (W-9 through W-16).

### Decision 2 — Canonical Activity Type List: 9 Types

**Locked.** The MVP activity types are:

Strength, Run, Walk, Bike, Swim, HIIT, Mobility, Yoga, Other

The ActivityType enum is:

```
STRENGTH | RUN | WALK | BIKE | SWIM | HIIT | MOBILITY | YOGA | OTHER
```

This enum is append-only post-launch. Values may be added in future releases. No existing value may be renamed or removed without a data migration.

### Decision 3 — HIIT Is an MVP Type

**Locked.** HIIT (rounds-based interval training) is included in MVP. WOD (Workout of the Day, with complex scoring variants: AMRAP, RFT, EMOM) remains post-MVP. HIIT routes to W-14, which provides a rounds counter and elapsed timer.

### Decision 4 — Mobility and Yoga Are Separate Types, Shared Screen

**Locked.** Mobility and Yoga are two distinct values in the ActivityType enum (MOBILITY, YOGA). Both route to W-15. W-15's title bar adapts to the selected type — it renders "Mobility" when MOBILITY is passed and "Yoga" when YOGA is passed. The logging interface is identical for both types. The stored record preserves the specific type, not a merged parent.

### Decision 5 — Other Routes to W-16; Custom Name Entered at W-16

**Locked.** W-8 is a pure routing screen for all 9 types including Other. When the athlete selects Other, W-8 routes to W-16. W-16 presents an editable "Activity Name" field pre-filled with "Other." The athlete renames the activity at W-16. No text entry occurs on W-8.

### Decision 6 — Untyped Program Slots Launch W-8

**Locked.** When a program workout slot has no activity type set (permitted by W-4), tapping "Start Next Workout" on W-3 launches W-8. W-8 displays a program context line identifying the program and workout number. The athlete selects a type, which applies only to that session. The type selection does not write back to the program template slot. The slot remains untyped.

### Decision 7 — Pre-Typed Program Slots and Quick-Select Chips Bypass W-8

**Locked.** When a program workout slot has an activity type set, "Start Next Workout" on W-3 routes directly to the appropriate active workout screen. W-8 is not shown. Similarly, tapping a quick-select chip on W-1 routes directly to the active workout screen for that type. W-8 is not shown in either case.

### Decision 8 — W-8 Works Fully Offline

**Locked.** The activity type list is static and embedded in the app. W-8 requires no network request to render or function. W-8 is fully operational without a network connection.

---

## Section 1 — Purpose

W-8 has one purpose: route the athlete into the correct active workout logging screen based on the activity type they select.

W-8 answers a single question: **"What kind of workout are you starting?"**

It does not begin the workout. It does not record anything. It does not persist anything (except when an untyped program slot is involved — and even then, persistence is to the session, not the program template). It is an intent declaration, not a data entry screen.

**W-8 succeeds when:**
1. The athlete can identify and tap their intended activity type in under 3 seconds
2. The selected type routes to the correct active workout screen
3. The athlete understands their context (program or free) without any additional navigation
4. The screen feels lightweight and fast — a momentary decision, not a menu to study

**W-8 fails when:**
- The athlete must think for more than a few seconds about which type to select
- Routing is incorrect for any type
- Program context is absent when arriving from an untyped program slot
- Any data is written to the session record before the athlete arrives at the active workout screen
- The elapsed timer is running when the athlete arrives at the active workout screen

---

## Section 2 — Screen Goals

**Primary goal:** Route the athlete to the correct active workout screen in the minimum number of taps.

**Constraint:** Three taps, no excuses. The path from H-1 to first data logged must never exceed three taps. W-8 occupies tap 2. The active workout screen is tap 3 (first data entry). This constraint is a hard ceiling.

**Emotional outcome: Ready.**

The athlete has decided to train. W-8 is the last step before the workout begins. It should feel fast and clear — a gate, not a menu. The screen should read at a glance. The athlete should not feel like they are filling out a form.

---

## Section 3 — Entry Points

W-8 is opened from three confirmed entry points:

### 3.1 H-1 "Start Workout" CTA

**Condition:** No active program exists.

The H-1 workout CTA shows "Start Workout" when no active program is enrolled. Tapping it opens W-8. This is the primary entry point for athletes not following a program.

When an active program exists, the H-1 CTA shows "Continue Program" and routes directly to the program's next workout without opening W-8.

### 3.2 W-1 "Log Activity" CTA

**Condition:** Always present on W-1.

The Workouts Hub has a persistent "Log Activity" CTA. Tapping it opens W-8 regardless of program state, chapter state, or training history.

### 3.3 W-1 "More →" Chip

**Condition:** The quick-select row on W-1 shows the athlete's 2–3 most recently used activity types. When more types exist beyond the displayed chips, a "More →" chip appears at the end. Tapping "More →" opens W-8, presenting all 9 types.

### 3.4 W-3 "Start Next Workout" — Untyped Program Slot

**Condition:** The program's next workout slot has no activity type set.

When the active program's next workout slot is untyped (type not assigned during program creation in W-4), tapping "Start Next Workout" on W-3 opens W-8. W-8 displays a program context line (Section 8) identifying the program and workout number.

---

## Section 4 — Bypass Paths

W-8 is bypassed in three confirmed scenarios. The athlete proceeds directly to the active workout screen.

### 4.1 W-1 Quick-Select Chip Tap

The athlete taps a specific activity type chip on the W-1 quick-select row (e.g., "Strength"). W-8 is not opened. The athlete routes directly to the active workout screen for that type as if they had selected that type on W-8.

### 4.2 H-1 "Continue Program" CTA

When an active program exists, H-1 shows "Continue Program." Tapping it routes directly to the active workout screen for the program's next workout. The activity type is inherited from the program slot's type field. W-8 is not opened.

### 4.3 W-3 "Start Next Workout" — Typed Program Slot

When the active program's next workout slot has a type assigned (set during program creation in W-4 or editing in W-5), tapping "Start Next Workout" on W-3 routes directly to the active workout screen for that type. W-8 is not opened.

---

## Section 5 — Screen Format

### 5.1 Format: Full-Screen Modal Presentation

W-8 is a full-screen modal. It presents over the originating screen (H-1, W-1, or W-3) as a full-screen context change. W-8 is not a pushed navigation screen in the destination sense — dismissing it (via Cancel or back gesture) returns the athlete to the exact state of the originating screen.

**Full-screen format rationale:** W-8 initiates the training session — the central act that Forge Legacy is built around. A full-screen presentation communicates a deliberate context change: the athlete is entering a new mode. A partial-height sheet was evaluated and rejected due to accidental dismissal risk (tapping the dimmed region above the top-row grid tiles), scalability ceiling (strains at 12+ types), and semantic mismatch with the weight of workout initiation. See Format Amendment 001 (June 2026).

**Platform presentation:** iOS — standard full-screen modal presentation (card style). Android — full-screen activity with slide-up transition.

**One-handed usability:** The type grid is positioned in the lower two-thirds of the screen via intentional vertical spacing above it. This anchors all 9 tiles in or near the natural thumb zone, reproducing the ergonomic advantage of a bottom sheet without the accidental-dismissal risk.

### 5.2 Screen Anatomy

```
┌────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                         │
├────────────────────────────────────────────┤
│  ✕                                         │  ← Close (top-left, always visible)
│                                            │
│  Log Activity                              │  ← Screen title
│  [Program Name] · Workout [N]             │  ← Program context (conditional)
│                                            │
│                                            │
│                                            │  ← Vertical spacer: anchors grid
│                                            │     to lower two-thirds of screen
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  [icon]  │ │  [icon]  │ │  [icon]  │  │
│  │ Strength │ │   Run    │ │   Walk   │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  [icon]  │ │  [icon]  │ │  [icon]  │  │
│  │   Bike   │ │   Swim   │ │   HIIT   │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  [icon]  │ │  [icon]  │ │  [icon]  │  │
│  │ Mobility │ │   Yoga   │ │  Other   │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                                            │
│  [bottom safe area]                        │
└────────────────────────────────────────────┘
```

### 5.3 Screen Title

"Log Activity" — 17sp, primary weight, left-aligned. Always present.

### 5.4 Program Context Line

Conditional. Present only when W-8 is opened from an untyped program slot (Section 8). Absent for all other entry points.

Format: `[Program Name] · Workout [N]` — 13sp, muted, left-aligned. Below the sheet title.

### 5.5 Activity Type Grid

3×3 grid of tappable tiles. Each tile contains:
- An icon (assigned during design phase; one icon per activity type)
- A label (activity type display name) — 13sp, primary, centered below icon

Grid fills the available width with equal tile sizes and consistent gutters.

### 5.6 Cancel Affordance

"Cancel" — centered, 15sp, muted or secondary color. Minimum tap target 44dp height. Positioned below the grid with sufficient vertical spacing. Behaves identically to a back gesture (Section 9).

---

## Section 6 — Activity Type List

The complete 9-type list in grid order (left-to-right, top-to-bottom):

| Position | Display Name | ActivityType Enum Value | Routes To |
|----------|-------------|------------------------|-----------|
| 1 (row 1, col 1) | Strength | STRENGTH | W-9 |
| 2 (row 1, col 2) | Run | RUN | W-10 |
| 3 (row 1, col 3) | Walk | WALK | W-11 |
| 4 (row 2, col 1) | Bike | BIKE | W-12 |
| 5 (row 2, col 2) | Swim | SWIM | W-13 |
| 6 (row 2, col 3) | HIIT | HIIT | W-14 |
| 7 (row 3, col 1) | Mobility | MOBILITY | W-15 |
| 8 (row 3, col 2) | Yoga | YOGA | W-15 |
| 9 (row 3, col 3) | Other | OTHER | W-16 |

**Grid order rationale:** The first row leads with the three most common activity types for Forge Legacy's primary user base (resistance athletes who also do cardio). HIIT anchors the end of the second row — present but not primary. Mobility and Yoga pair naturally in the third row. Other occupies the final position — accessible but visually subordinate, consistent with its catch-all function.

**Display names are final.** The enum values are internal. The athlete sees only the display names above.

**No descriptions, no subtitles, no tap counts, no history indicators on the grid.** Each tile is label + icon only. The athlete already knows what these words mean.

---

## Section 7 — Routing Table

| Athlete Selects | ActivityType Passed | Active Workout Screen | Screen Behavior |
|----------------|--------------------|-----------------------|-----------------|
| Strength | STRENGTH | W-9 | Set/rep matrix; exercise list |
| Run | RUN | W-10 | Elapsed timer + manual distance |
| Walk | WALK | W-11 | Elapsed timer + manual distance (architecture identical to W-10) |
| Bike | BIKE | W-12 | Elapsed timer + manual distance + elevation |
| Swim | SWIM | W-13 | Elapsed timer + laps counter |
| HIIT | HIIT | W-14 | Rounds counter + elapsed timer |
| Mobility | MOBILITY | W-15 | Elapsed timer + notes; W-15 title = "Mobility" |
| Yoga | YOGA | W-15 | Elapsed timer + notes; W-15 title = "Yoga" |
| Other | OTHER | W-16 | Activity name (editable at W-16) + elapsed timer + notes |

**All 9 types converge on W-17 (Workout Summary) after session save.** The active workout screens differ; the post-session flow does not.

**W-8 is dismissed from the navigation stack** when the athlete selects a type and the active workout screen is presented. The athlete cannot navigate back to W-8 from within the active workout session. To change activity type, the athlete must abandon the session via the abandonment flow on the active workout screen.

---

## Section 8 — Program Context Behavior

### 8.1 When Program Context Appears

Program context appears on W-8 when and only when the entry point is an untyped program workout slot (Section 3.4). All other entry points show no program context.

### 8.2 Context Line Format

```
[Program Name] · Workout [N]
```

- `[Program Name]`: the name of the active program (e.g., "Power Block — Cycle 1")
- `[N]`: the sequential workout number within the program (e.g., 3 for the third workout)
- Separator: "·" (middle dot), single space on each side
- Typography: 13sp, muted, left-aligned
- Position: directly below the "Log Activity" sheet title

**Example:**
```
Log Activity
Power Block — Cycle 1 · Workout 3
```

### 8.3 Context Line Behavior

The program context line is read-only. It is not tappable. It does not navigate to W-3 or any other program screen. It is informational only.

Its purpose is to confirm to the athlete that the type they select will be applied to a specific program workout, not a free workout. This prevents the athlete from accidentally selecting the wrong type for a program session.

### 8.4 Type Selection and Program Template Non-Modification

When the athlete selects a type on W-8 from an untyped program slot, the selected type applies to the current session only. The program slot in the program template remains untyped. No write-back occurs.

If the athlete abandons the session and starts the same program workout again, W-8 launches again with the same context line. The athlete selects a type again. This behavior is intentional — the slot is a template that allows the athlete to vary activity type across executions if desired.

### 8.5 Program Workout Number Calculation

`[N]` is the sequential number of the workout slot within the program's workout list, regardless of completion status. Workout 3 is always the third workout in the program's list. It does not reflect "3rd completed" or "3rd remaining" — it is a fixed position identifier.

---

## Section 9 — Back and Cancel Behavior

### 9.1 Cancel Tap

Tapping "Cancel" dismisses W-8 and returns the athlete to the originating screen:

| Entry Point | Cancel Destination |
|------------|-------------------|
| H-1 "Start Workout" | H-1 (unchanged state) |
| W-1 "Log Activity" | W-1 (unchanged state) |
| W-1 "More →" | W-1 (unchanged state) |
| W-3 untyped slot | W-3 (unchanged state) |

### 9.2 Back Gesture

The platform back gesture (swipe right from the left edge on iOS; system back button or gesture on Android) dismisses W-8 and returns the athlete to the originating screen. Behavior is identical to Cancel.

There is no drag-to-dismiss on W-8. W-8 is a full-screen modal — not a bottom sheet. Accidental dismissal via swipe is eliminated by design.

### 9.3 No State Change on Cancel

Canceling W-8 — via Close button, back gesture, or system back — has no side effects. No session record is created. No type selection is recorded. No program state is modified. The originating screen is in the exact state it was in before W-8 opened.

---

## Section 10 — Offline Behavior

W-8 is fully offline-capable.

The activity type list is static and embedded in the app binary. No network request is made to render the W-8 sheet, populate the type grid, display the program context line, or process a type selection. W-8 functions identically online or offline.

The active workout screens (W-9 through W-16) also function offline — local storage writes synchronously on every set log, with cloud sync occurring when connection becomes available. W-8 contributes zero network complexity to the offline story.

No error handling or offline state indicator is needed on W-8. There is nothing to fail.

---

## Section 11 — Mobile UX

### 11.1 Orientation

W-8 is portrait-only.

### 11.2 Tab Bar

The system Tab Bar is not visible while W-8 is open. W-8 is a full-screen modal. Standard platform behavior: full-screen modals occlude the tab bar.

### 11.3 Tap Targets

| Element | Minimum Tap Target |
|---------|-------------------|
| Activity type tile | 72×72dp minimum (tile dimensions set to accommodate icon + label comfortably) |
| Close button (✕) | 44×44dp |

### 11.4 Grid Tile Visual States

| State | Behavior |
|-------|---------|
| Default | Icon + label at rest |
| Pressed | Standard platform tap highlight (brief, immediate) |
| Selected | No selected state — W-8 dismisses immediately on tap; no lingering selection indicator |

Tap registers immediately on touch-up. No tap delay. No confirmation step. Type is selected → W-8 dismisses → active workout screen appears.

### 11.5 Haptics

A single light impact haptic fires when the athlete selects a type (touch-up), consistent with the tap haptic pattern used elsewhere in the app. No haptic on Cancel.

### 11.6 Animation

W-8 opens with a standard full-screen modal presentation animation — slide up from the bottom of the screen (iOS card presentation; Android activity transition). W-8 dismisses with a corresponding slide-down back to the originating screen.

The transition from W-8 to the active workout screen (W-9 through W-16) is a push navigation within the modal stack — W-8 slides left as the active workout screen slides in from the right. This signals forward progress: the type was selected, the session is beginning. No intermediate dismissal-then-push sequence.

---

## Section 12 — Accessibility

### 12.1 Screen Title

- `accessibilityLabel` = "Log Activity, select an activity type"
- `accessibilityRole` = "header"

### 12.2 Program Context Line (when present)

- `accessibilityLabel` = "Selecting activity type for [Program Name], workout [N]"
- `accessibilityRole` = "text"
- Not in the interactive element tree (no button role)

### 12.3 Activity Type Tiles

Each tile:
- `accessibilityLabel` = "[Display Name], activity type" (e.g., "Strength, activity type", "HIIT, activity type")
- `accessibilityRole` = "button"

### 12.4 Close Button

- `accessibilityLabel` = "Cancel, return to previous screen"
- `accessibilityRole` = "button"

### 12.5 VoiceOver / TalkBack Navigation Order

1. Sheet title ("Log Activity, select an activity type")
2. Program context line, if present ("Selecting activity type for…")
3. Activity type tiles, left-to-right, top-to-bottom: Strength → Run → Walk → Bike → Swim → HIIT → Mobility → Yoga → Other
4. Cancel affordance

### 12.6 Dynamic Type

Activity type tile labels must scale with Dynamic Type. If a label exceeds one line at the largest Dynamic Type settings, the icon may be reduced or omitted to preserve legibility of the label. The label is the primary identity — it must always be readable.

---

## Section 13 — Edge Cases

### 13.1 Active Chapter Becomes Sealed While W-8 Is Open

An athlete has W-8 open. On another device (or via a concurrent session), their active chapter is sealed.

W-8 is pre-session. Chapter attribution is captured at the moment the athlete arrives at the active workout screen (W-9 through W-16), not at W-8 selection. If the chapter is sealed while W-8 is open and the athlete selects a type, they enter the active workout screen with no active chapter. The session is attributed to whatever chapter is active at that entry moment — which may be null.

This is consistent with the general attribution rule (attribution captured at session start, where session start = arrival at active workout screen). W-8 has no chapter-awareness and requires no special handling.

### 13.2 Active Program Graduates or Ends While W-8 Is Open From Untyped Slot

An athlete has W-8 open, entered from an untyped program slot. The program is graduated or ended on another device while W-8 is open.

W-8 has no program-awareness beyond the static context line. The athlete selects a type, enters the active workout screen, and logs a session. The active workout screen handles program attribution for the session. W-8's program context line may be stale at this point, but this is a harmless edge case — the athlete selects their type, the session is logged, and program attribution is handled downstream.

### 13.3 App Goes to Background While W-8 Is Open

If the app goes to background while W-8 is open, W-8 remains in its current state on resume. No data has been captured; no session has started. The athlete is returned to the W-8 sheet exactly as they left it. No recovery or resumption logic required.

### 13.4 Program Context Line for a Long Program Name

If the program name is long (e.g., "Advanced 12-Week Powerlifting Cycle — Phase 2"), the context line truncates with an ellipsis at the edge of the available width. Truncation is acceptable — the athlete enrolled in this program and knows its name. The workout number is always fully visible (right-aligned or on its own line if truncation risks the workout number).

### 13.5 W-3 Workout Number for Graduated or Ended-Early Programs

This edge case cannot occur. W-8 only opens from W-3 for the active program's next untyped workout. Graduated and ended-early programs have no "next workout" — the "Start Next Workout" CTA is absent on W-3 for completed programs. W-8 cannot be launched from a non-active program.

### 13.6 Quick-Select Row Depleted by Variety

The W-1 quick-select row shows the athlete's 2–3 most recently used types. If the athlete has logged workouts of many different types with no repeats recently, the quick-select row may show 2–3 types that are not the one they want today. The athlete taps "More →" to open W-8 and see the full list. This is the intended flow. No edge case concern.

### 13.7 Brand-New Athlete (No Workout History)

A brand-new athlete taps "Start Workout" on H-1 for the first time. W-8 opens. The full 9-type grid is displayed. No personalization, no history, no quick-select context exists yet. This is the intended first-time experience. W-8 looks identical for a brand-new athlete and a veteran athlete — the type list is always the complete canonical list.

---

## Section 14 — Non-Behaviors

The following behaviors explicitly do not occur on W-8. This list exists to prevent scope creep during implementation and to communicate unambiguous intent.

1. **W-8 does not create a WorkoutSession record.** Session records are created when the athlete arrives at the active workout screen (W-9 through W-16).

2. **W-8 does not start the elapsed timer.** The session timer begins on the active workout screen.

3. **W-8 does not write the athlete's type selection back to the program template.** When launched from an untyped program slot, the selection applies to the session only. The slot remains untyped.

4. **W-8 does not display WOD options.** WOD is post-MVP. It is not listed, hinted at, or shown as "coming soon."

5. **W-8 does not display custom activity type creation.** Custom user-defined types (user-created beyond the 9 canonical types) are post-MVP. No input field or "Add Custom Type" affordance is present.

6. **W-8 does not display workout templates.** Template browsing (W-6/W-7) is post-MVP. No "Browse Templates" option is present on W-8.

7. **W-8 does not filter or hide activity types based on the athlete's chapter, goals, or history.** All 9 types are always visible and selectable regardless of context.

8. **W-8 does not recommend an activity type.** No type is highlighted, pre-selected, or visually distinguished as recommended. The grid is neutral.

9. **W-8 does not display goal context.** The athlete's current goals are not shown, referenced, or connected to type selection on W-8.

10. **W-8 does not display chapter context.** The active chapter name, progress, or status is not shown on W-8.

11. **W-8 does not validate the type selection against a program prescription.** If an athlete's typed program slot prescribes Strength but W-8 is shown for an untyped slot, and the athlete selects Yoga, no warning or confirmation is shown. (This scenario applies only to untyped slots, where no prescription exists.)

12. **W-8 does not accept "Other" custom name input.** The athlete enters the custom activity name at W-16, not W-8.

13. **W-8 does not make any network requests.** No data is sent or received while W-8 is open.

14. **W-8 does not perform any analytics tracking beyond the standard session event** ("W-8 opened", "type selected: X"). No goal inference, no recommendation logging, no behavioral analysis at this screen.

---

## Section 15 — Required Amendments

### Amendment 1 — PRD Section 8 (Activity Type List and Screen Mapping)

**Current state:** PRD § 8 defines 8 activity types mapped to screens W-9 through W-16. W-14 = Mobility, W-15 = Yoga.

**Required update:**
- Activity type count: 8 → 9
- W-14: Mobility → HIIT/Circuit (rounds counter + elapsed timer)
- W-15: Yoga → Yoga and Mobility (shared screen; title adapts to type)
- ActivityType enum: Add HIIT to the 8-value list, yielding: STRENGTH, RUN, WALK, BIKE, SWIM, HIIT, MOBILITY, YOGA, OTHER
- Note: Mobility and Yoga are two distinct ActivityType values. Both route to W-15. W-15 renders the correct title based on the type passed from W-8.

### Amendment 2 — W-9–W-16 Active Workout Flow Spec

**Current state:** W-15 is described as "Yoga/Mobility (combined)." W-14 is HIIT/Circuit (consistent with this spec — no change to W-14). The description of W-15 does not distinguish the two types.

**Required update:**
- W-15 description: Update to reflect that W-15 serves two distinct activity types: Yoga (YOGA) and Mobility (MOBILITY). The logging interface is identical for both. The screen title bar renders "Yoga" when entered from a Yoga selection and "Mobility" when entered from a Mobility selection. No structural change to the W-15 logging interface.

### Amendment 3 — W-4 Program Creation Spec

**Current state:** The workout slot type chip row shows 8 chips: [Strength] [Run] [Walk] [Bike] [Swim] [Mobility] [Yoga] [Other]

**Required update:**
- Add HIIT chip to the chip row: [Strength] [Run] [Walk] [Bike] [Swim] [HIIT] [Mobility] [Yoga] [Other]
- No structural change to the slot data model — the `type?: ActivityType` optional field already accepts any enum value.

---

## Section 16 — Downstream Notes

These items are not W-8 concerns but were identified during the W-8 architecture review and must be communicated to the relevant spec authors.

### Import Specification (Architecture Amendment 001)

The canonical ActivityType enum is now locked: STRENGTH, RUN, WALK, BIKE, SWIM, HIIT, MOBILITY, YOGA, OTHER.

All WorkoutSession records — including records created by the import flow — require an `activityType` field. Architecture Amendment 001 does not currently specify how imported workout records are assigned an activity type.

The import spec (W-IM-1 through W-IM-4) must be updated to define:
- Whether the import file is expected to include an activity type column
- What column name or header is accepted
- How the parser maps raw values to the canonical enum (case-insensitive matching recommended)
- What happens when a value is unrecognized or absent (default to OTHER recommended)
- Whether W-IM-2 (Import Review) surfaces the mapped activity types for athlete review and correction

### Honors Architecture

HIIT is now a named MVP activity type. If the honors system includes type-specific first-activity honors (e.g., "First Run," "First Swim"), a "First HIIT" honor (or equivalent naming) should be considered. The honors architecture team should be informed that HIIT is in the canonical type list.

---

## Section 17 — Downstream Dependencies

| Dependency | What W-8 Requires | Status |
|------------|------------------|--------|
| W-9 Strength | Routing destination for STRENGTH | Specced — locked |
| W-10 Run | Routing destination for RUN | Specced — locked |
| W-11 Walk | Routing destination for WALK | Specced — locked |
| W-12 Bike | Routing destination for BIKE | Specced — locked |
| W-13 Swim | Routing destination for SWIM | Specced — locked |
| W-14 HIIT | Routing destination for HIIT | Specced — locked |
| W-15 Yoga/Mobility | Routing destination for YOGA and MOBILITY; title adaptation | Specced — requires Amendment 2 |
| W-16 Other | Routing destination for OTHER | Specced — locked |
| W-1 Workouts Hub | Entry point "Log Activity" and "More →" | Specced — locked |
| H-1 Home Screen | Entry point "Start Workout" | Specced — locked |
| W-3 Program Detail | Entry point for untyped program slots | Specced — locked |
| ActivityType enum | Canonical 9-value enum | Locked by this spec |

---

## Section 18 — Validation Checklist

### Entry Points
- [ ] H-1 "Start Workout" CTA (no active program) opens W-8
- [ ] W-1 "Log Activity" CTA opens W-8
- [ ] W-1 "More →" chip opens W-8
- [ ] W-3 "Start Next Workout" (untyped slot) opens W-8 with program context line
- [ ] W-3 "Start Next Workout" (typed slot) does NOT open W-8 — routes directly to active workout screen
- [ ] W-1 quick-select chip tap does NOT open W-8 — routes directly to active workout screen
- [ ] H-1 "Continue Program" does NOT open W-8 — routes directly to active workout screen

### Activity Type Grid
- [ ] All 9 types visible: Strength, Run, Walk, Bike, Swim, HIIT, Mobility, Yoga, Other
- [ ] No additional types shown (no WOD, no custom types, no templates)
- [ ] No type missing from the grid
- [ ] Grid order correct: Strength / Run / Walk | Bike / Swim / HIIT | Mobility / Yoga / Other

### Routing
- [ ] Strength → W-9
- [ ] Run → W-10
- [ ] Walk → W-11
- [ ] Bike → W-12
- [ ] Swim → W-13
- [ ] HIIT → W-14
- [ ] Mobility → W-15 with title "Mobility"
- [ ] Yoga → W-15 with title "Yoga"
- [ ] Other → W-16 (no name entry on W-8)

### Program Context
- [ ] Context line present when W-8 is opened from untyped program slot
- [ ] Context line absent when W-8 is opened from free workout entry points
- [ ] Context line format: "[Program Name] · Workout [N]"
- [ ] Context line is not tappable
- [ ] Type selection from untyped slot does NOT modify program template
- [ ] Athlete can reach same untyped slot again and W-8 opens again (no retroactive typing)

### Session Behavior
- [ ] No WorkoutSession record created while W-8 is open
- [ ] No elapsed timer running while W-8 is open
- [ ] Cancel (Close button) returns to originating screen with no state change
- [ ] Back gesture behaves identically to Cancel
- [ ] No drag-to-dismiss behavior (full-screen modal — not a sheet)
- [ ] W-8 transitions forward to active workout screen on type selection (push within modal stack)

### Offline
- [ ] W-8 renders correctly with no network connection
- [ ] All 9 types selectable with no network connection
- [ ] No network request fired while W-8 is open or during type selection

### Non-Behaviors
- [ ] "Other" type does NOT show a name entry field on W-8
- [ ] No WOD option visible
- [ ] No "Browse Templates" or template entry point visible
- [ ] No goal context or chapter context displayed
- [ ] No type filtering or type recommendations displayed
- [ ] No pre-selected or highlighted type in the grid

### Accessibility
- [ ] Each tile: `accessibilityLabel` = "[Display Name], activity type"
- [ ] Each tile: `accessibilityRole` = "button"
- [ ] Program context line: `accessibilityLabel` = "Selecting activity type for [Program Name], workout [N]" (when present)
- [ ] Screen title: `accessibilityLabel` = "Log Activity, select an activity type"
- [ ] Close button: `accessibilityLabel` = "Cancel, return to previous screen"
- [ ] VoiceOver order: title → context (if present) → Strength → Run → Walk → Bike → Swim → HIIT → Mobility → Yoga → Other → Close button

---

## Change Log

### Format Amendment 001 — June 2026

Screen format revised from partial-height modal sheet to full-screen modal presentation. Rationale: accidental dismissal risk (tapping dimmed region above top-row grid tiles directly violated the three-tap constraint via error loop), long-term scalability ceiling (sheet strains at 12+ types), and semantic mismatch between a bottom sheet's "quick, dismissible" register and the weight of workout initiation. Full-screen modal eliminates outside-tap and drag-to-dismiss dismissal paths; establishes deliberate context-change signal consistent with Product DNA's "Deliberate Interaction" principle; scales cleanly to 15+ types and future additions (templates, recent workouts, category grouping). Grid anchored to lower two-thirds of screen via intentional vertical spacer, preserving one-handed usability. Sections updated: 5.1, 5.2, 5.3, 9.2, 9.3, 11.2, 11.3, 11.6, 12.1, 12.4, validation checklist.

### v1.0 — June 2026

Initial specification. W-8 defined as a pure routing screen with no data capture, no session creation, and no timer initiation. Nine canonical activity types established: Strength, Run, Walk, Bike, Swim, HIIT, Mobility, Yoga, Other. ActivityType enum locked as append-only: STRENGTH, RUN, WALK, BIKE, SWIM, HIIT, MOBILITY, YOGA, OTHER. HIIT included in MVP; WOD confirmed post-MVP. Mobility and Yoga specified as separate ActivityType values sharing W-15 with adaptive title rendering. Other routes to W-16 with custom name entered at W-16, not W-8. Three confirmed entry points (H-1 "Start Workout," W-1 "Log Activity," W-1 "More →") and one conditional entry point (W-3 untyped program slot). Three confirmed bypass paths (W-1 quick-select chips, H-1 "Continue Program," W-3 typed program slot). Program context line specified for untyped slot entry with explicit non-write-back rule. Three required amendments documented (PRD § 8, W-9–W-16, W-4). Import spec and honors architecture flagged as downstream consumers of the locked type list. All nine types converge on W-17 post-session. Fourteen explicit non-behaviors documented.

---

*Forge Legacy Activity Type Picker Specification — W-8*
*v1.0 — June 2026*
*Authority: Master PRD § 8, W-8 Architecture Review (June 2026), Product DNA*
