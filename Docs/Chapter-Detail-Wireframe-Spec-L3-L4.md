# Forge Legacy — Chapter Detail Wireframe Specification
## L-3 (Active) / L-4 (Archived) | Phase 2B | Version 1.0 — June 2026

---

## Preamble: Two States, One Screen Identity

The Chapter Detail screen exists in two distinct states that share the same structural DNA but communicate fundamentally different emotional registers:

**L-3 — Active Chapter:** The athlete is inside this chapter. It is being written. Goals are in progress. Programs are running. The screen communicates momentum, purpose, and forward direction.
> "I am building this."

**L-4 — Archived Chapter:** The chapter is sealed. Its outcomes are locked. Its record is permanent. The screen communicates completeness, pride, and historical weight.
> "I built this."

The difference between these two states must be immediately legible — through information hierarchy, visual treatment, interaction rules, and language — without the athlete needing to read a status label to understand which state they are in. This distinction is the screen's most important design responsibility.

The governing principle across both states: **"Memories can be added. History cannot be rewritten."**

This principle is not a disclaimer. It is a product commitment made visible. Every interaction rule on this screen flows from it.

---

## Section 1 — Chapter Detail Goals

The Chapter Detail screen (L-3/L-4) answers one question: **"What is this chapter about?"**

It helps the athlete understand five things, in order of importance:

1. **Why this chapter exists** — its name, its declared purpose, its primary goal
2. **What they are working toward** — the primary goal and how close they are
3. **What has happened so far** — programs enrolled, workouts logged, honors earned
4. **What was accomplished** — outcomes (sealed in archived state; in-progress in active state)
5. **What will be preserved forever** — photos, reflections, memories, and the complete record

**What this screen must never become:**
- A workout history page. Individual workout details belong in W-18 and W-19.
- An analytics dashboard. There are no charts, trend lines, or comparative metrics.
- A statistics page. Workout counts are context, not the content.

**CTA posture for L-3/L-4:**
Like L-1, this is primarily a discovery and reflection screen. There is no Primary CTA in the H-1 sense. The active chapter's significant action — "Seal Chapter" — is Ceremonial class: distinct, grave, intentional, and positioned at the bottom requiring deliberate scroll. The archived chapter's available action — "Add a Memory" — is Secondary class. Both screens are organized around reading and navigating, not action.

---

## Section 2 — Active Chapter Information Hierarchy

**TIER 1 — Primary (one element)**
Chapter Header
- The chapter's name and identity
- The immediate answer to "what chapter am I in?"
- Full-width, story-first treatment
- Contains: chapter name, start date, Active status indicator

