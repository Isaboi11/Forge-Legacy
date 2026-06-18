# Forge Legacy — Active Workout Flow Specification
## W-9 through W-16 | Phase 2B | Version 1.1 — June 2026

---

## Preamble: The Engine Room

The workout tracker is the engine. The Legacy is the product.

W-9 through W-16 are where that engine runs. The athlete is here to work. Every design decision in the Active Workout Flow answers to one obligation: keep the athlete working without friction.

The Active Workout Flow answers one question: **"What am I doing right now?"**

The answer must be immediately visible the moment a workout screen loads. The athlete should never feel lost — not between sets, not between exercises, not after a rest. The screen always knows where the athlete is in the session, and the athlete always knows too.

**What the Active Workout Flow must accomplish:**
- Execute training with minimum friction between intent and input
- Support program-following athletes with pre-loaded structure
- Maintain chapter context throughout the session without interrupting it
- Deliver a complete session record to W-17 Workout Summary

**What the Active Workout Flow must never become:**
- A performance analytics surface — no trend lines, no comparison to prior sessions, no personal records celebration mid-workout
- A social platform — no squad feed, no partner leaderboard, no mid-session sharing
- A gamification engine — no streaks, no badges, no reward popups
- A source of anxiety — no timers that shame, no "you're behind your goal" messaging

**The workout flow should leave the athlete feeling:** "I know exactly what I am doing."

Not motivated. Not competitive. Focused.

The Legacy tab is where training becomes meaningful. The Active Workout Flow is where it is made.

---

## Section 1 — Active Workout Flow Goals

The Active Workout Flow exists to accomplish four things:

1. **Execute training** — get the athlete from session start to session end with the least possible interruption
2. **Support programs** — surface the prescribed exercise, target weight, and target reps at the moment the athlete needs them
3. **Advance goals** — every logged set is chapter material; the connection between effort and legacy is maintained without being performed
4. **Feed the chapter** — session data flows automatically to W-17, which flows to L-3 Chapter Detail; the athlete does not manage this flow manually

**What the Active Workout Flow answers:**
- What exercise am I doing?
- What set am I on?
- What weight and reps does my program prescribe?
- How many sets have I done in this session?
- What chapter is this workout building?

**What the Active Workout Flow does NOT answer:**
- How does this compare to my last session?
- How many calories have I burned?
- Am I trending up in strength?
- How many workouts have I done this month?
- What is my squad doing right now?

**Why this scope:**
The athlete in a workout has one job: complete the next rep. Anything that draws attention away from that job is friction, not feature. Analytics and reflection belong in W-17 (immediately after the session) and L-3 (when the athlete chooses to review). During the workout, the screen is in service of the athlete's body, not their data.

---

## Section 2 — Entry Points Into Active Workout

### 2.1 Entry Point Summary

| Entry Point | Source | Context Carried |
|-------------|--------|-----------------|
| Quick-select chip tap | W-1 Log Activity Entry Point | Activity type — no program, free workout |
| "Log Activity" → W-8 → activity type | W-1 → W-8 activity picker | Activity type — no program |
| "Start Next Workout" | W-1 Program Card | Program name, version, workout name, exercise list, targets |
| H-1 Hero CTA (direct dispatch) | H-1 Home | Activity type — chapter context from active chapter |

### 2.2 Free Workout Entry

The athlete taps a quick-select chip or navigates via W-8. The appropriate logging screen (W-9 through W-16) loads with:
- Activity type from the entry point
- Chapter context populated from the active chapter (if one exists)
- No program context — program strip omitted
- Exercise list: empty for first-time athletes; carrying forward last session's exercise structure for returning athletes (see Section 10)

### 2.3 Program Workout Entry

The athlete taps "Start Next Workout" from a program card on W-1. The appropriate logging screen loads with:
- Activity type from the program prescription
- Chapter context from the active chapter (if one exists)
- Program name, version, and workout number visible in the context strip
- Exercise list pre-populated from the slot's `sections[]` — exercises organized by section (WARM-UP → MAIN → COOL-DOWN), with section headers displayed between groups when a section has exercises
- Set count and targets (weight × reps) pre-populated per exercise
- Workout name from the program (e.g., "Week 2 · Upper Body Strength")
- Empty sections (present in the plan but with no exercises) are not rendered in W-9 — they have no execution footprint

The athlete arrives at a screen that already knows what to do. Their first action is to begin.

### 2.4 Entry Principle

Regardless of entry point, the athlete should be able to log their first input within two taps of landing on the workout screen:
- **Program workout:** screen loads → tap first set row → log set (2 taps)
- **Free workout with prior history:** screen loads → first exercise carries forward from last session → tap first set row (2 taps)
- **First-ever free workout:** screen loads → tap "+ Add Exercise" → select → log set (additional setup taps acceptable as a first-time experience exception)

The 3-tap rule is satisfied for program workouts and returning-athlete quick-select paths. First-time free workouts require more setup; this is correct behavior.

---

## Section 3 — Workout Session Information Hierarchy

During an active workout, all information on screen answers to a strict priority ordering. The athlete is executing. Screen real estate is allocated by urgency, not by completeness.

**TIER 1 — Current Action (what to do right now)**
The next set to log. Exercise name, set number, program target if applicable. This is the dominant element at all times. If the athlete glances at the screen between sets, this is what they see. Every other element yields to this.

**TIER 2 — Session Context (what this workout is)**
Chapter attribution and program context. Compact, persistent, not dominant. Always visible so training never feels disconnected from purpose. Never large enough to compete with Tier 1 for visual weight.

**TIER 3 — Session Progress (what I have done)**
Logged sets for the current and completed exercises. These exist so the athlete can track their position within the session without navigating away. They are passive — the athlete reads them; the screen does not call attention to them.

**TIER 4 — Session Controls (what I can do)**
Add exercise, access exercise notes, navigate via scroll. These are available but not in the primary visual field. Accessed by intentional action, never accidentally triggered.

**TIER 5 — Session Exit (when I am done)**
"End Workout" CTA. Persistently accessible — the athlete should never feel trapped in a session — but visually subordinate to all workout content. The exit path is clear without competing with the work.

**Hierarchy principle:**
The information hierarchy during an active workout inverts relative to L-1 and H-1. Those screens are for reflection and narrative. This screen is for action. Tier 1 dominates because the athlete's next physical action depends on it.

---

## Section 4 — Full Active Workout Screen Structure

### 4.1 W-9: Strength Training — Reference Architecture

W-9 is the primary active workout screen and the most complex activity type. All shared architectural components are defined here. Activity-type variants (W-10 through W-16) are defined in Section 4.3.

