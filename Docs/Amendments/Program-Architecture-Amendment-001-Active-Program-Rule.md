# Program Architecture Amendment 001 — Active Program Rule
## Forge Legacy | Phase 2B | Version 1.0 — June 2026

**Amendment ID:** Program-Architecture-Amendment-001
**Status:** Locked
**Date:** June 2026
**Supersedes:** No prior amendment — this is the initial program state architecture decision
**Applies to:** W-1 (Program Strip), W-2 (Program Browse), W-3 (Program Detail), W-4 (Program Create), W-5 (Program Fork/Edit), W-17 (Workout Summary), M-4 (Program Graduation Modal), Legacy Timeline

---

## Section 1 — Program States

Forge Legacy supports four program states. These states are mutually exclusive per program record. A program occupies exactly one state at any moment.

| State | Definition | Limit per Athlete |
|-------|-----------|------------------|
| **Active** | The program the athlete is currently following. Workouts are being logged against it. | **1** |
| **Graduated** | The program was completed naturally through the final workout and the W-17 graduation flow. | Unlimited |
| **Ended Early** | The program was intentionally ended before the final workout was reached. | Unlimited |
| **Future** | The program exists in the athlete's collection but has not been started. | Unlimited |

### State Transition Rules

A program may only move along these legal transitions:

```
Future → Active                  (athlete starts the program)
Active → Graduated               (athlete completes the final workout via W-17)
Active → Ended Early             (athlete ends the program via the Conflict Resolution Sheet)
```

**There are no other legal transitions.** Specifically:
- A Graduated program cannot be reactivated
- An Ended Early program cannot be reactivated
- A Graduated program cannot be converted to Ended Early
- An Ended Early program cannot be converted to Graduated
- A Future program cannot be marked Graduated or Ended Early without first becoming Active

History cannot be rewritten.

---

## Section 2 — Active Program Rule

**One Active program at a time. No exceptions.**

An athlete may have at most one Active program at any moment. This limit applies to all athletes regardless of subscription tier, chapter state, or goal state.

- Unlimited Future programs are permitted
- Unlimited Graduated programs accumulate as permanent legacy records
- Unlimited Ended Early programs accumulate as permanent legacy records

**Why one Active program:**
A program is a structured training commitment — not a catalog item or a passive reference. Following two programs simultaneously produces fragmented effort and fragmented records: the athlete cannot know which program to credit for a given workout, and the legacy record becomes ambiguous. One active program at a time keeps the commitment and the record clean.

---

## Section 3 — Conflict Resolution: "Current Program Active" Sheet

When an athlete attempts to start a program (any program in Future state, or any library program) while another program is Active, the system must display a confirmation sheet before proceeding.

### Sheet Specification

```
┌──────────────────────────────────────────────────────┐
│  Current Program Active                              │
│                                                      │
│  You already have an active program.                 │
│                                                      │
│  Starting a new program will end your current        │
│  program.                                            │
│                                                      │
│  [ End Current Program & Start New ]                 │  ← Destructive / confirmed action
│  [ Cancel ]                                          │  ← Secondary / dismisses sheet
└──────────────────────────────────────────────────────┘
```

**Title:** Current Program Active
**Body:** "You already have an active program.\n\nStarting a new program will end your current program."
**Primary action:** "End Current Program & Start New"
**Secondary action:** "Cancel"

### Conflict Sheet Behavior

**"End Current Program & Start New" selected:**
1. The previously Active program transitions to **Ended Early** state
2. An Ended Early record is permanently created for that program (date, workouts completed, final workout reached)
3. The newly selected program transitions to **Active** state
4. The athlete proceeds into the new program
5. No graduation flow (M-4 or W-17 graduation state) fires for the program that was ended

**"Cancel" selected:**
1. The sheet dismisses
2. The currently Active program remains Active
3. No state changes occur
4. The athlete returns to wherever they were (W-3 Program Detail or W-2 Program Browse)

### When the Conflict Sheet Fires

The sheet fires from **W-3 Program Detail** when the athlete taps "Start Program" and another program is Active. It does not fire from W-2 directly — the athlete must navigate to a program's detail screen before initiating a start. This ensures the athlete has reviewed the new program before making a commitment that ends an existing one.

