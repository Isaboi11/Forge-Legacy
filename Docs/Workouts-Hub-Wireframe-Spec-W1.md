# Forge Legacy — Workouts Hub Wireframe Specification
## W-1 | Phase 2B | Version 1.0 — June 2026

---

## Preamble: The Execution Center

The Workouts Hub is not the product. It is the engine room.

H-1 Home tells the athlete's story. L-1 Legacy Hub is where that story is preserved. W-1 Workouts Hub is where the athlete does the work that makes the story worth telling.

The Workouts Hub answers one question: **"What am I training right now?"**

That answer must be available in the first scroll position the athlete sees. The rest of the screen organizes the tools needed to execute. Programs, activity types, recent training context, and partner activity are all in service of that single question.

W-1 must never become:
- An analytics dashboard — no trend lines, no weekly totals, no volume comparisons
- A workout history page — full history lives in W-18; W-1 shows recency, not record
- A progress report — Legacy is where progress becomes meaningful; W-1 is where progress is created

**The Workouts Hub should leave the athlete feeling: "I know what I need to do next."**

Not proud. Not reflective. Ready.

The Legacy tab is the emotional destination of this product. The Workouts Hub is the room where athletes earn the right to feel that way.

---

## Section 1 — Workouts Hub Goals

The Workouts Hub (W-1) helps the athlete accomplish four things:

1. **Confirm their chapter context** — understand which chapter and goal today's training serves
2. **Start a workout** — access the logging screens as directly as possible
3. **Continue their program** — see the next prescribed workout and begin it immediately
4. **Manage partner activity** — respond to pending Workout With Friend requests

**What W-1 answers:**
- What chapter is this training building?
- What should I train today?
- What program am I following and what's next in it?
- Do I have any partner workout activity to manage?
- What did I do recently?

**What W-1 does NOT answer:**
- How am I trending compared to last month?
- How many workouts have I done total?
- Am I on track relative to my goal? *(That belongs in L-3 Chapter Detail)*
- Who else is training right now? *(That belongs in S-2 Squad Activity Feed)*

**Why this scope:**
The Workouts Hub is a dispatch screen. The athlete arrives knowing they want to train. W-1 confirms their direction and sends them on their way. It is not a screen where athletes linger. Lingering is for H-1 and L-1.

**Supporting the Forge Legacy mission:**
Every section of W-1 connects training to legacy. The chapter context at the top makes every workout feel intentional. The programs section structures that intention. The recent workouts show the accumulation. The product treats training as material for building something that lasts — and W-1 makes that visible at the moment of execution.

---

## Section 2 — Information Hierarchy

**TIER 1 — Chapter Anchor (why this training matters)**
Current Chapter Context Card
- The chapter and primary goal this workout will contribute to
- The foundational context that transforms logging from activity into legacy-building
- Present in every W-1 state where a chapter exists

**TIER 2 — Primary Action (what to do now)**
Log Activity Entry Point
- Full-width, prominent
- The fastest path into any of the 8 activity types
- Always visible immediately below the chapter context

**TIER 3 — Structured Path (the prescribed route)**
Programs Section
- Active program(s) with next workout surfaced
- "Start Next Workout" as the default action for athletes on a program
- Omitted when no programs are active; no forced empty state

**TIER 4 — Partner Layer (conditional)**
Workout With Friend Section
- Surfaces only when there is pending partner activity (unclaimed workouts, pending approvals)
- Not a standing section — appears and disappears with the activity
- Never shows absence of partner activity as negative

**TIER 5 — Recency Layer (light context)**
Recent Workouts Section
- Last 2–3 workouts, chapter-attributed
- Contextual reference only — not a history surface
- "View Full Activity →" tertiary link → W-18

**Navigation elements (persistent):**
- Top App Bar: "Workouts" title + avatar (→ Profile modal)
- Bottom Tab Bar: visible (this is a hub screen, not an active workout screen)

**CTA posture for W-1:**
Unlike L-1 and L-3/L-4, W-1 HAS a Primary CTA: "Log Activity." This is the execution tab. The call to action is the point. However, the Primary CTA is not in a D-Lite hero — that is H-1's architecture. On W-1, the Primary CTA is a full-width, prominent button in the Workout Entry Point section.

The Programs section's "Start Next Workout" is Secondary class — it is a specific path, not the general call to action. Both coexist without conflict. An athlete without a program uses "Log Activity." An athlete on a program may use either "Start Next Workout" (following the plan) or "Log Activity" (going off-plan).

---

## Section 3 — Full Scroll Order

