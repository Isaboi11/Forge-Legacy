# M-4 Program Graduated Modal
## Ceremony Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Program-Architecture-Amendment-001-Active-Program-Rule.md, Workout-Summary-Spec-W17.md (§11.3), Rank-Up-Modal-Spec-M1.md, M-3-Goal-Achieved-Spec.md, Honor-Evaluation-Service-Architecture-v1.0.md, MVP-Architecture-Audit-v1.0.md [H-16, C-11], Master PRD §11, §15, Product DNA.

---

## 1. Purpose

M-4 is the ceremony that fires when an athlete completes the final workout of an active program. It marks the natural end of a defined training structure — every scheduled session completed, the full program run.

M-4 is not a summary screen. The program's statistics are already visible on W-17 and will persist permanently on W-3 (Graduated state). M-4 is the ceremony layer: the product's acknowledgment that the athlete started a program and finished it.

**What M-4 is:**
- A centered modal overlay that fires at W-17 load when program graduation is detected for the current live session
- Part of the auto-ceremony queue at Priority 3 (after M-1 and M-3, before M-2)
- A permanent acknowledgment — the program is already in Graduated state before M-4 fires
- A commemorative ceremony, not session-scoped — if the graduation session's W-17 never loads, M-4 is deferred (not dropped) to the next W-17 load

**What M-4 is not:**
- The mechanism that writes the Graduated state (state transition happens at session save; M-4 fires after)
- A decision surface ("Run This Program Again" lives on W-3, not here)
- A summary screen (workout count and dates are context, not a recap interface)
- A gamification trigger (no confetti, no badge, no trophy)
- A ceremony for Ended Early programs (those receive no ceremony)

**Emotional tone:** Quiet completion. Earned permanence. The athlete ran the program they said they would run.

---

## 2. Trigger Sources

M-4 has exactly one trigger source.

| Source | Condition | M-4 Fires When |
|--------|-----------|----------------|
| W-17 load (post-workout) | Final workout of an Active program logged in a live session | Session save completes, program graduation detected, M-4 queued; ceremony consumed at W-17 load |

**Graduation defined:** An athlete's Active program reaches the final scheduled workout and that workout is logged successfully. The program must have been Active (not Ended Early, Future, or already Graduated). This is the natural completion path:

```
Workout logged → session saved → Active → Graduated state written → M-4 queued → W-17 loads → M-4 fires
```

**M-4 does not fire when:**
- The session was offline at save time (program transitions Graduated on sync; no ceremony — see §8.1)
- The program was imported as Graduated (import processing; no ceremony — see §8.8)
- The program was Ended Early (Ended Early programs receive no ceremony; they are not Graduated)
- No active program exists when the session is saved
- A non-final workout is logged (program is still Active)
- The ceremony was already shown for this graduation (exactly one M-4 per graduation, never re-triggered)

---

## 3. Dependencies

### Upstream (required before M-4 can fire)

| Spec | Dependency |
|------|-----------|
| Program-Architecture-Amendment-001-Active-Program-Rule.md §1 | State transition rules: Active → Graduated. Exactly 1 Active program allowed. No other transition produces Graduated. |
| Workout-Summary-Spec-W17.md §11.3 | W-17 graduation display: progress bar full, "✓ Complete" mark. W-17 is the originating surface beneath M-4. |
| Rank-Up-Modal-Spec-M1.md §3 | Ceremony queue architecture: M-4 holds Priority 3. Queue consumed at W-17 load. Deferred delivery model. |
| Honor-Evaluation-Service-Architecture-v1.0.md §3, §8 | ProgramEvaluator runs at session save; program honors bundled into M-2 payload. M-4 does not display or evaluate honors. |

### Downstream (surfaces M-4 affects or follows)

| Spec | Effect |
|------|--------|
| W-17 | Originating surface; remains dimmed and visible beneath M-4; returned to after M-4 when final ceremony |
| W-3 (Graduated state) | Already written before M-4 fires: "Graduated [Month DD, YYYY]", workouts completed, duration. M-4 context rows source from the same data. |
| M-2 Honor Earned | Fires after M-4 when program honors were earned in the same session (Priority 4) |
| L-1 Legacy Timeline | Graduation entry already written before M-4 fires |

