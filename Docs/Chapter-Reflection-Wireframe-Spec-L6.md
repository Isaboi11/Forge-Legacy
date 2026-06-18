# Forge Legacy — Chapter Reflection Wireframe Specification
## L-6 | Phase 2C | Version 1.0 — June 2026

**Status:** Lock-Ready
**Screen:** Chapter Reflection
**Authority:** Forge Legacy Master PRD Section 10, FLM Standards v1.0, FLM/Sealed Chapter Amendment 001, Product DNA
**Depends on:** L-3, L-4, M-5, FLM Standards v1.0
**Downstream impact:** L-4 (reflection display + "Add Reflection" CTA), FLM Standards v1.0 (amendment required — see Section 17)

---

## Preamble

L-6 is the final act of the chapter lifecycle.

```
Create Chapter → Active → Progress → Seal (M-5) → Reflect (L-6) → Archive → Legacy
```

By the time the athlete reaches L-6, the chapter is already archived. M-5 sealed it. The outcomes are locked. The "Chapter Sealed" timeline entry has fired. The FLM has updated. The rank-up check has run.

L-6 does not complete the sealing. The sealing is done.

What L-6 does is give the athlete a moment — the only moment the product provides — to speak about what they built. Not to report on it. Not to log it. To say what it meant.

The reflection written here becomes a permanent part of the archived chapter. It appears in L-4. It is excerpted in the FLM card (State A) and the Chapter Sealed State A card on L-1. It never changes after submission. It belongs to the athlete forever.

**L-6 succeeds when:**
The athlete feels that this screen was worthy of the moment. That pausing here — even briefly, even to skip — honored the chapter they just closed.

**L-6 fails when:**
It feels like a form. It feels like a requirement. It rushes the athlete. It shames athletes who didn't achieve their goal. It distracts from the chapter's meaning with system chrome or metrics.

---

## Architecture Decisions

### Decision 1 — Screen Type: Full Screen, Pushed

**Locked.** L-6 is a full-screen experience pushed onto the navigation stack. It is not a modal, a sheet, or a bottom tray. The chapter lifecycle ends on a full screen because the chapter deserved one.

---

### Decision 2 — L-6 Is Post-Sealing Enrichment

**Locked.** The chapter seals at M-5 confirmation — not at L-6 exit. When L-6 opens, the chapter is already archived. L-6 is an enrichment screen operating on an already-archived chapter record. "Skip" has no archival consequences. Nothing is pending.

This distinction is important for the experience: L-6 is not a gate. It is an invitation.

---

### Decision 3 — Reflection Is Optional

**Locked.** The athlete is never required to write a reflection. "Skip" is always available as a tertiary option. An archived chapter with no reflection is a valid permanent state. The "Add Reflection" CTA in L-4 persists indefinitely for chapters without a reflection.

---

### Decision 4 — Re-Entry from L-4

**Locked.** If no reflection exists, L-4 shows an "Add Reflection" CTA. Tapping it opens L-6 in post-sealing entry mode. L-6 from this path has different CTA copy and navigation behavior than L-6 from the sealing flow. Both are the same screen. See Section 4.

---

### Decision 5 — Reflection Separate from Chapter Notes

**Locked.** Chapter Notes (the running notes field in L-3) are shown in L-6 as read-only context — the athlete's record of thoughts during the chapter. The reflection field is blank by default. The reflection is a new stored record, separate from Chapter Notes. Both persist in L-4: Chapter Notes as a section, reflection as the closing voice of the chapter.

---

### Decision 6 — Goal Outcomes: Neutral Framing

**Locked.** The primary goal outcome is shown in the chapter summary header. Two states only:
- "✓ [Goal Name]" — achieved
- "[Goal Name] — In Progress at Sealing" — not yet achieved at the time of sealing

No secondary goals. No "failed" language. No judgment. The facts are surfaced; the framing is neutral.

---

### Decision 7 — Photos Removed from L-6

**Locked.** Photo addition is not part of the L-6 flow. Photos are added to sealed chapters via the "Add a Memory" system in L-4. L-6 is focused on reflection.

---

### Decision 8 — Active Programs at Sealing

**Locked.** Active programs transition to "In Progress When Sealed" as part of the M-5 archival transaction. L-6 is not involved in program handling. M-5 surfaces this in its modal body. L-6 does not surface program outcomes.

---

### Decision 9 — Reflection Is Never Editable After Submission

**Locked.** Once submitted, the reflection is permanently locked. The athlete cannot edit or delete it. Additional thoughts belong in the Memory Note system in L-4, which fires its own "Reflection Added" FLM event (Priority 7) if written post-sealing. The original reflection is sacred.

---

### Decision 10 — Reflections Never Generate Timeline Events

**Locked.** A reflection written in L-6 (sealing flow) generates no timeline entry — the "Chapter Sealed" event (Priority 1) already exists and covers the sealing moment. A reflection written later from L-4 also generates no timeline entry. Reflections are commentary on legacy events. They are not legacy events themselves. They are accessible through the chapter record in L-4.

