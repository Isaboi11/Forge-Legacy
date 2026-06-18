# Forge Legacy — Goal Create / Edit Wireframe Specification
## G-3 | Phase 2B | Version 1.1 — June 2026

**Status:** Locked
**Authority:** Forge Legacy Master PRD Section 9 (Goal System), Product DNA, G-1 Goal Hub v1.1, G-2 Goal Detail v1.0
**PRD Authority:** Section 9 (Goals), Section 6 (Chapters), Section 5 (MVP)

---

## Preamble: What G-3 Is For

G-3 is where goals are born.

G-3 answers: "What am I committing to, and how will I know I've done it?"

It is the creation surface for all goals — primary and secondary, quantifiable and narrative. In edit mode, it is the only surface where a goal's core fields can be changed while the chapter is still active.

**What G-3 is:**
- A creation form for new goals (primary and secondary)
- An edit form for existing in-progress goals
- A lightweight, intentional experience — making a commitment, not configuring a productivity system

**What G-3 is not:**
- A goal management dashboard
- A template system
- A goal category selector
- A place to delete or abandon goals

**The form should feel fast.** The simplest possible goal creation is: type a name, tap Save. Everything else is optional enrichment.

**G-3 is a full-screen modal presentation.** It is not a navigation stack screen. The athlete enters via modal presentation (slides up from the bottom) and exits via Save or ✕. The modal framing communicates: you are making a focused commitment, not navigating somewhere.

**G-3 is entered from:**
- G-1 → "Add a Goal" (empty state CTA) — creates primary goal
- G-1 → "Add a Supporting Goal" (CTA below goal list) — creates secondary goal
- G-2 → overflow (⋯) → "Edit Goal" — edits in-progress goal (primary or secondary)
- L-5 Chapter Creation — creates primary goal as part of chapter setup

**G-3 navigates to:**
- Save → returns to the entering screen with changes reflected
- ✕ dismiss (no changes) → returns to entering screen unchanged
- ✕ dismiss (with changes) → Unsaved Changes confirmation → discard → entering screen unchanged

**The entry path determines goal type.** G-3 does not ask the athlete whether they are creating a primary or secondary goal. The calling screen (G-1 or L-5) determines the type and passes it to G-3. The screen title reflects the type. The form fields are identical.

---

## Architecture Decisions

Eight decisions were required to complete this specification. Each is justified against the Product DNA and existing locked architecture.

---

### Decision 1 — Creation Requirements

**Recommendation: Goal name is the only requirement.**

A goal can be created with a name alone. Target, unit, and program association are all optional. The chapter context is established by the entry point — the athlete cannot reach G-3 without an active chapter. G-3 does not ask the athlete to confirm their chapter.

**Minimum valid goal:** One non-empty name. Nothing else required.

**Rationale:** Simplicity Wins. An athlete who knows what they are pursuing should be able to record that commitment in seconds. Requiring a target or program association before a goal can exist would create friction that discourages commitment-making. The commitment is the name. Everything else is supporting context.

---

### Decision 2 — Primary vs. Secondary Creation

**Recommendation: Same screen, different entry path.**

G-3 uses one form for both primary and secondary goal creation. The entry path (G-1 state at time of entry) determines the goal type. G-3 receives the goal type as a parameter and reflects it in the screen title:

- Primary goal creation: "Your chapter goal"
- Secondary goal creation: "A supporting goal"
- Edit mode: "Edit goal"

The form fields are identical across all three modes. No toggle, picker, or selector for goal type exists within G-3.

**Rationale:** The primary/secondary distinction is a chapter architecture concern, not a form concern. The athlete does not pick a "type" — they create a goal, and the context of their action determines whether it is primary or secondary. Putting a type selector in the form would create a category-management experience, which is exactly the kind of productivity-app framing Forge Legacy is designed to avoid.

---

### Decision 3 — Narrative vs. Quantifiable Model

**Recommendation: No goal-type selector. Display model inferred from Target field.**

This decision is inherited from the canonical Goal Target Model established in G-2 and locked by the architecture sessions preceding this spec.

- Target field is always visible in the form, labeled "Target (optional)"
- Unit field is hidden by default
- Unit field appears below Target when the Target field contains a non-empty value
- If the athlete enters a target → they are creating a quantifiable goal
- If the athlete leaves the target blank → they are creating a narrative goal
- The athlete never explicitly selects "narrative" or "quantifiable" — the data model is determined by what they fill in

The transition is frictionless: a narrative goal becomes quantifiable the moment a target is entered. A quantifiable goal (with no progress history) becomes narrative if the target is cleared before saving.

**Rationale:** Consistent with G-2 canonical model. "Goals like 'Rebuild confidence after injury' cannot be expressed as percentages without category error." Making the model implicit (inferred from data) rather than explicit (selected via toggle) keeps the form honest and simple.

---

### Decision 4 — Program Association

**Recommendation: Optional picker field, shown only when an Active program exists. Active program only — Upcoming programs excluded.**

A "Program (optional)" field is present in G-3 when the athlete has exactly one Active program. Tapping the field opens a program picker. Graduated, Ended Early, and Upcoming programs are excluded.

**Default:** No program selected.

**If no Active program exists:** The program association field is absent entirely. No placeholder, no "start a program" prompt. An athlete with only Upcoming programs sees no program field — their programs have not started.

**Rationale:** Programs support goals but are not required (Program Amendment 001 Section 8). A goal represents an active commitment. Associating it with an Upcoming program creates a stated support relationship with something that has not yet begun — the program is not running, so it is not supporting the goal in any meaningful sense. The association should reflect a current, active relationship: "my goal is supported by the program I am running right now." If the athlete wants to associate a program after starting it, the edit path is available. Program Amendment 001 limits Active programs to one at a time, making the picker trivially simple: "No program" or the one Active program.

