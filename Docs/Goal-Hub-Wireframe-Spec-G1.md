# Forge Legacy — Goal Hub Wireframe Specification
## G-1 | Phase 2B | Version 1.1 — June 2026

**Status:** Locked
**Authority:** Forge Legacy Master PRD Section 9 (Goal System), Product DNA, Program-Architecture-Amendment-001
**PRD Authority:** Section 9 (Goals), Section 6 (Chapters), Section 5 (MVP)

---

## Context

This document exists because the existing architecture has no dedicated goals surface. Goals currently surface on W-1 Workouts Hub (via the Chapter Context Card), on L-3 Chapter Detail (as a subordinate section), and on the Home hero (via Priority 1 state after primary goal achievement). There is no screen where the athlete goes to think about, review, and understand what they are currently pursuing.

G-1 fills this gap. It is the screen that answers: "What am I building toward, and how far have I come?"

G-1 is not a management surface. It is not a tracker. It is not a productivity dashboard. It is a reflection surface — the place where the athlete confronts and is confirmed in their current commitment.

---

## Architecture Decisions

The following decisions were required to complete this specification. Each is justified against the Product DNA and existing locked architecture.

---

### Decision 1 — Active Goal Limits

**Recommendation: Goals are chapter-scoped. One primary goal per active chapter. Unlimited secondary goals per chapter.**

G-1 shows the goals of the athlete's current active chapter. It does not show a global list of goals across all chapters.

Rationale: The chapter is the narrative unit of training. A primary goal is the central commitment of a chapter — it gives the chapter its purpose. Having more than one "central commitment" at a time collapses the story into a task list. The athlete who wants to pursue a different primary goal starts a new chapter. Unlimited secondary goals are appropriate because they are supporting commitments, not competing primary narratives.

In practice: an athlete has one primary goal active at any time (because they have one active chapter). Secondary goals are uncapped. The Goal Hub never asks "which of your N goals matters most" — that question is already answered by the chapter structure.

---

### Decision 2 — Goal Relationship to Chapters

**Recommendation: Goals must belong to chapters. Chapters can exist without goals. Goals cannot move between chapters.**

Goals are chapter-owned. A goal created in Chapter 1 belongs permanently to Chapter 1. When Chapter 1 archives, its goals archive with it.

A chapter can be started without any goals. The athlete can add goals at any time while the chapter is active. There is no friction gate that requires goal creation.

Goals cannot be reassigned to a different chapter. If an athlete wants to continue pursuing a goal in a new chapter, they create a new goal in the new chapter with the same name. The original goal remains as a record of the previous chapter's pursuit.

Rationale: The chapter is a training era. The goal was made in the context of that era. Moving a goal between chapters would corrupt the historical record — it would make the archived chapter appear to have contained a goal it did not. Legacy integrity requires that chapter records remain accurate representations of what was actually pursued during that chapter.

---

### Decision 3 — Goal Relationship to Programs

**Recommendation: Program association is optional display context on goal cards. Programs support goals but are not required. G-1 shows the connection when it exists.**

When a goal has an associated program, the program name appears as supporting context on the goal card. This is display only — the athlete does not manage the program association from G-1.

An athlete with no active program can have active goals. An athlete with an active program does not need to have goals. Goal progress and completion are independent of program state.

Rationale: Locked by Program Amendment 001 Section 8. The program is a tool. The goal is the commitment. The tool helps but does not define the commitment.

---

### Decision 4 — Goal Completion Philosophy

**Recommendation: Achieve + Remain Visible. Primary goal achievement triggers ceremony. Both primary and secondary achieved goals remain visible on G-1 while the chapter is active.**

When the primary goal is achieved: M-3 Goal Achieved modal fires, Legacy Timeline entry is created, Home hero shifts to Priority 1 state. The primary goal card on G-1 transitions to Achieved state and remains pinned at the top of the screen.

When a secondary goal is achieved: no modal. The goal card transitions to Achieved state and moves to the Achieved section below the active goals list. No ceremony — secondary achievements are noted, not celebrated at the same level.

Achieved goals remain visible on G-1 until the chapter archives. They are not hidden, cleared, or moved off-screen. The athlete who has achieved their primary goal should see it when they open the Goal Hub — that achievement is part of where they currently stand.

Rationale: Achievement is earned. Hiding it immediately after completion denies the athlete the experience of carrying their success forward. The Legacy hub will permanently record it after archival. G-1 keeps it present during the chapter's remaining life.

---

### Decision 5 — Goal Failure and Discontinuation

**Recommendation: No "fail" or "abandon" mechanism exists at the goal level. Goals end when chapters end.**

There is no "Remove Goal," "Abandon Goal," or "Mark as Not Achieved" action on G-1 or in the goal management flow. An athlete who changes direction, outgrows a goal, or no longer wants to pursue a commitment has one path: archive the chapter via L-3 Chapter Detail.

When the chapter archives, the primary goal outcome is recorded as either Achieved or Not Achieved — neutral, factual, permanent. "Not Achieved" uses the dash marker (—), not a failure indicator. No explanation is required.

Rationale: Accountability Without Shame. If the athlete could "abandon" a goal without archiving the chapter, one of three bad outcomes results: (1) they never archive and accumulate dead goals with no resolution, (2) they get a shame message when abandoning, or (3) abandoned goals disappear silently, leaving a gap in the historical record. None of these serve the athlete. The chapter archival flow is the appropriate ritual for closing a training era — it creates intention and completeness rather than a quiet, shameful deletion.

An athlete who outgrows a goal is not a failure. They are an athlete whose chapter has ended. Starting a new chapter is the forward action.

---

### Decision 6 — Goal Types

**Recommendation: No mandatory goal types for MVP. Goals are defined by name and target only.**

G-1 and G-3 (Goal Create/Edit) do not require or offer goal type/category selection. The goal name is the category. "Run my first marathon" is more specific and personal than "Endurance." "Add 20kg to my squat" is more meaningful than "Strength."

Post-MVP consideration: optional tags or categories that could improve legacy navigation and honor system matching. This is a future enhancement and must not be added to MVP.

Rationale: Simplicity Wins. Goal types add UI complexity and encourage athletes to think in productivity categories rather than personal narrative. A type system is Todoist behavior. Forge Legacy is not Todoist.

---

### Decision 7 — Goal Progress Visibility

**Recommendation: Dual display model. Quantifiable goals show a progress bar and percentage. Narrative goals show status only. No mandatory quantification.**

Goals with a numeric target set at creation use the quantifiable display model: progress bar + percentage as secondary context. Goals without a target use the narrative display model: "In Progress" status label only.

The display model is determined automatically by whether a target was set — there is no goal-type selector.

For quantifiable goals: goal name is the dominant element. Progress bar is secondary — it confirms direction but does not define the experience. "63% complete" not "37% remaining." No deadline display. No urgency signals.

