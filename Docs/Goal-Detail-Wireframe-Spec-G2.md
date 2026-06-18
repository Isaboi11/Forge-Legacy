# Forge Legacy — Goal Detail Wireframe Specification
## G-2 | Phase 2B | Version 1.0 — June 2026

**Status:** Locked
**Authority:** Forge Legacy Master PRD Section 9 (Goal System), Product DNA, G-1 Goal Hub v1.1
**PRD Authority:** Section 9 (Goals), Section 6 (Chapters), Section 5 (MVP)

---

## Preamble: What G-2 Is For

G-2 is the detail view for a single goal. It is the only surface in the product where the athlete can update their progress toward a goal or declare a goal achieved.

G-2 answers: "What is this goal, where do I stand, and what has my journey looked like?"

G-2 is entered by tapping a goal card on G-1. The athlete arrives at G-2 already oriented — they know which goal they are viewing. G-2 deepens that view: it shows the full target context, the progress state, the history of updates, and the actions available to move forward.

**Note on MVP status:** G-1 v1.1 labeled the G-2 destination as "post-MVP; no action if G-2 unavailable." This designation was provisional, pending the architecture decisions now resolved. The goal achievement trigger (G-1 Risk 4) was flagged as High risk and required resolution before MVP ships. "Mark as Achieved" must live somewhere for MVP. G-2 is that surface. **G-2 is MVP.**

**G-2 is entered from:**
- G-1 → goal card tap (primary goal or secondary goal, any in-progress or achieved state)

**G-2 navigates to:**
- G-3 Goal Edit → overflow (⋯) → "Edit Goal" (in-progress goals only)
- M-3 Goal Achieved Modal → "Mark as Achieved" confirmation (primary goals only)
- Back to G-1 → back arrow

**G-2 does not navigate to:**
- L-3 Chapter Detail (no chapter management from G-2)
- W-3 Program Detail (no program management from G-2)
- Any history or legacy surface

---

## Canonical Goal Target Model

This is the first specification written after the goal target architecture was fully resolved. The canonical model is defined here and applies to all goal screens (G-2, G-3).

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| Goal Name | Yes | Freeform text | Names the commitment |
| Target | No | Numeric | If present: quantifiable display model. If absent: narrative display model. |
| Unit | No | Freeform text | Visible in form only when Target is set. Stored per progress update entry (historical integrity). |

**Display model rules:**
- Target present → quantifiable: progress bar, percentage, "Update Progress" action
- Target absent → narrative: "In Progress" status, no bar, no percentage, no update action

**Historical integrity rule:**
Each progress update entry stores a snapshot of the unit label at the time the update was recorded. Changing a goal's unit label after creation does not retroactively modify any existing history entry. History cannot be rewritten.

---

## Section 1 — Purpose

G-2 is where commitment meets accountability.

On G-1, the goal is a card — a confirmation that the pursuit exists. On G-2, the pursuit is the whole screen. The athlete sees the full target, the current position, the arc of progress, and the path to declaring the commitment fulfilled.

**What G-2 is:**
- The detail view for a single goal within the current active chapter
- The surface for updating progress on quantifiable goals
- The surface for marking goals as achieved
- A record of the journey — progress history shows how far the athlete has come

**What G-2 is not:**
- A place to manage chapters or programs
- A place to delete or abandon goals
- A place to view goals from archived chapters (those live in L-4)
- A statistics surface or performance dashboard

---

## Section 2 — G-2 Screen Goals

1. **Show the full commitment** — display goal name, target, and unit with full context, not the truncated version shown on G-1 cards
2. **Show current standing** — quantifiable: progress bar + current/target display; narrative: "In Progress" status
3. **Enable progress updates** — "Update Progress" action for quantifiable in-progress goals
4. **Enable achievement declaration** — "Mark as Achieved" for all in-progress goals
5. **Show the journey** — progress history on quantifiable goals: every recorded update, timestamped
6. **Preserve the record** — achieved goals are sealed and read-only

**What G-2 does NOT show:**
- Workout performance data (volume, weight lifted, PRs)
- Goal completion rates or comparisons
- Time-based pressure ("goal set X days ago")
- Deadlines or urgency signals
- Goals from archived chapters

---

## Section 3 — Information Hierarchy

**TIER 1 — Goal Identity**
Goal name. Always primary. Chapter context below (secondary, muted). Source of truth for what is being pursued.

