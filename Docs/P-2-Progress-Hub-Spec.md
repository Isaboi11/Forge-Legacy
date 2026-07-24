# P-2 Progress Hub Spec
## Screen Specification v1.0 — June 2026

**Status:** LOCKED v1.0

**Type:** Screen Specification

**Date:** June 2026

**Authority Chain:**
- P-2-Progress-Hub-Architecture.md v1.1 (LOCKED — architectural authority)
- Rank-System-Architecture.md v1.0 (LOCKED — rank architecture authority)
- Rank-Computation-Model.md Sessions 1–5 (LOCKED v1.0 — computational authority)
- Rank-Calibration-Decisions.md v1.0 (LOCKED — calibration authority)

**Relationship to P-2 Architecture:**
P-2-Progress-Hub-Architecture.md is the architectural authority for the Progress Hub. This document is the screen-level specification. It works within the locked architecture and does not modify it. Anything not redefined here is governed by the Architecture document as written.

**Primary Purpose:**
This document resolves TBD-2 (Sub-tier Surfacing Mechanism) and provides the screen-level wireframe specification for the Rank Journey components of P-2, including:
- Sub-tier surfacing mechanism (TBD-2 resolution)
- Rank Journey Preview component (Overview Tab)
- P-2.2 Rank Journey Detail sub-screen
- No Hidden Blockers complete logic
- What's Next rank-specific content (Priority 3)
- Rank readiness communication
- Signal visibility rules for rank-related content
- Rank-specific empty and edge states

**Downstream Dependents:**
- P-3 Rank Detail (blocked on this spec + TBD-12 data model completion)
- O-2 First-Time Setup (Amendment required per Q8 decision — athlete type declaration)
- P-1 Profile Amendment 001 (already identified in P-2 Architecture)

**Amendment Log:** None at v1.0.

**Decision Record:** OQ-P2S-1 through OQ-P2S-4 resolved June 2026 — see Section 14.

---

## Section 1 — Document Scope

### 1.1 What This Document Specifies

This document specifies the screen-level behavior of the Progress Hub's rank-related components. It is organized around the deliverables commissioned for this spec:

1. **TBD-2 Resolution** — The mechanism by which athletes discover sub-tier promotions
2. **P-2 Information Architecture** — Structure of rank-related sections within the established screen
3. **Rank Journey Preview** — Component wireframe for the Overview Tab
4. **P-2.2 Rank Journey Detail** — Full sub-screen wireframe
5. **No Hidden Blockers** — Complete triggering logic, message hierarchy, and copy principles
6. **What's Next Rank Content** — Priority 3 specification (now fully resolvable with locked rank thresholds)
7. **Signal Visibility Rules** — What athletes see, what they do not, and how
8. **Empty and Edge States** — New athlete, import athlete, prestige rank, Legacy state
9. **Navigation Map** — All tap destinations from rank-related components
10. **Refinement Report** — Analysis and trade-off documentation for TBD-2
11. **Open Questions** — User decisions required before this document can be locked

### 1.2 What This Document Does Not Change

This document does not redesign the rank system. It does not modify:
- Family promotion thresholds (RCM §14)
- Sub-tier thresholds (RCM §13)
- Promotion spacing values (RCM §15)
- Calibration decisions Q1–Q14 (Rank-Calibration-Decisions.md)
- P-2 screen structure, navigation, or architecture decisions PH-D1–PH-D25

---

## Section 2 — TBD-2 Resolution: Sub-tier Surfacing Mechanism

### 2.1 The Problem

RS-D14 establishes that sub-tier advancement triggers no M-1 ceremony. The promotion queue delivers sub-tier advances, but the delivery surface is undefined. RSA §13.2 states:

> "Sub-tier advancement surfacing: TBD-2. The most likely surfaces are P-2 Progress Hub Rank Journey Preview and What's Next section."

Without a surfacing mechanism, athletes who advance from Foundation · I to Foundation · II have no way to discover the change other than noticing their rank display changed — a silent, unrewarding experience for a genuine development milestone.

### 2.2 Constraints

The surfacing mechanism must satisfy all of the following:

| Constraint | Source | Implication |
|---|---|---|
| No M-1 ceremony | RS-D14 | Sub-tier advance cannot trigger a modal, ceremony, or pop-up interruption |
| No push notification spam | Product DNA | Routine progress markers do not warrant push notifications |
| P-2 is the primary rank progress surface | RSA §17.3 | The mechanism must route through P-2 |
| Guided Transparency | RSA §17 | Athletes see direction, not formulas |
| Sub-tier is a progress marker, not an identity shift | RSA §13.1 | The experience should feel like progress, not achievement |
| Spacing must be respected | RCM §15 | The advance is not surfaced until the promotion queue delivers it (spacing elapsed) |

### 2.3 Options Evaluated

**Option A — Silent Update**
The rank display in Hero and Rank Journey Preview updates when the promotion fires. No indicator, no acknowledgment. The athlete discovers the new sub-tier when they open P-2 and notice it changed.

**Option B — Updated State Badge on Rank Journey Preview**
When a pending sub-tier advance is delivered, the Rank Journey Preview displays a subtle "Updated" indicator on the rank badge. The indicator clears when the athlete views P-2.2 Rank Journey Detail. This gives athletes a discoverable signal that something changed without requiring a ceremony.

**Option C — What's Next Acknowledgment Card**
A dedicated What's Next card surfaces the advance: "You've advanced to [Rank] · [Sub-tier]." It occupies the highest priority slot in What's Next and clears when dismissed or on the next P-2 visit.

**Option D — Workout Summary (W-17) Mention**
If the session that triggers a sub-tier advance (after spacing) is logged natively, a brief mention appears on the W-17 summary screen at the end of that session. "Your rank journey has updated — see it in Progress."

**Option E — In-App Notification (No Push)**
An in-app notification fires at the moment the promotion queue delivers the advance. It is visible in a notification tray, not as a push notification. Tap → P-2.2.

### 2.4 Tradeoffs

| Option | Pro | Con |
|---|---|---|
| A — Silent | Zero implementation overhead. Zero noise. | Milestone is invisible. Athletes may not notice for sessions or days. Sub-tier has no value if athletes never know it changed. Misses the product opportunity to acknowledge genuine progress. |
| B — Updated badge | Discoverable without ceremony. Athlete must choose to investigate. Routes through P-2 as intended. Clears naturally on view. | Requires a "seen" state per promotion delivery. Athletes who don't open P-2 don't discover it until they do. |
| C — What's Next card | Highest visibility. Hard to miss. Clear language. | Interrupts the What's Next priority system. Sub-tier advances could compete with active program guidance (Priority 1). Feels slightly gamified — a "you leveled up!" card. |
| D — W-17 mention | Natural discovery at end of session that caused it. Feels contextually earned. | Spacing means the session that earns the advance and the session where it fires may not be the same session. The athlete who earns Foundation · III on Tuesday may not trigger the spacing clock until Thursday — W-17 on Thursday is not the session where they earned it. Context is broken. |
| E — In-app notification | High visibility. Clear. | Notification tray introduces complexity. Sub-tier advances are routine; a dedicated notification tray feels disproportionate for a progress marker. |

### 2.5 Decision: Option B — Updated State Badge on Rank Journey Preview

**Mechanism:**

When the promotion queue delivers a pending sub-tier advance (spacing has elapsed, athlete has opened the app):

1. The **rank display in the Hero** updates immediately to show the new sub-tier (e.g., Foundation · II → Foundation · III).
2. The **Rank Journey Preview** shows an Updated State: the rank badge displays with a subtle visual treatment indicating recent change (implementation detail: a small accent dot or a light ring on the badge, not a numeric count or a color-coded level indicator).
3. The Updated State persists until the athlete **taps the Rank Journey Preview** and views P-2.2 Rank Journey Detail.
4. Within **P-2.2**, the new sub-tier is displayed with a brief "Recent advance" treatment: the sub-tier row in the rank ladder is highlighted, and the sub-tier progress bar resets to its new starting position with a visual reset animation.
5. After P-2.2 is viewed, the Updated State clears from the Rank Journey Preview.

**Rationale:**