**Note:** The "Reflection Added" FLM event (Priority 7, defined in FLM Standards v1.0) is scoped to L-4 post-sealing reflection creation only. L-6 sealing-time reflections do not fire this event. See Section 17 for required FLM Standards amendment.

---

### Decision 11 — Rank-Up and Honors Fire at M-5

**Locked.** Rank-up check and end-of-chapter honors fire as part of the M-5 archival transaction, before L-6 opens. The athlete discovers any rank-up on return to L-1 via the FLM and identity strip. L-6 does not surface rank or honor events.

---

### Decision 12 — Offline Behavior

**Locked.** The M-5 sealing API call requires connectivity. If the device is offline at M-5, the sealing is blocked with a calm message: "You need a connection to seal your chapter." L-6 is only reached after M-5 succeeds (the chapter is already archived). The reflection save (tapping "Complete Reflection") uses local save with background sync — the athlete's reflection words are not held hostage to connectivity.

---

## Section 1 — Purpose

L-6 is the closing voice of the chapter. Not a summary. Not a report. A voice.

The chapter's events, outcomes, workouts, and honors are already committed. L-6 does not add to those records. It gives the athlete a space to say what those records meant to them — in their own words, on their own terms, without structure imposed.

**L-6 succeeds when:**
1. The athlete feels that this moment was worth stopping for
2. Athletes who write reflections feel heard — that their words are preserved permanently and presented with dignity
3. Athletes who skip feel no shame — the product does not press, guilt, or prompt again during the session
4. The screen reads as personal and earned, not procedural
5. The chapter's context (what was built) is visible before the reflection is written — the athlete does not write into a vacuum

**L-6 fails when:**
- It feels like a required form step
- It presents unachieved goals as failures
- It surfaces metrics, counters, or gamification
- It competes with the reflection field for visual attention
- Athletes who skip feel like they did something wrong

---

## Section 2 — Screen Goals

**Primary goal:** Give the athlete a worthy space to say what their chapter meant to them.

**Secondary goal:** Preserve that statement permanently as part of the archived chapter record.

**Emotional outcome: Worthy.**

The athlete who writes a reflection should feel that the product received it with respect. The athlete who skips should feel that the product respected their choice.

---

## Section 3 — Information Hierarchy

L-6 has one scroll. The order is fixed:

```
┌─────────────────────────────────────────────────────────┐
│  [App Bar — context-dependent, see Section 4]           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Chapter Name]                 ← Primary headline      │
│  [Date range · Duration]        ← Identity              │
│  [Goal outcome line]            ← Outcome (if exists)   │
│  [N workouts · N honors]        ← Stats                 │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  YOUR NOTES                     ← Read-only context     │
│  [Chapter Notes — collapsed]    ← (omitted if no notes) │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  [Reflection text area]         ← Primary action        │
│                                                         │
│  [Need inspiration? ▾]          ← Expandable prompts    │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  [  Complete Reflection  ]      ← Primary CTA           │
│  Skip                           ← Tertiary text link    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The chapter summary header is the grounding element — the athlete sees what they built before they write. The Chapter Notes are context, not input. The reflection field is the focus. The CTAs are at the bottom, unhurried.

---

## Section 4 — Entry Points and Context

L-6 has two entry paths. The screen layout is identical. App Bar, CTA copy, and exit navigation differ.

### 4.1 Entry Path A — Sealing Flow (M-5 → L-6)

**Trigger:** Athlete taps "Seal This Chapter" in M-5. Chapter archives. M-5 dismisses. L-6 is pushed onto the navigation stack.

**App Bar:**
- No back button
- No screen title in the App Bar (the chapter name in the content area serves as the visual title)
- App Bar is minimal chrome only

**Why no back button:**
The chapter is archived. There is no meaningful destination for a back tap. The sealing has happened. L-6 is the closing ceremony, not a reversible step. The "Skip" tertiary CTA is the exit path if the athlete decides not to write. Navigating back would drop the athlete onto L-4 (the newly archived chapter), which is disorienting immediately after sealing.

**Back gesture (hardware back / swipe-to-dismiss):**
If the reflection field has no text: treated as Skip — navigates to L-1.
If the reflection field has text: confirmation dialog:
- "Leave without saving your reflection?"
- "Leave" (destructive, muted) + "Keep Writing" (primary)

**CTAs:**
- Primary: "Complete Reflection" (enabled only when reflection field has ≥ 1 character)
- Tertiary: "Skip" (text link, centered, muted)

**Exit destinations:**
- "Complete Reflection" → L-1 (No Active Chapter state)
- "Skip" → L-1 (No Active Chapter state)
- Back gesture (no text) → L-1 (No Active Chapter state)
- Back gesture (with text) → confirmation → "Leave" → L-1

### 4.2 Entry Path B — Post-Sealing from L-4 (L-4 → L-6)

**Trigger:** Athlete taps "Add Reflection" CTA in L-4. This CTA is only visible when no reflection exists on the archived chapter.

**App Bar:**
- "Cancel" button top-left (or standard back chevron)
- No screen title

**CTAs:**
- Primary: "Save Reflection" (enabled only when reflection field has ≥ 1 character)
- Tertiary: "Cancel" (text link, centered, muted) — same as tapping the App Bar Cancel

**Exit destinations:**
- "Save Reflection" → back to L-4 (which now shows the saved reflection)
- "Cancel" → back to L-4
- App Bar Cancel → back to L-4

**If "Cancel" is tapped with text in the reflection field:**
Confirmation dialog:
- "Discard your reflection?"
- "Discard" (destructive) + "Keep Writing" (primary)

**Post-save behavior in L-4:**
The reflection section appears in L-4 immediately after save, labeled as the chapter's reflection (not timestamped as a sealing-moment reflection). See Section 17 — L-4 update required.

**"Reflection Added" FLM event:**
When the reflection is saved via Entry Path B, the "Reflection Added" FLM event (Priority 7) fires. This is the only path that triggers this event. Entry Path A does not fire this event — the "Chapter Sealed" Priority 1 event already covers the sealing moment and dominates for 30 days. See Section 17.

---

## Section 5 — Chapter Summary Header

The chapter summary header grounds the athlete in what they built before they write. It is read-only. It is not navigable. It is the last time the athlete sees their chapter as a summary before the reflection becomes part of it.

```
Road to 405
Apr 5 – Jun 11, 2026  ·  67 days