```
┌────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                             │  [fixed]
├────────────────────────────────────────────────┤
│  TOP APP BAR                                   │  [fixed]
│  Workouts                           [Avatar]   │
├────────────────────────────────────────────────┤
│                                                │
│  CURRENT CHAPTER CONTEXT CARD  [Tier 1]        │  [scroll item 1]
│  Chapter name + primary goal + % progress      │
│                                                │
├──── 16dp margin ───────────────────────────────┤
│  LOG ACTIVITY ENTRY POINT  [Tier 2]            │  [scroll item 2]
│  Primary CTA — full-width                      │
│  Quick-select row — recent activity types      │
│                                                │
├────────────────────────────────────────────────┤
│  PROGRAMS SECTION  [Tier 3]                    │  [scroll item 3]
│  Conditional: only if enrolled in programs     │
│  Active program(s) + next workout + start CTA  │
├────────────────────────────────────────────────┤
│  WORKOUT WITH FRIEND SECTION  [Tier 4]         │  [scroll item 4]
│  Conditional: only if pending partner activity │
│  Pending claims + pending approvals            │
├────────────────────────────────────────────────┤
│  RECENT WORKOUTS SECTION  [Tier 5]             │  [scroll item 5]
│  Last 2–3 workouts + "View Full Activity →"    │
│                                                │
├────────────────────────────────────────────────┤
│  BOTTOM SAFE AREA PADDING                      │
└────────────────────────────────────────────────┘
```

**Above the fold:** Chapter Context Card fully visible. Top of Log Activity Entry Point visible below it, inviting immediate action.

**Why this order:**
The chapter context comes first because the product principle is Chapter First. The athlete needs to see their chapter name before they log anything. "You are building Chapter 3: The Rebuild. Your primary goal is 315lb squat." That context means the upcoming workout is not just exercise — it is chapter material.

The Log Activity CTA follows immediately because W-1 is an execution screen. Context is orientation; action is the point.

Programs follow because they represent the structured path. If the athlete has a program, the next workout is pre-decided. The program section surfaces that decision already made.

Workout With Friend is conditional — it appears only when there is something to act on. It is not decorative.

Recent Workouts is last because it is the least urgent and most contextual section. The athlete who needs it will scroll for it. The athlete who doesn't won't have to pass it to reach what they came for.

---

## Section 4 — Current Chapter Context Specification

### 4.1 Card Anatomy

```
┌────────────────────────────────────────────────┐
│  Building →                                    │  ← Context label, 11sp, secondary
│  [Chapter Name]                                │  ← Chapter name, 17-19sp, primary weight
│                                                │
│  [Primary Goal Name]                    [63%]  │  ← Goal name + compact % indicator, 13sp
└────────────────────────────────────────────────┘
```

Entire card tappable → L-3 Chapter Detail.

**What appears:**
- Context label: "Building →" — communicates forward movement, not static status
- Chapter name — the athlete's declared title for this period
- Primary goal name — one-line, truncated if needed
- Compact goal progress percentage — no full progress bar; just the number

**What does not appear:**
- Chapter start date
- Secondary goals
- Workout count
- Full progress bar
- Any streak or frequency data

**Why compact progress (% only, no bar):**
A full progress bar on W-1 would shift the screen from execution toward analytics. The percentage is sufficient to orient the athlete — "63% toward my primary goal" — without drawing attention away from the Log Activity CTA below. The full progress bar lives in L-3 Chapter Detail, where the athlete is explicitly there to review progress.

**Why "Building →" as the context label:**
"Building" communicates active creation. It is what the athlete is doing with their training. The trailing arrow suggests forward motion. It is not a section header — it is a framing statement. The athlete is not "in chapter 3" — they are building it.

Alternatives considered and rejected:
- "Current Chapter" — administrative, sounds like a spreadsheet label
- "Training For" — misframes the chapter as a destination rather than a period of life
- "Chapter Progress" — makes the card feel like an analytics widget

**How it supports the mission:**
The chapter context card is the Workouts tab's implementation of "The workout tracker is the engine. The Legacy is the product." The athlete sees their chapter and goal before they touch a single log entry. Their training has a named purpose. Every log entry is chapter material — and the card makes that visible at the moment of decision.

### 4.2 Visual Treatment

Tier 2 card (Section Card). Not full-bleed — 16dp horizontal margin. Compact height: approximately 72–80dp. Dark background with bronze accent on "Building →" label. Chapter name in primary white/light. Goal line in secondary color. Percentage in accent.

Not the D-Lite hero. Not full-bleed. The D-Lite hero belongs to H-1. The chapter context card on W-1 is a compact orientation element, not the emotional anchor surface.

### 4.3 Tap Behavior

Tapping the chapter context card navigates to L-3 Chapter Detail (Active). W-1 shows the summary; L-3 shows the story. This navigation path is supported but not required — the athlete can read the card and proceed directly to logging without ever tapping it.

---

## Section 5 — Log Activity Entry Point Specification

### 5.1 Entry Point Anatomy

```
┌────────────────────────────────────────────────┐
│                                                │
│  [      Log Activity      →      ]             │  ← Primary CTA, full-width
│                                                │
│  Strength  ·  Run  ·  Walk  ·  More →          │  ← Quick-select row, 13sp, secondary
│                                                │
│  [  Import Training  ]                         │  ← Secondary CTA
└────────────────────────────────────────────────┘
```

**What appears:**
- "Log Activity" — full-width Primary CTA → opens activity type picker (W-8)
- Quick-select row below — the athlete's most recently used activity types as one-tap shortcuts
- "More →" at the end of the quick-select row → full type picker with all 8 types
- "Import Training" — Secondary CTA → W-IM-1 Import Upload

**What does not appear:**
- Individual exercise inputs (those are in W-9 through W-16)
- Template selection (that lives in the activity type picker flow, W-6/W-7)
- Heart rate or wearable prompts (post-MVP)

