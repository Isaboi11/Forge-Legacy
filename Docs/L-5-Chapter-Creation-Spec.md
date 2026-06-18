# L-5 Chapter Creation
## Wireframe Specification v1.0 | June 2026

**Status:** LOCKED  
**Authority:** First-Chapter-First-Goal-Wireframe-Spec-O3.md, Goal-Create-Edit-Wireframe-Spec-G3.md, Legacy-Hub-Wireframe-Spec-L1.md v1.2, Home-Screen-Wireframe-Spec-H1.md, Workouts-Hub-Wireframe-Spec-W1.md v1.1, Architecture-Amendment-001-Import.md, Master PRD §10

---

## 1. Purpose

L-5 is the post-onboarding chapter creation flow. The athlete gives their next training period a name, and optionally declares a primary goal. It is the creation end of the chapter lifecycle.

**Lifecycle position:**
```
L-5 Chapter Creation
→ L-3 Active Chapter (training period)
→ M-5 Chapter Sealing Confirmation
→ L-6 Chapter Reflection
→ L-1 Legacy Hub (no active chapter state)
→ L-5 (next chapter)
```

**What L-5 is:**
- A full-screen modal the athlete opens deliberately from H-1, W-1, L-1, or P-1
- The chapter name and optional primary goal entry surface
- The exclusive post-onboarding path to creating a chapter

**What L-5 is not:**
- The first-chapter creation path (that is O-3, during onboarding)
- A gate to logging workouts — workouts can be logged without a chapter
- Automatically surfaced — the athlete must tap a chapter creation CTA to reach it
- An import surface — import is initiated from within L-5 but handled by a separate flow

**Emotional tone:** Intentional. Ceremonial. The beginning of something.

---

## 2. Entry Points

| Source | CTA Label | Condition | Cancel Returns To |
|--------|-----------|-----------|-------------------|
| H-1 Home Screen | "Create Chapter" | No Active Chapter invitation card visible | H-1 |
| W-1 Workouts Hub | "Create a Chapter" or "Start a Chapter" | No Active Chapter card visible | W-1 |
| L-1 Legacy Hub | "Start a Chapter" | Invitation card, no active chapter | L-1 |
| P-1 Profile | "Start a chapter →" | Empty / invitation state | P-1 |

On success, all entry points resolve to **L-1 (Legacy Hub)** + toast. Cancel returns the athlete to the originating screen — the modal dismisses and the underlying screen is restored.

---

## 3. Prerequisite: One Active Chapter Rule

L-5 is only reachable when no active chapter exists. The architecture enforces this at entry points — chapter creation CTAs are hidden or replaced when an active chapter is present. L-5 itself does not display a guard screen or error state.

An athlete who wants to start a new chapter must first seal their current chapter via M-5.

---

## 4. Presentation Style

**Container:** Full-screen modal. Presented as a system modal sheet (slides up from the bottom edge of the screen).

L-5 is not a compact bottom sheet (those are for supplementary in-context actions). L-5 is not a centered overlay modal (those are for destructive confirmations, e.g., M-5). Chapter creation is a major lifecycle act and receives full-screen modal treatment.

**Dismissal:**
- Explicit Cancel button (L-5a) or Back chevron (L-5b → L-5a)
- Swipe down on L-5a: dismiss directly (no chapter created)
- Swipe down on L-5b with goal text entered: confirmation required before dismissing
- Swipe down on L-5b with no goal text: dismiss directly

**Two-step flow:**
- **L-5a** — Chapter Name entry (required to proceed)
- **L-5b** — Optional Goal setup (may be skipped)

Chapter creation is **atomic at L-5b completion** — no server write occurs between L-5a and L-5b. Back navigation from L-5b to L-5a is always safe.

---

## 5. L-5a — Chapter Name

### 5.1 Anatomy

```
┌──────────────────────────────────────────────────┐
│  Cancel              New Chapter                 │  ← Nav bar
│                                                  │
│  Name your chapter.                              │  ← 22sp, primary weight
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  e.g. Getting Started, Road to 405,        │  │  ← Text input
│  │       A New Beginning                      │  │
│  └────────────────────────────────────────────┘  │
│                                              45  │  ← Counter (shows at ≤15 remaining)
│                                                  │
│  Import from existing training →                 │  ← Secondary CTA
│                                                  │
│                                                  │
│                               [ Next → ]         │  ← Primary CTA, bottom
└──────────────────────────────────────────────────┘
```

