# Forge Legacy — Home Screen Wireframe Specification
## H-1 | v1.0 — June 2026

**Status:** Lock-Ready
**Authority:** Forge Legacy Master PRD Section 5 (MVP), Product DNA, O-3 v1.0, G-1 v1.1, W-1 v1.0, W-3 v1.0, S-1 v1.2, P-1 v1.0, Critical Decisions Amendment 001

---

## Preamble: What H-1 Is For

H-1 is the first screen most athletes see every day.

It is the screen shown immediately after onboarding completion. It is the screen most athletes will return to more than any other screen in Forge Legacy.

H-1 answers one question: **"What should I focus on today?"**

Not: "What are my statistics?"
Not: "What are other athletes doing?"
Not: "What content should I consume?"
Not: "What features does this app have?"

Just: orientation, context, and one clear action.

H-1 is a **Daily Focus Surface** — a focused, personal screen that gives the athlete their bearings and surfaces the one action that matters. Every design decision in this specification must serve that purpose. If a section cannot answer "What should I focus on today?" it does not belong on H-1.

**What H-1 is not:**
- A dashboard: does not display statistics, charts, trend lines, or comparative metrics
- An activity feed: does not surface other athletes' activity, social posts, or content
- A notification surface: does not present alerts, reminders, or prompts for missed activity
- A feature map: does not present navigation options as the primary visual experience

**What H-1 is:**
- The athlete's daily entry point to their chapter and their work
- The most direct path from "open app" to "start training"
- A grounding moment before the workout, not an engagement hook

---

## Architecture Decisions

Twelve decisions were required to complete this specification.

---

### Decision 1 — H-1 Purpose: Daily Focus Surface

**Architecture: H-1 is a Daily Focus Surface. Not a dashboard. Not an activity feed.**

**Option A (Dashboard):** Presents all information equally — stats, metrics, progress numbers, summaries. Contradicts Product DNA principles Story Before Data and Identity Over Performance. A dashboard treats the athlete as a data subject, not a person in a story.

**Option B (Daily Focus Surface):** Presents three things: where the athlete is (chapter), what they're working toward (goal), and what to do next (CTA). Shows only what answers "What should I focus on today?" Omits everything else.

**Option C (Activity Feed):** Social-first. Other athletes' activity appears. Content is consumed passively. Directly violates Product DNA: not a social network, not feed-driven, not notification-driven.

**Decision: Option B. H-1 is a Daily Focus Surface.**

---

### Decision 2 — Information Hierarchy: Five Tiers

**Architecture: Five ordered content tiers. Each section present only when its data applies. Tiers appear in this order, always.**

| Tier | Content | Present When |
|------|---------|-------------|
| 1 | Chapter Card (Hero) | Always — or replaced by Invitation Card when no Active Chapter |
| 2 | Active Program Card | Active Program exists |
| 3 | Workout CTA | Always |
| 4 | Recent Legacy Activity | Qualifying milestone events within last 7 days |
| 5 | Squad Card | Athlete belongs to at least one squad |

Scroll order follows Tiers 1–5 exactly. No reordering. No athlete customization in MVP.

---

### Decision 3 — Active Chapter Is the Hero

**Architecture: The Chapter Card occupies Tier 1 as the full-width hero element.**

The chapter is the "why" behind everything on H-1. The athlete's goal, their program, their workouts — all exist in service of the chapter. H-1 leads with that context. The athlete opens the app and immediately knows: "I'm in [Chapter Name]. This is what I'm building."

The Chapter Card includes the Primary Goal inline (see Decision 4). It does not include workout counts, full goal history, program details, or honors — those belong in L-3.

---

### Decision 4 — Primary Goal Within Chapter Card

**Architecture: The Primary Goal is displayed within the Chapter Card, not as an independent module on H-1.**

The chapter and the primary goal are one unit of meaning: the chapter is the container, the goal is the purpose. Separating them into independent H-1 modules creates a screen with two competing focal points and implies the goal exists independently of the chapter — which contradicts the architecture.

The Chapter Card shows: chapter name, active duration, and primary goal (name + progress). If no primary goal exists: an "Add a primary goal →" link appears within the card.

**Primary Goal Module note:** The deliverables list includes "Primary Goal Module" as a distinct section. That section is satisfied by this decision and by Sections 5.1–5.3 of this specification. The Primary Goal has no independent H-1 section — it is part of the Chapter Card by locked design.

---

### Decision 5 — Active Program: Separate Card Below Chapter

**Architecture: The Active Program appears as a separate card below the Chapter Card.**

The program is how the athlete is pursuing the chapter — methodology, not identity. It belongs in proximity to the chapter but separate from it. Merging program details into the Chapter Card would conflate "what chapter am I in" (identity) with "what structured path am I on" (methodology).

The Active Program Card shows: program name, position in program, next workout title (if defined), and workouts-complete progress.

Section is entirely omitted when no Active Program exists.

---

### Decision 6 — Workout CTA: Single Contextual Button

**Architecture: One full-width primary Workout CTA. Label adapts to program state. Never disabled.**

| State | CTA Label | Destination |
|-------|-----------|------------|
| Active Program exists | "Continue Program" | Active workout logging (W-9+) |
| No Active Program | "Start Workout" | W-8 (Activity Type Picker) |

One button. Not two. The athlete does not choose between options — the app surfaces the correct action based on context. "Continue Program" implies a pre-loaded next session from the active program. "Start Workout" opens the general workout creation flow.

The CTA is always present regardless of chapter or program state. Training is never gated.

---

### Decision 7 — No Active Chapter: Full-Page Invitation

**Architecture: When no Active Chapter exists, the Chapter Card is replaced by a full-width Invitation Card. The Workout CTA remains. The athlete is not blocked from training.**

The invitation is warm and aspirational, not a failure state. The athlete may train without a chapter (Workout CTA remains). The invitation is present because chapter creation is the highest-value action available to an athlete without one — not because the absence of a chapter is a problem.

Invitation copy: "Your training builds your legacy. Start a chapter to give it a name."
Invitation CTA: "Create Chapter" → L-5 (Post-Onboarding Chapter Creation).

---

### Decision 8 — Squad Presence: Single Card, No Feed

**Architecture: Squad module is a single presence card. No activity feed. No member activity displayed. Section omitted if athlete belongs to no squads.**