**TIER 2 — Current State**
Progress state, rendered per display model:
- Quantifiable: progress bar + percentage + current/target value display
- Narrative: "In Progress" status label

**TIER 3 — Actions** (in-progress goals only)
- Quantifiable: "Update Progress" (secondary action) + "Mark as Achieved" (primary action)
- Narrative: "Mark as Achieved" (primary action, only action)

**TIER 4 — Program Association** (conditional)
Program name shown when set. Absent if no association.

**TIER 5 — Progress History** (quantifiable goals only, conditional)
Timestamped record of all prior progress updates. Absent for narrative goals. Absent before first update.

---

## Section 4 — Screen Header (Universal)

Present in all states.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ←   [Goal Name — truncated]                 [  ⋯  ]   │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Goal Name — 22sp, primary weight]                     │
│  [Chapter Name — 13sp, secondary, muted]                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Top App Bar:**
- Left: back arrow — returns to G-1
- Center: goal name, truncated with ellipsis if needed
- Right: overflow icon (⋯) — present on in-progress goals; absent on achieved goals

**Identity block:**
- Goal name: 22sp, primary weight, wraps to 2 lines maximum
- Chapter name: 13sp, secondary, muted — confirms which chapter this goal belongs to (not tappable)

---

## Section 5 — State: In Progress, Quantifiable Goal

Shown when the chapter is active, the goal has a numeric target, and the goal has not yet been marked achieved.

```
┌─────────────────────────────────────────────────────────┐
│  ←   [Goal Name]                             [  ⋯  ]   │
├─────────────────────────────────────────────────────────┤
│  [Goal Name — 22sp, primary weight]                     │
│  [Chapter Name — 13sp, muted]                           │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PROGRESS                                               │  ← 11sp, muted, all-caps
│                                                         │
│  [████████████░░░░░░░░] 63%                             │  ← Full-width bar
│  365 / 405 lbs                                          │  ← 14sp, secondary
│                                                         │
│  [  Update Progress  ]                                  │  ← Secondary/outlined CTA
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PROGRAM                                                │  ← conditional — shown only if set
│  [Program Name — 15sp, secondary]                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  HISTORY                                                │  ← conditional — shown only after first update
│                                                         │
│  Jun 15, 2026   315 lbs → 365 lbs                       │
│  Jun 3, 2026    0 → 315 lbs                             │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Mark as Achieved  ]                                 │  ← Primary CTA
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**PROGRESS section:**
- "PROGRESS" — 11sp, muted, all-caps
- Progress bar: full-width, proportional fill, accent color on muted track
- Percentage: 15sp, secondary — beside or directly below bar
- Current/target display: "[current] / [target] [unit]" — 14sp, secondary
  - If no unit set: "[current] / [target]"
  - If unit set: "[current] / [target] [unit]"
- Before first progress update: bar is empty (0%), display shows "0 / [target] [unit]"

**"Update Progress" CTA:**
- Secondary/outlined button — present on quantifiable in-progress goals only
- Tapping opens the Update Progress Sheet (Section 8)

**PROGRAM section:**
- Conditional — shown only when a program is associated with this goal
- Label: "PROGRAM" — 11sp, muted, all-caps
- Program name: 15sp, secondary
- Not tappable — display context only (G-2 does not navigate to W-3)

**HISTORY section:**
- Conditional — shown only after at least one progress update has been recorded
- Label: "HISTORY" — 11sp, muted, all-caps
- Entries: chronological, most recent first
- See Section 10 for full history specification

**"Mark as Achieved" CTA:**
- Primary button — full-width, bottom of scroll
- Available at any progress level — not gated on 100%
- Tapping opens the achievement confirmation (Section 9)

---

## Section 6 — State: In Progress, Narrative Goal

Shown when the chapter is active, the goal has no numeric target, and the goal has not yet been marked achieved.

```
┌─────────────────────────────────────────────────────────┐
│  ←   [Goal Name]                             [  ⋯  ]   │
├─────────────────────────────────────────────────────────┤
│  [Goal Name — 22sp, primary weight]                     │
│  [Chapter Name — 13sp, muted]                           │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  In Progress                                            │  ← 17sp, secondary, muted
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PROGRAM                                                │  ← conditional
│  [Program Name — 15sp, secondary]                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Mark as Achieved  ]                                 │  ← Primary CTA
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**"In Progress" status:**
- 17sp, secondary, muted — larger than the label version on G-1 cards, since this is the focused view
- Not tappable. Not editable. Confirms the commitment is live.
- No progress bar. No history section. No update action.