### 5.2 Chapter Name Field

| Property | Rule |
|----------|------|
| Required | Yes — at least 1 non-whitespace character |
| Maximum length | 60 characters |
| Uniqueness | Not validated — two chapters may share a name |
| Profanity filter | None in MVP |
| Placeholder | "e.g. Getting Started, Road to 405, A New Beginning" |
| Character counter | Appears at ≤15 remaining; turns accent color at exactly 0 remaining |
| Keyboard | Default text; auto-capitalization on |
| Return key | No automatic progression — athlete taps "Next" |

The placeholder communicates tone without prescribing content. Chapter names are declarations, not labels.

### 5.3 Navigation Bar

| Element | Behavior |
|---------|---------|
| "Cancel" (left) | Dismisses modal; returns to entry point; clears draft |
| "New Chapter" (title) | Static |

### 5.4 "Next" CTA

| State | Condition |
|-------|-----------|
| Inactive (muted) | Name field is empty or whitespace-only |
| Active | Name field has ≥1 non-whitespace character |

Tapping "Next" (active): advances to L-5b; chapter name preserved.

### 5.5 Import CTA

"Import from existing training →" — secondary style, below the name input. Always visible regardless of whether a name has been typed.

**Behavior:**
1. Check import eligibility (`hasUsedFreeImport` flag)
2. Eligible (free import not yet used): dismiss L-5 modal → route to W-IM-1; draft cleared
3. Ineligible (free import used): M-7 (Premium Upsell) fires; L-5 remains open behind M-7
4. Premium: always routes to W-IM-1

The import flow handles its own chapter creation (W-IM-3 Chapter Setup) and does not return to L-5.

---

## 6. L-5b — Optional Goal

### 6.1 Anatomy

```
┌──────────────────────────────────────────────────┐
│  ←               New Chapter                    │  ← Nav bar (back chevron)
│                                                  │
│  Set a goal.                                     │  ← 22sp, primary weight
│  Optional — you can add one anytime.             │  ← 14sp, secondary
│                                                  │
│  Goal name                                       │  ← Label, 12sp
│  ┌────────────────────────────────────────────┐  │
│  │  e.g. Run my first 5K, Get stronger        │  │
│  └────────────────────────────────────────────┘  │
│                                              80  │  ← Counter (shows at ≤20 remaining)
│                                                  │
│  Target (optional)                               │  ← Label, 12sp
│  ┌───────────────┐                               │
│  │               │  ← Numeric input              │
│  └───────────────┘                               │
│                                                  │
│  Unit (optional)     ← Appears only when Target  │
│  ┌──────────────────────────────────────────┐    │   has a value
│  │  e.g. lbs, km, reps                      │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Skip for now                                    │  ← Tertiary text link
│                                                  │
│                               [ Done → ]         │  ← Primary CTA, always active
└──────────────────────────────────────────────────┘
```

### 6.2 Goal Fields

These fields are identical to G-3 in Create / Primary mode.

| Field | Required | Rules |
|-------|---------|-------|
| Goal Name | No (goal creation is optional) | Max 100 chars; if goal is being created, ≥1 non-whitespace char is required |
| Target | No | Numeric; must be > 0 if entered; decimals supported |
| Unit | No | Max 30 chars; freeform; only appears and is valid when Target has a value |

**Goal types supported:**
- **Quantifiable goal:** Goal Name + Target (displays with progress bar in L-3)
- **Narrative goal:** Goal Name only, no Target (displays as "In Progress" in L-3)
- **No goal:** All fields empty → chapter created without a primary goal → G-1 "Active Chapter, No Goals" state applies

### 6.3 Navigation Bar

| Element | Behavior |
|---------|---------|
| Back chevron (left) | Returns to L-5a; chapter name preserved; goal fields cleared |
| "New Chapter" (title) | Static |

### 6.4 "Done" CTA

"Done →" — primary, always active from the moment L-5b opens.