---

### Decision 5 — Edit Consequences

**Recommendation: Live recalculation, no confirmation on edit. One block enforced on target removal.**

**Editing Goal Name:**
No consequences. Display updates. History entries are not affected (they store value + unit snapshots, not the goal name). No confirmation needed.

**Editing Target Value:**
Progress percentage recalculates using the new target and the current value. This recalculation is reflected live in the form — as the athlete types the new target, the resulting progress is not shown in G-3 (G-3 is a form, not a progress preview). On save, the new percentage is applied and G-2 reflects it. No confirmation prompt before save.

**Clearing Target When No Progress History Exists:**
Allowed. The goal becomes narrative. Unit field disappears and any unit text is discarded. No confirmation needed.

**Clearing Target When Progress History Exists:**
Blocked. Inline validation message: "You've recorded progress toward this target. To keep your history, a target is required." Save is not available until the target field is non-empty again. This protects the historical progress record — the records exist as progress-toward-a-number; removing the number makes them orphaned.

**Editing Unit Label:**
No consequences to existing history entries (historical integrity rule). Future progress entries use the new unit. No confirmation needed.

**Editing Program Association:**
No consequences to goals or history. Display-only change. No confirmation needed.

**Rationale:** The only consequence that warrants a block is target deletion with existing history — because it would leave the progress records semantically orphaned. All other edits are safe. Confirmations on harmless edits are friction that erodes the athlete's sense that the app trusts them.

---

### Decision 6 — Primary Goal Protection

**Recommendation: Block via entry point. No "create primary goal" path when one already exists.**

The primary goal creation path (G-1 "Add a Goal" CTA) is only visible when no primary goal exists in the current chapter. Once a primary goal exists, G-1 only offers "Add a Supporting Goal." The entry point itself enforces the one-primary-goal rule.

G-3 in create mode receives the goal type as a parameter. If for any reason G-3 receives a "create primary" request while a primary goal exists (e.g., a race condition on a slow connection), server-side validation blocks the creation and returns an error.

**There is no "replace primary goal" flow within G-3.** The athlete who wants to change their primary goal archives their chapter and starts a new one.

**Rationale:** Transformation Over Activity. The primary goal is the defining commitment of a chapter — it names the era. Allowing replacement mid-chapter without archival would enable athletes to quietly rewrite their history ("I've been pursuing this other goal all along"). The chapter archival ritual is the appropriate path for ending one commitment and beginning another. G-3 should not be the escape hatch for avoiding that ritual.

---

### Decision 7 — Edit Permissions

**Editable while goal is In Progress (edit mode entered from G-2):**
- Goal name: yes, no restrictions
- Target value: yes, subject to Decision 5 block if history exists and target is cleared
- Unit label: yes, no restrictions
- Program association: yes, can add, change, or remove

**Editable after goal is Achieved:**
Not applicable. G-3 Edit mode is only reachable from G-2 when the goal is In Progress. The overflow icon (⋯) that leads to "Edit Goal" is absent on Achieved goals. There is no path to G-3 for achieved goals.

**Rationale:** Achieved goals are sealed records — consistent with History Cannot Be Rewritten. If the edit path were accessible for achieved goals, an athlete could retroactively change what they achieved. The override is structural, not a validation rule.

---

### Decision 8 — Validation Rules

| Field | Rule |
|-------|------|
| Goal name | Required. Minimum 1 character (after trimming whitespace). Maximum 100 characters. No other restrictions. |
| Target | Optional. If provided: numeric, greater than 0. Decimals allowed (e.g., "32.5"). Cannot be 0 or negative. Cannot be cleared if progress history exists. |
| Unit | Optional. Only valid when Target has a value. Maximum 30 characters. No other restrictions. |
| Program association | Optional. Must reference a valid Active or Upcoming program from the athlete's collection if set. |

**Save button state:**
- Disabled: when goal name is empty or whitespace only
- Enabled: when goal name has at least 1 non-whitespace character

No other field affects the Save button state. An athlete can save a goal with only a name — even if Target has content but unit is empty, or if a partial value is in the unit field.

---

## Section 1 — Purpose

G-3 is where a commitment becomes real.

Before G-3, the commitment exists only in the athlete's mind. After G-3, it exists in Forge Legacy — part of the chapter record, part of the legacy that is being built.

**What G-3 is:**
- The creation surface for primary goals — the defining commitment of a chapter
- The creation surface for secondary goals — supporting commitments that strengthen the chapter's narrative
- The edit surface for in-progress goals — allowing refinement as the athlete's understanding of their commitment evolves

**What G-3 is not:**
- A goal template library
- A habit tracker setup screen
- A goal category or type configurator
- A statistics setup screen

**The guiding principle for G-3's design:**
Three fields. One required. Done in seconds. The form should feel like making a promise, not filling out a permit.

---

## Section 2 — Entry Points

| Entry | Mode | Goal Type | Screen Title |
|-------|------|-----------|-------------|
| G-1 → "Add a Goal" (no primary goal exists) | Create | Primary | "Your chapter goal" |
| G-1 → "Add a Supporting Goal" | Create | Secondary | "A supporting goal" |
| G-2 → overflow (⋯) → "Edit Goal" | Edit | (same type as goal being edited) | "Edit goal" |
| L-5 Chapter Creation (optional, skippable) | Create | Primary | "Your chapter goal" |

**L-5 integration note:** The exact integration of G-3 into the L-5 Chapter Creation flow is determined by the L-5 spec (not yet written). G-3 in this context behaves identically to Create / Primary mode. If the athlete skips goal creation in L-5, they reach G-1 in the "Active Chapter, No Goals" empty state.

---

