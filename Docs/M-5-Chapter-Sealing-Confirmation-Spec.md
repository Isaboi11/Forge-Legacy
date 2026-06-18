# M-5 Chapter Sealing Confirmation
## Modal Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Chapter-Detail-Wireframe-Spec-L3-L4.md §14.1, Chapter-Reflection-Wireframe-Spec-L6.md, Honor-Evaluation-Service-Architecture-v1.0.md §8.3, Critical-Decisions-Amendment-001.md Decision 2, Featured-Legacy-Moment-Standards.md, Amendments/FLM-Sealed-Chapter-Amendment-001.md, Rank-Up-Modal-Spec-M1.md, Master PRD §10

---

## 1. Purpose

M-5 is the chapter sealing confirmation modal. It is the gate between an athlete's active chapter and the permanent archive of that chapter. Every chapter sealing passes through M-5.

M-5 is a single-stage confirmation modal. The athlete has tapped "Seal This Chapter" on L-3. M-5 surfaces the consequences and asks for deliberate intent. The athlete may confirm or cancel.

On confirmation, the sealing transaction executes synchronously: the chapter is sealed, honor evaluation runs, HonorInstances are persisted to L-10, the FLM is created, and rank evaluation runs. If rank-up occurred, M-1 is queued but not displayed — it fires after the athlete exits L-6, before L-1 opens. M-5 then dismisses and L-6 opens.

**What sealing does:**
- Locks chapter outcomes permanently (goals, honors, progress)
- Creates the Chapter Sealed timeline event and FLM (Tier 1, Priority 1, State A)
- Fires honor evaluation for ChapterCount and Longevity evaluator families; honors deposited to L-10
- Fires rank evaluation; if rank-up occurs, M-1 is queued and fires after L-6 exits
- Passes the athlete to L-6 Chapter Reflection

**What sealing does not do:**
- Affect Active program state (programs remain Active; Critical Decisions Amendment 001 Decision 2)
- Block because a goal is unachieved (no barrier; L-4 shows "— Not Achieved")
- Require any activity minimum (empty chapter is sealable)
- Display chapter-seal honors within M-5 (honors are persisted and discovered in L-10)
- Fire M-1 between M-5 and L-6 (M-1 is queued at sealing; fires after L-6 exits)

**Emotional tone:** Grave. Intentional. Worthy of a moment. Not ominous.

---

## 2. Entry Points

| Source | Trigger | Data Required | Return on Cancel |
|--------|---------|--------------|-----------------|
| L-3 Chapter Detail (Active) | "Seal This Chapter" Ceremonial CTA | Chapter ID, Chapter Name | L-3 — unchanged |

M-5 has exactly one entry point. It cannot be reached from any other surface. It cannot be triggered mid-workout (W-9 through W-16 suppress all non-workout surfaces).

---

## 3. Dependencies

| Dependency | File | Constraint |
|-----------|------|-----------|
| L-3 Seal CTA | Chapter-Detail-Wireframe-Spec-L3-L4.md §14.1 | Headline, body copy baseline, and CTA labels established in L-3 |
| L-6 Chapter Reflection | Chapter-Reflection-Wireframe-Spec-L6.md | M-5 dismisses → L-6 opens; L-6 is locked |
| Honor Evaluation Service | Honor-Evaluation-Service-Architecture-v1.0.md §8.3 | Chapter-seal honors evaluated at sealing; route to L-10, not M-2 |
| Critical Decisions Amendment 001 | Amendments/Critical-Decisions-Amendment-001.md Decision 2 | Program state unaffected by sealing |
| FLM Standards | Featured-Legacy-Moment-Standards.md | Chapter Sealed = Tier 1, Priority 1 FLM; created at sealing |
| FLM/Sealed Chapter Amendment 001 | Amendments/FLM-Sealed-Chapter-Amendment-001.md | State A/B display rules on L-1 |
| M-2 Honor Earned | Honor-Earned-Modal-Spec-M2.md §10 E-5 | M-2 explicitly excluded for chapter-seal honors |
| M-1 Rank Up | Rank-Up-Modal-Spec-M1.md | M-1 queued during sealing transaction if rank-up occurs; fires after L-6 exits, before L-1 |

---

## 4. Presentation Style

**Container:** Centered modal overlay.

- Centered on screen; not a bottom sheet
- Dimmed overlay behind modal; L-3 visible but dimmed beneath
- Not draggable; content fits within modal without scrolling
- Modal cannot be dismissed by tap-outside, drag gesture, or hardware back
- Only the explicit CTAs ("Seal This Chapter" and "Not yet") dismiss M-5