| Goal Name State | "Done" Behavior |
|-----------------|----------------|
| Empty or whitespace-only | Creates chapter only (no goal) — identical to "Skip for now" |
| Content only, no Target | Creates chapter + narrative primary goal |
| Content + Target > 0 | Creates chapter + quantifiable primary goal |
| Content + Target + Unit | Creates chapter + quantifiable primary goal with unit label |

### 6.5 "Skip for now" CTA

Tertiary text link, always present. Creates chapter only (no goal) and navigates to L-1 + toast. Functionally identical to tapping "Done" with an empty Goal Name field.

### 6.6 Swipe-Dismiss from L-5b

| Condition | Behavior |
|-----------|---------|
| Goal text entered | Confirmation dialog: "Leave without finishing?" → "Leave" dismisses modal, no chapter created, draft cleared; "Stay" returns to L-5b |
| No goal text entered | Dismiss directly; no chapter created |

---

## 7. G-3 Integration Note

L-5b presents goal fields inline — the athlete does not navigate to the G-3 screen during chapter creation. L-5b implements the same field definitions, validation rules, and goal type logic as G-3 Create / Primary mode. No architectural divergence from G-3's data model.

If the athlete skips goal creation in L-5, G-1 "Active Chapter, No Goals" empty state applies, where G-3 is accessible via the "Add a Primary Goal" CTA.

Program association (optional, shown when an Active program exists) may be included in L-5b at implementation time consistent with G-3 Create / Primary behavior; the L-5 spec does not separately define it beyond this note.

---

## 8. Import Integration

Governed by Architecture-Amendment-001-Import.md.

L-5 is an import entry point. The "Import from existing training →" secondary CTA in L-5a routes to W-IM-1 when eligible. See § 5.5 for full eligibility and routing rules.

Tapping the import CTA dismisses L-5 and clears draft. The import flow handles chapter creation internally and does not return to L-5 on completion.

---

## 9. CTA Behavior

| CTA | Location | Active When | Action |
|-----|----------|-------------|--------|
| Cancel | L-5a nav bar | Always | Dismiss modal; return to entry point; clear draft |
| Next → | L-5a bottom | Name ≥1 non-whitespace char | Advance to L-5b; preserve chapter name |
| Import from existing training → | L-5a secondary | Always | Check eligibility → W-IM-1 or M-7; clear draft |
| Back chevron | L-5b nav bar | Always | Return to L-5a; preserve chapter name; clear goal fields |
| Skip for now | L-5b tertiary | Always | Create chapter (no goal) → L-1 + toast |
| Done → | L-5b bottom | Always | Create chapter (+ optional goal) → L-1 + toast |
| Leave (confirmation) | L-5b dismiss dialog | — | Dismiss modal; no chapter created; clear draft |
| Stay (confirmation) | L-5b dismiss dialog | — | Return to L-5b; no state change |

---

## 10. Navigation Table

| Exit Path | From | Destination |
|-----------|------|-------------|
| Cancel | L-5a | Entry point (H-1 / W-1 / L-1 / P-1) |
| Swipe down | L-5a | Entry point |
| Next → | L-5a | L-5b |
| Import CTA (eligible) | L-5a | W-IM-1 |
| Import CTA (ineligible) | L-5a | M-7 → L-5a (M-7 dismisses, L-5 restored) |
| Back chevron | L-5b | L-5a |
| Swipe down (no goal text) | L-5b | Entry point |
| Swipe down (goal text) → "Leave" | L-5b | Entry point |
| Swipe down (goal text) → "Stay" | L-5b | L-5b (no change) |
| Skip for now | L-5b | L-1 + toast |
| Done → (empty goal) | L-5b | L-1 + toast |
| Done → (goal entered) | L-5b | L-1 + toast |
| Network failure on Done / Skip | L-5b | L-5b (retry; fields preserved) |

---

## 11. Completion Flow

On successful chapter creation (L-5b "Done" or "Skip for now"):

1. **API calls execute (atomic):**
   - Create chapter record: `{ name, athleteId, createdAt: now, status: Active }`
   - If goal entered: create primary goal record attached to chapter
2. **L-5 modal dismisses**
3. **Navigate to L-1 (Legacy Hub)**
4. **Toast appears:** "[Chapter Name] has started."
   - Example: "Road to 405 has started."
   - Toast is non-blocking; standard duration