A squad activity feed would make H-1 feel like a social product. Product DNA is explicit: high-trust relationships, not social networking. The squad card confirms belonging and provides access to S-2 — it does not surface what teammates are doing. Accountability details live inside the squad, not on the home screen.

---

### Decision 9 — Rank: Absent from H-1

**Architecture: Rank does not appear on H-1 in MVP.**

Rank is an identity element belonging to P-1 Profile. Displaying rank prominently on H-1 would make the screen feel gamification-driven and imply rank advancement is the primary purpose — contradicting Product DNA (Identity Over Performance). When rank advances, it appears momentarily in Recent Legacy Activity and permanently on P-1. It is not a persistent H-1 fixture.

---

### Decision 10 — Recent Legacy Activity: Optional, 7-Day Window, 3 Items Max

**Architecture: An optional section showing up to 3 qualifying legacy milestone events from the last 7 calendar days. Omitted entirely if no qualifying events exist.**

Qualifying events (signal):
- Goal Achieved ✓
- Honor Earned 🏅
- Program Graduated 🎓

Not qualifying (noise):
- Workout logged (too frequent)
- Goal progress updated (too frequent — not a milestone)
- Chapter sealed (athlete would be in No Active Chapter state)

The section is signal, not log. It answers: "Did anything significant happen in my legacy recently?" — not "What have I done lately?"

---

### Decision 11 — Empty States: Section Omission

**Architecture: When a tier has no content, the section is entirely omitted. H-1 does not communicate absence as a problem.**

| Tier | Empty Behavior |
|------|---------------|
| Active Program | Section absent — no message about missing program |
| Recent Legacy Activity | Section absent — no "no recent activity" message |
| Squad | Section absent — no "join a squad" prompt |

The No Active Chapter state is the only exception: it uses an active invitation because chapter creation is a meaningful, high-value action. All other absences are silent.

A clean H-1 with only a Chapter Card and "Start Workout" CTA is a valid, intentional, correctly-functioning state for a new athlete. It is not sparse — it is focused.

---

### Decision 12 — Post-Completion Behavior: Contextual, Not Ceremonial

**Architecture: H-1 does not use modals or special screens for post-completion states. Milestones appear in Recent Legacy Activity. The exception is O-3 completion, which uses a toast.**

| Event | H-1 Behavior |
|-------|-------------|
| O-3 completion | Toast: "[Chapter Name] has started." (3s, auto-dismiss) |
| Goal Achieved | Chapter Card updates to Achieved state; appears in Recent Legacy Activity |
| Program Graduated | Program Card absent; CTA → "Start Workout"; appears in Recent Legacy Activity |
| Chapter Sealed | H-1 shows No Active Chapter state |
| Rank advanced | No H-1 change in MVP; visible on P-1 |

H-1 does not celebrate — it focuses. Celebration lives in the event itself (L-6 Chapter Reflection, program graduation screen, G-2 achievement state). H-1 shows that milestones happened and returns the athlete to: "What should I focus on today?"

---

## Section 1 — Purpose

H-1 is the Daily Focus Surface for Forge Legacy athletes.

Its purpose is singular: orient the athlete to what they're building and surface the action that moves them forward today.

H-1 does not compete with any other screen. It does not replicate L-3 (chapter detail), G-1 (goals), W-1 (workouts hub), or S-2 (squad detail). It shows just enough of each to ground the athlete and invite action.

**The one question H-1 answers:** "What should I focus on today?"

Every element on H-1 must earn its presence by contributing to that answer.

---

## Section 2 — Screen Goals

**H-1 succeeds when:**
1. The athlete opens the app and immediately knows what chapter they're in and what they're building toward
2. The path from "open app" to "start training" requires one tap — no navigation
3. The athlete who has nothing recent to show has a clean, focused screen that does not communicate failure
4. Stats, social activity, and gamification elements do not compete for attention with the athlete's own chapter
5. The athlete feels grounded — not overwhelmed, not pushed, not compared

**H-1 fails when:**
- The athlete must scroll to find the Workout CTA in standard state
- The screen has more than one obvious "where to look" focal point
- Numbers, streaks, or comparisons appear alongside the chapter context
- Squad activity or social elements dominate the screen
- A new athlete's clean screen feels like a broken or incomplete product
- The screen communicates what the athlete has NOT done

---

## Section 3 — Information Hierarchy

H-1 has five ordered content tiers. Each tier is present only when its data applies. When absent, a tier leaves no trace.

**TIER 1 — Chapter Card (Hero)**
The athlete's current chapter, including their primary goal. The most important context on H-1. Either shown in full or replaced entirely by the Chapter Invitation Card (No Active Chapter state). No alternative partial state.

**TIER 2 — Active Program Card**
The structured path the athlete is following through their chapter. Present only when an Active Program exists. Omitted — not placeholded — when absent.

**TIER 3 — Workout CTA**
The primary action. Always present. One button. Contextual label. Never disabled.

**TIER 4 — Recent Legacy Activity**
Meaningful milestones from the last 7 days. Maximum 3 events. Present only when qualifying events exist. Omitted entirely otherwise.

**TIER 5 — Squad Card**
Squad presence. One squad shown. Present only when athlete is in at least one squad. No activity feed. Omitted entirely otherwise.

---

## Section 4 — App Bar

```
┌─────────────────────────────────────────────────────────┐
│  Forge Legacy                              [●]          │
└─────────────────────────────────────────────────────────┘
```

**Left:** "Forge Legacy" wordmark — 17sp, primary weight. Not tappable. Identity anchor.

**Right:** Athlete avatar — circular, 36dp diameter. Navigates to P-1 (Profile) on tap. Shows profile photo if set; initials avatar if not (matching O-1/P-1 avatar pattern).

**Nothing else.** No search. No notification bell. No menu icon. No hamburger. The App Bar communicates two things: what app this is, and who the athlete is. That is all.

The App Bar is fixed at the top. It does not scroll with content.

---

## Section 5 — Chapter Card (Hero, Tier 1)

The Chapter Card is the most important element on H-1. It communicates who the athlete is as a builder today: their chapter name, how long they've been in it, and what they're working toward.

The Chapter Card spans the full usable content width (16dp margins). It is the first element visible after the App Bar. It does not compete with anything above it.