## Section 3 — Information Hierarchy

G-3 is a form. The hierarchy is a form hierarchy:

**TIER 1 — Modal Header**
Goal type context (screen title) + Save action. The header confirms what is being created and offers the only completion action.

**TIER 2 — Goal Name**
The required field. The commitment in words. Highest visual prominence in the form body.

**TIER 3 — Target and Unit (Optional)**
Progressive disclosure. Target field always present (labeled optional). Unit field appears after target has value. Together, these fields determine the display model — quantifiable or narrative.

**TIER 4 — Program Association (Conditional)**
Shown only when an Active program exists. The lowest-priority field. Supporting context, not central to the commitment. Program Association must not be styled at equal or greater visual prominence than Goal Name or Target. It is the lightest visual element in the form.

---

## Section 4 — Screen Header (Universal)

Present in all modes and states.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ✕   [Screen Title]                        [  Save  ]   │  ← Modal Header
└─────────────────────────────────────────────────────────┘
```

**✕ (Close):**
- Left side of modal header — 44×44dp minimum
- Tapping dismisses the modal
- If form has unsaved content: Unsaved Changes confirmation fires before dismissing
- If form is empty (create mode) or unchanged (edit mode): dismisses without confirmation

**Screen Title (center):**
- "Your chapter goal" — Create / Primary
- "A supporting goal" — Create / Secondary
- "Edit goal" — Edit mode (primary or secondary)
- 17sp, primary weight

**Save (right):**
- Text button — 44×44dp minimum tap area
- 15sp, tinted (accent color)
- Disabled (muted, non-tappable) when goal name is empty
- Enabled when goal name has at least one non-whitespace character
- Save in edit mode: "Save" (same label — not "Save Changes")

**Chapter context line (below header, Create mode only):**
```
[Chapter Name — 13sp, secondary, muted]
```
Shown in create mode to confirm which chapter this goal belongs to. Absent in edit mode (chapter context is established from G-2).

---

## Section 5 — Create Mode: Primary Goal

Entered from G-1 "Add a Goal" (no primary goal state) or from L-5 Chapter Creation.

```
┌─────────────────────────────────────────────────────────┐
│  ✕   Your chapter goal                     [  Save  ]   │
├─────────────────────────────────────────────────────────┤
│  [Chapter Name — 13sp, secondary, muted]                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Goal                                                   │  ← Field label, 13sp, muted
│  ┌─────────────────────────────────────────────────┐   │
│  │  What are you building toward?                  │   │  ← Placeholder, 16sp
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Target   (optional)                                    │  ← Field label, 13sp, muted
│  ┌─────────────────────────────────────────────────┐   │
│  │  e.g. 405                                        │   │  ← Placeholder
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Unit field — appears below after Target has value]    │  ← Conditional (see Section 10)
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Program   (optional)                                   │  ← Conditional section (see Section 11)
│  ┌─────────────────────────────────────────────────┐   │
│  │  No program selected                          ›  │   │  ← Tappable row → program picker
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Goal name placeholder:** "What are you building toward?" — identity-focused, inviting narrative. Not "Enter goal name."

**Target placeholder:** "e.g. 405" — numeric hint. Not "Enter target."

**Keyboard behavior:**
- Goal name field: default text keyboard, auto-focus on modal open
- Target field: numeric keyboard on focus

---

## Section 6 — Create Mode: Secondary Goal

Entered from G-1 "Add a Supporting Goal" CTA.

Identical form to Create / Primary, with one difference: the screen title.

```
┌─────────────────────────────────────────────────────────┐
│  ✕   A supporting goal                     [  Save  ]   │  ← Title differs
├─────────────────────────────────────────────────────────┤
│  [Chapter Name — 13sp, secondary, muted]                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Goal                                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  What are you building toward?                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ... (same form body as primary)                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The goal name placeholder is identical. Both primary and secondary goals are commitments — there is no reason to make secondary goal creation feel lesser. "What are you building toward?" applies equally.

**Secondary goals have no limit.** The form does not display a count or a cap warning.

---

## Section 7 — Edit Mode

Entered from G-2 → overflow (⋯) → "Edit Goal" for in-progress goals only.

```
┌─────────────────────────────────────────────────────────┐
│  ✕   Edit goal                             [  Save  ]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Goal                                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Squat 405                                       │   │  ← Pre-populated
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Target   (optional)                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  405                                             │   │  ← Pre-populated
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Unit                                                   │  ← Visible because Target is set
│  ┌─────────────────────────────────────────────────┐   │
│  │  lbs                                             │   │  ← Pre-populated
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Program   (optional)                                   │  ← Conditional
│  ┌─────────────────────────────────────────────────┐   │
│  │  Power Block — Cycle 1                         ›  │   │  ← Pre-populated if set
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Edit mode differences from create mode:**
- No chapter context line (athlete is already oriented via G-2)
- All fields pre-populated with current values
- Unit field visible from open if target was set
- Save enabled immediately (current name is already valid)
- ✕ triggers Unsaved Changes confirmation if any field differs from its original value

**Primary goal name in edit mode:**
The primary goal name is editable while the goal is In Progress. There is no name lock on first progress update. The "History Cannot Be Rewritten" principle applies to stored progress data (values, unit snapshots, achievement dates) — not to goal metadata. The goal name is not stored in any progress history entry, so renaming does not corrupt any historical record.

The athlete who wants to substantially change their primary commitment (e.g., from a strength goal to a running goal mid-chapter) should archive the chapter and begin a new one. That is the architecture's intended path for a true goal pivot. Edit mode is for refinement, articulation, and correction — not for pivoting the chapter's central purpose without closing it.

---

## Section 8 — Goal Name Field

**Label:** "Goal" — 13sp, muted, above field