✓ Squat 405 lbs achieved

47 workouts  ·  3 honors
```

### 5.1 Elements

**Chapter name** — 28sp, primary weight. The athlete's own name for this period of their life. The largest text on the screen. This is the headline.

**Date range + duration** — "MMM D – MMM D, YYYY · N days" — 14sp, muted. Full date range. Duration in days.

**Goal outcome line** — one of three states:

| State | Display | Typography |
|-------|---------|------------|
| Primary goal achieved | "✓ [Goal Name] achieved" | 15sp, accent/success color |
| Primary goal in progress at sealing | "[Goal Name] — In Progress at Sealing" | 15sp, muted |
| No primary goal set | *(element absent — no placeholder)* | — |

The checkmark "✓" and "achieved" framing are reserved for goals that were actually completed. "In Progress at Sealing" is neutral — it states the fact without judgment. The word "failed" does not appear anywhere on L-6.

Secondary goals are not shown in the summary header.

**Stats line** — "[N] workouts · [N] honors" — 13sp, muted. These are navigational context, not metrics. They tell the athlete how much they accumulated without presenting them as scores. If workouts = 0: the element is present and shows "0 workouts" — silence is not more kind than accuracy; a chapter with no workouts is a valid chapter. If honors = 0: "0 honors" is shown.

### 5.2 Absent Sections

No section label above the chapter summary header. The chapter name speaks for itself. No header label like "YOUR CHAPTER" is needed — the content communicates what it is.

---

## Section 6 — Chapter Notes (Read-Only Context)

### 6.1 Purpose

Chapter Notes are the running notes the athlete kept during L-3 (Active Chapter Detail). They are the working memory of the chapter — written across many sessions, not at a single moment. The reflection is a closing statement — written at one moment, at the end.

These are different records. The reflection field is blank on arrival; the Chapter Notes are context, not pre-fill.

### 6.2 Section Label

"YOUR NOTES" — 11sp, muted, caps. Standard section label treatment.

### 6.3 Display

```
YOUR NOTES
  "Feeling really strong this week. PR attempt on Saturday..."
  Show all notes ›
```

Chapter Notes are shown collapsed — first 3 lines of text visible. A "Show all notes ›" link expands them inline. When expanded: "Show less ›" collapses back.

**Typography:** 14sp, muted, italic — visually distinct from the reflection field text, which is 15sp primary weight. The Notes are context; the reflection field is the voice.

**When expanded:** Notes expand within a bounded area (max 200dp height, internal scroll). The reflection field remains visible below. The athlete does not need to scroll past the full notes to reach the reflection field.

### 6.4 Omitted When Empty

If the athlete wrote no Chapter Notes during L-3, this section is omitted entirely — no label, no "You didn't keep any notes" placeholder. The screen moves directly from the chapter summary header to the reflection field. The absence of notes communicates nothing about the quality of the chapter.

---

## Section 7 — Reflection Field

### 7.1 Overview

The reflection field is the center of L-6. Everything above it is context. Everything below it is actions. The field is spacious, unhurried, and empty by default.

```
┌──────────────────────────────────────────────────────────┐
│  What did this chapter mean to you?                     │
│  |                                                       │
│                                                          │
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Field Behavior

**Initial state:** Blank. Placeholder text visible: "What did this chapter mean to you?" — 15sp, placeholder style (muted, disappears on first keystroke).

**Active state:** Standard text input. The field expands vertically with content — it does not scroll internally; it grows, pushing the CTAs down. The screen scroll accommodates this.

**Character limit:** No hard limit. A reflection is not a tweet. The athlete may write 10 words or 1000. No character counter is shown unless the athlete approaches a soft warning threshold (if any — this is not specified and is a V1.1+ consideration if needed).

**Typography:** 15sp, primary weight (when text exists). Clear contrast with the muted Chapter Notes above.

**Keyboard behavior:** Standard text keyboard. No send key override. Return creates a new paragraph. The "Complete Reflection" CTA is reached by scrolling down or dismissing the keyboard.

