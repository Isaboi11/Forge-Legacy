# Forge Legacy — Featured Legacy Moment / Sealed Chapter Amendment 001
## June 2026

**Authority:** Critical Decisions Amendment 001 (June 2026), Featured Legacy Moment Standards v1.0, Product DNA
**Status:** Locked
**Type:** Architecture Amendment
**Resolves:** Terminology inconsistency from Critical Decisions Amendment 001; missing L-1 sealed chapter display architecture; missing Featured Legacy Moment reflection display rule

---

## Section 1 — Purpose

Three things are established by this amendment:

**1. Terminology correction.** Critical Decisions Amendment 001 (June 2026) locked "Seal Chapter" as the authoritative vocabulary for chapter archival, deprecating "Complete Chapter" everywhere. The Featured Legacy Moment Standards v1.0 still uses "Chapter Completed" in nine places. This amendment corrects that inconsistency and applies the terminology updates to the Standards document.

**2. L-1 sealed chapter card architecture.** The L-1 Legacy Hub wireframe spec cannot be written without knowing how sealed chapters appear in the historical section of L-1. This amendment defines two display states for sealed chapters on L-1 — an expanded card for the recently sealed chapter (State A) and a compact card for older sealed chapters (State B) — and locks the rules that govern the transition between them.

**3. Featured Legacy Moment reflection display rule.** The Featured Legacy Moment Standards define which events are eligible as Featured Legacy Moments but do not specify what content the card shows when a Chapter Sealed event is featured. When the athlete wrote a reflection at L-6, that reflection is the most story-rich artifact associated with the sealed chapter. This amendment adds a display rule to surface that content in the Featured Legacy Moment card.

No new product features are introduced. This amendment clarifies existing architecture and corrects a terminology inconsistency.

---

## Section 2 — Sealed Chapter Meaning

A sealed chapter is an irreversible legacy artifact. When an athlete seals a chapter, they are declaring that a period of their athletic life is complete and preserved. The act of sealing is:

**Irreversible.** A sealed chapter cannot be re-opened. Its contents — workouts, photos, goals, honors, reflection — are fixed at the moment of sealing.

**Deliberate.** The athlete chose to seal. The L-6 Chapter Reflection flow precedes the seal, making the act intentional, not incidental.

**Transformational.** A sealed chapter closes one period and implicitly opens space for the next. It is the highest-order legacy event in Forge Legacy.

A sealed chapter is not a completed workout. It is not an added photo. It is not an honor earned. It is a transformation period, preserved.

The decisions in this amendment are grounded in this meaning. A sealed chapter deserves architectural prominence because it represents what Forge Legacy exists to preserve: the story of a transformation period.

---

## Section 3 — Decision 1: L-1 Recently Sealed Chapter (State A, 0–7 Days)

### Statement

**Locked.** Within 7 days of sealing, the most recently sealed chapter appears as an expanded card in the L-1 historical section, positioned below any active chapter.

### Single Occupancy Rule

Only one chapter may occupy State A at any given time. State A belongs to the single most recently sealed chapter. If multiple chapters are sealed within the same 7-day window (rare but possible), only the most recently sealed chapter receives State A treatment. All others render as State B regardless of how recently they were sealed.

### Position on L-1

State A card appears at the top of the historical section on L-1. If an active chapter exists, the active chapter precedes the State A card. The historical section begins with the State A card.

### Card Wireframe

```
┌──────────────────────────────────────────────────────────┐
│  Road to 405                                             │
│  Apr 5 – Jun 11, 2026  ·  67 days                       │
│                                                          │
│  ✓ Squat 405 lbs achieved                               │
│                                                          │
│  "I proved to myself that consistency over six weeks     │
│   beats intensity over one."                             │
│                                                          │
│  47 workouts  ·  3 honors  ·  Sealed Jun 11             │
└──────────────────────────────────────────────────────────┘
```

### Card Elements

**Chapter name** — primary weight, large. The athlete's own name for this period. First element on the card.

**Date range + duration** — "Apr 5 – Jun 11, 2026 · 67 days" — 13sp, muted. Full dates with year. Duration in days.

**Primary goal outcome** — one of three states:

| State | Display | Condition |
|-------|---------|-----------|
| Achieved | `✓ [Goal Name] achieved` | Quantifiable goal completed before or at sealing |
| In progress at sealing | `[Goal Name] — in progress at sealing` | Narrative goal, or quantifiable goal not yet reached at sealing |
| Omitted | *(element absent)* | No primary goal was set for this chapter |