**What this state does NOT show:**
- Progress bar
- Percentage
- "Update Progress" button
- HISTORY section
- Any quantitative measure of any kind

**The "Mark as Achieved" CTA** is the only forward action for narrative goals. It is always the primary button when the chapter is active.

---

## Section 7 — State: Achieved

Shown when the goal has been marked achieved. Applies to both quantifiable and narrative goals. Read-only — no actions, no overflow.

```
┌─────────────────────────────────────────────────────────┐
│  ←   [Goal Name]                                        │  ← No overflow icon
├─────────────────────────────────────────────────────────┤
│  [Goal Name — 22sp, primary weight]                     │
│  [Chapter Name — 13sp, muted]                           │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ✓ Achieved                                             │  ← 17sp, achievement tone
│  June 28, 2026                                          │  ← 14sp, secondary
│                                                         │
│  [final value] / [target] [unit]   (quantifiable only)  │  ← 14sp, secondary, if applicable
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PROGRAM                                                │  ← conditional
│  [Program Name — 15sp, secondary]                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  HISTORY                                     (quantifiable only — if any updates were recorded)
│                                                         │
│  Jun 28, 2026   385 lbs → 405 lbs  ← Achieved           │  ← achievement entry
│  Jun 15, 2026   315 lbs → 385 lbs                       │
│  Jun 3, 2026    0 → 315 lbs                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Achievement display:**
- "✓ Achieved" — 17sp, achievement tone — the checkmark is visual confirmation, not a badge
- Achievement date: 14sp, secondary — on the line directly below
- For quantifiable goals: final value / target [unit] shown below the date — confirms the value at time of achievement
- For narrative goals: no target display (never existed)

**Achieved state overflow:**
- Overflow icon (⋯) is absent in Achieved state. The record is sealed. There are no actions.

**HISTORY section in Achieved state:**
- Shown only for quantifiable goals that had at least one progress update
- The final entry in the history list (most recent) is marked with "← Achieved" to identify the update that coincided with achievement declaration
- All entries remain readable and unchanged
- Read-only

**What this state does NOT show:**
- "Mark as Achieved" button (already achieved)
- "Update Progress" button (sealed)
- Edit overflow action (sealed)
- Any action of any kind

---

## Section 8 — Update Progress Sheet

Shown when the athlete taps "Update Progress" on an in-progress quantifiable goal. Bottom sheet — overlays G-2.

```
┌──────────────────────────────────────────────────────────┐
│  ▬  (drag handle)                                        │
│                                                          │
│  Update Progress                                         │  ← 17sp, primary weight
│  [Goal Name — 14sp, secondary, muted]                    │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  Current:  [value] [unit]        Target:  [value] [unit] │  ← 13sp, secondary
│                                                          │
│  New value                                               │  ← Input label
│  ┌─────────────────────────────────────────────────┐    │
│  │  [___________________]    [unit label — muted]   │    │  ← Numeric input
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  [  Save  ]                                              │  ← Primary CTA
│  [  Cancel  ]                                            │  ← Secondary CTA
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Sheet behavior:**
- Numeric keyboard shown automatically on open
- Drag handle present (standard bottom sheet affordance)
- Sheet can be dismissed by dragging down or tapping "Cancel"

**Content:**
- Sheet title: "Update Progress" — 17sp, primary weight
- Goal name: 14sp, secondary, muted — confirmation of which goal is being updated
- Current value + unit reference: shows today's standing so the athlete can enter relative to it
- Target value + unit reference: shows the destination
- New value input: numeric only — no alpha characters accepted
- Unit label: inline with input field, muted — shows the unit but the athlete inputs only the number
- If no unit is set on the goal: unit label is absent; input field takes full width

**"Save" action:**
1. New current value recorded
2. Progress history entry created:
   - Date: today (system date)
   - Previous value: value before this update
   - New value: value just entered
   - Unit: snapshot of goal's current unit label at this moment (historical integrity)
3. Progress percentage recalculated: `(new current / target) × 100`, capped at display max of 100% (see Edge Cases)
4. G-2 progress bar and current/target display update
5. G-1 progress bar updates on return
6. Sheet dismisses; athlete remains on G-2