**Tap behavior:** The Chapter Card has two distinct tap zones:
- **Goal block area** (the region containing the GOAL label, goal name, and progress bar) — independently tappable → G-1 (Goal Hub). This allows athletes to navigate directly from H-1 to their goal without the detour through L-3.
- **All other areas of the card** (chapter name, status line, card background) — tappable → L-3 (Active Chapter Detail).

The goal block tap target occupies the lower portion of the card. The upper chapter identity area (name + status) retains the full card → L-3 behavior. These two zones must have distinct tap targets without visual ambiguity — the goal block is bounded by its visible content area.

### 5.1 Active Chapter State — Quantifiable Goal

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Road to 405                                            │
│  [24sp, primary weight]                                  │
│                                                          │
│  Active · 47 days                       [13sp, muted]   │
│                                                          │
│  ────────────────────────────────────────────────────    │
│                                                          │
│  GOAL                                    [11sp, muted]  │
│  Squat 405 lbs                           [15sp, primary] │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░  72%                 [bar + 13sp]   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Chapter Name:** 24sp, primary weight. Wraps to maximum 2 lines. If chapter name exceeds 2 lines: truncates with ellipsis. (Rare — 60-character max on chapter names enforced at creation.)

**Status Line:** "Active · [N] days" — 13sp, muted. N = number of calendar days since chapter start (including the start day). Day of creation = "Active · Day 1." Days 2 onward = "Active · [N] days." No upper bound.

**Separator:** Full-width visual divider between chapter identity and goal block.

**Goal Label:** "GOAL" — 11sp, uppercase, muted, tracked. Marks the start of the goal block.

**Goal Name:** 15sp, primary weight. Wraps to maximum 2 lines. Truncates at line 3. (Rare — 100-char max.)

**Progress Bar:** Full-width within card content area, 6dp height. Filled portion in accent color. Percentage displayed at right end of bar: "[N]%" — 13sp, muted. 0% = empty bar. 100% = full bar. Both are valid, non-error display states.

### 5.2 Active Chapter State — Narrative Goal (No Target)

```
│  GOAL                                    [11sp, muted]  │
│  Train with my son                       [15sp, primary] │
│  In Progress                             [13sp, muted]  │
```

Progress bar and percentage are absent. "In Progress" replaces the bar. Narrative goals have no quantifiable progress — this is their correct and complete display state.

### 5.3 Active Chapter State — No Primary Goal

```
│  ────────────────────────────────────────────────────    │
│                                                          │
│  Add a primary goal →                    [13sp, muted]  │
```

"Add a primary goal →" is a muted tertiary text link appearing where the goal block would be. Tap → G-1 (Goal Hub, "Active Chapter, No Goals" empty state).

Language note: "Add a primary goal" — not "You haven't set a goal" or "Goal missing." Positive, inviting, forward-facing.

The lack of a goal is not visually flagged as incomplete or problematic. The chapter card is complete without a goal — the "Add a primary goal" link is an invitation, not an error indicator.

### 5.4 Active Chapter State — Achieved Goal

```
│  GOAL                                    [11sp, muted]  │
│  Squat 405 lbs              ✓ Achieved   [accent color] │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100%               [bar + 13sp]   │
```

Progress bar shows 100% in accent color. "✓ Achieved" label at 13sp in accent color. This state is informational — no action is presented. The athlete may continue their chapter after goal achievement; H-1 shows the result.

---

## Section 6 — Active Program Card (Tier 2)

Present only when an Active Program exists. Omitted entirely otherwise. No placeholder. No "no program" message.

```
┌──────────────────────────────────────────────────────────┐
│  Power Block — Cycle 1               Week 3 of 6        │
│  [16sp, primary weight]              [13sp, muted, right]│
│                                                          │
│  Next: Lower Body — Squat Focus      [14sp, muted]      │
│                                                          │
│  ▓▓▓▓▓▓░░░░░░░░  6 of 12 workouts   [bar + 13sp]      │
└──────────────────────────────────────────────────────────┘
```

**Program Name:** 16sp, primary weight. Left-aligned.

**Position:** Right-aligned at same line as program name — 13sp, muted. Format: "Week [X] of [Y]" if the program tracks by week. "Workout [X] of [Y]" if tracked by workout number. Omitted entirely if position cannot be determined.

**Next Workout:** "Next: [Workout Title]" — 14sp, muted. Shows the title of the next planned workout in the program sequence. Omitted entirely if the program does not define a structured next workout (freeform program). If the program defines a next workout but the title is empty: omit this line entirely.

**Progress Bar:** (Workouts completed / total program workouts). Text label: "[N] of [M] workouts" — 13sp, muted.

**Tap behavior:** Tap anywhere on program card → W-3 (Program Detail).

---

## Section 7 — Workout CTA (Tier 3)

The primary action on H-1. Always present. Never disabled. One button.

```
[         Continue Program          ]   ← Active Program exists | 52dp, full-width, primary

[           Start Workout           ]   ← No Active Program | 52dp, full-width, primary
```

**"Continue Program"**
- Condition: Active Program exists
- Destination: Loads the next program session and enters active workout logging (W-9 through W-16 flow)
- The program and next workout are pre-loaded from the Active Program Card context
- Label is always "Continue Program" — not "Continue [Program Name]" (program name belongs in the card above, not the button)

**"Start Workout"**
- Condition: No Active Program exists (or No Active Chapter state)
- Destination: W-8 (Activity Type Picker)
- Opens the general workout creation and logging flow

**Visual specification:**
- Width: Full usable content width (16dp horizontal margins from screen edges)
- Height: 52dp
- Style: Primary button — the most visually prominent button style in the design system
- Text: 17sp, medium weight, centered
- Top margin: 16dp from Program Card bottom (if program present) or 16dp from Chapter Card bottom (if no program)

**The CTA is never disabled.** Training is never gated by chapter state, program state, or any other condition.

---

## Section 8 — Recent Legacy Activity Module (Tier 4)

Present only when qualifying milestone events exist within the last 7 calendar days. Omitted entirely otherwise. No "no recent activity" message. Silence is correct.

### 8.1 Qualifying vs. Non-Qualifying Events

**Qualifying (shown):**
- Goal Achieved
- Honor Earned
- Program Graduated

