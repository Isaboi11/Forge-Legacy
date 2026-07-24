# P-1 Amendment 001 — Progress Entry Point
## Profile Wireframe Spec Amendment v1.0 — June 2026

**Status:** LOCKED

**Type:** Screen Specification Amendment

**Date:** June 2026

**Amends:** Profile-Wireframe-Spec-P1.md v1.0 (LOCKED)

**Authority Chain:**
- Profile-Wireframe-Spec-P1.md v1.0 (LOCKED — amended document)
- P-2-Progress-Hub-Architecture.md v1.1 (LOCKED — navigational authority)
- P-2-Progress-Hub-Spec.md v1.0 (LOCKED — navigational authority)

**Origin:**
This amendment was identified in P-2-Progress-Hub-Architecture.md as OQ-2 and confirmed in P-2-Progress-Hub-Spec.md Section 13.2 (What This Spec Defers): "P-1 Amendment 001 (Progress entry point — already identified in P-2 Architecture)." The amendment is commissioned to add the P-2 Progress Hub as a navigable destination from P-1.

**Amendment Log:** None at v1.0.

---

## Section 1 — Amendment Summary

### 1.1 What This Amendment Adds

This amendment adds a single navigation row — the **Progress row** — to P-1 Profile. The Progress row navigates to P-2 Progress Hub.

The Progress row:
- Is always visible
- Follows existing P-1 single-row navigation patterns (consistent with the Settings row)
- Is placed between the existing RANK section and the existing HONORS section
- Pushes P-2 Progress Hub onto the Profile modal navigation stack
- Has no empty state — the row is always present regardless of athlete state

### 1.2 What This Amendment Does Not Change

This amendment does not:
- Redesign the P-1 information hierarchy
- Modify any existing P-1 section
- Add new progress functionality
- Add new rank functionality
- Change the RANK section, its content, or its tap destination (P-3 Rank Detail)
- Change any existing navigation table entry
- Affect any screen other than P-1

### 1.3 Affected P-1 Sections

| Section | Change |
|---|---|
| Section 2 — Information Hierarchy | Progress row inserted between TIER 3 (Rank) and TIER 4 (Honors) |
| Section 3 — Full Scroll Order | Wireframe updated to include Progress row |
| Section 9 — Settings Entry Point | Navigation table (Section 9.3) updated with Progress row entry |
| Section 13 — Mobile UX | Navigation stack (13.2) and tap targets (13.4) updated |
| Section 14 — Validation Checklist | New checklist items added for Progress row |

---

## Section 2 — Placement Decision

### 2.1 Position in Scroll Order

The Progress row is placed **between the RANK section and the HONORS section**.

**Rationale:**

The RANK section (TIER 3) surfaces the athlete's rank as an identity marker and routes to P-3 Rank Detail for rank-specific depth. The Progress row routes to P-2 Progress Hub — the comprehensive development surface that contains rank progress, training consistency, goals, and the full rank journey picture.

Placing Progress immediately after Rank creates a coherent development cluster:
- **RANK** → who I have become (identity signal) → P-3 Rank Detail (rank-specific depth)
- **PROGRESS** → how my development is going (navigational entry) → P-2 Progress Hub (comprehensive picture)

Together these serve athletes who want to explore their development in either direction — the rank-specific path (P-3) or the full-picture path (P-2). Both are available without forcing a choice at the section level.

This placement also keeps Honors and Accomplishments together as the retrospective record section (what was earned, what was declared), which is their existing thematic role.

**The updated section order:**

| Section | Tier | Destination |
|---|---|---|
| Identity Header | TIER 1 | P-2 Edit Profile (via "Edit Profile" CTA) |
| Current Chapter Card | TIER 2 | L-3 Chapter Detail (Active) |
| Rank | TIER 3 | P-3 Rank Detail |
| **Progress** | **TIER 3B (new)** | **P-2 Progress Hub** |
| Honors | TIER 4 | L-10 Honors List |
| Accomplishments | TIER 5 | L-12 / L-14 |
| Settings | TIER 6 | P-4 Settings Root |