**"Cancel" action:**
- Sheet dismisses
- No changes made
- Athlete remains on G-2

**Input validation:**
- Numeric input only
- Minimum value: 0 — negative values not accepted
- Maximum value: none enforced — athlete may enter a value exceeding the target (see Edge Cases)
- Empty input: "Save" is disabled until a value is entered

---

## Section 9 — Mark as Achieved Flow

### 9.1 Confirmation Prompt

Fires when the athlete taps "Mark as Achieved" from G-2 for any in-progress goal.

```
┌──────────────────────────────────────────────────────┐
│  Mark Goal as Achieved?                              │
│                                                      │
│  [Goal Name]                                         │
│                                                      │
│  This will be recorded in your legacy.               │
│                                                      │
│  [  Mark as Achieved  ]                              │  ← Primary — destructive in legacy terms
│  [  Cancel  ]                                        │
└──────────────────────────────────────────────────────┘
```

"This will be recorded in your legacy." — communicates permanence without pressure. The athlete understands this is a lasting record before confirming.

### 9.2 Primary Goal Achievement Flow

When "Mark as Achieved" is confirmed for a **primary goal:**

1. Achievement date recorded: today (system date) — not retroactive
2. Goal state transitions to Achieved (permanent)
3. M-3 Goal Achieved modal fires
4. Legacy Timeline entry created: "Goal Achieved: [Goal Name] | [Date]"
5. Home hero shifts to Priority 1 state
6. M-3 dismissal returns to G-2 — now in Achieved state
7. Back from G-2 returns to G-1 — primary goal card shows Achieved state

### 9.3 Secondary Goal Achievement Flow

When "Mark as Achieved" is confirmed for a **secondary goal:**

1. Achievement date recorded: today (system date)
2. Goal state transitions to Achieved (permanent)
3. No M-3 modal
4. No Legacy Timeline entry
5. No Home hero change
6. Goal card on G-1 moves from SUPPORTING GOALS section to ACHIEVED section
7. G-2 transitions to Achieved state for this goal

### 9.4 Achievement Is Not Reversible

Once a goal is marked achieved:
- The Achieved state is permanent
- No "un-achieve" or "revert" action exists anywhere in the product
- The legacy record cannot be modified
- If the athlete erroneously marks a goal achieved, the record stands

This is consistent with History Cannot Be Rewritten. The athlete owns the decision to declare achievement. The system preserves it exactly as declared.

### 9.5 Achievement Without Prior Progress Updates

An athlete may mark a goal as achieved without having recorded any progress updates. This is valid for both quantifiable and narrative goals.

For quantifiable goals marked achieved with no prior updates:
- Achievement record shows: "✓ Achieved [date]"
- Final value display: "0 / [target] [unit]" — technically the bar never moved before achievement was declared
- History section is absent (no updates were recorded)
- This is an unusual but valid state — the athlete may have tracked progress externally or reached the goal immediately

---

## Section 10 — Progress History

### 10.1 Definition

The progress history is a timestamped record of all manual progress updates made to a quantifiable goal.

**Shown on:** Quantifiable goals only. Narrative goals have no update mechanism and therefore no history.

**Section label:** "HISTORY" — 11sp, muted, all-caps

**Conditional:** Section is absent before any progress updates have been recorded. No empty state is shown within the section — the section simply does not appear.

### 10.2 Entry Format

Each history entry:

```
[Month Day, Year]   [previous value] [unit] → [new value] [unit]
```

Examples:
```
Jun 15, 2026   315 lbs → 365 lbs
Jun 3, 2026    0 → 315 lbs
```

- Date: Month Day, Year format — 14sp, secondary
- Previous value → new value: 14sp, secondary — with unit snapshots at time of recording
- If the first update on a goal: previous value is "0" (or "0 [unit]" if unit was set at creation)
- If no unit was set at the time of recording: the entry omits the unit label ("315 → 365")

### 10.3 Historical Integrity Rule

Each entry stores a snapshot of the unit label at the moment the update was recorded. The unit label displayed in a history entry is the unit as it existed when that entry was created.

If an athlete changes the unit label on a goal (via G-3 Edit):
- Future entries use the new unit label
- Existing entries retain the unit label that was active when they were recorded
- A history may therefore show entries with different unit labels if the label changed mid-journey

This is correct behavior. The record is accurate to what was measured at the time. History cannot be rewritten.

### 10.4 Ordering and Count