### 5.2 Quick-Select Row Logic

The quick-select row shows the athlete's **last 2–3 used activity types** in the order they were most recently used. Automatically populated from history — not a preference setting.

Examples:
- Athlete who alternates Strength and Run: "Strength  ·  Run  ·  More →"
- Athlete who exclusively strength trains: "Strength  ·  More →"
- Athlete with no prior workouts: Row is omitted. Full-width "Log Activity" CTA only.

**Why quick-select:**
The 3-tap rule applies from H-1. From W-1 (already one tap from Home), the athlete should reach first input in two more taps. The quick-select row removes the activity type picker step for athletes with consistent training patterns. Strength athletes should never have to hunt for Strength.

**Why the full CTA remains alongside quick-select:**
The full CTA covers athletes trying something new, athletes with irregular patterns, and athletes who want to browse templates or all activity types. Quick-select is an optimization, not a replacement.

### 5.3 Tap Behaviors

- Tap "Log Activity" → W-8 activity type picker sheet (all 8 types + template option)
- Tap quick-select chip (e.g., "Strength") → skip type picker → directly to W-9 Strength logging screen
- Tap "More →" → W-8 activity type picker (same destination as "Log Activity")
- Tap "Import Training" → W-IM-1 Import Upload

### 5.4 Import Training CTA

"Import Training" is a Secondary CTA within the Log Activity Entry Point section. It is positioned below the quick-select row — clearly subordinate to "Log Activity" without being buried.

**What import enables from this entry point:**
Athletes who have existing training in CSV, XLSX, or a structured spreadsheet can bring it directly into Forge Legacy as a Program or as the foundation of a new Chapter. This path is an alternative to manual creation, not a replacement for logging.

**Why Secondary and not Primary:**
The athlete arriving at W-1 who wants to train right now should immediately see "Log Activity." The athlete arriving with a spreadsheet to import uses "Import Training." Both needs are served without either competing with the other.

**CTA label is "Import Training" not "Import File":**
"Import Training" describes what the athlete is doing. "Import File" describes a system operation. The language stays with the athlete's intent.

**Tapping "Import Training" navigates to W-IM-1** (Import Upload). See Architecture Amendment 001 for the complete import flow specification.

### 5.5 Relationship to the 3-Tap Rule

The 3-tap rule is enforced from H-1: Home → Activity Type Selected = 2 taps. Home → First input logged = 3 taps.

From W-1 (which is itself a tab tap from Home):
- Tap Workouts tab → W-1 (tap 1)
- Tap quick-select chip → direct to logging screen (tap 2)
- First input logged (tap 3)

The W-1 quick-select path achieves the 3-tap rule from H-1. The H-1 hero path achieves it independently. Both paths satisfy the constraint.

---

## Section 6 — Programs Section Specification

### 6.1 Active Program Card

```
┌────────────────────────────────────────────────┐
│  Programs                                      │  ← Section label, 11sp, secondary
├────────────────────────────────────────────────┤
│  [Program Name]  v[Version]                    │  ← Program name + version, 16sp
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░  8 of 12            │  ← Progress bar + X of Y
│  Next: [Workout Type] — [Brief Description]    │  ← Next prescribed workout, 13sp, max 40 chars
│                                                │
│  [     Start Next Workout     ]                │  ← Secondary CTA
└────────────────────────────────────────────────┘
```

Tapping the program card body (not the CTA) → W-3 Program Detail.
"Start Next Workout" → launches appropriate logging screen (W-9 through W-16) pre-loaded with program context.

**What appears:**
- Section label: "Programs"
- Program name + version number
- Progress bar: X of Y workouts — identical treatment to L-3 Chapter Detail for consistency
- Next prescribed workout — "Next: Upper Body Strength" or "Next: 5K Run" (maximum 40 characters for the brief description field; truncate with ellipsis if exceeded)
- "Start Next Workout" Secondary CTA

**What does not appear:**
- Individual workout list within the program
- Exercise prescriptions (sets, reps, weights)
- Program creator / author
- "Browse Programs" CTA within this section — that lives in W-2

### 6.2 Multiple Active Programs

If the athlete is enrolled in more than one program simultaneously, all programs show stacked. Each has its own progress bar and "Start Next Workout" CTA. No maximum display cap. No priority ordering between programs — the product does not decide which program matters more. The athlete decides.

### 6.3 Program Graduated (Chapter Still Active)

```
┌────────────────────────────────────────────────┐
│  Programs                                      │
├────────────────────────────────────────────────┤
│  [Program Name]  v[Version]  ✓ Graduated       │
│  Completed [Date]  ·  [X] workouts             │
└────────────────────────────────────────────────┘
```

No "Start Next Workout" CTA. No "Find your next program" prompt — that belongs in the graduation flow (M-4 → W-2).

### 6.4 No Programs — Section Omitted

If the athlete is not enrolled in any program, the Programs section is omitted entirely. No empty state. No "Find a Program" invitation within W-1.

**Why no empty state:**
An athlete who is not following a program has made a valid choice. An empty state saying "You're not on a program — Find one!" is prescriptive and counter to athlete autonomy. The absence of programs is not a problem W-1 should solve. The Log Activity CTA above handles the program-free athlete completely.

