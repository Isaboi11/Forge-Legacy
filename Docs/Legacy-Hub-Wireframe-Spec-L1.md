# Forge Legacy — Legacy Hub Wireframe Specification
## L-1 | Phase 2C | Version 1.0 — June 2026

**Status:** Lock-Ready
**Tab:** Legacy (5th tab)
**Authority:** Forge Legacy Master PRD Section 12, FLM Standards v1.0, FLM/Sealed Chapter Amendment 001 (June 2026), Accomplishments Architecture Note v1.0, Product DNA
**Depends on:** H-1, L-3, L-4, G-2, W-3, O-3

---

## Preamble

L-1 is the root screen of the Legacy tab. It answers one question: **"What have I built?"**

H-1 answers "What should I focus on today?" — it is action-oriented.
L-1 answers "What have I built?" — it is reflective.

These are different questions. L-1 is not a second home screen. It is not a workout history screen. It is not an achievements feed. It is the athlete's legacy overview — the place where all training becomes permanent, where chapters tell stories, and where the full arc of a journey is visible.

**L-1 is a Legacy Summary Surface.** It shows:
- Who the athlete has become (rank identity strip)
- What they are currently building (active chapter)
- What they have built and preserved (sealed chapters + Featured Legacy Moment)
- The artifacts of their legacy (photos, timeline, accomplishments, honors)

The screen should feel **reflective, personal, earned, and meaningful.**

Not busy. Not competitive. Not social. Not gamified.

---

## Architecture Decisions

### Decision 1 — Purpose: Legacy Summary Surface

**Locked.** L-1 is a Legacy Summary Surface. Not a navigation hub (too cold). Not a timeline entry screen (too narrow in purpose). A summary surface that shows the full legacy at a glance and provides access to every deeper legacy screen.

---

### Decision 2 — Information Hierarchy: Chapter Spine First, Artifacts Follow

**Locked.** The scroll order is:

```
Identity Strip      (rank name · sub-tier — not a section)
  ↓
Section 1           Active Chapter
  ↓
Section 2           Featured Legacy Moment
  ↓
Section 3           Chapter History
  ↓
Section 4           Photos
  ↓
Section 5           Timeline Teaser
  ↓
Section 6           Accomplishments
  ↓
Section 7           Honors
```

**Photos at position 4 (not position 3 per original PRD):** The PRD was written before the FLM/Sealed Chapter Amendment 001 established the Chapter History section. Chapter History takes position 3 per that locked amendment. Photos moves to position 4. The PRD's original intent — Photos as an emotional anchor within the first scroll — is honored by placing it immediately after the chapter section.

**Accomplishments before Honors:** Accomplishments are athlete-authored legacy declarations. Honors are system-awarded recognition. Story Before Data, Identity Over Performance, and Athlete-authored meaning over system recognition all favor placing the athlete's own declarations first. The FLM Standards encode this: Major Accomplishment is Priority 5 (Tier 2), Honor Earned is Priority 6 (Tier 3). L-1 section ordering is consistent with that hierarchy.

Sections 2–7 are individually omittable with no placeholder when no qualifying content exists. A brand-new athlete sees only the identity strip and the active chapter invitation. This is intentional — the screen begins sparse and fills as the legacy grows.

---

### Decision 3 — Active Chapter: Summary Card (Not H-1 Hero)

**Locked.** The active chapter on L-1 is a summary card. On H-1, the chapter is the hero — the focal point of the athlete's attention for today. On L-1, the chapter is viewed in the context of the full legacy. It is prominent, but not dominant.

---

### Decision 4 — FLM: Follows Standards and Amendment, No Redesign

**Locked.** The FLM section follows FLM Standards v1.0 and FLM/Sealed Chapter Amendment 001 exactly. This spec defines the FLM card visual format for the first time. The selection algorithm is not redefined here — it is implemented from the Standards document.

---

### Decision 5 — Chapter History: FLM/Sealed Chapter Amendment 001 Authority

**Locked.** State A (expanded) and State B (compact) per FLM/Sealed Chapter Amendment 001, Sections 3 and 4. Single occupancy rule enforced. No redesign.

---

### Decision 6 — Historical Chapters: Full List, No Pagination (MVP)

**Locked.** All sealed chapters visible on L-1 scroll. Ordered most recent first. No cap, no "Show More." Pagination deferred to V1.1+.

---

### Decision 7 — Accomplishments: Before Honors

**Locked.** Accomplishments appear in Section 6. Preview 3 most recently added. Account-level and chapter-level combined with no visual differentiation. "View All" → L-12.

---

### Decision 8 — Honors: After Accomplishments

**Locked.** Honors appear in Section 7. Preview 3 most recently earned. "View All" → L-10.

---

### Decision 9 — Timeline Teaser

**Locked.** 2–3 most recent timeline entries. Section 5. "View Full Timeline" → L-2.

---

### Decision 10 — No Metrics Dashboard

**Locked.** No headline stats. No total workout count. No streak counter. No total volume. Section headers include item counts as navigational labels only (e.g., "HONORS 12"). Photos count in section header is navigational context. Full photo limit display (X of 50) is on L-15 only.

---

### Decision 11 — Empty States: Silent Omission

**Locked.** Sections 2–7 are silently omitted when no qualifying content exists. No placeholder cards. No "nothing here yet" copy. Silence is the correct empty state.

---

### Decision 12 — Navigation Ownership

**Locked.** L-1 navigates to: L-2, L-3, L-4, L-5, L-10, L-12, L-15, G-2, W-3, P-1. Full tap destination map in Section 13.

---

## Section 1 — Purpose

L-1 is the root screen of the Legacy tab. It is the first thing the athlete sees when they tap the Legacy icon. It is the only Legacy screen that is always accessible without navigating from another screen.

**L-1 succeeds when:**
1. The athlete sees their full legacy at a glance — what they are building, what they have built, and what the system has recognized
2. Every piece of content feels earned, personal, and permanent
3. The screen feels reflective and spacious — not crowded, not gamified
4. The athlete can reach any legacy sub-screen within one tap
5. The athlete who has built a lot is rewarded with a rich, scrollable archive
6. The brand-new athlete is welcomed, not shamed — the sparse screen communicates potential, not emptiness

**L-1 fails when:**
- It reads as a workout log or activity feed
- It surfaces metrics as primary content (total workouts, streaks, totals)
- It feels like a leaderboard or ranking screen
- Empty sections leave visual holes with placeholder copy
- The athlete cannot distinguish L-1 from H-1 in purpose or feeling
- Chapter content is buried below system-generated content

---

## Section 2 — Screen Goals

**Primary goal:** Show the athlete what their legacy has become — now and over time.

**Secondary goal:** Provide immediate access to every legacy sub-screen without requiring the athlete to know the navigation structure.

**Emotional outcome: Earned.**

The athlete should feel that this screen belongs to them. Every element on it was put there by what they actually did. The honors were earned. The chapter was built. The photos were taken during real sessions. The accomplishments were declared by the athlete themselves. The screen is a mirror, not a metric.

---

## Section 3 — Information Hierarchy