For narrative goals: goal name is the full content. "In Progress" confirms the commitment is live. No quantification of any kind. This is a first-class display state — not a degraded or incomplete card.

Rationale: Story Before Data. Not all meaningful goals are measurable. "Rebuild confidence after injury" and "Train with my son" are profound identity commitments that cannot be expressed as percentages without category error. Forcing a progress bar on them would push goals toward productivity tracking and away from transformation. The dual model respects both types of commitment equally.

---

### Decision 8 — Goal History

**Recommendation: Goal history lives in Legacy, not G-1. G-1 is current state only.**

G-1 shows only the goals of the current active chapter. Past goals — from archived chapters — are not shown on G-1. They are accessible through Legacy (L-1 → L-4 Archived Chapter Detail).

Rationale: G-1 answers "what am I currently pursuing." Legacy answers "what have I built." Mixing them turns G-1 into a historical archive and dilutes its purpose as a present-state motivational surface.

---

## Section 1 — Purpose

G-1 is the athlete's focused destination for understanding their current commitment.

G-1 answers: "What am I building toward, and where do I stand?"

G-1 exists because goal information is scattered across the app today — surfaced in fragments on the home screen, on W-1, and buried within L-3 Chapter Detail. An athlete who wants to look at nothing but their goals has no place to go. G-1 creates that place.

**What G-1 is:**
- A focused review surface for the current chapter's goals
- A confirmation that the athlete's commitment is real and being honored
- A bridge between daily training and long-term transformation narrative

**What G-1 is not:**
- A task manager or habit tracker
- A deadline pressure surface
- A historical archive (that is Legacy)
- A place to manage programs, workouts, or chapter settings

---

## Section 2 — G-1 Screen Goals

1. **Surface current commitment** — show the athlete their primary goal with full context and current progress, without distraction
2. **Support secondary commitments** — show supporting goals without competing with the primary goal's visual primacy
3. **Honor achievement** — show goals that have been achieved within the current chapter, keeping them present as part of the athlete's current standing
4. **Invite growth** — provide low-friction access to adding supporting goals when the athlete is ready
5. **Be motivating, not pressuring** — every visual and copy choice must reinforce direction and identity, not urgency or anxiety

**What G-1 does NOT show:**
- Goal progress metrics from completed workouts (volume, weight, PRs)
- Comparison to other athletes
- Streak counts or time-since-last-update
- Past goals from archived chapters
- Goal completion rates or statistics
- Encouragement copy that implies the athlete needs to try harder

---

## Section 3 — Information Hierarchy

The hierarchy is consistent across all states, with sections appearing or disappearing based on the chapter and goal context.

**TIER 1 — Chapter Anchor**
Chapter name. Always present when a chapter is active. Grounds the goal hub in the narrative context. The goals shown here belong to this chapter.

**TIER 2 — Primary Goal**
The central commitment. Always the dominant visual element when a primary goal exists. State: In Progress or Achieved.

**TIER 3 — Active Secondary Goals**
Supporting commitments not yet achieved. Conditional — shown only when at least one unachieved secondary goal exists.

**TIER 4 — Achieved Secondary Goals**
Secondary goals achieved within this chapter, while the chapter is still active. Conditional — shown only when at least one secondary goal has been achieved. Visually subdued relative to active goals.

**TIER 5 — Primary Action**
"Add a Supporting Goal" — low-friction invitation to deepen commitment. Always present when the chapter is active, regardless of goal state.

---

## Section 4 — Navigation and Entry Point

G-1 is a screen within the app's navigation hierarchy. It is not a tab.

**G-1 is entered from:**
- W-1 Workouts Hub → Chapter Context Card (tapping the goal name or progress element)
- H-1 Home → Chapter Hero Card (tapping the goal element in the chapter block)
- L-3 Chapter Detail → Goals section header (tapping "Goals" section label or "View Goals" link)

**G-1 is not a tab in the bottom navigation.** Goals are always anchored to a chapter. Surfacing them as a standalone tab would suggest they exist independently, which they do not.

**G-1 navigates to:**
- G-2 Goal Detail → tapping a goal card (post-MVP; if unavailable, no action)
- G-3 Goal Create/Edit → "Add a Supporting Goal" CTA, "Add a Primary Goal" empty state CTA
- L-5 Create Chapter → "Start a Chapter" CTA in no-chapter empty state
- Back to entering screen → back arrow

---

## Section 5 — Screen Header (Universal)

Present in all states.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ←   Goals                                              │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Goals                                                  │  ← 22sp, primary weight
│  [Chapter Name]                                         │  ← 13sp, secondary, muted
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Top App Bar:**
- Left: back arrow — returns to entering screen
- Center: "Goals" — not the chapter name (the chapter name appears in the identity block below)
- Right: no overflow on G-1

**Identity block:**
- "Goals" — 22sp, primary weight
- "[Chapter Name]" — 13sp, secondary, muted — confirms which chapter's goals are shown

---

## Section 6 — State: No Active Chapter

Shown when the athlete has no active chapter.

```
┌─────────────────────────────────────────────────────────┐
│  ←   Goals                                              │
├─────────────────────────────────────────────────────────┤
│  Goals                                                  │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Icon: compass or path — neutral, not celebratory]     │
│                                                         │
│  Goals live inside chapters.                            │  ← 17sp, primary
│  Start a chapter to begin pursuing a goal.              │  ← 15sp, secondary
│                                                         │
│  [  Start a Chapter  ]                                  │  ← Primary CTA → L-5
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Empty state copy:**
- Headline: "Goals live inside chapters." — factual, neutral
- Body: "Start a chapter to begin pursuing a goal." — forward-looking, no shame
- CTA: "Start a Chapter" → L-5 Create Chapter

**What this state does NOT show:**
- Past goals from archived chapters
- "You haven't set a goal yet" (shame-adjacent framing)
- Statistics from previous chapters

---

## Section 7 — State: Active Chapter, No Goals

Shown when the athlete has an active chapter but has not yet created a primary goal.

```
┌─────────────────────────────────────────────────────────┐
│  ←   Goals                                              │
├─────────────────────────────────────────────────────────┤
│  Goals                                                  │
│  [Chapter Name]                                         │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  GOAL                                                   │  ← Section label, 11sp, muted
│                                                         │
│  [Icon: minimal — neutral]                              │
│                                                         │
│  What are you building toward?                          │  ← 17sp, primary
│  Define the goal for this chapter.                      │  ← 15sp, secondary
│                                                         │
│  [  Add a Goal  ]                                       │  ← Primary CTA → G-3
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Empty state copy:**
- Headline: "What are you building toward?" — identity-focused, not task-focused
- Body: "Define the goal for this chapter." — neutral invitation
- CTA: "Add a Goal" → G-3 Goal Create (creates primary goal)