---

## Section 7 — Workout With Friend Section Specification

### 7.1 Purpose and Conditionality

The Workout With Friend section on W-1 exists to surface **pending actions only**. It is not a standing section. It appears when there is something for the athlete to act on. It disappears when there is nothing pending.

Two pending action types:
1. **Unclaimed workout** — a squad member tagged the athlete in a workout. M-8 has fired. The athlete dismissed it or has not seen it. The claim is still waiting.
2. **Pending approval** — a non-squad athlete tagged the athlete post-workout. M-9 has fired. The athlete has not responded. The request is still waiting.

**Note on pre-workout initiation:**
Pre-workout Workout With Friend (Train Together) is initiated from the Squads tab (S-2 → S-10), not from W-1. The athlete who wants to pre-tag a workout partner goes to their squad first. W-1 manages incoming and unresolved items — not outbound initiation.

### 7.2 Unclaimed Workout Card (M-8 Remainder)

```
┌────────────────────────────────────────────────┐
│  Workout With Friend                           │  ← Section label
├────────────────────────────────────────────────┤
│  [Avatar] [Name] tagged you in a workout       │  ← 14sp, primary
│  [Activity Type]  ·  [Date]                    │  ← 12sp, secondary
│                                                │
│  [  Claim Workout  ]      [  Dismiss  ]        │  ← Secondary + Tertiary CTAs
└────────────────────────────────────────────────┘
```

- "Claim Workout" → creates a reference entry in the athlete's W-18 Activity History: activity type, date, "Trained with [Name]." The partner's performance data is not included — not weights, reps, distances, or any metrics.
- "Dismiss" → removes the card from W-1. No entry is created. The association remains in the tagger's history, not in the athlete's.

**The principle expressed here:** "Being present during a workout is not the same as completing a workout." The reference entry records presence. It records nothing about performance.

### 7.3 Pending Approval Card (M-9 Remainder)

```
┌────────────────────────────────────────────────┐
│  Workout With Friend                           │
├────────────────────────────────────────────────┤
│  [Avatar] [Name] wants to tag you in a workout │  ← 14sp, primary
│  [Activity Type]  ·  [Date]                    │  ← 12sp, secondary
│                                                │
│  [  Approve  ]            [  Decline  ]        │  ← Secondary + Destructive CTAs
└────────────────────────────────────────────────┘
```

- "Approve" → association confirmed; M-8 then flows to the approving athlete for the claim/dismiss decision
- "Decline" → request rejected. No entry created anywhere. The tagger receives no decline notification.

**Why decline is silent:**
Notifying someone that their tag was rejected creates social friction and violates Accountability Without Shame. The athlete who tags a non-squad member accepts that uncertainty. The athlete who declines has complete privacy.

### 7.4 Multiple Pending Items

All pending items stack within the section. No "X more" truncation — all require the athlete's decision and all must be visible.

### 7.5 No Pending Activity — Section Omitted

When no partner activity is pending, the section does not appear. No "No partner workouts" empty state. Silence is correct. The Workout With Friend section is an action queue, not a social feed. Empty queues do not need visual representation.

---

## Section 8 — Recent Workouts Section Specification

### 8.1 Layout

```
┌────────────────────────────────────────────────┐
│  Recent                         [View All →]   │  ← Section label + tertiary link → W-18
├────────────────────────────────────────────────┤
│  [Strength]  Jun 7  ·  Chapter 3               │  ← Row: type icon, date, chapter
├────────────────────────────────────────────────┤
│  [Run]       Jun 5  ·  Chapter 3               │
├────────────────────────────────────────────────┤
│  [Strength]  Jun 2  ·  Chapter 3               │
└────────────────────────────────────────────────┘
```

Individual rows tappable → W-19 Activity Detail for that workout.

**What appears:**
- Section label: "Recent" — understated; this is a glance, not a report
- "View All →" tertiary link in the section header → W-18 Activity History
- Last 2–3 workouts in compact row format, ordered newest first
- Each row: activity type icon + label, date, chapter attribution
- If a workout had a partner: compact "with [Name]" label in the row

**What does not appear:**
- Exercise details (sets, reps, weights, distance, pace)
- Duration
- Performance metrics
- Streak indicators
- "Last trained X days ago" — gap data, prohibited
- Comparison to prior workouts

**"Recent" not "Activity History":**
"Activity History" implies an archive. "Recent" implies a glance. W-1 shows a glance. W-18 is the archive. The language distinction reinforces the navigation hierarchy.

**Why 2–3 workouts only:**
Showing more tips this section from "contextual reference" to "partial history." If the athlete wants history, they tap "View All →." The Recent section answers: "Have I trained recently?" Not: "How much have I trained?"

**Chapter attribution on every row:**
Every workout row shows which chapter it contributed to. "Chapter 3" beside a Strength row makes the connection explicit — this workout was chapter material. For athletes without a chapter, the row shows "— No chapter" in secondary text without judgment.

**Why this is the last section:**
Recency context is the least urgent information on W-1. Athletes who need history go to W-18. Athletes who need progress context go to L-3. W-1 shows just enough recent training to orient the athlete before they decide what to do next.

---

## Section 9 — Empty States