---

## Section 4 — Graduation Rule

**Natural completion = Graduated state.**

A program graduates when the athlete logs the final scheduled workout. The graduation flow is:

1. W-17 Workout Summary displays the "Program Complete" graduation state
2. M-4 Program Graduation Modal fires
3. The program transitions from Active → **Graduated**
4. The Legacy Timeline receives a graduation entry
5. The athlete is prompted to find their next program (W-2) or create a new program (W-4)

**M-4 fires only for Graduated programs.**
**W-17 graduation state triggers only for Graduated programs.**

A program that reaches its final workout and is completed through the standard workout logging flow is always Graduated — regardless of how long it took, whether the athlete took breaks, or any other circumstance.

---

## Section 5 — Ended Early Rule

**Intentional early end = Ended Early state.**

A program is marked Ended Early when the athlete selects "End Current Program & Start New" from the Conflict Resolution Sheet. This is the only way a program can become Ended Early — it requires a deliberate action by the athlete in the context of choosing to start a new program.

**Ended Early programs do not receive:**
- A graduation flow
- M-4 Program Graduation Modal
- W-17 graduation state
- Any acknowledgment screen, ceremony, or prompt

The Ended Early fact is recorded silently and immediately as part of the state transition. The athlete's attention moves to the newly started program.

**What is recorded in an Ended Early record:**
- Program name and version
- Date ended
- Number of workouts completed before ending
- The final workout that was logged (if any)
- State: Ended Early

**What is NOT recorded:**
- Why the athlete ended the program early
- Any performance assessment of the incomplete program
- Any comparison to expected completion

The reason belongs to the athlete alone. The system records the fact without judgment.

---

## Section 6 — Legacy Rules

### Permanence

Graduated and Ended Early programs are permanent legacy records. They may never be deleted.

| Rule | Graduated | Ended Early |
|------|-----------|------------|
| Can be deleted | No | No |
| Can be converted to the other state | No | No |
| Can be reactivated | No | No |
| Remains visible permanently | Yes | Yes |
| Contributes to legacy systems | Yes | Yes (where applicable) |

### History Cannot Be Rewritten

An athlete who graduated a program has a Graduated record. An athlete who ended a program early has an Ended Early record. These facts are immutable. The product does not provide a mechanism to alter them because the integrity of the legacy depends on the accuracy of the record.

### Legacy Contribution

Both Graduated and Ended Early programs may contribute to:
- **Legacy Timeline** — both create timeline entries (copy differs by state)
- **Honors Eligibility** — eligibility rules per honor determine whether both states qualify. Example: a "First Program Graduation" honor may require Graduated specifically. A "First Program" honor may accept either state.
- **Accomplishments Eligibility** — program records may be cited as evidence for user-declared accomplishments
- **Future Recognition Systems** — post-MVP recognition architecture may reference program state history

---

## Section 7 — Display Rules

### Same Section, No Separation

Graduated and Ended Early programs **must appear together** in a single unified section on W-2 Program Browse. Do not create separate sections ("Completed Programs" vs. "Programs Ended Early"). Separation would imply that Ended Early is an inferior or failure category — which it is not.

### State Label Treatment

| Element | Visual Weight | Treatment |
|---------|-------------|-----------|
| Program name | Primary | Dominant — largest text, full opacity |
| State label ("Graduated" / "Ended Early") | Secondary metadata | Reduced visual weight — smaller, muted, not bolded |

The state label is descriptive, not evaluative. It answers "when did this program end and how" — not "how well did the athlete perform."

### What "Ended Early" Does Not Mean

The product must never imply — through copy, iconography, color, or placement — that:
- Ended Early is a failure
- Ended Early is an incomplete or inferior state
- The athlete should have continued
- The athlete's legacy is diminished by an Ended Early record

An athlete who ended a program early made a deliberate decision. The product respects that decision by recording it accurately and without judgment.

---

## Section 8 — Program–Goal Independence

**An active goal may exist without an active program. Programs support goals but are not required to fulfill them.**

### Examples

| Scenario | Valid? |
|----------|--------|
| Goal: "Lose 20 pounds" — No active program | Valid |
| Goal: "Run first marathon" — Active program: Marathon Build Program | Valid |
| Goal: "Build strength foundation" — Future program saved, not yet started | Valid |
| No goal, no chapter, but program is active | Valid |
| Active program, no assigned chapter goal | Valid |