**What this state does NOT show:**
- Pressure language ("You should set a goal")
- Suggestions, recommended goals, or examples
- Progress elements (nothing to progress)

---

## Section 8 — State: Active Chapter, Primary Goal In Progress

The standard active state. Chapter has a primary goal not yet achieved.

```
┌─────────────────────────────────────────────────────────┐
│  ←   Goals                                              │
├─────────────────────────────────────────────────────────┤
│  Goals                                                  │
│  [Chapter Name]                                         │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  GOAL                                                   │  ← 11sp, muted, all-caps
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [Goal Name — 18sp, primary weight]              │   │  ← Primary Goal Card
│  │  [Target / context — 14sp, secondary]            │   │    (quantifiable variant shown)
│  │                                                  │   │
│  │  [████████░░░░░░░░░░] 43%                        │   │  ← Progress bar, secondary
│  │                                                  │   │
│  │  [Program: Program Name]   (if applicable)       │   │  ← 12sp, muted, optional
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  SUPPORTING GOALS                                       │  ← shown only if secondary goals exist
│                                                         │
│  [Secondary Goal 1 card]                                │
│  [Secondary Goal 2 card]                                │
│  ...                                                    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  + Add a Supporting Goal  ]                          │  ← Secondary CTA → G-3
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Section labels:**
- "GOAL" — 11sp, muted, all-caps — singular; there is one primary goal
- "SUPPORTING GOALS" — 11sp, muted, all-caps — conditional section

**Primary Goal Card:**
See Section 12 for full goal card design. Both quantifiable and narrative variants exist — the wireframe above shows the quantifiable variant.

**"Add a Supporting Goal" CTA:**
- Full-width secondary/outlined button
- Always present while chapter is active
- Creates a secondary goal via G-3
- Does not fire a conflict check — secondary goals have no limit

**What this state does NOT show:**
- "Start Program" or program management
- Chapter settings or chapter management
- Deadlines, days remaining, or urgency signals

---

## Section 9 — State: Primary Goal Achieved (Chapter Still Active)

Shown after primary goal is marked achieved via M-3 Goal Achieved flow. Chapter is still active (not yet archived).

```
┌─────────────────────────────────────────────────────────┐
│  ←   Goals                                              │
├─────────────────────────────────────────────────────────┤
│  Goals                                                  │
│  [Chapter Name]                                         │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  GOAL                                                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [Goal Name — 18sp, primary weight]              │   │  ← Primary Goal Card
│  │  [Target / context — 14sp, secondary]            │   │    (Achieved state)
│  │                                                  │   │
│  │  ✓ Achieved  [Month DD, YYYY]                    │   │  ← 14sp, achievement tone
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  SUPPORTING GOALS           (if unachieved secondary goals exist)
│                                                         │
│  [Active Secondary Goal card(s)]                        │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ACHIEVED                   (if achieved secondary goals exist)
│                                                         │
│  [Achieved Secondary Goal card(s) — subdued visual]     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  + Add a Supporting Goal  ]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Primary goal card in Achieved state:**
- Progress bar (quantifiable) or "In Progress" label (narrative) is replaced by "✓ Achieved [Month DD, YYYY]"
- Card remains pinned in the GOAL section — does not move to an "Achieved" subsection
- Visual treatment: slightly elevated vs. secondary achieved cards, but no excessive celebration (M-3 was the ceremony)
- The card is read-only

**Achieved secondary goals section:**
- Label: "ACHIEVED" — 11sp, muted, all-caps
- Visually subdued relative to active secondary goals: slightly reduced opacity or muted text
- Cards are read-only
- No "mark un-achieved" action

**What this state does NOT show:**
- Re-celebration of the achievement (M-3 was the ceremony moment)
- "Start a new chapter" CTA (this is not the archival surface; L-3 handles chapter management)
- Confetti, badges, or persistent animation

---

## Section 10 — Active Goals Section

The Active Goals section contains:
1. **The Primary Goal** (always, if one exists)
2. **Unachieved secondary goals** (conditional, in the "Supporting Goals" subsection)

The primary goal is always visually separated from secondary goals. It is not grouped with them.

**Section label for primary goal:** "GOAL" (singular)
**Section label for secondary goals:** "SUPPORTING GOALS"

These are distinct sections, not a unified goals list. The primary goal's narrative primacy must be preserved visually at all times.

**Active secondary goals:**
- Shown in the order they were created (chronological)
- No manual reordering for MVP
- Each renders as a goal card (see Section 12)

---

## Section 11 — Completed Goals Section

The Completed Goals section contains achieved secondary goals within the current active chapter.

**This section is conditional:** Shown only when at least one secondary goal has been achieved while the chapter is still active.

**Section label:** "ACHIEVED" — 11sp, muted, all-caps

**Visual treatment:**
- Cards in this section use slightly muted text (not dimmed to unreadable thresholds)
- Progress bar or "In Progress" label is replaced by "✓ [Month DD, YYYY]"
- Cards are read-only — no actions available
- Full-width cards, same layout as active secondary goal cards with different visual state

**What "Completed" means in this context:**
The chapter is still active. The goal was achieved. It is not archived — it is a current standing achievement. The athlete carries it into the rest of their chapter life.

When the chapter archives: all goals (including completed ones) move to Legacy (L-4 Archived Chapter Detail). G-1 no longer shows them.

---

## Section 12 — Goal Card Design

### 12.1 Primary Goal Card

The primary goal card renders in one of two display models depending on whether a numeric target was set at creation. The display model is determined automatically — no goal-type selector exists.

**Quantifiable — target field was set:**
```
┌──────────────────────────────────────────────────────────┐
│  [Goal Name — 18sp, primary weight]                      │
│  [Target or context — 14sp, secondary weight]            │
│                                                          │
│  [████████████░░░░░░░░] 63%                              │  ← Progress bar, 12sp
│                                                          │
│  [Program: Program Name]                (optional)       │  ← 12sp, muted
└──────────────────────────────────────────────────────────┘
```

**Narrative — no target set:**
```
┌──────────────────────────────────────────────────────────┐
│  [Goal Name — 18sp, primary weight]                      │
│                                                          │
│  In Progress                                             │  ← 13sp, secondary, muted
│                                                          │
│  [Program: Program Name]                (optional)       │  ← 12sp, muted
└──────────────────────────────────────────────────────────┘
```

**Achieved state — identical for both models:**
```
┌──────────────────────────────────────────────────────────┐
│  [Goal Name — 18sp, primary weight]                      │
│  [Target or context — 14sp, secondary]   (quantifiable only)
│                                                          │
│  ✓ Achieved  June 3, 2026                                │  ← 14sp, achievement tone
└──────────────────────────────────────────────────────────┘
```