Consistent with the M-1/M-2 modal family and with the gravity of a permanent, irreversible action.

---

## 5. Anatomy

```
┌───────────────────────────────────────────────────┐
│                                                   │
│  Seal [Chapter Name]?                             │  ← Headline, primary weight, centered
│                                                   │
│  Your goals, honors, and progress will be         │
│  permanently locked. Active programs carry        │
│  forward into your next chapter—their             │
│  progress at this moment is preserved in          │
│  this chapter's record.                           │
│                                                   │  ← Body copy, secondary weight, centered
│  ┌─────────────────────────────────────────┐      │
│  │         Seal This Chapter               │      │  ← Ceremonial CTA, primary button
│  └─────────────────────────────────────────┘      │
│                                                   │
│               Not yet                             │  ← Cancel, text-link style
│                                                   │
└───────────────────────────────────────────────────┘
```

### 5.1 Element Specifications

| Element | Specification |
|---------|--------------|
| Headline | "Seal [Chapter Name]?" — primary weight, centered. Chapter name interpolated from current chapter record. |
| Body copy | "Your goals, honors, and progress will be permanently locked. Active programs carry forward into your next chapter—their progress at this moment is preserved in this chapter's record." |
| Primary CTA | "Seal This Chapter" — Ceremonial CTA style (consistent with L-3 CTA class designation); full-width within modal |
| Cancel | "Not yet" — text-link style (not a button); centered below primary CTA |
| No other elements | No progress bars, no icon or badge, no gamification language, no honor preview |

### 5.2 CTA Behavior

| CTA | Action |
|-----|--------|
| "Seal This Chapter" | Initiates sealing transaction (see §7). If offline: blocked (see §9). If online: CTA shows inline spinner; transaction executes; M-5 dismisses on success; L-6 opens. |
| "Not yet" | M-5 dismisses. L-3 is revealed unchanged. No data written. |

### 5.3 Dismiss Rules

| Trigger | Result |
|---------|--------|
| "Not yet" tap | M-5 dismisses → L-3 unchanged |
| "Seal This Chapter" → transaction success | M-5 dismisses → L-6 opens |
| Tap outside modal | No action — M-5 remains open |
| Drag gesture | No action — M-5 remains open |
| Hardware back (Android) | No action — M-5 remains open |

---

## 6. In-Flight Loading State

When the athlete taps "Seal This Chapter" and the transaction is in-flight:

- "Seal This Chapter" shows an inline spinner; not re-tappable
- "Not yet" becomes inactive during transaction
- No other UI changes
- On success: M-5 dismisses → L-6 opens
- On failure: inline error; see §10

---

## 7. Sealing Transaction

Executes synchronously on "Seal This Chapter" tap. Requires network connectivity.

### 7.1 Operation Sequence

```
1. Persist chapter seal event (chapter status → Sealed; seal timestamp recorded)
2. Derive "In Progress When Sealed" snapshot
   (Active programs at seal timestamp captured for L-4 historical display)
3. Fire honor evaluation: ChapterCount + Longevity evaluator families
4. Create HonorInstances for qualifying honors; persist to L-10
5. Create Chapter Sealed timeline event
6. Create/update FLM (Chapter Sealed → Tier 1, Priority 1, State A)
7. Run rank evaluation; if rank-up: record to account state; queue M-1
8. M-5 dismisses → L-6 opens
```

### 7.2 What Is Permanently Locked

| Data | State After Sealing |
|------|-------------------|
| Primary goal | Locked as Achieved or Not Achieved |
| Secondary goals | Locked at final completion state |
| Honors earned during chapter | Locked |
| Workout count | Locked |
| Chapter start/end dates | Locked |
| Photos added during chapter | Locked |
| Chapter notes (pre-sealing) | Locked as of seal timestamp |

### 7.3 What Is Not Affected by Sealing

| Data | State After Sealing |
|------|-------------------|
| Active programs | Remain Active; no state change |
| Program workout history | Unaffected; program continues into next chapter |
| Photos | Can still be added post-seal via L-4 (per L-3/L-4 §14.1 supporting note) |
| L-10 honor records | Additive-only post-seal; existing honors unaffected |

### 7.4 "In Progress When Sealed" — Display Only

The "In Progress When Sealed" label is a **display construct** used in L-4 (Archived Chapter Detail), not a program state. It indicates that a program had Active status at the moment of sealing. The program itself remains Active and continues. The progress count shown in L-4 is a historical snapshot frozen at the seal timestamp.

