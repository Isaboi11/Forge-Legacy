# Forge Legacy — Program Detail Wireframe Specification
## W-3 | Phase 2B | Version 1.5 — June 2026

**Status:** Locked
**Authority:** Program-Architecture-Amendment-001-Active-Program-Rule.md
**PRD Authority:** Section 11 (Program System), Section 8 (Workout System — Programs), Section 5 (MVP — W-3)

---

## Preamble: What W-3 Is For

W-3 is the full program review surface. It renders across five distinct states depending on the program's relationship to the athlete.

W-3 answers:
- "What is this program, and is it right for me?" — Preview, Future states
- "Where am I in my current commitment?" — Active state
- "What is the record of this program in my legacy?" — Graduated, Ended Early states

W-3 is the only place in the product where:
- "Start Program" can be triggered
- The Conflict Resolution Sheet fires
- A Forge Program can be saved to the athlete's collection ("Save to Upcoming")
- A new Future program instance can be created from an Ended Early record ("Restart Program")
- A new Future program instance can be created from a Graduated record ("Run This Program Again")
- A Forge Program can be shared to a squad ("Share to Squad" — available in Preview, Future, Active, and Graduated states for eligible programs)

**What W-3 is not:**
W-3 is not a workout logging surface. When an athlete taps to begin a workout from W-3, they leave W-3 and enter the active workout flow. W-3 shows the program's structure and the athlete's place within it — it does not execute workouts.

W-3 is not a statistics surface. Performance data from completed workouts is not shown here. W-3 shows what workouts exist in the program and which have been completed — not how the athlete performed in them.

**W-3 is entered from:**
- W-2 Program Browse — all program card taps, all states
- W-IM-4 Import Confirm — after program creation via import; navigates to Future state
- M-4 Program Graduation Modal — program record link after graduation
- W-17 Workout Summary — program record link in graduation state
- W-3 Ended Early state — "Restart Program" creates a new Future instance and navigates to it
- W-3 Graduated state — "Run This Program Again" creates a new Future instance and navigates to it

**W-3 navigates to:**
- Active workout flow — from "Start Next Workout" on Active state
- W-5 Program Fork/Edit — from Future state overflow only
- W-3 Future state (new instance) — from "Restart Program" on Ended Early state
- W-3 Future state (new instance) — from "Run This Program Again" on Graduated state
- W-2 — back navigation
- Conflict Resolution Sheet — modal overlay, fires from "Start Program" when another program is Active
- Share picker bottom sheet — from "Share to Squad" overflow on eligible Forge Programs

**Restart Program and Amendment 001:**
Amendment 001 Section 1 prohibits "reactivation" of Ended Early programs — returning an Ended Early record to Active state. "Restart Program" does not reactivate the original record. It creates a new, independent Future program instance using the same structure as a template. The original Ended Early record remains sealed and immutable. Reactivation is a state change on an existing record; Restart is a creation operation. These are different things. W-3 defines this behavior; no revision to Amendment 001 is required.

---

## Section 1 — W-3 Goals

W-3 exists to accomplish five things:

1. **Enable informed commitment** — give the athlete a complete view of a program's structure before they commit to starting it
2. **Support active monitoring** — show the athlete exactly where they are in their current program, what they completed, and what comes next
3. **Preserve the legacy record** — show Graduated and Ended Early programs as sealed, immutable records of the athlete's training history
4. **Serve as the start/save entry point** — "Start Program" and "Save to Upcoming" live here and nowhere else
5. **Support the restart path** — allow an athlete who ended a program early to create a new Future instance, honoring the original record while opening a path forward

**What W-3 does NOT show:**
- Workout performance data (weight lifted, reps logged, PRs set)
- Goal or chapter context (programs are independent per Amendment 001 Section 8)
- Comparison to other athletes or previous attempts
- Streaks, days-since-last-workout, or time-pressure indicators

---

## Section 2 — Information Hierarchy

The hierarchy is consistent across all states, with state-specific blocks appearing or disappearing based on context.

**TIER 1 — Program Identity**
Program name, version, source badge, state label. Always present. Always the dominant visual element.

**TIER 2 — Program Status Block**
State-specific. Shows:
- Preview / Future: program metadata (duration, workout count, type/focus)
- Active: progress bar, workouts completed, started date
- Graduated: graduation date, total workouts, duration
- Ended Early: end date, workouts reached (X of Y)

**TIER 3 — Program Description**
Narrative description of what the program is, who it is for, what it builds. Present in all states.

**TIER 4 — Workout Schedule**
Full ordered list of workouts. Present in all states. Rendering differs per state (Section 10).

**TIER 5 — Primary Action Area**
State-dependent CTAs positioned after the workout schedule:
- Preview: "Start Program" (primary) + "Save to Upcoming" (secondary)
- Future: "Start Program" (primary)
- Active: "Start Next Workout" (primary)
- Graduated: "Run This Program Again" (secondary-styled)
- Ended Early: "Restart Program" (secondary-styled)

---

## Section 3 — Screen Header (Universal)

Present in all five states.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ←   [Program Name — truncated]              [  ⋯  ]   │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Program Name — full, 22sp, primary weight]            │
│  v[version]   ·   [State Label]   [Source Badge]        │  ← 13sp, secondary, muted
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Top App Bar:**
- Left: back arrow — returns to entering screen (W-2, W-IM-4, M-4, W-17, or originating Ended Early W-3)
- Center: program name, truncated to fit with ellipsis
- Right: overflow icon (⋯) — state-dependent contents

**Program Identity block:**
- Program name: 22sp, primary weight, wraps to 2 lines maximum
- Version: "v[X.X]" — 13sp, secondary, muted
- State label: 13sp, secondary, muted
- Source badge: "Forge" — shown only on system-created programs; absent on athlete-owned programs

**State label vocabulary:**

| Program State | State Label on W-3 |
|---------------|-------------------|
| Preview (Forge, not in collection) | No state label — "Forge" source badge only |
| Future | "Upcoming" |
| Active | "Active" |
| Graduated | "Graduated" |
| Ended Early | "Ended Early" |

Program name is always the dominant element. Version, state label, and source badge are all secondary at reduced weight and smaller size.

---

## Section 4 — Preview State (Forge Program, Not In Collection)

Shown when an athlete taps a Forge Program card from W-2 that has not yet been added to their collection.