1. **Athletes must choose to see it.** This is deliberate. Sub-tier advance is a progress marker, not an announcement. Routing discovery through P-2 is consistent with P-2's role as the primary rank progress surface (RSA §17.3) without requiring the athlete to receive an unsolicited experience.

2. **The Updated State is unobtrusive.** A small indicator on an existing card element does not interrupt the athlete's workflow. It is visible when they visit P-2 but does not demand attention.

3. **P-2.2 provides full context.** When the athlete investigates, they see not just the new sub-tier but the rank ladder, their history, and the progress toward the next sub-tier. This context gives the advance meaning — it is not a bare notification but a narrative moment.

4. **Implementation is clean.** One boolean per athlete per pending delivery: `subtierAdvancePending: true | false`. Cleared on P-2.2 view.

5. **Option C was rejected** because it would require sub-tier advances to compete with Priority 1 (active program workout) in What's Next. An athlete mid-program should not see their What's Next pre-empted by a sub-tier acknowledgment card. The What's Next section must remain driven by forward-looking action guidance.

### 2.6 Implementation Specification for TBD-2

**Data requirement:**
```
athlete.subtierAdvancePending: boolean   // true = unviewed sub-tier advance delivered
athlete.currentRankFamily: string        // e.g., "Foundation"
athlete.currentSubtier: int             // 1, 2, 3, or 4
```

**Trigger:**
Promotion queue delivers a sub-tier advance → sets `subtierAdvancePending = true` → rank display updates.

**Clear condition:**
Athlete views P-2.2 Rank Journey Detail → sets `subtierAdvancePending = false`.

**Rank Journey Preview Updated State:**
When `subtierAdvancePending = true`: render the badge with the updated accent treatment. No additional text. The rank name + sub-tier display already reflects the new state.

**P-2.2 Recent Advance Treatment:**
When arriving at P-2.2 with `subtierAdvancePending = true`: show a brief highlight on the current sub-tier position in the rank ladder section (e.g., the current sub-tier row has a light background or a border accent for the duration of the P-2.2 session). The progress bar for the next sub-tier renders with its new starting position. After the athlete navigates away and returns, the treatment does not persist.

**Multiple pending sub-tier advances:**
If spacing delivers multiple sub-tier advances in rapid succession (possible in a post-import queue scenario), each fires individually per the spacing schedule. The `subtierAdvancePending` flag remains `true` until P-2.2 is viewed. When P-2.2 is opened, all queued sub-tier advances are treated as seen — one P-2.2 view clears the flag regardless of how many advances were delivered since last view.

---

## Section 3 — Information Architecture: Rank Within P-2

### 3.1 Rank Across P-2 Surfaces

Rank information appears in four locations within P-2:

| Location | Content | Presence |
|---|---|---|
| Hero (Section 4.2 of P-2 Architecture) | Current rank name + sub-tier display | Always |
| Rank Journey Preview (Overview, below-fold position 4) | Current rank badge, dual progress indicator (sub-tier + family), Updated State when applicable | Always |
| P-2.2 Rank Journey Detail (sub-screen) | Full rank display — current rank, dual progress, rank ladder, rank history, category signals | On tap |
| Timeline Tab | Rank Promoted events (snapshotted name + sub-tier at promotion time) | When events exist |

### 3.2 R-D47 Implementation

R-D47 requires both dimensions of rank progress visible simultaneously:
- **Sub-tier progress** — the short-term journey (where am I within this rank family?)
- **Family progress** — the long-term journey (how far am I toward the next rank family?)

Both dimensions are implemented as separate progress components in the Rank Journey Preview. They are never collapsed into a single indicator. The sub-tier dimension answers "what is my current momentum?" The family dimension answers "how far along is my full development story?"

---

## Section 4 — Rank Journey Preview: Component Wireframe

### 4.1 Section Placement

The Rank Journey Preview is always-present at below-fold position 4 in the Overview Tab. It is never omitted.

### 4.2 Normal State Wireframe

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ● Foundation · III                         ──────► │
│                                                     │
│  Sub-tier    [████████░░░░░░░░░]  · IV              │
│  To Builder  [████░░░░░░░░░░░░░]                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Element breakdown:**

| Element | Content | Notes |
|---|---|---|
| Rank badge | Current family name + sub-tier (e.g., "Foundation · III") | Matches Hero display format |
| Sub-tier progress bar | Progress toward the next sub-tier within the current family | Label: "Sub-tier" |
| Sub-tier destination label | Next sub-tier (e.g., "· IV") | Shown at the right end of the sub-tier bar |
| Family progress bar | Progress toward the next rank family | Label: name of next family (e.g., "To Builder") |
| Arrow indicator (——►) | Indicates this section is tappable | Right-aligned |

**Progress bar semantics:**
- Bars fill left-to-right
- Fill state is a relative position — it communicates proportional progress, not a percentage or a count
- Bars never show a number, a fraction, or the specific threshold value
- At 100% fill: bar is fully filled and shows a completion indicator (e.g., solid fill with a checkmark at right)

**Family progress bar — multi-signal composite:**
The family progress bar reflects the athlete's overall convergence toward the next family promotion across all required categories. It is NOT a simple percentage of any single metric. It represents the evaluation service's assessment of overall development proximity. The underlying calculation is not exposed. Athletes see a bar that moves as they develop — not the formula.

**Sub-tier progress bar — single signal:**
The sub-tier progress bar reflects active weeks accumulated within the current rank family (per RCM §13). This is a single-signal indicator. It moves with every active week logged.

### 4.3 Updated State (Sub-tier Advance Pending)

When `subtierAdvancePending = true`:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ◉ Foundation · III              [Updated]  ──────► │
│                                                     │
│  Sub-tier    [████████░░░░░░░░░]  · IV              │
│  To Builder  [████░░░░░░░░░░░░░]                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

The rank badge renders with an accent treatment (implementation detail: the filled circle ◉ or equivalent subtle visual). The "[Updated]" label is low-key — small, secondary type weight, not a badge count or a notification dot. It communicates "something changed" without screaming "achievement unlocked."

### 4.4 Tap Destination

Tapping anywhere on the Rank Journey Preview section container → P-2.2 Rank Journey Detail.

When arriving with `subtierAdvancePending = true`, P-2.2 opens in **Recent Advance State** (see Section 5.3).

### 4.5 What the Rank Journey Preview Does Not Show

| Excluded Element | Reason |
|---|---|
| Numeric threshold for next sub-tier | Threshold values cannot be surfaced (RSA §17.2) |
| Numeric threshold for next family | Threshold values cannot be surfaced (RSA §17.2) |
| Specific active week count | Counted metrics are surfaced in Consistency & Training — rank preview shows only directional progress |
| Category breakdown | Category signals belong to P-2.2 detail, not the preview card |
| Rank velocity or time-at-rank | Optimization anxiety; excluded per P-2 Architecture non-behaviors |
| Highest rank achieved | Non-regressive system; current rank is always highest; excluded per PH-D9 |

---

## Section 5 — P-2.2 Rank Journey Detail: Sub-Screen Wireframe

### 5.1 Screen Overview

P-2.2 Rank Journey Detail is a full-screen sub-screen pushed from the Rank Journey Preview. It contains the complete rank development picture for the athlete.

**Navigation:**
- Entry: Tap on Rank Journey Preview in P-2 Overview
- Back: → P-2 Overview (retaining Overview scroll position)
- No further sub-navigation from within P-2.2 at MVP

**Screen title:** "Rank Journey"

### 5.2 Screen Composition (Scroll Order)

```
P-2.2 Rank Journey Detail
├── 1. Current Rank Card            [Always present]
├── 2. Dual Progress Component      [Always present]
├── 3. Category Signals             [Always present]
├── 4. Rank Ladder                  [Always present]
└── 5. Rank History                 [Conditional — omitted if no prior promotions]
```

### 5.3 Component 1: Current Rank Card

Displayed at the top of the screen.

**Normal State:**
```
┌─────────────────────────────────────────┐
│                                         │
│  Foundation · III                       │
│  "I've started."                        │
│                                         │
│  In Foundation since [Month Year]       │
│                                         │
└─────────────────────────────────────────┘
```