This is consistent with Critical Decisions Amendment 001 Decision 2 and the L-4 program section.

### 7.5 Chapter-Seal Honors

Honor evaluation fires as part of the sealing transaction. ChapterCount and Longevity evaluator families run. Any qualifying honors are persisted as HonorInstances and become available in L-10 on the athlete's next visit.

No honor ceremony appears within M-5 or between M-5 and L-6. No M-2 modal fires for these honors. The HES §8.3 routing ("chapter-seal honors route to M-5/L-6 sealing flow, not M-2") means evaluation occurs during the sealing transaction — it is not an instruction to display honors within M-5.

### 7.6 Rank Evaluation

Rank evaluation runs as part of the sealing transaction. If the athlete's Legacy Score crosses a rank-family threshold, the new rank is recorded immediately and M-1 is queued.

M-1 does not fire between M-5 and L-6. The queued M-1 fires after the athlete exits L-6, before L-1 opens. This preserves both M-1's "never skip" requirement (M-1 §2) and Forge Legacy's "Story Before Data" principle — the athlete completes reflection before the rank ceremony.

If no rank-up occurred, L-6 exits directly to L-1.

---

## 8. Navigation

| From | Via | To |
|------|-----|----|
| L-3 "Seal This Chapter" Ceremonial CTA | Tap | M-5 |
| M-5 | "Not yet" | L-3 (restored, unchanged) |
| M-5 | "Seal This Chapter" → transaction success | L-6 Chapter Reflection |
| L-6 | Exit (any path) — rank-up was queued | M-1 Rank Up Modal |
| L-6 | Exit (any path) — no rank-up queued | L-1 |
| M-1 (post-L-6) | "Continue" | L-1 (Chapter Sealed FLM featured; identity strip shows new rank) |

M-5 navigates to exactly two destinations: L-3 on cancel, L-6 on confirm. The conditional M-1 between L-6 and L-1 is governed by the M-1 spec and the sealing queue state established in §7.6.

---

## 9. Offline Behavior

Sealing requires a network connection. The sealing transaction writes an irreversible state change to the chapter record; offline writes are not permitted.

If the athlete taps "Seal This Chapter" while offline:

```
┌───────────────────────────────────────────────────┐
│                                                   │
│  Seal [Chapter Name]?                             │
│                                                   │
│  Your goals, honors, and progress will be         │
│  permanently locked. Active programs carry        │
│  forward into your next chapter—their             │
│  progress at this moment is preserved in          │
│  this chapter's record.                           │
│                                                   │
│  You need a connection to seal your chapter.      │  ← Inline error, below body copy
│                                                   │
│  ┌─────────────────────────────────────────┐      │
│  │         Seal This Chapter               │      │  ← Inactive (muted) while offline
│  └─────────────────────────────────────────┘      │
│                                                   │
│               Not yet                             │  ← Remains active
│                                                   │
└───────────────────────────────────────────────────┘
```

- Error message appears below body copy: "You need a connection to seal your chapter."
- "Seal This Chapter" is inactive (muted, not tappable) while offline
- "Not yet" remains active; dismisses M-5 normally
- Error resolves automatically when connectivity is restored; "Seal This Chapter" re-activates without requiring re-entry

---

## 10. Edge Cases

| Scenario | Behavior |
|----------|---------|
| Chapter has no primary goal | Sealable without barrier. L-4 outcomes section reflects no goal. |
| Primary goal is unachieved | No barrier; no additional confirmation. L-4 shows goal as "— Not Achieved." Modal body does not reference goal state. |
| Chapter has zero workouts | Sealable without barrier. No minimum activity requirement. |
| Chapter name is very long | Headline truncates with ellipsis: "Seal [Long Chapter Na…]?" |
| Sealing transaction fails (server error) | Inline error appears: "Something went wrong. Try again." "Seal This Chapter" re-activates. Chapter is NOT sealed. |
| Multiple chapter-seal honors earned | All persisted as HonorInstances; all discoverable in L-10. No change to M-5 UI. |
| Rank-up at sealing | Recorded in transaction; M-1 queued. No change to M-5 UI. M-1 fires after L-6 exits, before L-1. |
| Rank-up AND chapter-seal honors at sealing | Both handled in the transaction. No change to M-5 UI. M-1 fires after L-6 exits; chapter-seal honors in L-10. |
| Athlete re-opens L-3 for a sealed chapter | L-3 renders as L-4 (Archived Chapter); "Seal This Chapter" CTA is absent. |
| Transaction failure mid-flight | Modal remains open at error state; athlete may retry or cancel via "Not yet." |