The full scroll order of L-1 with visual separation and behavioral notes:

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  [App Bar — "Legacy" title]                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Apprentice · I                    ← Identity strip     │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  ACTIVE CHAPTER                   ← Section 1          │
│  [Active Chapter Card]                                  │
│  or [Invitation Card]                                   │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  FEATURED MOMENT                  ← Section 2          │
│  [FLM Card]                                            │
│  (omitted when no eligible event)                      │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  [Chapter History — no section label]  ← Section 3    │
│  [State A Card — most recently sealed, if ≤ 7 days]   │
│  [State B Cards — all other sealed, most recent first] │
│  (omitted when no sealed chapters)                     │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  PHOTOS  12                       ← Section 4          │
│  [Horizontal photo strip]                              │
│  View All 12 Photos ›                                  │
│  (omitted when no photos)                              │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  TIMELINE                         ← Section 5         │
│  [2–3 recent entries]                                  │
│  View Full Timeline ›                                  │
│  (omitted when no entries)                             │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  ACCOMPLISHMENTS  3               ← Section 6         │
│  [3 most recent accomplishments]                       │
│  View All 3 Accomplishments ›                         │
│  (omitted when no accomplishments)                     │
│                                                         │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│  HONORS  12                       ← Section 7         │
│  [3 most recently earned honors]                       │
│  View All 12 Honors ›                                  │
│  (omitted when no honors)                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Section labels** (ACTIVE CHAPTER, FEATURED MOMENT, PHOTOS, TIMELINE, ACCOMPLISHMENTS, HONORS) are 11sp, muted, caps, left-aligned, above their respective content blocks.

**Chapter History section has no label.** The chapter cards speak for themselves. No section label separates the chapter history from what precedes it — a light visual divider or spacing is sufficient. The chapter spine is self-evident.

**Absence behavior:** When a section has no qualifying content, the section and its label are absent. The screen reflows naturally. No skeleton cards. No "nothing yet" messages. No visual gaps.

---

## Section 4 — Identity Strip

The identity strip is not a section. It is a compact element that appears at the top of scroll content, before the Active Chapter section. It is always present.

```
┌─────────────────────────────────────────────────────────┐
│  Apprentice · I                                         │
└─────────────────────────────────────────────────────────┘
```

**Element:**
- Rank name + sub-tier — "Apprentice · I" — 14sp, primary weight, left-aligned
- No progress bar (progress bar exclusively on P-3 Rank Detail)
- No tap behavior — not navigable from the identity strip
- Always present for all athletes, including brand-new athletes (all athletes begin at Apprentice · I)

**Purpose:** The identity strip anchors the Legacy tab with the answer to a secondary question: "Who have you become?" It is placed before the chapter content because identity is the context for legacy. The screen opens with who the athlete is, then shows what they have built.

**Rank names note:** Final rank names and thresholds are defined during the design phase (PRD Section 15). The identity strip renders whatever the current rank name and sub-tier are. This spec uses "Apprentice · I" as a placeholder. See Architecture Risks, Risk 6.

**Why not in the App Bar:** The rank belongs to the content of the Legacy screen, not to the navigation chrome. Placing it in the App Bar would imply it is page metadata rather than personal identity content.

---

## Section 5 — Active Chapter (Section 1)

### 5.1 When an Active Chapter Exists

```
ACTIVE CHAPTER
┌──────────────────────────────────────────────────────────┐
│  Road to 405                                             │
│  Since Apr 5, 2026  ·  67 days in                       │
│                                                          │
│  Squat 405 lbs                                          │
│  ████████████░░░░░░░░░░  67%                            │
└──────────────────────────────────────────────────────────┘
```

**Card elements:**

**Chapter name** — 20sp, primary weight. The athlete's own name for this period of their life.

**Date started + duration** — "Since [Month Day, Year] · [N] days in" — 13sp, muted. Duration counts from chapter creation date to today.

**Primary goal state** — one of four states:

| Goal State | Display | Condition |
|-----------|---------|-----------|
| Quantifiable, in progress | "[Goal Name]" + progress bar + "[N]%" | Target set, not yet reached |
| Quantifiable, achieved | "✓ [Goal Name] achieved" | Target reached — chapter still active |
| Narrative, in progress | "[Goal Name] — In Progress" | No Target set |
| No goal | *(element absent)* | No primary goal was set |

Progress bar: 4dp height, accent color fill, full width of card. Percentage label right-aligned, 12sp, muted.

The "✓" in achieved state uses the success or accent color.

**Tap:** Full card → L-3 (Active Chapter Detail).

**Differentiation from H-1:**
H-1 shows the active chapter as a hero — 24sp chapter name, prominent progress bar, the dominant element of the screen. L-1 shows the active chapter as a summary card at 20sp, within the context of the full legacy. The visual hierarchy communicates the difference in purpose: H-1 is for today; L-1 is for the full story.

### 5.2 No Active Chapter — Invitation Card

When no active chapter exists:

```
┌──────────────────────────────────────────────────────────┐
│  Your training builds your legacy.                       │
│  Start a chapter to give it a name.                     │
│                                                          │
│  [  Start a Chapter  ]           ← Secondary CTA        │
└──────────────────────────────────────────────────────────┘
```

**Elements:**
- Headline: "Your training builds your legacy." — 15sp, primary weight
- Sub-copy: "Start a chapter to give it a name." — 14sp, muted
- "Start a Chapter" — Secondary CTA → L-5 (Chapter Creation, post-onboarding)

**No section label on the invitation card.** The ACTIVE CHAPTER label is absent when showing the invitation — the invitation stands alone, warmer and more personal without a system label above it.

**The invitation always shows when there is no active chapter**, regardless of whether sealed chapters exist. An athlete who has sealed three chapters and not yet started a fourth should see the invitation — they are between chapters, not done with chapters.

**"Start a Chapter" destination:** L-5 (Chapter Creation, post-onboarding). L-5 is unspecced as of this writing. See Architecture Risks, Risk 1.

### 5.3 Active Chapter Card Visual States (Summary)

| State | What Shows |
|-------|-----------|
| Active + quantifiable goal (in progress) | Name + date + goal name + progress bar + % |
| Active + quantifiable goal (achieved, chapter still active) | Name + date + ✓ goal achieved |
| Active + narrative goal | Name + date + goal name — In Progress |
| Active + no goal | Name + date only |
| No active chapter | Invitation card with "Start a Chapter" CTA |

---

## Section 6 — Featured Legacy Moment (Section 2)

### 6.1 Overview

The Featured Legacy Moment is the single most meaningful event in the athlete's recent legacy. It is a curated, editorial moment — not a notification, not a feed item, not a badge.

This section follows **FLM Standards v1.0** and **FLM/Sealed Chapter Amendment 001** for selection logic. This spec defines the card's visual format.

**When no eligible event exists:** The section is omitted entirely. No label. No placeholder. No empty card.

### 6.2 Section Label

"FEATURED MOMENT" — 11sp, muted, caps.

### 6.3 FLM Card Format

The FLM card is an editorial moment card. It surfaces one event with a clear event type label, the event's primary description, and the date.

**General structure:**

```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  [EVENT TYPE LABEL]                      [Date/Time-ago] │
│                                                          │
│  [Event primary description]                             │
│                                                          │
│  [Secondary line — optional, event-type specific]        │
└──────────────────────────────────────────────────────────┘
```

**Event type label:** 11sp, accent color or muted, caps. Identifies the event class.
**Event primary description:** 18sp, primary weight. The specific name of the event (chapter name, goal name, honor name, etc.).
**Secondary line:** 13sp, secondary, muted. Optional. Exists for some event types only.
**Date / time-ago:** 12sp, muted, right-aligned on same line as event label. Format: "Today" / "3 days ago" / "Jun 11" (for events older than 7 days, show calendar date).

### 6.4 FLM Card by Event Type