**Input:**
- Multiline allowed (wraps to next line) — goal names may be complete sentences
- Capped visual display at 3 lines in the form; text continues to scroll within the field
- Keyboard: default text keyboard
- Return key behavior: advances to Target field (does not submit)

**Placeholder (create mode):** "What are you building toward?"

**Pre-populated (edit mode):** current goal name

**Auto-focus:** Goal name field receives focus when G-3 opens. Keyboard appears immediately. The athlete can start typing without tapping.

**Validation:**
- Required — Save is disabled when empty or whitespace-only
- Maximum 100 characters — character counter appears at 80 characters remaining (showing "20 remaining," "10 remaining," "0 remaining")
- No special character restrictions

**What this field is NOT:**
- A category selector
- A template picker
- A search field

---

## Section 9 — Target Field

**Label:** "Target  (optional)" — 13sp, muted, above field. The "(optional)" suffix is part of the label — it communicates directly that the field can be skipped.

**Input:**
- Numeric keyboard
- Supports integers and decimals (athlete may track "32.5 miles" or "2.5 hours")
- Single line

**Placeholder (create mode):** "e.g. 405"

**Pre-populated (edit mode):** current target value, or empty if not previously set

**Validation:**
- Optional when no progress history exists
- Must be > 0 if provided
- Cannot be 0 (a goal with target 0 is not a goal)
- Cannot be negative
- Cannot be cleared in edit mode if progress history exists (see Section 7, Decision 5)

**Inline validation message (edit mode, target cleared with history):**

```
You've recorded progress toward this target.
To keep your history, a target is required.
```

13sp, muted, below the field. Appears immediately when target is cleared. Save is disabled until a valid target is re-entered.

**Relationship to Unit field:**
- Unit field appears below Target when Target has a non-empty value
- Unit field disappears (and any unit content is discarded) when Target is cleared
- This transition is immediate (no animation required, but a subtle appearance is acceptable)

---

## Section 10 — Unit Field

**Conditional appearance:** Visible only when Target field has a non-empty value. Hidden (not merely disabled) when Target is empty.

**Label:** "Unit" — 13sp, muted, above field. No "(optional)" suffix — the contextual appearance of the field communicates its optionality. The athlete who entered a target but doesn't need a unit can simply leave the unit field blank.

**Placeholder (create mode):** "e.g. lbs, miles, sessions" — suggests real-world unit formats without prescribing them

**Pre-populated (edit mode):** current unit label, or empty if not previously set

**Input:**
- Default text keyboard
- Maximum 30 characters
- Single line

**Validation:**
- Optional
- Maximum 30 characters (no other restrictions)
- Freeform — any string is valid

**What the unit field is NOT:**
- A dropdown or picker (no predefined unit options)
- A unit conversion system
- A type classifier

---

## Section 11 — Program Association Field

**Conditional section:** Present only when the athlete has an Active program.

**Absent when:** No Active program exists — regardless of whether Upcoming, Graduated, or Ended Early programs exist. No placeholder, no empty state, no "Start a Program" prompt within this form.

**Visual treatment:** The program association row must be the least visually prominent element in the form body. It is supporting context, not a commitment. Lighter muted text, reduced contrast relative to the Goal Name and Target fields, and a smaller touch area (52dp vs. 44dp for name/target fields) are all appropriate. It must never be styled as equal or greater visual weight than the goal name or target.

**Label:** "Program  (optional)" — 13sp, muted, above field

**Display row:**
```
[ No program selected                              ›  ]
```
or, when a program is selected:
```
[ Power Block — Cycle 1                            ›  ]
```

Tapping the row opens the program picker.

**Program Picker:**

Bottom sheet presenting eligible programs. Since only one Active program exists at any time (Program Amendment 001), the picker has at most two items.

```
┌──────────────────────────────────────────────────────┐
│  ▬  (drag handle)                                    │
│                                                      │
│  Associate a program                                 │  ← 17sp, primary weight
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  ○  No program                                       │  ← Default selection
│                                                      │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  ●  Power Block — Cycle 1                            │  ← Active program (shown if selected)
│                                                      │
└──────────────────────────────────────────────────────┘
```

- No section labels — two items maximum, no categorization needed
- One item can be selected at a time (radio-style selection)
- Tapping the Active program: bottom sheet dismisses, program name populates the row
- Tapping "No program": bottom sheet dismisses, row returns to "No program selected"
- Drag-down to dismiss without changing selection

**Eligible programs:**
- Active: the currently active program (maximum 1 at any time)
- Upcoming, Graduated, and Ended Early: excluded

**What appears when the associated program is no longer Active:**
If an athlete associated a goal with a program, and that program subsequently graduates or ends, the goal's program association persists as display text in G-2 (name only — state not shown, per G-2 Section 13). In G-3 Edit mode, the program row shows the now-Graduated program name. The program no longer appears in the picker (Graduated and Ended Early are excluded). The athlete can clear the association ("No program") but cannot re-associate with the graduated program. The association is not automatically cleared — removing it would rewrite the historical record of what program was supporting the goal.

---

## Section 12 — Unsaved Changes Confirmation

Fires when the athlete taps ✕ with unsaved content.

**Condition — Create mode:**
Fires if any field has been modified from its initial state (all fields blank). If goal name is empty AND target is empty AND unit is empty AND program is unset: dismiss without confirmation.

**Condition — Edit mode:**
Fires if any field differs from its value when G-3 was opened. If no fields have changed: dismiss without confirmation.

**Confirmation sheet:**

*Create mode:*
```
┌──────────────────────────────────────────────────────┐
│  Discard goal?                                       │
│  Your goal won't be saved.                           │
│                                                      │
│  [  Discard  ]                                       │  ← Destructive
│  [  Keep Editing  ]                                  │  ← Primary
└──────────────────────────────────────────────────────┘
```