| Element | Content | Source |
|---|---|---|
| Family + sub-tier | "[Family] · [Sub-tier]" | Athlete rank record |
| Identity statement | The locked identity statement for the current family | RSA §2.2 identity table |
| Family entry date | "In [Family] since [Month Year]" | Timestamp of family promotion event |

**Recent Advance State** (`subtierAdvancePending = true` at screen open):
The Current Rank Card displays with a brief highlight treatment (implementation detail: light accent background on the card or a subtle animation drawing attention to the sub-tier indicator). A single line below the identity statement reads: "You've advanced to · [Sub-tier]" — stated as a fact, not as a celebration burst. The treatment is visible only during the current P-2.2 session. On back navigation and return, it does not persist.

After the screen renders in Recent Advance State, `subtierAdvancePending` is cleared.

**Rank Identity Statements (reference):**

| Family | Identity |
|---|---|
| Foundation | "I've started." |
| Builder | "I'm building habits." |
| Craftsman | "I know how to train." |
| Architect | "I'm intentionally shaping my development." |
| Established | "I've built something real." |
| Legend | "My journey has become a meaningful story." |
| Legacy | "I repeatedly become the person I intend to become." |

### 5.4 Component 2: Dual Progress Component

The dual progress component implements R-D47 at the detail-screen level. Both dimensions are always shown.

```
── Your Progress ─────────────────────────────────────

  Sub-tier Journey
  Foundation · III  →  Foundation · IV
  [████████████░░░░░░░░░░░░]
  Active weeks building within Foundation

  Rank Journey
  Foundation  →  Builder
  [████░░░░░░░░░░░░░░░░░░░░]
  Development building toward Builder

─────────────────────────────────────────────────────
```

**Sub-tier Progress:**
- Label: "Sub-tier Journey"
- From/To: "[Current Rank] · [Current Sub-tier] → [Current Rank] · [Next Sub-tier]"
- Bar: fills based on active weeks within family relative to the sub-tier threshold
- Supporting copy: "Active weeks building within [Family]"
- When athlete is at sub-tier IV: From/To becomes "[Current Rank] · IV → [Next Family]"; the bar reflects overall family promotion progress (same as the rank journey bar below)
- When Legacy is reached: This component is replaced by the Legacy completion state (see Section 9.4)

**Rank Journey Progress:**
- Label: "Rank Journey"
- From/To: "[Current Family] → [Next Family]"
- Bar: composite development convergence indicator across all required categories
- Supporting copy: "Development building toward [Next Family]"
- When athlete is approaching a prestige rank (Architect and above): a note beneath the bar reads: "Prestige ranks require consistent Forge Legacy training as part of your development." This surfaces the recent engagement principle (Q7 decision: native-only) without exposing the specific threshold.

**Progress bar behavior — both:**
- Bars never display a percentage number
- Bars never display the specific count or threshold behind the fill
- At sub-tier IV with family promotion gate not met: the sub-tier bar shows as "complete" (solid fill), and a contextual note appears: "You've reached [Family] · IV. Your full development story is what opens the path to [Next Family]."
- At family threshold met but signature milestone not met: "Your development is ready. Completing your [requirement type] opens the path to [Next Family]." (Specific requirement type surfaced, not the numeric count.)

### 5.5 Component 3: Category Signals

Category Signals surface the four primary categories directionally for the athlete. This is the primary No Hidden Blockers surface for athletes who tap into P-2.2 to investigate their development.

**Display rule:** Only categories that carry requirements for the **next family promotion** are shown. At Foundation (heading to Builder), only Training Consistency and Training Volume are shown. At Craftsman (heading to Architect), all four primary categories plus sealed chapter and recent engagement are shown.

**Category Signal format:**

```
── Development Signals ──────────────────────────────

  Training Consistency              ✓ Strong
  Active weeks building your journey

  Personal Improvement (Strength)   ◑ Developing
  Your improvement journey is in progress

  Program Progression               ○ Area to develop
  Structured programs deepen your development

  Training Volume                   ✓ Strong
  Your training sessions are accumulating well

  Recent Training (Last 12 Weeks)   ✓ Active
  You've been consistently active in Forge Legacy

─────────────────────────────────────────────────────
```

**Status indicators:**

| Symbol | Label | Meaning |
|---|---|---|
| ✓ | Strong / Active / Complete | This category satisfies the next promotion's requirement |
| ◑ | Developing | Progress is visible but the requirement is not yet satisfied |
| ○ | Area to develop | The requirement is not yet satisfied and development here matters for your next rank |

**Numeric counts are surfaced here for supporting categories only:**
- Programs graduated: shown as "N programs graduated" (the count is shown; the threshold is not)
- Sealed chapters: shown as "N chapter(s) sealed" (count shown; threshold not shown)
- Goals achieved: shown as "N goal(s) achieved" (count shown; threshold not shown)

These counts give athletes actionable information (how many they have) without exposing the target (how many they need). An athlete can see "1 program graduated" and understand they are developing in that area — the No Hidden Blockers copy makes the directional guidance clear without quoting a target number.

**Athlete type in Personal Improvement signal:**
The Personal Improvement signal label includes the athlete's declared type in parentheses: "Personal Improvement ([Type])" — e.g., "Personal Improvement (Strength)", "Personal Improvement (Running)", "Personal Improvement (Boxing)", "Personal Improvement (Hybrid)". The type is read from the athlete's declared `athleteType` field set during onboarding (per Q8 decision). This confirms to the athlete that their type is being used in their rank evaluation and creates a visible connection between the type they declared on P-1 and its purpose in rank development.

If the athlete's type has not yet been declared (edge case: import athletes evaluated before O-2 Amendment ships), the label renders as "Personal Improvement" without parentheses. This is a graceful fallback, not an error state.

**Active weeks are NOT displayed as a count in this component.** Active weeks are surfaced in the Consistency & Training section of the Overview Tab (Lifetime Workouts, Avg Workouts/Week, etc.). Repeating the count here would duplicate data. The Category Signal uses the ✓ / ◑ / ○ status indicator for Consistency.

**Recent engagement signal:**
Displayed when approaching Architect or above. Two states:
- ✓ Active: "You've been consistently active in Forge Legacy recently."
- ○ Area to develop: "Your recent Forge training is an area to develop. Consistent active weeks over the last 12 weeks strengthen your path to [Next Family]."

Recent engagement never displays the specific lookback window length or minimum active week count.

**Import athletes approaching prestige ranks:**
A contextual note below the recent engagement indicator: "Prestige rank promotion requires recent training in Forge Legacy, not your imported history." This is a transparency note, not a warning. It prevents confusion when the athlete has a strong imported history but low recent native activity.

### 5.6 Component 4: Rank Ladder

The rank ladder is a visual representation of the full 25-rank progression (24 levels across 6 sub-tiered families + Legacy).

**Display:**

```
── Rank Ladder ──────────────────────────────────────

  ICON ─────────────────────────────── [far future]

  LEGACY ──────────────────────────────────────────
    · IV   · III   · II   · I

  ESTABLISHED ─────────────────────────────────────
    · IV   · III   · II   · I

  ARCHITECT ───────────────────────────────────────
    · IV   · III   · II   · I

  CRAFTSMAN ───────────────────────────────────────
    · IV   · III   · II   · I

  BUILDER ─────────────────────────────────────────
    · IV   · III   · II   · I

  FOUNDATION ──────────────────────────────────────
    · IV   · III   [● III]  · I     ← current position
                    ↑ You are here

─────────────────────────────────────────────────────
```

**Rendering rules:**
- Current position: distinctly marked (filled indicator, "You are here" label)
- Past positions (sub-tiers already earned): visually distinguished as achieved (e.g., lighter fill or checkmark)
- Future positions: visible but visually subordinate (e.g., unfilled circles or greyed text)
- The rank ladder is the full 25-position structure; all families are shown
- Legacy is always visible at the top, regardless of how far the athlete is from it

**No threshold values appear on or near the rank ladder.** The ladder shows the path and the athlete's position. It does not annotate requirements next to each position.

**Tap behavior:** The rank ladder is read-only. Individual rank positions are not tappable at MVP. The ladder is a map, not a navigation element.

### 5.7 Component 5: Rank History

Rank history is a chronological record of all rank promotions the athlete has received. It appears only when at least one promotion (sub-tier or family) has been delivered.

**Format:**