### 7.3 Blank Is Not Pre-Filled from Chapter Notes

The reflection field is always blank on arrival. Chapter Notes are shown separately as read-only context (Section 6). The distinction matters: the reflection is a new voice, not a copy of the working log.

---

## Section 8 — Inspiration Prompts

### 8.1 Purpose

Some athletes face the blank page. The inspiration prompts are optional writing aids — not required fields, not separate stored records. They are questions that invite the athlete to find their voice.

### 8.2 Collapsed Default

```
Need inspiration? ▾
```

A single collapsed row at 13sp, secondary color, left-aligned chevron. Not a section label. Not prominent. It is a quiet offer, not a suggestion that the athlete needs help.

### 8.3 Expanded State

```
Need inspiration? ▲

  · What did you prove to yourself?
  · What surprised you about this chapter?
  · What will you carry forward?
```

Three prompts. 14sp, muted. Bullet-point format. No tap behavior on individual prompts — they are read-only inspiration, not buttons. The athlete reads them, finds one that resonates, and writes in the reflection field above.

**Why read-only and not "tap to insert":**
Inserting a prompt into the field imposes the question's framing on the answer. The athlete's reflection should begin with their own words. The prompts are questions to hold in mind, not sentence starters.

### 8.4 Prompt Copy

The three prompts are:
1. "What did you prove to yourself?"
2. "What surprised you about this chapter?"
3. "What will you carry forward?"

These prompts are intentionally open-ended. They work equally for achieved goals, unachieved goals, and no-goal chapters. They invite reflection rather than accounting. They are copy, not architecture — they may be updated or expanded without a spec revision.

---

## Section 9 — CTAs

### 9.1 "Complete Reflection" / "Save Reflection"

**Position:** Below the reflection field and inspiration prompts. Full width. Primary button style.

**Copy:**
- Entry Path A (sealing flow): "Complete Reflection"
- Entry Path B (L-4 post-sealing): "Save Reflection"

**Enabled state:** Enabled only when the reflection field contains ≥ 1 character. When the field is empty, the button is present but visually disabled (muted, not tappable). This ensures the primary action is distinct from skipping — completing a reflection requires something written.

**On tap:** Saves the reflection to the archived chapter record. Navigates per entry path (Section 4). No loading state is shown for the save — the save is optimistic (local-first, background sync per Decision 12). The athlete is not held in a waiting state.

### 9.2 "Skip" / "Cancel"

**Position:** Below "Complete Reflection." Centered text link. Tertiary visual weight — 14sp, muted, no underline. This should be visible but not prominent. The athlete knows it is there. The design does not draw their eye to it.

**Copy:**
- Entry Path A (sealing flow): "Skip"
- Entry Path B (L-4 post-sealing): "Cancel"

**On tap:**
- "Skip": navigates to L-1. No reflection record is created. No confirmation required (the action is non-destructive — no text was in the field to lose; if text was entered and the athlete taps "Skip," see Section 9.3).
- "Cancel" (L-4 path): navigates back to L-4. If text was entered, confirmation dialog fires (Section 4.2).

### 9.3 "Skip" When Text Exists

If the athlete has typed content in the reflection field and then taps "Skip":
- Confirmation dialog: "Leave without saving your reflection?"
- "Leave" (muted/destructive) + "Keep Writing" (primary)
- "Keep Writing" dismisses the dialog and returns focus to the reflection field
- "Leave" navigates per entry path without saving

"Skip" is always an available escape, but it does not silently discard written text.

---

## Section 10 — Post-Completion Behavior

### 10.1 Sealing Flow — "Complete Reflection" or "Skip" to L-1

The athlete arrives at L-1 in the No Active Chapter state:
- Section 1 (Active Chapter): invitation card — "Your training builds your legacy. Start a chapter to give it a name."
- Section 2 (FLM): "Chapter Sealed" card (Priority 1) — if reflection was written, the FLM card now shows the excerpt (first ~120 chars) via the L-1 re-render on arrival. If reflection was skipped, no excerpt.
- Section 3 (Chapter History): the newly sealed chapter appears as State A (0–7 day window, expanded card). If reflection was written, the State A card shows the excerpt.
- Sections 4–7: present if content exists.

The L-1 re-render on arrival from L-6 is a standard screen lifecycle refresh. No special animation or transition is needed beyond the normal navigation.

### 10.2 Sealing Flow — Rank-Up Queued at M-5, Fires After L-6

The rank-up check ran at M-5 (before L-6 opened). If a rank-up occurred during the M-5 sealing transaction, M-1 fires after the athlete exits L-6, before L-1 opens. After M-1 dismisses, L-1 opens with the updated identity strip and Chapter Sealed FLM. If no rank-up occurred, L-6 exits directly to L-1.

FLM: Rank Up (Priority 3) does not displace Chapter Sealed (Priority 1) within the 30-day window.

*Amendment: M-5/L-6/M-1 Contradiction Resolution Option 1, June 2026. Authority: M-5-Chapter-Sealing-Confirmation-Spec.md §7.6, M5-D12.*

### 10.3 L-4 Path — "Save Reflection" to L-4