---

## 11. Accessibility

| Element | Accessibility Behavior |
|---------|----------------------|
| Modal | Announced as: "Seal chapter, confirmation" |
| Headline | Announced at heading level |
| Body copy | Announced as static text |
| "Seal This Chapter" CTA | Announced as: "Seal This Chapter, button" |
| "Not yet" | Announced as: "Not yet, button" |
| Offline error | Announced inline when it appears |
| In-flight spinner | CTA announced as: "Sealing, loading" |
| Default focus | "Seal This Chapter" CTA (deliberate: not pre-focused on cancel) |
| Focus trap | Yes, while modal is open |
| Focus return on "Not yet" | Returns to L-3 "Seal This Chapter" Ceremonial CTA |
| Focus return on confirm | Handled by L-6 spec on L-6 open |
| Minimum touch targets | 44×44pt for all interactive elements |

---

## 12. Non-Behaviors

M-5 does not and will never:

| Non-Behavior |
|-------------|
| Display a post-seal honor ceremony or Stage B state |
| Show chapter-seal honors earned during the sealing transaction |
| Fire M-2 for chapter-seal honors |
| Fire M-1 between M-5 and L-6 |
| Show a rank-up acknowledgment within M-5 |
| Warn about or block on an unachieved primary goal |
| End, pause, suspend, or modify Active programs |
| Show program names or progress detail in modal body |
| Allow tap-outside, drag, or hardware-back dismissal |
| Appear in the auto-ceremony queue (user-initiated, not system-triggered) |
| Re-trigger for the same chapter after dismissal |
| Navigate anywhere except L-3 (cancel) or L-6 (confirm) |
| Create a new chapter (that is L-5) |
| Show the FLM, Legacy Score, or rank detail |
| Show a share CTA |
| Show a progress bar toward the next honor or rank |
| Show chapter statistics (workout count, duration, etc.) |
| Allow sealing without network connectivity |
| Allow undoing or reversing a chapter seal |
| Show the chapter reflection field (that is L-6) |
| Surface any honor or rank event within the modal |
| Appear during an active workout (W-9 through W-16 suppress all non-workout surfaces) |

---

## 13. Validation Checklist

**Presentation**
- [ ] M-5 opens as centered modal overlay over L-3
- [ ] L-3 visible and dimmed beneath
- [ ] Tap-outside: modal remains open
- [ ] Drag gesture: modal remains open
- [ ] Hardware back: modal remains open

**Confirmation**
- [ ] Headline: "Seal [Chapter Name]?" with chapter name interpolated
- [ ] Body copy: program carry-forward language present
- [ ] "Seal This Chapter" Ceremonial CTA: present and tappable
- [ ] "Not yet" text-link: present and tappable
- [ ] "Not yet" → M-5 dismisses → L-3 unchanged
- [ ] In-flight: "Seal This Chapter" shows spinner; "Not yet" inactive
- [ ] Offline: "You need a connection" error appears below body copy; "Seal This Chapter" inactive; "Not yet" active; error clears on connectivity restore
- [ ] Transaction failure: inline error; "Seal This Chapter" re-activates; chapter NOT sealed

**Sealing Transaction**
- [ ] Chapter status → Sealed at "Seal This Chapter" confirm (not at L-6 exit)
- [ ] Active programs remain Active after sealing
- [ ] L-4 programs section shows historical snapshot ("In Progress When Sealed" display construct)
- [ ] Honor evaluation fires (ChapterCount + Longevity families)
- [ ] HonorInstances created and available in L-10
- [ ] Chapter Sealed timeline event created
- [ ] FLM created: Tier 1, Priority 1, State A
- [ ] Rank evaluation fires; M-1 queued if rank-up occurred
- [ ] Unachieved primary goal → "— Not Achieved" in L-4 (no barrier in M-5)
- [ ] No honor display in M-5
- [ ] M-1 does NOT fire between M-5 and L-6

**Navigation**
- [ ] "Not yet" → L-3 (unchanged)
- [ ] Sealing transaction success → M-5 dismisses → L-6 opens
- [ ] L-6 exit, no rank-up queued → L-1 directly
- [ ] L-6 exit, rank-up queued → M-1 fires → then L-1
- [ ] M-1 (post-L-6) "Continue" → L-1 (FLM: Chapter Sealed featured; identity strip: new rank)
- [ ] Chapter-seal honors discoverable in L-10 post-sealing