5. **L-1 reflects new active chapter state** — active chapter banner visible; invitation card absent

If goal was skipped, G-1 "Active Chapter, No Goals" invitation is available within the chapter. The athlete can add a primary goal from L-3 or G-1 at any time.

---

## 12. Draft Behavior

| Scenario | Draft Behavior |
|----------|---------------|
| Unexpected exit (crash, background termination, system kill) while L-5 open | Draft restored when athlete next opens L-5 |
| Cancel on L-5a | Draft cleared immediately |
| Swipe down on L-5a | Draft cleared immediately |
| Confirmed dismiss from L-5b ("Leave") | Draft cleared immediately |
| Routing to import from L-5a | Draft cleared immediately |
| Successful completion ("Done" or "Skip for now") | Draft cleared immediately |

**Fields saved to local draft:** Chapter name (L-5a); Goal Name, Target, Unit (L-5b, only if L-5b was reached before the unexpected exit).

**Debounce:** One write to local storage per field change, no more than once per 500ms.

**Cross-device:** Draft does not transfer between devices.

**O-3 draft:** O-3 onboarding drafts are scoped to O-3 only and never carry over to L-5. L-5 always opens fresh.

---

## 13. Network / Offline Behavior

All field validation is client-side. Network is only required at submission.

### 13.1 Network Failure on "Done" / "Skip for now"

```
Toast: "Couldn't save your chapter. Check your connection and try again."
```

- L-5b fields remain intact with athlete's entries
- "Done" and "Skip for now" re-enabled after toast dismissal
- Modal does not navigate until chapter creation succeeds
- Draft is preserved through network failure

### 13.2 Partial Failure (Chapter Saves, Goal Fails)

If the chapter record is created but the goal API call fails:

```
Toast: "Chapter started. Couldn't save your goal — add it from your chapter."
```

- Navigate to L-1 (the chapter is a permanent legacy record)
- G-1 "Active Chapter, No Goals" state applies
- Athlete can re-enter goal creation via L-3 → G-3

### 13.3 Offline at Submission

```
Toast: "No connection. Check your network and try again."
```

- L-5b remains open; fields intact

---

## 14. Edge Cases

| Scenario | Behavior |
|----------|---------|
| Back from L-5b to L-5a, then return to L-5b | Chapter name preserved in L-5b; goal fields start fresh (cleared on back) |
| Athlete edits chapter name after visiting L-5b | Updated name used on completion |
| Goal Name entered, Target left empty | Narrative goal created (no progress bar in L-3) |
| Target entered, Goal Name left empty | "Done" treats all goal fields as empty — no goal created; Target alone is not valid |
| Unit entered, then Target cleared | Unit field collapses; Unit value discarded |
| App goes to background while L-5 is open | Draft saved on background transition |
| Import CTA tapped; M-7 fires; athlete dismisses M-7 | L-5 is restored in the state it was in before the M-7 tap |
| Chapter name is exactly 60 chars and athlete attempts to type more | Input stops accepting characters; counter shows "0" in accent color |
| Goal Name is exactly 100 chars and athlete attempts to type more | Input stops accepting characters |

---

## 15. Accessibility

| Element | Accessibility Behavior |
|---------|----------------------|
| Modal open | Announced: "New Chapter" |
| Cancel button | Labeled: "Cancel, button" |
| Chapter name input | Labeled: "Chapter name, required, 60 characters maximum" |
| Character counter (name) | Announced on change when ≤15 remaining: "[N] characters remaining" |
| "Next" — inactive | Announced as dimmed; not activatable |
| "Next" — active | Labeled: "Next, button" |
| Import CTA | Labeled: "Import from existing training, button" |
| Back chevron (L-5b) | Labeled: "Back to chapter name, button" |
| Goal Name input | Labeled: "Goal name, optional, 100 characters maximum" |
| Target input | Labeled: "Target, optional, numeric" |
| Unit input | Labeled: "Unit, optional"; not announced when hidden |
| "Skip for now" | Labeled: "Skip goal setup, button" |
| "Done" | Labeled: "Done, button" |
| Confirmation dialog | Announced as modal: "Leave without finishing?"; options: "Leave" and "Stay" |
| Success toast | Announced via accessibility notification: "[Chapter Name] has started." |