Goal outcome line: 14sp, muted. The `✓` in the achieved state uses the accent or success color.

**Reflection excerpt** — first ~120 characters of the L-6 reflection, in quotation marks, 13sp, secondary, muted. Omitted entirely when no reflection was written. No placeholder copy. No empty state.

**Summary counts** — "[N] workouts · [N] honors · Sealed [Month Day]" — 12sp, muted. Final element on the card.

### Tap Behavior

Tap anywhere on the card → L-4 Archived Chapter Detail.

### Tone Constraint

The State A card should feel like a book closed and placed on a shelf. Not a celebration. Not a badge. Not a banner. Not a notification. The chapter's permanence is the statement. The expanded card presents a completed artifact — dignified, fixed, worth reading.

---

## Section 4 — Decision 2: L-1 Historical Chapter (State B, 8+ Days)

### Statement

**Locked.** Eight days after sealing, or at any point when the chapter is not the single most recently sealed chapter within the active 7-day window, the sealed chapter renders as a compact card in the L-1 historical section.

### Position on L-1

State B cards appear in the historical section ordered by seal date, most recent first.

### Card Wireframe

```
┌──────────────────────────────────────────────────────────┐
│  Road to 405                   Apr – Jun 2026  ·  67d   │
│  ✓ Squat 405 lbs achieved                               │
│  47 workouts  ·  3 honors                               │
└──────────────────────────────────────────────────────────┘
```

### Card Elements

**Chapter name + date range + duration** — single condensed line. Month and year only ("Apr – Jun 2026 · 67d"). If the chapter spans calendar years, include the year on both sides ("Dec 2025 – Feb 2026 · 67d"). Chapter name in standard weight; date range and duration in muted weight.

**Primary goal outcome** — same three states as State A (achieved / in progress at sealing / omitted). One line, 13sp.

**Summary counts** — "[N] workouts · [N] honors" — 12sp, muted. Sealed date omitted in compact state.

No reflection excerpt in State B. The reflection excerpt is an expanded-card element only, accessible via L-4.

### Tap Behavior

Tap anywhere on the card → L-4 Archived Chapter Detail.

### Why Compact

An athlete with five sealed chapters should be able to see most of their chapter history without deep scrolling. Compact cards preserve the readability of the historical record. The full chapter story — including reflection, photos, and detailed stats — is one tap away via L-4.

---

## Section 5 — Decision 3: Featured Legacy Moment Reflection Display Rule

### Current State

The Featured Legacy Moment Standards v1.0 establish "Chapter Sealed" (formerly "Chapter Completed") as Tier 1, Priority 1 — the highest-priority Featured Legacy Moment event. The Standards define the selection algorithm but do not specify the display content of the Featured Legacy Moment card for individual event types.

### Statement

**Locked.** When Chapter Sealed is the Featured Legacy Moment and the athlete wrote a reflection at the L-6 Chapter Reflection flow, the Featured Legacy Moment card displays the reflection excerpt.

### Display Rule

**Reflection excerpt:** First ~120 characters of the L-6 reflection text, in quotation marks, secondary/muted style. Displayed below the chapter name and goal outcome in the Featured Legacy Moment card.

**Presence condition:** Displayed only when a reflection was written. When no reflection exists, the excerpt element is omitted from the card. No placeholder. No "No reflection added" copy.

### Additive-Only Clarification

This rule does not alter the selection algorithm. It does not affect tier or priority.

| Condition | Tier | Priority | Reflection in card |
|-----------|------|----------|--------------------|
| Chapter Sealed with reflection | 1 | 1 | Yes — excerpt shown |
| Chapter Sealed without reflection | 1 | 1 | No — element omitted |

The presence of a reflection enriches the card's display. Its absence does not change what event is featured, how long it holds the featured position, or its standing in the selection algorithm. The 30-day active window applies regardless.

---

## Section 6 — Decision 4: Legacy Spine Rule

### Statement

**Locked.** Sealed chapters are the primary historical building blocks of the Legacy system. On L-1, the athlete's legacy is organized around chapters as the spine.

### L-1 Hierarchy