```
── Your Journey ─────────────────────────────────────

  Foundation · III          [Month Year]
  Foundation · II           [Month Year]
  Foundation · I            [Month Year — Joined]

─────────────────────────────────────────────────────
```

**Display rules:**
- Reverse chronological (most recent first)
- Every promotion (family + sub-tier) is listed
- Date format: "Month Year" (e.g., "June 2026")
- The earliest entry is labeled "Joined" or "Journey began"
- The snapshotted rank name at time of promotion is used (matches the Timeline tab's rank promotion events)
- No "time at rank" is calculated or shown between entries (optimization anxiety — excluded per P-2 Architecture non-behaviors)

**New athlete state:** When the athlete is at their starting rank with no earned promotions, this component is omitted. The rank ladder and current rank card are still visible.

**Import athletes:** If their imported history places them above Foundation (evaluated by the promotion queue post-import), their rank history reflects the queued promotions as they were delivered — with the dates of delivery, not the dates of the underlying imported sessions.

---

## Section 6 — What's Next: Rank-Specific Content

### 6.1 Priority 3 Specification (Rank Proximity)

The P-2 Architecture defines Priority 3 as:
> "Rank proximity — Athlete is within 10% of next rank threshold → P-2 Rank Journey Detail"
> "Priority 3 caveat: The rank proximity candidate requires rank threshold values from the Rank System Architecture specification, which does not yet exist."

The rank system is now fully specified. Priority 3 can be resolved.

**Priority 3 trigger condition:**
An athlete qualifies for Priority 3 when they are at sub-tier IV of their current family AND the family progress component in P-2.2 shows a composite development status of ≥ 70% convergence toward the next family promotion.

The "70% convergence" threshold is an implementation signal — it is not displayed to the athlete. The evaluation service computes this internally. The athlete sees the result of this condition, not the condition itself.

**Priority 3 further divides into two cases:**

**Case A — On Track (all or nearly all requirements progressing):**

```
┌─────────────────────────────────────────────────────┐
│  Your development is approaching [Next Family].     │
│  "[Identity statement of next family]"              │
│                                      View Progress → │
└─────────────────────────────────────────────────────┘
```

Tap destination: P-2.2 Rank Journey Detail.

This case surfaces when the athlete is deeply into their current family and no critical requirements for the next family are glaringly underdeveloped.

**Case B — Gap Detected (one or more requirements significantly underdeveloped):**

This case is the primary No Hidden Blockers surface. It is also triggered at lower sub-tier levels (not just sub-tier IV) based on the No Hidden Blockers logic in Section 7. When a significant gap is detected and Priority 1 and 2 do not apply, the What's Next surface shows the gap as a directed development opportunity — not as a blocker or a warning.

See Section 7 for complete No Hidden Blockers logic, copy, and triggering conditions.

### 6.2 Revised What's Next Priority Table

The P-2 Architecture Priority Table is extended as follows. This table supersedes the P-2 Architecture's Section 13.2 for the rank-specific content at Priority 3:

| Priority | Candidate | Condition | Copy Frame | Tap Destination |
|---|---|---|---|---|
| 1 | Next program workout | Active program enrollment | "Continue [Program Name] — Workout [N] of [Y]" | W-3 → workout launch |
| 2 | Goal nearing completion | Active quantifiable goal > 75% progress | "Your goal "[Goal Name]" is nearly achieved." | G-2 for that goal |
| 3a | Rank proximity — on track | Sub-tier IV + ≥ 70% family convergence + no critical gaps | Approaching copy (see 6.1 Case A) | P-2.2 Rank Journey Detail |
| 3b | No Hidden Blockers — gap | Consistency/Improvement: athlete at sub-tier II+. Programs/Chapters/Goals/Recent Engagement: athlete at sub-tier III+. Requirement assessed as underdeveloped. | Gap guidance copy (see Section 7) | P-2.2 Rank Journey Detail |
| 4 | Continue training | Sessions logged; last session not program-based; last session within 14 days | "Keep building your training." | W-1 (Workouts tab) |
| 5 | Start a Program | Default fallback | "Programs structure your development. Find one that fits where you are." | W-2 (Program Browse) |

**Priority 3a and 3b are mutually exclusive.** The evaluation checks for gaps first (3b); if no critical gaps exist, it checks for on-track proximity (3a). The distinction ensures athletes approaching a promotion with missing requirements see the gap guidance rather than the "approaching" message.

**No Hidden Blockers uses a tiered trigger** (see Section 7.2). Consistency and Improvement gaps surface at sub-tier II. Program, Chapter, Goal, and Recent Engagement gaps surface at sub-tier III. Neither gap type waits until sub-tier IV — guidance is always proactive.

---

## Section 7 — No Hidden Blockers: Complete Logic

### 7.1 Governing Principle

RSA §18:
> "No athlete should be surprised to discover they are missing a requirement for a promotion they were expecting."

The No Hidden Blockers surface is P-2 What's Next Priority 3b. Its job is to surface a development opportunity before the athlete encounters it as a blocking condition.

### 7.2 Triggering Logic

No Hidden Blockers guidance uses a **tiered trigger**: the sub-tier at which a gap begins surfacing depends on the type of requirement.

**Tier A — Sub-tier II trigger (Consistency and Improvement gaps):**
Consistency and Improvement are slow-moving signals. An athlete cannot take a single deliberate action to satisfy them — they accumulate through continued training over time. These gaps are surfaced early so the athlete has maximum time to develop the signal naturally.

Appears in What's Next when:
- The athlete is at sub-tier II or above, AND
- Training Consistency or Personal Improvement is assessed as underdeveloped, AND
- Priority 1 and Priority 2 do not currently apply

**Tier B — Sub-tier III trigger (Program, Chapter, and Goal gaps):**
Programs, chapters, and goals are volitional requirements — the athlete can take a concrete action to address them. Surfacing these at sub-tier II risks feeling premature when the athlete has substantial family development remaining. Sub-tier III gives meaningful lead time while keeping the guidance contextually relevant.

Appears in What's Next when:
- The athlete is at sub-tier III or above, AND
- Program Progression, sealed chapter count, or goal achievement is assessed as underdeveloped, AND
- Priority 1 and Priority 2 do not currently apply

**Recent Engagement — treated as Tier B (sub-tier III trigger):**
Recent engagement is a prestige-rank gate (Architect and above). It is not surfaced until sub-tier III of Craftsman, when the Architect gate becomes meaningfully close. An athlete in Craftsman · II is unlikely to have a recent engagement gap that warrants action yet.

"Underdeveloped" is operationally defined as: the requirement is not yet satisfied AND the gap is material (not a minor delta that would be naturally closed in the normal course of continued training). The evaluation service makes this determination; the spec does not expose the threshold for "material gap."

**One item is shown at a time.** When multiple gaps exist, the highest-priority unsatisfied requirement is surfaced — Tier A gaps take precedence over Tier B gaps within the same evaluation (primary category priority order: Consistency > Improvement > Program Progression > Volume; secondary: Chapters > Goals > Recent Engagement). Tier A gaps are shown as soon as they qualify (sub-tier II). Tier B gaps are shown once their trigger condition is met (sub-tier III).

### 7.3 Gap Conditions by Family Transition

**Approaching Craftsman → Architect:**

| Gap Condition | What's Next Copy | Notes |
|---|---|---|
| No sealed chapter | "Sealing a chapter is part of the path to Architect — it's how your journey gains definition." | Signature milestone requirement |
| No program graduated | "Completing a structured program strengthens your path to Architect. Find one in Program Browse." | Program progression requirement |
| Improvement not yet detected | "Your improvement journey is developing. Consistently training on your primary activities builds this over time." | No direct action to prescribe — directional only |
| Recent engagement low | "Your recent training in Forge Legacy is a development area. Consistent active weeks over the last 12 weeks are part of your path to Architect." | Q7 + Q9 decisions applied |

**Approaching Architect → Established:**

| Gap Condition | What's Next Copy |
|---|---|
| Programs < 3 | "Multiple structured programs are part of what makes Established meaningful. You've graduated [N] — keep building." |
| Sealed chapters < 2 | "Sealing a second chapter deepens your journey toward Established." |
| No primary goal achieved | "Achieving a goal — not just setting one — is part of what it means to have built something real." |
| Recent engagement low | "Your recent Forge training is an area to develop. Consistent active weeks in the last 12 weeks are part of your path to Established." |
| Improvement pattern not established | "Your improvement story is still developing. Consistent training on your primary activities builds this signal over time." |

**Approaching Established → Legend:**

| Gap Condition | What's Next Copy |
|---|---|
| Programs < 6 | "Your journey to Legend calls for multiple structured programs across different phases of development. You've graduated [N] — continue building." |
| Sealed chapters < 3 | "A Legend story needs completed chapters. You've sealed [N] — each additional sealed chapter deepens the narrative." |
| Goals achieved < 2 | "Goal fulfillment is a thread in your Legend story. You've achieved [N] primary goal(s) — continued goal fulfillment builds this over time." |
| Improvement not multi-year | "Your improvement story is still within a single development phase. Multi-year development deepens toward Legend." |
| Recent engagement low | "Your recent Forge training is an area to develop. Consistent active weeks in the last 12 weeks strengthen your path to Legend." |

**Approaching Legend → Legacy:**

| Gap Condition | What's Next Copy |
|---|---|
| Programs < 10 | "Legacy calls for extensive structured development across many years. You've graduated [N] programs — your continued engagement builds toward this." |
| Sealed chapters < 5 | "Legacy requires multiple completed stories. You've sealed [N] chapters — keep writing and sealing." |
| Goals achieved < 4 | "Repeated goal fulfillment over many years is the Legacy mark. You've achieved [N] primary goals." |
| Improvement not multi-phase | "Legacy requires improvement across multiple distinct phases of development. Your improvement story is still developing." |
| Recent engagement low | "Your recent Forge training is an area to develop. Consistent active weeks in the last 12 weeks are part of your path to Legacy." |

### 7.4 No Hidden Blockers Copy Principles

**1. Identity-forward, not metric-forward.**
Copy names the requirement in terms of the athlete's journey narrative, not in terms of a number to hit. "Sealing a chapter is part of the path to Architect" — not "You need 1 sealed chapter for Architect."

**2. Never reveal the threshold.**
Copy describes what needs to happen, not how many times. "Multiple structured programs" — not "3 programs." The count of what the athlete has (from Category Signals in P-2.2) gives them evidence of their progress; the target is not named.

**Exception to the never-reveal principle:** For counts the athlete already controls and can see (programs graduated, sealed chapters, goals achieved), the CURRENT count is surfaced in the copy because it is a transparent, athlete-owned fact. "You've graduated [N] programs" is athlete-contextualized copy, not threshold exposure. The target is still not named.

**3. Directional, not corrective.**
Copy orients the athlete toward an opportunity, not toward a failure. "Your improvement journey is developing" — not "You haven't improved enough."

**4. For non-volitional requirements (Consistency, Improvement), describe rather than prescribe.**
An athlete cannot be told to "do more active weeks" in a way that is actionable beyond "keep training." For these, copy is directional and reassuring: "Consistent active weeks over the last 12 weeks are part of your path" — without implying a specific number or action beyond continued engagement.

**5. For volitional requirements (Programs, Chapters, Goals), orient toward the action.**
An athlete can take a concrete action for programs, chapters, and goals. Copy can orient toward the relevant feature: "Find one in Program Browse" for programs, implicit chapter guidance for chapters. Do not include explicit CTAs for goals — goal setting is personal and goal copy should not feel like a prompt.

### 7.5 No Hidden Blockers in P-2.2

No Hidden Blockers are surfaced in two places:
1. **What's Next (Priority 3b)** — single highest-priority gap, one item
2. **P-2.2 Category Signals (Section 5.5)** — all gaps visible simultaneously as ○ indicators

What's Next provides a directed, single-action frame. P-2.2 Category Signals provide the full picture. Athletes who want to understand all their development areas navigate to P-2.2; What's Next guides them to the most important action.

---

## Section 8 — Signal Visibility Rules

### 8.1 What Athletes Can See (Complete List)

| Signal | Visible Where | Format |
|---|---|---|
| Current rank family + sub-tier | Hero, Rank Journey Preview, P-2.2 | Text: "[Family] · [Sub-tier]" |
| Identity statement | P-2.2 Current Rank Card | Text: locked identity statement |
| Family entry date | P-2.2 Current Rank Card | "In [Family] since [Month Year]" |
| Sub-tier progress (relative) | Rank Journey Preview, P-2.2 Dual Progress | Progress bar (no numeric label) |
| Family progress (relative, composite) | Rank Journey Preview, P-2.2 Dual Progress | Progress bar (no numeric label) |
| Category status (✓ / ◑ / ○) | P-2.2 Category Signals | Status indicator + directional copy |
| Programs graduated count | P-2.2 Category Signals | "[N] programs graduated" |
| Sealed chapters count | P-2.2 Category Signals | "[N] chapter(s) sealed" |
| Goals achieved count | P-2.2 Category Signals | "[N] goal(s) achieved" |
| Recent engagement status | P-2.2 Category Signals (Architect+) | ✓ Active / ○ Area to develop |
| Rank ladder | P-2.2 Rank Ladder | Visual with current position marked |
| Rank history | P-2.2 Rank History | Chronological list of promotions with dates |
| Sub-tier advance delivered | Rank Journey Preview Updated State, P-2.2 Recent Advance State | Accent indicator; "You've advanced to · [Sub-tier]" |
| No Hidden Blockers guidance | What's Next Priority 3b, P-2.2 Category Signals | Directional copy and ○ indicators |
| Missing requirement type (not count) | What's Next Priority 3b | Named directionally (e.g., "Sealing a chapter") |
| Current count of what athlete has | What's Next Priority 3b copy (volitional requirements only) | "[N] programs graduated" form |

### 8.2 What Athletes Cannot See

| Signal | Reason |
|---|---|
| Specific threshold value for any promotion gate | RSA §17.2 — formulas not surfaced |
| How many more programs / chapters / goals they need | Threshold exposure — not permitted |
| Specific active week count toward family promotion | Threshold-adjacent; surfaced in Consistency & Training, not in rank context |
| Category weights or weighting ratios | RSA §17.2 — formulas not surfaced |
| Individual category scores or calculations | RSA §17.2 |
| Sub-tier advancement formula | RSA §17.2 |
| Composite family progress percentage | Formula — bars only |
| 70% convergence threshold | Internal implementation signal |
| Forge-native vs. imported active week breakdown | Not an athlete-facing distinction at this surface level |
| Partial credit rate for imported sessions | Computational formula — not surfaced |
| Promotion spacing schedule | Implementation detail |
| Queue position or queue contents | Implementation detail |

---

## Section 9 — Empty and Edge States

### 9.1 New Athlete State (First App Open, No Sessions)

**Hero:** Starting rank name + sub-tier (Foundation · I). "No Active Chapter." No achievement slot.

**Rank Journey Preview:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ● Foundation · I                           ──────► │
│                                                     │
│  Sub-tier    [░░░░░░░░░░░░░░░░]  · II               │
│  To Builder  [░░░░░░░░░░░░░░░░]                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Both bars start at empty. This is a valid state, not an error state. The bars will fill as the athlete trains.

**P-2.2 — New Athlete:**
- Current Rank Card: Foundation · I, "I've started.", no entry date displayed (athlete just joined)
- Dual Progress: both bars empty
- Category Signals: not displayed — at Foundation, no category requirements exist for the next promotion beyond AW and sessions, and the athlete has zero signals yet. Instead, a single encouraging note: "Your journey begins here. Every session builds your development." This replaces the Category Signals component for Foundation-stage athletes.
- Rank Ladder: visible — shows full ladder with Foundation · I marked
- Rank History: omitted — no prior promotions

**What's Next:** Priority 5 fallback — "Programs structure your development. Find one that fits where you are." → W-2.

### 9.2 Import Athlete State

Import athletes who enter Forge Legacy and import prior training history are evaluated by the promotion queue, which delivers promotions over time per the spacing schedule (RCM §15).

**During queue processing (promotions still being delivered):**
The rank display reflects the athlete's most recently delivered rank. The Rank Journey Preview shows the current state accurately. A contextual note within P-2.2 (below the Current Rank Card): "Your training history is being recognized. You may continue to receive rank updates as your journey is processed."

This note disappears once the promotion queue is empty.

**Post-queue (all queued promotions delivered):**
State is identical to a native athlete at the same rank. No import-specific UI distinction persists.

**Import athlete approaching prestige ranks:**
When an import athlete's rank approaches Architect (C→A), the P-2.2 Category Signals surface includes the Recent Engagement signal with the import-specific transparency note: "Prestige rank promotion requires recent training in Forge Legacy, not your imported history." This is the only import-specific surfacing in P-2.

**Native AW floor transparency:**
Import athletes at prestige rank gates will see the Recent Engagement signal marked ○ if they have not established a recent native training pattern. The copy is: "Your recent Forge training is an area to develop. Consistent active weeks in the last 12 weeks strengthen your path to [Next Family]." The Forge-native floor is not explicitly named. The message is accurate and actionable without exposing the floor calculation.

### 9.3 Prestige Rank States

Athletes at Architect, Established, or Legend have additional considerations:

**P-2.2 Category Signals for prestige athletes:**

The Recent Engagement signal is always shown for athletes at Architect or above. Even when satisfied (✓ Active), it is displayed with copy: "Your recent Forge training is strong — keep it consistent."

When recent engagement is satisfied, the signal reads:
- "✓ Active — Your recent Forge training is consistent."

When unsatisfied:
- "○ Area to develop — Your recent Forge training is an area to develop. Consistent active weeks in the last 12 weeks are part of your path to [Next Family]."

**Long time-gate periods:**
Athletes who have completed all category requirements but have not yet satisfied the time gate will see:

In P-2.2 Dual Progress:
- The family progress bar shows at or near full
- A note below the bar: "Your development is ready. Your journey's elapsed time is part of what makes [Next Family] meaningful."

This is the only disclosure of the time gate existence. The specific value (e.g., "270 days") is not disclosed. "Your journey's elapsed time" is the honest, non-formula description of what is holding the promotion.

The athlete knows a time element exists; they do not know the specific value. This is consistent with Guided Transparency — direction visible, formulas not.

**What's Next for time-gated athletes:**
When category requirements are fully satisfied and only the time gate remains, What's Next Priority 3a activates: "Your development is approaching [Next Family]." The approaching copy correctly represents their state — they are genuinely approaching, just held by time. This is not deceptive; it is directional.

### 9.4 Legacy State

When the athlete reaches Legacy (the final family, no sub-tiers):

**Hero:** "Legacy" — no sub-tier format.

**Rank Journey Preview:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ● Legacy                                     ──────► │
│                                                     │
│  "I repeatedly become the person I intend to become."│
│                                                     │
└─────────────────────────────────────────────────────┘
```

The dual progress bars are replaced by the Legacy identity statement. No sub-tier bar (Legacy has no sub-tiers). No family progress bar (no rank above Legacy). The identity statement stands alone.

**P-2.2 — Legacy State:**
- Current Rank Card: "Legacy" — no sub-tier. Full identity statement.
- Dual Progress Component: replaced by a brief narrative statement: "You have repeatedly become the person you intended to become. Your journey continues — it just doesn't need a rank."
- Category Signals: not shown. No next family requirements exist.
- Rank Ladder: shown with full ladder, Legacy position distinctly marked as final
- Rank History: full history shown, with Legacy promotion at the top

**What's Next — Legacy Athletes:**
Priority 3 never fires (no next rank). The priority system falls to Priority 1 (active program), Priority 2 (goal nearing completion), Priority 4 (continue training), or Priority 5 (start a program). Legacy athletes are not treated differently in What's Next beyond the absence of rank-proximity content.

### 9.5 Sub-Tier IV State

Athletes at sub-tier IV (the final within-family sub-tier) are awaiting family promotion. Their state has specific display rules:

**Rank Journey Preview:**
- Sub-tier progress bar: shows as fully complete (solid fill)
- Family progress bar: shows the convergence state toward the next family

No "you have maxed out" language. Sub-tier IV is the final within-family progress marker — the athlete's journey continues toward the family promotion.

**P-2.2 Dual Progress when at sub-tier IV:**

The sub-tier progress section reads:
```
Sub-tier Journey
Foundation · IV  →  Builder
[████████████████████████]  Complete
Your within-family development is deep. Your full development story opens the path to Builder.
```

The family progress bar remains active and continues to fill as the athlete develops. The sub-tier journey section conveys completion without implying the athlete is stuck.

---

## Section 10 — Navigation Map

### 10.1 Rank-Related Navigation Within P-2

```
P-2 Progress Hub (Overview Tab)
├── Hero → [non-tappable rank element]
└── Rank Journey Preview → P-2.2 Rank Journey Detail
    ├── (Updated State) → P-2.2 opens in Recent Advance State
    └── (Normal State) → P-2.2 opens in Normal State

P-2.2 Rank Journey Detail
├── Back → P-2 Overview (retains scroll position)
├── Rank Ladder → [read-only; no navigation]
└── Rank History → [read-only at MVP; no per-entry navigation]

P-2 Progress Hub (Timeline Tab)
└── Rank Promoted event → P-2.2 Rank Journey Detail
    (opens in Normal State, no Recent Advance treatment on historical navigation)

P-2 Progress Hub (What's Next)
├── Priority 3a tap → P-2.2 Rank Journey Detail
└── Priority 3b tap → P-2.2 Rank Journey Detail
    (opens with Category Signals scrolled into view when arriving from 3b)
```

### 10.2 Cross-Surface Navigation for Missing Requirements

When No Hidden Blockers guidance references a specific system:

| Guidance Type | Copy Includes | Expected Action |
|---|---|---|
| Program gap | "Find one in Program Browse" | Implicit — athlete navigates via W-2 from bottom nav, not via a CTA in What's Next |
| Chapter gap | Copy only — no CTA | Athlete navigates via Legacy Hub / L-1 on their own |
| Goal gap | Copy only — no CTA | Athlete navigates via Goals Hub / G-1 on their own |
| Consistency / Improvement / Recent Engagement | Copy only — no CTA | No prescribed destination; continued training is the action |

What's Next does not include inline CTAs to specific screens for gap guidance. The tap destination for all Priority 3b items is P-2.2 Rank Journey Detail. The athlete uses the Category Signals in P-2.2 to understand their full development picture, then navigates independently to the relevant screen.

**Rationale:** An inline CTA to W-2 (Program Browse) within a gap guidance card would make P-2 a navigation shortcut for a specific action. This is in tension with P-2's identity as a read surface. The exception (Priority 5 "Start a Program") is a fallback case with no rank context — it is a default direction, not gap-specific guidance.

---

## Section 11 — Copy Principles

### 11.1 Rank Display Format

Rank is always displayed as "[Family] · [Sub-tier]" per RSA §2.3. Legacy is displayed as "Legacy" with no sub-tier.

Examples:
- Foundation · I
- Builder · III
- Craftsman · II
- Legend · IV
- Legacy

The centered dot (·) is a visual separator, not a bullet. It is always surrounded by spaces. It is never replaced with a dash, slash, or other separator.

### 11.2 Identity Language

The identity statement for the athlete's current rank family appears in P-2.2 and in the Legacy state of the Rank Journey Preview. It is quoted verbatim from RSA §2.2. It is never paraphrased, shortened, or modified.

### 11.3 Progress Language

Progress is always described directionally:
- "Building" — signals moving in the right direction
- "Developing" — present but not yet sufficient
- "Area to develop" — a requirement the athlete should be aware of
- "Strong" — category requirement satisfied
- "Active" — recent engagement satisfied
- "Complete" — sub-tier fully earned

Progress language is never negative or failure-framed:
- Not: "You haven't sealed a chapter yet"
- Not: "You're missing a program"
- Not: "Your training is inconsistent"

### 11.4 Identity-Forward Voice

When naming requirements, name them in terms of the athlete's journey:
- "Sealing a chapter is part of the path to Architect" — not "A sealed chapter is required"
- "Multiple structured programs deepen your journey" — not "You need programs to advance"
- "Your improvement story is in progress" — not "Improvement evidence not found"

### 11.5 Athlete Ownership

Category Signals use "[N] programs graduated" format for counts the athlete controls. The athlete is the subject of their own development record:
- "You've graduated [N] programs"
- "You've sealed [N] chapter(s)"
- "You've achieved [N] goal(s)"

Not: "[N] programs required" or "[N] programs completed" (impersonal).

---

## Section 12 — Architecture Decisions

| Decision ID | Decision |
|---|---|
| **P2S-D1 — TBD-2 resolution** | Sub-tier advances are surfaced through the Rank Journey Preview Updated State on P-2. No M-1 ceremony. No modal. No push notification. The advance is delivered when the promotion queue fires; the athlete discovers it when they open P-2 and see the Updated State on the Rank Journey Preview; clearing occurs when P-2.2 is viewed. |
| **P2S-D2 — Updated State data model** | `athlete.subtierAdvancePending: boolean`. Set to `true` when a sub-tier advance is delivered by the promotion queue. Set to `false` when the athlete views P-2.2. One flag covers all pending sub-tier advances since last P-2.2 view. |
| **P2S-D3 — R-D47 implementation** | Both rank dimensions are shown as separate, labeled progress bars. Sub-tier progress (active weeks within family, single signal) and family progress (composite development convergence, multi-signal) are never collapsed into one bar. Both are always visible on the Rank Journey Preview and in P-2.2 Dual Progress. |
| **P2S-D4 — Family progress bar is composite, not single-signal** | The family progress bar reflects overall convergence across all required categories for the next family promotion. It is not a percentage of a single metric. The underlying calculation is not disclosed. Athletes see a bar that moves with development — not the formula. |
| **P2S-D5 — Sub-tier progress bar is single-signal** | The sub-tier progress bar reflects active weeks within the current family. Single signal, clean implementation, consistent with TBD-3 definition. |
| **P2S-D6 — Threshold values never shown** | No threshold value (e.g., "18 active weeks required," "3 programs needed") appears anywhere on P-2 or P-2.2. Category Signals show status (✓/◑/○) and current counts (what the athlete has), never targets (what they need). |
| **P2S-D7 — Current counts are permissible** | For volitional requirements (programs, chapters, goals), showing the athlete's current count is not threshold exposure. "You've graduated [N] programs" is transparent athlete data. The target is what cannot be shown. |
| **P2S-D8 — No Hidden Blockers tiered trigger (Option C)** | Gap guidance uses a two-tier trigger. Consistency and Improvement gaps begin surfacing at sub-tier II — these are slow-moving, non-volitional signals that benefit from early visibility. Programs, Chapters, Goals, and Recent Engagement gaps begin surfacing at sub-tier III — these are volitional or prestige-specific requirements where sub-tier II surfacing would be premature. Neither tier waits until sub-tier IV. |
| **P2S-D9 — Priority 3b (gap guidance) checks before 3a (approaching)** | When both the gap detection and the proximity conditions are met, gap guidance takes priority. An athlete who is near the next family but missing a requirement should see the gap, not the "approaching" message. |
| **P2S-D10 — What's Next does not include inline gap-specific CTAs** | What's Next Priority 3b taps to P-2.2 Rank Journey Detail. No inline CTAs to W-2, G-1, or L-1. P-2 is a read surface; navigation to management screens happens via the athlete's own initiative from the bottom nav. |
| **P2S-D11 — Import transparency note in P-2.2** | One transparency note for import athletes approaching prestige ranks: "Prestige rank promotion requires recent training in Forge Legacy, not your imported history." This prevents confusion. It is placed after the Recent Engagement signal in Category Signals. It disappears once the athlete is at a non-prestige rank or has satisfied recent engagement. |
| **P2S-D12 — Time gate existence acknowledged, value not revealed** | When all category requirements are met and only the time gate remains, P-2.2 and What's Next acknowledge that the journey's elapsed time is a factor without disclosing the specific value. "Your journey's elapsed time is part of what makes [Next Family] meaningful." |
| **P2S-D13 — Category Signals not shown for Foundation athletes** | At Foundation, promotion to Builder requires only AW and sessions. Category Signals would show two trivially-populated rows. Instead, the Category Signals component is replaced by a brief encouraging note for Foundation-stage athletes. |
| **P2S-D14 — Legacy state replaces dual progress with identity statement** | At Legacy, both progress bars are replaced by the identity statement and a brief narrative note. Legacy has no next rank. No bar can represent progress toward nothing. The identity statement is the most meaningful content at this state. |
| **P2S-D15 — Rank History includes sub-tier advances** | Both sub-tier advances and family promotions appear in the Rank History list. Each earned promotion has equal standing in the history — the history is the athlete's complete advancement record. |
| **P2S-D16 — P-2.X sub-screen naming convention confirmed** | The P-2.X decimal naming convention is accepted. P-2.2 is the confirmed screen code for the Rank Journey Detail sub-screen, consistent with PH-D20. This decision closes OQ-P2S-1. |
| **P2S-D17 — Athlete type displayed in Personal Improvement signal** | The Personal Improvement category signal in P-2.2 includes the athlete's declared type in parentheses: "Personal Improvement ([Type])". E.g., "Personal Improvement (Strength)." If type is undeclared, the label renders without parentheses as a graceful fallback. This closes OQ-P2S-2. |
| **P2S-D18 — Rank History displays all entries** | The Rank History component in P-2.2 displays all promotion events — both sub-tier advances and family promotions — in reverse chronological order. No collapsing, no secondary grouping. Complete record for all athletes. This closes OQ-P2S-4. |

---

## Section 13 — Refinement Report

### 13.1 TBD-2 Design Rationale

The TBD-2 decision (Option B: Updated State Badge on Rank Journey Preview) was selected over the alternatives after weighing five competing values:

**1. Discoverable vs. Delivered**
Options C (What's Next card) and E (in-app notification) deliver the advance to the athlete without requiring them to seek it. Option B requires the athlete to open P-2. The product's philosophy — "story before data," rank as identity not achievement — favors athlete-initiated discovery. Sub-tier advance is a progress marker, not an event that deserves an announcement. Delivered approaches feel like achievements; discovered approaches feel like development.

**2. Context vs. Immediacy**
The most valuable moment to learn of a sub-tier advance is when the athlete has full context — they can see the rank ladder, their history, and the progress toward the next sub-tier. P-2.2 provides this context. An in-app notification or W-17 mention delivers the information in isolation. Context-rich discovery beats notification delivery for a milestone that is better understood than announced.

**3. Simplicity vs. Richness**
Option A (silent) is the simplest implementation but is a missed product opportunity. An athlete who advances sub-tiers deserves to know. Option B adds one boolean and a visual state. The implementation overhead is minimal; the experience value is real.

**4. Alignment with Spacing Values**
RCM §15.6 defines sub-tier advance spacing: Foundation advances space 1 day apart; Legend advances space 30 days apart. The spacing is designed so that advances feel deliberate. An approach that announces each advance immediately (Option C, E) could still deliver multiple advances in a short window even after spacing — the batch of advances that arrive during a post-import queue scenario would produce multiple "you've advanced" cards in rapid succession even with 3-day spacing. Option B handles this gracefully: all pending advances clear on one P-2.2 view. The athlete sees where they are now, not every step that got them there.

**5. Ceremony Calibration**
RS-D14 explicitly excludes sub-tier advances from ceremony. The product must find a middle path between "no acknowledgment" (silent) and "ceremony" (modal, card, animation). The Updated State badge is the minimum viable acknowledgment: it signals "something changed" without staging an event.

### 13.2 What This Spec Resolves vs. Defers

**Resolved in this document:**
- TBD-2 (Sub-tier surfacing mechanism)
- P-2.2 Rank Journey Detail wireframe
- What's Next Priority 3 (rank proximity — now implementable)
- No Hidden Blockers logic, triggering conditions, and copy principles
- Signal visibility rules (what athletes can and cannot see)
- Empty states for new athlete, import athlete, prestige ranks, Legacy
- Legacy state handling in all rank-related components
- Time gate transparency rule

**Deferred (not resolved here):**
- O-2 Amendment for athlete type declaration (Q8 decision — must update First-Time Setup to include athlete type selection)
- P-1 Amendment 001 (Progress entry point — already identified in P-2 Architecture, OQ-2)
- P-3 Rank Detail screen specification (blocked on full TBD-12 verification)
- TBD-11 (Legacy display format in M-1) — M-1 amendment required, low priority

---

## Section 14 — Decision Record

All open questions identified in the original draft have been resolved by user decision. This section records the final decisions applied.

| OQ | Description | Decision | Applied In |
|---|---|---|---|
| OQ-P2S-1 | P-2.X sub-screen naming convention | **Accepted.** P-2.2 is the confirmed code for Rank Journey Detail. | P2S-D16, doc-wide references |
| OQ-P2S-2 | Athlete type display in Personal Improvement signal | **Show type in parentheses.** Label: "Personal Improvement ([Type])". | P2S-D17, §5.5 |
| OQ-P2S-3 | No Hidden Blockers trigger sub-tier | **Option C — tiered trigger.** Consistency/Improvement: sub-tier II+. Programs/Chapters/Goals/Recent Engagement: sub-tier III+. | P2S-D8 (updated), §7.2, §6.2 |
| OQ-P2S-4 | Rank History depth | **All entries.** Sub-tier advances and family promotions displayed in full. | P2S-D18, §5.7 |

**Remaining pre-lock actions (downstream, not blockers for this document):**
- O-2 Amendment: add athlete type declaration step to First-Time Setup (Q8 decision — required before Personal Improvement evaluation can run for new athletes)
- P-1 Amendment 001: add Progress entry point to Profile (OQ-2 from P-2 Architecture — required before P-2 navigation path is complete)

---

## Section 15 — Closure Record

### What Is Locked

| Area | Status |
|---|---|
| TBD-2 resolution (sub-tier surfacing mechanism) | **LOCKED** — Option B: Updated State Badge on Rank Journey Preview |
| P-2.2 sub-screen code | **LOCKED** — P-2.2 confirmed (OQ-P2S-1) |
| Rank Journey Preview wireframe | **LOCKED** — dual progress, Updated State, all states defined |
| P-2.2 Rank Journey Detail wireframe | **LOCKED** — five components, full scroll order, all states |
| Athlete type in Personal Improvement signal | **LOCKED** — "Personal Improvement ([Type])" label (OQ-P2S-2) |
| No Hidden Blockers triggering logic | **LOCKED** — tiered trigger: sub-tier II for Consistency/Improvement; sub-tier III for Programs/Chapters/Goals/Recent Engagement (OQ-P2S-3) |
| What's Next Priority 3 (rank proximity) | **LOCKED** — Priority 3a (on track) and 3b (gap guidance) fully defined |
| Signal visibility rules | **LOCKED** — complete can/cannot-see tables |
| Rank History depth | **LOCKED** — all entries: sub-tier + family promotions (OQ-P2S-4) |
| Empty and edge states | **LOCKED** — new athlete, import, prestige, Legacy, sub-tier IV |
| No Hidden Blockers copy by transition | **LOCKED** — gap conditions and copy for C→A, A→E, E→L, L→I |
| Navigation map | **LOCKED** |
| Architecture decisions P2S-D1–D18 | **LOCKED** |

### What Remains Open (Downstream, Not Blockers for This Document)

| Item | Owner | Notes |
|---|---|---|
| O-2 Amendment (athlete type declaration) | O-2 spec workstream | Required before Personal Improvement evaluation runs for new athletes. Q8 decision is locked; O-2 amendment executes it. |
| P-1 Amendment 001 (Progress entry point) | P-1 spec workstream | Required before P-2 navigation path is complete. Already identified in P-2 Architecture OQ-2. |
| TBD-11 (Legacy display format in M-1) | M-1 amendment | Low priority; only surfaces at the final promotion in the system. |
| P-3 Rank Detail screen | P-3 workstream | Blocked on TBD-12 verification; can begin after data model is confirmed complete. |

### Lock Basis

All four open questions (OQ-P2S-1 through OQ-P2S-4) have been resolved by user decision. No open questions remain within this document's scope. The two downstream actions (O-2 Amendment, P-1 Amendment 001) are dependencies for the surrounding system — not for this specification.

**This document is LOCKED v1.0 as of June 2026.**

---

## Section 16 — Validation Checklist

### TBD-2 / Sub-tier Surfacing
- [ ] `subtierAdvancePending` boolean correctly set when promotion queue delivers a sub-tier advance
- [ ] Hero rank display updates immediately on promotion delivery (not on P-2.2 view)
- [ ] Rank Journey Preview renders Updated State when `subtierAdvancePending = true`
- [ ] Updated State clears (`subtierAdvancePending = false`) when athlete views P-2.2
- [ ] P-2.2 renders Recent Advance State when `subtierAdvancePending = true` at entry
- [ ] Recent Advance highlight does not persist after athlete navigates away and returns
- [ ] Multiple pending advances cleared by single P-2.2 view

### Rank Journey Preview
- [ ] Always visible — never omitted regardless of athlete state
- [ ] Shows both sub-tier progress bar and family progress bar simultaneously (R-D47)
- [ ] Sub-tier bar and family bar have distinct labels
- [ ] No threshold values displayed on either bar
- [ ] Sub-tier IV state: sub-tier bar shows complete, family bar continues normally
- [ ] Legacy state: bars replaced by identity statement
- [ ] Tap → P-2.2 in all states

### P-2.2 Rank Journey Detail
- [ ] Current Rank Card shows family + sub-tier + identity statement + family entry date
- [ ] Dual Progress Component shows both dimensions with correct labels
- [ ] Category Signals show ✓/◑/○ status for relevant categories at the athlete's current promotion gate
- [ ] Personal Improvement signal label includes athlete type in parentheses: "Personal Improvement ([Type])"
- [ ] Personal Improvement label renders without parentheses when type is undeclared (graceful fallback)
- [ ] Category Signals not shown for Foundation athletes (replaced by encouraging note)
- [ ] Category Signals for prestige athletes include Recent Engagement signal
- [ ] Rank Ladder shows all 25 positions; current position marked
- [ ] Rank History omitted for athletes with no prior promotions
- [ ] Import transparency note shows for import athletes approaching Architect

### Signal Visibility
- [ ] No threshold values appear anywhere on P-2 or P-2.2
- [ ] No category weights or weighting ratios appear
- [ ] Current counts (programs, chapters, goals) visible in Category Signals
- [ ] Active week count does NOT appear in rank-context sections (surfaced in Consistency & Training only)
- [ ] Time gate existence acknowledged in copy; specific value not disclosed

### No Hidden Blockers
- [ ] Consistency and Improvement gaps trigger at sub-tier II or above (Tier A)
- [ ] Programs, Chapters, Goals, and Recent Engagement gaps trigger at sub-tier III or above (Tier B)
- [ ] One item shown at a time; Tier A gaps shown before Tier B gaps when both qualify
- [ ] Copy is identity-forward and directional (not corrective)
- [ ] Copy never states a threshold target number
- [ ] Copy for volitional requirements includes athlete's current count ("[N] programs graduated")
- [ ] Tap destination: P-2.2 Rank Journey Detail (all Priority 3b items)
- [ ] P-2.2 opens with Category Signals section scrolled into view when arriving from Priority 3b

### Empty and Edge States
- [ ] New athlete: empty bars render without error; encouraging note in P-2.2
- [ ] Import athlete: transparency note visible when approaching prestige ranks
- [ ] Post-queue import athlete: no import-specific UI distinction
- [ ] Time-gated athlete: "journey's elapsed time" acknowledgment appears when category requirements all met
- [ ] Legacy athlete: bars replaced with identity statement; What's Next falls to non-rank priorities
- [ ] Sub-tier IV athlete: sub-tier bar shows complete; appropriate copy

---

*P-2 Progress Hub Spec*
*Screen Specification v1.0 — June 2026*
*Resolves: TBD-2 (Sub-tier Surfacing Mechanism)*
*Authority: P-2-Progress-Hub-Architecture.md v1.1 (LOCKED), Rank-System-Architecture.md v1.0 (LOCKED), Rank-Computation-Model.md Sessions 1–5 (LOCKED), Rank-Calibration-Decisions.md v1.0 (LOCKED)*
*Status: DRAFT — Pending user decisions on OQ-P2S-1 through OQ-P2S-4 before lock*
