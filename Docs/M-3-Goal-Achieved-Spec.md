# M-3 Goal Achieved Modal
## Ceremony Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Goal-Detail-Wireframe-Spec-G2.md v1.0, Goal-Hub-Wireframe-Spec-G1.md v1.1, Rank-Up-Modal-Spec-M1.md, Honor-Evaluation-Service-Architecture-v1.0.md, MVP-Architecture-Audit-v1.0.md, Master PRD §9

---

## 1. Purpose

M-3 is the ceremony that fires when an athlete's primary chapter goal is achieved. It is the only ceremony that celebrates the deliberate declaration and completion of what the athlete set out to do — the announced purpose of their chapter.

M-3 is not a participation marker. It is not earned by simply logging workouts. It is earned when an athlete decides their goal has been met and commits that decision to their permanent record.

**What M-3 is:**
- A centered modal overlay that fires after the goal's Achieved state is successfully persisted to the server
- A ceremony for primary goals only
- A permanent acknowledgment — the goal cannot be un-achieved after M-3 fires
- Part of the auto-ceremony queue (Priority 2)

**What M-3 is not:**
- The mechanism that writes the Achieved state (G-2 owns that write — M-3 appears only after it succeeds)
- A ceremony for secondary goals (secondary achievements are noted, not celebrated at this level)
- A data screen (the goal name carries contextual meaning; M-3 is ceremony, not summary)
- A gamification trigger (no confetti, no trophy, no share prompt)

**Emotional tone:** Earned. Permanent. Reflective.

---

## 2. Trigger Sources

M-3 has exactly one trigger source.

| Source | Action | Prerequisite | M-3 Fires When |
|--------|--------|-------------|----------------|
| G-2 Goal Detail | Athlete taps "Mark as Achieved" → confirms the confirmation prompt | Primary goal in an active chapter | Server has successfully persisted the goal's Achieved state and achievement date |

**The trigger is always explicit and always manual.** The athlete must:
1. Navigate to G-2 for their primary goal
2. Tap "Mark as Achieved"
3. Confirm the confirmation prompt: *"Mark Goal as Achieved? This will be recorded in your legacy."*
4. The server write succeeds

M-3 appears only after that write completes successfully. If the write fails, M-3 never fires. The error surface is the G-2 confirmation prompt — not M-3.

**M-3 does not mark the goal as achieved.** The achievement write — setting goal state to Achieved, recording the achievement date, creating the Legacy Timeline entry, shifting the Home hero — is owned by G-2 and executes before M-3 appears. M-3 is the ceremony that follows a completed write.

**Secondary goals:** No M-3 fires. Secondary goal achievement is silent — the goal card transitions to Achieved state on G-1 with no modal, no Timeline entry, and no Home hero change. (G-1 §8 Decision 4.)

---

## 3. Dependencies

### Upstream (required before M-3 can fire)
| Spec | Dependency |
|------|-----------|
| G-2 §9.2 | Achievement write: goal state → Achieved, achievement date recorded, Legacy Timeline entry created, Home hero queued |
| G-2 §14.3 | Return destination after M-3 dismissal: G-2 in Achieved state |
| G-1 §8, §16.1 | Primary goal only scope; M-3 fires as part of the primary goal completion sequence |
| M-1 §3 | Ceremony queue architecture; M-3 is Priority 2; queue consumed at G-2 goal achievement moment |

### Downstream (surfaces M-3 affects)
| Spec | Effect |
|------|--------|
| G-2 | Returns to Achieved state after M-3 dismissal |
| G-1 | Primary goal card shows Achieved state on return from G-2 |
| H-1 | Home hero has already shifted to Priority 1 ("Goal Achieved") state before M-3 fires |
| L-1 | Legacy Timeline entry "Goal Achieved: [Goal Name] | [Date]" already created before M-3 fires |

### Architecture Audit Resolution
**H-08 — Simultaneous M-3 + M-5 scenario:** Closed. M-3 fires at G-2 (athlete manually marks goal achieved). M-5 fires at L-3 (athlete manually initiates chapter sealing). These are separate user actions at distinct points in separate navigation flows. No simultaneous collision is possible. No architectural gap exists.

---

## 4. Anatomy

