# Forge Legacy — P-2 Progress Hub Architecture
## P-2 | Architecture Specification | Version 1.0 — June 2026

**Status:** LOCKED
**Workstream:** Progress Hub

**Authority:**
- Progress Analytics Discovery Phase (June 2026) — authoritative source for all core decisions reflected here; treated as pre-approved
- Product DNA (Docs/FORGE_LEGACY_PRODUCT_DNA.md)
- Profile Wireframe Specification P-1 v1.0
- FLM Standards v1.0 + FLM/Sealed Chapter Amendment 001
- HonorInstance Architecture v1.0 (LOCKED)
- Honor Evaluation Service Architecture v1.0 (LOCKED)
- Honor Catalog v1.0 (LOCKED)
- Goal Hub Wireframe Spec G-1 v1.1
- Goal Detail Wireframe Spec G-2 v1.0
- Exercise Library Architecture v1.0 (LOCKED)
- Active Workout Flow Spec W-9–W-16 v1.0
- R1 Refinement Pass (June 2026) — R1-1 and R1-2 accepted, R1-3 rejected

**Downstream impact:**
- P-1 (Profile) — requires Amendment 001 to add Progress entry point; existing "P-2 Edit Profile" references require renumbering (see PH-D15 and Section 20)
- Honor Evaluation Service — requires `timelineEventCategory` field emitted on all evaluator outputs
- Chapter / Goal system — goal completion and chapter lifecycle events must emit Timeline events
- Rank system — promotion events must emit Timeline events with snapshotted rank name and sub-tier
- Program system — graduation events must emit Timeline events with snapshotted program name
- Body metrics system — weight log and progress photo events must emit Timeline events
- G-1 (Goals Hub) — navigation destination from P-2 Goals section
- G-2 (Goal Detail) — navigation destination from P-2 goal item tap and Timeline goal events
- L-10 (Honors Hub) — navigation destination from P-2 Honors section
- L-11 (Honor Detail Sheet) — navigation destination from P-2 Timeline honor events
- W-2 (Program Browse) — navigation destination from P-2 What's Next fallback
- W-3 (Program Detail) — navigation destination from P-2 Program Journey active program tap

**Amendment Log:** None at v1.0.

---

## Preamble

Progress is not an analytics dashboard. It is not a statistics page. It is not a leaderboard.

Progress is the story of athlete growth.

Every metric on this screen exists inside a larger narrative: identity, performance, accomplishments, direction, and legacy. Data points are evidence of transformation. The screen that holds them must feel like a story being told, not a report being reviewed.

The guiding principle: **Story before data. Performance exists inside a Legacy wrapper.**

An athlete who opens P-2 and sees their current rank, their ongoing chapter, the achievement they pinned, and the metrics that tell the story of how far they have come — that athlete receives a message. Not "here are your numbers." Not "here is what you need to improve." The message is: *"Look at what you have built."*

This distinction is not cosmetic. It determines every architectural decision in this document: what is shown first, what is shown conditionally, what is never shown, and how each section connects to every other.

---

## Section 1 — Purpose and Scope

### 1.1 What P-2 Is

P-2 is the Progress Hub. It is a dedicated screen accessible from the athlete's Profile (P-1) that surfaces the full picture of athletic growth in one place.

P-2 answers five questions simultaneously:

| Question | Screen Zone |
|---|---|
| **Who am I?** | Hero — Rank, Chapter, Achievement, Forging Since |
| **Am I improving?** | Strength & Performance Preview, Goals Preview |
| **What have I earned?** | Rank Journey Preview, Honors & Milestones Preview |
| **What have I completed?** | Program Journey Preview |
| **How did I become who I am today?** | Timeline Tab — the full legacy in chronological order |

### 1.2 What P-2 Is Not

P-2 is not:
- An analytics dashboard with performance optimization metrics
- A leaderboard or athlete comparison surface
- A goals management screen (goals are managed in G-1 and G-2; P-2 previews them)
- A workout history screen (workout history lives in W-18)
- A settings screen
- A social surface

### 1.3 Scope

P-2 is a read surface. No content is created, edited, or deleted from within P-2. All tappable sections navigate outward to the appropriate management screens. P-2 is always current — it reflects the latest state of the athlete's data — but it is never the location where that data is modified.

The one exception: the Achievement Pinning system (Section 14) allows the athlete to select which achievement is featured in the Hero. This is a display preference only, not a content action.

---

## Section 2 — Navigation Architecture

### 2.1 Entry Point

P-2 is accessed exclusively from P-1 (Profile). It is a full-screen push from within the P-1 modal stack.

**Navigation path:** Any tab → Avatar button → P-1 (Profile modal) → Progress CTA → P-2 (Progress Hub, full screen)

P-1 v1.0 does not currently contain a Progress CTA. A P-1 Amendment is required before this navigation path can be built. This is tracked in the Pre-Lock Self-Audit (Section 20, OQ-2).

### 2.2 Back Navigation

P-2 → back → P-1 (modal, retaining scroll position).

P-2 is pushed onto the navigation stack. Back navigation pops P-2 and returns to P-1.

### 2.3 Tab Structure

P-2 contains exactly two tabs:

| Tab | Purpose |
|---|---|
| **Overview** | Answers: How am I doing? Structured sections, above-fold and below-fold zones. |
| **Timeline** | Answers: How did I become who I am today? Unified chronological event feed. |

No additional tabs are permitted in MVP. The two-tab model is locked from discovery.

Default tab on entry: Overview.

### 2.4 Sub-Screen Navigation Map

Every Overview section is tappable. Each tap navigates to either an existing Forge screen or a P-2 detail sub-screen. Sub-screen codes are pending a naming convention decision (tracked in Section 20, OQ-1).

| Section | Tap Destination |
|---|---|
| Strength & Performance Preview | P-2 Strength & Performance Detail (sub-screen, code TBD) |
| Goals Preview — section tap | G-1 (Goals Hub) |
| Goals Preview — individual goal tap | G-2 (Goal Detail) for that specific goal |
| Rank Journey Preview | P-2 Rank Journey Detail (sub-screen, code TBD) |
| Program Journey Preview — active program | W-3 (Program Detail) |
| Program Journey Preview — graduation item | Program detail for that program |
| Honors & Milestones Preview | L-10 (Honors Hub) |
| Honors & Milestones Preview — individual honor | L-11 (Honor Detail Sheet) |
| Consistency & Training Preview | P-2 Consistency Detail (sub-screen, code TBD) |
| Weight & Body Metrics Preview | P-2 Body Metrics Detail (sub-screen, code TBD) |
| What's Next | Varies by content — see Section 13.2 |

Timeline event tap destinations:

| Event Type | Tap Destination |
|---|---|
| HonorInstance event | L-11 (Honor Detail Sheet) |
| Goal Achieved | G-2 (Goal Detail) |
| Program Graduated | Program detail |
| Rank Promoted | P-2 Rank Journey Detail (sub-screen) |
| Chapter Sealed / Created | L-3 or L-4 (Chapter Detail) |
| Body weight entry | P-2 Body Metrics Detail (sub-screen) |
| Progress photo | Photo detail view |

### 2.5 P-2 Naming Resolution and Downstream Renumbering

**Current conflict:** P-1 v1.0 and Identity Amendment 001 reference "P-2" as "Edit Profile." These references are informal — written before a Progress Hub was designed. No locked P-2 spec has ever existed.

**Resolution:** P-2 is the Progress Hub. This designation supersedes all prior informal "P-2 Edit Profile" references.