*Edit mode:*
```
┌──────────────────────────────────────────────────────┐
│  Discard changes?                                    │
│  Your changes won't be saved.                        │
│                                                      │
│  [  Discard Changes  ]                               │  ← Destructive
│  [  Keep Editing  ]                                  │  ← Primary
└──────────────────────────────────────────────────────┘
```

**"Keep Editing" is always the primary action.** The athlete defaults to staying. Discarding is the secondary action.

---

## Section 13 — Primary Goal Protection

G-3 in "create primary" mode should never be reachable when a primary goal already exists in the current chapter. The entry point (G-1 "Add a Goal" CTA) is only visible in the "No Primary Goal" state.

**If G-3 is reached in create primary mode despite an existing primary goal** (race condition, network delay, or unexpected navigation):

1. Save is attempted
2. Server-side validation detects existing primary goal
3. G-3 returns an error state:

```
┌──────────────────────────────────────────────────────┐
│  Unable to save                                      │
│  Your chapter already has a primary goal.            │
│  Return to your chapter to view it.                  │
│                                                      │
│  [  OK  ]                                            │
└──────────────────────────────────────────────────────┘
```

4. Tapping "OK" returns to G-3 (athlete can ✕ to dismiss or edit the form)

**There is no "replace primary goal" flow in G-3.** Changing a chapter's primary goal is an archival action, not an edit action.

---

## Section 14 — Validation Rules

### 14.1 Save Button Behavior

Save is enabled when:
- Goal name has at least one non-whitespace character

Save is disabled when:
- Goal name is empty, null, or whitespace-only

No other field affects the Save button state. The athlete can save a goal with only a name.

### 14.2 Field-Level Validation

| Field | Trigger | Message | Location |
|-------|---------|---------|----------|
| Goal name — empty | Save tapped with empty name | Save remains disabled; no message needed (button state communicates this) | — |
| Goal name — max length | Character count hits 100 | Counter: "0 remaining" (red) | Below field |
| Target — non-numeric | Non-numeric character entered | Numeric keyboard prevents non-numeric input; no separate message needed | — |
| Target — zero or negative | Save tapped with target ≤ 0 | "Target must be greater than 0." | Below Target field |
| Target — cleared with history | Target field cleared in Edit mode with history present | "You've recorded progress toward this target. To keep your history, a target is required." | Below Target field |
| Unit — max length | Character count hits 30 | Counter: "0 remaining" (red) | Below field |
| Program — invalid | Program no longer exists at save time | "That program is no longer available. Please select another or choose no program." | Below Program field |

### 14.3 Validation Order at Save

Validation is checked in this order:
1. Goal name not empty
2. Target > 0 if target is provided
3. Target not cleared if history exists (edit mode)
4. Unit length ≤ 30 if provided

If multiple errors exist, the first error in form order is shown and focus moves to that field. Once resolved, the next error is shown.

### 14.4 Character Counter

The goal name character counter appears at 80/100 characters (when 20 or fewer characters remain). It is not visible below this threshold — no need to show "96 remaining" while the athlete is mid-thought.

---

## Section 15 — Navigation

### 15.1 Entry Points