- Entries shown most-recent-first
- No entry count limit for MVP — all updates displayed in a single scrollable list
- No pagination for MVP

### 10.5 Achieved Entry Marker

In the Achieved state, the most recent entry in the history is visually marked. This identifies the update that coincided (in time) with the athlete's achievement declaration, even though the update and the achievement are separate events.

Marker: "← Achieved" appended to the entry line — 12sp, muted.

If no progress updates were recorded before achievement, the history section is absent and this marker does not appear.

---

## Section 11 — Edit Goal

### 11.1 Edit Is Available for In-Progress Goals Only

Edit is accessed via the overflow icon (⋯) → "Edit Goal" → G-3 Goal Edit mode.

Available only when the goal is In Progress. Once a goal is marked Achieved, the overflow icon is absent and there is no edit path.

**Rationale:** Achieved goals are sealed records. An athlete who has declared a commitment fulfilled should not be able to reframe that commitment retroactively. The record reflects the goal as it was when the athlete said "I have achieved this."

### 11.2 What Is Editable

Via G-3 Edit mode (defined in G-3 spec):
- Goal name
- Target value
- Unit label

### 11.3 Effect of Editing Target Value

If the target value is changed:
- The progress percentage recalculates from the new target using the current value
- Existing history entries are preserved unchanged — they record actual values, which do not depend on the target
- If the new target is lower than the current value, progress exceeds 100% (see Edge Cases Section 16.3)

### 11.4 Effect of Editing Unit Label

If the unit label is changed:
- The goal detail display (G-2) uses the new unit label for current/target display and future history entries
- All existing history entries retain the unit snapshot stored at time of recording
- The progress display ("365 / 405 lbs") updates to reflect the new unit label immediately

---

## Section 12 — Goal ↔ Chapter Display

G-2 shows the chapter name below the goal name in the identity block. This is context — not navigation.

The athlete cannot navigate to L-3 Chapter Detail from G-2. If they want to manage their chapter, they go back to G-1 and then to L-3.

**Rationale:** G-2 is a focused view of a single goal. Adding chapter navigation would turn it into a general-purpose chapter entry point. The chapter name appears because the goal cannot be understood without its chapter context — but acting on the chapter is not G-2's responsibility.

---

## Section 13 — Goal ↔ Program Display

When a program is associated with this goal:
- "PROGRAM" section appears below the progress section
- Program name: 15sp, secondary
- Not tappable — no navigation to W-3 from G-2
- Program's state (Active, Graduated, Ended Early) is not shown — name only

When no program is associated:
- "PROGRAM" section is absent
- No placeholder text, no "Add a Program" CTA

Program association is set at goal creation (G-3) or edited via G-3 Edit mode. It cannot be changed from G-2.

---

## Section 14 — Navigation

### 14.1 Entry Points

| Entering From | State Shown on G-2 |
|--------------|-------------------|
| G-1 → primary goal card tap (In Progress) | In Progress state (quantifiable or narrative) |
| G-1 → secondary goal card tap (In Progress) | In Progress state (quantifiable or narrative) |
| G-1 → achieved secondary goal card tap | Achieved state |
| G-1 → primary goal card tap (Achieved) | Achieved state |

### 14.2 Exit Points

| Action | Destination |
|--------|------------|
| Back arrow | G-1 |
| "Edit Goal" (overflow → In Progress goals) | G-3 Goal Edit mode |
| "Mark as Achieved" → confirmed (primary goal) | M-3 modal → returns to G-2 (Achieved state) |
| "Mark as Achieved" → confirmed (secondary goal) | G-2 (Achieved state) |
| "Mark as Achieved" → cancelled | G-2 (In Progress state — unchanged) |
| "Update Progress" → saved | G-2 (In Progress state — updated) |
| "Update Progress" → cancelled | G-2 (In Progress state — unchanged) |

### 14.3 Return Destination After M-3

After the primary goal achievement flow:
1. "Mark as Achieved" tapped on G-2
2. Confirmation prompt fires
3. Confirmed → M-3 Goal Achieved modal fires
4. M-3 dismissal → returns to G-2 in Achieved state

The athlete does not return to G-1 automatically. They are still on G-2, viewing their now-achieved goal. Back arrow returns them to G-1 where the primary goal card now shows the Achieved state.

---

## Section 15 — Mobile UX

### 15.1 Screen Type