**Card behavior:**
- Full card is tappable → G-2 Goal Detail (post-MVP; no action if G-2 unavailable)
- No swipe actions
- No delete or remove action

### 12.2 Secondary Goal Card (Active)

Secondary goal cards also render in quantifiable or narrative display models. No program association shown on secondary cards.

**Quantifiable — target field was set:**
```
┌──────────────────────────────────────────────────────────┐
│  [Goal Name — 15sp, primary weight]                      │
│  [████████░░░░░░░░░░░░] 42%                              │  ← Progress bar, 12sp
└──────────────────────────────────────────────────────────┘
```

**Narrative — no target set:**
```
┌──────────────────────────────────────────────────────────┐
│  [Goal Name — 15sp, primary weight]                      │
│  In Progress                                             │  ← 12sp, muted
└──────────────────────────────────────────────────────────┘
```

Secondary goal cards are smaller than the primary goal card. No target/context line for MVP (kept in G-2 Goal Detail).

### 12.3 Secondary Goal Card (Achieved — Completed Section)

```
┌──────────────────────────────────────────────────────────┐
│  [Goal Name — 15sp, muted weight]                        │
│  ✓  May 28, 2026                                         │  ← 12sp, muted
└──────────────────────────────────────────────────────────┘
```

No progress bar. Date of achievement shown. Full card is tappable → G-2 (post-MVP; no action if unavailable).

### 12.4 Goal Card Fields

| Field | Primary — Quantifiable | Primary — Narrative | Secondary — Quantifiable | Secondary — Narrative |
|-------|----------------------|--------------------|--------------------------|-----------------------|
| Goal name | 18sp, primary weight | 18sp, primary weight | 15sp, primary weight | 15sp, primary weight |
| Target/context | 14sp, secondary — shown | Absent | Absent (G-2 only) | Absent |
| Progress bar | Yes — proportional fill | No | Yes — proportional fill | No |
| Progress % | Yes — 12sp, beside bar | No | Yes — 12sp, beside bar | No |
| "In Progress" label | No | 13sp, secondary, muted | No | 12sp, muted |
| Program association | Optional — 12sp, muted | Optional — 12sp, muted | No | No |
| Achievement marker | "✓ Achieved [date]" replaces bar | "✓ Achieved [date]" replaces label | "✓ [date]" replaces bar | "✓ [date]" replaces label |
| Tap behavior | G-2 Goal Detail (post-MVP) | G-2 Goal Detail (post-MVP) | G-2 Goal Detail (post-MVP) | G-2 Goal Detail (post-MVP) |

**What determines the display model:** The target field in G-3 Goal Create/Edit. If a numeric target is set: quantifiable display. If the target field is left blank: narrative display. There is no goal-type selector. The data model determines the display model.

### 12.5 Progress Bar Rules

Applies to quantifiable goals only. Narrative goals do not display a progress bar under any circumstances.

- Full-width within card bounds
- Proportional fill based on current progress
- "X%" label adjacent to bar — not "X% complete" or "Y% remaining"
- Color: accent color fill on muted background track
- Does not animate on load for MVP
- If 0%: empty track shown — not hidden. Progress is beginning, not absent.
- If 100%: bar replaced by achievement marker. Full bar is not shown alongside achievement text.

### 12.6 "In Progress" Status Label Rules

Applies to narrative goals only. Quantifiable goals do not display an "In Progress" label.

- Text: "In Progress" — not "Active," not "Ongoing," not a custom status
- Size: 13sp on primary goal card, 12sp on secondary goal card
- Weight: secondary, muted — this is a confirmation, not a call to action
- Not tappable. Not a dropdown. Not an editable field on G-1.
- Replaced by "✓ Achieved [date]" when the goal is marked achieved
- Purpose: confirm the commitment is live. Nothing more.

---

## Section 13 — Goal Status Model

Four goal states exist:

| Status | Definition | G-1 Display — Quantifiable | G-1 Display — Narrative |
|--------|------------|---------------------------|-------------------------|
| **In Progress** | Chapter active, goal not yet achieved | Progress bar + %. In Active section. | "In Progress" status label. In Active section. |
| **Achieved** | Goal marked complete via goal achievement flow | "✓ Achieved [date]" replaces bar. Primary stays in GOAL section. Secondary moves to ACHIEVED section. | "✓ Achieved [date]" replaces label. Same section behavior. |
| **Not Achieved** | Chapter archived without goal completion | Only visible in Legacy (L-4). Not shown on G-1. | Only visible in Legacy (L-4). Not shown on G-1. |
| **Archived** | Chapter archived, goal achieved during chapter life | Only visible in Legacy (L-4). Not shown on G-1. | Only visible in Legacy (L-4). Not shown on G-1. |

**The Achieved state is display-identical for both models** except for the presence of the target/context line on quantifiable goals. The achievement marker, date format, and section behavior are the same. A narrative goal achieved is not a lesser achievement than a quantifiable one.

**Status transitions on G-1:**
- In Progress → Achieved: triggered externally (workout logging, manual completion in G-2)
- Achieved → Not Achieved: only possible via chapter archival without achievement (never while chapter is active)
- No status transition happens directly from G-1

**G-1 only shows In Progress and Achieved states.** Not Achieved and Archived states are Legacy territory.

---

## Section 14 — Goal ↔ Chapter Relationship

### 14.1 Structural Rules

- Every goal belongs to exactly one chapter
- A chapter may have zero, one, or unlimited goals
- G-1 always shows the goals of the athlete's current active chapter
- Goals cannot be moved between chapters
- When a chapter archives, its goals archive with it

### 14.2 Chapter Context on G-1

The chapter name appears in the identity block below the "Goals" header. This is not a navigation element — it is context. The athlete cannot navigate to L-3 from the chapter name display on G-1.

**Rationale:** G-1 is a focused surface. Adding a chapter tap would turn it into a chapter detail shortcut. If the athlete wants to manage their chapter, they go to L-3.

### 14.3 Chapter Archival Effect on G-1

When the athlete archives their active chapter:
- G-1 transitions to the "No Active Chapter" empty state
- All goals from the archived chapter are no longer shown on G-1
- Goals appear in Legacy (L-4 Archived Chapter Detail)

### 14.4 Chapter Creation Effect on G-1

When a new chapter is created (L-5):
- If goal created at chapter creation: G-1 shows that goal immediately
- If no goal created at chapter creation: G-1 shows the "Active Chapter, No Goals" empty state

### 14.5 Chapter Without Goals

A chapter without goals is valid. G-1 shows the chapter name and an invitation to add a goal. This is not an error state. The athlete is in a chapter. That matters. The goal is optional context.

---

## Section 15 — Goal ↔ Program Relationship

### 15.1 Programs Are Optional Context