**Full-screen mode.** Top App Bar hidden. Bottom Tab Bar hidden. The workout owns the screen.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │  [visible, standard]
├─────────────────────────────────────────────────────────┤
│  [← Exit]   Strength · Free Workout      [⋯ Options]   │  ← Workout Action Bar
│  — OR —                                                 │
│  [← Exit]   Upper Body — Week 2          [⋯ Options]   │  ← Program workout name
├─────────────────────────────────────────────────────────┤
│  Building → Chapter 3: The Rebuild                      │  ← Chapter Context Strip
│  Stronglift 5×5  ·  Workout 9 of 16                    │  ← Program Strip (program only)
├─────────────────────────────────────────────────────────┤
│                                                         │
│  EXERCISE LIST                                [scroll]  │
│                                                         │
│  WARM-UP                                                │  ← Section header (if section has exercises)
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Light Row                           [Notes ○]  │   │  ← Warm-up exercise card
│  │  2 × 45 lb  (program target)                    │   │
│  │  Set 1–2   —                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  MAIN WORKOUT                                           │  ← Section header (always rendered if has exercises)
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Bench Press                         [Notes ○]  │   │  ← Active exercise card
│  │  5 × 95 lb  (program target)                    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Set 1   95 lb × 5   ✓                          │   │  ← Logged set
│  │  Set 2   95 lb × 5   ✓                          │   │  ← Logged set
│  │  Set 3 → [        Log Set        ]              │   │  ← Current set — tappable
│  │  Set 4   —                                      │   │  ← Pending set
│  │  Set 5   —                                      │   │  ← Pending set
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Squat                               [Notes ○]  │   │  ← Upcoming exercise card
│  │  5 × 135 lb  (program target)                   │   │
│  │  Set 1–5   —                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [+ Add Exercise]                                       │  ← Adds to MAIN section
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [              End Workout              ]              │  ← Sticky bottom CTA
└─────────────────────────────────────────────────────────┘
```

**Section headers in W-9:** Section headers (WARM-UP, MAIN WORKOUT, COOL-DOWN) appear as read-only labels between exercise groups. They are display-only — no overflow, no removal, no editing available in the active workout screen. Headers appear only for sections that contain at least one exercise. Empty sections (created in W-24 but no exercises added) are completely invisible in W-9.

### 4.2 Component Definitions

**Workout Action Bar (persistent, not the system Top App Bar):**
- "← Exit" icon — left-anchored; initiates abandonment confirmation (Section 12)
- Workout name — center: activity type for free workouts, program workout name for program workouts
- "⋯ Options" — right-anchored; opens workout options sheet (workout-level notes, timer preferences, workout name edit for free workouts)
- This is the workout's own header, not the system tab bar. It carries no tab identity. Tab identity is irrelevant during a session.

**Chapter Context Strip:**
- Always visible, immediately below the Workout Action Bar
- "Building → [Chapter Name]" in compact label format — same bronze accent treatment as the W-1 chapter context card
- If no active chapter: "No active chapter" in secondary text — not an invitation to create one. The athlete is mid-workout, not onboarding.
- **Not tappable during a workout.** The strip is read-only. The athlete is not pulled into L-3 mid-session.

**Program Strip (conditional):**
- Appears only for program-launched workouts, below the Chapter Context Strip
- Shows: "[Program Name] · Workout [X] of [Y]"
- Omitted entirely for free workouts — no empty state, no placeholder

**Exercise List:**
- Scrollable content area occupying the full available height between the context strips and the sticky End Workout CTA
- Exercises displayed as stacked cards with distinct visual states: active, completed, upcoming
- See Section 5 for full exercise card specification

**End Workout CTA (sticky bottom):**
- Full-width
- Not Primary class — its visual weight is deliberately lower than "Log Set" to avoid competing with the logging action
- Sticky at the bottom of the screen regardless of scroll position
- Tap → completion confirmation step before W-17

### 4.3 Activity Type Variants — W-10 through W-16

The Workout Action Bar, Chapter Context Strip, and End Workout CTA are identical across all activity types. The Exercise List is replaced with an activity-appropriate tracking interface for non-strength activities.

**W-10: Running — Active Screen**

```
┌─────────────────────────────────────────────────────────┐
│  [← Exit]   Run                           [⋯ Options]  │
├─────────────────────────────────────────────────────────┤
│  Building → [Chapter Name]                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              [  00:24:13  ]                             │  ← Elapsed timer (large, primary)
│              Session Timer                              │
│                                                         │
│  Distance                            [_ _ . _  km]     │  ← Manual entry
│  Notes                               [__________]      │  ← Single-line freeform
│                                                         │
│  This run is building:                                  │  ← Chapter attribution phrase
│  [Chapter Name]                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [              End Workout              ]              │
└─────────────────────────────────────────────────────────┘
```

Timer starts on screen load. Distance is entered manually for MVP — GPS tracking is post-MVP. The chapter attribution phrase ("This run is building:") reinforces purpose without analytics.

**W-11: Walking** — Identical architecture to W-10. Label reads "Walk."

**W-12: Cycling** — Identical architecture to W-10. Label reads "Cycle."

**W-13: Swimming — Active Screen**
Timer + Laps field (numeric counter, tap +/−) + Distance field (optional, manual entry) + Notes.

**W-14: HIIT / Circuit — Active Screen**

```
┌─────────────────────────────────────────────────────────┐
│  [← Exit]   HIIT                          [⋯ Options]  │
├─────────────────────────────────────────────────────────┤
│  Building → [Chapter Name]                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Rounds Completed        [  −  ]   [  3  ]  [  +  ]   │  ← Round counter
│  Session Time            [  00:18:45  ]                 │  ← Elapsed timer
│                                                         │
│  Notes                   [___________________________]  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [              End Workout              ]              │
└─────────────────────────────────────────────────────────┘
```

**W-15: Yoga / Mobility — Active Screen**
Timer only + Session Notes. No metrics beyond duration. The timer runs from screen load. Notes capture what was practiced. No set structure, no reps, no targets.

**W-16: Other / Custom — Active Screen**
Activity name field (editable if "Other" was selected at W-8, pre-filled if named at picker) + Timer + Notes. The athlete names their activity and the session is logged with duration and notes.

**Why cardio variants are simpler:**
Running, walking, cycling, swimming, yoga, and HIIT do not benefit from set/rep structure. Imposing an exercise list on a running session creates friction with no value. The tracking interface scales to what the activity actually requires. Simplicity here is not laziness — it is the correct expression of Progressive Disclosure for these activity types.

---

## Section 5 — Exercise List Structure

### 5.1 Exercise Card States

Each exercise in the workout has three display states.

**Active (contains the next unlogged set):**
```
┌───────────────────────────────────────────────────────────┐
│  Bench Press                                  [Notes ○]   │  ← Name + notes access
│  5 × 95 lb  (program target)                              │  ← Target line (program only)
├───────────────────────────────────────────────────────────┤
│  Set 1   95 lb × 5    ✓                                   │  ← Logged
│  Set 2   95 lb × 5    ✓                                   │  ← Logged
│  Set 3 → [           Log Set           ]                  │  ← Current — tappable row
│  Set 4   —           Last: 95 lb × 5                      │  ← Pending (last session, muted)
│  Set 5   —           Last: 95 lb × 5                      │  ← Pending
└───────────────────────────────────────────────────────────┘
```

**Completed (all sets logged):**
```
┌───────────────────────────────────────────────────────────┐
│  Bench Press  ✓   5 sets · 95 lb × 5                 [↓]  │  ← Collapsed summary + expand
└───────────────────────────────────────────────────────────┘
```

Collapses automatically when the last set is logged. The summary shows set count and representative weight × reps (from the first set, or the most common set if they varied). Expandable via the [↓] toggle if the athlete wants to review or amend a logged set.

**Upcoming (no sets logged, not yet active):**
```
┌───────────────────────────────────────────────────────────┐
│  Squat                                        [Notes ○]   │  ← Name + notes access
│  5 sets  ·  program: 135 lb × 5                           │  ← Set count + target (if program)
│  Set 1–5   —                                              │  ← Pending rows, de-emphasized
└───────────────────────────────────────────────────────────┘
```

Upcoming exercises show structure and targets but are visually de-emphasized. They are not the current action.

### 5.2 Set Row States

| State | Display |
|-------|---------|
| Logged | Weight × reps in primary text + ✓ indicator |
| Current | Arrow (→) + full-width "Log Set" tappable row |
| Pending (with program target) | "—" + program target in secondary text |
| Pending (free workout, with last session reference) | "—" + last session value in muted secondary text |
| Skipped | "–" (en-dash) in secondary text, no data |

### 5.3 Set Count and Structure

**Program workouts:** Set count and structure pre-populated from the program prescription. The athlete cannot add or remove prescribed sets from the exercise card — they complete, skip, or deviate from what the program specifies.

**Free workouts:** Exercises start with one set row. The athlete adds additional sets via a "+ Add Set" row that appears at the bottom of each exercise card after the last pending row.

### 5.4 Exercise Order

Exercises appear in the order they were added (free workout) or the order prescribed by the program. The athlete can reorder during the workout via long-press and drag on an exercise card. Reorder is a secondary capability — accessible but not prominently surfaced as a visible drag handle.

### 5.5 Last Session Reference

For free workouts, pending set rows show the logged value from the athlete's most recent session for the same exercise in muted secondary text. This is reference information, not a target. The athlete who logs less or more than their last session sees no visual feedback either way.

**Why show last session reference:**
The athlete who is not on a program still benefits from knowing what they did before. The reference removes the need to remember. It does not create competition with the past — it simply removes a memory burden.

### 5.6 Adding Exercises

"[+ Add Exercise]" appears below the last exercise card at all times during a workout. Tapping opens a searchable exercise library sheet. Exercises added mid-workout are appended to the MAIN section. Adding exercises after all prior sets are complete is supported — the athlete may decide to extend their session.

**Why MAIN section only for mid-workout additions:** The athlete is executing, not planning. A section picker mid-workout would add friction to the most common live-session need. Athletes who want to refine section organization can do so in W-24 (the planning surface) before their next session.

### 5.7 Section Rendering Rules

Sections from the program slot's `sections[]` array are rendered in W-9 subject to the following rules:

| Section state (from plan) | W-9 rendering |
|--------------------------|---------------|
| Section not created (absent from `sections[]`) | Absent |
| Section created, `exercises: []` (empty) | **Absent** — empty sections have no execution footprint |
| Section created, has exercises | Section header label + exercise cards |

The WARM-UP → MAIN WORKOUT → COOL-DOWN display order is always preserved. The section headers are read-only in W-9. No interactive controls appear on section headers during an active session.

---

## Section 6 — Set Logging UX

### 6.1 Trigger

Tapping the "Log Set" row for the current set opens the **Set Input Sheet** — a modal bottom sheet that rises from the bottom of the screen. The exercise list remains visible behind it, providing positional context. This is not a new screen. Navigation depth does not increase.

### 6.2 Set Input Sheet Anatomy

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Bench Press  ·  Set 3 of 5                             │  ← Context header
│  Program target: 95 lb × 5                              │  ← Program target line (if applicable)
│                                                         │
│  ┌────────────────────────┐   ┌──────────────────────┐ │
│  │  95                    │   │  5                   │ │  ← Weight + reps inputs
│  │  lb                    │   │  reps                │ │
│  └────────────────────────┘   └──────────────────────┘ │
│                                                         │
│  Last session: 95 lb × 5                                │  ← Prior reference (muted secondary)
│                                                         │
│  [              Log Set              ]                  │  ← Primary action
│                                                         │
│  [  Skip Set  ]                                         │  ← Tertiary action
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**What appears:**
- Exercise name + set position ("Set 3 of 5")
- Program target line — present only for program-driven workouts; shows prescribed weight × reps in secondary text. Absent for free workouts.
- Weight input — numeric, pre-populated (see Section 6.3)
- Reps input — numeric integer only, pre-populated (see Section 6.3)
- Last session reference — the logged value from the athlete's most recent prior session for this exercise at this set position. Muted secondary text. Context, not target.
- "Log Set" — Primary CTA; confirms and logs the set
- "Skip Set" — Tertiary; closes the sheet and marks the set as skipped

**What does not appear:**
- Personal record indicators mid-workout ("New PR!")
- Comparison to prior performance ("Down 5 lb from last week")
- Volume calculations, 1RM estimates, or derived metrics
- Calorie estimates
- Any notation that a logged value is above or below any threshold

### 6.3 Input Pre-Population Logic

**Weight field priority:**
1. Last logged set in this session for this exercise (in-session continuity)
2. Most recently logged weight for this exercise across all prior sessions
3. Program target weight (if no logged history exists)
4. Empty (for bodyweight exercises with no logged history)

**Reps field priority:**
1. Program target reps (program workouts — the prescription is the default reps)
2. Last logged reps in this session for this exercise
3. Most recently logged reps for this exercise across prior sessions
4. Empty

**Why program target is the reps default for program workouts:**
The athlete following a program has agreed to a prescription. Pre-populating reps with the target removes friction for athletes who hit their prescribed reps every set — the common case. The athlete who does more or fewer simply adjusts the pre-populated value. The prescription is not a lock; it is a starting point.

### 6.4 Input Interaction

Both fields use the numeric keyboard. The weight field accepts decimals (e.g., "102.5"). The reps field accepts integers only. Touch targets for both inputs are large — minimum 44×44dp — sized for in-gym use with hands that may be occupied, chalked, or gloved.

Weight unit (kg or lb) is configured at the account level, not per workout. All inputs and displays use the athlete's configured unit.

### 6.5 Post-Log Behavior

After tapping "Log Set":
1. Sheet dismisses with a brief haptic pulse (medium impact, single)
2. The set row updates to show logged weight × reps + ✓ indicator
3. The next set row becomes active (arrow indicator)
4. The **Rest State overlay** appears (Section 7)

If the logged set was the last set for the current exercise, the exercise card collapses to the completed state and the next exercise becomes active.

### 6.6 Skip Set Behavior

"Skip Set" closes the sheet and marks the set as skipped ("–" in the row). The next set becomes the active row. Skipped sets create no entry in W-17 or W-18. Program progression does not penalize skipped sets. The athlete who skips a set has skipped a set — that is the complete record of it.

---

## Section 7 — Rest State UX

### 7.1 Purpose

The rest state acknowledges the natural pause between sets without creating pressure. It is the product doing what athletes do: waiting. The design reflects patience, not urgency.

Rest is part of training. An athlete who rests longer between sets is not failing — they are recovering. The rest state implements Accountability Without Shame at the millisecond level.

### 7.2 Rest State Overlay

After a set is logged, a rest overlay appears over the exercise list. It is not full-screen. The exercise list is visible behind it.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ✓  Set 3 logged.  95 lb × 5                            │  ← Confirmation (brief, secondary)
│                                                         │
│              Rest.                                      │  ← Single word, large, primary
│                                                         │
│              [  01:23  ]                                │  ← Count-up timer (not countdown)
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Next: Set 4  ·  target 95 lb × 5                       │  ← Next action preview (program only)
│  — OR —                                                 │
│  Next: Set 4                                            │  ← Free workout version
│  — OR —                                                 │
│  Next: Squat                                            │  ← Last set of exercise
│  — OR —                                                 │
│  All sets logged.                                       │  ← Last set of workout
│                                                         │
│  [              Ready              ]                    │  ← Primary dismiss CTA
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**What appears:**
- Logged set confirmation: "Set 3 logged. [weight × reps]" in secondary text — brief acknowledgment, not celebration
- "Rest." — a single word. Present tense. Not a countdown. Not a prescription. The athlete is resting. The product names it and steps back.
- Count-up timer — counts upward from 0:00. Neutral. Informational. The athlete who rests 3 minutes sees "3:00." No inference is drawn. No judgment is presented.
- Next action preview — "Next: Set 4 · target 95 lb × 5" for program workouts; "Next: Set 4" for free workouts; "Next: [Exercise Name]" after the last set of an exercise; "All sets logged" after the last set of a program-complete workout.
- "Ready" — Primary CTA; dismisses the overlay, advances to the next set or exercise

**What does not appear:**
- Countdown timer
- Recommended rest duration
- Red, amber, or any color change on the timer as rest time grows
- "You've rested longer than usual" messaging
- Comparison to prior rest times
- Any indication that a rest duration is long or short

### 7.3 Timer Design Principle

The count-up timer is the spec's implementation of Accountability Without Shame applied to rest time. The timer records; it does not evaluate. An athlete who needs five minutes between sets is an athlete who needed five minutes. The product records "5:00." It offers no opinion on that number.

A countdown timer would imply a correct rest duration exists and that the athlete should race to finish before it expires. Forge Legacy does not know what the correct rest duration is for this athlete, this exercise, this session, or this day. Count-up is the only honest choice.

### 7.4 Dismissal Behavior

Tapping "Ready" dismisses the rest overlay and advances focus to the next set row. If the next set has scrolled out of view, the exercise list auto-scrolls smoothly to bring it into the upper screen position. The athlete should never have to hunt for where they are.

Tapping anywhere on the exercise list visible behind the overlay also dismisses it — the athlete can bypass the overlay by touching the next set row directly.

### 7.5 Last Set of Workout (Program Complete)

When the last set of a program-prescribed workout is logged, the "Ready" button is replaced with a single action: "Workout Complete — Save." Tapping proceeds directly to the workout completion confirmation (Section 14). The athlete can still dismiss to the exercise list by tapping behind the overlay if they want to add exercises.

---

## Section 8 — Notes UX

### 8.1 Per-Exercise Notes

Notes are attached per exercise, not per set. The notes icon ([Notes ○]) appears in the header of every exercise card regardless of its state (active, completed, upcoming). It is always accessible.

Tapping the notes icon opens the **Exercise Notes Sheet**:

```
┌─────────────────────────────────────────────────────────┐
│  Bench Press  ·  Notes                                  │  ← Context header
│  ─────────────────────────────────────────────────────  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Felt strong today. Shoulder stable at this        │  │  ← Freeform text area
│  │  weight. Try 100 lb next session.                  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [              Save Note              ]                │  ← Primary CTA
│                                                         │
│  [  Discard  ]                                          │  ← Tertiary (only if unsaved changes)
└─────────────────────────────────────────────────────────┘
```

**What appears:** Exercise name + "Notes" context header. Open text area — no word limit, no structure imposed. "Save Note" Primary CTA. "Discard" Tertiary, visible only when the note has unsaved changes.

**What does not appear:** Suggested prompts ("How did that feel?"). Rating scales. Character count. AI-generated suggestions. Structure of any kind.

**Why notes are per exercise and not per set:**
Athletes take notes about an exercise — how it felt, what to adjust, what to try next. This is exercise-level intelligence. A note that says "shoulder felt unstable" refers to the exercise, not one specific set. Per-set notes would create input friction without adding specificity.

### 8.2 Workout-Level Notes

Accessible via the "⋯ Options" menu in the Workout Action Bar. Intended for session-wide observations that do not belong to a specific exercise ("felt tired today," "only 45 minutes available," "substituted cable row for barbell row"). These notes appear in W-17 and W-18 at the session level.

### 8.3 Notes Indicator

When a note exists for an exercise, the notes icon changes from hollow (○) to filled (●). The athlete scanning their exercise list can see at a glance which exercises have notes without opening each one.

### 8.4 Note Persistence

Notes are saved immediately on "Save Note" tap. They survive through to W-17 Workout Summary, W-18 Activity History, and W-19 Activity Detail. Notes from prior sessions appear in W-19 and inform last-session reference values shown in Section 5.5.

---

## Section 9 — Program Workout Behavior

### 9.1 Pre-Loaded State

A program workout launched from W-1 arrives with the entire session pre-structured. The athlete's first action is to begin, not to build.

The screen loads with:
- Program workout name in the Workout Action Bar (e.g., "Upper Body A · Week 2")
- Program Strip showing: "[Program Name] · Workout [X] of [Y]"
- Exercise list populated from the slot's `sections[]`: exercises grouped by section with section headers rendered between groups (WARM-UP header if warm-up exercises exist, then MAIN WORKOUT header, then COOL-DOWN header if cool-down exercises exist)
- Empty sections in the plan are not rendered — only sections with at least one exercise produce a header and exercise cards
- Set count per exercise from the prescription
- Weight and rep targets visible in each exercise card and pre-populated in the Set Input Sheet

### 9.2 Target Display

Program targets appear in two places:
- On the exercise card header: "[Exercise Name] — [N] × [weight] [unit]" in secondary text
- In the Set Input Sheet: "Program target: [weight] × [reps]" above the input fields

Targets are consistently labeled "program target" — not "goal," not "required," not "prescribed." The language communicates that this is the program's suggestion, not the product's demand.

### 9.3 Deviating from Program Prescription

The athlete is free to:
- Log a different weight than prescribed (inputs accept any value)
- Log different reps than prescribed
- Skip a set via "Skip Set"
- Skip an exercise by not logging any of its sets
- Add exercises not in the program
- End the workout before all sets are complete

None of these actions produce warnings, warnings states, "you deviated from your program" messaging, or any visual indication that the athlete has done something wrong. The program prescription records what was planned. The logged values record what happened. Both are preserved. Neither overwrites the other.

**Why this matters:**
Athletes deviate from programs for legitimate reasons — injury, fatigue, time constraints, equipment availability, coaching adjustments. An app that treats deviation as failure misunderstands training. The product's job is to record what the athlete did, not to police what they should have done.

### 9.4 Program Progress Update

When a program workout is completed and saved:
- The program advances to the next workout automatically (processed at W-17 save)
- The progress bar on W-1 (X of Y) reflects the updated count when the athlete returns
- Chapter Detail (L-3) reflects the workout in the chapter's training record

The athlete performs none of these updates manually. They complete the workout and the system handles the rest.

### 9.5 Workout Name Fallback

Program workout name shown in the Workout Action Bar:
1. Program's internal workout name (e.g., "Pull Day A")
2. If none: "[Program Name] · Workout [X]"
3. If no program: activity type only (e.g., "Strength")

---

## Section 10 — Free Workout Behavior

### 10.1 Starting State

A free workout launches with:
- Activity type from the entry point
- Chapter context from the active chapter (if one exists)
- No program strip
- Exercise list: see Sections 10.2 and 10.3

### 10.2 Returning Athlete — Last Session Suggestion

When a returning athlete launches a free Strength workout via quick-select (or via W-8 → Strength), and a prior Strength session exists, the exercise list loads pre-populated with the exercises from their most recent Strength session in the same order.

These exercises appear in **upcoming state** — not active, not logged, structure carried forward but not pre-activated. The athlete sees:
- Their familiar exercise list already built
- One tap on the first set row begins the session (satisfying the 3-tap rule from H-1)

The athlete can remove any suggested exercise (swipe-to-remove), reorder them, or add new ones before or after beginning.

**This is not a template system.** Templates are defined in W-6/W-7 and are out of scope for this spec. The last session carry-forward is a default convenience, not a saved program. It does not persist or update separately from actual session history.

**Why carry forward last session's exercises:**
The athlete who taps "Strength" from W-1 is typically training the same exercises they trained before. Carrying forward last session's structure removes the "add all my exercises again" friction that would otherwise precede every free-form session. The athlete validates and adjusts a list rather than building from nothing. This serves execution without automating decisions.

### 10.3 First-Ever Free Workout

If no prior session exists for this activity type:
- Exercise list is empty
- Prompt: "What are you training today? Add your first exercise."
- "[+ Add Exercise]" is the first action
- No suggestions, no presets, no templates offered

The 3-tap rule is not enforced here. First-time free workouts require additional setup. This is expected and correct.

### 10.4 Set Count in Free Workouts

Each exercise starts with one set row. The athlete adds additional sets via "+ Add Set" at the bottom of the exercise card. No default set count is imposed.

An athlete doing 5×5 needs five set rows. An athlete doing a single heavy single needs one. An athlete doing a warm-up set followed by two working sets needs three. The product cannot know which. The athlete controls this.

### 10.5 Chapter Attribution

Free workouts are attributed to the active chapter identically to program workouts. The Chapter Context Strip shows "Building → [Chapter Name]." The workout appears in L-3 Chapter Detail after saving. Chapter attribution does not depend on program enrollment.

---

## Section 11 — Workout With Friend Active Behavior

### 11.1 Notifications Suppressed During Workout

All Workout With Friend notifications — M-8 (squad tag) and M-9 (non-squad tag) — are suppressed while an active workout session is in progress. Incoming partner tags, approval requests, and claim events are queued and surface in W-1 after the session ends.

**Why:** The athlete is working. A notification mid-session asking them to respond to a social association request breaks the flow and violates the execution-first principle of this screen family. Partner activity management belongs in W-1. It has no place in an active workout.

### 11.2 Pre-Tagged Partner Indicator

If the athlete initiated a "Train Together" session via the Squads tab (S-2 → S-10) before starting the workout, a compact training partner indicator appears in the context area:

```
│  Building → Chapter 3: The Rebuild                      │  ← Chapter Context Strip
│  Training with [Name]  ·  [Squad Name]                  │  ← Partner indicator
```

This indicator is read-only. It communicates shared context without providing any data about the partner's session.

**What does not appear:**
- Partner's current exercise or set count
- Partner's logged weight or reps
- "They just logged a set!" notifications
- Live leaderboard or any form of comparison
- Partner progress bar or completion percentage

The athlete's screen shows only the athlete's own workout. The partner's screen shows only theirs. Train Together means they trained together. It does not mean their screens are linked.

### 11.3 Post-Workout Tagging

The option to tag a workout partner surfaces at W-17 Workout Summary after the session is saved. It does not appear during the workout. Partner tagging is a reflection action. Reflection belongs after execution.

---

## Section 12 — Workout Abandonment Rules

### 12.1 Abandonment Triggers

Abandonment confirmation is triggered by:
- Tapping "← Exit" in the Workout Action Bar
- Android system back gesture
- iOS back swipe from the left edge

All three triggers present the **Abandonment Confirmation Sheet** before any state is affected. No immediate exit occurs.

### 12.2 Abandonment Confirmation Sheet

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Leave this workout?                                    │  ← Neutral header
│                                                         │
│  [          Resume Workout          ]                   │  ← Primary — return to workout
│                                                         │
│  [          Save & Exit             ]                   │  ← Secondary — save partial session
│                                                         │
│  [          Discard Workout         ]                   │  ← Destructive — permanent loss
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Resume Workout (Primary):** dismisses the sheet; returns to the workout exactly where the athlete left it. No state is altered.

**Save & Exit (Secondary):** saves all sets logged up to the exit point; navigates to a simplified W-17 with a "Partial Session" indicator. Program progress is not advanced (a partial session does not count as a completed program workout). The session appears in W-18 Activity History with a "Partial" label. The session is attributed to the active chapter.

**Discard Workout (Destructive):** presents a second confirmation before executing — "Discard all progress for this session?" with "Yes, discard" (Destructive) and "Keep training" (Primary). On confirmation: all logged data from the session is permanently removed. No entry is created in W-17 or W-18. Program progress is unchanged.

### 12.3 Partial Save — Chapter Attribution

Partial sessions are attributed to the chapter that was active when the workout began, not the chapter state at abandonment. Training occurred. The chapter records it. The "Partial" label in W-18 is factual, not judgmental.

### 12.4 App Backgrounded During Workout

If the athlete switches apps or receives a phone call while a workout is active, the session continues running (timer accumulates, all logged data is preserved). On return to Forge Legacy, the athlete lands on the active workout screen where they left it. No automatic abandonment. No "you left" message.

### 12.5 Device Lock During Workout

Session continues. Timer accumulates. On unlock and return to app, the active workout screen is present with updated elapsed time.

---

## Section 13 — Workout Save Rules

### 13.1 Save on Completion

The primary save event is workout completion. When the athlete taps "End Workout" and confirms "Save Workout" in the completion sheet (Section 14), the full session is written and the athlete navigates to W-17.

### 13.2 Minimum Save Requirements

An empty session cannot be saved.

- **Strength, HIIT:** "End Workout" is blocked (greyed, with label "Log at least one set to save") if zero sets have been logged.
- **Run, Walk, Cycle, Swim, Yoga, Other:** "End Workout" is blocked if elapsed session time is under 60 seconds. This prevents accidental empty saves from a screen load and immediate exit.
- **Any activity with notes but no time/sets:** notes alone do not constitute a saveable session.

A session that fails minimum requirements can only be discarded.

### 13.3 Auto-Save (Crash Recovery)

Every logged set is written to local storage immediately on "Log Set" confirmation. The set save is synchronous with the haptic feedback — the athlete's haptic acknowledgment confirms local storage write.

If the app crashes or is force-quit:
1. On next app launch, the system detects an in-progress session in local storage
2. Recovery prompt appears before normal navigation restores: "[Activity Type] session in progress from [time elapsed]. Resume?"
3. **Resume:** returns to the active workout with all logged sets preserved exactly as left
4. **Discard:** clears the recovery data; no entry created

### 13.4 Cloud Sync

Local storage is the source of truth during a session. Cloud sync occurs after session save when a connection is available. If the session saves locally but cloud sync has not completed:
- W-17 and W-18 display from local storage
- The athlete sees no error state
- Sync completes silently when connection is restored
- No "saving to cloud" indicators during a session

### 13.5 Partial Save Rules

Partial saves (via Save & Exit from the abandonment sheet) are held to the same minimum requirements as full saves. A partial session with zero logged sets cannot be saved even via Save & Exit.

---

## Section 14 — Workout Completion Entry Point

### 14.1 End Workout CTA

"End Workout" is a full-width sticky button anchored to the bottom of the active workout screen. It is always accessible regardless of scroll position, content length, or workout state.

**Visual class:** Deliberately lower than Primary. The workout's Primary action at any given moment is "Log Set." "End Workout" must not compete visually with the logging action. It is legible, intentional, and available — but it does not insist.

**Why not Primary:** A Primary "End Workout" button would create visual urgency toward ending the session. The athlete ends when they are done. The design defers to the athlete's judgment on timing.

### 14.2 Completion Confirmation Sheet

**All program-prescribed sets complete:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Workout complete.                                      │  ← Factual header
│  [Workout Name]  ·  [X] sets logged                     │  ← Session summary
│                                                         │
│  [          Save Workout            ]                   │  ← Primary
│  [     Keep Adding Exercises        ]                   │  ← Secondary — return to workout
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Sets remain unlogged:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [X] sets remain.                                       │  ← Factual, no judgment
│                                                         │
│  [          Save Workout            ]                   │  ← Primary
│  [          Keep Training           ]                   │  ← Secondary — return
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Language principle:** "[X] sets remain" is a fact. It is not "You didn't finish your program." It is not "Just [X] more sets to go!" Both framings impose a judgment. A fact imposes none. The Primary CTA is "Save Workout" in both states — ending when sets remain is a valid choice, not an incomplete one.

### 14.3 Navigation to W-17

After "Save Workout" confirmation:
1. Session data written to local storage (cloud sync queued)
2. Program progress updated if applicable
3. Chapter record updated
4. Navigation transitions to W-17 Workout Summary
5. The active workout screen is removed from the navigation stack

Back gesture from W-17 does not return to the active workout. The session is complete and closed.

---

## Section 15 — Edge Cases

### 15.1 Program Workout With Unavailable Equipment

The athlete starts a program workout but cannot perform a prescribed exercise (no barbell, no machine available). They skip the exercise entirely by not logging any sets.

**What appears:** No warning. No "exercise unavailable" state. The exercise card remains in upcoming state throughout the session. The athlete ends the workout with some exercises complete and the unavailable one unlogged.

**At W-17:** The skipped exercise appears with "No sets logged." Program progression advances. The system does not gate completion on whether every exercise was attempted.

### 15.2 Very Long Workout (10+ Exercises)

The exercise list scrolls. The sticky "End Workout" CTA remains at the bottom of the screen throughout. The active set auto-scrolls into view after each rest dismissal. No maximum exercise count. Athletes who train 10+ exercises should not encounter a cap.

### 15.3 Single Set Workout

Valid. One exercise, one set, logged and saved. Minimum requirement satisfied. The session is as complete as any other.

### 15.4 Same Exercise Listed Multiple Times

An athlete may add the same exercise more than once in a free workout (a common pattern for superset and circuit structures). Each instance is a separate exercise card with independent set records. They share a name but not data.

### 15.5 Workout Duration Exceeds 3 Hours

No session time limit. The elapsed timer continues indefinitely. No "your workout is very long" messaging. Auto-save continues writing to local storage as sets are logged. The product defers to the athlete on session length.

### 15.6 Athlete Changes Mind About Activity Type After Entering

Athlete tapped the Strength quick-select chip but intended to run. They tap "← Exit" and confirm "Discard Workout." Returns to W-1 with no data created. The correct activity screen is then selected. Cost: zero.

### 15.7 Chapter Sealed Mid-Workout

If an athlete seals their chapter from another device or tab while a workout is in progress, the chapter attribution for the in-progress session is captured at session start, not at save time. The session is attributed to the chapter that was active when the workout began. When the app next syncs state, the context strip updates to reflect the no-chapter state, but the session attribution is already anchored to the sealed chapter.

### 15.8 Program Graduation on Workout Completion

If the in-progress session is the final workout of a program, the active workout screen shows no indication of this. The graduation moment belongs to W-17 — that is where it has meaning and ceremony. The workout flow's job is to complete the work. W-17's job is to recognize it.

### 15.9 Returning to W-1 After Workout Save

After the W-17 flow, returning to W-1:
- Recent Workouts shows the just-completed workout at the top of the list, newest first
- Program progress bar reflects the updated count immediately
- Chapter context card shows updated goal progress percentage

The athlete's session is reflected in W-1 the moment they return. No "refreshing" required.

### 15.10 Connection Lost During Workout

All session data is in local storage. Connection loss has no effect on an active workout. The session continues, sets log, auto-save writes locally. When connection restores, cloud sync catches up silently. The athlete sees no error state during the session.

### 15.11 Weight Unit Configured at Account Level

All weight inputs and displays within W-9 through W-16 use the athlete's configured unit (kg or lb). Unit switching mid-workout is not supported. Last session reference values are displayed in the athlete's configured unit, converting stored values if the unit was changed since the prior session.

### 15.12 Program Prescribes Bodyweight Exercise

When a program prescribes an exercise with no weight (e.g., push-ups, pull-ups), the weight input in the Set Input Sheet is pre-populated with "BW" (bodyweight). The athlete can override with an assisted/resisted value. The program target line shows "BW × [reps]" rather than a numeric weight.

---

## Section 16 — Mobile UX Considerations

### 16.1 Full-Screen Mode Rationale

W-9 through W-16 hide the Top App Bar and Bottom Tab Bar on entry. The workout owns the screen.

**Why:** The workout is a contained, time-bounded session. Tab navigation while a workout is active is a vector for accidental exits and distraction. The workout action bar provides the one clear exit path — controlled abandonment. Full-screen maximizes the exercise list content area and eliminates the risk of inadvertent tab switches mid-set.

**Exit is clear:** "← Exit" in the Workout Action Bar is always visible at the top of the screen. The athlete is focused, not trapped.

### 16.2 Thumb Zone Priority

The highest-frequency action in a strength workout is logging a set. The "Log Set" row and the Set Input Sheet's "Log Set" button are positioned for maximum thumb accessibility.

| Action | Thumb Zone | Position |
|--------|-----------|----------|
| Current "Log Set" row | Center of screen | Auto-scrolls to upper-center on load |
| Set Input Sheet "Log Set" button | Lower half | Sticky bottom of sheet |
| Set Input Sheet weight + reps inputs | Middle of sheet | Above keyboard, within thumb reach |
| Rest overlay "Ready" button | Lower half | Bottom-anchored within overlay |
| "End Workout" sticky CTA | Bottom | Persistent bottom anchor |
| Exercise list scrolling | Full screen | Natural scroll |

### 16.3 Set Input Sheet Keyboard Behavior

When the numeric keyboard activates on weight or reps input:
- The Set Input Sheet rises above the keyboard
- Both input fields remain visible above the keyboard line
- "Log Set" button remains visible and tappable above the keyboard
- No element is buried beneath the keyboard

The athlete should be able to see and use every element of the Set Input Sheet with the keyboard open, in one hand, without scrolling.

### 16.4 Exercise List Auto-Scroll Behavior

| Event | Auto-Scroll Action |
|-------|--------------------|
| Workout screen loads | Scroll to first unlogged set, upper screen position |
| Rest overlay dismissed | Scroll to next unlogged set if off-screen |
| Exercise completed | Scroll to first set of next exercise |
| Exercise added mid-workout | Scroll to new exercise card |

Auto-scroll uses a smooth animation (200–300ms). No instant jumps. The athlete should never need to hunt for their position in the workout.

### 16.5 Set Input Sheet Dimensions

The sheet opens to 40–50% of screen height. It does not cover the exercise card being logged — the athlete can see which exercise and which set they are acting on behind the sheet. The sheet is not full-screen.

### 16.6 Rest Overlay Dimensions

The rest overlay covers the lower 60% of the screen. The upper 40% shows the exercise list — specifically the just-logged set row, confirming the logged value. The overlay is not full-screen.

### 16.7 Tap Target Sizes

| Element | Minimum Size |
|---------|-------------|
| "Log Set" row in exercise card | Full-width × 48dp |
| "Log Set" button in Set Input Sheet | Full-width × 56dp |
| "Ready" button in rest overlay | Full-width × 56dp |
| Notes icon on exercise card | 44×44dp |
| "End Workout" sticky CTA | Full-width × 56dp |
| "+ Add Set" in exercise card | Full-width × 44dp |
| "+ Add Exercise" | Full-width × 44dp |
| Logged set row (for tap-to-edit) | Full-width × 48dp |
| Weight input field | ≥ 44dp height |
| Reps input field | ≥ 44dp height |

### 16.8 Haptic Feedback

Logging a set produces a single medium-impact haptic pulse at the moment "Log Set" is confirmed. The haptic fires simultaneously with the sheet dismissal and local storage write. The athlete receives physical confirmation of the log without needing to visually verify the screen — particularly useful during high-intensity training where looking away from weights is impractical.

No haptic is produced for: rest overlay appearance, rest timer tick, "Ready" tap, sheet open, set input field focus. Haptic is reserved for the one action that matters most: the log.

### 16.9 Screen Lock During Workout

If the device auto-locks while a workout is in progress, the timer continues accumulating and all logged data is preserved. On unlock and return to Forge Legacy, the active workout screen is present with the timer reflecting total elapsed time. No "you were inactive" message.

### 16.10 Orientation

W-9 through W-16 support portrait orientation only. Landscape is not supported for the Active Workout Flow. All layouts — exercise list, Set Input Sheet, rest overlay, End Workout CTA — are designed for portrait.

### 16.11 Safe Area Compliance

- Workout Action Bar respects the status bar safe area (top)
- Exercise list begins below the Action Bar + Context Strip
- Sticky "End Workout" CTA above the bottom safe area + minimum 8dp padding
- Set Input Sheet bottom padding: safe area + 16dp minimum
- No interactive elements under the home indicator

---

## Section 17 — W-9 through W-16 Validation Checklist

### Active Workout Architecture
- [ ] Full-screen mode: Top App Bar hidden, Bottom Tab Bar hidden on workout entry
- [ ] Workout Action Bar: "← Exit" (left) + workout name (center) + "⋯ Options" (right) — always visible
- [ ] Chapter Context Strip: compact, visible, non-tappable during session, "Building → [Chapter Name]"
- [ ] Program Strip: visible when program-launched; fully omitted for free workouts (no empty state)
- [ ] "End Workout" sticky CTA: always accessible at screen bottom, not Primary class
- [ ] Back gesture and "← Exit" both trigger Abandonment Confirmation Sheet, not immediate exit

### Exercise List (W-9 Strength Reference)
- [ ] Active exercise card visually distinguished from completed and upcoming cards
- [ ] Completed exercise cards collapse to summary with expand toggle
- [ ] Current set row shows "Log Set" as a full-width tappable row
- [ ] Logged set rows show weight × reps + ✓
- [ ] Pending set rows show "—" + program target in secondary text if applicable
- [ ] Last session reference shown on pending set rows for free workouts (muted secondary text)
- [ ] "+ Add Exercise" accessible below exercise list at all times
- [ ] Exercise list auto-scrolls to current unlogged set on screen load and after rest overlay dismissal

### Workout Sections (W-9)
- [ ] Section headers (WARM-UP, MAIN WORKOUT, COOL-DOWN) rendered as read-only labels between exercise groups
- [ ] Section headers appear only for sections with at least one exercise
- [ ] Empty sections (plan has section record but `exercises: []`) are completely absent from W-9 — no header, no empty state, no placeholder
- [ ] Section display order is always WARM-UP → MAIN WORKOUT → COOL-DOWN regardless of plan structure
- [ ] No overflow, no removal controls, no interactive elements on section headers in W-9
- [ ] "+ Add Exercise" mid-workout appends to MAIN section (no section picker shown)

### Set Logging
- [ ] Tapping "Log Set" row opens Set Input Sheet — not a new screen, not full-screen
- [ ] Set Input Sheet content: exercise name + set number + program target (if applicable) + weight input + reps input + last session reference + "Log Set" + "Skip Set"
- [ ] Sheet covers 40–50% of screen height; does not cover the exercise card being logged
- [ ] Weight pre-populated: in-session last → prior session last → program target
- [ ] Reps pre-populated: program target → in-session last → prior session last
- [ ] No personal record indicators in Set Input Sheet
- [ ] No performance comparisons in Set Input Sheet
- [ ] Post-log: sheet dismisses, haptic fires, set row updates, rest overlay appears
- [ ] Skip Set: marks set "–", advances to next set, logs no data

### Rest State
- [ ] Rest overlay appears after every logged set
- [ ] Rest overlay covers lower 60% of screen; exercise list visible behind
- [ ] Count-up timer (not countdown) — starts at 0:00, increments upward
- [ ] Timer does not change color, pulse, or provide urgency cues at any rest duration
- [ ] "Ready" CTA dismisses overlay and advances to next set
- [ ] Tapping exercise list behind overlay also dismisses
- [ ] Next action preview shows next set, next exercise, or "All sets logged" as appropriate
- [ ] No recommended rest time displayed
- [ ] No indication that rest duration is long, short, or incorrect

### Notes
- [ ] Notes icon on every exercise card regardless of card state
- [ ] Notes icon changes from hollow to filled when a note exists
- [ ] Exercise notes open as a bottom sheet (not a new screen)
- [ ] Notes are per-exercise, not per-set
- [ ] Workout-level notes accessible from "⋯ Options" menu
- [ ] Notes saved immediately on "Save Note" tap
- [ ] Notes appear in W-17, W-18, and W-19 Activity Detail

### Program Workout Behavior
- [ ] Exercise list pre-loaded from program on program-entry
- [ ] Program targets visible on exercise cards and in Set Input Sheet
- [ ] Program targets labeled "program target" — not "required" or "goal"
- [ ] Deviating from targets: no warning, no shame state, no flag
- [ ] Skipping sets and exercises does not block completion or penalize the session
- [ ] Program progress advances automatically at W-17 save, not mid-workout
- [ ] Program workout name shown in Workout Action Bar

### Free Workout Behavior
- [ ] No program strip shown — not present, not empty
- [ ] Last session exercise structure carried forward for returning athletes (upcoming state, not active)
- [ ] First-ever free workout: empty list, prompt to add first exercise
- [ ] Each exercise starts with one set row; athlete adds more via "+ Add Set"
- [ ] No default set count imposed
- [ ] Chapter attribution functions identically to program workouts

### Workout With Friend
- [ ] All WwF notifications (M-8, M-9) suppressed during active session
- [ ] Pre-tagged partner shown as compact read-only indicator in context area
- [ ] Partner's exercise, set, or performance data not visible during session
- [ ] Partner tagging entry point surfaced at W-17 only — not during session

### Abandonment
- [ ] "← Exit" and back gesture both trigger Abandonment Confirmation Sheet
- [ ] Three options: Resume Workout (Primary), Save & Exit (Secondary), Discard Workout (Destructive)
- [ ] Discard requires a second confirmation step
- [ ] Save & Exit: partial session saved with "Partial" label; program not advanced; chapter attributed
- [ ] App backgrounded: session persists; no auto-abandonment
- [ ] Device locked: session persists; timer continues

### Save Rules
- [ ] Strength/HIIT: "End Workout" blocked if zero sets logged — instructional label shown
- [ ] Cardio activities: "End Workout" blocked if elapsed time under 60 seconds
- [ ] "End Workout" block is non-shaming: instructional label, not error state
- [ ] Auto-save: every set written to local storage synchronously on log confirmation
- [ ] Crash recovery: in-progress session detected on next app launch with Resume / Discard options
- [ ] Cloud sync: local storage first, sync when connection available, no error shown during session

### Workout Completion
- [ ] "End Workout" always accessible at screen bottom, not Primary class
- [ ] Tapping "End Workout" opens completion confirmation sheet (not immediate save)
- [ ] Completion sheet language is factual: "[X] sets remain" not shame language
- [ ] "Save Workout" is Primary in completion sheet regardless of remaining sets
- [ ] "Keep Training / Keep Adding" secondary option returns to workout without saving
- [ ] Post-save: navigation to W-17; active workout removed from navigation stack
- [ ] Back gesture from W-17 does not return to active workout

### Accountability Without Shame
- [ ] No comparison to prior sessions at any point during the workout
- [ ] No personal record recognition during the workout (belongs in W-17)
- [ ] No "you're behind your program" or performance gap messaging
- [ ] Rest timer counts up, never counts down, never changes visual state based on duration
- [ ] Skipping sets and exercises: no warning, no indicator, no shame state
- [ ] Ending early: completion sheet uses factual language only
- [ ] Last session reference values are muted secondary text — never framed as targets

### Activity Type Variants (W-10 through W-16)
- [ ] All share: Workout Action Bar, Chapter Context Strip, End Workout CTA
- [ ] Run (W-10), Walk (W-11), Cycle (W-12): elapsed timer + manual distance entry + notes
- [ ] Swimming (W-13): elapsed timer + laps counter + distance entry + notes
- [ ] HIIT (W-14): rounds counter (−/+) + elapsed timer + notes
- [ ] Yoga / Mobility (W-15): elapsed timer + notes only — no metrics beyond duration
- [ ] Other / Custom (W-16): activity name + elapsed timer + notes
- [ ] All cardio types: "End Workout" blocked under 60 seconds elapsed

### Mobile UX
- [ ] Portrait orientation only — landscape not supported
- [ ] All tap targets ≥ 44×44dp minimum
- [ ] "Log Set" button minimum 56dp height
- [ ] "Ready" button minimum 56dp height
- [ ] "End Workout" CTA minimum 56dp height
- [ ] Set Input Sheet: all elements visible above keyboard when keyboard is open
- [ ] Set Input Sheet: 40–50% screen height, does not cover the exercise card
- [ ] Rest overlay: lower 60% of screen, exercise list visible behind
- [ ] Exercise list auto-scrolls to current set (200–300ms smooth animation)
- [ ] Haptic on set log: single medium-impact pulse, no other haptic events
- [ ] Safe area compliance: top (status bar), bottom (home indicator + tab bar area)
- [ ] Full-screen mode safe area: top action bar below status bar, CTA above home indicator

### Mission Alignment
- [ ] Does the screen answer "What am I doing right now?" at every point in the session?
- [ ] Does the athlete feel "I know exactly what I am doing" throughout?
- [ ] Is chapter context visible without competing with the current exercise and set?
- [ ] Is there no statistics surface, social feed, or gamification system in any active workout state?
- [ ] Does the workout flow exist solely to execute training, support programs, advance goals, and feed the chapter?
- [ ] Is "The workout tracker is the engine. The Legacy is the product." expressed in the architecture — session data feeds chapter, not the other way around?

---

---

## Change Log

### v1.1 — June 2026

**WS-A2 (Workout Structure Amendment 001) + W9-A1:**
- **§2.3** — Program Workout Entry: exercise list now sourced from `sections[]`; empty sections not rendered
- **§4.1** — W-9 layout diagram updated with section headers (WARM-UP, MAIN WORKOUT, COOL-DOWN); note added that section headers are display-only in W-9
- **§5.6** — Mid-workout "+ Add Exercise" now appends to MAIN section (not end of flat list); rationale added
- **§5.7** — New section: Section Rendering Rules — table defining W-9 rendering behavior for all section states
- **§9.1** — Pre-Loaded State: exercise list population rewritten to reference `sections[]`
- **§17** — Validation Checklist: new "Workout Sections (W-9)" block added

---

*Forge Legacy Active Workout Flow Specification — W-9 through W-16*
*v1.1 — June 2026*
*All decisions derived from the Phase 2A locked architecture, the Forge Legacy Master PRD, the Forge Legacy UX Framework v1.0, and the approved H-1, L-1, L-3/L-4, and W-1 wireframe specifications.*
*WS-A2 applied June 2026: section-first data model incorporated; section rendering rules for W-9 defined.*
*This document is the authority for all Active Workout Flow implementation in Phase 2B.*