Standard navigation stack screen. Top App Bar with back button. Tab Bar visible at bottom (tab depends on entry point — will be the same tab active when G-1 was entered). Not a modal sheet.

### 15.2 Scroll Behavior

Single vertical scroll. No tabs. Header scrolls with page — does not stick. "Mark as Achieved" is positioned at the bottom of the scroll, after all content sections. The athlete reviews the goal state before reaching the action.

"Update Progress" is positioned within the PROGRESS section — visible without requiring scroll on most devices, enabling quick access for routine updates.

### 15.3 Update Progress Sheet

The Update Progress Sheet is a bottom sheet — it overlays G-2 without leaving the screen. The numeric keyboard auto-shows. The sheet can be dismissed by drag-down or "Cancel."

### 15.4 Top App Bar

- Title: goal name, truncated with ellipsis if needed
- Left: back arrow, 44×44dp minimum
- Right: overflow icon (⋯), 44×44dp minimum — present on In Progress goals; absent on Achieved goals

### 15.5 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| Back arrow | 44×44dp |
| Overflow icon (⋯) | 44×44dp |
| "Update Progress" button | Full width × 48dp |
| "Mark as Achieved" button | Full width × 48dp |
| Confirmation prompt buttons | Full width × 52dp |
| Update Progress Sheet "Save" | Full width × 52dp |
| Update Progress Sheet "Cancel" | Full width × 52dp |

### 15.6 Portrait Orientation

G-2 is portrait only.

### 15.7 Accessibility Labels

**In Progress — Quantifiable:**
- Progress bar region: `accessibilityLabel` = "[Goal Name], [X]% complete, [current] of [target] [unit]"
- "Update Progress": `accessibilityLabel` = "Update progress for [Goal Name]"
- "Mark as Achieved": `accessibilityLabel` = "Mark [Goal Name] as achieved"

**In Progress — Narrative:**
- Status region: `accessibilityLabel` = "[Goal Name], in progress"
- "Mark as Achieved": `accessibilityLabel` = "Mark [Goal Name] as achieved"

**Achieved:**
- Achievement region: `accessibilityLabel` = "[Goal Name], achieved [Month DD, YYYY]"
- For quantifiable: append ", [final value] of [target] [unit]"

**History entries:**
- Each entry: `accessibilityLabel` = "[Month Day, Year], updated from [previous value] to [new value] [unit]"
- Achievement marker entry: append ", goal achieved"

**Update Progress Sheet:**
- Input field: `accessibilityLabel` = "New progress value. Current: [value] [unit]. Target: [value] [unit]."

---

## Section 16 — Edge Cases

### 16.1 No Prior Progress Updates (Quantifiable Goal)

The HISTORY section is absent. The PROGRESS section shows an empty bar and "0 / [target] [unit]." The "Update Progress" CTA is present. This is not an error state — the goal is active and the journey has not yet been logged.

### 16.2 Narrative Goal Marked Achieved Without Any Prior Activity

Valid state. The athlete opened G-2 and immediately marked the goal achieved. No progress updates, no history. The Achieved state shows "✓ Achieved [date]" with no final value and no history section. This is the athlete's declaration, and it is accurate.

### 16.3 Progress Exceeds 100% (Current Value > Target)

The athlete enters a current value that exceeds the target. For example: target 405 lbs, athlete enters 415.

- Calculated percentage: `415 / 405 × 100 = 102.47%`
- Display: progress bar fills to 100% (full) — bar does not visually overflow
- Percentage label: "100%" — the spec does not display percentages above 100%
- Current/target display: "415 / 405 lbs" — the actual values are shown accurately
- "Mark as Achieved" remains a manual action — bar at 100% (or above) does not auto-trigger achievement
- History entry records the actual value: "405 lbs → 415 lbs"

### 16.4 Progress Decreases (Current Value < Previous Value)

The athlete enters a current value lower than the previous recorded value. For example: goal "Lose 20 pounds," current was 12 (progress: 60%), athlete enters 10 (progress: 50%).

This is valid. Progress can fluctuate. The bar moves left. The history entry records the decrease accurately: "12 → 10 lbs." No warning, no error, no shame message. The record is accurate.

### 16.5 Target Changed After Progress Updates Exist

If the target value is edited via G-3:
- Current progress percentage recalculates using the new target
- History entries are unchanged — they record actual values, which are not dependent on the target
- The current/target display updates to show the new target
- Example: original target 405 lbs, current value 365 (progress: 90%). Athlete changes target to 500 lbs. Progress recalculates to 73%. History still shows all prior entries accurately.