Programs are tools that may serve goals. They are not prerequisites for goal existence, goal progress, or goal completion. An athlete who achieves a goal through unstructured training has achieved the goal. The product does not require a program to have been active.

### Implementation Guardrails

- Goal creation (L-8 Goal Create-Edit) must not require or prompt for a program
- Goal completion and archival must not depend on program state
- W-4 Program Create must not require an active goal or chapter as a prerequisite
- The Program Strip on W-1 showing an active program does not replace or represent the athlete's goal or chapter context

---

## Section 9 — Downstream Impact

### Summary Table

| Screen | Impact |
|--------|--------|
| **W-1** Workouts Hub | Program Strip shows exactly one Active program. If no Active program: Program section shows invitation state ("Find a program →" or "+ Create"). No pluralizing of active programs — only one is ever shown. |
| **W-2** Program Browse | Must surface all four states with appropriate display. "Start Program" path routes through W-3 → conflict sheet when Active exists. Past programs (Graduated + Ended Early) in unified legacy section. Cites this amendment. |
| **W-3** Program Detail | Active state: progress bar, next workout, active indicator. Future state: "Start Program" CTA (fires conflict sheet if another Active). Graduated state: read-only, sealed record, final progress, graduation date. Ended Early state: read-only, sealed record, workouts completed, ended date. No reactivation CTA for any historical state. |
| **W-4** Program Create | Newly created programs default to Future state. Starting a newly created program follows the same conflict sheet rule as any other program start. |
| **W-5** Program Fork/Edit | No direct state impact — fork/edit operates on programs before any workouts are logged, which means the program is always in Future state at edit time. The fork produces a new Future program. Active program cannot be edited (PRD Section 11: locked after first workout). |
| **W-17** Workout Summary | "Program Complete" graduation state and graduation flow trigger only when a program reaches Graduated state (final workout logged). The Ended Early path does not flow through W-17 — it occurs via conflict sheet on W-3. |
| **M-4** Graduation Modal | Fires only on Graduated programs. Not triggered by Ended Early. |
| **Legacy Timeline** | Graduated: "Graduated from [Program Name]" entry. Ended Early: "[Program Name]" entry with Ended Early label. Both are permanent timeline entries. |
| **Honors System** | Honor triggers may specify Graduated specifically, or accept either historical state, depending on the honor definition. Honor architecture is outside this amendment's scope. |

---

## Section 10 — Future Decision Note: Chapter Archival

**This decision is not made in this amendment. It is flagged for future resolution.**

If an athlete archives a chapter (L-4 Chapter Detail — Archive flow) while a program remains Active, the system will require an architecture decision to determine the correct behavior. Options include:

1. The athlete must end or graduate the program before the chapter can be archived
2. The chapter archival automatically creates an Ended Early record for the Active program
3. The program detaches from the chapter context but remains Active independently

This intersection affects L-3, L-4, W-2, W-3, and the chapter archival flow. It must be resolved in the Chapter/Program Intersection Architecture spec, which is outside the scope of this amendment.

**Until that decision is made:** The chapter archival flow (L-4) should not be designed to handle an active program state. Flag this as an open dependency for the L-3/L-4 spec.

---

## Section 11 — Product DNA Alignment

| Principle | How This Amendment Supports It |
|-----------|-------------------------------|
| **Legacy First** | All program records (Graduated and Ended Early) are permanent. Programs are explicitly a tool that serves the story — not the primary product. |
| **Story Before Data** | The distinction between Graduated and Ended Early preserves the accurate story of each program. "I graduated" and "I redirected" are different sentences. Collapsing them into "Completed" loses the story. |
| **Identity Over Performance** | State labels are descriptive, not evaluative. The athlete who ended a program early is not penalized. The record reflects identity and decision-making, not performance quality. |
| **Accountability Without Shame** | Both states are neutral historical facts. Ended Early does not imply failure. No ceremony, prompt, or screen draws attention to the end — it is recorded silently. The display rules explicitly forbid visual stigma. |
| **Transformation Over Activity** | The one-Active-program rule enforces commitment over accumulation. An athlete cannot collect active programs as activity signals — they must commit to one transformation arc at a time. |
| **Simplicity Wins** | One active program eliminates complex multi-state management across W-1, W-3, W-17, and the honors system. The conflict sheet is a single, clear decision point. |
| **History Cannot Be Rewritten** | The architecture guardrail is directly encoded as a rule: no state can be deleted, converted, or reversed. The record of what happened is immutable. |