A goal on G-1 may show an associated program name as supporting context. This is the only relationship shown. G-1 does not:
- Show the program's progress or state
- Allow the athlete to change the program association
- Gate goal actions on program state
- Show program details

### 15.2 When Program Association Appears

Program name appears on the Primary Goal card only, in 12sp muted text, in the format:
`[Program: Program Name]`

This appears when a program has been associated with this goal. Association is set in G-3 (Goal Create/Edit) or G-2 (Goal Detail). If no program association exists, the field is absent — no placeholder, no empty state.

### 15.3 Goal Completion Without a Program

Goal progress and achievement are fully independent of program state. An athlete with no active program can mark a goal as achieved. An athlete whose program is Graduated or Ended Early can still pursue their goal. The program is a tool that supports the goal — it does not define it.

### 15.4 Program Graduation and Goals

When a program graduates (via W-17 workout summary / M-4 modal), the goal associated with that program is not automatically marked achieved. Goal completion is a separate, deliberate action. The athlete decides when their goal has been accomplished — not the program.

---

## Section 16 — Goal Completion Rules

### 16.1 How Primary Goals Are Completed

Primary goal completion is triggered from G-2 Goal Detail (post-MVP: manual completion action). For MVP, completion may be triggered from a dedicated "Mark as Achieved" action surfaced in G-2.

Completion flow:
1. Athlete triggers "Mark as Achieved" from G-2
2. Confirmation prompt fires (lightweight — see Section 16.2)
3. M-3 Goal Achieved modal fires
4. Legacy Timeline entry created: "Goal Achieved: [Goal Name] | [Date]"
5. Home hero shifts to Priority 1 state
6. G-1 primary goal card transitions to Achieved state

### 16.2 Primary Goal Completion Confirmation

Before M-3 fires, a lightweight confirmation:

```
┌──────────────────────────────────────────────────────┐
│  Mark Goal as Achieved?                              │
│                                                      │
│  [Goal Name]                                         │
│                                                      │
│  This will be recorded in your legacy.               │
│                                                      │
│  [  Mark as Achieved  ]                              │
│  [  Cancel  ]                                        │
└──────────────────────────────────────────────────────┘
```

"This will be recorded in your legacy." — communicates permanence without pressure.

### 16.3 How Secondary Goals Are Completed

Secondary goal completion is triggered from G-2 (post-MVP). No modal fires for secondary goals. The goal card transitions to achieved state on G-1 and moves to the Achieved section. No home hero change. No Legacy Timeline entry for secondary goals.

### 16.4 Reversibility

**Primary goal achievement is not reversible from G-1.** Once M-3 has fired and the Legacy Timeline entry has been created, the achievement is a record. The only way to "un-achieve" a primary goal would be via a future moderation tool (post-MVP, admin only). No athlete-facing undo.

**Secondary goal achievement is not reversible from G-1.** Same principle — outcomes are records, not toggles.

---

## Section 17 — Goal Discontinuation Rules

### 17.1 No Goal-Level Abandonment

There is no "Remove Goal," "Abandon Goal," or "Delete Goal" action available on G-1 or in any active goal context. Goals cannot be removed once created while the chapter is active.

An athlete who wants to stop pursuing a goal, change their goal, or close out a training era has one path: archive the chapter via L-3 Chapter Detail.

### 17.2 Chapter Archival as the Discontinuation Path

When the athlete archives their chapter (L-3 → L-6 Chapter Reflection → chapter archival):
- Primary goal outcome is recorded: Achieved [date] or Not Achieved
- All secondary goal outcomes are recorded: Achieved [date] or Not Achieved
- Outcomes are permanent, sealed, immutable
- "Not Achieved" is a neutral, factual record — not a failure marker

### 17.3 What "Not Achieved" Means

"Not Achieved" means: the chapter closed without this goal having been completed. That is the full meaning. It does not mean:
- The athlete failed
- The goal was wrong
- The athlete should have tried harder
- The goal has no value

On G-1: "Not Achieved" is never shown — that state only exists in Legacy (L-4). G-1 deals only with in-progress and achieved goals.

### 17.4 Changing a Goal Within an Active Chapter

If an athlete wants to change their primary goal (e.g., the goal has evolved, the original goal was set too narrowly):

For MVP: there is no "change primary goal" action. The goal name and target are editable via G-2/G-3 until the chapter archives. The athlete can update the goal's name and target to reflect the evolved commitment. The goal remains the same record.

Post-MVP consideration: allowing a goal to be replaced within an active chapter (creating a new goal and archiving the old one) with a lightweight narrative reason. This is outside G-1's scope and requires a separate architecture decision.

---

## Section 18 — Navigation

### 18.1 Entry Points

| Entering From | State Shown |
|--------------|-------------|
| W-1 Workouts Hub → Chapter Context Card (goal element) | Active chapter's goals |
| H-1 Home → Chapter Hero Card (goal element) | Active chapter's goals |
| L-3 Chapter Detail → Goals section header | Active chapter's goals |

### 18.2 Exit Points

| Action | Destination |
|--------|------------|
| Back arrow | Returns to entering screen |
| Goal card tap | G-2 Goal Detail (post-MVP; no action if unavailable) |
| "Add a Supporting Goal" CTA | G-3 Goal Create (secondary goal) |
| "Add a Goal" CTA (empty state) | G-3 Goal Create (primary goal) |
| "Start a Chapter" CTA (no-chapter empty state) | L-5 Create Chapter |

### 18.3 G-1 Does Not Navigate To

- L-3 Chapter Detail (no chapter management from G-1)
- W-3 Program Detail (no program management from G-1)
- L-1 Legacy Hub (no history navigation from G-1)
- W-1 / H-1 (no deeper navigation except back)

---

## Section 19 — Mobile UX

### 19.1 Screen Type

Standard navigation stack screen. Top App Bar with back button. Tab Bar visible at bottom (tab depends on entry point). Not a modal sheet.

### 19.2 Scroll Behavior

Single vertical scroll. No tabs. Header scrolls with page — does not stick. "Add a Supporting Goal" CTA is positioned at the bottom of the scroll, after all goal sections. Athlete reviews their goals before reaching the action.

### 19.3 Top App Bar

- Title: "Goals" (fixed — not dynamic with chapter name)
- Left: back arrow, 44×44dp minimum
- Right: no overflow icon on G-1

### 19.4 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| Back arrow | 44×44dp |
| Primary goal card | Full width × 80dp minimum |
| Secondary goal card | Full width × 56dp minimum |
| Achieved secondary goal card | Full width × 48dp minimum |
| "Add a Supporting Goal" | Full width × 48dp |
| "Add a Goal" (empty state) | Full width × 48dp |
| "Start a Chapter" (empty state) | Full width × 48dp |
| Completion confirmation buttons | Full width × 52dp |

### 19.5 Portrait Orientation