### 16.6 Unit Changed After Progress Updates Exist

Historical integrity rule applies (Section 10.3). New entries use new unit. Old entries retain their snapshot. The history may show entries with different units across its timeline. This is accurate and expected.

### 16.7 Goal With No Program Association

PROGRAM section is absent. No placeholder, no empty state for this section. The absence is clean.

### 16.8 Very Long Goal Name

Wraps to 2 lines maximum in the identity block at 22sp. Truncates with ellipsis at line 2 if exceeded. Full goal name always readable in G-2 — the identity block never scrolls away mid-read. Top App Bar shows truncated version.

### 16.9 Achievement Confirmation — Accidentally Confirmed

The athlete taps "Mark as Achieved," sees the confirmation prompt, and accidentally confirms. The achievement record is permanent. No undo. The confirmation prompt is the safeguard — it communicates "this will be recorded in your legacy" explicitly. After confirmation, the record stands.

### 16.10 "Update Progress" After Achievement

"Update Progress" is not available on achieved goals. The progress state at time of achievement is the final state. The history is sealed. G-2 in Achieved state has no "Update Progress" CTA and no overflow.

---

## Section 17 — Validation Checklist

### Screen Structure
- [ ] Top App Bar: back arrow + goal name (truncated) + overflow (⋯) on In Progress goals; overflow absent on Achieved goals
- [ ] Identity block: goal name 22sp primary weight + chapter name 13sp muted
- [ ] Single vertical scroll — no tabs
- [ ] Tab Bar visible at bottom

### In Progress — Quantifiable
- [ ] "PROGRESS" section label: 11sp, muted, all-caps
- [ ] Progress bar: proportional fill, full-width, empty bar at 0% (not hidden)
- [ ] Percentage: shown, "X%" not "X% remaining"
- [ ] Current/target display: "[current] / [target] [unit]" — unit absent if not set
- [ ] "Update Progress" CTA: secondary/outlined, present
- [ ] "PROGRAM" section: shown only if program associated; not tappable
- [ ] "HISTORY" section: shown only after first progress update
- [ ] "Mark as Achieved" CTA: primary, full-width, bottom of scroll
- [ ] No deadline display, no urgency signals

### In Progress — Narrative
- [ ] "In Progress" status label: 17sp, secondary, muted
- [ ] No progress bar
- [ ] No "Update Progress" button
- [ ] No HISTORY section
- [ ] "PROGRAM" section: shown only if program associated; not tappable
- [ ] "Mark as Achieved" CTA: primary, full-width

### Achieved (both models)
- [ ] Overflow icon absent
- [ ] "✓ Achieved" — 17sp, achievement tone
- [ ] Achievement date — 14sp, secondary
- [ ] Final value display: shown on quantifiable goals only ("[value] / [target] [unit]")
- [ ] "PROGRAM" section: shown only if program associated
- [ ] "HISTORY" section: shown on quantifiable goals with at least one update; most recent entry marked "← Achieved"
- [ ] No "Update Progress" button
- [ ] No "Mark as Achieved" button
- [ ] No overflow actions
- [ ] Read-only — no editable elements

### Update Progress Sheet
- [ ] Bottom sheet with drag handle
- [ ] Goal name shown (confirmation of context)
- [ ] Current value + unit reference shown
- [ ] Target value + unit reference shown
- [ ] Numeric input: auto-shows numeric keyboard
- [ ] Unit label shown inline with input (absent if no unit set)
- [ ] "Save" disabled until value entered
- [ ] Negative values not accepted
- [ ] "Save" creates history entry with unit snapshot
- [ ] "Cancel" dismisses with no changes
- [ ] Sheet dismissible by drag-down

### Achievement Flow
- [ ] Confirmation prompt fires before achievement is recorded
- [ ] Prompt copy: "This will be recorded in your legacy."
- [ ] Primary goal: M-3 fires on confirmation
- [ ] Primary goal: Legacy Timeline entry created
- [ ] Primary goal: Home hero shifts to Priority 1
- [ ] Secondary goal: no M-3, no Timeline entry, no Home hero change
- [ ] Achievement date = today (system date), not retroactive
- [ ] Achievement available at any progress level (not gated on 100%)
- [ ] No auto-achievement when progress bar reaches 100%
- [ ] Achieved state is permanent — no revert action