**TIER 2 — Supporting (the chapter's purpose and progress)**
- Primary Goal Section *(why this chapter exists)*
- Secondary Goals Section *(how the athlete is pursuing it)*
- Programs Section *(structured path through the chapter)*
- Progress Section *(the raw engine: workout count)*

**TIER 3 — Archive Layer (what the chapter has accumulated)**
- Honors Section *(recognition earned so far)*
- Photos Section *(visual memory of the chapter)*
- Chapter Notes Section *(athlete's voice: notes added while active)*
- Timeline Section *(chapter-level milestone entries)*

**TIER 4 — Lifecycle Action (deliberate, bottom-positioned)**
- Seal Chapter CTA *(ceremonial, requires intent to reach)*

**Navigation elements (persistent):**
- Top bar: back navigation + chapter actions (edit chapter name, edit primary goal)
- No bottom tab bar while inside a chapter detail — standard tab navigation remains

---

## Section 3 — Archived Chapter Information Hierarchy

**TIER 1 — Primary (one element)**
Chapter Header (Archived)
- Same structural position as active, different emotional register
- "Sealed on [Date]" mark replaces the "Active" indicator
- Date range: "[Start Date] – [End Date]" replaces "Started [Date]"

**TIER 2 — Outcomes Layer (the locked record — permanent and proud)**
- Outcomes Summary *(the chapter's final state: goal achieved, programs completed, workout total)*
- Primary Goal Outcome *(achieved or not — locked)*
- Secondary Goals Outcomes *(each goal's final outcome — locked)*

**TIER 3 — Programs Layer**
- Programs Section *(graduation status — locked)*

**TIER 4 — Recognition and Memory Layer**
- Honors Section *(all honors earned — locked)*
- Original Reflection *(from L-6 Chapter Reflection — locked)*
- Memories Section *(post-archive additions — visually distinct from original content)*
- Photos Section *(all chapter photos including memories)*

**TIER 5 — Lifecycle Action (available, understated)**
- Add a Memory CTA *(Secondary class, persistently available)*

**Key hierarchy distinction from active:**
The Outcomes Layer (Tier 2) does not exist in the active state. It emerges only at archival. In the active chapter, progress is dynamic. In the archived chapter, outcomes are crystallized. The emergence of the Outcomes Layer is the primary visual signal that a chapter has transitioned to its permanent state.

---

## Section 4 — Full Scroll Order (Active Chapter — L-3)

```
┌────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                             │  [fixed]
├────────────────────────────────────────────────┤
│  TOP APP BAR (Active)                          │  [fixed]
│  ← Back          [Chapter Name]    [Edit ···]  │
├────────────────────────────────────────────────┤
│                                                │
│  CHAPTER HEADER  [Tier 1 — full-width]         │  [scroll item 1]
│  Full-bleed card, ~200–240dp tall              │
│                                                │
├──── 16dp margin ───────────────────────────────┤
│  PRIMARY GOAL SECTION  [Tier 2]                │  [scroll item 2]
│  Goal name + progress bar + % + metric         │
├────────────────────────────────────────────────┤
│  SECONDARY GOALS SECTION  [Tier 2]             │  [scroll item 3]
│  Conditional: only if secondary goals exist    │
├────────────────────────────────────────────────┤
│  PROGRAMS SECTION  [Tier 2]                    │  [scroll item 4]
│  Conditional: only if enrolled in programs     │
├────────────────────────────────────────────────┤
│  PROGRESS SECTION  [Tier 2]                    │  [scroll item 5]
│  Workout count + chapter age                   │
├────────────────────────────────────────────────┤
│  HONORS SECTION  [Tier 3]                      │  [scroll item 6]
│  Honors earned so far in this chapter          │
├────────────────────────────────────────────────┤
│  PHOTOS SECTION  [Tier 3]                      │  [scroll item 7]
│  Chapter photos strip + "Add Photo" secondary  │
├────────────────────────────────────────────────┤
│  CHAPTER NOTES SECTION  [Tier 3]               │  [scroll item 8]
│  Active-chapter notes (feeds into L-6)         │
├────────────────────────────────────────────────┤
│  TIMELINE SECTION  [Tier 3]                    │  [scroll item 9]
│  Milestone entries within this chapter         │
├────────────────────────────────────────────────┤
│  COMPLETE CHAPTER  [Ceremonial CTA]            │  [scroll item 10]
│  Positioned at bottom — requires intent        │
├────────────────────────────────────────────────┤
│  BOTTOM SAFE AREA PADDING                      │
└────────────────────────────────────────────────┘
```

**Above the fold:** Chapter Header fully visible. Top of Primary Goal section visible below it, inviting scroll.

---

## Section 5 — Full Scroll Order (Archived Chapter — L-4)

```
┌────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                             │  [fixed]
├────────────────────────────────────────────────┤
│  TOP APP BAR (Archived)                        │  [fixed]
│  ← Back          [Chapter Name]    [Share ···] │
├────────────────────────────────────────────────┤
│                                                │
│  CHAPTER HEADER (Archived)  [Tier 1]           │  [scroll item 1]
│  Full-bleed, "Sealed on [Date]" mark visible   │
│                                                │
├──── 16dp margin ───────────────────────────────┤
│  OUTCOMES SUMMARY  [Tier 2]                    │  [scroll item 2]
│  Primary goal outcome + workout total + honors │
├────────────────────────────────────────────────┤
│  PRIMARY GOAL OUTCOME  [Tier 2]                │  [scroll item 3]
│  Locked. Achieved / Not Achieved.              │
├────────────────────────────────────────────────┤
│  SECONDARY GOALS OUTCOMES  [Tier 2]            │  [scroll item 4]
│  Conditional: only if secondary goals existed  │
├────────────────────────────────────────────────┤
│  PROGRAMS SECTION (Sealed)  [Tier 3]           │  [scroll item 5]
│  Graduation status per program — locked        │
├────────────────────────────────────────────────┤
│  HONORS SECTION (Sealed)  [Tier 4]             │  [scroll item 6]
│  All honors earned in chapter — locked         │
├────────────────────────────────────────────────┤
│  REFLECTION SECTION  [Tier 4]                  │  [scroll item 7]
│  Original reflection from L-6 — locked         │
├────────────────────────────────────────────────┤
│  MEMORIES SECTION  [Tier 4]                    │  [scroll item 8]
│  Post-archive additions — visually distinct    │
├────────────────────────────────────────────────┤
│  PHOTOS SECTION  [Tier 4]                      │  [scroll item 9]
│  All photos including memories — locked count  │
├────────────────────────────────────────────────┤
│  ADD A MEMORY  [Secondary CTA]                 │  [scroll item 10]
│  Always available at bottom of archived screen │
├────────────────────────────────────────────────┤
│  BOTTOM SAFE AREA PADDING                      │
└────────────────────────────────────────────────┘
```

---

## Section 6 — Chapter Header Specification

### 6.1 Active Chapter Header (L-3)

```
┌────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░                                           ░  │
│  ░  CHAPTER [N]                              ░  │  ← Chapter ordinal label, 11sp, secondary
│  ░  [Chapter Name]                           ░  │  ← Chapter name, 26-30sp, primary, 2 lines
│  ░                                           ░  │
│  ░  Started [Month Day, Year]                ░  │  ← Start date, 13sp, secondary
│  ░  ● Active                                 ░  │  ← Status indicator, 12sp, accent color
│  ░                                           ░  │
└────────────────────────────────────────────────┘
```

**What appears:**
- Chapter ordinal label ("CHAPTER 4") — orients the athlete within the full sequence
- Chapter name — the athlete's declared title for this period
- Start date — "Started [Month Day, Year]" — grounds the chapter in time
- Active status indicator — small dot + "Active" text, accent color

**Visual treatment:** Full-bleed. Dark background. ~200–240dp height. Less tall than the D-Lite hero on H-1 — this is the chapter's cover, not the product's flagship surface.

**Top App Bar (Active):**
- Left: back chevron
- Center: chapter name in truncated form (persistent orientation during scroll)
- Right: edit/options menu ("···") → chapter name edit, primary goal edit

**Why the chapter name is dominant:**
The athlete named this chapter. That name is their declaration of intent for this period. "Chapter 4: The Rebuild" is not metadata — it is the chapter's identity.

**Why start date uses "Started," not "Created":**
"Started" communicates the beginning of a lived period. "Created" communicates an administrative action.

---

### 6.2 Archived Chapter Header (L-4)

```
┌────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░                                           ░  │
│  ░  CHAPTER [N]                              ░  │
│  ░  [Chapter Name]                           ░  │
│  ░                                           ░  │
│  ░  [Start Date] – [End Date]                ░  │  ← Full date range, 13sp
│  ░  ✦ Sealed [Month Year]                    ░  │  ← Sealed mark, 13sp — design feature
│  ░                                           ░  │
└────────────────────────────────────────────────┘
```

**What changes from active to archived:**
- "Started [Date]" → "[Start Date] – [End Date]" — the chapter now has a complete lifespan
- "● Active" → "✦ Sealed [Month Year]" — the status mark transforms from a live indicator to a permanent mark

**"Sealed [Month Year]" — Design Feature, Not Warning:**
This communicates completion, not restriction. Pride, not prohibition. Permanence, not abandonment. The language is "Sealed" not "Locked," "Closed," or "Archived." The athlete chose to seal this chapter.

**Top App Bar (Archived):**
- Left: back chevron
- Center: chapter name (truncated)
- Right: options ("···") containing "Add a Memory"

---

## Section 7 — Goal Summary Specification

### 7.1 Primary Goal — Active State

```
┌────────────────────────────────────────────────┐
│  Goals                                         │
│  [Primary Goal Name]              63%    [→]   │  ← Goal name + progress % + chevron
│  [+N supporting goals]                         │  ← Supporting goal count (if any)
│                            [View Goals →]      │  ← Tertiary link → G-1
└────────────────────────────────────────────────┘
```

**Primary goal row** tappable → G-1 (Goal Hub, active chapter goals state).

**"View Goals →"** tertiary link → G-1 (Goal Hub). Always present when a primary goal exists. Provides the primary path to goal management without expanding the L-3 goals section into a full goal-management surface.

**What appears:** Section label "Goals", primary goal name + current progress percentage, supporting goal count if any secondary goals exist, "View Goals →" tertiary link.

**What does not appear:** Progress bar (percentage is sufficient summary context), goal creation date, deadline/target date, gap framing ("you need X more"), supporting metric detail — all of these are in G-1.

**Why condensed:** G-1 (Goal Hub) is the proper goal-management surface. L-3 provides orientation context — the athlete knows their primary goal and progress at a glance — and a direct path to G-1 for deeper review or management. Displaying full goal details in L-3 would duplicate G-1's content within the chapter narrative, creating maintenance friction and competing mental models.

### 7.2 Primary Goal — Archived State

```
┌────────────────────────────────────────────────┐
│  Primary Goal                                  │
│  [Primary Goal Name]                           │
│                                                │
│  ✓ Achieved  [Date Achieved]                   │  ← Achieved state
│  OR                                            │
│  — Not Achieved                                │  ← Not achieved (neutral, factual)
└────────────────────────────────────────────────┘
```

**"Not Achieved" framing rules:**
- Uses a dash (—), not an X or ✗
- No explanatory copy, no suggestion of failure
- The fact is recorded; the story belongs to the athlete
- This is Accountability Without Shame at the data display level

**Why the outcome is locked:**
If the outcome could be revised, the archive would not be trustworthy. Trust in the archive is the foundation of its value.

### 7.3 Secondary Goals — Active State

Secondary goal count is surfaced inline in the §7.1 Goals section ("+ [N] supporting goals"). Secondary goals are managed through G-1 (Goal Hub), not displayed as an independent section in L-3.

The condensed Goals section (§7.1) is the complete goals representation in L-3 active state. No separate "Supporting Goals" section appears in L-3. "View Goals →" from §7.1 navigates to G-1 where all goal details, supporting goal progress bars, and goal management actions are accessible.

### 7.4 Secondary Goals — Archived State

Each goal row shows its outcome: "✓ Achieved [Date]" or "— Not Achieved." No progress bars. Read-only. No "Add Supporting Goal" CTA.

---

## Section 8 — Program Section Specification

### 8.1 Active Program Section

```
┌────────────────────────────────────────────────┐
│  Programs                                      │
├────────────────────────────────────────────────┤
│  [Program Name]  v[Version]                    │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░  8 of 12            │
│  Next: [Workout Type]                   [→]   │
├────────────────────────────────────────────────┤
│  [Program Name]  v[Version]  ✓ Complete        │
│  [X] workouts  ·  [Start – End]               │
└────────────────────────────────────────────────┘
```

Program rows tappable → W-3 Program Detail.

**Conditional:** If no programs enrolled, section is omitted entirely. No empty state, no "Find a Program" prompt.

### 8.2 Archived Program Section

```
┌────────────────────────────────────────────────┐
│  Programs                                      │
├────────────────────────────────────────────────┤
│  [Program Name]  v[Version]                    │
│  ✓ Graduated  ·  [X] workouts                  │
│  [Start Date] – [End Date]             [→]    │
├────────────────────────────────────────────────┤
│  [Program Name]  v[Version]                    │
│  — In progress when chapter sealed             │
│  [X of Y] workouts completed           [→]    │
└────────────────────────────────────────────────┘
```

**"In progress when chapter sealed" framing:** Neutral, factual. Not a failure label. The athlete chose to close the chapter. The program can be continued in the next chapter.

---

## Section 9 — Progress Section Specification

### 9.1 Active Progress Section

```
┌────────────────────────────────────────────────┐
│  Chapter Progress                              │
│                                                │
│  [24]                                          │  ← Workout count, large numeral, 32-36sp
│  workouts this chapter                         │  ← Label beneath, 13sp, secondary
│                                                │
│  [3 months in]                                 │  ← Chapter age, 13sp, secondary
└────────────────────────────────────────────────┘
```

**What does not appear:** Streak data, "last workout X days ago," averages, projections, individual workout list.

**Why displayed large:** 24 workouts is 24 times the athlete showed up. Displaying it prominently honors the work.

### 9.2 Archived Progress Section

In archived chapters, workout count is incorporated into the Outcomes Summary (Section 10) rather than appearing as a standalone section. The chapter's workout record is one outcome among several.

---

## Section 10 — Outcomes Section Specification

*Exists only in Archived chapters (L-4).*

### 10.1 Outcomes Summary Card

```
┌────────────────────────────────────────────────┐
│  Chapter Outcomes                              │
│                                                │
│  [✓] Primary Goal            Achieved         │
│  [✓] Program Graduated       [Program Name]   │
│  [—] Program In Progress     [Program Name]   │
│  [24] Total Workouts                           │
│  [4] Honors Earned                             │
│                                                │
│  [Start Date] – [End Date]  ·  [X months]     │
└────────────────────────────────────────────────┘
```

**What appears:** Primary goal outcome, program graduation statuses, total workouts, honors earned, chapter duration.

**What does not appear:** Secondary goal details, individual workout records, Legacy Score contribution, comparative language.

**Visual treatment:** Clean list. Checkmarks (✓) for achieved. Dashes (—) for not-achieved or in-progress-when-sealed. No red marks, no X symbols, no negative visual indicators.

**Why Outcomes Summary appears before individual goal/program details:**
An athlete reviewing an archived chapter from two years ago wants the summary first — the headline — before the detail sections below provide the full story.

---

## Section 11 — Reflection Section Specification

### 11.1 Reflection — Active Chapter ("Chapter Notes")

```
┌────────────────────────────────────────────────┐
│  Chapter Notes                                 │  ← "Notes" not "Reflection" in active
│                                                │
│  [Athlete's notes text if exists]              │
│                                                │
│  [+ Add a note]                                │  ← Secondary CTA when empty
│  [Edit note]                                   │  ← Secondary CTA when content exists
└────────────────────────────────────────────────┘
```

**Chapter Notes:** Informal, editable, optional. Seeds the formal L-6 Reflection at completion as pre-populated starter content — not a locked input.

**Why called "Chapter Notes" not "Reflection" while active:** "Reflection" carries the weight of the formal completion act. "Notes" communicates openness — thoughts being gathered, not conclusions being drawn.

### 11.2 Reflection — Archived Chapter

```
┌────────────────────────────────────────────────┐
│  Reflection                                    │
│  Written [Date of Chapter Completion]          │  ← Timestamp, 12sp, secondary
│                                                │
│  [Athlete's reflection text from L-6]          │  ← 15sp, generous line height, readable
│                                                │
└────────────────────────────────────────────────┘
```

**Locked:** No edit controls. Reflection text is read-only.

**"No reflection" state:** If the athlete skipped L-6 reflection at sealing time, the Reflection section is present with an invitation rather than absent:

```
┌────────────────────────────────────────────────┐
│  Reflection                                    │
│                                                │
│  No reflection was written when this           │  ← 14sp, secondary, no shame framing
│  chapter was sealed.                           │
│                                                │
│  [  Add Reflection →  ]                        │  ← Secondary CTA → L-6
└────────────────────────────────────────────────┘
```

"Add Reflection →" Secondary CTA → L-6 (Chapter Reflection). The athlete writes their reflection on L-6, which then locks and returns to L-4 with the reflection now permanently stored. Once a reflection is added this way, the section shows the reflection text (same as if it was written at sealing time) — the field is locked immediately upon submission.

**Why "Add Reflection" is available post-sealing:** Athletes who moved through the sealing flow quickly (tapping "Skip for now" at L-6) sometimes want to return and write their reflection later. The reflection's value is its honesty, not its precise timing. An athlete who writes their reflection for a chapter sealed 3 weeks ago is still capturing an authentic record of how they experienced the chapter. A reflection written post-sealing is labeled with the date it was written — not the chapter's seal date — preserving temporal honesty.

**Why reflection cannot be edited after submission:** Whether written at sealing time or added later, once submitted the reflection is permanently locked. The athlete is not rewriting history — they are completing a record that was previously incomplete.

**Why the reflection is locked after submission:** The reflection is an honest record at the moment it was written. Editing it retroactively would allow rewriting the athlete's experience — which violates the core principle.

---

## Section 12 — Memories Section Specification

*Exists only in Archived chapters (L-4).*

### 12.1 Layout

```
┌────────────────────────────────────────────────┐
│  Memories                                      │
│  Added after this chapter was sealed           │  ← Subtitle — ALWAYS shown
├────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ [Photo thumbnail]  [Memory Note text]   │   │  ← Memory card: visually distinct
│  │ Added [Date]  ·  [X time] after sealing │   │  ← Timestamp — always visible
│  └─────────────────────────────────────────┘   │
├────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ [Memory Note text, no photo]            │   │
│  │ Added [Date]  ·  [X time] after sealing │   │
│  └─────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

### 12.2 Memory Visual Distinction Rules

Memories are visually distinct from original chapter content. The athlete must be able to tell at a glance what was part of the original chapter and what was added later.

**How memories are visually distinct:** Different container treatment from original content (border, background tone, or inset — visual design decision). The "Added [Date]" timestamp always visible. Section subtitle "Added after this chapter was sealed" always shown.

**Memory timestamp format:**
"Added June 5, 2027  ·  14 months after sealing"
The duration since sealing provides emotional context. A memory added 3 years later feels different from one added the next week.

**Memory editing rules:**
- Memory notes: can be edited (they are living additions, not sealed records)
- Memory photos: can be removed
- Entire memory: can be deleted with M-6 Confirmation (specific language: "This memory will be permanently removed from [Chapter Name].")

**Why memories can be edited while the original reflection cannot:**
The reflection is a contemporaneous record of a specific moment's truth. A memory added years later is a reflection on the past. Different emotional registers. Memories are additions to the archive; the reflection is part of the archive itself.

**Empty Memories Section:** Omitted entirely if no memories have been added. The "Add a Memory" CTA at screen bottom is the standing invitation.

---

## Section 13 — Timeline Section Specification

### 13.1 Active Chapter Timeline

```
┌────────────────────────────────────────────────┐
│  Timeline                                      │
├────────────────────────────────────────────────┤
│  [○] Goal Achieved: [Goal Name]         Jun 7  │
│  [○] Honor Earned: 10 Workouts          May 22 │
│  [○] Program Enrolled: [Program Name]   Apr 30 │
│  [○] Chapter Started                    Apr 8  │  ← Always the last entry
└────────────────────────────────────────────────┘
```

**What appears:** Milestone events within this chapter, newest to oldest.
**What does not appear:** Individual workout logs, secondary goal progress, photo additions.

### 13.2 Archived Chapter Timeline

Same structure. All entries read-only. Final entry added at archival:

```
│  [○] Chapter Sealed                    Mar 28  │  ← Added at archiving
│  ...                                           │
│  [○] Chapter Started                    Dec 3  │  ← Always the oldest entry
```

The pairing of "Chapter Started" (oldest) and "Chapter Sealed" (newest) at the two ends of the timeline is the chapter metaphor made literal in data — a beginning and an end, both recorded.

---

## Section 14 — Seal Chapter Flow Entry Point

### 14.1 The "Seal Chapter" CTA

```
┌────────────────────────────────────────────────┐
│  ─────────────────────────────────────────     │  ← Visual separator above
│                                                │
│  [    Seal This Chapter    ]                   │  ← Ceremonial CTA — full-width
│                                                │
│  Outcomes will be sealed permanently.          │  ← Supporting note, 12sp
│  Memories can still be added later.            │  ← Reassurance note, 12sp
│                                                │
└────────────────────────────────────────────────┘
```

**Position:** Very bottom of the active chapter scroll — after all content sections. Requires deliberate scroll.

**Why bottom placement is ceremonial, not punitive:**
The athlete must scroll past everything they have built to initiate completion. By the time they reach "Seal This Chapter," they have just reviewed their chapter. The scroll is ceremony. The athlete passes through their work before sealing it.

**Supporting notes explain the principle:**
1. "Outcomes will be sealed permanently." — sets expectation
2. "Memories can still be added later." — provides reassurance

### 14.2 Completion Flow

1. "Seal This Chapter" → M-5 Confirmation Modal: "Seal [Chapter Name]?" + "Your outcomes will be permanently locked." + button "Seal This Chapter" + cancel "Not yet"
2. M-5 Confirm → L-6 Chapter Reflection (pre-populated with Chapter Notes)
3. L-6 Complete → chapter archived → returns to L-1 (No Active Chapter state)

**Language note:** Button says "Seal This Chapter," not "Confirm." The language matches the action's gravity.

---

## Section 15 — Archived Chapter Behavior

### 15.1 What Changes at Archival

| Element | Active | Archived |
|---------|--------|----------|
| Chapter header | "Started [Date]" + Active | "[Start]–[End]" date range + Sealed mark |
| Primary goal | Progress bar | Outcome label (locked) |
| Secondary goals | Progress bars | Outcome labels (locked) |
| Programs | Active progress | Graduation status (locked) |
| Progress section | Workout count + age | Absorbed into Outcomes Summary |
| Honors | Growing list | Locked list |
| Chapter Notes | Editable | Converted to read-only |
| Reflection | Not present | Locked reflection from L-6 |
| Memories | Not present | Available for post-archive additions |
| Photos | Gallery + Add Photo | Gallery + add via Memory flow |
| Timeline | Growing | Sealed + "Chapter Sealed" entry added |
| Seal Chapter CTA | Present, bottom | Not present |
| Add a Memory CTA | Not present | Present, bottom |
| Edit controls | Available | Absent (not disabled — absent) |

### 15.2 The Visual Register Shift

The transition from L-3 to L-4 must feel like turning the last page and closing the book. Not dramatically. But definitively.

**How the visual register communicates "sealed":**
- "Sealed [Month Year]" mark replaces the active indicator — primary signal
- Outcome labels (static) replace progress bars (dynamic) — static communicates finality
- Edit controls are absent — the eye expects them and does not find them
- The Outcomes Summary section appears as new top-level content that did not exist before

**What must NOT change:**
- Chapter name prominence — still the athlete's declaration
- Emotional warmth — archived chapters are celebrated, not filed
- Navigation depth — all sections exist, content differs

---

## Section 16 — Sealed Chapter Rules

### 16.1 What Cannot Be Changed After Sealing

- Chapter name, start date, end date
- Primary goal outcome
- Secondary goal outcomes
- Program graduation statuses
- Total workout count
- Honors earned
- Original reflection text
- Timeline entries (except "Chapter Sealed" entry added at sealing)

### 16.2 What CAN Happen After Sealing

- Memories added (photos and notes) — any time, no limit
- Chapter read at any time — no expiry
- No content degradation for free users — ever

### 16.3 Edit Controls — Absent, Not Disabled

Edit controls do not appear in archived chapters. Not grayed out. Not locked with a padlock icon. Simply absent.

**Why absent, not disabled:** A disabled control says "you could do this, but you can't." An absent control says "this is not something that happens here." A sealed chapter is not a place where editing is blocked — it is a place where editing is not a concept.

### 16.4 "Sealed [Month Year]" as Design Element

Appears in three places:
1. Chapter header (always visible above the fold)
2. Outcomes Summary section
3. Final Timeline entry ("Chapter Sealed — [Date]")

Three contextually appropriate appearances. None redundant — each serves a different reading context.

---

## Section 17 — Memory Addition Rules

### 17.1 Entry Point

"Add a Memory" CTA at bottom of archived chapter screen. Secondary class.

Tap → modal sheet (not full-screen transition) with:
1. Photo addition (from camera roll or camera)
2. Written note (text entry)
3. Either or both

### 17.2 Memory Submission Rules

- Must contain at least one of: a photo, a note
- System timestamps at moment of creation — no manual date entry
- Memory belongs to the chapter it was added from

### 17.3 Memory Editing and Deletion

- Memory notes: editable after creation
- Memory photos: removable
- Entire memory entry: deletable with M-6 Confirmation: "This memory will be permanently removed from [Chapter Name]."

---

## Section 18 — Reflection Addition Rules

### 18.1 Original Reflection

Written in L-6 at chapter completion. Seeded with Chapter Notes from L-3 if any were written. Editable during L-6 session. Permanently locked after archiving.

### 18.2 Chapter Notes → Reflection Handoff

Chapter Notes pre-populate the L-6 reflection field as a starting point. The athlete can edit, expand, or replace before sealing. The pre-population is a courtesy — not a constraint.

### 18.3 Post-Sealing Reflection (L-4-A1)

An athlete who skipped L-6 at sealing time CAN add a reflection later through the "Add Reflection →" CTA in the L-4 Reflection section (see § 11.2). This navigates to L-6 (Chapter Reflection screen). Once submitted, the reflection is permanently locked — no editing after submission.

The reflection label shows the date it was written, not the chapter seal date, preserving temporal honesty. The reflection field on L-6 is empty (not pre-populated with Chapter Notes, which were already incorporated at sealing time).

**What remains prohibited:** Editing a reflection after it has been submitted — whether written at sealing time or added later. Replacing one reflection with another. Writing multiple reflections for the same chapter.

---

## Section 19 — Empty States

### 19.1 Secondary Goals — No Goals

Active: Empty state with "Add a Supporting Goal" Secondary CTA.
Archived: Section omitted.

### 19.2 Programs — None

Both states: Section omitted entirely. No prompt to find programs.

### 19.3 Honors — None Yet (Active, Early Chapter)

```
│  Honors                                        │
│  Keep building. Honors are earned as           │
│  your legacy grows.                            │
```

Forward-looking, no criteria mentioned. Section present even when empty because honors will arrive.

Archived with no honors: section omitted.

### 19.4 Photos — None

Active:
```
│  Photos                           0 photos     │
│  Photos taken during this chapter              │
│  preserve its story visually.                  │
│  [+  Add a Photo  ]                            │
```

Archived:
```
│  Photos                           0 photos     │
│  No photos were added during this chapter.     │
```

No "Add Photo" direct CTA in archived — photos added through "Add a Memory" flow.

### 19.5 Chapter Notes — Empty (Active)

```
│  Chapter Notes                                 │
│  Write anything about this chapter —           │
│  your intentions, what you are learning.       │
│  [+  Add a note  ]                             │
```

### 19.6 Reflection — Skipped (Archived)

Section present with invitation state: "No reflection was written when this chapter was sealed." + "Add Reflection →" Secondary CTA → L-6. See § 11.2 for full display spec.

---

## Section 20 — Active Chapter Daily Usage Flow

### 20.1 Quick Check Flow (< 20 seconds)

```
Athlete arrives at L-3 from L-1 Chapter Card tap
        ↓
Chapter Header: orientation confirmed
        ↓
Primary Goal: goal progress % visible
        ↓
Athlete satisfied — returns via back navigation
```

Most common interaction: rapid orientation. Header and primary goal answer the need in the first two elements.

### 20.2 Progress Review Flow

```
L-3 → scrolls to Progress Section → reads workout count
     → taps Program row → W-3 Program Detail → reviews next workout → back to L-3
     → taps Secondary Goal → L-7 Goal Detail → reviews → back
```

### 20.3 Chapter Tending Flow

```
L-3 → scrolls to Chapter Notes → adds a note
     → scrolls to Photos → adds a photo
     → reviews overall chapter state → returns to H-1
```

---

## Section 21 — Archived Chapter Reflection Flow

### 21.1 Revisitation Flow

```
L-9 Timeline → taps chapter group header → L-4 Archived Chapter
        ↓
Reads header — "Sealed [Month Year]" visible
        ↓
Reads Outcomes Summary — at-a-glance record
        ↓
Reads original reflection
        ↓
Browses photos
        ↓
Athlete feels: "I built this."
```

### 21.2 Memory Addition Flow

```
L-4 loaded → scrolls to bottom → taps "Add a Memory"
        ↓
Modal sheet: adds photo and/or note → submits
        ↓
Memory appears in Memories Section, visually distinct
        ↓
"Added [Date] · [X time] after sealing" always visible
```

### 21.3 The Emotional Arc of Archived Chapter Viewing

The scroll order mirrors the natural emotional movement from summary to detail to personal to historical:

1. **Recognition** (Header) — "This is Chapter 3. I remember this."
2. **Reckoning** (Outcomes Summary) — "Here is what I built."
3. **Specifics** (Goals, Programs, Honors) — "Here is the detail."
4. **Voice** (Reflection) — "Here is what I felt when I closed it."
5. **Memory** (Memories Section) — "Here is what I added looking back."
6. **Image** (Photos) — "Here is what it looked like."
7. **Archive** (Timeline) — "Here is its complete record."

Each section serves a specific moment in this arc. The order is not arbitrary.

---

## Section 22 — Chapter Completion Flow

### 22.1 The Athlete's Journey to "Seal This Chapter"

Before they reach the CTA, they have scrolled past everything they have built. The completion CTA is preceded by the full review of what is being sealed. The athlete arrives at "Seal This Chapter" having just witnessed their chapter.

### 22.2 Full Flow

**Step 1:** "Seal This Chapter" tap → M-5 Confirmation Modal
- Modal headline: "Seal [Chapter Name]?"
- Body: "Your outcomes will be permanently locked. Your progress, goals, and honors will become part of your legacy exactly as they stand right now."
- Primary button: "Seal This Chapter"
- Cancel: "Not yet"

**Step 2:** M-5 Confirm → L-6 Chapter Reflection
- Reflection field pre-populated with Chapter Notes (if any)
- Optional final photo addition
- "Complete Reflection" CTA
- "Skip for now" Tertiary option

**Step 3:** Archival and Return
- Chapter archived; "Chapter Sealed [Date]" timeline entry added
- System navigates to L-1 (No Active Chapter state)
- Featured Legacy Moment updates to "Chapter Completed"
- D-Lite hero on H-1 updates to Priority 4

### 22.3 Language of Completion

Throughout: "Seal" not "Archive," "Delete," "Close," or "Finish."

"Seal" communicates intentionality — like sealing a letter with the writer's knowledge. The athlete is the one sealing. Active voice throughout.

---

## Section 23 — Edge Cases

### 23.1 Completing a Chapter With Unachieved Primary Goal

**Behavior:** Flow proceeds identically. M-5 does not reference the unachieved goal. No barrier or additional confirmation. After sealing, primary goal shows "— Not Achieved."

**What does NOT happen:** No warning about the unachieved goal. No "Are you sure? Your goal hasn't been achieved." No additional friction.

**Why:** The athlete chose to close this chapter. The product does not evaluate that decision. Accountability Without Shame at the lifecycle-action level.

### 23.2 Very Short Chapter (1–3 Workouts)

Chapter archives normally. "1 Total Workout" in Outcomes Summary. Short chapters are valid chapters. No minimum length. No product commentary.

### 23.3 Multiple Active Programs at Completion

Programs that completed during the chapter: "✓ Graduated." Programs in progress when sealed: "— In progress when chapter sealed  ·  7 of 12 workouts completed." In-progress programs are not destroyed — they continue in the next chapter.

### 23.4 Chapter With No Goals Added

Active: Primary Goal section shows empty state with "Add a Primary Goal" Secondary CTA.
Archived: Primary Goal section omitted. Outcomes Summary reflects only what exists.

### 23.5 Many Memories Added Over Years

Memories Section displays all entries. A "View All Memories" tertiary link may be introduced above a threshold (e.g., 5+) showing a collapsed preview. Memory depth is celebrated, not capped.

### 23.6 Same Screen From Multiple Entry Points

L-4 renders identically regardless of entry point (L-9, L-2, L-1). Back navigation returns to the appropriate screen based on navigation stack.

### 23.7 Very Long Chapter Name

Truncates to 2 lines with ellipsis at line 2. Full name in top app bar long-press if needed. Consistent rule across all card surfaces.

---

## Section 24 — Mobile UX Considerations

### 24.1 Scroll Depth

L-3 (Active): ~5–6 screen heights in full state. Expected for a complete chapter story.
L-4 (Archived): ~6–8 screen heights depending on memory count and reflection length. Scales with use over time.

### 24.2 Fixed Top App Bar

Remains fixed during scroll. Provides:
- Back navigation (always accessible at any scroll depth)
- Chapter name (persistent orientation)
- Options menu

**Why fixed on this screen:** Unlike H-1, this is a long-scrolling screen. An athlete scrolled to the Memories section needs persistent chapter identity. Fixed top bar provides this at all scroll positions.

### 24.3 Safe Area Compliance

- Top App Bar respects status bar safe area
- Chapter Header full-bleed: edge to edge
- All section cards: 16dp horizontal margin
- Bottom padding: tab bar height + safe area + 16dp

### 24.4 "Seal Chapter" and "Add a Memory" — Always Reachable

No infinite scroll, no lazy loading that extends scroll depth. Both CTAs are at defined, reachable positions. All content on L-3/L-4 is finite and fully rendered.

### 24.5 One-Handed Operation Assessment

| Action | One-Handed? |
|--------|------------|
| Read chapter header | ✓ Yes |
| Tap Primary Goal card | ✓ Yes — full-width |
| Scroll screen | ✓ Yes |
| Tap goal/program rows | ✓ Yes — full-width |
| "Seal Chapter" (after scroll) | ✓ Yes — full-width, thumb zone |
| "Add a Memory" (after scroll) | ✓ Yes — full-width, thumb zone |
| Back navigation | ✓ Yes — top-left |
| Edit controls top-right | ✗ Stretch — acceptable (infrequent) |

---

## Section 25 — Chapter Validation Checklist

### Identity and Emotional Register
- [ ] Active chapter communicates "I am building this" without reading a label
- [ ] Archived chapter communicates "I built this" without reading a label
- [ ] Active vs. archived difference legible through hierarchy, not only status text
- [ ] "Sealed [Month Year]" is a mark of distinction — not a warning, not a lock icon
- [ ] "Not Achieved" goal outcomes are factual, neutral — no negative visual markers

### Hierarchy
- [ ] Chapter Header is Tier 1 — single most dominant element on screen
- [ ] Chapter name is the largest, most prominent text on screen
- [ ] Primary Goal is the first supporting section in both states
- [ ] In archived state: Outcomes Summary precedes individual goal/program details
- [ ] "Seal Chapter" is at the very bottom — requires deliberate scroll
- [ ] "Add a Memory" is at the very bottom of archived screen

### Content and Principle
- [ ] No individual workout details on L-3/L-4 (belongs in W-18/W-19)
- [ ] No charts, trend lines, averages, analytics
- [ ] No "last active X days ago" or gap/absence data
- [ ] No streak counts or consecutive-day metrics
- [ ] No comparison to other chapters
- [ ] Progress bars in active state; outcome labels in archived state — not mixed
- [ ] Workout count displayed large as an earned number, not a stat

### "Memories Can Be Added. History Cannot Be Rewritten."
- [ ] Original reflection: locked in archived — edit control absent (not disabled — absent)
- [ ] Memories Section visually distinct from all original chapter content
- [ ] Every memory card shows "Added [Date]  ·  [X time] after sealing" — always visible
- [ ] "Added after this chapter was sealed" subtitle always present in Memories section
- [ ] "Add a Memory" available in archived; not available in active
- [ ] Outcomes have no edit controls in archived — absent, not grayed out

### Sealed Chapter Integrity
- [ ] "Sealed [Month Year]" appears in: chapter header, Outcomes Summary, Timeline final entry
- [ ] No outcome can be changed in archived state
- [ ] Memory notes: can be edited after creation
- [ ] Memory entries: can be deleted with M-6 Confirmation (specific language required)

### CTA Class
- [ ] "Seal Chapter" is Ceremonial class — distinct, grave, positioned at bottom
- [ ] "Add a Supporting Goal" is Secondary class
- [ ] "Add a Memory" is Secondary class
- [ ] All "View All" links are Tertiary class — text links
- [ ] No Primary CTA (this is a discovery/reflection screen)

### Empty States
- [ ] No programs enrolled: section omitted (not empty-stated)
- [ ] No secondary goals (archived): section omitted
- [ ] No honors yet (active): forward-looking empty state — no criteria mentioned
- [ ] No photos: empty state in active; text note in archived
- [ ] Skipped reflection (archived): section present with "Add Reflection →" CTA → L-6 (not omitted)
- [ ] No memories yet: Memories section omitted

### Mobile UX
- [ ] Chapter Header full-bleed (edge to edge)
- [ ] All section cards 16dp horizontal margin
- [ ] Top App Bar fixed, includes back navigation
- [ ] "Seal Chapter" and "Add a Memory" always reachable (no infinite scroll)
- [ ] All tap targets ≥ 44×44dp
- [ ] Safe area compliance throughout

### Mission Alignment
- [ ] Does this screen answer "What is this chapter about?"
- [ ] Does the active chapter feel like the athlete is mid-story?
- [ ] Does the archived chapter feel like a permanent record of something the athlete built?
- [ ] Does the screen make the athlete feel capable and proud, not evaluated or managed?
- [ ] Is "Memories can be added. History cannot be rewritten." visibly implemented throughout?

---

---

## Change Log

### v1.0 — June 2026
Initial specification.

### v1.1 — June 2026

**L-3-A1:** Goals section in L-3 (active chapter) condensed to compact summary + "View Goals →" link → G-1. Primary goal displays as single row (name + %). Supporting goal count shown inline. Full goal details managed in G-1. Secondary Goals section removed as independent section from L-3. Updates: §7.1, §7.3, §19.1.

**L-4-A1:** Reflection section in L-4 (archived chapter) updated for skipped-reflection state. Instead of omitting the section, shows invitation copy + "Add Reflection →" Secondary CTA → L-6. Athletes who skipped L-6 at sealing time can now add a reflection post-sealing. Once submitted, reflection is permanently locked. §18.3 updated to document post-sealing reflection path. §11.2, §18.3, §19.6, validation checklist updated.

---

*Forge Legacy Chapter Detail Wireframe Specification L-3/L-4 v1.1 — All decisions derived from the Phase 2A locked architecture, the Forge Legacy Master PRD, the Forge Legacy UX Framework v1.0, and the approved H-1 and L-1 wireframe specifications. This document is the authority for all Chapter Detail implementation in Phase 2B.*