```
Active Chapter (if exists)
  ↓
Featured Legacy Moment (if eligible event exists)
  ↓
Most Recently Sealed Chapter (State A: 0–7 days / State B: 8+ days)
  ↓
Historical Sealed Chapters (State B, ordered by seal date, most recent first)
```

### What Is Accessed Through Chapters

The following legacy content exists within chapters, not as independent items listed on L-1 alongside chapter cards:

- Goals — created within a chapter; accessed via L-4 → Goals section
- Workouts — logged during a chapter's active period; accessed via L-4 or W-18/W-19
- Photos — tagged to a chapter; accessed via L-3 → Photos strip or L-4
- Honors — earned during a chapter; accessed via L-4 → Honors section
- Accomplishments — declared during a chapter; accessed via L-4 → Accomplishments section
- Reflections — written at L-6; accessible via L-4

### Anti-Patterns Prohibited

The following L-1 architectures violate the Legacy Spine Rule:

- A chronological workout activity feed as the primary L-1 content
- A flat honor list independent of chapter context
- A metrics dashboard (streak counts, total workouts, total volume) as the primary historical view
- Chapter cards and individual workout cards at the same visual hierarchy
- Any structure that treats chapters as filters over a flat activity list

### The Correct Mental Model

L-1 is not a workout log. It is not an achievement board. It is a record of transformation periods — chapters — with the highlights of each period accessible through them.

An athlete who has sealed three chapters and is in their fourth active chapter sees on L-1:

1. Their current active chapter card
2. The Featured Legacy Moment (most meaningful recent event)
3. Their most recently sealed chapter (State A or State B depending on elapsed time)
4. Their prior two sealed chapters (State B)

That is their legacy: the story of their training life, organized by the periods they lived through.

---

## Section 7 — Product DNA Alignment

### Legacy First

The spine rule directly implements Legacy First. Chapters are the primary containers of the athlete's legacy history. All other content — goals, workouts, photos, honors — is accessed through chapters. L-1 presents the legacy, not the activity log.

### Story Before Data

State A leads with the chapter name and reflection excerpt — the athlete's own words about the period they just completed. Summary counts (workouts, honors) come last. The story is presented before the statistics. An athlete reading their recently sealed chapter sees their own language ("Road to 405") and their own reflection before they see any numbers.

### Transformation Over Activity

A sealed chapter is a completed transformation. The State A expanded card gives that transformation a brief moment of visual prominence — not permanently, but for 7 days. After 7 days it becomes a compact record alongside the other chapters. The 7-day window communicates: the product recognizes what just happened. Then it settles into the archive.

The FLM reflection display rule further embeds this: when a chapter sealing is featured, the reflection content is surfaced because it is the most intentional, story-rich artifact the athlete produced during that period — their own words, not the product's metrics.

---

## Section 8 — Downstream Updates Required

### Featured Legacy Moment Standards v1.0 — Updates Applied This Session

| Change | Location | Status |
|--------|----------|--------|
| "Chapter Completed" → "Chapter Sealed" | Section 3, Tier 1 table, Priority 1 Event column | Complete — this session |
| "A chapter completed closes..." → "A chapter sealed closes..." | Section 3, Tier 1 definition paragraph | Complete — this session |
| Heading: "...With Chapter Completion" → "...With Chapter Sealing" | Section 6.3 heading | Complete — this session |
| Body: "completes a chapter" → "seals a chapter" | Section 6.3 body | Complete — this session |
| Heading: "...Chapter Completed in the Same Session" → "...Chapter Sealed in the Same Session" | Section 6.4 heading | Complete — this session |
| Body: two occurrences of "Chapter Completed" → "Chapter Sealed" | Section 6.4 body | Complete — this session |
| Wireframe label: "CHAPTER COMPLETE" → "CHAPTER SEALED" | Section 7, Scenario B | Complete — this session |
| Quick Reference table: "Chapter Completed" → "Chapter Sealed" | Appendix | Complete — this session |
| Reflection display rule added to Tier 1 definition block | Section 3, Tier 1 definition | Complete — this session |

### L-1 Legacy Hub Wireframe Spec — Pending

| Document | What This Amendment Provides | Status |
|----------|------------------------------|--------|
| L-1 Legacy Hub Wireframe Spec | State A card spec (Section 3), State B card spec (Section 4), Legacy Spine Rule (Section 6). Use this amendment as authority for the L-1 historical section architecture. | Pending — Phase 2C |

---