The athlete returns to L-4. L-4 now shows the reflection in the chapter record. The "Add Reflection" CTA in L-4 is no longer visible (the reflection now exists).

The "Reflection Added" FLM event (Priority 7) fires. This may update the FLM on L-1 if no higher-priority event is active in the pool.

---

## Section 11 — Navigation

### 11.1 Navigation Into L-6

| Source | Trigger | Entry Path |
|--------|---------|------------|
| M-5 (Seal Confirmation Modal) | "Seal This Chapter" confirmed | Path A — sealing flow |
| L-4 (Archived Chapter Detail) | "Add Reflection" CTA (visible only when no reflection exists) | Path B — post-sealing |

No other entry points. L-6 is not reachable from H-1, L-1, deep links, or push notifications.

### 11.2 Navigation Out of L-6

| Action | Path A exit | Path B exit |
|--------|------------|------------|
| "Complete Reflection" / "Save Reflection" | L-1 (No Active Chapter) | L-4 |
| "Skip" / "Cancel" | L-1 (No Active Chapter) | L-4 |
| Back gesture (no text) | L-1 (No Active Chapter) | L-4 |
| Back gesture (text exists) | Confirmation → "Leave" → L-1 | Confirmation → "Discard" → L-4 |

### 11.3 No Navigation Within L-6

L-6 has no internal navigation. No tappable elements within the chapter summary header. No links from the Chapter Notes. The screen is a focused single-purpose experience.

---

## Section 12 — Empty States

### 12.1 No Chapter Notes

The "YOUR NOTES" section is omitted entirely. The screen flows:

```
[Chapter Summary Header]
[Reflection field]
[Need inspiration? ▾]
[Complete Reflection]
[Skip]
```

This is the minimal L-6 state. It is clean and intentional. The athlete's history is in the summary header. The blank reflection field is an invitation, not a void.

### 12.2 No Primary Goal

Goal outcome line is absent from the chapter summary header. No "No goal was set" placeholder. The stats line follows the date range directly.

### 12.3 Chapter with Zero Workouts

The stats line shows "0 workouts · [N] honors." This is not hidden. A chapter with zero workouts is a valid chapter. The athlete may have experienced the chapter in ways not reflected in workout logs. The screen does not editorialize.

### 12.4 Reflection Field Empty on Arrival (Always)

The reflection field is always empty on arrival regardless of whether Chapter Notes exist. There is no "pre-fill" behavior. The placeholder copy is always the same: "What did this chapter mean to you?"

---

## Section 13 — Edge Cases

### 13.1 App Backgrounded or Force-Quit During L-6 (Sealing Flow)

The chapter is already archived (M-5 sealed it). There is no orphaned state. On next app open:
- The chapter is in L-4 state — archived, outcomes locked, no reflection
- The athlete sees L-6 is no longer open
- The "Add Reflection" CTA is present in L-4 (re-entry allowed per Decision 4)
- No recovery prompt, no banner, no interruption. The athlete proceeds naturally.

### 13.2 Reflection Written in L-6 While Offline

The reflection save (tapping "Complete Reflection") uses local-first save with background sync. The athlete sees a normal save and navigates to L-1. When connectivity returns, the reflection syncs to the server. No error is shown. No wait state is presented. If sync permanently fails (rare): the local record persists; a silent retry mechanism handles resolution. This is not exposed to the athlete.

### 13.3 Reflection Written in L-6 — Very Long (1000+ words)

No hard limit. The reflection field accommodates unlimited text. The screen scrolls. "Complete Reflection" remains accessible at the bottom. The athlete's voice is not cut off.

The FLM excerpt (first ~120 chars) and State A card excerpt (first ~120 chars) both truncate automatically — the full reflection is accessible via L-4, and the excerpt surfaces the opening voice of the reflection.

### 13.4 Tapping "Skip" Immediately (No Text Entered)

No confirmation. Navigate directly to L-1. A chapter without a reflection is a valid state. There is no obligation, no second-guess moment. Skip is an honest choice.

### 13.5 Chapter with Multiple Sealed Programs at Time of Sealing

L-6 does not surface program outcomes. The chapter summary header shows the primary goal outcome and the workout/honor counts. Programs are visible in L-4's program section (with "In Progress When Sealed" status). L-6 is not the place to account for program outcomes.

### 13.6 Chapter Sealed with No Goal — Athlete Tries to Reference Goal in Reflection

The reflection field is free text. The athlete can write about anything. L-6 does not know what the athlete writes — it stores the text without analysis. If they want to write about a goal they never formally set, they can.

### 13.7 Athlete Opens L-6 from L-4 on an Imported Chapter (If Applicable)

Imported chapters arrive as pre-archived (per Import Amendment). If an imported chapter has no reflection, the "Add Reflection" CTA in L-4 is present. L-6 opens via Entry Path B. The reflection is written, saved, and attributed to the archived chapter record with the actual submission date. No special handling is needed. The reflection copy that might reference the past ("This chapter was from 2023...") is valid — the athlete is reflecting on history from the present.

### 13.8 Very Long Chapter Notes — Expansion Behavior