### 9.1 No Programs Enrolled

Programs section omitted entirely. See Section 6.4. No prompt. No empty state copy.

### 9.2 No Workout With Friend Pending

Workout With Friend section omitted. See Section 7.5. No copy. No empty state.

### 9.3 No Recent Workouts (Programs Enrolled, No Sessions Yet)

Programs section visible. Recent Workouts section omitted. Log Activity CTA is the primary focus. No "no recent activity" message.

### 9.4 Nothing Conditional (No Programs, No Partner Activity, No Recent Workouts)

Screen shows: chapter context card (or no-chapter card) + Log Activity CTA only. Clean. See Section 12 for the first-workout experience.

---

## Section 10 — No Active Chapter Behavior

When the athlete has no active chapter, the chapter context card is replaced. The rest of the screen — Log Activity, Programs, Workout With Friend, Recent Workouts — remains intact and fully functional. Logging is never gated on chapter status.

### 10.1 No Active Chapter Card

```
┌────────────────────────────────────────────────┐
│  Your training builds your legacy.             │  ← 13sp, secondary
│  Start a chapter to give it a name.            │  ← 13sp, secondary
│                                                │
│  [  Create a Chapter  →  ]                     │  ← Secondary CTA
└────────────────────────────────────────────────┘
```

Entire card tappable → L-5 Create Chapter.

**What appears:** An invitation — two lines of copy connecting training to legacy purpose. "Create a Chapter →" Secondary CTA.

**What does not appear:**
- "You don't have an active chapter"
- "No active chapter" label
- Any language framing the absence as incomplete or wrong
- A gate or blocker on workout logging

**Why the CTA is Secondary, not Primary:**
The Primary CTA on W-1 is always "Log Activity." Chapter creation is an enhancement — it enriches the legacy of workouts about to be logged. It is never a requirement.

**Language note:**
"Start a chapter to give it a name" — "it" refers to the training. The training already exists as something meaningful. The chapter gives it a name. This framing respects the athlete's effort regardless of whether a chapter exists.

---

## Section 11 — Programless Athlete Behavior

When no program is active, the Programs section is omitted. The screen becomes:

1. Current Chapter Context Card (or No Active Chapter Card)
2. Log Activity Entry Point — more visually prominent without the Programs section below
3. Workout With Friend (conditional)
4. Recent Workouts

The quick-select chips do more navigational work in the programless state. Without a program telling the athlete what to do next, their own recent patterns guide them. The chips reflect their actual training history.

**No program discovery prompt in this state:**
The programless athlete has made a choice. W-1 respects it. Program discovery belongs in W-2. The exception is the first-workout experience (Section 12), where "Browse Programs" appears as a contextual secondary option.

---

## Section 12 — First Workout Experience

### 12.1 What the Athlete Sees

When an athlete opens W-1 for the first time (post-onboarding, no workouts logged):

**If a chapter was created during onboarding:**
Chapter Context Card appears with their chapter name + primary goal + 0% progress.

**If chapter creation was skipped:**
No Active Chapter Card appears.

Below either:

```
┌────────────────────────────────────────────────┐
│  [Chapter Context or No-Chapter Card]          │
├────────────────────────────────────────────────┤
│  Your training story starts here.              │  ← 15sp, primary
│  What are you training today?                  │  ← 14sp, secondary
│                                                │
│  [      Log Activity      →      ]             │  ← Primary CTA
├────────────────────────────────────────────────┤
│  [  Browse Programs  ]                         │  ← Secondary CTA — first-workout only
└────────────────────────────────────────────────┘
```

No Recent Workouts section (nothing to show). No Workout With Friend section. No quick-select chips (no history yet).

### 12.2 Why "Browse Programs" Appears Here Only

A first-time athlete has no established patterns and no quick-select chips. The program path offers structure when personal history cannot. This is the only context in which W-1 surfaces program discovery.

### 12.3 The Emotional Goal

"Your training story starts here." — the product frames beginning as a narrative event, not a form to complete. The athlete is not "setting up an account." They are beginning a story. The copy honors that distinction.

### 12.4 Transition After First Workout

After the first workout is logged:
- Welcome copy disappears
- Recent Workouts section appears with the first entry
- Quick-select chips populate with the first activity type
- "Browse Programs" secondary CTA disappears from W-1
- Programs section appears if a program was enrolled during the logged session

The screen transitions naturally from beginning to continuing.

---

## Section 13 — Daily Usage Flow

### 13.1 Quick Launch Flow (< 15 seconds)

```
Athlete taps Workouts tab → W-1 loads
        ↓
Chapter context: "Building → Chapter 3: The Rebuild | 315lb Squat  63%"
        ↓
Taps quick-select chip: "Strength"
        ↓
W-9 Strength logging screen — ready for first set
```

Two taps from W-1 to logging screen. Chapter context confirmed in under 1 second.

### 13.2 Program-Following Flow

```
Athlete opens W-1
        ↓
Programs section: "[Program Name]  8 of 12 — Next: Upper Body Strength"
        ↓
Taps "Start Next Workout"
        ↓
W-9 Strength logging screen — program context pre-loaded
        ↓
W-17 Workout Summary — program progress updated (9 of 12)
```