**Required downstream action:** When the Edit Profile screen is formally specced, it must receive a new screen code. Candidate: P-9 (after the informal P-3–P-8 settings range). Before P-1 is implementation-ready, P-1 Amendment 001 must update all "P-2 Edit Profile" references to the new code. Tracked as PH-D15.

---

## Section 3 — Information Architecture

### 3.1 Full Screen Map

```
P-2 Progress Hub
├── Overview Tab (default)
│   ├── ABOVE FOLD
│   │   ├── Hero (always present)
│   │   ├── Strength & Performance Preview (conditional)
│   │   └── Goals Preview (conditional)
│   └── BELOW FOLD
│       ├── Rank Journey Preview (always present)
│       ├── Program Journey Preview (conditional)
│       ├── Honors & Milestones Preview (conditional)
│       ├── Consistency & Training Preview (always present)
│       ├── Weight & Body Metrics Preview (conditional)
│       └── What's Next (always present — always last)
└── Timeline Tab
    ├── Filter chips: [Performance] [Legacy] (default: none active)
    └── Reverse-chronological event feed (infinite scroll)
```

### 3.2 Above-Fold Zone

Without scrolling, the athlete sees:
1. **Hero** — Who am I?
2. **Strength & Performance Preview** — Am I improving?
3. **Goals Preview** — Where am I going?

These three sections address the athlete's most immediate questions. The above-fold zone is designed to be self-sufficient — an athlete who views only the first screen of P-2 has received the core message.

If Strength & Performance has insufficient data (visibility threshold not met), the first eligible below-fold section is promoted to fill the above-fold zone. The above-fold zone never collapses to Hero alone when a second or third section could fill it.

### 3.3 Below-Fold Ordering

Sections appear in fixed order. Conditional sections are omitted when their visibility threshold is not met — no placeholder, no empty-state card.

| Position | Section | Presence |
|---|---|---|
| 4 | Rank Journey Preview | Always |
| 5 | Program Journey Preview | Conditional |
| 6 | Honors & Milestones Preview | Conditional |
| 7 | Consistency & Training Preview | Always |
| 8 | Weight & Body Metrics Preview | Conditional |
| 9 | What's Next | Always — always last |

What's Next is always the final section in the scroll order, regardless of which conditional sections are present or absent.

### 3.4 Timeline Tab Structure

The Timeline tab is a single flat event feed. There are no chapter groupings, month groupings, or section headers within the feed itself. Events are displayed in a continuous reverse-chronological list. Filter chips provide the only organizational layer.

---

## Section 4 — Hero Architecture

### 4.1 Hero Composition

The Hero is the top section of the Overview tab. It is always present. It contains exactly five elements:

| Element | Source | Editable from P-2? |
|---|---|---|
| Current Rank | Athlete rank record (name + sub-tier) | No |
| Current Chapter | Active chapter name | No |
| Latest / Pinned Achievement | FLM-priority algorithm scoped to pinnable types, or athlete-pinned event | Via pinning UX (Section 14) only |
| Forging Since | Account creation date (Month Year) | No |
| Lifetime Workouts | Precomputed `workoutCount` statistic | No |

### 4.2 Hero Element Behavior

**Current Rank:** Rank name + sub-tier in the format established on P-1 (e.g., "Apprentice · II"). Non-tappable as a standalone element in the Hero. The Rank Journey Preview section below provides the navigation path.

**Current Chapter:** Active chapter name. If the athlete has no active chapter (chapters are optional), this field reads "No Active Chapter." Non-tappable in the Hero — chapter detail is accessible via L-1.

**Forging Since:** Account creation date. Format: "Forging since [Month Year]." System-set, not editable from any screen. Matches the P-1 display convention.

**Lifetime Workouts:** The precomputed `workoutCount` from the Honor Evaluation Service. Displayed as a whole number with a simple label. No framing that invokes optimization or targets.

**Latest / Pinned Achievement:** A single achievement card. See 4.3 and 4.4 for the selection rules.

### 4.3 Default Achievement Selection (No Pin Set)

When no achievement is pinned, the Hero shows the athlete's most meaningful recent achievement, selected from the pinnable event types using the FLM priority ordering scoped to those types:

**Eligible event types:**

| Event Type | FLM Priority |
|---|---|
| Goal Achieved | Priority 2 |
| Rank Up | Priority 3 |
| Program Graduation | Priority 4 |
| Honor Earned | Priority 6 |

**Selection algorithm:**
1. Collect all eligible events from the athlete's full history
2. Apply the FLM 30-day active window to Tier 1–3 events (Priorities 2, 3, 4)
3. Apply the FLM 30-day active window to Tier 3 events (Priority 6)
4. From events within their active window, select the highest-priority event (lowest number)
5. Within the same priority level, most recent event wins (FLM tie-breaker rule)
6. If no eligible events fall within the 30-day window: fall back to the most recent eligible event across all time
7. If no eligible events exist at all: Hero achievement slot is omitted — the Hero renders with four elements

This algorithm intentionally mirrors FLM selection logic to maintain coherence between the two systems. Chapter Sealed is excluded because the chapter lifecycle is already represented directly by the Current Chapter element. Photo Added, Reflection Added, and Memory Added are excluded — they are archive activities, not achievements.

### 4.4 Pinned Achievement State

When an athlete has pinned an achievement, the pinned achievement replaces the default selection. The pinned achievement displays regardless of age — there is no expiry on a pinned achievement.

The pinned state is not visually indicated on the Hero card itself. The pin is invisible to the casual reader. It is surfaced only via the unpin action (Section 14).

### 4.5 New Athlete Hero State

| Element | New Athlete State |
|---|---|
| Current Rank | Starting rank name + sub-tier (rank exists from account creation) |
| Current Chapter | "No Active Chapter" if none created; chapter name if created |
| Achievement slot | Omitted entirely — no empty state, no placeholder |
| Forging Since | Account creation date (today for brand-new athletes) |
| Lifetime Workouts | 0 |

The Hero is always structurally present. It never shows an empty state for the section as a whole.

---

## Section 5 — Overview Tab

### 5.1 Above-Fold Zone

**Sections:** Hero, Strength & Performance Preview, Goals Preview.

These three sections must be visible without scrolling on a standard device (375×812 viewport). Together they answer: Who am I? Am I improving? Where am I going?

If Strength & Performance does not meet its visibility threshold, the Goals Preview moves to the second above-fold position. If Goals Preview is also below threshold (no active goals), the first qualifying below-fold section is promoted. The above-fold zone always contains at least two sections.

### 5.2 Below-Fold Zone