The TIER 3B designation marks the insertion point without renumbering existing tiers.

---

## Section 3 — Progress Row Specification

### 3.1 What Appears

```
─────────────────────────────────────────────────────────
Progress                                        [  →  ]
─────────────────────────────────────────────────────────
```

- Row label: "Progress" — 15sp, primary text
- [→] affordance — full row is tappable → P-2 Progress Hub
- Row minimum height: 56dp
- No section label above the row
- No dynamic content displayed on P-1 — the row is navigation only

### 3.2 Pattern Basis

The Progress row follows the **single-row navigation pattern** established by the Settings row (P-1 Section 9.1). Both are navigation-only entry points. Both use 15sp primary text, [→] affordance, and 56dp minimum height. Neither surfaces dynamic content on P-1.

The distinction between the two rows:
- **Settings** → maintenance infrastructure (P-4 Settings Root)
- **Progress** → development picture (P-2 Progress Hub)

The same visual pattern correctly communicates that both are navigation entry points, not content-displaying sections.

### 3.3 Navigation Behavior

Tapping the Progress row → **P-2 Progress Hub**, pushed onto the Profile modal navigation stack.

This is consistent with the existing modal stack navigation pattern for Profile-routed screens:
- The modal remains open
- P-2 Progress Hub pushes onto the modal's navigation stack
- The back affordance on P-2 returns to P-1

**P-2 opens in its default state (Overview Tab).** No special entry state is applied when arriving from P-1. The athlete arrives at the same P-2 surface they would reach from any other entry point.

### 3.4 Visibility

The Progress row is **always visible**. There is no condition under which it is hidden, collapsed, or replaced.

| Athlete State | Progress Row Visible? |
|---|---|
| New athlete (no sessions) | Yes |
| Active athlete | Yes |
| Import athlete | Yes |
| Legacy-ranked athlete | Yes |
| Athlete with no active chapter | Yes |
| Athlete with no honors | Yes |

### 3.5 Empty-State Behavior

The Progress row has no empty state of its own. The row always appears and always navigates to P-2. P-2 manages its own empty and edge states internally (defined in P-2-Progress-Hub-Spec.md Section 9).

### 3.6 What the Progress Row Does Not Show

| Excluded Element | Reason |
|---|---|
| Current rank name or sub-tier | Rank identity is surfaced in the Identity Header and the RANK section |
| Active week count or progress summary | Counted metrics are P-2-internal; P-1 is not a data surface |
| Sub-tier progress bar or fill | Progress bars belong to P-2 and P-3, not P-1 |
| "Updated" indicator or subtierAdvancePending state | Sub-tier advance surfacing is scoped to P-2 (P-2-Progress-Hub-Spec.md §2.5); P-1 does not participate |
| What's Next preview | What's Next is P-2-internal |
| Goal count or status | Goal data belongs on P-2 |

---

## Section 4 — Updated Wireframe (Section 3 of P-1)

The full scroll order wireframe from P-1 Section 3 is updated to include the Progress row. Unchanged sections are shown in abbreviated form for readability.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ─────  (handle bar)                           [×]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Profile Photo — 88dp circle, centered]                │  ← TIER 1: Identity Header
│                                                         │
│  [Display Name — 22sp, centered, primary weight]        │
│  [Athlete Type — 14sp, secondary, centered]             │
│  [Rank Name · Sub-tier — 14sp, secondary, centered]     │
│  Forging since [Month Year] — 13sp, secondary, centered │
│                                                         │
│  [  Edit Profile  ]                                     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │  ← TIER 2: Chapter Card
│  │  [Chapter Name — 18–20sp, primary weight]       │   │
│  │  [Primary Goal — 14sp, secondary]               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  RANK                                                   │  ← TIER 3: Rank
│  [Rank Name] · [Sub-tier]                    [  →  ]   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Progress                                    [  →  ]   │  ← TIER 3B: Progress (NEW)
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  HONORS  12                              View all  →   │  ← TIER 4: Honors
│  First Chapter Completed                               │
│  50 Workouts Logged                                    │
│  First Goal Achieved                                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ACCOMPLISHMENTS  7                      View all  →   │  ← TIER 5: Accomplishments
│  Marathon Finisher                                     │
│  315 lb Bench Press                                    │
│  Spartan Race Finisher                                 │
│  [  + Add Accomplishment  ]                             │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Settings                                    [  →  ]   │  ← TIER 6: Settings
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Section 5 — Updated Navigation Table (P-1 Section 9.3)