The athlete never had to decide what to do. The program decided. W-1 surfaced the decision. They executed.

### 13.3 Chapter Check Before Training

```
Athlete opens W-1
        ↓
Taps chapter context card
        ↓
L-3 Chapter Detail — reviews goals, progress, honors
        ↓
Taps back → returns to W-1
        ↓
Taps quick-select chip → begins workout
```

W-1 → L-3 → W-1 → training is a supported and common flow.

### 13.4 Partner Activity Management Flow

```
Athlete opens W-1
        ↓
Workout With Friend section: "[Name] tagged you in a workout — Strength · Jun 5"
        ↓
Athlete taps "Claim Workout"
        ↓
Reference entry created in W-18: "Strength · Jun 5 · Trained with [Name]"
        ↓
Card dismisses; section disappears if no remaining items
```

---

## Section 14 — Workout Launch Flow

### 14.1 General Log Activity Flow

1. Tap "Log Activity" → W-8 activity type picker sheet
2. Tap activity type → appropriate logging screen (W-9 through W-16)
3. First input logged

**From W-1:** 2 taps to first input. **From H-1:** 3 taps total. Both satisfy the 3-tap rule.

### 14.2 Quick-Select Launch Flow

1. Tap quick-select chip → direct to logging screen
2. First input logged

**From H-1:** tap Workouts tab (1) → tap chip (2) → first input (3). Rule satisfied.

### 14.3 Program Launch Flow

1. Tap "Start Next Workout" → logging screen for the prescribed type, program context pre-loaded
2. First input logged

**Program context pre-loaded means:**
- Program name and version visible in the logging screen context
- Workout attributed to the program in W-17 automatically
- No manual program association required post-workout

### 14.4 Active Workout UI Rules

Once the athlete enters any logging screen (W-9 through W-16):
- Full-screen mode: Top App Bar hidden, Bottom Tab Bar hidden
- Back gesture: triggers pause/exit confirmation — not instant exit

Returning to W-1 after W-17 Workout Summary: Recent Workouts includes the just-completed workout; program progress reflects the updated count.

---

## Section 15 — Workout With Friend Entry Flow

### 15.1 W-1's Role in the System

| Path | Initiation | W-1 Role |
|------|-----------|----------|
| Pre-workout | S-2 Train Together → S-10 | None — Squads tab |
| Post-workout | W-17 Add Partner → W-20 | None — Summary screen |
| Management | Pending items surface in W-1 | Claim, Dismiss, Approve, Decline |

W-1 is the **management surface** — not the initiation surface.

### 15.2 Claim Flow Detail

```
Squad member tags athlete in a completed workout
        ↓
M-8 fires globally — athlete may dismiss without acting
        ↓
Pending claim surfaces in W-1 Workout With Friend section
        ↓
Athlete taps "Claim Workout"
        ↓
Reference entry in W-18:
  · Activity type matching the partner's
  · Date of the partner's workout
  · "Trained with [Name]"
  · Partner performance data: not included
        ↓
Card removed from W-1
```

### 15.3 Approval Flow Detail

```
Non-squad athlete tags the athlete post-workout
        ↓
M-9 fires globally — athlete may dismiss without acting
        ↓
Pending approval surfaces in W-1
        ↓
"Approve" → confirmed → M-8 flows to athlete for claim/dismiss decision
"Decline" → rejected silently — no notification to requester
```

### 15.4 Consent Principles in W-1

Every Workout With Friend card presents a clear action pair. No association appears anywhere in the athlete's record — not in W-18, not in the Legacy Timeline — without their explicit action (Claim or Approve). The athlete always controls what enters their history.

---

## Section 16 — Edge Cases

### 16.1 Athlete With Many Active Programs (3+)

All programs show stacked. No maximum display cap. No priority sorting. The athlete managing multiple programs will scroll for them — this is acceptable. The Programs section serves all active programs.

### 16.2 Program Graduation — Returning to W-1

The graduated program shows "✓ Graduated" with completion date and workout count. "Start Next Workout" CTA is gone. W-1 does not show "Find your next program" — that happened in the M-4 graduation flow.

### 16.3 Chapter Sealed Earlier That Day

Chapter context card shows the No Active Chapter state. Log Activity CTA remains fully functional. Workouts logged without an active chapter surface as uncategorized in the Legacy system — W-1 does not explain this attribution logic.

### 16.4 All Workout With Friend Items Resolved

Workout With Friend section disappears after the last item is resolved. The screen contracts gracefully. No "all clear" message. The section's absence communicates that nothing is pending.

### 16.5 Athlete Returning After Long Absence

Normal W-1 state. Chapter context card shows their chapter (if active). Recent Workouts shows the last workouts, whenever they occurred.

**What does NOT appear:**
- "Last workout X days ago" — gap data, prohibited
- Streak break notification
- "Welcome back" or any gap-acknowledgment copy
- Any comparison to prior frequency

The product surfaces what the athlete has built, not what they missed.

### 16.6 Long Chapter Name

Chapter name truncates to one line with ellipsis in the context card. Full name visible in L-3 Chapter Detail via card tap.

### 16.7 Multiple Pending Partner Tags Across Squads