Conditional sections are omitted when their threshold is not met. The ordering is fixed; absent sections are simply not rendered — the next section in the list fills the gap. Always-present sections (Rank Journey, Consistency & Training, What's Next) are never omitted.

### 5.3 Section Ordering Rationale

The ordering reflects a reading arc from identity to history to action:

1. **Identity first** (Hero) — the athlete sees who they are before they see what they have done
2. **Performance second** (Strength & Performance, Goals) — the forward-facing story of improvement
3. **Recognition third** (Rank, Program, Honors) — what has been earned through the journey
4. **Consistency fourth** (Consistency & Training, Body Metrics) — the pattern of showing up
5. **Direction last** (What's Next) — the bridge from past to future

This order mirrors the FLM priority hierarchy: transformation events rank above recognition events, which rank above activity artifacts.

### 5.4 Section Tap Behavior

Every section is tappable as a unit. A tap on the section container navigates to the section's destination. Individual items within a section may carry their own tap targets (e.g., a specific goal item within Goals Preview navigates to G-2 for that goal, not G-1).

Tapping the section header or "See All →" / "View All →" links navigates to the hub-level destination (G-1, L-10).

---

## Section 6 — Timeline Tab

### 6.1 Timeline Philosophy

The Timeline tab is the athlete's full legacy in chronological order. It answers one question: "How did I become who I am today?"

The Timeline is not a workout log or an activity feed. It does not duplicate W-18 Activity History. It surfaces the moments that built the athlete's identity — milestones, honors, promotions, completions, and the evidence of physical transformation. Individual workout sessions do not appear in the Timeline. Only events with lasting significance do.

Events in the Timeline are permanent. They appear when they occur and are never removed.

### 6.2 Event Sources

| Source System | Event Types Emitted |
|---|---|
| Honor Evaluation Service | All HonorInstance events: strength milestones, training milestones, goal milestones, program milestones, community milestones, chapter milestones, longevity milestones |
| Chapter / Goal system | Chapter Sealed, Chapter Created, Goal Achieved |
| Rank system | Rank Promoted (snapshotted rank name + sub-tier at promotion time) |
| Program system | Program Graduated, Program Enrolled |
| Body metrics system | Body Weight Logged, Progress Photo Added |

Every event is emitted with an immutable `timelineEventCategory` field. This field is set at event creation time and cannot be changed after the fact.

### 6.3 Event Category Taxonomy

Every timeline event belongs to exactly one category. The no-overlap rule is structural: category is determined by the emitting system, not by semantic interpretation.

| Category | Event Sources |
|---|---|
| **Performance** | Body metrics system events only: body weight log entries, progress photo uploads. V1.1 will add: raw PR events when explicit PR tracking ships. |
| **Legacy** | All other sources: all HonorInstance events (including strength milestone honors), rank promotions, program graduations, goal achievements, chapter events. |

**Why strength milestone honors are Legacy, not Performance:**
A strength milestone HonorInstance (e.g., "Bench 225 lbs Club") is the product's recognition of achievement — it is the system's voice, not a raw metric record. The raw workout log entry (weight × reps on a given date) lives in W-18/W-19. The honor is the recognition that a threshold was crossed. Recognition is Legacy. This distinction eliminates the overlap between "Strength milestones" and "Honors earned" that would otherwise exist if Performance were defined by subject matter rather than by source.

### 6.4 Filter Chips

Two optional filter chips appear immediately below the Timeline tab header:

```
[Performance]   [Legacy]
```

**Default state:** No chip active. All events shown in reverse chronological order.

**Chip interaction rules:**
- Tap inactive chip → activates filter; only events of that category are shown
- Tap active chip → deactivates filter; all events return
- At most one chip active at a time
- Filtering is client-side; no server round-trip required

**Empty state when filter active and no events match:** Single line: "No [Performance / Legacy] events yet." No illustration, no CTA.

**MVP scope:** Filter chips ship in MVP alongside the `timelineEventCategory` data model field. Both are built together. The Performance filter will return an empty state for athletes who have not logged body composition data — this is a valid state, not a UI failure.

### 6.5 Event Display

Each timeline entry renders with:
- Event type label (e.g., "HONOR EARNED", "GOAL ACHIEVED", "PROGRAM GRADUATED")
- Snapshotted display name (honor `displayName`, goal name, program name, rank name)
- Event date (`dateEarned` for HonorInstances; event date for all others)
- Optional contextual detail (e.g., weight value for strength milestone honors, chapter name for chapter events)

All display strings are snapshotted at event creation time. The Timeline never re-derives display strings from live entity names. If an entity is later renamed, the Timeline entry reflects the name at the time the event occurred.

### 6.6 Interaction Model

Every event card is tappable. Tap destinations are defined in Section 2.4. If an event's destination screen does not yet exist (e.g., a legacy chapter screen not yet specced), the tap is a no-op in MVP — the card is still rendered, just non-navigable.

---

## Section 7 — Strength & Performance Architecture

### 7.1 Adaptive Detection

The Strength & Performance section requires no athlete configuration. The system derives the athlete's performance profile automatically from session history. The `athleteType` field set during onboarding (Strength, Running, Hybrid, etc.) may serve as a secondary signal but session history is the primary input.

### 7.2 Classification Algorithm

**Step 1 — Group session types into families:**

| Family | Included Session Types |
|---|---|
| Strength family | STRENGTH, HIIT |
| Endurance family | RUN, WALK, BIKE, SWIM |
| Other (excluded from classification) | MOBILITY, YOGA, OTHER |

MOBILITY, YOGA, and OTHER sessions do not contribute to the classification count. They are valid training sessions that do not produce the performance metrics this section surfaces.

**Step 2 — Determine qualified families:**

A family is **qualified** when its session count ≥ 5 (all time).

**Step 3 — Apply classification:**

| Condition | Profile Assigned |
|---|---|
| Neither family qualified | DEFAULT |
| Strength family qualified only | STRENGTH_PROFILE |
| Endurance family qualified only | ENDURANCE_PROFILE |
| Both qualified; S ÷ (S+E) ≥ 0.70 | STRENGTH_PROFILE |
| Both qualified; S ÷ (S+E) ≤ 0.30 | ENDURANCE_PROFILE |
| Both qualified; ratio between 0.30–0.70 | HYBRID_PROFILE |

Where S = Strength-family session count, E = Endurance-family session count.

DEFAULT displays the Strength metric set. Strength is the most common new-athlete profile in the Forge Legacy catalog; it is the correct default for athletes who have not yet accumulated 5 sessions in any family.

**Applied example — tie-breaker scenario:**
25 Strength sessions, 23 Endurance sessions. S ÷ (S+E) = 25/48 = 52%. Within the 0.30–0.70 range → HYBRID_PROFILE.

**Applied example — clear dominant:**
40 Strength sessions, 5 Endurance sessions. S ÷ (S+E) = 40/45 = 89% ≥ 0.70 → STRENGTH_PROFILE.

### 7.3 Profile Metric Sets

**STRENGTH_PROFILE and DEFAULT:**
The 4–6 exercises most frequently logged in Strength-family sessions, sorted by logging frequency descending. An exercise qualifies for a metric card only when it has been logged in ≥ 3 separate sessions. If fewer than 4 exercises meet this threshold, the section shows however many are available (minimum 1 card, provided the section visibility threshold is met).

**ENDURANCE_PROFILE:**
The 4–6 most relevant endurance metrics available from session data. Dominant endurance type (RUN, WALK, BIKE, SWIM — whichever has the most sessions) determines metric selection. Metrics may include: longest session distance, most recent pace, cumulative distance by rolling period.

**HYBRID_PROFILE:**
2–3 Strength metrics (most-logged exercises meeting the ≥ 3 session threshold) combined with 2–3 Endurance metrics. Total capped at 6.

### 7.4 Preview Card (Overview Tab)

The Strength & Performance Preview shows up to 4 metric cards in a condensed layout (2×2 grid or horizontal row). Each card shows:
- Exercise or metric name
- Most recent logged value
- Directional trend indicator (improving / flat / declining) based on last 3 data points

No absolute comparisons. No target values. No "you need X more to reach Y" framing.

### 7.5 Metric Detail Screens

Tapping the Strength & Performance Preview navigates to the Strength & Performance Detail sub-screen. Within that screen, tapping an individual metric card navigates to a per-metric detail screen. Metric detail screens contain:
- All-time trend graph, zoomable by time range
- Milestones: HonorInstance events associated with this metric type
- Relevant workouts: the 5 most recent sessions containing this exercise or metric, with dates and logged values
- Relevant events: other Timeline events connected to this metric

### 7.6 MVP Scope Note on PRs

Explicit PR labels ("New PR!", "Personal Best") are deferred to V1.1. In MVP, the trend graph and HonorInstances in the Milestones subsection provide implicit PR context. A "Bench 225 lbs Club" honor in the Milestones list communicates a best lift without requiring a dedicated PR detection system. Raw PR infrastructure is V1.1.

---

## Section 8 — Goals Architecture

### 8.1 Goals in P-2

P-2 surfaces the active chapter's goals as a read-only preview. Goals are managed in G-1 (Goals Hub) and G-2 (Goal Detail). P-2 cannot create, update, or archive goals.

### 8.2 Goals Preview Behavior

The Goals Preview section displays a maximum of 3 active goals. When more than 3 active goals exist, the 3 most recently updated goals are shown.

Per-goal display:
- Goal name
- Progress indicator: progress bar + percentage for quantifiable goals (target is set); "In Progress" label for narrative goals (no target)
- Status label when achieved: "✓ Achieved [date]"

Completed (Achieved) goals appear below active goals in the preview, capped at 3 visible completions. "See All →" navigates to G-1.

### 8.3 Goals Across P-2 Surfaces

Goals appear in four locations within P-2:

| Location | Behavior |
|---|---|
| Goals Preview (Overview) | Max 3 active + 3 completed shown; tap goal → G-2; "See All" → G-1 |
| What's Next | Goals with >75% quantifiable progress surface as an actionable item (see Section 13) |
| Rank Journey section | GoalCompletion events in the rank journey timeline provide context for rank advancement |
| Timeline tab | Goal Achieved events appear as Legacy category events |

### 8.4 Navigation

- Tap individual goal in Goals Preview → G-2 for that specific goal
- Tap "See All →" in Goals Preview → G-1 (Goals Hub)
- Tap Goal Achieved event in Timeline → G-2 for that goal

---

## Section 9 — Rank Journey Architecture

### 9.1 Rank Journey Preview (Overview Tab)

The Rank Journey Preview section in the Overview tab is a condensed card showing:
- Current rank name + sub-tier
- Progress indicator toward next rank threshold (progress bar or equivalent)

Tapping the preview navigates to the P-2 Rank Journey Detail sub-screen.

### 9.2 Rank Journey Detail Sub-Screen

The full Rank Journey Detail sub-screen contains all four rank elements:

| Element | Description |
|---|---|
| Current rank | Rank name + sub-tier (format: "[Rank] · [Sub-tier]") |
| Progress toward next rank | Progress indicator showing proximity to next threshold |
| Rank ladder | Visual representation of the full rank progression path; current position highlighted; past ranks visually marked as achieved; future ranks visible but distinguished as not yet reached |
| Rank journey timeline | Chronological list of all rank promotions earned (snapshotted rank name, date promoted); reverse chronological |

The rank ladder's specific names, sub-tier structure, and threshold values are defined in the Rank System Architecture specification, which does not yet exist. The rank ladder component is a dependency of P-2. See Section 20, OQ-4.

### 9.3 Rank Journey Timeline (within Detail Screen)

Every rank promotion earned appears in the rank journey timeline:
- Snapshotted rank name + sub-tier at time of promotion
- Date promoted

If the athlete has no promotions (they remain at their starting rank), the rank journey timeline subsection is omitted from the detail screen. The rank ladder and current rank remain visible.

### 9.4 Exclusions

The Rank Journey section does not include:

| Excluded Element | Reason |
|---|---|
| Highest rank achieved as a separate field | The rank system is non-regressive; current rank is the highest rank. Surfacing both implies they could differ. |
| Rank velocity | Optimization anxiety — turns rank into a timed race |
| Time at current rank | Optimization anxiety — implies a correct or incorrect duration |

---

## Section 10 — Program Journey Architecture

### 10.1 Program Journey Contents

| Element | Description |
|---|---|
| Active program | Current enrollment with workout completion progress (X of Y workouts completed) |
| Programs graduated | Reverse-chronological list of all programs completed |
| Program categories completed | Summary of which program categories have at least one graduation |

### 10.2 Graduations

Program graduations are permanent records. A graduated program never leaves the Program Journey. Each graduation entry shows:
- Program name (snapshotted at graduation time)
- Graduation date
- Program category (STRENGTH, ENDURANCE, etc.)

Reverse chronological (most recent graduation first).

Forge celebrates completion, not participation. A program the athlete is enrolled in but has not yet graduated does not appear in the graduations list — it appears only in the Active Program subsection.

### 10.3 Active Program Subsection

When the athlete is enrolled in a program:
- Program name
- Progress: X of Y workouts completed
- Progress bar
- Tap → W-3 (Program Detail)

When no program is active: this subsection is omitted.

### 10.4 Program Categories Completed

A compact display showing which program categories have at least one graduation. Rendered as a tag row or grid with completion indicators.

Example:
```
STRENGTH ✓   ENDURANCE —   MOBILITY —   CONDITIONING —
```

### 10.5 Section Visibility

Program Journey is visible when at least one of the following is true:
- Athlete has graduated ≥ 1 program
- Athlete is currently enrolled in a program

If neither condition is met, the section is omitted.

---

## Section 11 — Honors & Milestones Architecture

### 11.1 Honors in P-2

Honors surface in two locations within P-2: the Honors & Milestones Preview section in the Overview tab, and as Legacy events in the Timeline tab. P-2 does not replace L-10 (Honors Hub). P-2 provides a preview and navigation path; L-10 is the full honors display surface.

### 11.2 Honor Preview Display Rules

The Honors & Milestones Preview shows:
- Section label with total honor count: "HONORS [N]"
- 6 most recently earned honors, sorted by `dateEarned` descending
- Per honor: snapshotted `displayName` and `dateEarned`
- "View All →" navigates to L-10

**No completion percentage.** The total number of honor types in the catalog is never displayed. Honors are a trophy case. Showing a denominator (e.g., "23 of 53") converts the trophy case into a checklist. The checklist model is explicitly prohibited by the discovery decisions.

**No catalog hints.** Unearned honor types are never surfaced anywhere on P-2.

### 11.3 Navigation

- Tap individual honor in preview → L-11 (Honor Detail Sheet) for that honor
- Tap "View All →" → L-10 (Honors Hub)
- Tap Honor Earned event in Timeline → L-11 (Honor Detail Sheet)

### 11.4 Honors in Timeline

All HonorInstance events appear in the Timeline as Legacy category events. The timeline entry uses the HonorInstance `displayName` and `dateEarned` fields — both snapshotted at earn time. The Timeline never re-queries the live honor catalog for display strings.

### 11.5 Section Visibility

The Honors & Milestones Preview section is visible only when the athlete has ≥ 1 HonorInstance. Before the first honor is earned, the section is omitted entirely. No empty state, no "earn your first honor" invitation.

---

## Section 12 — Consistency & Training Architecture

### 12.1 Primary Metric

**Lifetime Workouts** is the primary metric. It is the precomputed `workoutCount` from the Honor Evaluation Service — the total number of sessions saved across all time, all activity types.

Display treatment: Lifetime Workouts is rendered with the largest type weight in this section. No secondary framing, no target, no encouragement copy.

### 12.2 Supporting Metrics

Supporting metrics are displayed in a secondary row or grid beneath the primary:

| Metric | Definition | Source |
|---|---|---|
| Hours Forged | Total training hours accumulated across all time | Precomputed `hoursForged` statistic |
| Hours This Month | Training hours in the current calendar month | Derived from session data |
| Workouts This Month | Session count in the current calendar month | Derived from session data |
| Avg Workouts / Week | Rolling 8-week average of sessions per week | Derived: sessions in last 56 days ÷ 8 |
| Current Streak | Consecutive calendar weeks with ≥ 1 session logged | Derived from session data; see 12.3 |

Supporting metrics are always visible when the Consistency & Training section is visible. A value of 0 for any metric is a valid displayed state.

### 12.3 Streak Handling

**Streak definition:** A streak counts consecutive calendar weeks (Monday–Sunday) in which the athlete logged at least one session of any type.

**Display rules:**
- Streak is never the largest or most prominent element in this section
- Streak is never featured above the fold or outside this section
- When current streak = 0 (no session logged in the current calendar week): display reads "Best: [N] weeks" using the athlete's longest historical streak
- When current streak ≥ 1: display reads "[N] weeks"
- No "broken streak" message. No "days since last session." The app surfaces presence, never absence.

**Why week-based, not daily:**
Daily streak mechanics penalize rest days, which are prescribed by every structured training program in the Forge Legacy catalog. A 3x/week beginner following Strength Foundation I should feel zero anxiety on rest days. Weekly streaks respect program structure.

### 12.4 Rolling Window

"Avg Workouts / Week" uses a fixed 8-week rolling window. Eight weeks is long enough to smooth single missed weeks without reflecting inactivity periods that may be months old.

---

## Section 13 — What's Next Architecture

### 13.1 Purpose

What's Next is the bridge from where the athlete is to what they should do next. It is always the last section in the Overview tab. It is always present.

What's Next does not create obligations. It does not track missed sessions. It does not surface pressure. It identifies the single clearest path forward from the athlete's current state and presents it as an option, not a requirement.

### 13.2 Content Priority

What's Next surfaces one primary item at a time. The highest-priority qualifying candidate is shown:

| Priority | Candidate | Condition | Tap Destination |
|---|---|---|---|
| 1 | Next program workout | Athlete is enrolled in an active program | W-3 (Program Detail) → workout launch |
| 2 | Goal nearing completion | An active quantifiable goal has >75% progress | G-2 (Goal Detail) for that goal |
| 3 | Rank proximity | Athlete is within 10% of next rank threshold | P-2 Rank Journey Detail |
| 4 | Continue training | Athlete has logged sessions; last session was not program-based; last session was within 14 days | W-1 (Workouts tab) |
| 5 | Start a Program | Default fallback — always available | W-2 (Program Browse) |

Only one item is shown. If Priority 1 qualifies, Priority 2–5 are not evaluated for display (though all are always evaluated in the background for potential future display).

**Priority 3 caveat:** The rank proximity candidate requires rank threshold values from the Rank System Architecture specification, which does not yet exist. Until the rank system is specced, Priority 3 is unavailable and Priority 4 becomes the active fallback. Tracked in Section 20, OQ-4.

### 13.3 What's Next Is Never Omitted

The What's Next section is never absent. A brand-new athlete with no sessions, no program, and no goals sees the Priority 5 fallback: "Start a Program" CTA pointing to W-2 (Program Browse). This ensures the screen always points forward.

---

## Section 14 — Achievement Pinning Architecture

### 14.1 Pinning System Overview

Achievement Pinning allows the athlete to designate one achievement to hold permanently in the Hero. The pinned achievement replaces the automatic default selection (Section 4.3) until explicitly removed.

Pinning is optional, private, and cosmetic. An athlete who never pins anything sees the automatic default. The pinned achievement is visible only on P-2 — it is not surfaced on P-1, L-1, squad profiles, or any other screen.

### 14.2 Pinnable Achievement Types

| Type | Source Entity |
|---|---|
| Honor Earned | HonorInstance |
| Goal Achieved | GoalCompletion event |
| Program Graduated | ProgramGraduation event |
| Rank Promoted | RankPromotion event |

**Chapter Sealed is not pinnable.** The current chapter is already in the Hero's Current Chapter element. Chapter lifecycle events belong to L-1.

**Body composition achievements are not a first-class pinnable type.** An athlete who wants to pin a body composition achievement should create a goal (e.g., "Lose 25 lbs"), achieve it, and pin the resulting GoalCompletion event. The GoalCompletion path covers this use case without requiring new event infrastructure. (R1-3 rejection rationale.)

### 14.3 Data Model

Stored on the athlete profile record:

```
pinnedAchievementRef: {
  type: 'honor' | 'goal' | 'program_graduation' | 'rank_promotion'
  id: uuid
} | null
```

`null` = no pin set; default selection algorithm applies.

The `id` field references:
- `honor` → HonorInstance.id
- `goal` → GoalCompletion event ID
- `program_graduation` → ProgramGraduation event ID
- `rank_promotion` → RankPromotion event ID

### 14.4 Pin / Unpin UX

**Setting a pin:**
The athlete long-presses an eligible achievement event in the Timeline tab. A context menu appears with the action "Pin to Hero." Tapping it sets `pinnedAchievementRef` on the athlete profile. The Hero updates immediately.

Pinnable event types in the Timeline are the four types listed in 14.2. Non-pinnable events (Chapter Sealed, body weight logs, progress photos) do not show "Pin to Hero" on long-press.

**Replacing a pin:**
Setting a new pin via Timeline long-press silently replaces any existing pin. No confirmation dialog.

**Removing a pin:**
The athlete taps the achievement card in the Hero. An action sheet or bottom menu appears with "Remove Pin." Tapping it sets `pinnedAchievementRef` to null. The Hero returns to default achievement selection immediately.

### 14.5 Fallback Behavior

If the pinned achievement's referenced entity becomes unavailable (theoretically impossible for immutable event records but defined for implementation robustness), `pinnedAchievementRef` is silently reset to null and the default algorithm applies. No error state is shown.

---

## Section 15 — Empty States and New Athlete States

### 15.1 Empty State Philosophy

P-2 never punishes missing data with placeholder cards, empty-state illustrations, or "add your first X" prompts within a section. Sections without qualifying content are omitted entirely. The screen adapts to what exists.

The always-present sections (Hero, Rank Journey Preview, Consistency & Training Preview, What's Next) handle low-data states gracefully. They never look empty because they always have valid content to show, even for new athletes.

### 15.2 Per-Section States

| Section | Has Qualifying Data | No Qualifying Data |
|---|---|---|
| Hero | Full 5-element composition | Achievement slot omitted; other 4 elements present |
| Strength & Performance | Metric cards shown | Section omitted from above-fold; next eligible section promoted |
| Goals | Goal rows shown | Section omitted |
| Rank Journey Preview | Current rank + progress shown | Always present; rank always exists from account creation |
| Program Journey | Graduated programs + active program shown | Section omitted |
| Honors & Milestones | Honor cards shown | Section omitted |
| Consistency & Training | All metrics shown | Always present; values of 0 are valid |
| Weight & Body Metrics | Metric cards and/or photos shown | Section omitted |
| What's Next | Priority 1–5 candidate shown | Priority 5 fallback ("Start a Program") always renders |
| Timeline | Events listed | Single-line text: "No events yet" — no illustration |

**Above-fold new athlete state:** Hero + What's Next with "Start a Program" visible if both Strength & Performance and Goals are omitted. The above-fold zone does not collapse below two visible sections.

---

## Section 16 — Metric Visibility Rules

| Section / Metric | Visibility Condition |
|---|---|
| Strength & Performance section | At least one activity family is qualified: ≥ 5 sessions in Strength family OR ≥ 5 sessions in Endurance family |
| Individual exercise metric card | Exercise logged in ≥ 3 separate sessions |
| Goals section | Active chapter has ≥ 1 goal (active or achieved) |
| Rank Journey Preview | Always visible |
| Program Journey section | Athlete has graduated ≥ 1 program OR is enrolled in an active program |
| Honors & Milestones section | Athlete has ≥ 1 HonorInstance |
| Consistency & Training section | Always visible |
| Weight & Body Metrics section | Athlete has ≥ 1 body weight log entry OR ≥ 1 progress photo |
| What's Next section | Always visible |
| Hero achievement slot | ≥ 1 pinnable event exists in the athlete's full history |
| Timeline Performance filter | Visible always; may return empty state for athletes with no body composition data |

The section-level threshold (e.g., ≥ 5 sessions for Strength & Performance) determines whether the section appears at all. The per-metric threshold (e.g., ≥ 3 sessions per exercise) applies within a visible section.

---

## Section 17 — Non-Behaviors

The following behaviors are explicitly prohibited on P-2. They may not be introduced via amendment without a formal product decision.

| Prohibited Behavior | Authority |
|---|---|
| Global rankings of any kind | Discovery: "No global rankings" |
| Percentile comparisons ("stronger than X%") | Discovery: "No percentile systems" |
| Comparison to other named or anonymous athletes | Discovery: "Progress compares the athlete only to their past self" |
| Squad comparisons within P-2 | Discovery: "Squad comparisons are not part of Progress" |
| Streaks as a primary or above-fold metric | Discovery: "Streaks may never become a primary metric" |
| "Missed workout," "days since last session," or absence-tracking copy | Product DNA: accountability without shame |
| Negative progress indicators framed as failures | Product DNA: no optimization anxiety |
| Honor completion percentage or "X of Y honors" framing | Discovery: "Do not include Honor Completion %" |
| "Highest rank achieved" as a field separate from current rank | Discovery: excluded from Rank section |
| Rank velocity, days-to-rank-up, or time-at-rank metrics | Discovery: excluded from Rank section |
| Empty-state sections with promotional, inviting, or pressure copy | Product DNA: no shame mechanics; omit rather than pressure |

---

## Section 18 — Architecture Decisions

| Decision ID | Rule |
|---|---|
| **PH-D1 — Navigation entry** | P-2 is accessible only from P-1 (Profile). No tab bar entry. No deep link from other tabs. A P-1 Amendment is required before this path can be built. |
| **PH-D2 — Tab model** | P-2 contains exactly two tabs: Overview and Timeline. No additional tabs in MVP. Default tab on entry: Overview. |
| **PH-D3 — Hero composition** | The Hero always contains exactly five elements: Current Rank, Current Chapter, Latest/Pinned Achievement, Forging Since, Lifetime Workouts. These elements are fixed. No athlete configuration of the Hero is permitted (achievement pinning is a selection within the achievement slot, not a configuration of the slot itself). |
| **PH-D4 — Achievement pinning data model** | `pinnedAchievementRef: { type: enum, id: uuid } \| null` stored on the athlete profile record. null = no pin; default selection algorithm applies. The `id` references the specific event entity. |
| **PH-D5 — Pinnable achievement types** | Pinnable types: HonorInstance, GoalCompletion event, ProgramGraduation event, RankPromotion event. Chapter Sealed and body composition achievements are not pinnable types. Body composition milestones are covered via GoalCompletion. |
| **PH-D6 — Default achievement selection** | When no pin is set, the Hero shows the highest-priority eligible event from pinnable types within the 30-day FLM active window, using FLM priority ordering scoped to pinnable types (Goal Achieved P2 > Rank Up P3 > Program Graduation P4 > Honor Earned P6). Within the same priority level, most recent event wins. If no eligible events exist in the active window, fall back to most recent eligible event across all time. If no eligible events exist at all, the achievement slot is omitted. |
| **PH-D7 — Adaptive metric classification algorithm** | Profile classification uses two-step logic: (1) determine qualified families (≥ 5 sessions), (2) apply dominance ratio S ÷ (S+E). If both qualified and ratio ≥ 0.70: STRENGTH_PROFILE. If ≤ 0.30: ENDURANCE_PROFILE. If 0.30–0.70: HYBRID_PROFILE. If neither qualified: DEFAULT. Full algorithm in Section 7.2. |
| **PH-D8 — Activity family groupings** | Strength family: STRENGTH, HIIT. Endurance family: RUN, WALK, BIKE, SWIM. MOBILITY, YOGA, OTHER: excluded from classification entirely. |
| **PH-D9 — Goals preview limit** | Goals Preview shows a maximum of 3 active goals (most recently updated when >3 active). Maximum 3 completed goals in preview. "See All →" links to G-1 for full list. |
| **PH-D10 — Streak display constraint** | Streaks are a supporting metric in Consistency & Training only. Never featured above the fold, never the largest element in any section. When current streak = 0, display "Best: [N] weeks." When current streak ≥ 1, display "[N] weeks." No broken-streak language. |
| **PH-D11 — Timeline event sourcing** | Timeline events are emitted by: Honor Evaluation Service (all evaluator outputs), Chapter/Goal system (chapter lifecycle and goal completion events), Rank system (promotion events with snapshotted rank name), Program system (graduation events), Body metrics system (weight logs and progress photos). Every event carries an immutable `timelineEventCategory` tag set at creation. |
| **PH-D12 — Timeline ordering** | Reverse chronological (newest first). No chapter groupings, no month groupings. The unfiltered view is a single flat feed. |
| **PH-D13 — What's Next content priority** | Five-level priority: (1) next program workout, (2) goal >75% complete, (3) rank within 10% of next threshold, (4) continue free training, (5) Start a Program. One item shown at a time. Priority 5 is the always-available fallback. Priority 3 is blocked until the rank system is specced. |
| **PH-D14 — Empty state strategy** | Conditional sections with no qualifying content are omitted entirely. No placeholder card, no empty-state illustration, no "add your first X" CTA inside section containers. Always-present sections (Hero, Rank Journey, Consistency & Training, What's Next) handle low-data states with valid content (not empty states). |
| **PH-D15 — P-2 naming resolution** | P-2 designates the Progress Hub. All prior informal "P-2 Edit Profile" references in P-1 v1.0 and Identity Amendment 001 are invalidated. When the Edit Profile screen is formally specced, it must receive a new code (candidate: P-9). P-1 Amendment 001 must update all affected references. |
| **PH-D16 — PR detection in MVP** | Explicit PR labels are deferred to V1.1. In MVP, HonorInstances from StrengthEvaluator serve as the implicit PR signal in the Metric Detail screen's Milestones subsection. |
| **PH-D17 — Body metrics visibility threshold** | The Weight & Body Metrics section is visible when the athlete has ≥ 1 body weight log entry OR ≥ 1 progress photo. No minimum history required beyond first entry. |
| **PH-D18 — Consistency metric window** | "Avg Workouts / Week" uses a rolling 8-week (56-day) window. Smooths short-term variation without reflecting historical inactivity. |
| **PH-D19 — Program Journey active program** | An enrolled but not yet graduated program appears in the Active Program subsection only. It does not appear in the graduations list. Forge celebrates completion; active enrollment is not a completion record. |
| **PH-D20 — Sub-screen code convention** | P-2 detail sub-screens require screen codes before implementation. Proposed convention: P-2.1 (Strength & Performance Detail), P-2.2 (Rank Journey Detail), P-2.3 (Program Journey Detail), P-2.4 (Consistency Detail), P-2.5 (Body Metrics Detail). Pending product decision (Section 20, OQ-1). |
| **PH-D21 — Timeline category taxonomy** | Two categories: Performance (body metrics system events: body weight logs, progress photos; V1.1 adds raw PR events) and Legacy (all other event sources including all HonorInstances). Category is determined by event source, not by subject matter. No event belongs to both categories. |
| **PH-D22 — Timeline filter chip behavior** | Two chips: "Performance" and "Legacy." Default: no chip active (all events visible). Tap to activate. Tap active chip to return to unfiltered view. At most one chip active at a time. Client-side filtering — no server round-trip. |
| **PH-D23 — Timeline filter MVP scope** | Filter chips ship in MVP alongside the `timelineEventCategory` data model field. Both are implemented together. Performance filter may return empty state for athletes with no body composition data — this is valid, not a UI failure. |
| **PH-D24 — Activity family groupings** | See PH-D8. Identical content. PH-D24 exists as a cross-reference anchor for the Section 7.2 algorithm table. |
| **PH-D25 — Per-exercise metric card minimum** | An individual exercise metric card in Strength & Performance is rendered only when that exercise has been logged in ≥ 3 separate sessions. This prevents trial exercises (logged once or twice) from generating metric cards with no meaningful trend data. |

---

## Section 19 — Validation Checklist

### Navigation
- [ ] P-2 is entered only from P-1; no direct entry from any other tab or surface
- [ ] P-2 back navigation pops to P-1, preserving P-1 scroll position
- [ ] All Overview section taps navigate to the correct destination per Section 2.4
- [ ] All Timeline event taps navigate to the correct destination per Section 2.4
- [ ] "See All" / "View All" links navigate to G-1 and L-10 respectively
- [ ] Sub-screen codes are assigned before implementation begins (OQ-1)

### Hero
- [ ] Hero is always present; never omitted or collapsed
- [ ] All 5 elements render correctly for a full-data athlete
- [ ] Achievement slot is omitted (not empty-stated) for athletes with no pinnable events
- [ ] Default achievement selection applies FLM priority ordering scoped to pinnable types
- [ ] Default achievement correctly falls back across the 30-day window rule
- [ ] Pinned achievement persists across app sessions
- [ ] "No Active Chapter" renders correctly when athlete has no active chapter

### Overview Tab
- [ ] Above-fold shows Hero + at least two sections without scrolling on a 375×812 viewport
- [ ] If Strength & Performance unavailable, next eligible section promotes to above-fold
- [ ] All conditional sections are omitted (not empty-stated) when threshold not met
- [ ] What's Next is always the last section in scroll order
- [ ] Weight & Body Metrics appears only when body data threshold is met

### Timeline Tab
- [ ] All event types appear in the Timeline
- [ ] Every event carries a correct, immutable `timelineEventCategory` tag
- [ ] Default view: all events, reverse chronological, no filter active
- [ ] Performance chip filters to body metrics events only in MVP
- [ ] Legacy chip filters to all HonorInstance, rank, program, goal, and chapter events
- [ ] Chips are mutually exclusive
- [ ] Tapping active chip returns to unfiltered view
- [ ] Performance empty state shows single-line text only
- [ ] Display strings are snapshotted — renaming a goal or program does not alter timeline entries

### Strength & Performance
- [ ] Classification algorithm handles all edge cases: tied dominance, single family, neither qualified, DEFAULT
- [ ] STRENGTH_PROFILE shows most-logged exercises with ≥ 3 sessions each
- [ ] HYBRID_PROFILE shows 2–3 Strength + 2–3 Endurance, capped at 6
- [ ] Section is omitted when no family is qualified
- [ ] Per-metric detail screen contains: trend graph, milestones, relevant workouts, relevant events

### Goals
- [ ] Preview shows max 3 active + 3 completed goals
- [ ] When >3 active goals exist, most recently updated 3 are shown
- [ ] "See All →" navigates to G-1
- [ ] Individual goal item tap navigates to G-2 for that goal
- [ ] Goals section is omitted when no active chapter goals exist

### Rank Journey
- [ ] Rank Journey Preview is always present
- [ ] Preview shows current rank + progress toward next rank
- [ ] Rank Journey Detail shows: current rank, progress, rank ladder, rank journey timeline
- [ ] Rank history subsection omitted for athletes with no promotions
- [ ] Does not include: rank velocity, time at rank, highest rank achieved separately

### Program Journey
- [ ] Active program shows name, X/Y progress, and progress bar
- [ ] Graduations list is permanent and reverse chronological
- [ ] Active enrollment does not appear in the graduations list
- [ ] Section is omitted when no program history and no active enrollment

### Honors & Milestones
- [ ] Preview shows 6 most recent honors by dateEarned descending
- [ ] Section label shows total honor count
- [ ] No completion percentage shown
- [ ] No unearned honors surfaced
- [ ] Section is omitted when no HonorInstance exists
- [ ] "View All →" navigates to L-10

### Consistency & Training
- [ ] Always present
- [ ] Lifetime Workouts is the primary, largest-rendered metric
- [ ] Supporting metrics are visually secondary
- [ ] Streak displays "Best: N weeks" when current streak = 0
- [ ] Streak never displayed with greater prominence than Lifetime Workouts

### What's Next
- [ ] Always present
- [ ] Surfaces highest-priority qualifying candidate
- [ ] New athlete sees "Start a Program" CTA navigating to W-2
- [ ] Each candidate navigates to the correct destination per Section 13.2

### Achievement Pinning
- [ ] Long-press on eligible Timeline event shows "Pin to Hero" option
- [ ] Non-pinnable events do not show "Pin to Hero"
- [ ] Setting a new pin silently replaces the existing pin
- [ ] Tapping Hero achievement slot shows "Remove Pin" action
- [ ] Removing pin immediately returns Hero to default selection
- [ ] `pinnedAchievementRef` is null when no pin is set

### Non-Behaviors
- [ ] No global rankings anywhere on P-2
- [ ] No percentile comparisons
- [ ] No squad comparisons or squad activity
- [ ] No missed workout or absence-tracking copy
- [ ] No streak as primary or above-fold metric
- [ ] No honor completion percentage
- [ ] No "highest rank achieved" separate from current rank
- [ ] No rank velocity or time-at-rank metrics
- [ ] No empty-state sections with promotional or pressure copy

---

## Section 20 — Pre-Lock Self-Audit

The following unresolved questions must be answered before P-2 transitions from DRAFT to LOCKED. Each question is assessed for whether it blocks the lock.

---

### OQ-1 — Sub-Screen Codes for P-2 Detail Screens

**Issue:** P-2 contains five detail sub-screens (Strength & Performance Detail, Rank Journey Detail, Program Journey Detail, Consistency Detail, Body Metrics Detail) that require screen codes before implementation.

**Options:**
- **A — Sub-number convention (P-2.1 through P-2.5):** Reflects parent-child relationship; keeps P-series clean
- **B — New P-series codes (P-10 through P-14):** Treats all screens as peers; avoids decimal naming
- **C — Hybrid:** Major detail screens get P-series codes; minor overlays remain informal

**Proposed resolution:** Accept Option A (P-2.X). Sub-screens are children of P-2, not independent screens. Proposed assignments:
- P-2.1 — Strength & Performance Detail
- P-2.2 — Rank Journey Detail
- P-2.3 — Program Journey Detail
- P-2.4 — Consistency Detail
- P-2.5 — Body Metrics Detail

**Lock blocker:** No. Implementation can proceed under interim naming; codes can be formalized before first implementation of any sub-screen.

---

### OQ-2 — P-1 Amendment for Progress Entry Point

**Issue:** P-1 v1.0 does not contain a "Progress" entry point. The discovery decision "Progress is accessed from Profile" requires P-1 to navigate to P-2.

**Proposed resolution:** Add a "Progress" row to P-1 between the Chapter Card and the Rank section (new Tier 2.5 or promoted section). This surfaces P-2 in the upper information hierarchy, reflecting its status as a primary feature. Alternatively, a "View Progress →" CTA can be embedded within the Chapter Card context, since chapter and progress are closely related. Product decision required on exact placement and label.

**Lock blocker:** No. Per established Forge architecture workstream convention, the authoritative architecture (P-2) is locked first; dependent screens are updated through dedicated amendments afterward. P-1 Amendment 001 is a downstream dependency of P-2, not a prerequisite for P-2's lock. P-1 Amendment 001 must be written and approved before P-1 is implementation-ready.

---

### OQ-3 — Edit Profile Renumbering

**Issue:** P-1 v1.0 references "P-2 Edit Profile" in multiple places (profile photo tap, Edit Profile CTA, display name and athlete type edit paths). These are invalidated by PH-D15.

**Proposed resolution:** Assign P-9 to Edit Profile. The informal P-3–P-8 range covers rank detail and settings screens. P-9 keeps Edit Profile in the P-series without disrupting that range.

P-1 Amendment 001 (the same amendment required for OQ-2) should also update all "P-2 Edit Profile" references to the new code in a single amendment.

**Lock blocker:** No for P-2's own lock. P-2 is unaffected by the Edit Profile renumbering. However, P-1 remains non-implementation-ready until the renaming is resolved.

---

### OQ-4 — Rank System Specification Dependency

**Issue:** Section 9 (Rank Journey) and Section 13 (What's Next — Priority 3) both depend on rank threshold values that do not yet exist. The rank system — rank names, sub-tier structure, threshold values — has not been specced.

**Specific blockers within P-2:**
- The rank ladder (P-2.2 Rank Journey Detail) cannot be implemented without rank names and sub-tiers
- The progress-toward-next-rank indicator cannot be implemented without threshold values
- What's Next Priority 3 ("rank within 10% of next threshold") cannot fire without threshold values

**Impact:** The Rank Journey Detail sub-screen and the rank proximity What's Next candidate are implementation-blocked until the rank system is specced. The Rank Journey Preview card in the Overview tab can be partially implemented (current rank display) without the threshold data.

**Lock blocker:** No for P-2's specification lock. The architecture is fully defined; the data dependency is noted. Implementation of rank-dependent components is gated on the rank system spec.

---

### OQ-5 — Weight & Body Metrics Sub-Architecture

**Issue:** Section 16 defines the visibility threshold for the Weight & Body Metrics section (≥ 1 body weight entry or photo), and Section 6.2 defines the Timeline event types for body metrics. However, the full sub-architecture of the Weight & Body Metrics section — what specific metrics are displayed, how weight trend graphs are calculated, how progress photos are organized within P-2 — is not defined in this document.

**Proposed resolution:** The Weight & Body Metrics section warrants a dedicated architecture supplement (or a P-2 amendment) before that section is implemented. In the interim, the section can be omitted from the initial MVP implementation without affecting the rest of P-2.

**Lock blocker:** No. The section can be deferred in implementation. This is not a blocking question for P-2's specification lock.

---

### OQ-6 — Streak Definition Edge Case

**Issue:** Week-based streaks (Monday–Sunday) can create an edge case where an athlete logs sessions on Sunday and the following Tuesday but "breaks" a streak if they missed logging during the Monday–Sunday week that Sunday ended. For example: session on Sunday June 14 ends Week 1. Session on Tuesday June 16 is in Week 2. No session in the Monday–Sunday week of June 15–21 means the streak breaks at 0 after June 21, even though only 5 days elapsed between sessions.

**Proposed resolution:** This is an acceptable tradeoff. Week-based streaks are architecturally correct for the reasons stated in Section 12.3. Athletes trained to expect weekly accountability (not daily) will plan around it. No change required.

**Lock blocker:** No. Implementation awareness note only.

---

### Summary Table

| OQ | Description | Lock Blocker? | Required Action |
|---|---|---|---|
| OQ-1 | Sub-screen codes | No | Product decision on P-2.X naming convention |
| OQ-2 | P-1 Amendment for Progress entry | No — downstream amendment per Forge workstream convention | P-1 Amendment 001 |
| OQ-3 | Edit Profile renumbering | No | P-1 Amendment 001 (same doc as OQ-2) |
| OQ-4 | Rank system specification | No (spec lock); Yes (rank implementation) | Rank System Architecture spec |
| OQ-5 | Body Metrics sub-architecture | No | Architecture supplement before body metrics section ships |
| OQ-6 | Streak edge case | No | Implementation awareness only |

**Lock recommendation:** LOCKED.

No open questions block the lock. OQ-2 (P-1 Amendment 001) and OQ-3 (Edit Profile renumbering) are downstream dependencies resolved through dedicated amendments per Forge workstream convention. The authoritative architecture is locked first. OQ-1, OQ-4, OQ-5, and OQ-6 do not affect the specification.

**Downstream specs requiring amendment or creation after P-2 is locked:**

| Document | Action Required |
|---|---|
| P-1 v1.0 | Amendment 001: add Progress entry point, renumber "P-2 Edit Profile" references |
| Identity Amendment 001 | Update "P-2 Edit Profile" reference to new Edit Profile code |
| Honor Evaluation Service Architecture | Confirm `timelineEventCategory` field emitted on all evaluator outputs |
| Goal Hub Spec (G-1) | Confirm GoalCompletion event emits Timeline event |
| Rank System Architecture | New spec required (P-2 implementation dependency) |
| Weight & Body Metrics Architecture | New supplement required before body metrics section ships |

---

## Change Log

| Version | Date | Summary |
|---|---|---|
| 1.0 | June 2026 | Initial draft. Incorporates all Progress Analytics Discovery Phase decisions (treated as pre-approved). R1 Refinement Pass applied: R1-1 Timeline Filtering accepted (PH-D21–D23), R1-2 Adaptive Metric Classification accepted (PH-D7 formalized, PH-D24–D25 added), R1-3 Body Composition Pinning rejected. 25 architecture decisions (PH-D1–PH-D25). 6 open questions identified in Pre-Lock Self-Audit. |
| 1.1 | June 2026 | Status updated DRAFT → LOCKED. OQ-2 reclassified from lock blocker to downstream amendment dependency per Forge workstream convention. P-2 is now the authoritative source of truth for the Progress Hub. |

---

*Forge Legacy P-2 Progress Hub Architecture v1.1 — LOCKED. This document is the authoritative source for the Progress Hub. All implementation of P-2 must conform to the rules and decisions defined here. Downstream amendments to P-1 and Identity Amendment 001 are required to complete the navigation dependency chain. Authority: Progress Analytics Discovery Phase (June 2026) and R1 Refinement Pass (June 2026).*