The Settings Hierarchy table from P-1 Section 9.3 is updated to include the Progress row.

| Screen | Access Path from P-1 |
|--------|---------------------|
| Edit Profile | "Edit Profile" CTA in Identity Header |
| P-2 Progress Hub | **Progress row (NEW)** |
| P-3 Rank Detail | Rank section tap |
| P-4 Settings Root | Settings row at bottom of P-1 |
| P-5 Notifications | P-4 Settings Root → Notifications |
| P-6 Privacy | P-4 Settings Root → Privacy |
| P-7 Connected Apps | P-4 Settings Root → Connected Apps |
| P-8 Subscription | P-4 Settings Root → Subscription |
| P-9 Delete Account / Export | P-4 Settings Root → Account |

---

## Section 6 — Updated Navigation Stack (P-1 Section 13.2)

The modal navigation stack table from P-1 Section 13.2 is updated to include P-2 Progress Hub.

| Destination | Behavior |
|-------------|---------|
| Edit Profile | Pushes onto modal navigation stack |
| **P-2 Progress Hub** | **Pushes onto modal navigation stack (NEW)** |
| P-3 Rank Detail | Pushes onto modal navigation stack |
| P-4 Settings Root | Pushes onto modal navigation stack |
| P-5 through P-9 (via P-4) | Continue on modal navigation stack |

Navigation to Legacy content (L-3, L-10, L-12, L-14) and Legacy creation (L-5) remains unchanged: modal closes, Legacy tab activates, destination opens in the Legacy tab navigation stack.

---

## Section 7 — Updated Tap Targets (P-1 Section 13.4)

The tap targets table from P-1 Section 13.4 is updated to include the Progress row.

| Element | Minimum Size |
|---------|-------------|
| [×] dismiss button | 44×44dp |
| Profile photo (tappable) | 88dp (inherits photo size) |
| "Edit Profile" Secondary CTA | Full width × 44dp |
| Chapter card (tappable) | Full width × card height (min 72dp) |
| Rank row (tappable) | Full width × 56dp |
| **Progress row (tappable)** | **Full width × 56dp (NEW)** |
| "View all →" Honors | 44dp height, right-aligned tap region ≥ 44dp |
| Honor name rows | Full width × 44dp |
| "View all →" Accomplishments | 44dp height, right-aligned tap region ≥ 44dp |
| Accomplishment name rows | Full width × 44dp |
| "+ Add Accomplishment" CTA | Full width × 44dp |
| Settings row | Full width × 56dp |

---

## Section 8 — Accessibility

The accessibility label table from P-1 Section 13.9 is updated to include the Progress row.

**Progress row:** `accessibilityLabel` = "Progress. Double-tap to view Progress Hub."

This follows the pattern of the Rank row and Settings row accessibility labels in the existing spec.

---

## Section 9 — Validation Checklist Updates

The following items are added to the P-1 Validation Checklist (Section 14). They are appended to the **Navigation** and **What Does NOT Appear on P-1** subsections.

### Addition to Navigation Checklist

- [ ] Progress row present between RANK section and HONORS section
- [ ] Progress row: "Progress" label, 15sp, primary text
- [ ] Progress row: [→] affordance present, full row tappable
- [ ] Progress row: minimum height 56dp
- [ ] Tapping Progress row → P-2 Progress Hub (pushes onto modal navigation stack)
- [ ] Progress row visible in all athlete states (new athlete, active athlete, import athlete, Legacy athlete)
- [ ] Progress row has no empty state — no condition under which it is hidden or altered
- [ ] P-2 Progress Hub opens in default state (Overview Tab) when arriving from P-1
- [ ] Back navigation from P-2 returns to P-1 (modal remains open)