G-1 is portrait only.

### 19.6 Accessibility Labels

**No active chapter:**
- Empty state: `accessibilityLabel` = "No active chapter. Goals live inside chapters. Start a chapter to begin pursuing a goal."
- "Start a Chapter" CTA: `accessibilityLabel` = "Start a chapter"

**Active chapter, no goals:**
- Empty state: `accessibilityLabel` = "No goals set for [Chapter Name]. What are you building toward?"
- "Add a Goal" CTA: `accessibilityLabel` = "Add a goal for [Chapter Name]"

**Primary goal card — quantifiable (In Progress):**
- `accessibilityLabel` = "[Goal Name], [X]% complete, in progress"
- If program association exists: append ", supported by [Program Name]"

**Primary goal card — narrative (In Progress):**
- `accessibilityLabel` = "[Goal Name], in progress"
- If program association exists: append ", supported by [Program Name]"

**Primary goal card (Achieved — either model):**
- `accessibilityLabel` = "[Goal Name], achieved [Month DD, YYYY]"

**Secondary goal card — quantifiable (Active):**
- `accessibilityLabel` = "[Goal Name], [X]% complete"

**Secondary goal card — narrative (Active):**
- `accessibilityLabel` = "[Goal Name], in progress"

**Secondary goal card (Achieved):**
- `accessibilityLabel` = "[Goal Name], achieved [Month DD, YYYY]"

**"Add a Supporting Goal" CTA:**
- `accessibilityLabel` = "Add a supporting goal for [Chapter Name]"

---

## Section 20 — Edge Cases

### 20.1 No Active Chapter

G-1 shows the "No Active Chapter" empty state. Back navigation returns to entering screen. No goals are shown.

### 20.2 Active Chapter with No Goals

G-1 shows the chapter name and the goal empty state. "Add a Goal" CTA is primary. No secondary goal section is shown.

### 20.3 Primary Goal at 0% Progress (Quantifiable)

Progress bar shows empty track. "0%" shown. This is not an empty state — the goal is active. No "you haven't started" messaging.

### 20.4 Very Long Goal Name

Goal name wraps to 2 lines maximum. Truncates with ellipsis at line 2 if exceeded. Full name visible in G-2 Goal Detail.

### 20.5 Many Secondary Goals (10+)

All secondary goals rendered in a single scrollable list within the Supporting Goals section. No pagination for MVP. Implementation may consider a soft visual separator after 5 goals (e.g., light divider) without truncating the list.

### 20.6 All Secondary Goals Achieved (Primary Still Active)

"Supporting Goals" section becomes empty — only the "ACHIEVED" section shows secondary goals. Primary goal remains in GOAL section. "Add a Supporting Goal" CTA remains available. The screen is not "done" — the primary goal is still in progress.

### 20.7 Primary Goal Achieved, No Secondary Goals

G-1 shows: primary goal card (Achieved state). No Supporting Goals section. No Achieved section (no secondary goals). "Add a Supporting Goal" CTA present. The athlete has achieved their primary goal. The chapter is still active. This is a valid complete state.

### 20.8 Primary Goal Achieved, All Secondary Goals Achieved

G-1 shows: primary goal card (Achieved state). No Supporting Goals section (all achieved). Achieved section (all secondary goals). "Add a Supporting Goal" CTA present. The athlete has completed all commitments in this chapter. The chapter is still active — they have not archived it. G-1 does not push them to archive.

### 20.9 No Target Set on Primary Goal (Narrative Display Model)

The target/context line is absent. No progress bar. No percentage. The goal renders in the narrative display model: goal name (18sp, primary weight) followed by "In Progress" status label. This is a first-class display state — not a degraded or incomplete card. No placeholder text, no prompt to add a target.

### 20.10 Program Association — Program Ended Early

If the program associated with a goal is in Ended Early state, the program name still appears in the goal card's program field. The program's state is not shown on G-1. Display is unchanged.

### 20.11 Program Association — Program Graduated

Same as 20.10. Program name shown. Graduation state not surfaced on G-1.

---

## Section 21 — Architecture Risks

### Risk 1 — Naming Conflict: L-7 / L-8 vs G-2 / G-3

**Issue:** The existing Master PRD names Goal Detail as L-7 and Goal Create/Edit as L-8. This spec establishes G-1 with a G- prefix for goals screens, implying G-2 (Goal Detail) and G-3 (Goal Create/Edit) as downstream screens. This creates a naming conflict that must be resolved before downstream specs are written.

**Recommendation:** Adopt G- prefix for all goal screens. Rename L-7 → G-2 and L-8 → G-3. Update all document references. This is a naming convention correction, not an architectural change — the screens' purpose and behavior remain identical.

**Risk level:** Medium. Causes cross-document confusion if not resolved before G-2/G-3 specs are written.

---

### Risk 2 — Goal Progress Update Mechanism — RESOLVED

**Decision (Critical Decisions Amendment 001, June 2026):** Hybrid Progress Model. Manual progress via G-2 "Update Progress" sheet is the authoritative mechanism. Automatic progress updates are permitted for quantifiable goals when the system can confidently map workout data to the goal's target type. Narrative goals are manual-only. Athletes may override auto-updated progress at any time via G-2.

**For G-1:** Progress bar renders the current progress value regardless of whether it was set manually or automatically. G-1 is display-only for progress. No changes to G-1 required.

**Risk level:** Resolved. See Critical Decisions Amendment 001 for full rules. G-2 v1.0 requires a Hybrid Progress Model section (pending Phase 2C).

---

### Risk 3 — Chapter Archival + Active Program Intersection — RESOLVED

**Decision (Critical Decisions Amendment 001, June 2026):** Independent Systems. Chapter archival (Sealing) has no effect on Program state. A program that is Active when a chapter is Sealed remains Active — it is not ended, paused, or modified. Programs may span multiple chapters.

**For G-1:** Active goals are archived with the chapter when it is Sealed. Programs continue independently and are not archived with the chapter. Chapter archival is not blocked by an Active program.

**Risk level:** Resolved. See Critical Decisions Amendment 001 for full rules.

---

### Risk 4 — Goal Achievement Trigger Not Specified

**Issue:** G-1 shows primary goals in Achieved state after completion, but the trigger for completion is defined as "from G-2" (post-MVP). For MVP, there is no clear path for the athlete to mark a goal as achieved from within the app. This creates a state (Achieved) that cannot be reached.

**Recommendation:** For MVP, include a "Mark as Achieved" action within G-2 Goal Detail. If G-2 is post-MVP, the completion path must be surfaced somewhere — either G-1 goal card long-press, or a confirmation flow within the workout summary path. This must be resolved before MVP ships.

**Risk level:** High. The M-3 modal and Home hero Priority 1 state both depend on this trigger.

---