**Chapter Sealed (Priority 1):**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  CHAPTER SEALED                          Jun 11, 2026   │
│                                                          │
│  Road to 405                                            │
│                                                          │
│  "I proved to myself that consistency over six         │
│   weeks beats intensity over one."                      │
└──────────────────────────────────────────────────────────┘
```
- Primary: chapter name
- Secondary: reflection excerpt ~120 chars, quoted, 13sp, muted (omitted when no reflection was written)
- Tap → L-4 (Archived Chapter Detail)

**Chapter Sealed — no reflection:**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  CHAPTER SEALED                          Jun 11, 2026   │
│                                                          │
│  Road to 405                                            │
└──────────────────────────────────────────────────────────┘
```
- No secondary line. No "No reflection added" placeholder. Silence when absent.

**Goal Achieved (Priority 2):**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  GOAL ACHIEVED                               Today      │
│                                                          │
│  Squat 405 lbs                                          │
│  100% complete                                          │
└──────────────────────────────────────────────────────────┘
```
- Primary: goal name
- Secondary: "[N]% complete at achievement" — only when progress was tracked (quantifiable goal); omitted for narrative goals (show "Achieved" instead of percentage)
- Tap → G-2 (Goal Detail)

**Rank Up (Priority 3):**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  RANK ACHIEVED                           Jun 3, 2026   │
│                                                          │
│  Apprentice · II                                        │
└──────────────────────────────────────────────────────────┘
```
- Primary: new rank name + sub-tier
- No secondary line
- Tap → P-1 (Profile Modal — fallback until P-3 Rank Detail is specced)

**Program Graduated (Priority 4):**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  PROGRAM GRADUATED                       Jun 5, 2026   │
│                                                          │
│  Power Block — Cycle 1                                  │
└──────────────────────────────────────────────────────────┘
```
- Primary: program name
- Tap → W-3 (Program Detail)

**Major Accomplishment (Priority 5):**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  ACCOMPLISHMENT                          May 28, 2026  │
│                                                          │
│  Completed my first marathon                            │
└──────────────────────────────────────────────────────────┘
```
- Primary: accomplishment text (truncated to ~60 chars if long)
- Tap → P-1 (Profile Modal — fallback until L-12 is specced)

**Honor Earned (Priority 6):**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  HONOR EARNED                            Jun 9, 2026   │
│                                                          │
│  10 Workouts in Chapter                                 │
└──────────────────────────────────────────────────────────┘
```
- Primary: honor name
- Tap → **Inert for MVP v1.0** (no honor detail screen exists). See Architecture Risks, Risk 3.

**Reflection Added (Priority 7):**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  REFLECTION ADDED                        Jun 8, 2026   │
│                                                          │
│  Road to 405                                            │
│  "The final week felt completely different from the     │
│   first."                                               │
└──────────────────────────────────────────────────────────┘
```
- Primary: chapter name
- Secondary: reflection excerpt ~120 chars
- Tap → L-4 (Archived Chapter Detail — the chapter the reflection was added to)

**Memory Added (Priority 8):**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  MEMORY ADDED                            Jun 7, 2026   │
│                                                          │
│  Memory added to Road to 405                            │
└──────────────────────────────────────────────────────────┘
```
- Primary: "Memory added to [Chapter Name]"
- Tap → L-4 (Archived Chapter Detail — the chapter the memory was added to)

**Photo Added (Priority 9):**
```
FEATURED MOMENT
┌──────────────────────────────────────────────────────────┐
│  PHOTO ADDED                             Jun 6, 2026   │
│                                                          │
│  Photo added to Road to 405                             │
└──────────────────────────────────────────────────────────┘
```
- Primary: "Photo added to [Chapter Name]"
- Tap → L-4 (Archived Chapter Detail — the chapter the photo belongs to)

### 6.5 Selection Authority

The FLM is selected by the algorithm defined in FLM Standards v1.0 Section 2. L-1 renders whatever the algorithm produces. L-1 does not override, filter, or modify the selection.

---

## Section 7 — Chapter History (Section 3)

### 7.1 Overview

The Chapter History section displays the athlete's sealed chapters. It is the heart of the Legacy Hub — the record of completed transformation periods.

**No section label.** The chapter cards follow naturally from the Featured Legacy Moment section. The visual distinction between chapter history and what precedes it comes from spacing and card format, not a label.

**Section omitted entirely** when no sealed chapters exist.

### 7.2 State A — Recently Sealed Chapter (0–7 Days)

Follows **FLM/Sealed Chapter Amendment 001, Section 3** exactly.

```
┌──────────────────────────────────────────────────────────┐
│  Road to 405                                             │
│  Apr 5 – Jun 11, 2026  ·  67 days                       │
│                                                          │
│  ✓ Squat 405 lbs achieved                               │
│                                                          │
│  "I proved to myself that consistency over six weeks    │
│   beats intensity over one."                            │
│                                                          │
│  47 workouts  ·  3 honors  ·  Sealed Jun 11             │
└──────────────────────────────────────────────────────────┘
```

**Card elements (from Amendment 001):**
- Chapter name — primary weight, large
- Date range + duration — "MMM D – MMM D, YYYY · N days" — 13sp, muted
- Primary goal outcome (three states: achieved / in progress at sealing / omitted)
- Reflection excerpt — first ~120 characters, quoted, 13sp, muted — omitted when no reflection was written
- Summary counts — "[N] workouts · [N] honors · Sealed [Month Day]" — 12sp, muted

**Single occupancy rule:** Only the most recently sealed chapter may be in State A at any given time. If multiple chapters are sealed within the 7-day window, only the newest is State A. All others render as State B.

**Tap:** Full card → L-4 (Archived Chapter Detail).

### 7.3 State B — Historical Chapter Card (8+ Days)

Follows **FLM/Sealed Chapter Amendment 001, Section 4** exactly.

```
┌──────────────────────────────────────────────────────────┐
│  Road to 405                   Apr – Jun 2026  ·  67d   │
│  ✓ Squat 405 lbs achieved                               │
│  47 workouts  ·  3 honors                               │
└──────────────────────────────────────────────────────────┘
```

**Card elements (from Amendment 001):**
- Chapter name + date range + duration — single condensed line. Month + year only. Duration abbreviated ("67d"). If chapter spans calendar years: "Dec 2025 – Feb 2026 · 67d".
- Primary goal outcome — one line (same three states as State A)
- Summary counts — "[N] workouts · [N] honors" — 12sp, muted. Sealed date absent in compact state.

No reflection excerpt in State B.

**Tap:** Full card → L-4 (Archived Chapter Detail).

### 7.4 Chapter History Full Scroll Example

An athlete with four sealed chapters would see:

```
[State A card — most recently sealed — expanded]

[State B card — Chapter 3 — compact]

[State B card — Chapter 2 — compact]