### Addition to What Does NOT Appear on P-1

- [ ] No progress bars on P-1 (bars belong to P-2 and P-3)
- [ ] No sub-tier advance "Updated" indicator on P-1 (scoped to P-2 Rank Journey Preview)
- [ ] No active week count or progress summary on the Progress row
- [ ] No goal count or status on the Progress row
- [ ] No What's Next preview on P-1

---

## Section 10 — Relationship to P-2 and P-3

### 10.1 Progress Row vs. Rank Row

The Progress row and the Rank row serve distinct purposes and navigate to distinct screens.

| | Rank Row | Progress Row |
|---|---|---|
| Label | "[Rank Name] · [Sub-tier]" | "Progress" |
| Content surfaced on P-1 | Current rank and sub-tier | None |
| Destination | P-3 Rank Detail | P-2 Progress Hub |
| Scope of destination | Rank-specific: rank ladder, rank history, rank journey detail | Comprehensive: rank journey, training consistency, What's Next, goals |

These are not redundant. P-3 is the rank-specific depth screen. P-2 is the comprehensive development surface. Athletes who want to investigate their rank journey specifically use the Rank row → P-3. Athletes who want the full development picture use the Progress row → P-2. P-2 includes a Rank Journey Preview that routes deeper to P-2.2, which covers different ground than P-3.

### 10.2 No Duplication of P-2 Content on P-1

P-1 does not surface any P-2 data. The Progress row is a navigation entry point only. Athletes see rank (identity level) on P-1; they navigate to P-2 to see rank progress, training data, and development signals.

This is consistent with P-1's governing scope:
> **What P-1 does NOT answer:**
> - Am I ahead or behind on my training consistency?
> - What should I do next?

These questions belong to P-2. The Progress row gives athletes a clear path to them.

---

## Section 11 — Amendment Decision Record

| Decision ID | Decision |
|---|---|
| **P1A1-D1 — Placement** | Progress row placed between RANK section and HONORS section. Rationale: thematic adjacency to Rank (development cluster), separation from retrospective sections (Honors, Accomplishments). |
| **P1A1-D2 — Row pattern** | Single-row navigation pattern, consistent with Settings row. No section label above the row. No dynamic content on P-1. Label: "Progress." |
| **P1A1-D3 — Navigation behavior** | Tapping Progress row pushes P-2 Progress Hub onto the Profile modal navigation stack. Modal stays open. Consistent with P-3 Rank Detail and P-4 Settings Root behavior. |
| **P1A1-D4 — No empty state** | Progress row is always visible. All athlete states show the row. P-2 handles its own empty states internally. |
| **P1A1-D5 — No P-2 content on P-1** | Progress row is navigation only. No progress bars, no rank advance indicators, no What's Next preview, no goal counts appear on the P-1 row. P-1 is not a data surface. |
| **P1A1-D6 — P-2 opens in default state** | P-2 Progress Hub opens to its default Overview Tab when arriving from P-1. No special entry state applied. P-1 does not inject a target scroll position or tab into P-2. |

---

## Section 12 — Lock Recommendation

**LOCKED.**

This amendment has no open questions. The Progress row specification is complete:
- Placement defined (between RANK and HONORS)
- Row format defined (single-row navigation pattern, "Progress" label, 56dp)
- Navigation behavior defined (modal stack push → P-2 Progress Hub, default state)
- Empty-state behavior defined (none — always visible)
- All affected P-1 sections updated
- Validation checklist items added

Pre-lock actions required: none.

---

*P-1 Amendment 001 — Progress Entry Point*
*v1.0 — June 2026*
*Amends: Profile-Wireframe-Spec-P1.md v1.0*
*Origin: P-2-Progress-Hub-Architecture.md OQ-2, confirmed in P-2-Progress-Hub-Spec.md §13.2*
*Authority: P-2-Progress-Hub-Architecture.md v1.1 (LOCKED), P-2-Progress-Hub-Spec.md v1.0 (LOCKED)*
*Status: LOCKED*