All pending tags show stacked in the Workout With Friend section. No truncation. All require the athlete's decision. Unlike Recent Workouts (capped for context reasons), this section must show every pending item.

### 16.8 Athlete Has No Programs and Has Never Logged a Workout

First-workout experience state (Section 12): chapter context card (or no-chapter card) + first-workout copy + Log Activity CTA + Browse Programs Secondary CTA. All conditional sections omitted.

---

## Section 17 — Mobile UX Considerations

### 17.1 Scroll Depth

W-1 in full state (chapter, programs, partner activity, recent workouts):
~3–4 screen heights.

W-1 in minimal state (chapter, no programs, no partner activity, 2 recent workouts):
~2 screen heights.

W-1 is intentionally the shortest hub screen in the app. It is a dispatch screen. The athlete should not need to scroll far to reach what they came for.

### 17.2 Above the Fold Guarantee

**Must be visible without scrolling on standard devices (375×812):**
- Top App Bar
- Current Chapter Context Card (full)
- Log Activity Primary CTA (full label)

**Validation requirement:** Layout must be tested on the smallest supported device size. If either the chapter context card or the Log Activity CTA requires scroll to reach, the screen has failed its primary purpose.

### 17.3 Fixed Top App Bar

"Workouts" title + avatar remains fixed during scroll. Provides tab identity and profile access at all scroll positions.

The App Bar does not use the chapter name as a scroll-context anchor (unlike L-3/L-4) — the chapter context card is compact and visible near the top at most scroll positions. A chapter name in the app bar would be redundant.

### 17.4 Thumb Zone Considerations

**Within thumb zone (standard reach):**
- Log Activity CTA — full-width, mid-screen
- Quick-select chips — adjacent to CTA, within reach
- "Start Next Workout" — full-width within Programs section
- Workout With Friend action buttons — within thumb zone at standard scroll position

**Stretch zone (acceptable — infrequent):**
- "View All →" in Recent Workouts header — top-right of section
- Avatar in Top App Bar — top-right, standard pattern

### 17.5 One-Handed Operation Assessment

| Action | One-Handed? |
|--------|-------------|
| Read chapter context card | ✓ Yes |
| Tap Log Activity CTA | ✓ Yes — full-width |
| Tap quick-select chip | ✓ Yes — full-width proximity |
| Tap program card | ✓ Yes — full-width |
| Tap "Start Next Workout" | ✓ Yes — full-width |
| Claim / Dismiss partner workout | ✓ Yes — mid-screen |
| View recent workout rows | ✓ Yes — full-width rows |
| "View All →" Activity History | ✗ Stretch — acceptable (secondary) |
| Avatar / Profile | ✗ Stretch — acceptable (infrequent) |

### 17.6 Safe Area Compliance

- Top App Bar respects status bar safe area
- Chapter Context Card begins below Top App Bar with 16dp top margin
- All section cards: 16dp horizontal margin
- Bottom content padding: tab bar height + safe area + 16dp minimum
- Bottom Tab Bar remains visible — hub screen, not active workout screen

### 17.7 Tap Target Sizes

| Element | Compliant? |
|---------|------------|
| Log Activity CTA — full-width × 48dp | ✓ Yes |
| Quick-select chips — minimum 8dp vertical padding (top + bottom) to achieve 44dp touch target | ✓ Required |
| Program card body — full-width × ~80dp | ✓ Yes |
| "Start Next Workout" button — full-width × 44dp | ✓ Yes |
| WwF action buttons — ~50% width × 44dp each | ✓ Yes |
| Recent workout rows — full-width × 48dp | ✓ Yes |
| Chapter context card — full-width × ~80dp | ✓ Yes |

### 17.8 Visual Density

W-1 must not feel dense. 24dp minimum vertical spacing between section groups. The athlete scanning the screen should immediately distinguish: chapter context, primary action, programs, partner activity, history. Clarity is speed on an execution screen.

---

## Section 18 — W-1 Validation Checklist

### Purpose and Scope
- [ ] W-1 answers "What am I training right now?" in the first scroll position
- [ ] Chapter context is the first element the athlete sees where a chapter exists
- [ ] Log Activity CTA is visible above or just below the fold without scrolling
- [ ] W-1 shows no charts, trend lines, weekly totals, or analytics
- [ ] W-1 shows no full workout history (2–3 recent only)
- [ ] W-1 shows no progress reports or performance comparisons
- [ ] W-1 does not recruit athletes to create a chapter (except first-workout state)
- [ ] W-1 does not recruit athletes to find a program (except first-workout state)

### Chapter First
- [ ] Current Chapter Context Card is the first scroll element where a chapter exists
- [ ] Chapter name is visible in the context card
- [ ] Primary goal name is visible in the context card
- [ ] Goal progress shown as compact % only — no full progress bar on W-1
- [ ] "Building →" label used — not "Current Chapter," "Training For," or similar
- [ ] Every workout row in Recent Workouts attributes to its chapter
- [ ] Tapping the chapter context card → L-3 Chapter Detail