| Entry | Mode | Goal Type | Screen Shown |
|-------|------|-----------|-------------|
| G-1 → "Add a Goal" | Create | Primary | G-3, blank, "Your chapter goal" |
| G-1 → "Add a Supporting Goal" | Create | Secondary | G-3, blank, "A supporting goal" |
| G-2 → ⋯ → "Edit Goal" (In Progress) | Edit | (goal's type) | G-3, pre-populated, "Edit goal" |
| L-5 → goal step | Create | Primary | G-3, blank, "Your chapter goal" |

### 15.2 Exit Points

| Action | Destination |
|--------|------------|
| Save — Create / Primary (from G-1) | G-1, primary goal now visible |
| Save — Create / Secondary (from G-1) | G-1, new secondary goal in SUPPORTING GOALS |
| Save — Create / Primary (from L-5) | L-5 next step, or chapter confirmed with goal |
| Save — Edit (from G-2) | G-2, updated goal displayed |
| ✕ — no changes | Returns to entering screen unchanged |
| ✕ — changes present → confirm discard → Discard | Returns to entering screen unchanged |
| ✕ — changes present → confirm discard → Keep Editing | Returns to G-3, unchanged |

### 15.3 G-3 Does Not Navigate To

- G-1 (except via Save or dismiss)
- G-2 (not accessible from within G-3)
- Any program management screen (program picker is a bottom sheet, not a navigation screen)
- Any chapter management screen

---

## Section 16 — Mobile UX

### 16.1 Screen Type

Full-screen modal presentation. Not a navigation stack screen. Not a bottom sheet. The modal slides up from the bottom on entry and dismisses downward on close.

The full-screen treatment is appropriate because:
- G-3 requires text input (partial-height modals leave insufficient space for keyboard + form)
- The commitment deserves full screen — not a sheet crowded at the bottom of a list
- Edit mode pre-populates multiple fields, which requires full-screen viewing space

### 16.2 Keyboard Behavior

- Goal name field receives auto-focus on modal open — keyboard appears immediately
- Moving to Target field: numeric keyboard
- Moving to Unit field: text keyboard
- Moving to Program row: bottom sheet opens (no keyboard)
- Keyboard dismissal: tapping outside a field, or pressing the Return key from the last field

### 16.3 Scroll Behavior

The form body is scrollable if content + keyboard would clip below the screen. Standard keyboard-avoidance scroll. The Save button in the modal header remains always visible — it does not scroll away.

### 16.4 Top of Form

Modal header (✕ + title + Save) is fixed at the top of the screen. It does not scroll with the form body.

### 16.5 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| ✕ dismiss | 44×44dp |
| Save button | 44×44dp |
| Goal name field | Full width × 44dp minimum touch area |
| Target field | Full width × 44dp minimum touch area |
| Unit field | Full width × 44dp minimum touch area |
| Program row | Full width × 52dp |
| Program picker items | Full width × 48dp |
| Unsaved Changes — "Discard" | Full width × 52dp |
| Unsaved Changes — "Keep Editing" | Full width × 52dp |

### 16.6 Portrait Orientation

G-3 is portrait only.

### 16.7 Accessibility Labels

**Modal header:**
- ✕: `accessibilityLabel` = "Close, discard goal" (create) / "Close, discard changes" (edit)
- Save: `accessibilityLabel` = "Save goal" (create) / "Save changes" (edit)
- Save disabled: `accessibilityHint` = "Enter a goal name to save"

**Fields:**
- Goal name: `accessibilityLabel` = "Goal name, required"
- Target: `accessibilityLabel` = "Target value, optional"
- Unit: `accessibilityLabel` = "Unit label, optional. Appears with target."
- Program row: `accessibilityLabel` = "Program, optional. [current selection]."

**Program picker:**
- Each row: `accessibilityLabel` = "[Program Name], [selected/not selected]"
- "No program": `accessibilityLabel` = "No program, [selected/not selected]"

---

## Section 17 — Edge Cases

### 17.1 Athlete Has No Active Chapter

G-3 should never be reachable without an active chapter. Entry points (G-1 and L-5) are only accessible when a chapter is active. If G-3 is reached without a chapter context (due to an unexpected state), the form is not shown — G-3 returns an error and dismisses to the entering screen.

### 17.2 Athlete Creates Goal, Then Chapter Becomes Archived Before Saving

Race condition: athlete opens G-3, chapter archives in another session or device, athlete taps Save. Server-side validation rejects the save with message: "Your chapter has been completed. Goals can only be added to active chapters." G-3 dismisses to G-1 (now in No Active Chapter state).

### 17.3 Target Entered, Unit Left Blank (Quantifiable Goal, No Unit)

Valid state. The quantifiable model does not require a unit. The goal is tracked as a number only. G-2 displays "[current] / [target]" (no unit). History entries show "[previous] → [new]" (no unit). This is intentional — not all quantifiable goals have natural units. ("Number of sessions" might not need a unit label.)

### 17.4 Unit Over 30 Characters

Character count at 30: "0 remaining" in red. Save is blocked until unit is trimmed to ≤ 30 characters. Athlete cannot type past 30 characters in the unit field (input is blocked at the limit).

### 17.5 Goal Name Over 100 Characters

Same as unit length limit. Blocked at 100 characters. Counter shown at 20 remaining. Save is not blocked while count is within limit — only blocked when name is empty. If somehow submitted at limit, validation passes.

### 17.6 Goal Name That Is Only Whitespace

Example: athlete taps spacebar several times. Save remains disabled — whitespace-only is treated as empty for validation purposes. The field is trimmed before the save-disabled check.

### 17.7 Target Entered as "0"

Validation: "Target must be greater than 0." Save is blocked. Inline message below Target field.

### 17.8 Editing Target Below Current Progress Value

Example: current = 415, athlete changes target from 405 to 300. Progress would exceed 100%. This is valid. G-3 does not warn. G-2 shows the bar capped at 100% with the accurate "[current] / [target] [unit]" display (415 / 300 lbs). The edge case is documented in G-2 Section 16.3 and applies without modification.

### 17.9 Program Selected, Then Program Becomes Unavailable

If the athlete opens G-3, selects a program, and the program is deleted or ended between selection and save: server-side validation returns an error. Inline message below Program field. Athlete must reselect or choose "No program" before saving.

### 17.10 No Active Program Exists

Program field is absent from the form entirely — regardless of whether Upcoming, Graduated, or Ended Early programs exist. No placeholder, no message about programs. The form is shorter. This is the expected state for athletes who have not started a program, or whose program has ended.

### 17.11 Only Upcoming, Graduated, or Ended Early Programs Exist

Program field is absent. Future plans and past programs are not eligible for association with in-progress goals. The athlete who wants to associate a program must start an Active program before returning to G-3.

### 17.14 Active Program Graduates or Ends After Goal Association

The athlete associated a goal with a program. The program subsequently graduates via M-4 (W-17 completion flow) or is ended early. The goal's program association persists in G-2 as display text: program name shown, state not shown (per G-2 Section 13). In G-3 Edit mode: the program row displays the now-Graduated or Ended Early program name. The picker shows only Active programs; the graduated program no longer appears. The athlete can change to "No program" but cannot re-associate the graduated program. The association is not cleared automatically — it is a historical display fact.

### 17.12 Editing Goal Name to Same Value

If the athlete opens Edit mode, clears the name, and re-types the identical value: the form detects a change (it was cleared at some point), and ✕ would trigger the Unsaved Changes confirmation. On Save: the goal name is updated to the same value (no net change, but a valid operation). This is a minor edge case with no meaningful consequence.

### 17.13 Creating Goal With Duplicate Name

No restrictions on duplicate goal names. Two secondary goals named "Improve consistency" is valid. Goals are identified by their ID, not their name. No duplicate-name warning is shown.

---

## Section 18 — Architecture Risks

### Risk 1 — L-5 Chapter Creation Integration Undefined

**Issue:** G-3 is referenced as an optional step within L-5 Chapter Creation, but the L-5 spec has not been written. The exact integration — whether G-3 is a linked step, a modal within L-5, or an embedded form — is undefined.

**Recommendation:** G-3 behaves identically regardless of entry context. Whether embedded in L-5 or opened as a standalone modal, the form and save behavior are unchanged. The L-5 spec must define how to navigate to and from G-3 within the chapter creation flow. G-3 requires no architectural changes to support this.

**Risk level:** Low for G-3. Medium for L-5 integration design.

---

### Risk 2 — Progressive Unit Field Disclosure on Android

**Issue:** The Unit field appearing below Target when Target has a value may cause unexpected layout shifts on Android if not implemented with smooth animation or standard expansion behavior. The transition must feel intentional, not broken.

**Recommendation:** The Unit field should use a standard slide-in or fade-in animation on appearance. Disappearance should be equally smooth. This is a standard pattern on both iOS and Android and does not require custom implementation. Specify in the implementation notes that this uses native form field conditional visibility, not custom animation.

**Risk level:** Low. Standard implementation pattern.

---

### Risk 3 — "Quantifiable to Narrative" Conversion Ambiguity

**Issue:** The rule is: target cannot be cleared in edit mode if progress history exists. But what counts as "progress history"? If the athlete has 0 as current value and has made no manual updates, does the initial state (0 → no updates) count as history?

**Recommendation:** "Progress history exists" means at least one "Update Progress" save action has occurred since goal creation. The initial state (goal created, no updates made, current value = 0) does not count as history. An athlete who created a quantifiable goal and immediately decides to remove the target (before any updates) can do so — the goal becomes narrative, and the current value of 0 is discarded.

**Risk level:** Medium. Must be defined in the data model for the engineer implementing G-3 Edit mode.

---

### Risk 4 — Program Picker Scope (Active + Upcoming Only)

**Issue:** The program picker shows Active and Upcoming programs only. If MVP program states change (e.g., a new "Paused" state is added), the picker scope definition becomes stale.

**Recommendation:** The picker should show programs in states that are "eligible for new work" — currently Active and Upcoming. When new program states are added, the implementation team must revisit whether the new state should be included in the picker. Document this as a future-facing note in the implementation spec.

**Risk level:** Low for MVP. Moderate for future state additions.

---

## Section 19 — Validation Checklist

### Modal Header
- [ ] ✕ left side — 44×44dp minimum
- [ ] Screen title: "Your chapter goal" (primary create), "A supporting goal" (secondary create), "Edit goal" (edit)
- [ ] Save right side — 44×44dp minimum — disabled when name empty, enabled when name has content
- [ ] Chapter context line below header in create mode — 13sp, muted — absent in edit mode
- [ ] Modal header fixed — does not scroll with form body

### Goal Name Field
- [ ] Label: "Goal" — 13sp, muted
- [ ] Placeholder: "What are you building toward?" — present in create mode; absent (pre-populated) in edit
- [ ] Auto-focus on modal open — keyboard appears immediately
- [ ] Return key advances to Target field
- [ ] Save disabled when name empty or whitespace-only
- [ ] Character counter appears at 80/100 characters
- [ ] Character counter: "0 remaining" (red) at 100 characters
- [ ] Input blocked at 100 characters
- [ ] No character type restrictions

### Target Field
- [ ] Label: "Target  (optional)" — 13sp, muted — with "(optional)" as part of label
- [ ] Placeholder: "e.g. 405" — present in create mode; absent (pre-populated) in edit
- [ ] Numeric keyboard on focus
- [ ] Supports integers and decimals
- [ ] Input of 0 or negative: validation message "Target must be greater than 0."
- [ ] Save blocked if target provided but ≤ 0
- [ ] Edit mode — target cleared with history: validation message shown, Save blocked
- [ ] Unit field appears below when Target has non-empty value
- [ ] Unit field disappears when Target is cleared

### Unit Field
- [ ] Conditional — absent when Target is empty; present when Target has value
- [ ] Label: "Unit" — 13sp, muted — no "(optional)" suffix
- [ ] Placeholder: "e.g. lbs, miles, sessions" — create mode
- [ ] Pre-populated in edit mode if unit was previously set
- [ ] Default text keyboard
- [ ] Maximum 30 characters; blocked at 30; counter at ≤ 10 remaining
- [ ] Not required — Save allowed with Target set but Unit blank

### Program Association
- [ ] Conditional — present only when an Active program exists
- [ ] Absent when no Active program exists (even if Upcoming, Graduated, or Ended Early programs exist) — no placeholder, no empty state
- [ ] Label: "Program  (optional)" — 13sp, muted
- [ ] Display row: "No program selected" (default) or program name (if selected)
- [ ] Tapping row opens program picker bottom sheet
- [ ] Picker: "No program" always first; Active program listed below (maximum 1 item per Program Amendment 001)
- [ ] No ACTIVE or UPCOMING section labels — two items maximum, no categorization
- [ ] Upcoming, Graduated, Ended Early programs not shown in picker
- [ ] Selecting the Active program closes picker and populates row
- [ ] Selecting "No program" closes picker and clears row
- [ ] Picker dismissable by drag-down without changing selection
- [ ] Program Association row is visually subordinate to Goal Name and Target fields (lighter muted treatment, not equal visual weight)

### Unsaved Changes Confirmation
- [ ] Fires in create mode when any field has content and ✕ tapped
- [ ] Does not fire in create mode if all fields are empty
- [ ] Fires in edit mode when any field differs from original value and ✕ tapped
- [ ] Does not fire in edit mode if no fields have changed
- [ ] Create mode: "Discard goal?" / "Your goal won't be saved."
- [ ] Edit mode: "Discard changes?" / "Your changes won't be saved."
- [ ] "Keep Editing" is the primary action
- [ ] "Discard" / "Discard Changes" is the destructive secondary action

### Primary Goal Protection
- [ ] "Add a Goal" CTA on G-1 is only visible when no primary goal exists
- [ ] G-3 in create/primary mode is only reachable when no primary goal exists
- [ ] Server-side validation blocks primary goal creation if one already exists
- [ ] Error message shown if server-side block fires: "Your chapter already has a primary goal."
- [ ] No "replace primary goal" option exists in G-3

### Validation at Save
- [ ] Goal name empty → Save disabled (no message needed)
- [ ] Target ≤ 0 → inline message below Target, Save blocked
- [ ] Target cleared with history → inline message below Target, Save blocked
- [ ] Unit > 30 characters → inline message below Unit, Save blocked
- [ ] Errors shown in field order (first error in form gets focus)

### Navigation
- [ ] Save (create/primary from G-1) → G-1 with new primary goal visible
- [ ] Save (create/secondary from G-1) → G-1 with new secondary goal in SUPPORTING GOALS
- [ ] Save (edit from G-2) → G-2 with updated goal displayed
- [ ] ✕ (no changes) → entering screen unchanged
- [ ] ✕ (with changes, Discard) → entering screen unchanged
- [ ] G-3 does not navigate to G-1, G-2, L-3, W-3, or any other screen mid-form

### Goal Type Model (inherited from G-2)
- [ ] No goal-type selector
- [ ] No "narrative" / "quantifiable" toggle
- [ ] Display model inferred from Target field presence
- [ ] Target empty → narrative goal created
- [ ] Target present → quantifiable goal created
- [ ] Unit optional regardless of Target presence

### Mobile UX
- [ ] Full-screen modal presentation — slides up from bottom
- [ ] All tap targets meet minimums
- [ ] Portrait orientation only
- [ ] Keyboard avoidance: form scrolls so active field remains above keyboard
- [ ] Modal header fixed — not scrolled by form
- [ ] Accessibility labels on all interactive elements
- [ ] Auto-focus on goal name field on open

---

## Section 20 — Downstream Dependencies

### L-5 — Chapter Creation

G-3 is entered during chapter creation for optional primary goal setup. L-5 must:
- Present G-3 in Create / Primary mode
- Handle return from G-3 (goal created or skipped)
- Not require G-3 completion — goal creation must be optional in the chapter creation flow

L-5 spec is not yet written. G-3 makes no assumptions about L-5's internal structure.

### G-1 — Goal Hub

On Save from Create mode, G-1 must reflect the new goal:
- New primary goal → G-1 transitions from "No Goals" state to "Primary Goal In Progress"
- New secondary goal → G-1 adds card to SUPPORTING GOALS section

On Save from Edit mode (entered via G-2, not G-1), G-1 is not immediately visible but must reflect updated data on next view.

### G-2 — Goal Detail

On Save from Edit mode, G-2 must immediately reflect:
- Updated goal name in identity block
- Updated target/unit in PROGRESS section and HISTORY display
- Updated program name in PROGRAM section
- Recalculated progress percentage (if target changed)

G-3 is a dependent of G-2 — it is only accessible for goal editing through G-2. G-3 must not be accessible for editing from any other surface.

### Program Picker — W-2 / Program Data

G-3's program picker requires access to the athlete's program collection (Active and Upcoming programs). The program data model is defined by Program Architecture Amendment 001 and W-2. The picker must use the same program state model.

---

## Change Log

### v1.1 — June 2026

Three architecture revisions evaluated before lock. Two accepted, one rejected.

**Accepted — Revision 1: Program association scope restricted to Active program only.** Upcoming programs removed from picker. Rationale: associating a goal with a program that has not started creates a support relationship that does not yet exist. Active-only rule ensures the association reflects a current, running relationship. Picker simplified to two items maximum: "No program" and the Active program. Program field now absent when no Active program exists (previously absent when no Active *or* Upcoming programs existed). New edge case 17.14 added: Active program graduates after goal association — association persists as display text, graduated program removed from picker, association not auto-cleared.

**Accepted — Revision 3: Program association visual hierarchy explicitly documented.** Section 3 TIER 4 and Section 11 updated to require Program Association be styled at lighter visual weight than Goal Name and Target. This prevents the program picker from being styled as visually prominent as the goal commitment fields.

**Rejected — Revision 2: Primary goal name lock.** Proposed rule: primary goal name becomes immutable after first progress update or achievement. Rejected because: (1) "History Cannot Be Rewritten" applies to stored progress data — values, unit snapshots, achievement dates — not to goal name metadata; the goal name is absent from all history entries, so renaming corrupts no stored record. (2) The rule would block legitimate typo fixes and goal articulation refinements. (3) The achieved goal is already structurally sealed (G-2 overflow absent). (4) The correct response to a genuine goal pivot is chapter archival. A documentation note was added to Section 7 (Edit Mode) stating this guidance explicitly.

### v1.0 — June 2026

Initial specification. G-3 Goal Create/Edit created as the third goal screen in Phase 2B. Resolves all eight goal creation architecture decisions. Defines G-3 as a full-screen modal (not navigation stack) — the focused, commitment-framing presentation. Establishes the three-field form (Name + optional Target + optional Unit) as the canonical MVP creation surface. Progressive unit field disclosure (unit appears when target has value) confirmed. Program association field: optional picker showing Active and Upcoming programs only, absent when no eligible programs exist. Primary goal protection enforced via entry point architecture + server-side validation. "Quantifiable to narrative" conversion blocked in edit mode when progress history exists (protects historical record). Unsaved changes confirmation specified for both create and edit modes. L-5 integration flagged as downstream dependency pending L-5 spec.

---

*Forge Legacy Goal Create / Edit Wireframe Specification — G-3*
*v1.1 — June 2026*
*Authority: Forge Legacy Master PRD Section 9, Product DNA, G-1 Goal Hub v1.1, G-2 Goal Detail v1.0*