**Not qualifying (not shown):**
- Workout logged — too frequent; would appear every session
- Goal progress updated — not a milestone; noise, not signal
- Chapter sealed — athlete is in No Active Chapter state; event is implicit
- Rank advanced — not shown on H-1 in MVP (see Decision 9)

### 8.2 Section Layout

```
Recent                                      View All →
────────────────────────────────────────────────────────
✓   Goal achieved — Squat 405 lbs               Today
🏅  Honor earned — Press 225 lbs           2 days ago
🎓  Power Block — Cycle 1 graduated         5 days ago
```

**Section header:** "Recent" — 13sp, uppercase, muted. Right: "View All →" — tertiary text link → L-1 (Legacy Hub).

**Separator:** Full-width horizontal rule below header.

**Each event row:**
- Left: Event icon (see Section 8.3)
- Center: Event description — 15sp, primary weight, single line, truncates with ellipsis
- Right: Time ago — 13sp, muted, right-aligned
- Entire row is tappable → event-specific destination (see Section 8.4)
- Row height: minimum 48dp tap target

**Maximum 3 events displayed.** Most recent events first. If more than 3 qualifying events exist within 7 days: show the 3 most recent only. "View All →" provides access to the rest.

### 8.3 Event Display Format

| Event | Icon | Display Text |
|-------|------|-------------|
| Goal Achieved | ✓ | "Goal achieved — [Goal Name]" |
| Honor Earned | 🏅 | "Honor earned — [Honor Name]" |
| Program Graduated | 🎓 | "[Program Name] graduated" |

### 8.4 Time-Ago Formatting

| Age | Display |
|-----|---------|
| Same calendar day | "Today" |
| 1 day ago | "Yesterday" |
| 2–6 days ago | "[N] days ago" |
| 7 days ago | "1 week ago" (boundary — shown at 7 days, not beyond) |
| Older than 7 days | Not shown |

### 8.5 Event Tap Destinations

| Event | Destination |
|-------|------------|
| Goal Achieved | G-2 (Goal Detail for that goal) |
| Honor Earned | L-1 (Legacy Hub) — honor detail destination TBD in L-12 spec |
| Program Graduated | W-3 (Program Detail, Graduated state) |

---

## Section 9 — Squad Module (Tier 5)

Present only when athlete belongs to at least one squad. Omitted entirely when no squad membership. No "join a squad" prompt. Silence is correct.

### 9.1 Single Squad State

```
────────────────────────────────────────────────────────
Iron Society  ·  4 members                           →
```

**Squad name:** 15sp, primary weight.
**Member count:** 13sp, muted — " · [N] members"
**Right arrow:** →, indicates navigation
**Entire row tappable:** → S-2 (Squad Detail for this squad)
**Row height:** 48dp minimum

### 9.2 Multiple Squads State (2+ Squads)

```
────────────────────────────────────────────────────────
Iron Society  ·  4 members                           →
Squads (2)  ·  View all →                 [text link]
```

**First row:** Most recently active squad — same spec as 9.1.
**Second row:** "Squads ([N]) · View all →" — 13sp, muted. "View all →" is a tertiary text link. Navigates to S-1 (Squads Hub). Row height: 44dp minimum.

### 9.3 Squad Card Does Not Surface

- Member activity or workout data
- "@username trained today" or equivalent
- Member avatars or photos
- Comparative metrics between squad members
- Any content from inside the squad's activity history

The card says: "You have accountability partners and they are named [Squad Name]." The details of accountability happen inside S-2.

---

## Section 10 — No Active Chapter State