**Focus behavior:**
- On open (L-5a): focus set to chapter name input; keyboard raises
- On step advance to L-5b: focus set to Goal Name input
- On back to L-5a: focus set to chapter name input (cursor at end of existing text)
- On dismiss: focus returns to the entry-point CTA that launched L-5

**Minimum touch targets:** 44pt for all interactive elements.

---

## 16. Non-Behaviors

L-5 does not and will never:

| Non-Behavior |
|-------------|
| Auto-suggest or template chapter names |
| Display the chapter ordinal number during creation (the chapter record does not exist until L-5b completion) |
| Allow the athlete to set a custom start date (start date is the creation timestamp, set server-side) |
| Carry over draft content from O-3 onboarding to L-5 |
| Create a chapter record before L-5b "Done" or "Skip for now" |
| Allow chapter creation when an active chapter already exists |
| Require goal creation — goal is always optional |
| Allow more than one primary goal to be created during L-5 |
| Show secondary goal fields (secondary goals are added via L-3 / G-3 after creation) |
| Navigate to L-3 directly on success (destination is L-1) |
| Allow program enrollment during chapter creation (enrollment is via W-3 / L-3 after creation) |
| Require an internet connection to display the form (validation is client-side) |
| Automatically reopen after the athlete taps Cancel |
| Show a confirmation step before submission (submission is "Done" or "Skip for now" on L-5b) |

---

## 17. Decisions Record

| Decision | Value |
|----------|-------|
| L5-D1 — Presentation | Full-screen modal sheet (not compact bottom sheet; not centered overlay modal). Chapter creation is a major lifecycle act requiring full visual focus. |
| L5-D2 — Two-step flow | Mirrors O-3 (O-3a → O-3b): name step then goal step. Keeps the two concerns separated without a complex single-screen form. |
| L5-D3 — Navigation destination on success | L-1 (Legacy Hub) + toast. L-5 is a Legacy-context action; L-1 is the natural landing. Consistent with L-6 exit → L-1. O-3 goes to H-1 because it is an onboarding surface — L-5 is a deliberate Legacy action and resolves differently. |
| L5-D4 — Goal step inline | L-5b embeds goal fields directly, consistent with O-3b. No navigation to G-3 screen. G-3 Create/Primary field rules govern validation. |
| L5-D5 — Atomic creation at L-5b | No server write between L-5a and L-5b. Identical to O-3 atomicity. Back navigation is always safe. |
| L5-D6 — Cancel and dismiss behavior | L-5a Cancel / swipe-down: immediate dismiss, no confirmation (no data saved yet). L-5b swipe-dismiss with goal text: confirmation required. L-5b with no goal text: immediate dismiss. No chapter is ever created before L-5b completion, so no chapter is at risk regardless of dismiss path. |
| L5-D7 — Import CTA placement | L-5a, below the chapter name field. Always visible. Import is an alternative path — the athlete either names a fresh chapter or imports training history. |
| L5-D8 — Draft behavior | Draft restores only after unexpected exit (crash, background termination). All deliberate exits clear draft immediately. No exceptions. |
| L5-D9 — "Done" with empty goal fields | Functionally identical to "Skip for now" — chapter created, no goal. Avoids a confusing state where "Done" does nothing. |
| L5-D10 — Character counters | Chapter name: appears at ≤15 remaining, accent at 0. Goal Name: appears at ≤20 remaining. Consistent with O-3a. |

---

## 18. Architecture Audit Issues Resolved

| Issue | Resolution |
|-------|----------|
| L-5 unspecced (H-1 Risk 4, W-1 §10.1, L-1 Risk 1, O-3 Risk 1) | ✓ Resolved — this document is the full L-5 spec |
| H-1 "Create Chapter" flow blocked by L-5 absence | ✓ Resolved |
| L-1 "Start a Chapter" destination undefined | ✓ Resolved — destination is L-5 (this document) |
| G-3 integration into L-5 undefined (G-3 Risk 1) | ✓ Resolved — L-5b embeds G-3 Create/Primary fields inline |

---

## 19. Validation Checklist