### Architecture Audit Issues Resolved

| Issue | Resolution |
|-------|-----------|
| **C-11** — M-4 has no dedicated spec; exists only as inline references across other documents | ✓ Resolved — this document is the authoritative M-4 specification |
| **H-16** — Program state transition timing at graduation undefined | ✓ Resolved — see M4-D1: state transitions Active → Graduated at session save, independent of M-4 |

---

## 4. Anatomy

M-4 is a centered modal overlay. The underlying surface (W-17) is visible and dimmed behind M-4 until dismissed.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    ( ◎✓ )                           │  ← Completion ring, 64dp, centered
│                                                     │
│               5/3/1 Power Program                   │  ← Program Name, large, primary weight, centered
│                                                     │
│      Finished what you started. A permanent         │  ← Ceremony copy, centered, secondary weight
│              mark in your legacy.                   │     (locked, program-agnostic)
│                                                     │
│  ─────────────────────────────────────────────────  │  ← Divider
│                                                     │
│  Started          January 6, 2026                   │  ← Context row 1
│  Graduated        June 15, 2026                     │  ← Context row 2
│  Workouts         48 completed                      │  ← Context row 3
│  Duration         24 weeks                          │  ← Context row 4
│                                                     │
│  ─────────────────────────────────────────────────  │  ← Divider
│                                                     │
│              [    Continue    ]                     │  ← Primary CTA, always present
│                                                     │
└─────────────────────────────────────────────────────┘
```

**When M-4 is the final ceremony in the queue (secondary links visible):**

```
│              [    Continue    ]                     │
│                                                     │
│     View Your Programs    View Your Legacy          │  ← Secondary text links, only when final
│                                                     │
```

### Element Specifications

| Element | Spec |
|---------|------|
| Modal type | Centered overlay; not a bottom sheet; not full-screen |
| Background | Dimmed overlay; W-17 visible and dimmed beneath |
| Completion ring | 64dp; a filled progress ring (all segments complete, referencing the W-17/W-3 progress bar visual) with an inner checkmark; centered; not tappable; no particle effects; aria-hidden — distinct from M-3's solid filled circle |
| Program Name | Large heading, primary weight, centered; wraps up to 2 lines; font scales down for very long program names; not truncated |
| Ceremony copy | Centered, secondary weight; locked and program-agnostic: *"Finished what you started. A permanent mark in your legacy."* |
| Dividers | Horizontal separators between copy and context rows, and between context rows and CTA |
| Context rows | Left-aligned label, right-aligned value; 4 rows |
| Continue | Primary CTA, full-width, always present; always the only button-class element |
| Secondary links | Two text-link style (not buttons): "View Your Programs" and "View Your Legacy"; visible only when M-4 is the final ceremony in queue |

### Context Row Values

| Row | Label | Value | Format | Source |
|-----|-------|-------|--------|--------|
| 1 | Started | Program start date | Month DD, YYYY | Date program transitioned Future → Active |
| 2 | Graduated | Graduation date | Month DD, YYYY | Session save date (same as Graduated state write) |
| 3 | Workouts | Workout count | Integer + "completed" | Total workouts in the program schedule |
| 4 | Duration | Calendar span | "N weeks" or "N months" | Calculated: start date to graduation date |

No completion percentage is displayed. Graduation implies 100%. Workout count communicates quantitative completion with more meaning than a percentage that is always 100. No program description, no workout list, no performance data.

---

## 5. States

### 5.1 Default — M-4 Only in Queue

M-4 is the only ceremony queued. Secondary links are visible beneath "Continue."

```
[ Completion ring ]
[ Program Name ]
[ Ceremony copy ]
──────────────────
[ Context rows ]
──────────────────
[ Continue ]
View Your Programs    View Your Legacy
```

### 5.2 M-4 with More Ceremonies Remaining

M-2 (Honor Earned) is pending after M-4. Secondary links are suppressed.

```
[ Completion ring ]
[ Program Name ]
[ Ceremony copy ]
──────────────────
[ Context rows ]
──────────────────
[ Continue ]
```

"Continue" advances to M-2.

### 5.3 M-4 as Final Ceremony After Prior Ceremonies

M-1 and/or M-3 fired before M-4 in the same queue. M-4 is now the last item. Secondary links are visible.

```
[ Completion ring ]
[ Program Name ]
[ Ceremony copy ]
──────────────────
[ Context rows ]
──────────────────
[ Continue ]
View Your Programs    View Your Legacy
```

"Continue" returns to W-17 (originating surface).

---

## 6. Queue Behavior

### 6.1 Priority Position

M-4 holds Priority 3 in the Forge Legacy auto-ceremony queue:

| Priority | Ceremony | Note |
|----------|----------|------|
| 1 | M-1 Rank Up | Fires first in any session where rank advances |
| 2 | M-3 Goal Achieved | Fires after M-1 |
| **3** | **M-4 Program Graduated** | **This spec — fires after M-3, before M-2** |
| 4 | M-2 Honor Earned | Fires last; after M-4 |

M-5 (Chapter Sealing Confirmation) is user-initiated and operates in its own dedicated flow. It does not enter the auto-ceremony queue and is not affected by this priority table.

### 6.2 Queue Consumption Points

The ceremony queue is consumed at:
- **W-17 load** — the primary and only consumption point for M-4
- **Import completion** — M-4 does not fire for imported graduations
- **G-2 goal achievement** — M-4 does not consume at G-2 (see §8.5 for co-queue edge case)

M-4 is generated at session save and consumed at the W-17 load of the triggering session.

### 6.3 Queue Persistence and Deferred Delivery

M-4 is queued at session save and consumed at W-17 load. If the graduation session's W-17 never loads (app crash, force-quit, or connection failure after session save), M-4 is **deferred** — it remains in the ceremony queue and fires at the next W-17 load in a subsequent live session.

This matches M-1 deferred delivery behavior: significant achievements are never silently dropped. The ceremony fires once and is never lost.

**Deferred delivery note:** When M-4 fires in a deferred session, the originating surface is the new session's W-17. Context rows (Started / Graduated / Workouts / Duration) display data from the graduation event, not the current session. The athlete clearly sees which program the ceremony is for. This mild temporal displacement is the accepted tradeoff — program graduation is commemorative, not session-scoped.

M-4 fires **exactly once** per program graduation. After firing and dismissal, the ceremony is removed from the queue and cannot be re-triggered.

### 6.4 Secondary Link Suppression Rule

Secondary links are visible only when M-4 is the **final item** in the active queue. If M-2 is pending after M-4, M-4 shows only "Continue." Secondary links appear when no ceremonies follow M-4. Consistent with M-1 §7.3 and M-3 §6.3.

### 6.5 Queue Atomicity

Once the ceremony session begins, no ceremony is skipped, flushed, or deferred. The athlete completes the full recognition sequence before returning to the originating surface.

---

## 7. Navigation

### 7.1 Entry

M-4 appears over W-17, which remains the current screen beneath the overlay. W-17 is dimmed but visible.

### 7.2 "Continue" — Queued Ceremonies Remain

"Continue" advances to the next queued ceremony (M-2 if pending). W-17 remains beneath the overlay.

### 7.3 "Continue" — M-4 is Final Ceremony

"Continue" dismisses M-4. The athlete returns to W-17, which is fully interactive. The athlete taps "Done" on W-17 to continue to their home screen.

### 7.4 "View Your Programs" — Secondary Link

Dismisses M-4 and navigates to W-2 (Program Browse). Available only when M-4 is the final ceremony. Ceremony session is complete.

### 7.5 "View Your Legacy" — Secondary Link

Dismisses M-4 and navigates to L-1 (Legacy Hub). Available only when M-4 is the final ceremony. Ceremony session is complete.

### 7.6 No Other Dismissal Paths

Tapping the dimmed background behind M-4 does nothing. Drag gestures do nothing. The Android hardware back button does nothing. M-4 can only be dismissed by tapping "Continue" or a secondary text link.

### 7.7 Navigation Summary

| Action | Queue State | Destination |
|--------|------------|------------|
| "Continue" | More ceremonies pending | Next queued ceremony (M-2) |
| "Continue" | M-4 is final | W-17 (fully interactive) |
| "View Your Programs" | M-4 is final | W-2 Program Browse |
| "View Your Legacy" | M-4 is final | L-1 Legacy Hub |
| Tap dimmed background | Any | No action — M-4 remains open |
| Drag gesture | Any | No action — M-4 remains open |
| Android hardware back | Any | No action — M-4 remains open |

---

## 8. Edge Cases

### 8.1 Offline Session Graduation

If the athlete's final program workout is saved offline, the session save occurs on next sync. The program transitions Active → Graduated at sync time. No M-4 is generated. The program silently enters Graduated state; the athlete discovers it on W-3. Consistent with M-2 offline behavior: offline sessions receive no ceremony.

### 8.2 App Crash After Session Save, W-17 Never Loads

The program is already Graduated (state transition happened at session save). M-4 is queued and deferred — it fires at the next live session's W-17 load. Context rows correctly display the graduation event's data. The ceremony is never lost. See M4-D4.

### 8.3 M-4 + M-2 in Queue (Program Honors Earned)

Program graduation evaluates the ProgramEvaluator family at session save (first_program_graduated, programs_graduated_5, programs_graduated_10, programs_graduated_25). Any earned honors are bundled into the M-2 payload (Honor Evaluation Service Architecture §3, Trigger Mapping row 2). At W-17 load: M-4 fires first (Priority 3); M-2 fires after (Priority 4). M-4 secondary links are suppressed while M-2 remains pending.

### 8.4 M-1 + M-4 in Queue (Rank Advancement Same Session)

A session triggers both a rank-family advancement and a program graduation. Queue: M-1 (Priority 1) → M-4 (Priority 3). If honors also earned: M-1 → M-4 → M-2. Secondary links suppressed on M-1 and M-4 while more ceremonies remain.

### 8.5 M-3 Co-Queued with M-4

M-3 fires at G-2 (goal achievement), not at W-17. M-4 fires at W-17. These are different consumption points. If both are co-pending at the same consumption point (uncommon edge case), queue priority applies: M-3 (Priority 2) fires before M-4 (Priority 3). M-2 fires after both. Per M-3 Edge Case E-6.

### 8.6 Program Graduation + Chapter Primary Goal at 100%

If the final program workout also causes the chapter primary goal to reach 100% via auto-progress, both states appear independently on W-17 (per W-17 §15.2). M-4 fires normally at W-17 load. M-3 does not fire — 100% auto-progress does not trigger M-3; explicit "Mark as Achieved" at G-2 is required. The athlete returns to W-17 after M-4 where both milestones are visible.

### 8.7 Program Graduation and Chapter Sealing

M-4 fires at W-17 (post-workout). M-5 fires at L-3 (user-initiated). These are distinct surfaces and distinct user actions — they cannot occur in the same session flow. A graduated program is an immutable, sealed record; M-5 chapter sealing does not affect it. If a program was Active at chapter seal time, it carries forward to the next chapter per M-5 body copy; graduation in the new chapter triggers a standard M-4 at that session's W-17.

### 8.8 Imported Graduated Programs

Programs imported via the import flow may enter the system in Graduated state as historical data. M-4 never fires for imported programs. Graduation is written silently during import processing. Consistent with the non-ceremony import model from M-2 and M-3.

### 8.9 Ended Early Programs

M-4 never fires for Ended Early programs. Ended Early is not Graduated. There is no ceremony for early program termination in the MVP ceremony library.

### 8.10 Degenerate Programs (Very Short)

M-4 fires normally regardless of program length. A 1-workout program that is graduated receives the same ceremony as a 16-week program. Context rows display the factual data (Workouts: 1 completed; Duration: 1 day). The ceremony copy is program-agnostic and does not reference length.

### 8.11 Ceremony Re-Trigger

Once M-4 fires and is dismissed for a given program graduation, it cannot be re-triggered. The program is in permanent Graduated state. No action produces a second M-4 for the same graduation event.

---

## 9. Accessibility

| Element | Accessibility Behavior |
|---------|----------------------|
| Modal | Announced as modal: "Program Graduated" |
| Completion ring | Decorative; aria-hidden |
| Program Name | Announced as heading |
| Ceremony copy | Read as body text |
| Context rows | Announced as: "[Label], [Value]" for each row |
| Continue | Announced as: "Continue, button" |
| "View Your Programs" | Announced as: "View Your Programs, button" |
| "View Your Legacy" | Announced as: "View Your Legacy, button" |
| Dimmed background | Not focusable; no accessible action (dismissed by "Continue" only) |

**Focus behavior:**
- On open: focus set to modal heading (Program Name)
- Focus is trapped within the modal while open
- On dismiss via "Continue" (final ceremony): focus returns to W-17
- On dismiss via secondary link: focus set to the destination screen's primary element

**Minimum touch targets:**
- "Continue" button: full-width, minimum 48pt height
- Secondary text links: minimum 44pt height; adequate horizontal spacing between the two

---

## 10. Non-Behaviors

M-4 does not and will never:

| Non-Behavior |
|-------------|
| Write the Graduated state — that transition happens at session save; M-4 fires only after the record is complete |
| Fire for Ended Early programs — Ended Early is not Graduated; no ceremony exists for early termination |
| Fire for offline-graduated programs — state transitions at sync; no ceremony |
| Fire for imported graduated programs — import is not a ceremony-generating event |
| Display a "Run This Program Again" CTA — that is a W-3 Graduated state feature (W-3 §7.1) |
| Display a "Find Your Next Program" or discovery prompt — program discovery belongs in W-2 |
| Display program honors earned — honors are bundled into M-2 and displayed there |
| Display a completion percentage — graduation implies 100%; workout count is more meaningful |
| Display gamification language (points, streaks, scores, "Congratulations") |
| Display confetti, particle effects, trophy, star, or badge imagery |
| Display the athlete's account-wide workout count or rank context — that belongs to M-1 |
| Display a chapter name or chapter progress |
| Display sharing UI in MVP |
| Be dismissible by tap-outside, drag gesture, or Android hardware back button |
| Re-trigger after dismissal for the same graduation event |
| Fire mid-session (W-9 through W-16 suppress all non-workout surfaces) |
| Fire as a push notification |
| Fire at app open or home screen load independently of a ceremony queue |

---

## 11. Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| M4-D1 | **State transition timing: Active → Graduated at session save** | Resolves Architecture Audit H-16. Transition is atomic with workout log persistence. If the app crashes after session save but before W-17 loads, the program is already Graduated — the record is preserved. M-4 is the ceremony layer; the Graduated record in W-3 is the permanent record. Consistent with rank advancement (rank changes at session save; M-1 is the UI recognition layer). |
| M4-D2 | **Trigger: live session only** | M-4 requires a live session save detected as a final-workout graduation. Offline sessions, imports, and non-final workouts do not generate M-4. Consistent with M-2's live-session requirement. |
| M4-D3 | **Queue priority: 3** | Program graduation is a significant structural achievement but secondary to identity transitions (rank advancement, M-1 Priority 1) and deliberate declarations (goal achievement, M-3 Priority 2). Honor recognition (M-2) follows all three. |
| M4-D4 | **Deferred delivery: next W-17 load** | If the graduation session's W-17 never loads, M-4 is deferred (not dropped) to the next live session's W-17 load. Matches M-1 deferred delivery behavior. Program graduation is commemorative, not session-scoped. An athlete completing a 16-week program should not lose the ceremony to a crash. |
| M4-D5 | **Ceremony copy locked: "Finished what you started. A permanent mark in your legacy."** | Program-agnostic, consistent with M-1 and M-3 voice. Acknowledges initiation ("started") and completion ("finished") as distinct acts. Connects to the permanence theme used across the ceremony library. No "Congratulations." |
| M4-D6 | **Completion ring visual** | A filled progress ring (all segments complete) with an inner checkmark. Distinct from M-3's solid filled circle. References the W-17 and W-3 progress bar metaphor, grounding the ceremony in the program-completion visual language the athlete already knows. |
| M4-D7 | **Context rows: Started, Graduated, Workouts, Duration** | Four rows give temporal and quantitative context: when the program began, when it ended, how many sessions it comprised, and how long the span was. Sourced from the same data as W-3 Graduated state for consistency between the ceremony and the permanent record. |
| M4-D8 | **No completion percentage** | Graduation implies 100%. Displaying "100%" would be redundant and would reduce the four-row context block to three meaningful rows plus one trivial one. Workout count communicates the effort more meaningfully. |
| M4-D9 | **No "Run This Program Again" in M-4** | M-4 is a ceremony, not a decision surface. "Run This Program Again" is a W-3 Graduated state feature (W-3 §7.1, already locked). Placing it in M-4 would mix ceremony with action and introduce program-selection logic into the ceremony layer. |
| M4-D10 | **Program honors displayed in M-2, not M-4** | Program graduation triggers the ProgramEvaluator family. These honors are bundled into M-2 per Honor Evaluation Service Architecture §3 Trigger Mapping. M-4 and M-2 are separate layers: M-4 recognizes the structural achievement; M-2 recognizes the honors earned. Both fire in the same ceremony session (M-4 → M-2). |
| M4-D11 | **Secondary links: "View Your Programs" → W-2, "View Your Legacy" → L-1** | "View Your Programs" connects the graduation moment to program discovery — the natural next step for a graduated athlete. "View Your Legacy" connects the achievement to the athlete's larger story. Pattern consistent with M-1 ("View Your Rank" + "View Your Legacy") and M-3 ("View Your Goals" + "View Your Legacy"). |
| M4-D12 | **No M-4 for Ended Early** | Ended Early is not graduation. The athlete chose to stop before completion. There is no ceremony for early termination in the MVP ceremony library. |
| M4-D13 | **No M-4 for offline or import** | Offline sessions receive no ceremony (matches M-2). Import flow is not a live session event (matches M-2 and M-3 import behavior). Consistent non-ceremony model across the library. |
| M4-D14 | **Originating surface: W-17** | W-17 is always the screen beneath M-4. After M-4 completes (when final ceremony), the athlete returns to W-17 and taps Done to exit to their home screen. |
| M4-D15 | **C-11 closed** | M-4 existed only as inline references across other specs. This document closes Architecture Audit C-11 for the M-4 entry. |

---

## 12. Validation Checklist

### Trigger and Queue

- [ ] M-4 fires only when the final workout of an Active program is logged in a live session
- [ ] M-4 does not fire for offline-graduated programs
- [ ] M-4 does not fire for imported graduated programs
- [ ] M-4 does not fire for Ended Early programs
- [ ] M-4 does not fire for non-final workouts in a program
- [ ] M-4 queued at session save; consumed at W-17 load
- [ ] M-4 deferred (not dropped) if W-17 never loads — fires at next live W-17 load
- [ ] M-4 fires exactly once per graduation — never re-triggered
- [ ] M-4 holds Priority 3 — fires after M-1 and M-3, before M-2

### State Transition (H-16 Resolution)

- [ ] Program transitions Active → Graduated at session save (not at W-17 load, not at M-4 dismiss)
- [ ] Graduated state written to W-3 before M-4 fires
- [ ] Legacy Timeline graduation entry written before M-4 fires

### Anatomy

- [ ] Completion ring displayed (64dp, filled progress ring with inner checkmark, centered)
- [ ] Completion ring is aria-hidden
- [ ] Program Name displayed large, centered, wrapping correctly for long names
- [ ] Ceremony copy displayed: "Finished what you started. A permanent mark in your legacy."
- [ ] Context row 1: Started [Month DD, YYYY] — program start date
- [ ] Context row 2: Graduated [Month DD, YYYY] — session save date
- [ ] Context row 3: Workouts — integer + "completed"
- [ ] Context row 4: Duration — calendar span in weeks or months
- [ ] No completion percentage displayed
- [ ] No program honors displayed

### Queue and Secondary Links

- [ ] Secondary links suppressed when M-2 remains pending after M-4
- [ ] Secondary links visible when M-4 is the final ceremony
- [ ] "View Your Programs" navigates to W-2
- [ ] "View Your Legacy" navigates to L-1
- [ ] Secondary links are text-link style — no button styling

### Navigation

- [ ] Tap-outside does nothing — modal stays open
- [ ] Drag gesture does nothing — modal stays open
- [ ] Android hardware back button does nothing — modal stays open
- [ ] "Continue" (ceremonies remaining) advances to next queued ceremony (M-2)
- [ ] "Continue" (M-4 final) returns to W-17, fully interactive
- [ ] "View Your Programs" navigates to W-2 and completes ceremony session
- [ ] "View Your Legacy" navigates to L-1 and completes ceremony session
- [ ] No "Run This Program Again" CTA present anywhere in M-4

### Edge Cases

- [ ] M-4 + M-2 co-queued: M-4 fires first, secondary links suppressed, M-2 fires after
- [ ] M-1 + M-4 co-queued: M-1 fires first, then M-4
- [ ] Offline graduation: M-4 never fires; program silently enters Graduated state
- [ ] App crash after save: M-4 deferred to next W-17 load; Graduated record preserved
- [ ] Deferred M-4 context rows reflect graduation event data, not current session data

### Accessibility

- [ ] Modal announced as "Program Graduated"
- [ ] Program Name announced as heading
- [ ] Completion ring is aria-hidden
- [ ] Focus trapped within modal while open
- [ ] Default focus target on open: Program Name (heading)
- [ ] Focus returns to W-17 on dismiss via "Continue" (final ceremony)
- [ ] All interactive elements meet 44–48pt minimum touch target

### Non-Behaviors

- [ ] No completion percentage
- [ ] No "Run This Program Again" CTA
- [ ] No honor display
- [ ] No confetti, particle effects, or gamification imagery
- [ ] No "Congratulations" copy
- [ ] No sharing UI
- [ ] Cannot re-trigger for the same graduation after dismissal

---

## 13. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification — promotes M-4 from inline references to dedicated spec; closes Architecture Audit C-11 (missing M-4 spec) and H-16 (program state transition timing); locks queue position (Priority 3), trigger, anatomy, deferred delivery model (M4-D4), navigation, and decision record |

---

## 14. Closure Record

### Architecture Audit Issues

| Issue | Resolution |
|-------|-----------|
| C-11 — M-4 has no dedicated spec | ✓ Closed — this document |
| H-16 — Program state transition timing undefined | ✓ Closed — M4-D1: transition at session save |

### Ceremony Architecture Status

| Ceremony | Specification | Status |
|----------|--------------|--------|
| M-1 Rank Up | `Docs/Rank-Up-Modal-Spec-M1.md` v1.0 | **LOCKED** |
| M-2 Honor Earned | `Docs/Honor-Earned-Modal-Spec-M2.md` v1.0 | **LOCKED** |
| M-3 Goal Achieved | `Docs/M-3-Goal-Achieved-Spec.md` v1.0 | **LOCKED** |
| **M-4 Program Graduated** | **`Docs/M-4-Program-Graduated-Spec.md` v1.0** | **LOCKED** |
| M-5 Chapter Sealing | `Docs/M-5-Chapter-Sealing-Confirmation-Spec.md` v1.0 | **LOCKED** |

---

*M-4 Program Graduated Modal — Ceremony Specification v1.0*
*Forge Legacy | June 2026*