### Risk 5 — Unlimited Secondary Goals Could Overwhelm G-1

**Issue:** The architecture supports unlimited secondary goals per chapter. An athlete with 20+ secondary goals would have an unwieldy G-1 scroll. This has no impact on current MVP, but sets a bad precedent.

**Recommendation:** No limit for MVP. Consider a soft UX guardrail in G-3: after 5–7 secondary goals, show a gentle notice ("You have [N] supporting goals — consider focusing on fewer commitments"). Do not enforce a hard cap. Post-MVP consideration.

**Risk level:** Low for MVP. Monitor after launch.

---

### Risk 6 — No Path to End a Secondary Goal Without Archiving Chapter (MVP Rule + Backlog Direction)

**Issue:** An athlete who creates a secondary goal that later becomes irrelevant has no way to remove it without archiving the entire chapter. This creates friction when the chapter is still valid (primary goal still matters) but a secondary goal has been outgrown.

**MVP Rule (locked):** No deletion, no abandonment, no removal. Goals resolve through the chapter lifecycle. Secondary goals that were created and then not achieved are a valid legacy record. "Not Achieved" at chapter archival is the neutral, factual outcome. This is correct for MVP.

**Architecture Backlog — Future Direction: Deprioritized State**

A future "Deprioritized" state for secondary goals should be formally tracked as a post-MVP architectural direction.

Rules when implemented:
- Applies to secondary goals only. Primary goals are chapter-defining commitments — if the primary goal is no longer relevant, the athlete should archive the chapter.
- A deprioritized secondary goal is removed from the active G-1 surface.
- The historical record is preserved — the goal appears in the archived chapter record as deprioritized, not deleted and not failed.
- No failure language. No explanation required. The action is lightweight and neutral.
- "Deprioritized" is a distinct outcome from Achieved and Not Achieved. It means: this goal was created, was valid, and the athlete's focus shifted. That is the full meaning.
- Deprioritized goals do not appear in a "Deprioritized" section on G-1. They are absent from the active view.

This decision does not require any G-1 changes for MVP. When the backlog item is prioritized, it will require updates to G-1 (removal from active surface), G-2 (deprioritize action), and L-4 (archived chapter display of deprioritized outcomes).

**Risk level:** Low for MVP. Backlog item logged.

---

## Section 22 — Downstream Dependencies

### G-2 — Goal Detail

Screens referenced as "post-MVP" in this spec. Must specify:
- Full goal detail layout (name, target, progress history, program association)
- "Mark as Achieved" action (primary goal and secondary goals)
- Progress update mechanism (manual entry, workout attribution)
- Edit goal action → G-3

**Naming note:** If G- prefix is adopted, G-2 replaces L-7 in all documentation.

---

### G-3 — Goal Create / Edit

Minimum fields confirmed (name + target). Must specify:
- Full create flow for primary goal vs. secondary goal
- Target field as optional — determines quantifiable vs. narrative display model
- Optional program association selection
- Edit flow (same screen, different mode)
- Validation rules (name required; target optional)
- How G-3 is entered during chapter creation (OB / L-5) vs. from G-1

**Naming note:** If G- prefix is adopted, G-3 replaces L-8 in all documentation.

---

### M-3 — Goal Achieved Modal

Existing spec. G-1 depends on M-3 firing after primary goal completion. M-3 must:
- Accept the goal name and chapter name as parameters
- Return to G-1 after dismissal (showing the primary goal in Achieved state)
- Create the Legacy Timeline entry

---

### H-1 — Home Hero Priority 1 State

G-1 depends on the Priority 1 home hero state changing after primary goal achievement. H-1 must correctly handle: athlete navigates from G-1 achievement flow → M-3 fires → M-3 dismisses → Home hero has updated. No stale state on next Home visit.

---

### L-3 — Chapter Detail

G-1 and L-3 both show goals. The two screens must stay in sync:
- Progress updates made from G-2 must reflect on both G-1 and L-3
- Achievement recorded from G-2 must reflect on both
- Adding a goal from G-1 ("Add a Supporting Goal") must reflect in L-3's goals section

---

### L-4 — Archived Chapter Detail

After chapter archival, goals move from G-1 to L-4. L-4 must render goal outcomes (Achieved / Not Achieved) accurately, using the date of achievement where applicable.

---

## Section 23 — Conflicts with Existing Architecture

### Conflict 1 — W-1 Chapter Context Card

W-1 currently shows the primary goal name in the Chapter Context Card. G-1 now exists as the full goals surface. The Chapter Context Card tap behavior must be reconciled: does tapping the chapter card navigate to L-3 Chapter Detail, or to G-1? Current spec says L-3.

**Recommendation:** Chapter Context Card tap → G-1 if the athlete taps specifically on the goal element; → L-3 if they tap elsewhere on the chapter card. This requires W-1 to be updated to route goal taps to G-1. This is a W-1 update, not a conflict resolution — W-1 v1.1 should be amended.

---

### Conflict 2 — L-3 Chapter Detail Goals Section

L-3 includes a goals section. G-1 now provides a dedicated goals surface. There is overlap. The L-3 goals section should remain but function as a summary — showing a compact view that links to G-1 ("View Goals →") rather than fully duplicating the G-1 experience.

**Recommendation:** L-3 goals section keeps summary cards (name + progress bar or "In Progress" label). Add "View Goals" link at section header that navigates to G-1. Full goal management happens in G-1 / G-2 / G-3. This is an L-3 update.

---

### Conflict 3 — L-7 / L-8 Naming

See Architecture Risk 1. L-7 and L-8 references must be updated to G-2 and G-3 across all documents that reference them.

---

## Section 24 — Validation Checklist

### Screen Structure
- [ ] Top App Bar: back arrow + "Goals" label, no overflow
- [ ] Identity block: "Goals" 22sp + chapter name 13sp muted
- [ ] Single vertical scroll — no tabs
- [ ] Tab Bar visible at bottom

### No Active Chapter State
- [ ] Empty state: icon + "Goals live inside chapters." + "Start a chapter to begin pursuing a goal."
- [ ] CTA: "Start a Chapter" → L-5
- [ ] No past goals shown
- [ ] No shame language

### Active Chapter, No Goals State
- [ ] Chapter name in identity block
- [ ] "GOAL" section label
- [ ] Empty state: "What are you building toward?" + "Define the goal for this chapter."
- [ ] CTA: "Add a Goal" → G-3 (creates primary goal)
- [ ] No secondary goals section
- [ ] No statistics or past data

### Active Chapter, Primary Goal In Progress
- [ ] "GOAL" section label (singular)
- [ ] Primary goal card rendered per display model (quantifiable or narrative — see Goal Cards sections)
- [ ] "SUPPORTING GOALS" section — shown only if secondary goals exist
- [ ] Secondary goal cards rendered per display model
- [ ] "Add a Supporting Goal" CTA — secondary button, full width
- [ ] No urgency signals, no deadlines, no days remaining