When expanded, Chapter Notes render in a bounded block (max 200dp height, internal scroll). The reflection field is always visible below the notes block regardless of expansion state. The athlete does not scroll the page to reach the reflection field — the notes expansion is contained within its own scroll container.

### 13.9 Athlete Returns to L-6 Via L-4 After Already Having Written a Reflection

If a reflection exists (written in L-6 or L-4), the "Add Reflection" CTA in L-4 is not shown. There is no entry point to L-6 for chapters that already have a reflection. A written reflection is permanent. See Architecture Risks, Risk 1.

---

## Section 14 — Accessibility

### 14.1 Chapter Summary Header

- Chapter name: `accessibilityRole` = "header", `accessibilityLabel` = "[Chapter Name]"
- Date range + duration: `accessibilityLabel` = "[Chapter Name], [Start Date] to [End Date], [N] days"
- Goal outcome: `accessibilityLabel` = "Primary goal: [Goal Name], [achieved / in progress at sealing]" — omitted element = not in accessibility tree
- Stats: `accessibilityLabel` = "[N] workouts, [N] honors"
- All summary header elements: `accessibilityRole` = "text", not interactive

### 14.2 Chapter Notes Section

- Section label: `accessibilityRole` = "header", `accessibilityLabel` = "Your notes from this chapter"
- Notes text: `accessibilityRole` = "text"
- "Show all notes" / "Show less": `accessibilityRole` = "button", `accessibilityLabel` = "Show all notes" / "Collapse notes"

### 14.3 Reflection Field

- `accessibilityRole` = "none" (the field itself provides its own accessibility)
- `accessibilityLabel` = "Reflection field"
- `accessibilityHint` = "Write your reflection on this chapter. Optional."
- Placeholder text is readable by screen readers
- Keyboard: standard text accessibility (VoiceOver / TalkBack standard behavior)

### 14.4 Inspiration Prompts

- Collapsed toggle: `accessibilityRole` = "button", `accessibilityLabel` = "Need inspiration? Tap to expand", `accessibilityState` = {expanded: false/true}
- Expanded prompts: `accessibilityRole` = "text" for each prompt line (not interactive)

### 14.5 CTAs

- "Complete Reflection" / "Save Reflection": `accessibilityRole` = "button", `accessibilityLabel` = "Complete reflection and return to Legacy Hub" (Path A) / "Save reflection" (Path B)
- Disabled state: `accessibilityState` = {disabled: true}, `accessibilityHint` = "Write your reflection to enable this button"
- "Skip" / "Cancel": `accessibilityRole` = "button", `accessibilityLabel` = "Skip, return to Legacy Hub without saving a reflection" (Path A) / "Cancel, return to chapter without saving" (Path B)

---

## Section 15 — Mobile UX

### 15.1 Screen Type

Full screen. Pushed onto the navigation stack. Portrait orientation only. Standard transition animation (slide in from right for Path A; slide in from right for Path B).

### 15.2 Keyboard Handling

When the athlete taps the reflection field, the keyboard rises. The chapter summary header and Chapter Notes section scroll above the keyboard. The reflection field remains visible just above the keyboard edge. "Complete Reflection" and "Skip" are accessible by scrolling down or by dismissing the keyboard first.

On iOS: the screen should use `KeyboardAvoidingView` with appropriate behavior to ensure the reflection field is not obscured.

On Android: `adjustResize` window soft input mode to push the content above the keyboard.

### 15.3 Chapter Notes Expansion Within Scroll

The Chapter Notes expansion (Section 13.8) is a bounded scroll container within the page scroll. Standard nested scroll behavior. The notes container handles its own vertical scroll; the page scroll handles everything else.

### 15.4 Tap Targets

| Element | Minimum Tap Target |
|---------|-------------------|
| "Show all notes / Show less" | Full width × 44dp |
| "Need inspiration?" toggle | Full width × 44dp |
| "Complete Reflection" / "Save Reflection" | Full width × 52dp |
| "Skip" / "Cancel" text link | Full width × 44dp |

### 15.5 Screen Spacing

Generous vertical spacing throughout. L-6 should feel unhurried. The reflection field should have at least 120dp of initial visible height before the athlete types. The chapter summary header has comfortable padding above and below. The inspiration prompts section is separated from the reflection field by a visible gap.

---

## Section 16 — Validation Checklist

### Chapter Summary Header
- [ ] Chapter name at 28sp, primary weight
- [ ] Date range + duration in "MMM D – MMM D, YYYY · N days" format
- [ ] Goal achieved state: "✓ [Goal Name] achieved" in accent/success color
- [ ] Goal in progress at sealing: "[Goal Name] — In Progress at Sealing" in muted style
- [ ] No goal: goal line absent entirely, no placeholder
- [ ] Stats line: "[N] workouts · [N] honors" including zero values
- [ ] No tap behavior on any header element
- [ ] No section label above the header

### Chapter Notes
- [ ] Section label: "YOUR NOTES" (11sp, muted, caps) — only when notes exist
- [ ] Notes shown collapsed (3 lines) by default
- [ ] "Show all notes ›" expands to bounded scroll container (200dp max height)
- [ ] "Show less ›" collapses back to 3 lines
- [ ] Notes text: 14sp, muted, italic
- [ ] Notes section omitted entirely when no notes exist
- [ ] Notes are read-only — not tappable, not editable