---

## Section 12 — What This Amendment Does Not Address

The following topics are explicitly outside this amendment's scope:

- Program discovery/browsing UI details on W-2 (to be designed in the W-2 spec)
- Program library content source (system templates, community programs, partner programs)
- Program assignment logic to chapters or goals
- Program recommendation or matching logic
- Honors system trigger logic per state (to be designed in the Honors Architecture spec)
- The chapter archival / active program intersection (see Section 10)
- Notification behavior related to program state (to be designed in the Notifications Architecture spec)
- Import-created program behavior (governed by Architecture-Amendment-001-Import.md; imported programs default to Future state and follow the same conflict sheet rule on start)

---

## Section 13 — Validation Checklist

### Program States
- [ ] Exactly four states defined: Active, Graduated, Ended Early, Future
- [ ] Only one Active program permitted at a time — enforced without exception
- [ ] Unlimited Future programs permitted
- [ ] Unlimited Graduated programs accumulate
- [ ] Unlimited Ended Early programs accumulate

### State Transitions
- [ ] Future → Active: only legal transition to Active
- [ ] Active → Graduated: only via final workout + W-17 graduation flow
- [ ] Active → Ended Early: only via conflict sheet "End Current Program & Start New"
- [ ] No other state transitions permitted
- [ ] No reactivation of historical states (Graduated or Ended Early)
- [ ] No conversion between Graduated and Ended Early

### Conflict Resolution Sheet
- [ ] Sheet fires when "Start Program" is tapped while another program is Active
- [ ] Sheet fires from W-3, not directly from W-2 card
- [ ] Title: "Current Program Active"
- [ ] Body: "You already have an active program.\n\nStarting a new program will end your current program."
- [ ] Primary action: "End Current Program & Start New"
- [ ] Secondary action: "Cancel"
- [ ] "End Current Program & Start New": current Active → Ended Early, new program → Active
- [ ] "Cancel": no state changes, sheet dismisses

### Graduation
- [ ] Graduated state created only via final workout + W-17 flow
- [ ] M-4 fires only for Graduated
- [ ] W-17 graduation state only for Graduated
- [ ] No graduation ceremony for Ended Early

### Ended Early
- [ ] Ended Early state created only via conflict sheet
- [ ] Ended Early record is silent — no ceremony, no screen, no prompt
- [ ] No "why did you end early?" prompt exists
- [ ] Ended Early record is permanent and immutable

### Legacy Rules
- [ ] Graduated programs: cannot be deleted, converted, or reactivated
- [ ] Ended Early programs: cannot be deleted, converted, or reactivated
- [ ] Both states contribute to legacy systems (Timeline, Honors, Accomplishments eligibility)

### Display Rules
- [ ] Graduated and Ended Early appear in the same section on W-2
- [ ] No separate sections for Graduated vs. Ended Early
- [ ] Program name is primary visual element
- [ ] State label is secondary metadata — reduced visual weight
- [ ] No visual stigma for Ended Early state

### Program–Goal Independence
- [ ] Goals can exist without active programs
- [ ] Programs can be active without assigned chapter goals
- [ ] Goal creation does not require or prompt for a program
- [ ] Goal completion does not depend on program state

### Future Decision Note
- [ ] Chapter archival / active program intersection is flagged
- [ ] No resolution attempted within this amendment

---

## Change Log

### v1.0 — June 2026

Initial amendment. Establishes the four-state program model (Active, Graduated, Ended Early, Future), the one-active-program rule, conflict resolution sheet specification, graduation rules, Ended Early rules, legacy permanence rules, display guardrails, program–goal independence rule, downstream impact table, and future decision note on chapter archival.

*Program Architecture Amendment 001 — Active Program Rule*
*v1.0 — June 2026*
*This amendment is the authority for all program state behavior across the Forge Legacy product.*