### Presentation
- [ ] L-5 opens as a full-screen modal sheet
- [ ] L-5 is not reachable when an active chapter exists
- [ ] On success: L-1 opens + toast "[Chapter Name] has started."
- [ ] On cancel (any deliberate exit): entry point restored; no chapter created

### L-5a — Chapter Name
- [ ] Chapter name input is focused on open; keyboard raises
- [ ] "Next" is inactive until ≥1 non-whitespace character entered
- [ ] "Next" activates immediately on valid input
- [ ] Maximum 60 characters enforced; input stops at limit
- [ ] Character counter appears at ≤15 remaining; turns accent at 0
- [ ] Placeholder: "e.g. Getting Started, Road to 405, A New Beginning"
- [ ] Cancel: dismisses modal; returns to entry point; clears draft
- [ ] Swipe down: dismisses modal; clears draft

### L-5a — Import CTA
- [ ] CTA visible always, regardless of name field state
- [ ] Eligible athlete: tapping routes to W-IM-1; L-5 dismisses; draft cleared
- [ ] Ineligible athlete: M-7 fires; L-5 remains open; M-7 dismiss restores L-5
- [ ] Premium athlete: always routes to W-IM-1

### L-5b — Optional Goal
- [ ] Back chevron returns to L-5a; chapter name preserved; goal fields cleared
- [ ] Goal Name: max 100 chars; optional
- [ ] Target: numeric only; must be > 0 if entered; decimals supported
- [ ] Unit: appears only when Target has a value; max 30 chars; freeform
- [ ] Target cleared: Unit field collapses; Unit value discarded
- [ ] "Done" is active from the moment L-5b opens (always)
- [ ] "Done" with empty goal name: creates chapter, no goal
- [ ] "Done" with goal name only: creates chapter + narrative goal
- [ ] "Done" with goal name + Target: creates chapter + quantifiable goal
- [ ] "Done" with goal name + Target + Unit: creates chapter + quantifiable goal with unit
- [ ] "Skip for now": creates chapter, no goal; same outcome as Done with empty goal
- [ ] Swipe down with goal text: confirmation dialog shown ("Leave without finishing?")
- [ ] Swipe down with no goal text: modal dismisses directly; no chapter created
- [ ] Confirmation "Leave": modal dismisses; no chapter created; draft cleared
- [ ] Confirmation "Stay": returns to L-5b; no change

### Completion and Error
- [ ] Toast: "[Chapter Name] has started." — athlete's exact name
- [ ] L-1 shows active chapter state after creation
- [ ] Network failure on submission: toast + retry; fields preserved; modal stays open
- [ ] Partial failure (chapter saved, goal failed): navigate to L-1 + toast explaining goal failure
- [ ] Offline at submission: toast + retry; modal stays open

### Draft
- [ ] Draft saves chapter name and goal fields (debounced ≤500ms)
- [ ] Unexpected exit (crash / background kill): draft restores on next L-5 open
- [ ] Cancel from L-5a: draft cleared immediately
- [ ] Swipe dismiss from L-5a: draft cleared immediately
- [ ] Confirmed "Leave" from L-5b: draft cleared immediately
- [ ] Routing to import: draft cleared immediately
- [ ] Successful completion: draft cleared immediately
- [ ] Draft does not transfer between devices
- [ ] O-3 draft does not carry into L-5

### Accessibility
- [ ] Modal announced as "New Chapter" on open
- [ ] Focus set to chapter name input on open
- [ ] Focus set to goal name input on step advance to L-5b
- [ ] Focus returns to entry-point CTA on dismiss
- [ ] Character counters announced at ≤15 / ≤20 remaining
- [ ] "Next" announced as dimmed when inactive
- [ ] Swipe-dismiss confirmation announced as modal

### Non-Behaviors
- [ ] No auto-suggest for chapter name
- [ ] No chapter ordinal shown during creation
- [ ] No custom start date field
- [ ] No chapter record created before L-5b completion
- [ ] No secondary goal fields in L-5
- [ ] No program enrollment in L-5
- [ ] No automatic resurfacing after Cancel

---

## 20. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification — closes L-5 chapter creation gap; resolves Architecture Audit dependency chain for H-1, W-1, L-1, and G-3 |

---

*L-5 Chapter Creation — Wireframe Specification v1.0*  
*Forge Legacy | June 2026*