M-3 is a centered modal overlay. It appears over the originating surface (G-2), which remains visible and dimmed behind it.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                      ( ✓ )                          │  ← Achievement mark, 64dp, primary color, centered
│                                                     │
│          Deadlift 315 lbs                           │  ← Goal Name, large, primary weight, centered
│               Road to 405                           │  ← Chapter Name, secondary weight, smaller, centered
│                                                     │
│     Set, chased, earned. A permanent mark           │  ← Ceremony copy, centered, secondary weight
│               in your legacy.                       │     (locked, goal-agnostic)
│                                                     │
│  ─────────────────────────────────────────────────  │  ← Divider
│                                                     │
│  Chapter          Road to 405                       │  ← Context row 1
│  Goal Set         March 12, 2026                    │  ← Context row 2
│  Achieved         June 15, 2026                     │  ← Context row 3
│                                                     │
│  ─────────────────────────────────────────────────  │  ← Divider
│                                                     │
│              [    Continue    ]                     │  ← Primary CTA, always present
│                                                     │
└─────────────────────────────────────────────────────┘
```

**When M-3 is the final ceremony in the queue (secondary links visible):**

```
│              [    Continue    ]                     │
│                                                     │
│       View Your Goals    View Your Legacy           │  ← Secondary text links, only when final
│                                                     │
```

### Element Specifications

| Element | Spec |
|---------|------|
| Modal type | Centered overlay; not a bottom sheet; not full-screen |
| Background | Dimmed overlay; originating surface (G-2) visible beneath |
| Achievement mark | Filled circle with checkmark; 64dp; primary color; centered; not tappable; not animating with particles or effects |
| Goal Name | Large heading, primary weight, centered; wraps up to 2 lines; font scales down for very long goal names; not truncated |
| Chapter Name | Secondary weight, smaller than goal name, centered, below goal name |
| Ceremony copy | Centered, secondary weight; locked and goal-agnostic: *"Set, chased, earned. A permanent mark in your legacy."* |
| Dividers | Horizontal separators between copy and context rows, and between context rows and CTA |
| Context rows | Left-aligned label, right-aligned value; 3 rows: Chapter, Goal Set, Achieved |
| Continue | Primary CTA, full-width, always present |
| Secondary links | Two text-link style: "View Your Goals" and "View Your Legacy"; visible only when M-3 is the final ceremony |

### Context Row Values

| Row | Label | Value | Format |
|-----|-------|-------|--------|
| 1 | Chapter | Chapter Name | Plain text |
| 2 | Goal Set | Goal creation date | Month DD, YYYY |
| 3 | Achieved | Today (system date at confirmation) | Month DD, YYYY |

No target value, progress percentage, or unit is displayed in M-3. The goal name carries that context. M-3 is ceremony, not a recap screen.

---

## 5. States

### 5.1 Default — M-3 Only in Queue

M-3 is the only ceremony queued. The secondary links are visible beneath "Continue."

```
[ Achievement mark ]
[ Goal Name ]
[ Chapter Name ]
[ Ceremony copy ]
──────────────────
[ Context rows ]
──────────────────
[ Continue ]
View Your Goals    View Your Legacy
```

### 5.2 M-3 with More Ceremonies Remaining

Additional ceremonies remain (M-4 or M-2 pending). Secondary links are suppressed.

```
[ Achievement mark ]
[ Goal Name ]
[ Chapter Name ]
[ Ceremony copy ]
──────────────────
[ Context rows ]
──────────────────
[ Continue ]
```

"Continue" advances to the next queued ceremony (M-4 or M-2 per priority).

### 5.3 M-3 as Final Ceremony After Prior Ceremonies

M-1 fired before M-3 (same session). M-3 is now the last item in queue. Secondary links are visible.

```
[ Achievement mark ]
[ Goal Name ]
[ Chapter Name ]
[ Ceremony copy ]
──────────────────
[ Context rows ]
──────────────────
[ Continue ]
View Your Goals    View Your Legacy
```

"Continue" returns to G-2 (Achieved state).

---

## 6. Queue Behavior

### 6.1 Priority Position

M-3 holds Priority 2 in the Forge Legacy auto-ceremony queue:

| Priority | Ceremony | Note |
|----------|---------|------|
| 1 | M-1 Rank Up | Fires first in any session where rank advances |
| **2** | **M-3 Goal Achieved** | **This spec** |
| 3 | M-4 Program Graduation | After M-3 |
| 4 | M-2 Honor Earned | After M-4 |

M-5 (Chapter Sealing Confirmation) is user-initiated and operates in its own dedicated flow. It does not enter the auto-ceremony queue and is not affected by this priority table.

### 6.2 Queue Consumption Points

The ceremony queue is consumed at:
- **W-17 load** (primary — post-workout ceremony session)
- **Import completion** (when import-triggered ceremonies are generated)
- **G-2 goal achievement** (when the athlete marks a primary goal achieved)

M-3 itself is generated and consumed at the G-2 goal achievement point. If a pending M-1 exists from a prior session (not yet consumed), it will fire before M-3 at the G-2 consumption point.

### 6.3 Secondary Link Suppression Rule

Secondary links on any ceremony are visible only when that ceremony is the **final item** in the active queue. If M-3 has M-4 or M-2 pending after it, M-3 shows only "Continue." Secondary links appear when M-3 is the last ceremony the athlete will see before returning to the originating surface.

### 6.4 Queue Atomicity

Once the ceremony session begins, no ceremony is skipped, flushed, or deferred. The athlete completes the full recognition sequence before returning to the originating surface.

---

## 7. Navigation

### 7.1 Entry

M-3 appears over G-2, which remains the current screen beneath the overlay. G-2 is dimmed but visible.

### 7.2 "Continue" — Queued Ceremonies Remain

"Continue" advances to the next queued ceremony (M-4 if pending, otherwise M-2 if pending). The originating surface (G-2 Achieved) remains beneath the overlay.

### 7.3 "Continue" — M-3 is Final Ceremony

"Continue" dismisses M-3. The athlete returns to G-2 in Achieved state. The back arrow from G-2 returns to G-1, where the primary goal card shows the Achieved state.

### 7.4 "View Your Goals" — Secondary Link

Dismisses M-3 and navigates to G-1 Goal Hub. Available only when M-3 is the final ceremony. Ceremony session is complete.

### 7.5 "View Your Legacy" — Secondary Link

Dismisses M-3 and navigates to L-1 Legacy Hub. Available only when M-3 is the final ceremony. Ceremony session is complete.

### 7.6 No Other Dismissal Paths

Tapping the dimmed background behind M-3 does nothing. Drag gestures do nothing. The Android hardware back button does nothing. M-3 can only be dismissed by tapping "Continue" or a secondary text link.

### 7.7 Navigation Summary

| Action | Queue State | Destination |
|--------|------------|------------|
| "Continue" | More ceremonies pending | Next queued ceremony |
| "Continue" | M-3 is final | G-2 (Achieved state) |
| "View Your Goals" | M-3 is final | G-1 Goal Hub |
| "View Your Legacy" | M-3 is final | L-1 Legacy Hub |
| Tap dimmed background | Any | No action — M-3 remains open |
| Drag gesture | Any | No action — M-3 remains open |
| Hardware back button | Any | No action — M-3 remains open |

---

## 8. Edge Cases

### 8.1 Offline

"Mark as Achieved" requires a network connection. If the athlete attempts to confirm achievement offline, an inline error fires on the G-2 confirmation prompt: *"You need a connection to record this achievement."* The confirmation prompt remains open. M-3 never fires. No partial state is written.

### 8.2 Server Write Failure

If the server write fails after the athlete taps confirm, an inline error fires on the G-2 confirmation prompt. M-3 never fires. Goal state is unchanged. The athlete may retry.

### 8.3 Auto-Progress Reaching 100%

Quantitative goal progress reaching 100% via automatic system update (from workout log data) does **not** fire M-3. The goal transitions to a "ready to be marked achieved" display state on G-2, but achievement is not recorded and M-3 does not fire until the athlete explicitly taps "Mark as Achieved." The athlete decides when the goal is done — the system does not decide for them.

### 8.4 Import-Completed Goals

If an athlete imports workout history and the import causes one or more goals to be retroactively achieved (edge case), M-3 does **not** fire. Goal state updates silently. No ceremony. No Legacy Timeline entry from import. This is consistent with the import model established in M-2 (honors from import are delivered silently).

### 8.5 Pending M-1 at Goal Achievement Moment

If the athlete has a pending M-1 (rank advancement that occurred in a prior session and was not consumed at W-17 load), it will fire when the ceremony queue is consumed at G-2. The sequence is: M-1 fires first → athlete dismisses with "Continue" → M-3 fires → athlete dismisses with "Continue" or secondary links → returns to G-2 Achieved. M-3 secondary links are suppressed while M-1 precedes it, and appear when M-3 becomes the final ceremony.

### 8.6 M-3 and M-4 or M-2 Co-Queued

M-4 (Program Graduation) fires at W-17 load, not at G-2. It would only be co-queued with M-3 if both were pending simultaneously — an uncommon edge case. If co-queued, queue priority applies: M-3 fires before M-4. M-2 fires after both. Secondary links on M-3 are suppressed while M-4 or M-2 remain pending.

### 8.7 One Primary Goal Per Chapter

Each chapter has one primary goal. There is no multi-M-3 scenario in a normal active chapter session. One goal, one ceremony.

### 8.8 Goal Achievement with Honors Earned

Goal completion evaluates goal-related honors (`first_goal_achieved`, `goals_achieved_10`, `goals_achieved_25`, `goals_achieved_50`) on the server as a side effect of the achievement write. These honors are delivered silently to L-10. M-2 does **not** fire for goal completion honors. The athlete discovers them on L-10 (Honors screen). M-3 has no awareness of honor outcomes and does not display them.

### 8.9 Ceremony Re-Trigger

Once M-3 fires and is dismissed for a given goal, it cannot be re-triggered. The goal is in permanent Achieved state. No action restores the "Mark as Achieved" CTA. M-3 does not fire again.

---

## 9. Accessibility

| Element | Accessibility Behavior |
|---------|----------------------|
| Modal | Announced as modal: "Goal Achieved" |
| Achievement mark | Decorative; hidden from screen reader (aria-hidden) |
| Goal Name | Announced as heading |
| Chapter Name | Announced immediately after goal name heading |
| Ceremony copy | Read as body text |
| Context rows | Announced as: "[Label], [Value]" for each row |
| Continue | Announced as: "Continue, button" |
| "View Your Goals" | Announced as: "View Your Goals, button" |
| "View Your Legacy" | Announced as: "View Your Legacy, button" |
| Dimmed background | Not focusable; no accessible action (dismissed by "Continue" only) |

**Focus behavior:**
- On open: focus set to modal heading (Goal Name)
- Focus is trapped within the modal while open
- On dismiss via "Continue": focus returns to G-2 (Achieved state content)
- On dismiss via secondary link: focus set to the destination screen's primary element

**Minimum touch targets:**
- "Continue" button: full-width, minimum 48pt height
- Secondary text links: minimum 44pt height, adequate horizontal spacing between the two

---

## 10. Non-Behaviors

M-3 does not and will never:

| Non-Behavior |
|-------------|
| Mark the goal as achieved — that write is owned by G-2; M-3 fires only after successful persistence |
| Fire for secondary goals — secondary achievement is silent |
| Fire at 100% auto-progress — explicit "Mark as Achieved" is required |
| Fire for import-completed goals |
| Fire mid-session (W-9 through W-16 suppress all non-workout surfaces) |
| Fire offline |
| Fire if the G-2 achievement write fails |
| Display confetti, particle effects, or celebratory animation |
| Use the word "Congratulations" |
| Show a trophy, star, or gamification badge |
| Display goal progress percentage or unit data |
| Display the athlete's total workout count, days forging, or account age (that context belongs to M-1) |
| Show what honors were earned as a result of goal achievement |
| Fire M-2 for goal completion honors |
| Show a share or export CTA |
| Show a "next goal" prompt or tease |
| Show the goal's supporting workouts or program history |
| Display other athletes' reactions or acknowledgment |
| Be dismissible by tap-outside, drag gesture, or hardware back button |
| Re-fire after dismissal for the same goal |
| Fire for the same goal twice |
| Navigate away from G-2 on "Continue" unless it is the final ceremony (secondary links handle optional deeper navigation) |
| Appear during an active workout (W-9–W-16 suppress all non-workout surfaces) |

---

## 11. Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| M3-D1 | **Scope: primary goals only** | Secondary goals have no ceremony (G-1 §8 Decision 4). The product distinguishes primary achievement (declaration fulfilled) from supporting progress (incremental). |
| M3-D2 | **Trigger: explicit "Mark as Achieved" at G-2** | Goal completion is a deliberate athlete decision. Auto-completion or system detection would undercut the intentionality that makes the ceremony meaningful. |
| M3-D3 | **Auto-100% progress does not fire M-3** | Progress reaching a target is a system observation; achievement is an athlete declaration. These are different events. The athlete may reach 100% and choose to continue before marking achieved. |
| M3-D4 | **M-3 fires only after successful server persistence** | The achievement write (goal state, date, Timeline entry) must succeed before the ceremony fires. M-3 celebrates a completed record, not an in-flight transaction. Write failure surfaces as an error on the G-2 confirmation prompt. |
| M3-D5 | **Offline: blocked** | The achievement write requires connectivity (records date to the legacy, which cannot be retroactively adjusted). Consistent with M-5 (chapter sealing also blocked offline). |
| M3-D6 | **Queue priority: 2** | Goal achievement is an identity transformation second only to rank advancement. It precedes program graduation (M-4) and honor recognition (M-2). |
| M3-D7 | **Secondary links queue-conditional** | Secondary links appear only when M-3 is the final ceremony. While more ceremonies remain, only "Continue" is shown. Consistent with M-1 pattern. |
| M3-D8 | **Continue returns to G-2 Achieved state** | The athlete arrived from G-2. Returning there preserves navigation context and allows them to review the Achieved state before going to G-1 or elsewhere. (G-2 §14.3.) |
| M3-D9 | **Secondary links: "View Your Goals" → G-1, "View Your Legacy" → L-1** | These offer meaningful onward navigation from the achievement moment without being redundant with the "Continue" destination (G-2). "View Your Goals" gives overview context; "View Your Legacy" connects the achievement to the larger story. |
| M3-D10 | **Import: no M-3** | Import-completed goals are historical records, not live achievement moments. Consistent with import non-ceremony behavior established in M-2. |
| M3-D11 | **Goal completion honors delivered silently to L-10; no M-2** | Honor Evaluation Service Architecture §4.4 explicitly specifies this. Goal completion is not a session save event, so M-2 does not fire. The athlete discovers goal honors at L-10. |
| M3-D12 | **H-08 closed: M-3 and M-5 are not simultaneous** | M-3 fires at G-2 (manual goal achievement). M-5 fires at L-3 (manual chapter sealing). These are separate user actions at separate navigation points. No collision exists. |
| M3-D13 | **Ceremony copy locked: "Set, chased, earned. A permanent mark in your legacy."** | Goal-agnostic, consistent with M-1 and M-2 voice. Acknowledges the journey arc (set → chased → earned) and connects to permanence theme. No "Congratulations." |
| M3-D14 | **Context rows: Chapter, Goal Set, Achieved** | Three rows give the achievement temporal context — when the goal was declared and when it was completed. The duration between them is implicit and meaningful. |

---

## 12. Validation Checklist

### Trigger and Scope
- [ ] M-3 fires only for primary goals
- [ ] M-3 does not fire for secondary goals
- [ ] M-3 fires only after explicit "Mark as Achieved" + confirmation at G-2
- [ ] M-3 fires only after successful server persistence (goal state + date + Timeline entry written)
- [ ] M-3 does not fire at 100% auto-progress
- [ ] M-3 does not fire for import-completed goals
- [ ] M-3 does not fire offline (inline error on G-2 confirmation prompt instead)
- [ ] M-3 does not fire if server write fails (inline error on G-2 confirmation prompt instead)

### Anatomy
- [ ] Achievement mark displayed (filled circle + checkmark, 64dp, primary color, centered)
- [ ] Goal Name displayed large, centered, wrapping correctly for long names
- [ ] Chapter Name displayed below goal name, secondary weight
- [ ] Ceremony copy displayed: "Set, chased, earned. A permanent mark in your legacy."
- [ ] Context rows displayed: Chapter / Goal Set / Achieved
- [ ] Achievement date in context rows = system date at confirmation moment

### Queue Behavior
- [ ] M-3 fires after M-1 and before M-4 and M-2 when co-queued
- [ ] Secondary links suppressed when M-4 or M-2 remain pending
- [ ] Secondary links visible when M-3 is final ceremony
- [ ] Pending M-1 from prior session fires before M-3 at G-2 consumption point

### Navigation
- [ ] Tap-outside does nothing — modal stays open
- [ ] Drag gesture does nothing — modal stays open
- [ ] Hardware back button does nothing — modal stays open
- [ ] "Continue" (final ceremony) returns to G-2 Achieved state
- [ ] "Continue" (ceremonies remaining) advances to next queued ceremony
- [ ] "View Your Goals" (secondary link) navigates to G-1
- [ ] "View Your Legacy" (secondary link) navigates to L-1

### Honor and Side Effects
- [ ] Goal completion honors evaluated silently; delivered to L-10
- [ ] M-2 does not fire for goal completion honors
- [ ] M-3 displays no honor information
- [ ] Legacy Timeline entry already created before M-3 fires
- [ ] Home hero already shifted before M-3 fires

### Non-Behaviors
- [ ] No confetti, particle effects, or trophy imagery
- [ ] No "Congratulations" copy
- [ ] No share or export CTA
- [ ] No progress data displayed (no percentage, units, or target value in modal)
- [ ] Cannot re-trigger for same goal after dismissal

### Accessibility
- [ ] Modal announced as "Goal Achieved"
- [ ] Focus trapped within modal while open
- [ ] Focus returns to G-2 on dismiss via "Continue"
- [ ] Achievement mark is aria-hidden
- [ ] All interactive elements meet 44–48pt minimum touch target

---

## 13. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification — establishes M-3 Goal Achieved ceremony; closes Architecture Audit H-08; locks queue position (Priority 2), trigger source, anatomy, navigation, and decision record |

---

*M-3 Goal Achieved Modal — Ceremony Specification v1.0*
*Forge Legacy | June 2026*