```
┌─────────────────────────────────────────────────────────┐
│  ←   [Program Name]                          [  ⋯  ]   │
├─────────────────────────────────────────────────────────┤
│  [Program Name — 22sp, primary]                         │
│  v1.0   ·   Forge                                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [X] Workouts   ·   [Duration]   ·   [Type/Focus]       │  ← metadata row, 13sp secondary
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Program description — 15sp, secondary]                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  WORKOUTS                              [total count]    │
│  [Workout 1 — neutral]                                  │
│  [Workout 2 — neutral]                                  │
│  [Workout 3 — neutral]                                  │
│  ...                                                    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Start Program  ]                                    │  ← Primary CTA
│  [  Save to Upcoming  ]                                 │  ← Secondary CTA
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Program metadata row:**
- "[X] Workouts · [Duration] · [Type/Focus]" — 13sp, secondary
- Duration: the program's designed length (e.g., "8 Weeks," "12 Weeks")
- Type/Focus: set by the Forge team (e.g., "Strength," "Endurance," "Full Body")

**Overflow (⋯) — Preview state:**
- "Share to Squad" — available when athlete belongs to at least one squad; see Section 16
- Overflow icon present when "Share to Squad" is available; may be absent when athlete has no squads (implementation decision)
- No other actions — the athlete has not yet added this program to their collection

### 4.1 "Start Program" — Preview State

Primary CTA. Full-width primary button.

On tap:
1. System checks: Is another program Active?
   - NO → Program transitions directly to Active state. W-3 re-renders as Active state.
   - YES → Conflict Resolution Sheet fires (Section 13)

A Forge Program that has been started becomes athlete-owned: the athlete has their own instance with their own progress record.

### 4.2 "Save to Upcoming" — Preview State

Secondary CTA. Full-width outlined/secondary button.

On tap:
1. A new Future program instance is created from this Forge Program's structure
2. No conflict check — creating a Future instance does not conflict with an Active program
3. W-3 re-renders as Future state
4. Program appears in W-2 Upcoming section

### 4.3 What the Preview State Does NOT Show

- Progress bar
- Completion data
- Started date
- Popularity, completion rates, or community signals
- Ratings or reviews

---

## Section 5 — Future State (Saved, Not Started)

Shown when the program is in the athlete's collection but has not been started. Applies to:
- Programs saved via "Save to Upcoming" from Preview state
- Programs created via W-4
- Programs created via W-IM-4 Import Confirm
- Programs created via "Restart Program" from an Ended Early record

```
┌─────────────────────────────────────────────────────────┐
│  ←   [Program Name]                          [  ⋯  ]   │
├─────────────────────────────────────────────────────────┤
│  [Program Name — 22sp, primary]                         │
│  v[version]   ·   Upcoming                              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [X] Workouts   ·   [Duration]   ·   [Type/Focus]       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Program description — 15sp, secondary]                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  WORKOUTS                              [total count]    │
│  [Workout 1 — neutral]                                  │
│  [Workout 2 — neutral]                                  │
│  ...                                                    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Start Program  ]                                    │  ← Primary CTA
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Overflow (⋯) — Future state:**
- "Share to Squad" — Forge Programs only; when athlete has at least one squad; see Section 16
- "Edit Program" → W-5 Edit mode
- "Duplicate Program" → W-5 Fork mode (program limit check fires M-7 if athlete is at free-tier limit)
- "Remove Program" → confirmation sheet fires (see Section 5.1)

"Share to Squad" is absent for athlete-created and imported programs.

### 5.1 "Remove Program" — Future State Only

Future programs are the only deletable state (per W-2 Section 11.7 and Amendment 001 Section 6).

Confirmation sheet:

```
┌──────────────────────────────────────────────────────┐
│  Remove Program?                                     │
│                                                      │
│  [Program Name] will be removed from your            │
│  upcoming programs.                                  │
│                                                      │
│  [  Remove  ]                                        │  ← Destructive action
│  [  Cancel  ]                                        │
└──────────────────────────────────────────────────────┘
```

- "Remove" → program deleted; navigate back to W-2
- "Cancel" → sheet dismisses; athlete remains on W-3

### 5.2 "Start Program" — Future State

Identical logic to Preview state "Start Program" (Section 4.1). See Section 12 for full flow.

---

## Section 6 — Active State

Shown when this program is the athlete's current active program.

```
┌─────────────────────────────────────────────────────────┐
│  ←   [Program Name]                          [  ⋯  ]   │
├─────────────────────────────────────────────────────────┤
│  [Program Name — 22sp, primary]                         │
│  v[version]   ·   Active                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [████████████░░░░░░] 8 of 12 workouts                  │  ← Progress bar
│  Started [Month DD, YYYY]                               │  ← 12sp, muted
│                                                         │
│  Next: [Workout Name]                                   │  ← 15sp, primary
│  [  Start Next Workout  ]                               │  ← Primary CTA
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Program description — 15sp, secondary]                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  WORKOUTS                              [total count]    │
│  [Workout 1 — completed ✓]                              │
│  [Workout 2 — completed ✓]                              │
│  [Workout 3 — completed ✓]                              │
│  [Workout 4 — next / highlighted          NEXT ]        │  ← Current position
│  [Workout 5 — neutral]                                  │
│  [Workout 6 — neutral]                                  │
│  ...                                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Progress bar:**
- Full-width bar, proportional fill (X/Y ratio)
- "[X] of [Y] workouts" label inline or directly below
- Informational — not a streak, not a countdown, not pressure
- "Started [Month DD, YYYY]" below the bar: confirms when the athlete committed

**Next workout callout:**
- "Next: [Workout Name]" — 15sp, primary weight
- Always the immediate next uncompleted workout in the schedule

**"Start Next Workout" CTA:**
- Primary button — the primary action on Active state
- Navigates to the active workout flow for the next scheduled workout

**Overflow (⋯) — Active state:**
- "Share to Squad" — Forge Programs only; when athlete has at least one squad; see Section 16
- No "End Program" option — a program is ended only when the athlete starts a new program via the Conflict Resolution Sheet. The athlete ends a program by committing to another — not by abandoning it in isolation. Every Ended Early record is created in the context of a new commitment, keeping the record clean and intentional.

"Share to Squad" is absent for athlete-created and imported programs. When absent and no other actions are available, the overflow icon may be absent (implementation decision).

### 6.1 Active State at 0 Workouts Logged

```
[░░░░░░░░░░░░░░░░░░░░] 0 of 12 workouts
Started [Month DD, YYYY]

Next: [First Workout Name]
[  Start Next Workout  ]
```

Empty bar, "0 of 12 workouts." This is not an empty state — the program is active, the commitment has been made.

### 6.2 What the Active State Does NOT Show

- Volume data from completed workouts
- PRs set during this program
- Days since last workout or time-pressure language
- Comparison to other athletes

---

## Section 7 — Graduated State

Shown when the program was completed naturally through the final workout and W-17 graduation flow. Sealed, read-only legacy record.

```
┌─────────────────────────────────────────────────────────┐
│  ←   [Program Name]                          [  ⋯  ]   │
├─────────────────────────────────────────────────────────┤
│  [Program Name — 22sp, primary]                         │
│  v[version]   ·   Graduated                             │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Graduated [Month DD, YYYY]                             │  ← 15sp, primary weight
│  [Y] workouts completed   ·   [Duration]                │  ← 13sp, secondary
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Program description — 15sp, secondary]                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  WORKOUTS                              [total count]    │
│  [Workout 1 — completed ✓]                              │
│  [Workout 2 — completed ✓]                              │
│  ...                                                    │
│  [Workout Y — completed ✓]                              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  WHAT'S NEXT                                            │  ← 11sp, all caps, muted — present only when successorProgramId is set
│  [Successor Program Name — 15sp, primary]               │
│  [Category] · [Level] · [X] wks        [Forge]          │  ← 13sp, secondary; Forge badge if source: 'FORGE'
│  [  View Program  ]                                     │  ← secondary-styled button
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Run This Program Again  ]                           │  ← Secondary-styled CTA
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Completion record block:**
- "Graduated [Month DD, YYYY]" — 15sp, primary — the fact of graduation is prominently stated
- "[Y] workouts completed" — 13sp, secondary
- Duration: "8 weeks," "14 weeks" — calculated from start date to graduation date. A record of the journey's span.