### Log Activity
- [ ] "Log Activity" is full-width and Primary class
- [ ] Quick-select row shows last 2–3 used activity types — auto-populated, not a preference
- [ ] Quick-select row omitted when no prior workouts exist
- [ ] Tap "Log Activity" → W-8 activity type picker
- [ ] Tap quick-select chip → direct to logging screen (bypasses picker)
- [ ] "Import Training" Secondary CTA present below quick-select row
- [ ] Tap "Import Training" → W-IM-1 Import Upload
- [ ] "Import Training" is Secondary class — does not compete visually with "Log Activity"
- [ ] 3-tap rule satisfied from H-1: Home → Workouts tab → chip tap → logging screen

### Programs
- [ ] Programs section present only if programs are active
- [ ] Programs section omitted when no programs active — no empty state shown
- [ ] Each program card: name, version, progress bar (X of Y), next workout
- [ ] "Start Next Workout" is Secondary class — not Primary
- [ ] Tapping program card body → W-3 Program Detail
- [ ] Graduated programs show "✓ Graduated" without a "Start Next Workout" CTA
- [ ] No "Find a Program" prompt anywhere in the Programs section

### Workout With Friend
- [ ] Section appears only when pending activity exists
- [ ] Section omitted when nothing is pending — no empty state
- [ ] Unclaimed squad workouts: "Claim Workout" + "Dismiss" action pair
- [ ] Pending non-squad approvals: "Approve" + "Decline" action pair
- [ ] "Claim Workout" creates reference entry only — no performance data transferred
- [ ] "Decline" is silent — no notification to the requester
- [ ] All pending items shown — no truncation
- [ ] Section disappears after last pending item is resolved

### Recent Workouts
- [ ] Maximum 2–3 rows
- [ ] No performance metrics (no sets, reps, weights, pace, distance)
- [ ] No "last trained X days ago" — no gap data
- [ ] No streak indicators
- [ ] Chapter attribution on every workout row
- [ ] "View All →" tertiary link → W-18 Activity History
- [ ] Section omitted when no workouts have ever been logged

### No Active Chapter
- [ ] Chapter context card replaced with No Active Chapter Card
- [ ] No Active Chapter Card shows an invitation — not an error or warning
- [ ] "Create a Chapter →" is Secondary class — never Primary
- [ ] Log Activity CTA remains Primary and fully functional without a chapter
- [ ] No language implying training without a chapter is wrong or incomplete

### Accountability Without Shame
- [ ] No "last workout X days ago" anywhere on the screen
- [ ] No streak counts, missed-streak indicators, or consistency metrics
- [ ] No comparative language ("You trained X times this week vs. last week")
- [ ] No "Welcome back" or gap-acknowledgment copy for returning athletes
- [ ] No red or negative visual indicators in any state
- [ ] Goal progress state is not surfaced on W-1 — that belongs in L-3

### Workout With Friend Integrity
- [ ] Reference entries do not include partner's performance data
- [ ] Athlete can Dismiss a squad tag without creating any entry
- [ ] Athlete can Decline a non-squad request silently — no notification sent
- [ ] The section never implies the athlete has missed partner workouts
- [ ] Partner's weights, reps, or distances not visible in claim or approval cards

### Mobile UX
- [ ] Chapter context card + Log Activity CTA visible above fold on 375×812
- [ ] All section cards use 16dp horizontal margin
- [ ] 24dp minimum vertical spacing between section groups
- [ ] Top App Bar fixed during scroll — "Workouts" title + avatar
- [ ] Bottom Tab Bar visible — this is a hub screen
- [ ] All tap targets ≥ 44×44dp
- [ ] Quick-select chips have minimum 8dp vertical padding (top + bottom) to achieve 44dp touch target
- [ ] Safe area compliance throughout

### Mission Alignment
- [ ] Does W-1 answer "What am I training right now?"
- [ ] Does the athlete leave W-1 feeling "I know what I need to do next"?
- [ ] Does the chapter context card make training feel like chapter-building, not logging?
- [ ] Does W-1 remain subordinate to the Legacy tab as the emotional destination?
- [ ] Is "The workout tracker is the engine. The Legacy is the product." expressed in every section ordering and content decision?

---

*Forge Legacy Workouts Hub Wireframe Specification W-1 v1.1 — All decisions derived from the Phase 2A locked architecture, the Forge Legacy Master PRD, the Forge Legacy UX Framework v1.0, and the approved H-1, L-1, and L-3/L-4 wireframe specifications. This document is the authority for all Workouts Hub implementation in Phase 2B.*

*Amendment A: Architecture Amendment 001 (Program / Chapter Import) added the "Import Training" Secondary CTA to Section 5 (Log Activity Entry Point). All other W-1 decisions remain unchanged.*

*Amendment B: Post-architecture-review spec clarifications (June 2026). Three additions: (1) Quick-select chip minimum touch target specified as 8dp vertical padding to reach 44dp — no longer deferred to implementation. (2) Recent Workouts rows explicitly ordered newest first. (3) Program card "Brief Description" field capped at 40 characters. No structural changes, no product decisions altered.*

*Amendment C (W1-A1 — June 2026): W-18 Activity History is now a LOCKED spec (Phase 2B, June 2026). The "→ W-18" reference in §8.1 ("View All →" tertiary link) and all other W-18 references in this document are now fully backed by the locked W-18 specification. No W-1 decisions or content altered — this is a reference confirmation only.*