### Progress History
- [ ] Shown on quantifiable goals only
- [ ] Absent before first update — no empty state shown
- [ ] Most-recent-first ordering
- [ ] Each entry: date, previous value → new value, unit snapshot
- [ ] Unit snapshot per entry — not global goal unit
- [ ] Achieved state: most recent entry marked "← Achieved"
- [ ] Changing unit label does not modify historical entries
- [ ] Changing target value does not modify historical entries

### Edit Goal
- [ ] Overflow (⋯) → "Edit Goal" → G-3 Edit mode
- [ ] Available on In Progress goals only
- [ ] Not available on Achieved goals (overflow absent)
- [ ] Editing target recalculates progress percentage
- [ ] Editing unit updates current display; history entries unchanged
- [ ] Editing name updates display; history entries unchanged

### Goal Target Model
- [ ] Goal name: required, always shown
- [ ] Target: optional numeric — if present, quantifiable model; if absent, narrative model
- [ ] Unit: optional freeform text — only shown in form/display when target is set
- [ ] No goal-type selector
- [ ] No category system

### Navigation
- [ ] Back arrow → G-1
- [ ] "Edit Goal" overflow → G-3 Edit mode (In Progress only)
- [ ] "Mark as Achieved" → confirmation → M-3 (primary) or G-2 Achieved state (secondary)
- [ ] Post-M-3 dismissal → G-2 Achieved state
- [ ] Back from G-2 Achieved → G-1 (primary goal card shows Achieved state)
- [ ] G-2 does not navigate to L-3, W-3, or any other screen

### Mobile UX
- [ ] All tap targets meet minimums
- [ ] Portrait orientation only
- [ ] Accessibility labels present for progress bar, status, CTAs, history entries
- [ ] Update Progress Sheet: numeric keyboard auto-shown
- [ ] "Mark as Achieved" at bottom of scroll — not sticky/floating

---

## Section 18 — Downstream Dependencies

### G-3 — Goal Create / Edit

G-2 depends on G-3 for:
- Goal creation (defines the target model: name + optional target + optional unit)
- Goal editing (name, target, unit changes affect G-2 display)
- Program association (set at creation, editable via G-3)

G-3 must specify: how target and unit fields are presented at creation; edit behavior; validation; the conditional appearance of the unit field (visible only when target is set).

### G-1 — Goal Hub

G-2 progress updates must reflect in G-1 on return. The G-1 goal card's progress bar and percentage must show the updated state when the athlete returns from G-2.

G-2 Achieved state must reflect in G-1 on return. Primary goal card transitions to Achieved state. Secondary goal card moves to ACHIEVED section.

### M-3 — Goal Achieved Modal

G-2 depends on M-3 for primary goal achievement ceremony. M-3 must:
- Accept the goal name and chapter name as parameters
- Return to G-2 (Achieved state) after dismissal
- Create the Legacy Timeline entry

### L-4 — Archived Chapter Detail

After chapter archival, goals are no longer accessible via G-2. L-4 must display goal outcomes inline (Achieved / Not Achieved) without navigating to G-2. G-2 is for active chapter goals only.

### H-1 — Home Hero Priority 1 State

Primary goal achievement triggers the H-1 hero Priority 1 state. H-1 must correctly update on the next Home visit after achievement.

---

## Change Log

### v1.0 — June 2026

Initial specification. G-2 Goal Detail created as part of Phase 2B wireframe documentation. Resolves G-1 Risk 4 (goal achievement trigger) and establishes G-2 as MVP (not post-MVP). Defines the canonical Goal Target Model (Name + optional Target + optional Unit) as the first spec after target model architecture resolution. Four screen states specified: In Progress Quantifiable, In Progress Narrative, Achieved Quantifiable, Achieved Narrative. Update Progress bottom sheet fully specified with historical integrity rule (unit snapshot per entry). Achievement flow for primary goals (M-3 + Legacy Timeline) and secondary goals (silent) differentiated. Progress history specified with unit snapshot behavior. Edit flow available on In Progress goals only; Achieved goals are sealed and read-only.

---

*Forge Legacy Goal Detail Wireframe Specification — G-2*
*v1.0 — June 2026*
*Authority: Forge Legacy Master PRD Section 9, Product DNA, G-1 Goal Hub v1.1*