**Accessibility**
- [ ] Modal announced as "Seal chapter, confirmation"
- [ ] Focus trapped in modal while open
- [ ] Default focus on "Seal This Chapter" CTA
- [ ] "Not yet" dismissal: focus returns to L-3 Ceremonial CTA
- [ ] All interactive elements ≥ 44×44pt

---

## 14. Decision Record

| Decision | Value |
|----------|-------|
| M5-D1 — Modal type | Centered overlay modal; consistent with M-1/M-2 family; gravity of irreversible action |
| M5-D2 — Stage structure | Single-stage confirmation modal. No Stage B. Chapter-seal honors are evaluated at sealing and persisted to L-10 for passive discovery. HES routing language refers to evaluation exclusion from M-2, not a display ceremony instruction. Removing Stage B preserves "Story Before Data": athletes reflect before they discover recognition. |
| M5-D3 — No tap-outside dismiss | Consistent with M-1/M-2; prevents accidental abort of a gravity-level action |
| M5-D4 — Cancel label | "Not yet" — text-link style; locked in L-3/L-4 §14.1 |
| M5-D5 — Confirm label | "Seal This Chapter" — Ceremonial CTA style; locked in L-3/L-4 §14.1 |
| M5-D6 — Body copy | "Your goals, honors, and progress will be permanently locked. Active programs carry forward into your next chapter—their progress at this moment is preserved in this chapter's record." Per L-6 Decision Risk 4; Critical Decisions Decision 2. Supersedes L-3 §14.1 provisional copy. |
| M5-D7 — Program state | Active programs remain Active after sealing; no state change; Critical Decisions Amendment 001 Decision 2 |
| M5-D8 — "In Progress When Sealed" | Display construct in L-4 only; not a program state change; Critical Decisions Decision 2 |
| M5-D9 — Offline | Blocked at "Seal This Chapter" tap; "You need a connection to seal your chapter."; from L-6 §7 |
| M5-D10 — Unachieved goal | No barrier; no additional confirmation; L-3/L-4 §14.1 line 871 |
| M5-D11 — Honor routing | Chapter-seal honors evaluated at sealing; persisted as HonorInstances; no display in M-5; discovered in L-10. M-2 excluded per M-2 §10 E-5 and HES §8.3. |
| M5-D12 — Rank-up at sealing | Rank evaluation executes during the M-5 sealing transaction. If rank-up occurs, M-1 is queued but does not fire before or during L-6. M-1 fires after L-6 exits and before L-1. If no rank-up, L-6 exits directly to L-1. Preserves M-1 §2 "never skip" and Product DNA "Story Before Data." Companion amendment applied to L-6 §10.2. |
| M5-D13 — Sealing transaction timing | Chapter seals at M-5 confirmation; L-6 is post-seal enrichment only; L-6 §4 |

---

## 15. Architecture Issues Resolved

| Issue | Resolution |
|-------|----------|
| C-11 (MVP Audit): M-5 referenced inline only in L-3/L-4, no dedicated spec | ✓ CLOSED — this document is the dedicated M-5 spec |
| HES §11: ceremony integration deferred to M-5 spec | ✓ Resolved — §7.5 defines honor evaluation timing and L-10 delivery; no ceremony surface in M-5 |
| L-6 Decision Risk 4: M-5 modal body copy needs program language | ✓ Resolved — M5-D6 body copy includes program carry-forward statement |
| M-5/L-6/M-1 contradiction: M-1 "never skip" vs. L-6 passive discovery | ✓ Resolved — Option 1 locked: M-1 queued at sealing, fires after L-6 exits; companion amendment applied to L-6 §10.2 |

---

## 16. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification — closes Architecture Audit C-11; resolves HES §11 deferred ceremony integration; resolves L-6 Decision Risk 4; establishes single-stage confirmation model with no Stage B per reflection-first product philosophy; locks M-1 queued-at-sealing / fires-after-L-6 resolution per M-5/L-6/M-1 contradiction resolution Option 1; companion amendment applied to L-6 §10.2 |
| v1.0.1 (M-5-A1) | June 2026 | Batch closure amendment: corrected §15 cross-reference from M5-D12 to M5-D6 (program carry-forward copy authority); L-6 §18 downstream dependency table and L-6 Risk 4 marked RESOLVED |

---

*M-5 Chapter Sealing Confirmation — Modal Specification v1.0*
*Forge Legacy | June 2026*