### Primary Goal Achieved State
- [ ] Primary goal card: "✓ Achieved [date]" replaces progress bar (quantifiable) or "In Progress" label (narrative)
- [ ] Primary goal card remains in "GOAL" section — not moved
- [ ] "SUPPORTING GOALS" section — shown only if unachieved secondary goals remain
- [ ] "ACHIEVED" section — shown only if secondary goals have been achieved
- [ ] Achieved secondary goal cards: muted style, "✓ [date]" shown, no progress bar or "In Progress" label
- [ ] "Add a Supporting Goal" CTA remains available
- [ ] No re-celebration, no M-3 replay, no confetti

### Goal Cards — Quantifiable (target set at creation)
- [ ] Primary goal card: name 18sp primary weight, target/context 14sp secondary
- [ ] Primary goal card: progress bar proportional, not hidden when 0%
- [ ] Primary goal card: "X%" label beside bar — not "X% remaining"
- [ ] Program association shown on primary card only, 12sp muted, absent if no association
- [ ] Secondary goal card: name 15sp, progress bar + %
- [ ] Achieved state: "✓ Achieved [date]" replaces progress bar on both primary and secondary
- [ ] Full card tappable → G-2 (post-MVP; no action if unavailable)
- [ ] No swipe actions
- [ ] No delete action on any goal card

### Goal Cards — Narrative (no target set at creation)
- [ ] Primary goal card: name 18sp primary weight, no target/context line
- [ ] Primary goal card: "In Progress" label — 13sp, secondary, muted — no progress bar
- [ ] "In Progress" label is NOT tappable, NOT a dropdown, NOT editable on G-1
- [ ] Program association shown on primary card only, 12sp muted, absent if no association
- [ ] Secondary goal card: name 15sp, "In Progress" label 12sp muted — no progress bar
- [ ] Achieved state: "✓ Achieved [date]" replaces "In Progress" label — identical to quantifiable achieved state
- [ ] Full card tappable → G-2 (post-MVP; no action if unavailable)
- [ ] No swipe actions
- [ ] No delete action on any goal card

### Goal Display Model
- [ ] Display model determined by presence or absence of target field — no goal-type selector
- [ ] Target field present at creation → quantifiable display (progress bar + %)
- [ ] Target field absent at creation → narrative display ("In Progress" status, no bar)
- [ ] Achieved state visually identical for both models (aside from target/context line on quantifiable)
- [ ] Both display models are first-class — no visual hierarchy between them
- [ ] Achieved secondary goal card (Completed section): muted style, date shown, no progress bar or "In Progress" label

### Goal ↔ Chapter Relationship
- [ ] Chapter name shown in identity block (not tappable)
- [ ] G-1 shows only current active chapter's goals
- [ ] No goals from archived chapters shown on G-1
- [ ] Chapter archival → G-1 shows "No Active Chapter" state
- [ ] New chapter creation → G-1 reflects new chapter's goals (or empty state)

### Goal ↔ Program Relationship
- [ ] Program association shown on primary goal card only (when set)
- [ ] No program management actions on G-1
- [ ] Goal progress independent of program state
- [ ] Goals shown normally when no program exists

### Goal Completion
- [ ] "Mark as Achieved" trigger deferred to G-2 (flag if MVP ships without this path)
- [ ] Primary goal completion → M-3 modal fires
- [ ] Primary goal card transitions to Achieved state
- [ ] Secondary goal completion → no modal
- [ ] Achieved secondary goal → moves to ACHIEVED section
- [ ] No undo / un-achieve action on G-1

### Goal Discontinuation
- [ ] No "Remove Goal" action anywhere on G-1
- [ ] No "Abandon Goal" action anywhere on G-1
- [ ] No "Delete Goal" action anywhere on G-1
- [ ] No "Not Achieved" marker on any in-progress goal
- [ ] Chapter archival is the only discontinuation path

### Navigation
- [ ] Back arrow returns to entering screen (W-1, H-1, or L-3)
- [ ] Goal card tap → G-2 (post-MVP; no action if unavailable)
- [ ] "Add a Supporting Goal" → G-3 (secondary goal creation)
- [ ] "Add a Goal" (empty state) → G-3 (primary goal creation)
- [ ] "Start a Chapter" → L-5
- [ ] No navigation to L-3, W-3, or L-1 from G-1

### Mobile UX
- [ ] All tap targets meet minimums
- [ ] Portrait orientation only
- [ ] Accessibility labels present for all goal cards and CTAs per state — both quantifiable and narrative variants
- [ ] Progress bars have accessible labels (quantifiable goals only)
- [ ] "Not Achieved" language not present anywhere on G-1

### Architecture Risks Acknowledged
- [ ] L-7 / L-8 naming decision logged as open — must resolve before G-2/G-3 specs written
- [ ] Goal progress update mechanism flagged — must resolve before G-2 spec
- [ ] Chapter archival + active program intersection flagged — must resolve before archival UX
- [ ] Goal achievement trigger (MVP path) flagged — must resolve before MVP ships
- [ ] Deprioritized state (secondary goals only) logged as architecture backlog — no MVP changes required

---

## Change Log

### v1.1 — June 2026

Adopted dual goal display model. Quantifiable goals (target field set at creation) show progress bar and percentage. Narrative goals (no target set) show "In Progress" status label only — no progress bar, no percentage. Display model is determined automatically by presence or absence of the target field; no goal-type selector exists. Goal card design (Section 12), goal status model (Section 13), accessibility labels (Section 19.6), and validation checklist (Section 24) updated accordingly.

Added Architecture Backlog entry: future "Deprioritized" state for secondary goals only (Section 21, Risk 6). MVP discontinuation rule unchanged — no deletion, no abandonment, goals resolve through chapter archival.

Status updated from Lock Candidate to Locked.

### v1.0 — June 2026

Initial specification. G-1 Goal Hub created as part of Phase 2B wireframe documentation. Establishes G- prefix naming convention for goal screens. Defines five screen states (no active chapter, active chapter with no goals, primary goal in progress, primary goal achieved with chapter still active). Dual-section active surface: primary goal pinned in GOAL section; secondary goals in SUPPORTING GOALS section; achieved secondary goals in ACHIEVED section. Goal discontinuation rules: no deletion, no abandonment, goals resolve through chapter lifecycle. Eight architecture decisions documented. Six architecture risks identified. Downstream dependencies for G-2, G-3, M-3, H-1, L-3, and L-4 specified.

---

*Forge Legacy Goal Hub Wireframe Specification — G-1*
*v1.1 — June 2026*
*Authority: Forge Legacy Master PRD Section 9, Product DNA, Program-Architecture-Amendment-001*