## Section 9 — Validation Checklist

### State A — Recently Sealed Chapter (0–7 Days)

- [ ] Only one chapter may be in State A at any given time (single occupancy)
- [ ] Most recently sealed chapter within the 7-day window occupies State A
- [ ] Multiple chapters sealed within 7-day window: only newest is State A; all others are State B
- [ ] State A card position: top of historical section, below active chapter (if any)
- [ ] Chapter name: primary weight, large — first element
- [ ] Date range + duration: full dates with year, duration in days — 13sp, muted
- [ ] Goal outcome — Achieved: "✓ [Goal Name] achieved" with accent/success checkmark
- [ ] Goal outcome — In progress: "[Goal Name] — in progress at sealing" — 14sp, muted
- [ ] Goal outcome — No goal: element omitted, no placeholder
- [ ] Reflection excerpt: first ~120 chars, quoted, 13sp, muted — present only when reflection exists
- [ ] Reflection excerpt: omitted (no empty state) when no reflection was written
- [ ] Summary counts: "[N] workouts · [N] honors · Sealed [Month Day]" — 12sp, muted — last element
- [ ] Tap target: full card → L-4 Archived Chapter Detail

### State B — Historical Chapter (8+ Days)

- [ ] Chapter transitions from State A to State B on day 8 after sealing
- [ ] Chapter displaced from State A by newer sealing renders as State B regardless of age
- [ ] State B cards ordered by seal date, most recent first
- [ ] Chapter name + date range + duration: single condensed line (month + year only)
- [ ] Year shown on both sides only when chapter spans calendar years
- [ ] Goal outcome: same three states as State A (one line, 13sp)
- [ ] Summary counts: "[N] workouts · [N] honors" — 12sp, muted — no sealed date in compact state
- [ ] No reflection excerpt in State B
- [ ] Tap target: full card → L-4 Archived Chapter Detail

### Featured Legacy Moment Reflection Display Rule

- [ ] Chapter Sealed with reflection → FLM card shows reflection excerpt (~120 chars, quoted, muted)
- [ ] Chapter Sealed without reflection → FLM card shows no reflection excerpt, no placeholder
- [ ] Reflection presence does not change event tier (remains Tier 1)
- [ ] Reflection presence does not change event priority (remains Priority 1)
- [ ] Reflection presence does not affect the 30-day active window
- [ ] FLM selection algorithm unchanged

### Legacy Spine Rule

- [ ] L-1 historical section organized around chapters (not individual events)
- [ ] No workout activity feed on L-1 independent of chapter context
- [ ] No honor list on L-1 independent of chapter context
- [ ] No metrics dashboard as primary L-1 historical view
- [ ] Goals, workouts, photos, honors accessed through L-4, not listed independently on L-1

---

## Section 10 — Lock Recommendation

This amendment is locked as of June 2026.

All four decisions are required preconditions for writing the L-1 Legacy Hub Wireframe Specification. L-1 must not be written before this amendment is locked.

**Authority for L-1:** Sections 3, 4, and 6 of this amendment are the specification authority for the L-1 historical section.

**Authority for Featured Legacy Moment card display:** Section 5 of this amendment is the specification authority for the reflection display rule when Chapter Sealed is the featured event.

---

## Change Log

### v1.0 — June 2026

Initial amendment. Four decisions locked: (1) State A expanded card — the single most recently sealed chapter within 0–7 days, single occupancy rule, expanded elements including chapter name, date range, goal outcome, reflection excerpt (if written), and summary counts; (2) State B compact card — all other sealed chapters, compact single-line date, no reflection excerpt; (3) Featured Legacy Moment reflection display rule — reflection excerpt shown in FLM card when chapter sealing is featured and reflection exists, additive-only, does not affect tier, priority, or selection algorithm; (4) Legacy Spine Rule — sealed chapters are the primary historical building blocks of L-1, with all other legacy content accessed through chapter containers. Nine terminology corrections applied to Featured Legacy Moment Standards v1.0 ("Chapter Completed" → "Chapter Sealed" throughout). Reflection display rule added to Standards Section 3 Tier 1 definition block.

---

*Forge Legacy Featured Legacy Moment / Sealed Chapter Amendment 001*
*v1.0 — June 2026*
*Authority: Critical Decisions Amendment 001 (June 2026), Featured Legacy Moment Standards v1.0, Product DNA*