### Reflection Field
- [ ] Field blank on arrival — not pre-filled from Chapter Notes
- [ ] Placeholder: "What did this chapter mean to you?"
- [ ] No hard character limit
- [ ] Field expands vertically with content
- [ ] 15sp text, primary weight

### Inspiration Prompts
- [ ] "Need inspiration? ▾" collapsed by default
- [ ] Expands to show 3 prompts
- [ ] Prompts are read-only (not tap-to-insert)
- [ ] Prompt copy: "What did you prove to yourself?" / "What surprised you about this chapter?" / "What will you carry forward?"
- [ ] Collapses cleanly with "▲" chevron

### CTAs
- [ ] "Complete Reflection" / "Save Reflection" disabled when reflection field is empty
- [ ] "Complete Reflection" / "Save Reflection" enabled at ≥ 1 character
- [ ] "Skip" / "Cancel" always visible (tertiary, muted)
- [ ] "Skip" with text in field fires confirmation dialog before navigating
- [ ] CTA copy: "Complete Reflection" (Path A) / "Save Reflection" (Path B)
- [ ] Tertiary copy: "Skip" (Path A) / "Cancel" (Path B)

### Entry Path A (Sealing Flow)
- [ ] No back button in App Bar
- [ ] Back gesture with no text → L-1
- [ ] Back gesture with text → confirmation → "Leave" → L-1
- [ ] "Complete Reflection" → L-1
- [ ] "Skip" (no text, no confirmation) → L-1
- [ ] "Skip" (text exists) → confirmation → "Leave" → L-1
- [ ] L-1 re-renders: FLM shows reflection excerpt if written; State A card shows excerpt if written
- [ ] No timeline event fires when reflection is written in sealing flow
- [ ] No "Reflection Added" FLM event fires in sealing flow

### Entry Path B (L-4 Post-Sealing)
- [ ] "Cancel" / back button in App Bar
- [ ] "Save Reflection" → L-4 (reflection now visible)
- [ ] "Cancel" (no text) → L-4
- [ ] "Cancel" (text exists) → confirmation → "Discard" → L-4
- [ ] "Add Reflection" CTA in L-4 only visible when no reflection exists
- [ ] "Add Reflection" CTA disappears after reflection is saved
- [ ] "Reflection Added" FLM event fires on save (Priority 7)
- [ ] No timeline entry created

### Empty States
- [ ] No Chapter Notes → notes section absent, screen flows directly to reflection field
- [ ] No goal → goal line absent
- [ ] Zero workouts → "0 workouts" shown (not hidden)

### Product DNA Compliance
- [ ] No gamification elements
- [ ] No streak counters, totals presented as scores
- [ ] No "failed" language for unachieved goals
- [ ] Reflection is optional — "Skip" is always accessible
- [ ] Screen does not re-prompt after "Skip" during the session

---

## Section 17 — Architecture Risks and Downstream Impact

### Risk 1 — No Edit Path After Submission

**Issue:** Once a reflection is submitted (either from L-6 or L-4 via "Add Reflection"), it is permanently locked per Decision 9. There is no edit path.

**Impact:** An athlete who submits a reflection with a typo or an incomplete thought has no recourse. They may add further thoughts via the Memory Note system in L-4, but they cannot change the original reflection.

**Mitigation:** The confirmation copy in Section 9.3 ("Leave without saving your reflection?") and the overall optional nature of the reflection reduces pressure to submit something imperfect. A reflection submitted under no obligation is less likely to require revision.

**Risk level:** Low — a product principle tradeoff. Accepted.

---

### Risk 2 — FLM Standards v1.0 Amendment Required

**Issue:** FLM Standards v1.0 defines "Reflection Added" as Priority 7 without specifying which entry path triggers it. Under the locked decision (Decision 10), this event fires only for L-4 post-sealing reflections (Entry Path B), not for L-6 sealing-flow reflections (Entry Path A).

**Required amendment:**
> FLM Standards v1.0, Section 3 (Priority 7 — Reflection Added): Clarify trigger: "'Reflection Added' fires when the athlete writes a reflection on an archived chapter via L-4 (post-sealing entry). It does not fire when the reflection is written during the sealing flow via L-6. In the sealing flow, the 'Chapter Sealed' Priority 1 event subsumes the reflection."

**Risk level:** Low — a one-line amendment. Does not change the selection algorithm or priority ordering.

---

### Risk 3 — L-4 Updates Required

L-4 (Archived Chapter Detail) requires the following changes to support L-6:

1. **"Add Reflection" CTA:** Visible at the bottom of L-4 (above "Add a Memory") when no reflection exists. Disappears after a reflection is written. This CTA must be architecturally distinct from "Add a Memory" — different record type, different behavior, different FLM event.

2. **Reflection display section:** When a reflection exists, L-4 shows it in a dedicated section — the athlete's own words from the sealing moment. The reflection section must be read-only (Decision 9). No edit affordance.