**Overflow (⋯) — Graduated state:**
- "Share to Squad" — Forge Programs only; when athlete has at least one squad; see Section 16
- No other actions — sealed record
- Overflow icon may be absent when athlete has no squads (implementation decision)

### 7.1 "What's Next" Section — Graduated State

Displayed between the workout schedule and the "Run This Program Again" CTA when the graduated program has a `successorProgramId` set and the referenced `ProgramDefinition` is published.

**Display rules:**

- Section header: "WHAT'S NEXT" — 11sp, all caps, secondary muted (matches "WORKOUTS" section label style)
- Successor program name — 15sp, primary weight
- Metadata row: "[Category Display Name] · [Level Display Name] · [X] wks" — 13sp, secondary
- "Forge" badge displayed at right of metadata row if `source: 'FORGE'`
- "View Program" button — full-width, secondary-styled (same visual weight as "Run This Program Again")

**"View Program" behavior:**

On tap, navigate to W-3 of the successor program. The state shown depends on the athlete's relationship with the successor:
- No existing instance → W-3 Preview state (Forge Program not yet in collection)
- Future instance → W-3 Future state
- Active instance → W-3 Active state
- Graduated instance → W-3 Graduated state
- Ended Early instance → W-3 Ended Early state

Back navigation from the successor W-3 returns to this Graduated W-3.

**Absence rules:**

The "What's Next" section is entirely absent when:
- `successorProgramId` is `null` (terminal program; no successor exists)
- The referenced `ProgramDefinition` is not published (`publishedAt` is null)

No placeholder is shown in either case.

**What "What's Next" does NOT do:**

- Does not auto-enroll the athlete in the successor program
- Does not create any program instance
- Does not fire a conflict check
- Does not dismiss or replace the "Run This Program Again" action — both options remain available

**Why positioned above "Run This Program Again":**

The natural post-graduation question is "what comes next in my progression?" — showing the successor first serves this intent. "Run This Program Again" is the backward-looking option (repeat this program) and is available below. Both are secondary-styled, signaling they are equal forward options rather than competing primary actions.

### 7.2 "Run This Program Again" — Graduated State

Secondary-styled CTA. Full-width outlined/secondary button. Positioned below the workout schedule.

**Why secondary-styled:**
The primary content of the Graduated state is the legacy record itself. "Run This Program Again" is a forward-looking invitation — it does not compete with the record's primacy.

**On tap:**
1. A new Future program instance is created:
   - Same workout structure as the original Graduated program
   - Same program name
   - Version: v1.0 — fresh start, independent
   - State: Future
   - Progress: 0 workouts completed
   - No visible link to the original Graduated record
2. Navigate to W-3 displaying the new Future instance
3. Original Graduated record: unchanged, sealed, immutable

**What "Run This Program Again" does NOT do:**
- Does not change the Graduated record's state
- Does not fire a conflict check (Future instance creation does not conflict with an Active program)
- Does not prompt for confirmation or a reason

The action is immediate and silent: a new path is opened. The original record remains as written.

**Why this is Amendment 001 compliant:**
Amendment 001 prohibits reactivation — returning a Graduated record to Active state. "Run This Program Again" creates a new, independent record. The Graduated record's state never changes. This is identical in logic to "Restart Program" on the Ended Early state.

**What the Graduated state does NOT show:**
- Fork/template action (post-MVP consideration)
- Performance statistics
- Gamification or celebration (graduation was already celebrated via M-4 at completion time)

---

## Section 8 — Ended Early State

Shown when the program was intentionally ended before completion via the Conflict Resolution Sheet. Sealed, read-only legacy record — with one forward-looking action.