[State B card — Chapter 1 — compact]
```

No "Your Chapter History" header. No pagination button. The list is the history.

### 7.5 Primary Goal Outcome States (Both State A and B)

| Condition | Display |
|-----------|---------|
| Quantifiable goal completed | "✓ [Goal Name] achieved" — checkmark in accent/success color |
| Narrative goal, or quantifiable goal not reached | "[Goal Name] — in progress at sealing" — 14sp, muted |
| No primary goal was set | *(element absent — no placeholder)* |

---

## Section 8 — Photos (Section 4)

### 8.1 Overview

The Photos section is an emotional anchor — a horizontal strip of recent photos from across the athlete's legacy. It shows the athlete's training life in images, account-wide, most recently added first.

The Photos section follows immediately after the Chapter History section. It is placed here because photos belong to chapters, and chapters have just been presented. The strip provides a visual, emotional counterpoint to the text-based chapter cards above.

```
PHOTOS  12
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ ▓▓▓ │ │ ▓▓▓ │ │ ▓▓▓ │ │ ▓▓▓ │ │ ▓▓▓ │
│ ▓▓▓ │ │ ▓▓▓ │ │ ▓▓▓ │ │ ▓▓▓ │ │ ▓▓▓ │
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘
View All 12 Photos ›
```

### 8.2 Section Elements

**Section label:** "PHOTOS [N]" — 11sp, muted, caps, left-aligned. Count is navigational context, not a metric.

**Photo strip:** Horizontal scroll. Displays 3–5 square thumbnails. Equal size. Thumbnails are clipped square from the full image.

**Photo order:** Reverse chronological — most recently added photo first, regardless of which chapter it belongs to.

**Footer:** "View All [N] Photos ›" — 13sp, primary or link color — → L-15 (Photos, unspecced).

**No chapter label on thumbnails.** The chapter context for any photo is accessible by tapping the thumbnail → L-4 of the chapter that photo belongs to.

### 8.3 Tap Behavior

**Tap a thumbnail:** → L-4 (Archived Chapter Detail or Active Chapter Detail, for the chapter the photo belongs to). MVP fallback — a dedicated photo detail screen is unspecced. See Architecture Risks, Risk 5.

**Tap "View All [N] Photos ›":** → L-15 (Photos). Unspecced. See Architecture Risks, Risk 5.

### 8.4 Empty State

Section omitted entirely when the athlete has added zero photos. No label. No placeholder. No "Add your first photo" copy on this screen.

---

## Section 9 — Timeline Teaser (Section 5)

### 9.1 Overview

The Timeline Teaser provides a brief window into the athlete's Legacy Timeline (L-2). It shows 2–3 of the most recent timeline entries, organized chronologically, and invites the athlete to view the full timeline.

The timeline is not the same as the Featured Legacy Moment. The FLM selects the most *meaningful* event; the timeline shows the most *recent* events. They may overlap but are independent.

```
TIMELINE
  Chapter Sealed · Road to 405                 Jun 11
  Program Graduated · Power Block — Cycle 1   Jun 5
  Honor Earned · 10 Workouts in Chapter       Jun 9
View Full Timeline ›
```

### 9.2 Section Elements

**Section label:** "TIMELINE" — 11sp, muted, caps, left-aligned. No count in label.

**Timeline entries:** 2–3 most recent entries. Each entry is a single line:
- Event type + event description (13sp, primary) + "·" + chapter attribution (13sp, muted) + date (12sp, muted, right-aligned)
- Entry height: 44dp minimum (tap target)
- Not tappable individually in MVP v1.0 (navigate to L-2 for detail). Full entry tap behavior deferred to L-2 spec.

**Footer:** "View Full Timeline ›" — 13sp, primary or link color — → L-2.

### 9.3 Entry Format

```
[Event Type] · [Event/Object Name]              [Date]
```

Examples:
- "Chapter Sealed · Road to 405" — Jun 11
- "Program Graduated · Power Block — Cycle 1" — Jun 5
- "Honor Earned · 10 Workouts in Chapter" — Jun 9
- "Goal Achieved · Squat 405 lbs" — Jun 1
- "Memory Added · Road to 405" — May 28

Dates: for entries within the last 7 days, use calendar date ("Jun 11"). Not time-ago in the teaser (the full timeline handles relative formatting).

### 9.4 Empty State

Section omitted entirely when no timeline entries exist (brand-new athlete with no activity).

### 9.5 V1.1 Candidate — Per-Entry Deep Links

In MVP v1.0, timeline teaser entries are not individually tappable — the athlete navigates to L-2 for any timeline detail.

In V1.1, each entry may be directly tappable with event-type-specific destinations:

| Event Type | Tap Destination |
|-----------|----------------|
| Chapter Sealed | L-4 (Archived Chapter Detail) |
| Goal Achieved | G-2 (Goal Detail) |
| Program Graduated | W-3 (Program Detail) |
| Honor Earned | L-10 (Honor Detail — requires L-10 to be specced) |

All destinations except L-10 are already specced. Implement alongside L-2 spec or as a standalone V1.1 amendment.

---

## Section 10 — Accomplishments (Section 6)

### 10.1 Overview

Accomplishments are athlete-authored legacy declarations. The athlete wrote them. They represent real-world achievements, personal milestones, and life events — not in-app behavior.

Accomplishments appear **before** Honors on L-1 because the athlete's own declarations take precedence over the system's recognitions. This ordering is consistent with the FLM Standards hierarchy (Major Accomplishment at Priority 5, Tier 2 vs. Honor Earned at Priority 6, Tier 3).

```
ACCOMPLISHMENTS  3
  Completed my first marathon                     Jun 2026
  Qualified for regionals in powerlifting         May 2026
  First sub-hour open-water swim                  Apr 2026
View All 3 Accomplishments ›
```

### 10.2 Section Elements

**Section label:** "ACCOMPLISHMENTS [N]" — 11sp, muted, caps, left-aligned. Count is right-aligned "View All ›" link.

**Preview list:** 3 most recently added accomplishments (by creation date in Forge Legacy — not by any historical date in the accomplishment text).

**Accomplishment row:**
- Accomplishment text (truncated at ~60 chars with ellipsis if longer) — 13sp, primary
- Date added — "[Month Year]" — 12sp, muted, right-aligned

**No visual differentiation** between account-level accomplishments (created in O-2e) and chapter-level accomplishments. Both are first-class records, displayed identically. See Accomplishments Architecture Note v1.0.

**Footer:** "View All [N] Accomplishments ›" — 13sp, primary or link color — → L-12 (Accomplishments Detail, unspecced). See Architecture Risks, Risk 4.

### 10.3 Empty State

Section omitted entirely when the athlete has zero accomplishments. The section does not appear until the athlete creates at least one accomplishment (either in O-2e onboarding or post-onboarding).

---

## Section 11 — Honors (Section 7)

### 11.1 Overview

Honors are system-awarded achievements. The product grants them automatically based on what the athlete does. They appear **after** Accomplishments on L-1 because system recognition is supporting context for the athlete's legacy, not its primary expression.

```
HONORS  12
  10 Workouts in Chapter                      Jun 9, 2026
  First Program Graduated                     Jun 5, 2026
  First Goal Achieved                         Jun 1, 2026