3. **Reflection attribution display:**
   - Reflection written in L-6 (Entry Path A): shown without a separate submission timestamp — it is attributed to the sealing moment
   - Reflection written in L-4 (Entry Path B): shown with "Added [Date] · [N] days after sealing" — honest about when it was written

4. **Reflection excerpt in State A card and FLM card:** These surfaces read the reflection field from the chapter record. They update on the L-1 re-render after the athlete returns from L-6.

**Risk level:** Medium — L-4 requires meaningful updates before L-6 can ship. L-4 must be updated in parallel with or before L-6.

---

### Risk 4 — M-5 Modal Copy Update Required

**RESOLVED — M-5-A1 | June 2026**

M-5 v1.0 (M-5-Chapter-Sealing-Confirmation-Spec.md) was authored with program carry-forward language already incorporated (M5-D6). The adopted copy reads:

> "Your goals, honors, and progress will be permanently locked. Active programs carry forward into your next chapter—their progress at this moment is preserved in this chapter's record."

This is a deliberate expansion of the proposed copy above — it explains the carry-forward behavior rather than only naming the display state. The risk is closed; no further M-5 changes required.

---

### Risk 5 — L-6 Unavailable When Reflection Already Exists

There is no path to L-6 for a chapter that already has a reflection. The "Add Reflection" CTA in L-4 disappears after submission. The sealing flow only fires once per chapter. If the athlete wants to add more thoughts after writing a reflection, the correct path is the Memory Note system ("Add a Memory" in L-4), which produces a Memory Note rather than a reflection.

**Impact:** Athletes may want to "update" their reflection. The product does not allow this by design (Decision 9). The Memory Note system is the alternative.

**Risk level:** Low — product principle tradeoff. Accepted. Memory Notes serve the "more to add" use case.

---

## Section 18 — Downstream Dependencies

| Dependency | What L-6 Requires | Status |
|------------|------------------|--------|
| M-5 Seal Confirmation Modal | Modal copy update (program warning) | RESOLVED — M-5 v1.0 adopted program carry-forward copy (M5-D6); see Risk 4 |
| L-4 Archived Chapter Detail | "Add Reflection" CTA; reflection display section; attribution display | Requires update — see Risk 3 |
| FLM Standards v1.0 | "Reflection Added" trigger scoped to L-4 path only | Requires one-line amendment — see Risk 2 |
| L-1 Legacy Hub | Re-render on return from L-6 to update FLM and State A excerpt | Standard screen lifecycle — no special handling needed |
| FLM/Sealed Chapter Amendment 001 | Reflection excerpt (~120 chars) displayed in FLM card and State A card | Already locked — no change needed |
| Chapter record data model | Reflection as a nullable separate record linked to the archived chapter | Engineering definition required before implementation |

---

## Section 19 — Validation: Product DNA Compliance

- [ ] "Story Before Data" — the reflection field is the center of the screen; no metrics dashboard
- [ ] "Identity Over Performance" — goal framing is neutral; no "failed" language
- [ ] "Accountability Without Shame" — reflection is optional; "Skip" is always available; zero-workout chapters shown without judgment
- [ ] "History Cannot Be Rewritten" — reflection is locked on submission; no edit path
- [ ] "Memories Can Be Added" — Memory Notes remain available post-reflection via L-4 "Add a Memory"
- [ ] "Never Charge For History" — L-6 is available to all athletes regardless of tier; the reflection is theirs
- [ ] "Luxury, Premium Feeling" — generous spacing, unhurried screen, 28sp chapter name headline
- [ ] "Avoid Spreadsheet Energy" — no counters, no progress bars, no metrics-as-scores on L-6

---

## Change Log

### v1.0 — June 2026

Initial specification. L-6 established as a full-screen ceremony experience operating on an already-archived chapter (Option B transaction model — chapter seals at M-5, not at L-6 exit). Two entry paths: sealing flow (M-5 → L-6) and post-sealing from L-4 ("Add Reflection" CTA). Screen structure: chapter summary header (name, date range, goal outcome — achieved or neutral "In Progress at Sealing," stats) + read-only Chapter Notes (collapsed, omitted if empty) + blank reflection field + optional inspiration prompts + CTAs. Reflection always optional — "Skip" is always accessible as a tertiary text link; confirmation required only when text exists. Reflection never generates timeline events (both L-6 and L-4 paths). "Reflection Added" FLM event (Priority 7) fires only for L-4 post-sealing reflection entry, not for L-6 sealing-time reflections. Reflection locked permanently on submission. Photos removed from L-6 flow. Active programs handled at M-5 (become "In Progress When Sealed") — not surfaced in L-6. Rank-up and end-of-chapter honors fire at M-5 archival transaction, surface on L-1 return. Archived + no reflection is a valid permanent state. L-4 update required (reflection display, "Add Reflection" CTA, attribution by entry path). FLM Standards v1.0 amendment required ("Reflection Added" trigger scoped). M-5 modal copy update required (program warning). Emotional outcome: Worthy.

---

*Forge Legacy Chapter Reflection Wireframe Specification — L-6*
*v1.0 — June 2026*
*Authority: Master PRD Section 10, FLM Standards v1.0, FLM/Sealed Chapter Amendment 001, Product DNA*