When no Active Chapter exists, the Chapter Card is replaced by the Chapter Invitation Card. All other tiers follow their normal rules (Program Card: absent; Workout CTA: "Start Workout"; Recent Legacy: present if applicable; Squad: present if applicable).

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  Forge Legacy                              [●]          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │  Your training builds your legacy.             │   │
│  │  [17sp, primary weight]                          │   │
│  │                                                  │   │
│  │  Start a chapter to give it a name.            │   │
│  │  [15sp, muted]                                   │   │
│  │                                                  │   │
│  │  [       Create Chapter       ]                 │   │
│  │                    ← primary button, full card width │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [           Start Workout           ]                 │  ← Always present
│                                                         │
│  [Squad Card — if in squads]                           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Home  ·  Workouts  ·  Legacy  ·  Squads  ·  Profile   │
└─────────────────────────────────────────────────────────┘
```

**Invitation Card:**
- Headline: "Your training builds your legacy." — 17sp, primary weight
- Sub-copy: "Start a chapter to give it a name." — 15sp, muted
- CTA: "Create Chapter" — full-width within card, primary button, 44dp height
- Tap → L-5 (Post-Onboarding Chapter Creation)

**Emotional tone:** Warm aspiration. Not failure. Not incompleteness. The athlete is ready and their chapter awaits. The copy is forward-looking: "your training builds your legacy" is a statement about what is already happening, not what is missing.

**"Start Workout" CTA:** Present below the Invitation Card. Same spec as Tier 3. Training is never gated by chapter existence.

**Program Card:** Always absent in No Active Chapter state (no Active Chapter = no Active Program).

**Recent Legacy Activity:** May be present. An athlete who sealed a prior chapter and has not started a new one may have recent legacy milestones from the sealing or from the prior chapter. Section follows its normal rules.

**Squad Card:** May be present. Squad membership persists across chapter state. Section follows its normal rules.

---

## Section 11 — Per-Tier Empty States

### 11.1 No Primary Goal (within Chapter Card)

Appears within the Active Chapter Card in place of the goal block:

```
Add a primary goal →             [13sp, muted, tertiary link, right-facing arrow]
```

- Tap → G-1 (Goal Hub, "Active Chapter, No Goals" state)
- Not an error indicator — a contextual, calm invitation
- The Chapter Card remains fully functional and visually complete without a goal

### 11.2 No Active Program (Tier 2)

Section entirely absent. No text. No icon. No placeholder. The Workout CTA immediately follows the Chapter Card with a 16dp top margin.

### 11.3 No Recent Legacy Activity (Tier 4)

Section entirely absent. No "Nothing recent to show." No "Your legacy activity will appear here." Silence is the correct response.

### 11.4 No Squad Membership (Tier 5)

Section entirely absent. No "Join a squad" prompt. No "Connect with others." No social invitation. The athlete will encounter squads naturally through S-1 when they choose to explore.

### 11.5 Day 1 State (Post-O-3, New Athlete)

The most minimal valid H-1 configuration:
- Chapter Card (with goal or "Add a primary goal →")
- "Start Workout" CTA

Nothing else. No program. No recent activity. No squad. This is a valid, intentional, correctly-functioning H-1 state. It is not broken, sparse, or incomplete — it is focused. The athlete has declared their chapter and now the question is simple: "Start Workout."

---

## Section 12 — Navigation

### 12.1 H-1 Entry Points

| Entry Point | How Athlete Arrives |
|-------------|---------------------|
| App launch | Home is default tab |
| O-3 completion | Navigates to H-1 from O-3b with toast |
| Tab bar — Home | From any other tab or screen |
| Workout session end | May return to H-1 (TBD in W-16/W-17 spec) |

### 12.2 Outbound Navigation from H-1

| Tappable Element | Destination |
|-----------------|------------|
| Chapter Card — chapter identity area (name + status) | L-3 (Active Chapter Detail) |
| Chapter Card — goal block area (GOAL label + name + progress bar) | G-1 (Goal Hub) |
| "Add a primary goal →" link | G-1 (Goal Hub — No Goals state) |
| Active Program Card (full card) | W-3 (Program Detail) |
| "Continue Program" CTA | Active workout logging (W-9 through W-16 flow) |
| "Start Workout" CTA | W-8 (Activity Type Picker) |
| Recent Activity event row | Event-specific (see Section 8.5) |
| "View All →" in Recent Activity | L-1 (Legacy Hub) |
| Squad Card row | S-2 (Squad Detail — most recently active squad) |
| "Squads ([N]) · View all →" | S-1 (Squads Hub) |
| "Create Chapter" (Invitation Card) | L-5 (Post-Onboarding Chapter Creation) |
| Avatar (App Bar) | P-1 (Profile) |
| Tab bar | H-1, W-1, L-1, S-1, P-1 |

### 12.3 Tab Bar

H-1 is Tab 1. Standard persistent bottom navigation, visible on H-1.

| Tab | Screen |
|-----|--------|
| 1 — Home | H-1 |
| 2 — Workouts | W-1 (Workouts Hub) |
| 3 — Legacy | L-1 (Legacy Hub) |
| 4 — Squads | S-1 (Squads Hub) |
| 5 — Profile | P-1 (Profile) |

### 12.4 What H-1 Does Not Navigate To Directly

- G-2 (Goal Detail) — reached via G-1 or L-3
- W-2 (Program Browse) — reached via W-1
- L-3 (Chapter Detail) except via Chapter Card tap
- Any onboarding screen — onboarding is complete by the time H-1 is shown
- Settings — accessed via P-1

---

## Section 13 — Mobile UX

### 13.1 Screen Type

H-1 is a standard scrollable screen in the main tab navigation shell. Not a modal. Not a full-screen takeover. Standard behavior: App Bar fixed top, Tab Bar fixed bottom, content scrolls between.

### 13.2 Scroll Behavior

In the standard state (Active Chapter + Active Program + Workout CTA): content fits within a single screen without scrolling. Chapter Card, Program Card, and CTA are all above the fold. This is the intended experience — the primary content requires no scroll.

When Recent Legacy Activity and Squad Card are present: light scrolling required to see lower tiers. Acceptable — primary content (chapter + program + CTA) is always above the fold.

When H-1 is opened and the athlete has not scrolled: they see the Chapter Card (or Invitation Card), the Program Card if present, and the Workout CTA. No content is hidden that is required to answer "What should I focus on today?"

### 13.3 Spacing and Margins

| Element | Spec |
|---------|------|
| Horizontal margin (all content) | 16dp from screen edges |
| Card corner radius | 8dp (or design system standard) |
| Vertical gap between cards | 12dp |
| Gap between CTA and card above | 16dp |
| Section separator (Recent, Squad) | Full-width rule, 1dp, secondary color |

### 13.4 Tap Targets

| Element | Minimum Tap Target |
|---------|------------------|
| Chapter Card | Full card width × full card height |
| "Add a primary goal →" link | 44dp height touch area |
| Program Card | Full card width × full card height |
| Workout CTA | Full content width × 52dp |
| "Create Chapter" in Invitation | Full card content width × 44dp |
| Avatar (App Bar) | 44×44dp |
| Recent Activity row | Full width × 48dp |
| "View All →" link | 44dp touch area minimum |
| Squad Card row | Full width × 48dp |
| "View all →" (multi-squad) | 44dp touch area minimum |

### 13.5 Portrait Orientation

H-1 is portrait only in MVP.

### 13.6 Progress Bar Display

Progress bars (Chapter Card goal, Program Card) are consistent across all percentage values:
- 0%: Empty bar. Not an error. Not hidden.
- 100%: Full bar. Accent color.
- Any intermediate: Proportional fill, accent color.

Progress bar does not animate on H-1 load (static display). Animation on the update event may be added in a future version.

---

## Section 14 — Post-State Behavior

### 14.1 Immediately After O-3 Completion

The athlete navigates from O-3b "Done" or "Skip for now" to H-1.

**Toast:** "[Chapter Name] has started." — appears at the bottom of the screen above the tab bar. Auto-dismisses after 3 seconds. Non-tappable.

**H-1 state:**
- Chapter Card: chapter name + goal (if set in O-3b) or "Add a primary goal →"
- Program Card: absent (new athlete)
- Workout CTA: "Start Workout"
- Recent Legacy: absent
- Squad: absent

This is the correct Day 1 state. It is not empty — it is focused. The athlete has named their chapter and now the question is simply: "Start Workout?"

### 14.2 After Goal Achievement

When an athlete marks a goal as Achieved in G-2:
- Chapter Card: updates to Achieved state (Section 5.4) on next H-1 load
- Recent Legacy Activity: "✓ [Goal Name] achieved" appears if within 7 days
- No modal, no overlay, no celebration screen on H-1

The achievement moment belongs to G-2. H-1 shows the result.

### 14.3 After Program Graduation

When a program Graduates (all workouts complete or manually graduated in W-3):
- Program Card: absent on next H-1 load (program is no longer Active)
- Workout CTA: switches to "Start Workout"
- Recent Legacy Activity: "🎓 [Program Name] graduated" appears if within 7 days
- No modal on H-1

The graduation moment belongs to its own screen. H-1 shows the result and moves forward.

### 14.4 After Chapter Sealing

After the athlete seals a chapter (L-3/L-6 flow):
- H-1 shows No Active Chapter state (Section 10)
- Invitation Card: "Your training builds your legacy. Start a chapter to give it a name."
- "Start Workout" CTA remains
- The sealing event is not shown in Recent Legacy Activity on H-1 (athlete is already in the No Active Chapter state — the transition is the result)

### 14.5 After Rank Advancement

No H-1 change. Rank is on P-1. If a rank advancement notification is added in MVP, it would require a v1.1 amendment.

---

## Section 15 — Accessibility

**App Bar:**
- Wordmark: `accessibilityLabel` = "Forge Legacy, Home"
- Avatar: `accessibilityLabel` = "[Athlete Display Name], Profile"

**Chapter Card (Quantifiable Goal):**
- `accessibilityLabel` = "[Chapter Name]. Active, [N] days. Goal: [Goal Name], [percentage]% complete. Double-tap to view chapter."

**Chapter Card (Narrative Goal):**
- `accessibilityLabel` = "[Chapter Name]. Active, [N] days. Goal: [Goal Name], in progress. Double-tap to view chapter."

**Chapter Card (No Goal):**
- `accessibilityLabel` = "[Chapter Name]. Active, [N] days. No primary goal set. Double-tap to view chapter."
- "Add a primary goal →": `accessibilityLabel` = "Add a primary goal"

**Chapter Card (Achieved Goal):**
- `accessibilityLabel` = "[Chapter Name]. Active, [N] days. Goal: [Goal Name], achieved. Double-tap to view chapter."

**Active Program Card:**
- `accessibilityLabel` = "[Program Name]. Week [X] of [Y]. Next: [Workout Name]. [N] of [M] workouts complete. Double-tap to view program."
- If next workout not defined: omit "Next: [Workout Name]" from label.

**Workout CTA:**
- "Continue Program": `accessibilityRole` = "button", `accessibilityLabel` = "Continue program"
- "Start Workout": `accessibilityRole` = "button", `accessibilityLabel` = "Start workout"

**Recent Legacy Activity section:**
- Section announced: "Recent legacy activity"
- Each row: `accessibilityLabel` = "[Event description], [time ago]"
- "View All →": `accessibilityLabel` = "View all legacy activity"

**Squad Card:**
- `accessibilityLabel` = "[Squad Name], [N] members. Double-tap to view squad."
- "View all →" (multi-squad): `accessibilityLabel` = "View all [N] squads"

**Progress Bars:**
- All progress bars: `accessibilityValue` = { min: 0, max: 100, now: [percentage] }
- `accessibilityLabel` = appropriate context (e.g., "Goal progress: 72%", "Program progress: 6 of 12 workouts")

**Chapter Invitation Card:**
- Invitation text: `accessibilityLabel` = "Your training builds your legacy. Start a chapter to give it a name."
- "Create Chapter" button: standard button accessibility

---

## Section 16 — Edge Cases

### 16.1 Very Long Chapter Name (Near 60-Character Limit)

Chapter names up to 60 characters are enforced at creation. Long names wrap to 2 lines in the Chapter Card and display fully. "Rebuilding My Foundation After the Injury" (42 chars) shows on 2 lines without truncation. Chapter Card height grows to accommodate — this is expected.

### 16.2 Chapter Active for a Very Long Time

"Active · 312 days" is a valid display. An athlete who has been in the same chapter for nearly a year sees a large number. This number is earned — do not suppress or abbreviate it. No upper limit is enforced.

### 16.3 Goal at Exactly 0%

Progress bar renders as completely empty (empty bar, "0%"). This is the correct display state for a new goal with no progress logged. It is not hidden, disabled, or shown as a warning.

### 16.4 Goal at Exactly 100% (Not Marked Achieved)

Possible if progress tracking reaches 100% but the athlete has not used "Mark as Achieved" in G-2. Display: progress bar full, "100%". The "✓ Achieved" label does NOT appear until the goal is formally marked Achieved. This distinction matters: 100% progress and Achieved state are not the same.

### 16.5 Athlete Has No Profile Photo

Avatar in App Bar shows initials avatar (consistent with O-1/P-1 pattern). Initials are always derivable — no generic silhouette fallback.

### 16.6 Network Failure on H-1 Load

H-1 renders from cached data when available. If cached data exists from a prior successful load: display it. If no cached data: show a minimal loading state for in-flight data. Do not replace the entire screen with an error. The athlete can still interact with whatever is available.

### 16.7 Program Has No Defined Next Workout

The "Next: [Workout Name]" line in the Program Card is omitted. The card shows program name, position, and progress bar. This is the correct display — not an error, not an empty label.

### 16.8 Recent Legacy Activity Has Exactly 3 Events, All Qualifying

Shows all 3. "View All →" still appears (there may be older events in L-1, and the link provides a consistent navigation affordance regardless of whether there are additional events).

### 16.9 Athlete in 2 Squads (Free Tier Limit) — Both Recently Active

Shows the more recently active squad in the Squad Card. Shows "Squads (2) · View all →" secondary line. The athlete taps "View all →" to access the other squad from S-1.

### 16.10 Recent Legacy Activity Event Destination Not Yet Specced

For Honor Earned events, the honor detail destination (L-12 spec) is pending. Tap navigates to L-1 (Legacy Hub) as a temporary destination until L-12 is specced and L-12 navigation is added to H-1. This must be updated when L-12 ships.

### 16.11 Athlete Navigates to H-1 From Mid-Session

If the athlete taps the Home tab mid-workout or mid-flow, they return to H-1 in its current state. No special behavior. The active workout session (if any) is handled by the workout logging stack, not H-1.

### 16.12 Athlete Opens App Within 3 Seconds of O-3 Toast Dismissal

Toast auto-dismisses after 3 seconds. If the athlete immediately switches apps and returns within 3 seconds: toast behavior on re-entry is not specced and is an engineering decision. The Chapter Card is the permanent confirmation — the toast is a momentary signal.

---

## Section 17 — Architecture Risks

### Risk 1 — H-1 and W-1 Workout CTA Redundancy

**Issue:** Both H-1 and W-1 (Workouts Hub) surface a "Start Workout" CTA. An athlete can initiate a workout from either screen.

**Assessment:** This redundancy is intentional and correct. H-1's CTA is a direct path to the most common action without requiring navigation to W-1. W-1 serves athletes who want to browse programs, review history, or explore workout options — not just start immediately. The two CTAs serve different contexts, not duplicate the same action. No spec change required.

**Risk level:** Low. Intentional design.

---

### Risk 2 — Program Card "Next Workout" Data

**Issue:** The Program Card shows "Next: [Workout Name]." Programs that are freeform or without defined sequences cannot provide this data.

**Assessment:** Conditional display per Section 6. If next workout title is unavailable: line is omitted. The card remains complete. No special state required. Engineering must handle the conditional display of this line.

**Risk level:** Low. Conditional display.

---

### Risk 3 — H-1 After Program Graduation: Context Change

**Issue:** An athlete opens H-1 after graduating a program. The Program Card is gone and the CTA changed from "Continue Program" to "Start Workout." The athlete's familiar context has shifted without a visible explanation.

**Assessment:** Addressed by Recent Legacy Activity: "🎓 [Program Name] graduated" will appear within the 7-day window. This provides context for the change. If the graduation happened more than 7 days before the athlete opens H-1, the context change is expected and not jarring — the athlete was aware of the graduation event at the time. No additional H-1 change required.

**Risk level:** Medium. Covered by Recent Legacy Activity.

---

### Risk 4 — L-5 (Post-Onboarding Chapter Creation) Not Yet Specced

**Issue:** The No Active Chapter state's "Create Chapter" CTA navigates to L-5, which is not yet specced (Phase 2C priority).

**Assessment:** H-1 spec is complete and correct; L-5 is the implementation dependency. H-1 cannot be fully implemented without L-5. Engineering will need either: (a) wait for the L-5 spec, or (b) use a simplified chapter creation form as a temporary implementation that is replaced when L-5 ships.

**Risk level:** High. H-1 "Create Chapter" flow blocked by L-5 absence.

---

### Risk 5 — W-8 (Activity Type Picker) Not Yet Specced

**Issue:** "Start Workout" CTA navigates to W-8, which is not yet specced (Phase 2C priority, per architecture backlog).

**Assessment:** Same as Risk 4. "Start Workout" functionality is blocked by W-8 absence. H-1 spec is complete; the dependency is external.

**Risk level:** High. "Start Workout" flow blocked by W-8 absence.

---

### Risk 6 — Chapter Card Progress Bar: Misaligned with G-2 Progress Source

**Issue:** The Chapter Card shows goal progress as a percentage. This percentage value is retrieved from the goal record. With the Hybrid Progress Model (Critical Decisions Amendment 001), progress may be updated manually OR automatically. H-1 simply renders whatever value is stored.

**Assessment:** H-1 is display-only for progress — it does not participate in progress calculation or update. This is correct per Critical Decisions Amendment 001: "G-1 is display-only for progress. For G-1, the progress bar renders whatever the current progress value is, regardless of how it was set." The same principle applies to H-1. No spec change required.

**Risk level:** Low. H-1 renders stored value only.

---

## Section 18 — Validation Checklist

### Purpose and Character
- [ ] H-1 is a Daily Focus Surface — not a dashboard or feed
- [ ] Standard state: primary content visible above the fold without scrolling
- [ ] Screen answers "What should I focus on today?" directly
- [ ] No statistics, streak counts, comparison data, or other athletes' activity anywhere
- [ ] Screen feels grounded, personal, and focused — not busy or social

### Information Hierarchy
- [ ] Content tiers appear in order: Chapter Card → Program Card → Workout CTA → Recent Activity → Squad
- [ ] Each tier present only when its data applies — omitted when not
- [ ] Absent tiers: no placeholder, no empty-state text, no prompts

### App Bar
- [ ] Left: "Forge Legacy" wordmark, 17sp, primary weight
- [ ] Right: Athlete avatar, 36dp circular, navigates to P-1
- [ ] No search, no notification bell, no hamburger, no additional icons

### Chapter Card (Tier 1)
- [ ] Chapter name: 24sp, primary weight, wraps to max 2 lines
- [ ] Status: "Active · [N] days" or "Active · Day 1" — 13sp, muted
- [ ] Quantifiable goal: name + progress bar + percentage
- [ ] Narrative goal: name + "In Progress" (no bar)
- [ ] Achieved goal: name + "✓ Achieved" + 100% bar in accent color
- [ ] No goal: "Add a primary goal →" tertiary link
- [ ] Chapter identity area (name + status) tap → L-3
- [ ] Goal block area (GOAL label + name + progress) independently tappable → G-1
- [ ] "Add a primary goal →" tap → G-1
- [ ] Two distinct tap zones in card — goal block and identity area are separate tap targets

### Active Program Card (Tier 2)
- [ ] Entirely absent when no Active Program — no placeholder
- [ ] Program name: 16sp, primary weight
- [ ] Position: "Week [X] of [Y]" or "Workout [X] of [Y]", right-aligned, 13sp muted
- [ ] "Next: [Workout Name]" — 14sp muted — omitted if not defined
- [ ] Progress bar: workouts complete / total, with text count
- [ ] Full card tap → W-3

### Workout CTA (Tier 3)
- [ ] Always present — never absent, never disabled
- [ ] Active Program: "Continue Program" → workout logging (W-9+)
- [ ] No Active Program: "Start Workout" → W-8
- [ ] Full content width, 52dp height, primary button style
- [ ] One button only — not two

### Recent Legacy Activity (Tier 4)
- [ ] Entirely absent when no qualifying events in last 7 days — no placeholder
- [ ] Qualifying events: Goal Achieved, Honor Earned, Program Graduated ONLY
- [ ] Workout logs and goal progress updates NOT shown
- [ ] Maximum 3 events, most recent first
- [ ] "View All →" → L-1
- [ ] Event rows: icon + description + time-ago; tappable
- [ ] Time-ago formats: Today / Yesterday / [N] days ago / 1 week ago

### Squad Module (Tier 5)
- [ ] Entirely absent when no squad membership — no placeholder
- [ ] Single squad: name + member count + tap → S-2
- [ ] Multiple squads: most recently active squad shown; "Squads ([N]) · View all →" → S-1
- [ ] No activity feed, no member names, no member activity
- [ ] No "join a squad" prompt in empty state

### No Active Chapter State
- [ ] Invitation Card replaces Chapter Card
- [ ] Invitation: "Your training builds your legacy. Start a chapter to give it a name."
- [ ] "Create Chapter" → L-5
- [ ] "Start Workout" CTA remains present below Invitation Card
- [ ] Tone: warm aspiration — not failure, not incompleteness
- [ ] Program Card: absent in No Active Chapter state

### Per-Tier Empty States
- [ ] No goal: "Add a primary goal →" link within Chapter Card — not an error state
- [ ] No program: Tier 2 absent — no text
- [ ] No recent activity: Tier 4 absent — no text
- [ ] No squad: Tier 5 absent — no text
- [ ] Day 1 state (Chapter + CTA only): valid, intentional, correctly-functioning state

### Navigation
- [ ] Chapter Card identity area (name + status) → L-3
- [ ] Chapter Card goal block (GOAL label + name + progress) → G-1
- [ ] Program Card → W-3
- [ ] "Continue Program" → workout logging (W-9+)
- [ ] "Start Workout" → W-8
- [ ] "Add a primary goal →" → G-1
- [ ] "View All →" in Recent Activity → L-1
- [ ] Squad Card → S-2
- [ ] "Squads ([N]) · View all →" → S-1
- [ ] "Create Chapter" → L-5
- [ ] Avatar → P-1
- [ ] Tab bar: 5 tabs, Home selected

### Post-State Behavior
- [ ] O-3 completion: toast "[Chapter Name] has started." (3s auto-dismiss, non-tappable)
- [ ] Goal Achieved: Chapter Card shows Achieved state; Recent Activity shows event within 7 days
- [ ] Program Graduated: Program Card absent; CTA → "Start Workout"; Recent Activity shows event
- [ ] Chapter Sealed: H-1 shows No Active Chapter state

### Rank
- [ ] Rank does NOT appear anywhere on H-1 in MVP

### Mobile UX
- [ ] Scrollable standard screen — fixed App Bar top, fixed Tab Bar bottom
- [ ] All content: 16dp horizontal margins
- [ ] Card corner radius: 8dp or design system standard
- [ ] Vertical card spacing: 12dp
- [ ] All tap targets: ≥ 44dp
- [ ] Portrait only in MVP

### Accessibility
- [ ] Chapter Card: full label with name, duration, goal, percentage
- [ ] Program Card: full label with name, position, next, count
- [ ] Workout CTA: contextual label
- [ ] All progress bars: accessibilityValue with min/max/now

---

## Section 19 — Downstream Dependencies

| Dependency | What H-1 Requires | Priority |
|------------|------------------|----------|
| L-3 (Chapter Detail) | Chapter Card tap-through | High — L-3 locked |
| W-3 (Program Detail) | Program Card tap-through | High — W-3 locked |
| W-8 (Activity Type Picker) | "Start Workout" CTA destination | High — W-8 not yet specced (Phase 2C) |
| W-9–W-16 (Active Workout Logging) | "Continue Program" CTA destination | High — W-9-W-16 locked |
| G-1 (Goal Hub) | "Add a primary goal →" destination | Medium — G-1 locked |
| L-1 (Legacy Hub) | "View All →" in Recent Activity | Medium — L-1 not fully specced |
| L-5 (Post-Onboarding Chapter Creation) | "Create Chapter" CTA destination | High — L-5 not yet specced (Phase 2C) |
| S-2 (Squad Detail) | Squad Card tap-through | Medium — S-2 locked |
| P-1 (Profile) | Avatar tap-through | Low — P-1 locked |
| L-12 (Honor Detail) | Recent Activity honor event destination | Low — L-12 not yet specced |

**Critical path:** H-1 cannot be fully shipped without L-5 (Create Chapter flow) and W-8 (Start Workout flow). Both are Phase 2C priorities.

---

## Change Log

### v1.0 — June 2026

Initial specification. H-1 established as a Daily Focus Surface — the athlete's daily orientation screen, not a dashboard or activity feed. Twelve architecture decisions resolved: H-1 purpose (Daily Focus Surface); five-tier information hierarchy (Chapter, Program, Workout CTA, Recent Legacy Activity, Squad) with section omission for absent tiers; Active Chapter is the hero (full-width Chapter Card); Primary Goal is within the Chapter Card, not an independent module; Active Program is a separate card below the Chapter Card; Workout CTA is a single contextual button ("Continue Program" or "Start Workout") always present and never disabled; No Active Chapter state shows warm invitation card with training still accessible; Squad presence is a single card with no activity feed, omitted when no squad membership; Rank absent from H-1 in MVP; Recent Legacy Activity shows Goal Achieved, Honor Earned, and Program Graduated events only, within a 7-day window, max 3 items; all empty tiers are omitted without messaging; post-completion states appear in Recent Legacy Activity without H-1 modals (exception: O-3 completion uses a toast). Critical Phase 2C dependencies identified: L-5 (Post-Onboarding Chapter Creation) and W-8 (Activity Type Picker). Emotional outcome: Grounded.

### v1.1 — June 2026

**H-1-A1:** Goal area in Chapter Card independently tappable → G-1. The Chapter Card now has two distinct tap zones: (1) the goal block (GOAL label + goal name + progress bar) → G-1 (Goal Hub), providing a direct path to goal management from H-1; (2) the chapter identity area (name + status line) and card background → L-3 (Active Chapter Detail), unchanged. "Add a primary goal →" link → G-1 unchanged. Navigation matrix (§12.2), validation checklist (§18), and tap behavior description (§5) updated.

---

*Forge Legacy Home Screen Wireframe Specification — H-1*
*v1.1 — June 2026*
*Authority: Master PRD Section 5 (MVP), Product DNA, O-3 v1.0, G-1 v1.1, W-1 v1.0, W-3 v1.0, S-1 v1.2, P-1 v1.0, Critical Decisions Amendment 001*