View All 12 Honors ›
```

### 11.2 Section Elements

**Section label:** "HONORS [N]" — 11sp, muted, caps, left-aligned. Count is right-aligned "View All ›" link.

**Preview list:** 3 most recently earned honors.

**Honor row:**
- Honor name — 13sp, primary
- Date earned — "MMM D, YYYY" — 12sp, muted, right-aligned

**Footer:** "View All [N] Honors ›" — 13sp, primary or link color — → L-10 (Honors List, unspecced). See Architecture Risks, Risk 3.

### 11.3 Empty State

Section omitted entirely when the athlete has earned zero honors. New athletes will see this section appear after their first workout triggers their first honor (typically "First Step" or equivalent).

---

## Section 12 — Empty States

### 12.1 Philosophy

When a section has no qualifying content, it is absent. Not empty. Not placeholder-filled. Not replaced with a prompt. Absent.

This principle applies to every section on L-1 except Section 1 (Active Chapter). Section 1 always shows — either the active chapter card or the invitation card. All other sections are silently omitted.

The reason: the Featured Legacy Moment section's purpose is to show what the athlete has built. An athlete who has not yet built anything has nothing to show. Showing an empty state misrepresents the section as a container waiting to be filled, when it is actually a curation of what exists. This logic extends to all sections.

### 12.2 Brand-New Athlete

An athlete who has just completed onboarding (O-1 + O-2 + O-3) sees:

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
│  [App Bar — "Legacy"]                                   │
│                                                         │
│  Apprentice · I                                         │
│                                                         │
│  Your training builds your legacy.                      │
│  Start a chapter to give it a name.                     │
│                                                         │
│  [  Start a Chapter  ]                                  │
│                                                         │
│  [Nothing else — sections 2–7 all omitted]             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

If the athlete completed O-3 with a chapter, Section 1 shows the active chapter card instead of the invitation. Sections 2–7 remain absent — the legacy is just beginning.

**This is not an empty screen. It is an invitation.** The identity strip anchors the athlete ("Apprentice · I"). The invitation card gives them a clear direction. The absence of supplementary sections communicates potential, not emptiness.

### 12.3 Empty State Map

| Section | Condition | Behavior |
|---------|-----------|---------|
| Identity Strip | Always | Always present — never absent |
| Section 1 | No active chapter | Invitation card replaces active chapter card |
| Section 2 | No FLM eligible event | Section omitted entirely (per FLM Standards Section 5) |
| Section 3 | No sealed chapters | Section omitted entirely |
| Section 4 | No photos (count = 0) | Section omitted entirely |
| Section 5 | No timeline entries | Section omitted entirely |
| Section 6 | No accomplishments (count = 0) | Section omitted entirely |
| Section 7 | No honors (count = 0) | Section omitted entirely |

### 12.4 "Between Chapters" State

An athlete who has sealed their active chapter and not yet started a new one:
- Section 1: Invitation card ("Your training builds your legacy. Start a chapter to give it a name.")
- Section 2: FLM shows the Chapter Sealed event (if within 30-day window)
- Section 3: Chapter History shows the recently sealed chapter (State A if ≤ 7 days, State B if > 7 days)
- Sections 4–7: present if content exists

The invitation card is always shown when there is no active chapter, regardless of how many sealed chapters exist.

---

## Section 13 — Navigation

### 13.1 L-1 Navigation Ownership

L-1 is the navigation root of the Legacy tab. It owns navigation to all Legacy sub-screens and to relevant screens in other tabs.

| Tap Target | Destination | Status |
|-----------|-------------|--------|
| Active Chapter card | L-3 (Active Chapter Detail) | Specced |
| "Start a Chapter" CTA | L-5 (Chapter Creation, post-onboarding) | Unspecced — see Risk 1 |
| FLM card — Chapter Sealed | L-4 (Archived Chapter Detail) | Specced |
| FLM card — Goal Achieved | G-2 (Goal Detail) | Specced |
| FLM card — Rank Up | P-1 (Profile Modal — fallback) | Specced fallback |
| FLM card — Program Graduated | W-3 (Program Detail) | Specced |
| FLM card — Major Accomplishment | P-1 (Profile Modal — fallback) | Specced fallback |
| FLM card — Honor Earned | Inert — MVP v1.0 | See Risk 3 |
| FLM card — Reflection Added | L-4 (chapter of the reflection) | Specced |
| FLM card — Memory Added | L-4 (chapter of the memory) | Specced |
| FLM card — Photo Added | L-4 (chapter of the photo) | Specced |
| State A sealed chapter card | L-4 (Archived Chapter Detail) | Specced |
| State B sealed chapter card | L-4 (Archived Chapter Detail) | Specced |
| Photo thumbnail | L-4 (chapter the photo belongs to) — MVP fallback | See Risk 5 |
| "View All [N] Photos ›" | L-15 (Photos) | Unspecced — see Risk 5 |
| "View Full Timeline ›" | L-2 (Timeline) | Unspecced — see Risk 2 |
| "View All [N] Accomplishments ›" | L-12 (Accomplishments Detail) | Unspecced — see Risk 4 |
| "View All [N] Honors ›" | L-10 (Honors List) | Unspecced — see Risk 3 |

### 13.2 Back Navigation

L-1 has no back button — it is the root of the Legacy tab. The system back gesture or hardware back button (Android) navigates to the previous tab in the system stack, not within the Legacy tab.

### 13.3 Navigation Into L-1

L-1 is accessed via the Legacy tab icon. It is also the destination of any app-level navigation to the Legacy tab (e.g., deep links, push notifications directing to "Legacy"). There is no navigation within Forge Legacy that pushes L-1 onto a stack — it is always a tab root.

### 13.4 In-App Navigation to L-1 From Other Screens

No other screen within Forge Legacy navigates to L-1 via push navigation. L-1 is always accessed via the Legacy tab. There are no "View in Legacy" CTAs that push to L-1 — CTAs from other screens that reference the Legacy tab navigate to L-3 or L-4 directly, not to L-1.

---

## Section 14 — Post-State Behavior

L-1 reflects the current legacy state on every load. The athlete may arrive at L-1 from any context — returning from a workout, from a chapter sealing, from goal creation. L-1 must always reflect the current state.

### 14.1 After Sealing a Chapter

The athlete seals a chapter (completing L-6 Chapter Reflection) and returns to H-1. On next L-1 visit:
- Section 1: Active Chapter becomes invitation card (no active chapter) OR shows new active chapter if one was started immediately
- Section 2: FLM updates to show Chapter Sealed (highest priority event — Tier 1, Priority 1)
- Section 3: The sealed chapter appears as State A (if within 7 days — which it will be, having just been sealed)

No intermediate state. L-1 loads current state.

### 14.2 After Starting a New Chapter (L-5 → L-1)

The athlete creates a new chapter via L-5 and navigates to L-1:
- Section 1: Active Chapter card shows the new chapter (name + "Since [today]" + "0 days in" + goal state)

### 14.3 After Achieving a Goal (G-2 → L-1)

The athlete marks a goal as achieved in G-2. On L-1:
- Section 1: Active Chapter card updates goal state to "✓ [Goal Name] achieved"
- Section 2: FLM may update to Goal Achieved if it becomes the highest-priority eligible event

### 14.4 After Adding a Photo (L-3 or L-4 → L-1)

The athlete adds a photo from within L-3 or L-4. On L-1:
- Section 4: Photos strip updates — new photo appears as the first thumbnail

### 14.5 After Earning an Honor

Honors are awarded by the system (typically on W-17 Workout Summary via M-2 Honor Earned Modal). On next L-1 visit:
- Section 2: FLM may update to Honor Earned if no higher-priority event is active in the window
- Section 7: Honors section updates to show the new honor in the preview

---

## Section 15 — Mobile UX

### 15.1 Screen Type

L-1 is a full-page scrollable screen. It is the root of the Legacy tab — not a modal, not a pushed screen. The system App Bar shows "Legacy" as the screen title. No back button.

### 15.2 Tab Bar

The system Tab Bar is always visible on L-1. The Legacy tab icon is in the selected/active state.

### 15.3 Scroll Behavior

L-1 is a vertical scroll. The App Bar collapses on scroll (standard Material/iOS large title behavior) if applicable to the platform design system. The Tab Bar remains anchored at the bottom — it does not scroll away.

The identity strip is part of the scroll content, not the App Bar. It scrolls with the page.

### 15.4 Portrait Orientation

L-1 is portrait-only.

### 15.5 Tap Target Minimums

| Element | Minimum Tap Target |
|---------|-------------------|
| Active Chapter card | Full width × 80dp minimum |
| "Start a Chapter" CTA | Full width × 52dp |
| FLM card | Full width × 80dp minimum |
| State A sealed chapter card | Full width × 120dp minimum |
| State B sealed chapter card | Full width × 60dp minimum |
| Photo thumbnail | 64×64dp minimum |
| "View All Photos" footer | Full width × 44dp |
| Timeline entry row | Full width × 44dp |
| "View Full Timeline" footer | Full width × 44dp |
| Accomplishment row | Full width × 44dp |
| "View All Accomplishments" footer | Full width × 44dp |
| Honor row | Full width × 44dp |
| "View All Honors" footer | Full width × 44dp |

### 15.6 Section Spacing

Consistent vertical spacing between sections. Section labels appear directly above their content with a consistent margin. Sections that are absent contribute zero vertical space — the scroll reflows without visual gaps.

### 15.7 Photo Strip Scroll

The Photos strip is a horizontal scroll embedded within the vertical scroll of L-1. Standard nested scroll behavior. The horizontal strip is fully scrollable without triggering the vertical scroll. A visual affordance (partial next thumbnail visible at the right edge) communicates that more photos exist.

---

## Section 16 — Accessibility

### 16.1 Identity Strip

- `accessibilityLabel` = "Legacy rank: Apprentice, sub-tier 1" (spoken as natural language)
- `accessibilityRole` = "text"
- Not in the interactive element tree (no role that implies tap)

### 16.2 Active Chapter Card

- `accessibilityLabel` = "Active chapter: [Chapter Name]. Started [date]. [Goal state if applicable]. Tap to view chapter detail."
- `accessibilityRole` = "button"

### 16.3 No Active Chapter — Invitation

- `accessibilityLabel` = "Your training builds your legacy. Start a chapter to give it a name."
- "Start a Chapter" button: `accessibilityLabel` = "Start a new chapter"

### 16.4 FLM Card

- `accessibilityLabel` = "[Event type label]: [Event description]. [Date]. [Reflection excerpt if present]. Tap to view."
- `accessibilityRole` = "button"
- When inert (Honor Earned MVP): `accessibilityRole` = "text" (not a button), `accessibilityHint` omitted

### 16.5 Sealed Chapter Cards (State A and B)

- `accessibilityLabel` = "Sealed chapter: [Chapter Name]. [Date range], [N] days. [Goal outcome if present]. Tap to view chapter."
- `accessibilityRole` = "button"

### 16.6 Photo Strip

- Each thumbnail: `accessibilityLabel` = "Photo from [Chapter Name], added [date]"
- `accessibilityRole` = "button"
- "View All Photos" link: `accessibilityLabel` = "View all [N] photos"

### 16.7 Timeline Entries

- Each row: `accessibilityLabel` = "[Event type]: [event description]. [Chapter name]. [Date]."
- "View Full Timeline": `accessibilityLabel` = "View full legacy timeline"

### 16.8 Accomplishment Rows

- Each row: `accessibilityLabel` = "[Accomplishment text], added [Month Year]"
- "View All Accomplishments": `accessibilityLabel` = "View all [N] accomplishments"

### 16.9 Honor Rows

- Each row: `accessibilityLabel` = "Honor: [Honor name], earned [date]"
- "View All Honors": `accessibilityLabel` = "View all [N] honors"

---

## Section 17 — Edge Cases

### 17.1 Brand-New Athlete (All Sections Empty)

**Condition:** Athlete just completed onboarding. No chapter, no honors, no accomplishments, no photos, no timeline entries, no FLM.

**Behavior:** Identity strip + invitation card only. All sections 2–7 absent. Screen is intentionally minimal. This is correct — the legacy is just beginning.

---

### 17.2 Active Chapter With No Goal

**Condition:** Athlete has an active chapter but created it without setting a primary goal (valid per O-3 and G-1 specs).

**Behavior:** Active Chapter card shows chapter name and date started. Goal state element is absent from the card. No "Add a Goal" prompt on L-1 — goal creation invitation is on G-1.

---

### 17.3 Active Chapter With Narrative Goal

**Condition:** Athlete has a primary goal with no Target (narrative goal type).

**Behavior:** Active Chapter card shows "[Goal Name] — In Progress" below the date. No progress bar. This matches the G-1 and G-2 display model for narrative goals.

---

### 17.4 Active Chapter With Achieved Goal (Chapter Still Active)

**Condition:** Athlete's primary goal has been marked achieved, but they have not yet sealed the chapter.

**Behavior:** Active Chapter card shows "✓ [Goal Name] achieved" — no progress bar. The chapter remains active. The athlete has not sealed it. L-1 reflects the current state accurately.

---

### 17.5 FLM = Chapter Sealed; State A Card Also Shows Same Chapter

**Condition:** Athlete sealed a chapter in the last 7 days. The FLM shows "CHAPTER SEALED — [Chapter Name]" (within 30-day window). The State A card below also shows the same chapter (within 7-day window).

**Behavior:** Both the FLM card and the State A card reference the same chapter. This is correct and intentional — the FLM surfaces the event ("something important happened"); the State A card is the artifact ("here is the thing that was completed"). They are two different views of the same event. The FLM card is editorial; the chapter card is archival.

**No de-duplication required.** Both can reference the same chapter. The athlete may notice the overlap — this is acceptable and communicates that the chapter sealing is doubly significant.

---

### 17.6 Multiple Chapters Sealed Within 7-Day Window

**Condition:** Athlete seals Chapter 2 on June 1 and Chapter 3 on June 5.

**Behavior:**
- FLM shows Chapter 3 (Priority 1, most recent wins tiebreaker)
- Chapter 3 is State A (single occupancy — most recently sealed)
- Chapter 2 is State B (displaced by Chapter 3)
- Chapter 1 and any earlier chapters are State B, most recent first

State A transitions are immediate — the moment Chapter 3 is sealed, Chapter 2 becomes State B.

---

### 17.7 FLM = Honor Earned (Inert Tap)

**Condition:** FLM selects an Honor Earned event (no higher-priority event in the active window).

**Behavior:** FLM card displays honor name. Tap is inert — no navigation occurs. L-10 (Honors List) does not yet exist. This is expected behavior for MVP v1.0.

**No visual indicator** that the card is inert. The athlete may tap it and nothing happens. This is a known limitation. See Architecture Risks, Risk 3.

---

### 17.8 Many Sealed Chapters (10+)

**Condition:** Athlete has been using Forge Legacy for a long time and has 12+ sealed chapters.

**Behavior:** All sealed chapters appear as State B cards on L-1. The scroll is long. This is intentional — a long chapter list is a reward for longevity. The athlete's full legacy history is directly visible, not hidden behind a "Show More" button.

**Future consideration (V1.1+):** Pagination or "Collapse older chapters" affordance for athletes with 20+ chapters. Not in MVP.

---

### 17.9 Only Account-Level Accomplishments

**Condition:** Athlete added accomplishments in O-2e (Path B) during onboarding but has not created any chapter-level accomplishments.

**Behavior:** Section 6 (Accomplishments) shows those account-level accomplishments. No visual differentiation from chapter-level accomplishments. Per Accomplishments Architecture Note, both are first-class records with identical display treatment.

---

### 17.10 FLM = Photo Added (Tier 5 Fallback)

**Condition:** No Tier 1–3 events exist in the active window and no Tier 4 events (no reflections, no memories added). The most recently added photo serves as FLM.

**Behavior:** FLM shows "PHOTO ADDED — Photo added to [Chapter Name]." This is the minimum-signal FLM state — the system is in "showing signs of life" mode, not "this is your most meaningful achievement" mode. The card is present, understated, and functional.

**The screen remains meaningful** even in this state because the chapter cards, honors, accomplishments, and timeline below the FLM tell the fuller story.

---

### 17.11 Athlete Returns After Long Absence (30+ Days of Inactivity)

**Condition:** Athlete completed Chapter 3 (sealed) 45 days ago. Has been inactive since. Returns today.

**Behavior:**
- FLM: Chapter Sealed event is outside the 30-day window — FLM section may show a Tier 4/5 fallback or be omitted if no fallback events exist
- Section 3 (Chapter History): Chapter 3 is State B (sealed > 7 days ago)
- Section 1: Invitation card (no active chapter — athlete hasn't started Chapter 4 yet)

The screen is honest about where the athlete is. No "Welcome back" message. No streak reset notification. The legacy stands unchanged — they built what they built. The invitation card is present, not pressuring, when they're ready to begin again.

---

### 17.12 Free Tier at Photo Limit (50 Photos)

**Condition:** Free tier athlete has reached 50 photos. Photos section shows their 50 stored photos.

**Behavior:** Photos strip shows normally. No warning in the Photos section on L-1. The photo limit management (M-7 upsell) fires when the athlete attempts to *add* a new photo — that is not a L-1 action. L-1 only displays existing photos.

Photo count in section header ("PHOTOS 50") is the natural display. No warning badge. No "50 of 50" limit indicator on L-1 — that belongs on L-15.

---

## Section 18 — Architecture Risks

### Risk 1 — L-5 Chapter Creation Unspecced

**Issue:** "Start a Chapter" CTA on L-1 (invitation card) and the "Start a Chapter" CTA on H-1 both navigate to L-5 (Chapter Creation, post-onboarding). L-5 has no wireframe spec.

**Impact:** The CTA exists in the spec. The destination is defined. Implementation is blocked until L-5 is specced.

**Recommendation:** L-5 is the next priority after L-1. The O-3 spec establishes the data model for first-chapter creation. L-5 is the same flow for subsequent chapters, entered from L-1 and H-1. L-5 must be specced before L-1 can ship.

**Risk level:** High — blocks the core "Start a Chapter" action on L-1.

---

### Risk 2 — L-2 Timeline Unspecced

**Issue:** "View Full Timeline ›" in Section 5 navigates to L-2. L-2 has no wireframe spec. The PRD describes the timeline (Section 12) as chapter-grouped, newest first, with event types including chapter events, honors, goals, programs, and photos.

**Impact:** The timeline teaser on L-1 can be implemented (2–3 entries in a text format). The full timeline destination is blocked until L-2 is specced.

**Recommendation:** L-2 spec in Phase 2C queue.

**Risk level:** Medium — does not block L-1 implementation of the teaser; blocks the "View Full Timeline" destination.

---

### Risk 3 — L-10 Honors List Unspecced; Honor Earned FLM Inert

**Issue:** "View All [N] Honors ›" navigates to L-10. L-10 has no wireframe spec. Additionally, the FLM card for Honor Earned has no tap destination — the tap is inert for MVP v1.0.

**Impact:** The Honors section on L-1 can be implemented (preview + count). The "View All Honors" navigation is blocked until L-10 is specced. The inert FLM tap is a known UX gap.

**Recommendation:** L-10 spec in Phase 2C queue. Consider whether a simple honors detail sheet (not a full screen) could be specced quickly to activate the FLM tap.

**Risk level:** Medium — the section exists and shows content; navigation destination is blocked.

---

### Risk 4 — L-12 Accomplishments Detail Unspecced

**Issue:** "View All [N] Accomplishments ›" navigates to L-12. L-12 has no wireframe spec. The creation flow for chapter-level accomplishments is also unspecced (noted in Accomplishments Architecture Note as deferred to L-12).

**Impact:** The Accomplishments section on L-1 can be implemented (preview + count). Navigation to full list is blocked until L-12 is specced.

**Risk level:** Medium — section exists; navigation destination blocked.

---

### Risk 5 — L-15 Photos Unspecced; Photo Tap Uses L-4 Fallback

**Issue:** "View All [N] Photos ›" navigates to L-15. L-15 has no wireframe spec. Tap on a photo thumbnail uses L-4 (the chapter the photo belongs to) as a MVP fallback — the athlete lands on the chapter detail, not on the photo itself.

**Impact:** The Photos strip on L-1 can be implemented. The "View All" destination is blocked. The thumbnail tap experience is suboptimal (athlete lands on the chapter, not the photo) but functional.

**Recommendation:** L-15 spec in Phase 2C queue. Photo detail screen may be L-16.

**Risk level:** Medium — section exists; navigation quality is degraded (fallback to L-4).

---

### Risk 6 — Rank Names Unfinalized

**Issue:** The identity strip displays the rank name + sub-tier (e.g., "Apprentice · I"). The PRD states "final rank names and thresholds to be defined during design phase." If rank names are undefined at implementation time, the identity strip cannot be populated.

**Impact:** The identity strip element is specced. Its content depends on the rank system being finalized.

**Recommendation:** Rank system naming (rank names, sub-tier labels, threshold values) must be defined before L-1 can fully ship. Placeholder: "[Rank Name] · [Sub-tier]" for engineering during development.

**Risk level:** Low — the spec is complete; the content dependency is external.

---

### Risk 7 — FLM Tap Inert for Honor Earned

**Issue:** When FLM selects an Honor Earned event, the card is non-interactive (tap does nothing). There is no destination screen for honor detail in MVP v1.0. This is a known gap.

**Impact:** A subset of athletes — those whose FLM is currently an Honor Earned event — will encounter an unresponsive card. The honor name is displayed; they just cannot navigate deeper.

**Recommendation:** Acceptable for MVP v1.0. Resolved when L-10 is specced. Consider adding a subtle visual affordance that the card is non-navigable in this state (e.g., no chevron, no highlight on tap).

**Risk level:** Low — known gap, acceptable for MVP.

---

### Risk 8 — P-3 Rank Detail Unspecced

**Issue:** FLM tap for Rank Up events navigates to P-1 (Profile Modal) as a fallback because P-3 (Rank Detail) has no wireframe spec.

**Impact:** Rank Up FLM tap lands on P-1, which shows rank name and sub-tier in the identity header. The athlete can see their rank but cannot see rank progress (which belongs on P-3).

**Risk level:** Low — P-1 is a reasonable fallback; the athlete sees their rank context.

---

## Section 19 — Validation Checklist

### Identity Strip
- [ ] Rank name + sub-tier displayed at top of L-1 scroll content
- [ ] No progress bar on identity strip
- [ ] Identity strip is not tappable
- [ ] Identity strip always present (including brand-new athletes)

### Section 1 — Active Chapter
- [ ] Active chapter card shows chapter name (20sp, primary weight)
- [ ] Date started + duration format: "Since [Month Day, Year] · [N] days in"
- [ ] Quantifiable goal in progress: goal name + progress bar + N%
- [ ] Quantifiable goal achieved: "✓ [Goal Name] achieved" (no progress bar)
- [ ] Narrative goal: "[Goal Name] — In Progress" (no progress bar)
- [ ] No goal: name + date only (no goal element)
- [ ] Tap → L-3
- [ ] No active chapter → invitation card shown
- [ ] Invitation card copy: "Your training builds your legacy." + "Start a chapter to give it a name."
- [ ] "Start a Chapter" CTA → L-5
- [ ] Invitation card shown even when sealed chapters exist

### Section 2 — Featured Legacy Moment
- [ ] Section omitted entirely (no placeholder) when no eligible event
- [ ] Section label: "FEATURED MOMENT" (11sp, muted, caps)
- [ ] Chapter Sealed + reflection → excerpt shown (~120 chars, quoted)
- [ ] Chapter Sealed + no reflection → no excerpt, no placeholder
- [ ] Goal Achieved quantifiable → "[N]% complete at achievement" secondary line
- [ ] Goal Achieved narrative → "Achieved" secondary line (no %)
- [ ] Honor Earned → tap inert for MVP v1.0 (no destination)
- [ ] All other event types → correct tap destinations per Section 13 table
- [ ] Date format: "Today" / "[N] days ago" / "[Month Day, Year]" (right-aligned)
- [ ] FLM selection follows FLM Standards v1.0 algorithm

### Section 3 — Chapter History
- [ ] Section label absent (no "YOUR CHAPTERS" or similar)
- [ ] Section omitted entirely when no sealed chapters
- [ ] Most recently sealed chapter within 0–7 days → State A (expanded)
- [ ] Single occupancy: only one State A card at a time
- [ ] Multiple sealings within 7-day window → newest is State A; others are State B
- [ ] All other sealed chapters → State B (compact), most recent first
- [ ] State A card: chapter name (large, primary) + date range + duration + goal outcome + reflection excerpt (if written) + summary counts
- [ ] State A reflection excerpt: omitted (not placeholder) when no reflection was written
- [ ] State B card: chapter name + condensed date range + duration (single line) + goal outcome + summary counts (no sealed date, no excerpt)
- [ ] State A tap → L-4
- [ ] State B tap → L-4

### Section 4 — Photos
- [ ] Section label: "PHOTOS [N]" (11sp, muted, caps)
- [ ] 3–5 most recently added photos shown (account-wide, any chapter)
- [ ] Horizontal scroll
- [ ] Photo order: reverse chronological (most recently added first)
- [ ] Tap on thumbnail → L-4 (chapter the photo belongs to) — MVP fallback
- [ ] Footer: "View All [N] Photos ›" → L-15
- [ ] Section omitted when photo count = 0

### Section 5 — Timeline Teaser
- [ ] Section label: "TIMELINE" (11sp, muted, caps)
- [ ] 2–3 most recent timeline entries shown
- [ ] Entry format: [Event type] · [Event description] + date (right-aligned)
- [ ] Footer: "View Full Timeline ›" → L-2
- [ ] Section omitted when no timeline entries

### Section 6 — Accomplishments
- [ ] Section label: "ACCOMPLISHMENTS [N]" (11sp, muted, caps)
- [ ] 3 most recently added accomplishments shown
- [ ] Account-level and chapter-level combined with no visual differentiation
- [ ] Row: accomplishment text + date added (right-aligned)
- [ ] Footer: "View All [N] Accomplishments ›" → L-12
- [ ] Section omitted when count = 0

### Section 7 — Honors
- [ ] Section label: "HONORS [N]" (11sp, muted, caps)
- [ ] 3 most recently earned honors shown
- [ ] Row: honor name + date earned (right-aligned)
- [ ] Footer: "View All [N] Honors ›" → L-10
- [ ] Section omitted when count = 0

### Empty State Behavior
- [ ] All absent sections leave no visual trace (no skeleton, no placeholder)
- [ ] Brand-new athlete sees: identity strip + invitation card only
- [ ] "Between chapters" athlete sees: identity strip + invitation card + FLM (if eligible) + Chapter History

### Product DNA Compliance
- [ ] No metrics dashboard or headline stats on L-1
- [ ] No social feed elements
- [ ] No gamification elements (no streak counter, no leaderboard, no total volume)
- [ ] Accomplishments appear before Honors (athlete-authored declarations before system recognition)
- [ ] Identity strip shows rank name (identity), not rank score (performance)
- [ ] Photos section is at position 4 (after Chapter History), not position 3

### Navigation
- [ ] All tappable elements in Section 13 table have correct destinations implemented
- [ ] FLM Honor Earned tap is inert (no destination fires)
- [ ] Tab Bar visible on L-1 at all times

---

## Section 20 — Downstream Dependencies

| Dependency | What L-1 Requires | Status |
|------------|------------------|--------|
| L-3 Active Chapter Detail | Active Chapter card tap destination | Specced — locked |
| L-4 Archived Chapter Detail | All sealed chapter card tap destinations; FLM chapter-related taps; photo thumbnail fallback tap | Specced — locked |
| L-5 Chapter Creation (post-onboarding) | "Start a Chapter" CTA destination | Unspecced — Phase 2C priority |
| L-2 Legacy Timeline | "View Full Timeline" destination | Unspecced — Phase 2C |
| L-10 Honors List | "View All Honors" destination; Honor Earned FLM tap | Unspecced — Phase 2C |
| L-12 Accomplishments Detail | "View All Accomplishments" destination | Unspecced — Phase 2C |
| L-15 Photos | "View All Photos" destination; photo detail screen | Unspecced — Phase 2C |
| G-2 Goal Detail | FLM Goal Achieved tap | Specced — locked |
| W-3 Program Detail | FLM Program Graduated tap | Specced — locked |
| P-1 Profile Modal | FLM Rank Up and Major Accomplishment fallback tap | Specced — locked |
| FLM Standards v1.0 | FLM selection algorithm | Locked — authority |
| FLM/Sealed Chapter Amendment 001 | State A and State B card specs; Legacy Spine Rule | Locked — authority |
| Accomplishments Architecture Note v1.0 | Combined account/chapter-level display, no differentiation | Locked — authority |
| Rank system naming | Identity strip rank name content | Unfinalized — design phase dependency |

---

## Change Log

### v1.0 — June 2026

Initial specification. L-1 Legacy Hub defined as a Legacy Summary Surface answering "What have I built?" Seven-section scroll order locked: (1) Active Chapter summary card (not H-1 hero format) or invitation card; (2) Featured Legacy Moment, per FLM Standards v1.0 and FLM/Sealed Chapter Amendment 001, with FLM card visual format defined here for the first time including per-event-type card layouts and tap destination map; (3) Chapter History using State A/B per FLM/Sealed Chapter Amendment 001 with no section label; (4) Photos horizontal strip; (5) Timeline Teaser (2–3 entries + CTA); (6) Accomplishments preview; (7) Honors preview. Accomplishments ordered before Honors per FLM Standards priority hierarchy and Product DNA (athlete-authored declarations before system recognition). Identity strip (rank name + sub-tier, no progress bar) anchors the screen above the first section. All absent sections silently omitted — silence is the correct empty state. Eight architecture risks documented; L-5, L-2, L-10, L-12, L-15 are unspecced Phase 2C dependencies. FLM Honor Earned tap is inert for MVP v1.0. Emotional outcome: Earned.

---

*Forge Legacy Legacy Hub Wireframe Specification — L-1*
*v1.0 — June 2026*
*Authority: Master PRD Section 12, FLM Standards v1.0, FLM/Sealed Chapter Amendment 001, Accomplishments Architecture Note v1.0, Product DNA*