```
┌─────────────────────────────────────────────────────────┐
│  ←   [Program Name]                          [  ⋯  ]   │
├─────────────────────────────────────────────────────────┤
│  [Program Name — 22sp, primary]                         │
│  v[version]   ·   Ended Early                           │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Ended [Month DD, YYYY]                                 │  ← 15sp, primary weight
│  [X] of [Y] workouts completed                          │  ← 13sp, secondary
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Program description — 15sp, secondary]                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  WORKOUTS                              [total count]    │
│  [Workout 1 — completed ✓]                              │
│  [Workout 2 — completed ✓]                              │
│  [Workout 3 — completed ✓]                              │  ← X completed workouts
│  [Workout 4 — neutral]                                  │
│  [Workout 5 — neutral]                                  │  ← Y−X workouts not reached
│  ...                                                    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Restart Program  ]                                  │  ← Secondary-styled CTA
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**End record block:**
- "Ended [Month DD, YYYY]" — 15sp, primary — the date of the decision, stated cleanly
- "[X] of [Y] workouts completed" — 13sp, secondary — accurate record of what was reached

**Workout list in Ended Early state:**
- Completed workouts: completion indicator (✓)
- Workouts not reached: neutral style — same visual weight as upcoming workouts in a Future/Preview program
- No strikethrough on remaining workouts. No faded or dimmed treatment that implies failure. The workouts not reached are simply unstarted.
- Visual message: "Here is the path you took. Here is where it ended. The rest of the path still exists."

**Overflow (⋯) — Ended Early state:**
- No actions available — "Share to Squad" is not available in Ended Early state
- Overflow icon may be absent (implementation decision)

### 8.1 "Restart Program" — Ended Early State

Secondary-styled CTA. Full-width outlined/secondary button. Positioned below the workout schedule.

**Why secondary-styled:**
The primary content of this state is the legacy record itself. "Restart Program" is a forward-looking invitation — it does not compete with the record's primacy.

**On tap:**
1. A new Future program instance is created:
   - Same workout structure as the original program
   - Same program name
   - Version: v1.0 — fresh start, independent
   - State: Future
   - Progress: 0 workouts completed
   - No visible link to the original Ended Early record
2. Navigate to W-3 displaying the new Future instance
3. Original Ended Early record: unchanged, sealed, immutable

**What "Restart Program" does NOT do:**
- Does not change the Ended Early record's state
- Does not resume from the last workout reached
- Does not fire a conflict check (Future instance creation does not conflict with an Active program)
- Does not prompt for confirmation or a reason

The action is immediate and silent: a new path is opened. The original record remains as written.

### 8.2 Restart Program and Amendment 001

Amendment 001 Section 1 states: "An Ended Early program cannot be reactivated."

Restart Program is not reactivation. Reactivation would change the Ended Early record's state back to Active. Restart Program creates a new, independent record. The Ended Early record's state never changes — it remains Ended Early permanently.

The athlete's legacy may eventually show:
- "[Program Name] — Ended Early — [Date 1]"
- "[Program Name] — Graduated — [Date 2]"

This is the story: "I stopped, came back, and finished." It is fully supported by the state architecture without modification to Amendment 001.

### 8.3 What the Ended Early State Does NOT Show

- "Continue from where I left off" option
- Performance statistics from completed workouts
- Encouragement copy ("try harder," "finish this time")
- Visual stigma of any kind
- A question about why the program was ended

---

## Section 9 — Program Description

Narrative description block present in all five states.

**Content:**
- What the program is designed to build
- Who the program is for
- What training methodology it follows

**Display rules:**
- 15sp, secondary weight
- Displayed in full — no "Show more / Show less" truncation for MVP
- If no description is provided: the description block is absent; no placeholder text
- Set by the Forge team (system programs) or by the athlete at creation (W-4) — not editable from W-3

**Position:**
Between the status block (Tier 2) and the workout schedule (Tier 4).

---

## Section 10 — Workout Schedule Display

Full ordered list of all workouts in the program. Present in all five states. Visual treatment changes per state.

### 10.1 Workout Row Anatomy

```
─────────────────────────────────────────────────────────
WORKOUTS                                        [count]
─────────────────────────────────────────────────────────
┌────────────────────────────────────────────────────────┐
│  [#]   [Workout Name — 15sp, primary]      [indicator] │
│        [Brief descriptor — 12sp, secondary, optional]  │
└────────────────────────────────────────────────────────┘
```

- Row number: sequential position — 12sp, muted
- Workout name: 15sp, primary weight
- Brief descriptor: optional metadata (exercise count, estimated duration) — 12sp, secondary; absent if not provided
- Indicator: right-aligned — completion checkmark (✓) or "NEXT" label (Active state only)
- Full row is tappable — behavior per state (Section 10.4)

### 10.2 Workout Row States

| Program State | Completed Rows | Next/Current Row | Remaining Rows |
|--------------|---------------|-----------------|---------------|
| Preview | — | — | All neutral |
| Future | — | — | All neutral |
| Active | Completion indicator (✓) | Highlighted + "NEXT" label | Neutral |
| Graduated | Completion indicator (✓) on all rows | — | — |
| Ended Early | Completion indicator (✓) on reached rows | — | Neutral — not dimmed, not marked failed |

**Highlighted "next" row (Active state only):**
- Slightly elevated visual treatment (background fill or left accent)
- "NEXT" label at right: 11sp, accent color, all caps
- Only one row highlighted at a time

**Neutral rows:**
Default visual weight. Unstarted workouts — not failed workouts.

**"Not reached" rows in Ended Early state:**
Rendered as neutral — visually identical to upcoming workouts in a Future program. No strikethrough. No diminished opacity below readable threshold. No red or error color.

### 10.3 Section Label

```
WORKOUTS                                        [count]
```

- "WORKOUTS" — 11sp, all caps, secondary, muted
- Count of total workouts in the program at right

### 10.4 Workout Row Tap Behavior

| State | Row Type | Tap Behavior |
|-------|----------|-------------|
| Preview | Any | No action — preview is read-only; athlete does not own this program |
| Future | Any row (no exercises built) | → W-24 (Workout Builder) — "Build Workout" entry |
| Future | Any row (exercises already built) | → W-24 (Workout Builder) — "Edit Workout" entry; slot loads with existing exercises |
| Active | Next workout | Initiates workout (same as "Start Next Workout" CTA) |
| Active | Completed workout | Navigates to workout log record (post-MVP; if unavailable, no action) |
| Active | Upcoming workout (not next) | → W-24 (Workout Builder) — "Edit Workout" entry for pre-planning |
| Graduated | Any | Navigates to workout log record (post-MVP; if unavailable, no action) |
| Ended Early | Completed | Navigates to workout log record (post-MVP; if unavailable, no action) |
| Ended Early | Not reached | → W-24 (Workout Builder) — "Edit Workout" entry (program is editable as long as it can be restarted) |

**"Build Workout" vs. "Edit Workout" distinction:**
- "Build Workout" — slot has no exercises (`sections: [{ type: 'MAIN', exercises: [] }]` or equivalent empty state). W-24 opens to the empty builder with the slot's name pre-populated.
- "Edit Workout" — slot has at least one exercise in any section. W-24 opens with existing exercises loaded.

The distinction is surfaced on the row itself as secondary text: "0 exercises · Build Workout" or "[N] exercises · Tap to edit." This gives the athlete at-a-glance feedback on which slots still need to be built.

**Preview state exception:** A Forge Program's workouts cannot be edited from W-3. Editing Forge programs is only available through the Fork/Edit flow (W-5), which creates an athlete-owned copy before any modifications.

---

## Section 11 — Goal & Chapter Integration

### 11.1 W-3 Does Not Display Goal or Chapter Context

W-3 does not show which goal a program supports, which chapter a program belongs to, or whether the athlete has an active chapter or goal at all.

Governed by Amendment 001 Section 8: programs are independent. The program detail screen is the program's own record.

### 11.2 Program Actions Are Not Gated on Goal or Chapter State

- "Start Program" does not require an active chapter or goal
- "Save to Upcoming" does not prompt for chapter or goal assignment
- "Restart Program" does not require or prompt for chapter or goal assignment
- "Run This Program Again" does not require or prompt for chapter or goal assignment
- An athlete with no goals or chapters can use all W-3 actions without restriction

### 11.3 Chapter/Program Intersection — Open Decision

As noted in Amendment 001 Section 10: if an athlete archives a chapter while a program is Active, the system requires a separate architecture decision. That decision is outside W-3's scope.

---

## Section 12 — Start Program Logic

### 12.1 Entry Points

"Start Program" is available in:
- Preview state
- Future state

"Start Program" is NOT available in:
- Active state (already active)
- Graduated state (sealed record)
- Ended Early state (sealed record — "Restart Program" is the forward action here)

### 12.2 Full Start Program Flow

```
Athlete taps "Start Program"
          ↓
System checks: Is another program Active?
       ↙                         ↘
      NO                        YES
       ↓                         ↓
Program → Active          Conflict Resolution Sheet fires
W-3 re-renders                   ↓
as Active state    ┌─────────────────────────────────┐
                   │  "End Current Program          │  "Cancel"
                   │   & Start New"                 │       ↓
                   └─────────────┬───────────────────┘  Sheet dismisses
                                 ↓                      No changes
                   Current Active → Ended Early         Athlete stays on W-3
                   New program → Active
                   W-3 re-renders as Active state
```

### 12.3 After Start Program Completes

- W-3 displays the program in Active state
- Progress bar shows 0 of Y workouts, empty bar
- Started date set to today
- "Start Next Workout" CTA points to Workout 1
- If a previous program was ended early: its record is sealed; it appears in W-2 Legacy Programs as Ended Early

---

## Section 13 — Conflict Resolution Sheet

Fires when "Start Program" is tapped on W-3 and another program is currently Active. Defined by Amendment 001 Section 3. This spec implements it without deviation.

```
┌──────────────────────────────────────────────────────┐
│  Current Program Active                              │
│                                                      │
│  You already have an active program.                 │
│                                                      │
│  Starting a new program will end your current        │
│  program.                                            │
│                                                      │
│  [  End Current Program & Start New  ]               │  ← Destructive action
│  [  Cancel  ]                                        │  ← Dismisses sheet
└──────────────────────────────────────────────────────┘
```

**"End Current Program & Start New" selected:**
1. Previously Active program → Ended Early state (permanent record created: name, version, date, workouts completed)
2. New program → Active state
3. No graduation flow fires for the ended program
4. No screen or modal acknowledges the ended program
5. W-3 re-renders as Active state for the new program

**"Cancel" selected:**
1. Sheet dismisses
2. Currently Active program remains Active
3. No state changes
4. Athlete remains on W-3 (Preview or Future state of the program they were considering)

**Sheet fires from W-3 only.**
Never from W-2 cards. The athlete must navigate to W-3 and tap "Start Program" before the conflict check runs.

---

## Section 14 — Restart Program Logic

### 14.1 Entry Point

"Restart Program" CTA is available only in Ended Early state.

### 14.2 Full Restart Program Flow

```
Athlete taps "Restart Program" (Ended Early state)
          ↓
System creates new Future program instance:
  · Workout structure: same as original Ended Early program
  · Name: same program name
  · Version: v1.0
  · State: Future
  · Progress: 0 workouts
  · No link to original Ended Early record
  · Fully independent lifecycle
          ↓
Navigate to W-3 — Future state of new instance
(original Ended Early record unchanged)
```

### 14.3 No Conflict Check at Restart

"Restart Program" creates a Future instance — it does not activate anything. No conflict sheet fires. The conflict sheet will fire later if the athlete taps "Start Program" on the new Future instance while another program is Active.

### 14.4 Original Record After Restart

The original Ended Early record:
- Remains Ended Early permanently
- Remains in W-2 Legacy Programs section
- Is not visually linked to the new Future instance
- Does not change in any way

### 14.5 New Instance After Restart

The new Future program:
- Appears in W-2 Upcoming section
- Has its own independent start date (set when the athlete eventually starts it)
- Follows all Future state rules: can be edited via W-5, removed, or started
- When eventually completed or ended: creates its own state records independently

### 14.6 "Run This Program Again" — Graduated State Logic

"Run This Program Again" follows identical creation logic to "Restart Program." The only differences are the CTA label and the originating state.

| | Restart Program | Run This Program Again |
|-|----------------|----------------------|
| Originating state | Ended Early | Graduated |
| CTA label | "Restart Program" | "Run This Program Again" |
| New instance structure | Same as original | Same as original |
| New instance version | v1.0 | v1.0 |
| New instance state | Future | Future |
| Conflict check | No | No |
| Original record | Unchanged | Unchanged |
| Navigates to | W-3 Future (new instance) | W-3 Future (new instance) |

The back-navigation behavior is identical: back from the new Future W-3 returns to the originating Graduated W-3.

---

## Section 15 — Save Program Logic (Preview → Future)

### 15.1 "Save to Upcoming" — Preview State Only

On tap:
1. New Future program instance created from the Forge Program's structure
2. No conflict check — Future instances do not activate programs
3. W-3 re-renders as Future state
4. Program appears in W-2 Upcoming section

### 15.2 After Saving

The program is now athlete-owned in Future state. It follows all Future state rules:
- Can be started
- Can be edited via W-5
- Can be removed (overflow)
- Appears in W-2 Upcoming

---

## Section 16 — Share to Squad Flow

### 16.1 Share Eligibility

"Share to Squad" appears in the overflow (⋯) when ALL of the following are true:

1. `ProgramDefinition.source = 'FORGE'`
2. `ProgramDefinition.publishedAt` is non-null (program is published)
3. The athlete belongs to at least one squad

The option is suppressed when any condition is unmet. The overflow icon may be absent when the option is suppressed and no other overflow actions are available (implementation decision).

**Available in states:** Preview, Future, Active, Graduated.
**Not available in:** Ended Early.

### 16.2 Share Picker Bottom Sheet

On tap of "Share to Squad" from any eligible state:

```
┌──────────────────────────────────────────────────────┐
│  ▁▁▁▁  (drag handle)                                 │
│                                                      │
│  Share to Squad                      17sp, primary   │
│                                                      │
│  Select squads to share with:        13sp, secondary │
│                                                      │
│  ☐  [Squad Name 1]                                   │
│  ☐  [Squad Name 2]                                   │
│  ☐  [Squad Name N]                                   │
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  Add a message (optional)            13sp, secondary │
│  ┌──────────────────────────────────────────────┐   │
│  │ [Message field — 13sp, up to 280 chars]      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  [          Share          ]   ← Primary; disabled until ≥1 squad selected
│  [          Cancel         ]                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Squad list:** All squads the athlete belongs to. Multi-select checkboxes. No pre-selection. If athlete belongs to exactly one squad, that squad appears as a single row — not pre-selected.

**Message field:** Optional. Max 280 characters. Character count shown once athlete begins typing ("47 / 280"). Plain text only.

**Share button:** Disabled until at least one squad is selected.

**Cancel:** Dismisses the sheet. No ProgramShare records created. W-3 remains on current state.

### 16.3 Share Confirmation

On tapping Share:
1. One `ProgramShare` record created per selected squad
2. `shareContext` auto-populated by the API — never surfaced in the share flow
3. Sheet dismisses
4. "Program shared with squad." toast shown on W-3
5. W-3 remains on current state — no re-render, no navigation

### 16.4 What Share Does NOT Do

- Does not create a ProgramInstance
- Does not auto-enroll any athlete
- Does not modify any ProgramInstance state
- Does not navigate away from W-3
- Does not expose `shareContext` to the athlete

---

## Section 17 — Navigation

### 17.1 Entry Points

| Entering From | State Shown on W-3 |
|--------------|-------------------|
| W-2 — Active program card | Active |
| W-2 — Future program card | Future |
| W-2 — Graduated program card | Graduated |
| W-2 — Ended Early program card | Ended Early |
| W-2 — Forge Program card | Preview |
| W-IM-4 Import Confirm | Future (new import) |
| M-4 Program Graduation Modal | Graduated |
| W-17 Workout Summary (graduation state) | Graduated |
| W-3 "Restart Program" (Ended Early → new instance) | Future (new instance) |
| W-3 "Run This Program Again" (Graduated → new instance) | Future (new instance) |

### 17.2 Exit Points

| Action | Destination |
|--------|------------|
| Back arrow | Returns to entering screen |
| "Start Next Workout" (Active state) | Active workout flow |
| "Edit Program" (Future state overflow) | W-5 Edit mode |
| "Duplicate Program" (Future state overflow) | W-5 Fork mode |
| "Remove Program" → "Remove" confirmation | W-2 |
| "Start Program" — no conflict | W-3 re-renders as Active state |
| "Start Program" → conflict sheet → "End Current Program & Start New" | W-3 re-renders as Active state |
| "Start Program" → conflict sheet → "Cancel" | W-3 remains on current state |
| "Save to Upcoming" (Preview state) | W-3 re-renders as Future state |
| "View Program" (Graduated state — What's Next section) | W-3 of successor program (appropriate state) |
| "Run This Program Again" (Graduated state) | W-3 Future state — new instance |
| "Restart Program" (Ended Early state) | W-3 Future state — new instance |
| "Share to Squad" (overflow — eligible Forge Programs) | Share picker bottom sheet (Section 16.2) |
| Share picker — "Share" | Sheet dismisses; "Program shared with squad." toast; W-3 stays on current state |
| Share picker — "Cancel" | Sheet dismisses; no action; W-3 stays on current state |
| Workout row tap — Future state (any row) | W-24 (Build Workout or Edit Workout) |
| Workout row tap — Active state, upcoming row | W-24 (Edit Workout) |
| Workout row tap — Ended Early state, not-reached row | W-24 (Edit Workout) |

---

## Section 18 — Edge Cases

### 18.1 Program With No Description

Description block is absent. No placeholder. Section divider above description is also absent. Workout schedule follows directly from the status block.

### 18.2 Very Long Program Name

Wraps to 2 lines maximum at 22sp. If a name exceeds 2 lines: truncate at line 2 with ellipsis. Top App Bar always shows truncated name — the full name is always visible in the Program Identity block.

### 18.3 Single-Workout Program

Valid state. Progress bar (Active): "0 of 1" or "1 of 1." Ended Early on a single-workout program: "1 of 1 workouts completed, Ended Early" — accurate and neutral.

### 18.4 Active State at 0 Workouts Logged

Empty progress bar. "0 of Y workouts." Workout 1 highlighted as "NEXT." No empty-state messaging — the program is active.

### 18.5 Ended Early After 0 Workouts

"0 of Y workouts completed." All workout rows are neutral (not reached). "Restart Program" remains available. No special messaging.

### 18.6 Forge Program Already In Athlete's Collection

The Preview state should not be reachable for programs already in the athlete's collection. W-2 excludes already-collected programs from the Forge Programs section — so the only path to Preview state is from an uncollected Forge Program card. If the athlete somehow navigates to a collected Forge Program via an unexpected path, the system renders the current state (Future, Active, Graduated, or Ended Early) rather than Preview.

### 18.7 Long Workout List (30+ Workouts)

All workouts displayed in a single scrollable list. No pagination for MVP.

### 18.8 Back Navigation After Restart Program

After "Restart Program" navigates to the new Future W-3:
- Back arrow → returns to the original Ended Early W-3
- From Ended Early W-3 → back arrow returns to W-2

The full navigation path is traceable.

---

## Section 19 — Mobile UX Considerations

### 19.1 Screen Type

Standard navigation stack screen. Top App Bar with back button. Tab Bar visible at bottom (Workouts tab active). Not a modal sheet.

### 19.2 Scroll Behavior

Single vertical scroll. No tabs. Program Identity block scrolls with the page — it does not stick. CTAs are positioned in the scroll after the workout schedule, not floating/sticky. The athlete reviews the program before reaching the action.

### 19.3 Top App Bar

- Title: program name, truncated with ellipsis if needed
- Left: back arrow, 44×44dp minimum
- Right: overflow icon, 44×44dp minimum — may be absent in Preview, Graduated, and Ended Early states if no actions are available (implementation decision)

### 19.4 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| Back arrow | 44×44dp |
| Overflow icon (⋯) | 44×44dp |
| Workout row | Full width × 56dp minimum |
| "Start Program" | Full width × 48dp |
| "Save to Upcoming" | Full width × 48dp |
| "Start Next Workout" | Full width × 48dp |
| "Restart Program" | Full width × 48dp |
| "Run This Program Again" | Full width × 48dp |
| Conflict sheet / Remove confirmation buttons | Full width × 52dp |
| Share picker "Share" / "Cancel" buttons | Full width × 52dp |

### 19.5 Portrait Orientation

W-3 is portrait only.

### 19.6 Accessibility Labels

**Preview state:**
- Program identity region: `accessibilityLabel` = "[Program Name], Forge program, [X] workouts, [Duration]"
- "Start Program": `accessibilityLabel` = "Start [Program Name]"
- "Save to Upcoming": `accessibilityLabel` = "Save [Program Name] to upcoming programs"

**Future state:**
- Program identity region: `accessibilityLabel` = "[Program Name], upcoming program, [X] workouts"
- "Start Program": `accessibilityLabel` = "Start [Program Name]"

**Active state:**
- Progress bar: `accessibilityLabel` = "[X] of [Y] workouts completed in [Program Name]"
- "Start Next Workout": `accessibilityLabel` = "Start next workout: [Workout Name]"

**Graduated state:**
- Completion block: `accessibilityLabel` = "[Program Name], graduated [Month DD, YYYY], [Y] workouts completed"
- "Run This Program Again": `accessibilityLabel` = "Run [Program Name] again — creates a new upcoming program"

**Ended Early state:**
- End record block: `accessibilityLabel` = "[Program Name], ended early [Month DD, YYYY], [X] of [Y] workouts completed"
- "Restart Program": `accessibilityLabel` = "Restart [Program Name] — creates a new upcoming program"

**Workout rows:**
- Completed: `accessibilityLabel` = "[Workout Name], completed"
- Next (Active): `accessibilityLabel` = "[Workout Name], next workout"
- Neutral/upcoming: `accessibilityLabel` = "[Workout Name]"

---

## Section 20 — Amendment 001 Compliance

### State Transition Enforcement on W-3

| Transition | How W-3 Enforces It |
|-----------|---------------------|
| Future → Active | "Start Program" CTA triggers this transition |
| Active → Ended Early | Only via conflict sheet "End Current Program & Start New" — no standalone button |
| Active → Graduated | Does not originate on W-3 — occurs via W-17 graduation flow |
| No reactivation of Graduated | "Run This Program Again" creates a new Future instance — the Graduated record's state never changes; this is not reactivation |
| No reactivation of Ended Early | "Restart Program" creates a new Future instance — the Ended Early record's state never changes; this is not reactivation |
| No conversion between states | No action converts Graduated to Ended Early or vice versa |
| No deletion of Graduated records | No overflow action on Graduated state |
| No deletion of Ended Early records | No overflow action on Ended Early state |

### Display Rule Enforcement

| Rule | How W-3 Enforces It |
|------|---------------------|
| Program name is primary | 22sp, primary weight — always the largest text on screen |
| State label is secondary | 13sp, muted — inline with version number |
| No visual stigma for Ended Early | Neutral rows for not-reached workouts; no red, no strikethrough, no failure iconography |
| No performance data | No volume, PRs, or workout-level metrics in any state |

### Restart Program vs. Reactivation — Explicit Statement

Amendment 001 Section 1: "An Ended Early program cannot be reactivated."

"Reactivation" = returning an Ended Early record to Active state (a state change on the historical record).

"Restart Program" = creation of a new, independent Future program record. The Ended Early record's state is never modified. It remains Ended Early permanently.

These are different operations. Restart Program is Amendment 001 compliant. No revision to Amendment 001 is required.

---

## Section 21 — Validation Checklist

### Screen Structure
- [ ] Top App Bar: back arrow + program name (truncated) + overflow icon
- [ ] Program Identity block: full name (22sp, primary), version, state label, source badge
- [ ] Single vertical scroll — no tabs
- [ ] Tab Bar visible (Workouts tab active)

### Preview State
- [ ] No state label — "Forge" source badge only in identity line
- [ ] Program metadata row: workout count, duration, type/focus
- [ ] Program description present (or absent if none provided — no placeholder)
- [ ] Workout schedule: all rows neutral
- [ ] Primary CTA: "Start Program"
- [ ] Secondary CTA: "Save to Upcoming"
- [ ] No progress bar
- [ ] No completion data
- [ ] Overflow: "Share to Squad" visible when athlete has ≥1 squad (Forge Programs only)
- [ ] Overflow icon absent when athlete has 0 squads
- [ ] "Save to Upcoming" creates Future instance — no conflict check
- [ ] "Start Program" checks for Active conflict
- [ ] No popularity, ratings, or community signals

### Future State
- [ ] State label: "Upcoming"
- [ ] Program metadata row: workout count, duration, type/focus
- [ ] Program description present (or absent)
- [ ] Workout schedule: all rows neutral
- [ ] Primary CTA: "Start Program"
- [ ] No "Save to Upcoming" (already in collection)
- [ ] Overflow (Forge Programs): "Share to Squad" (when athlete has ≥1 squad) + "Edit Program" + "Duplicate Program" + "Remove Program"
- [ ] Overflow (athlete-created/imported): "Edit Program" + "Duplicate Program" + "Remove Program" — no "Share to Squad"
- [ ] "Remove Program" fires confirmation sheet before deletion
- [ ] After "Remove" confirmed: navigate back to W-2
- [ ] "Start Program" checks for Active conflict

### Active State
- [ ] State label: "Active"
- [ ] Progress bar: X of Y workouts, proportional fill
- [ ] Started date below progress bar (12sp, muted)
- [ ] "Next: [Workout Name]" callout (15sp, primary)
- [ ] Primary CTA: "Start Next Workout" → active workout flow
- [ ] Workout schedule: completed rows (✓), next row (highlighted + "NEXT" label), remaining rows (neutral)
- [ ] Only one workout row highlighted as "NEXT" at a time
- [ ] Overflow (Forge Programs): "Share to Squad" visible when athlete has ≥1 squad
- [ ] Overflow absent (or no "Share to Squad") for athlete-created/imported programs
- [ ] No "End Program" button
- [ ] No standalone end action of any kind
- [ ] No performance data (no volume, no PRs)
- [ ] No "Save to Upcoming" or "Start Program" CTA

### Graduated State
- [ ] State label: "Graduated"
- [ ] "Graduated [Month DD, YYYY]" — 15sp, primary weight
- [ ] "[Y] workouts completed" — 13sp, secondary
- [ ] Duration from start to graduation — 13sp, secondary
- [ ] Workout schedule: all rows completed (✓)
- [ ] "What's Next" section present when `successorProgramId` is non-null and successor is published
- [ ] "What's Next" section absent (no placeholder) when `successorProgramId` is null or successor is unpublished
- [ ] "What's Next" header: "WHAT'S NEXT" — 11sp, all caps, muted
- [ ] Successor program name — 15sp, primary
- [ ] Successor metadata row: category · level · duration — 13sp, secondary; "Forge" badge if applicable
- [ ] "View Program" button — secondary-styled — navigates to successor W-3 in appropriate state
- [ ] "View Program" does not create an instance or fire a conflict check
- [ ] CTA: "Run This Program Again" — secondary-styled button — below "What's Next" section
- [ ] Overflow (Forge Programs): "Share to Squad" visible when athlete has ≥1 squad
- [ ] Overflow absent (or no "Share to Squad") for athlete-created/imported programs
- [ ] No "Reactivate" or "Fork" actions
- [ ] "Run This Program Again" creates new Future instance: same structure, v1.0, 0 progress, independent lifecycle
- [ ] "Run This Program Again" — no conflict check fires
- [ ] "Run This Program Again" navigates to W-3 Future state of new instance
- [ ] Original Graduated record unchanged after action
- [ ] Back from new Future W-3 → returns to original Graduated W-3
- [ ] Back from successor W-3 (via "View Program") → returns to this Graduated W-3

### Ended Early State
- [ ] State label: "Ended Early"
- [ ] "Ended [Month DD, YYYY]" — 15sp, primary weight
- [ ] "[X] of [Y] workouts completed" — 13sp, secondary
- [ ] Workout schedule: completed rows (✓) + not-reached rows (neutral)
- [ ] Not-reached rows: NOT strikethrough, NOT red, NOT dimmed below readable threshold
- [ ] CTA: "Restart Program" — secondary-styled button
- [ ] No overflow actions (or overflow absent) — "Share to Squad" is NOT available in Ended Early state
- [ ] No "Resume," "Reactivate," or "Continue" actions
- [ ] "Restart Program" creates new Future instance: same structure, v1.0, 0 progress, independent lifecycle
- [ ] "Restart Program" — no conflict check fires
- [ ] "Restart Program" navigates to W-3 Future state of new instance
- [ ] Original Ended Early record unchanged after Restart
- [ ] Back from new Future W-3 → returns to original Ended Early W-3

### Start Program Logic
- [ ] "Start Program" available on Preview and Future states only
- [ ] Conflict check fires when another program is Active
- [ ] Conflict sheet title: "Current Program Active"
- [ ] Conflict sheet body: "You already have an active program.\n\nStarting a new program will end your current program."
- [ ] "End Current Program & Start New": current Active → Ended Early, new → Active
- [ ] "Cancel": no state changes, athlete remains on W-3
- [ ] After successful start: W-3 re-renders as Active state
- [ ] Conflict sheet fires from W-3 only — never from W-2 cards

### Save Program Logic
- [ ] "Save to Upcoming" available on Preview state only
- [ ] Creates Future instance — no conflict check
- [ ] W-3 re-renders as Future state after save
- [ ] Program appears in W-2 Upcoming section

### Restart Program Logic
- [ ] "Restart Program" available on Ended Early state only
- [ ] Creates new Future instance: same structure, v1.0, 0 progress
- [ ] No conflict check at Restart
- [ ] Navigates to W-3 Future state of new instance
- [ ] Original Ended Early record: state unchanged, sealed, immutable, still visible in W-2 Legacy Programs

### Run This Program Again Logic
- [ ] "Run This Program Again" available on Graduated state only
- [ ] Creates new Future instance: same structure, v1.0, 0 progress
- [ ] No conflict check
- [ ] Navigates to W-3 Future state of new instance
- [ ] Original Graduated record: state unchanged, sealed, immutable, still visible in W-2 Legacy Programs

### Share to Squad
- [ ] "Share to Squad" visible in overflow for Forge Programs in Preview, Future, Active, Graduated states when athlete has ≥1 squad
- [ ] "Share to Squad" absent for athlete-created and imported programs in all states
- [ ] "Share to Squad" absent in Ended Early state
- [ ] "Share to Squad" absent when athlete belongs to 0 squads
- [ ] Share picker bottom sheet: title "Share to Squad", squad list (multi-select checkboxes, no pre-selection), optional message field (max 280 chars)
- [ ] Share button disabled until ≥1 squad selected
- [ ] Cancel: sheet dismisses, no records created, W-3 remains on current state
- [ ] Share: one ProgramShare record per selected squad
- [ ] shareContext auto-populated by API — not shown to athlete in share flow
- [ ] Success toast: "Program shared with squad."
- [ ] W-3 remains on current state after share — no navigation, no re-render
- [ ] Share does not create a ProgramInstance
- [ ] Share does not modify any ProgramInstance state

### Goal & Chapter Integration
- [ ] W-3 does not display goal or chapter context in any state
- [ ] "Start Program" does not gate on chapter or goal existence
- [ ] "Save to Upcoming" does not prompt for chapter or goal
- [ ] "Restart Program" does not prompt for chapter or goal
- [ ] "Run This Program Again" does not prompt for chapter or goal

### Amendment 001 Compliance
- [ ] One Active program maximum — conflict sheet enforces this
- [ ] Ended Early created only via conflict sheet — no standalone End button
- [ ] Graduated: "Run This Program Again" creates new Future instance — not reactivation; original record unchanged
- [ ] Ended Early: "Restart Program" creates new Future instance — not reactivation; original record unchanged
- [ ] No deletion of Graduated or Ended Early records from W-3
- [ ] No state conversion between Graduated and Ended Early
- [ ] Program name always primary visual element — state label always secondary weight
- [ ] No visual stigma for Ended Early state

### Navigation
- [ ] All entry points navigate to the correct state
- [ ] Back arrow returns to entering screen
- [ ] "Start Next Workout" → active workout flow (Active state)
- [ ] "Edit Program" → W-5 (Future state overflow only)
- [ ] "Remove" → W-2 (after Future state removal)
- [ ] "Run This Program Again" → W-3 Future state (new instance)
- [ ] "Restart Program" → W-3 Future state (new instance)
- [ ] W-3 re-renders in place for Start Program and Save to Upcoming flows
- [ ] Back from new Future W-3 (post-"Run This Program Again") → returns to originating Graduated W-3
- [ ] Back from new Future W-3 (post-Restart) → returns to originating Ended Early W-3
- [ ] "Share to Squad" (overflow) → share picker bottom sheet (Section 16.2)
- [ ] Share picker "Share" → sheet dismisses; "Program shared with squad." toast; W-3 stays on current state
- [ ] Share picker "Cancel" → sheet dismisses; no action; W-3 stays on current state

### Mobile UX
- [ ] All tap targets meet minimums (workout rows ≥ 56dp, CTAs ≥ 48dp, sheet buttons ≥ 52dp)
- [ ] Portrait orientation
- [ ] Progress bar has accessible label (Active state)
- [ ] All interactive elements have accessibility labels per state
- [ ] Overflow icon absent (or no-op) on states with no overflow actions

---

*Forge Legacy Program Detail Wireframe Specification — W-3*
*v1.5 — June 2026*
*Authority: Program-Architecture-Amendment-001-Active-Program-Rule.md*
*PRD: Section 11 (Program System), Section 8 (Workout System), Section 5 (MVP)*

---

## Change Log

### v1.5 — June 2026

**W3-A3:** Added "Share to Squad" to the overflow (⋯) for Forge Programs in Preview, Future, Active, and Graduated states (Ended Early excluded by architecture). Share is gated to `source: 'FORGE'` + published + athlete has ≥1 squad. Added Section 16 (Share to Squad Flow): §16.1 eligibility rules, §16.2 share picker bottom sheet specification (squad multi-select, optional message field, Share/Cancel), §16.3 confirmation flow and success toast ("Program shared with squad."), §16.4 non-behaviors. `shareContext` is API-derived at creation — not shown in the share picker. Former Sections 16–20 renumbered to Sections 17–21 to accommodate the new section. §17.2 exit points updated with three share picker rows. §19.4 tap targets updated with share picker button minimum. §21 validation checklist updated: all state-specific overflow items revised; new "Share to Squad" subsection added (13 items); Navigation subsection updated. Preamble "only place" list and "navigates to" list both updated.

### v1.4 — June 2026

**W3-A2:** Added "What's Next" section to the Graduated state. Displays when the graduated program's `ProgramDefinition.successorProgramId` is non-null and the referenced successor is published. Section shows successor program name, category/level/duration metadata, and a "View Program" button (secondary-styled) that navigates to the successor's W-3 in the appropriate state. Positioned above "Run This Program Again" — successor progression is surfaced first; repeat option remains available below. Section is entirely absent when no successor exists (no placeholder). "View Program" does not create instances or fire conflict checks. §7 updated with wireframe, §7.1 "What's Next" subsection added (former §7.1 renumbered to §7.2). §16.2 exit points updated. §20 validation checklist Graduated state updated.

### v1.3 — June 2026

**W3-A1:** Workout slot rows in Future state now tap → W-24 (Workout Builder). "Build Workout" entry when slot has no exercises; "Edit Workout" entry when slot has exercises. Active state upcoming rows also tap → W-24 for pre-session editing. Ended Early not-reached rows tap → W-24. Preview state rows remain no-action (athlete does not own Forge Programs). Secondary text on each slot row now shows exercise count + action hint ("0 exercises · Build Workout" or "[N] exercises · Tap to edit"). W-24 is now listed as a W-3 navigation destination. §10.4 updated. §16.2 exit points table updated.

### v1.2 — June 2026

Added "Duplicate Program" to Future state overflow (⋯), between "Edit Program" and "Remove Program." On tap, W-5 opens in Fork mode (program limit check fires M-7 if athlete is at free-tier program limit). Section 5 overflow updated. Section 16.2 exit points table updated. Driven by W-5 Program Fork/Edit Wireframe Specification v1.0. All existing behavior unchanged.

### v1.1 — June 2026

Added "Run This Program Again" CTA to Graduated state. Behavior mirrors "Restart Program" on the Ended Early state: creates a new independent Future program instance from the Graduated record's structure; the original Graduated record is unchanged and immutable. Amendment 001 compliant — this is creation, not reactivation. Section 7 updated with CTA, wireframe, and 7.1 subsection. Section 14.6 added as a comparison table of the two new-instance creation actions. Section 16.2 (navigation), Section 19 (Amendment 001 compliance), and Section 20 (validation checklist — Graduated state and Navigation) updated accordingly.

### v1.0 — June 2026

Initial specification. W-3 Program Detail created as part of Phase 2B wireframe documentation. Implements five-state program model per Program-Architecture-Amendment-001: Preview (Forge Program not yet in collection), Future, Active, Graduated (read-only legacy record), Ended Early (read-only legacy record with one forward action). Conflict Resolution Sheet specified per Amendment 001 Section 3. Restart Program behavior defined: creates a new Future instance from an Ended Early record without modifying or reactivating the original — Amendment 001 compliant; no amendment revision required. Goal/Chapter independence enforced per Amendment 001 Section 8. Start Program, Save to Upcoming, and Restart Program flows fully specified.
