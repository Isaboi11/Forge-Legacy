# Forge Legacy — Featured Legacy Moment Standards Document
## Selection Logic, Priority Hierarchy, and Implementation Rules
### Version 1.0 — June 2026 | LOCKED

---

## Section 1 — Purpose

The Featured Legacy Moment exists to answer one question: **"What is the most meaningful thing I have built recently?"**

It occupies the second position on the Legacy Hub (L-1), immediately below the Current Chapter Card. It is a single, curated card — not a list, not a feed, not a notification. It surfaces one event at a time and holds it.

**What the Featured Legacy Moment is:**
A system that prioritizes meaning over recency. It selects the single most significant event in the athlete's recent legacy and holds that event in a prominent position until something more significant replaces it or the active window expires.

**What the Featured Legacy Moment is not:**
- A feed of recent events (feeds are chronological, this is editorial)
- A most-recent-event system (recency is a tiebreaker, not the selection criterion)
- A notification system (notifications are transient, this is permanent and persistent)
- A social surface (this is the athlete's own record, not content from others)

**The core distinction this system enforces:**
The product rewards transformation, not activity. An athlete who completed a chapter 10 days ago and added a photo yesterday has transformed more meaningfully than they have been recently active. The Featured Legacy Moment shows the chapter completion. A recency-first system would show the photo. This distinction is foundational to Forge Legacy's identity.

---

## Section 2 — Selection Logic

The Featured Legacy Moment selection algorithm runs in this exact order:

**Step 1: Collect all eligible events.**
Gather all events from the athlete's full legacy history. All event types across all tiers are candidates.

**Step 2: Apply the Active Window filter.**
For Tier 1–3 events (Transformation, Significant Progress, Recognition): only events within the last 30 days are eligible. Events older than 30 days from today are excluded from selection.

For Tier 4–5 events (Reflection and Archive Artifacts): these are always eligible as fallbacks. They are not subject to the 30-day window as candidates for Featured Legacy Moment when no Tier 1–3 events exist within the window.

**Step 3: Select the highest-priority eligible event.**
From the pool of eligible events (those passing the Active Window filter), select the event belonging to the highest priority tier. Within that tier, if multiple events exist, select the most recent.

**Step 4: If no Tier 1–3 events exist in the active window:**
Fall through to the most recent Tier 4–5 event across all time. No active window applies to this fallback. Select the most recent event from Tier 4 or Tier 5, in tier order.

**Step 5: If no events of any type exist:**
The Featured Legacy Moment section is omitted from L-1. No empty state, no placeholder. The section does not appear until a qualifying event exists.

**The algorithm in plain language:**
> Look at everything meaningful that happened in the last 30 days. Show the most meaningful thing. If multiple things of equal meaning, show the most recent. If nothing meaningful has happened in 30 days, show the most recent trace of legacy activity — a reflection, a memory, a photo. If nothing exists at all, show nothing.

---

## Section 3 — Priority Hierarchy

### Tier 1 — Transformation Events
*These events represent a completed period of the athlete's life or a declared achievement of purpose. They are the rarest and most significant events in the product.*

| Priority | Event | Trigger |
|----------|-------|---------|
| 1 | Chapter Sealed | Athlete seals an active chapter via the completion flow |
| 2 | Goal Achieved | Athlete's primary chapter goal reaches its completion condition |
| 3 | Rank Up | Athlete's Legacy Score crosses a rank or sub-tier threshold |

**Definition of Tier 1:** Events that alter the athlete's identity within Forge Legacy. A chapter sealed closes a period of athletic life. A goal achieved fulfills the declared purpose of a chapter. A rank-up marks a threshold of total legacy depth. These events are not reversible and do not repeat on the same object — you seal a chapter once, achieve a goal once, reach a rank tier once. That permanence is what earns them Tier 1.

**Reflection display rule:** When Chapter Sealed is the Featured Legacy Moment and a reflection was written at the L-6 Chapter Reflection flow, the Featured Legacy Moment card includes the reflection excerpt (first ~120 characters). Reflection presence does not alter priority or tier. A chapter sealed without a reflection is still Tier 1, Priority 1. The excerpt is an additive display element only. See Featured Legacy Moment / Sealed Chapter Amendment 001 (June 2026).

**Active window:** 30 days from event date.

---

### Tier 2 — Significant Progress Events
*These events represent the completion of a structured commitment within a chapter. They have real weight but are contained within the chapter's story rather than concluding it.*

| Priority | Event | Trigger |
|----------|-------|---------|
| 4 | Program Graduation | Athlete completes the final workout in an enrolled program |
| 5 | Major Accomplishment | Athlete adds a user-declared accomplishment (name + date) |

**Definition of Tier 2:** Events that complete something the athlete committed to. A program graduation means following a structured plan to its end. A major accomplishment means declaring a real-world achievement. Both require intention and completion. They are less transformative than closing a chapter but more significant than a single milestone.

**Active window:** 30 days from event date.

---

### Tier 3 — Recognition Events
*These events represent the product recognizing the athlete's cumulative effort. They are meaningful but reactive — they happen to the athlete in response to behavior rather than being initiated by the athlete.*

| Priority | Event | Trigger |
|----------|-------|---------|
| 6 | Honor Earned | System awards an honor based on a milestone threshold |

**Definition of Tier 3:** System-generated recognition. The athlete did not initiate this event — the product recognized them. Honors are meaningful, but they are the product's voice, not the athlete's. They rank below events where the athlete actively completed or declared something.

**Active window:** 30 days from event date.

---

### Tier 4 — Reflection Events
*These events represent the athlete adding meaning to the archive. They are acts of curation and memory rather than achievement.*

| Priority | Event | Trigger |
|----------|-------|---------|
| 7 | Reflection Added | Athlete adds a reflection post-sealing via L-4 "Add Reflection →" flow (Path B only — NOT triggered when reflection is written during the M-5 → L-6 sealing flow, where "Chapter Sealed" Priority 1 already fires) |
| 8 | Memory Added | Athlete adds a memory (photo or note) to an already-archived chapter |

**Definition of Tier 4:** Acts of authorship. The athlete is not completing something — they are enriching the archive with meaning after the fact. A memory added to a sealed chapter is the product principle "Memories can be added; history cannot be rewritten" expressed as an action. These are reflective rather than achievement-oriented.

**Path B scope note (FLM-A2):** Priority 7 fires ONLY when the athlete adds a reflection via the L-4 post-sealing "Add Reflection →" path (L-4 → L-6). It does NOT fire when the athlete writes a reflection as part of the initial chapter-sealing flow (M-5 → L-6), because "Chapter Sealed" (Priority 1) already fires at that moment. Firing both Priority 1 and Priority 7 for the same sealing action is redundant and would inappropriately elevate reflections written at sealing time above reflections written post-sealing.

**Active window rule for Tier 4:** Tier 4 events function as fallbacks when no Tier 1–3 events exist within the 30-day active window. When serving as the Featured Legacy Moment, the most recent Tier 4 event across all time is selected — no active window applied to the fallback selection itself.

---

### Tier 5 — Archive Artifacts
*These events represent the athlete adding physical content to the archive. They are the most common events and the least transformation-significant.*

| Priority | Event | Trigger |
|----------|-------|---------|
| 9 | Photo Added | Athlete adds a photo to any chapter (active or archived) |

**Definition of Tier 5:** Content additions. Photos enrich the archive and are emotionally valuable, but adding a photo is a routine action — not a transformation. Many athletes may add photos frequently. Making photo additions the selection criterion would turn Featured Legacy Moment into a photo feed, which is precisely what it must not become.

**Active window rule for Tier 5:** Same as Tier 4. Functions as fallback only. Most recent event selected across all time when serving as Featured Legacy Moment.

---

## Section 4 — Active Window Rules

### 4.1 The 30-Day Window

Tier 1, 2, and 3 events are eligible for Featured Legacy Moment selection for **30 calendar days** from the date the event occurred.

**Window opens:** The day the event occurs (day 0).
**Window closes:** 30 calendar days later, at the start of the 31st day (day 30 included, day 31 excluded).

**Why 30 days:**
30 days is long enough for a transformation event (a completed chapter, an achieved goal) to maintain its Featured position even when the athlete is actively logging workouts, adding photos, and accumulating lower-priority events. It is short enough that the system eventually refreshes — an athlete who completed a chapter 8 months ago and has been inactive since should not see that completion indefinitely. 30 days balances preservation of meaningful moments against the eventual need for the system to reflect current reality.

### 4.2 Priority Wins Within the Active Window

During the 30-day active window, **priority always wins over recency**. An event that occurred 25 days ago but is Tier 1 takes precedence over an event that occurred today at Tier 3. The window defines eligibility; priority defines selection.

```
Day 0:  Chapter Sealed              [Tier 1, Priority 1] ← Selected
Day 3:  Program Graduated              [Tier 2, Priority 4]
Day 10: Honor Earned                   [Tier 3, Priority 6]
Day 18: Photo Added                    [Tier 5, Priority 9]

Day 25: Chapter Sealed is still Selected — it is still within window, still highest priority
```

### 4.3 Window Expiry and Replacement

When a Tier 1–3 event's 30-day window expires:

**If a newer Tier 1–3 event exists and is within its own active window:** That event becomes the Featured Legacy Moment (following priority order among active events).

**If no Tier 1–3 event exists within its active window:** The system falls through to the most recent Tier 4 or Tier 5 event (Section 4.4).

**There is no visual indication of window status on L-1.** The athlete never sees "expires in X days" or any countdown. The window is a system rule, not a UI element. The Featured Legacy Moment simply updates when the algorithm produces a new result.

### 4.4 Post-Window Fallback

When no Tier 1–3 events are active within the 30-day window, the Featured Legacy Moment falls back to the most recent legacy artifact:

**Fallback selection order:**
1. Most recent Reflection Added (Tier 4)
2. Most recent Memory Added (Tier 4)
3. Most recent Photo Added (Tier 5)

No active window applies to the fallback. These events are selected from the athlete's full history. If the most recent photo was added 6 months ago, that photo is the Featured Legacy Moment until a Tier 1–3 event re-enters the active window.

**Why fallback events keep the section alive:**
The Legacy tab must feel alive and active even for athletes who are mid-chapter and have not recently achieved a major milestone. Showing a reflection or memory in the fallback state communicates: "Your archive is here. You are building something." The alternative — omitting the section whenever no major event is recent — would make the Legacy tab feel empty for athletes who are doing exactly what the product wants them to do: working through a chapter, making progress toward a goal, without having completed anything yet.

**The fallback is always the most recent artifact, not the most significant.** In fallback state, recency is the selection criterion because there is no transformation hierarchy to apply. The system is in a "showing signs of life" state, not a "this is your most meaningful achievement" state.

---

## Section 5 — Tie-Breaker Rules

### 5.1 The Tiebreaker Condition

A tie exists when two or more events share the same priority level and both fall within the active window.

**Tie-breaker rule: Most recent event wins.**

```
EXAMPLE — Goal Achieved Tie:
Monday:   Goal Achieved: "Deadlift 400 lbs"          [Priority 2, Day -10]
Friday:   Goal Achieved: "Run a 5K Under 30 Min"     [Priority 2, Day -4]

Result: Friday's "Run a 5K Under 30 Min" is Featured Legacy Moment.
Reason: Same tier, same priority level. Most recent wins.
```

### 5.2 Same-Day Tiebreaker

If two events of the same priority level occur on the same calendar day (e.g., two honors earned in the same session), the system selects the event that was recorded later in that session (later timestamp).

### 5.3 Same-Tier, Same-Day, Different-Priority Events

If two events are in the same tier but at different priority levels, the higher priority (lower number) wins regardless of recency.

```
EXAMPLE:
Day 0, 2:00 PM:  Goal Achieved (Priority 2)
Day 0, 4:00 PM:  Rank Up (Priority 3)

Result: Goal Achieved (Priority 2) is Featured Legacy Moment.
Reason: Higher priority wins. Same-day recency does not override priority.
```

### 5.4 Tier-Crossing Rule

Events from different tiers never tie. Tier always wins over recency when crossing tier boundaries.

```
EXAMPLE:
Day -28: Chapter Sealed (Tier 1 — within 30-day window)
Day -1:  Program Graduated (Tier 2 — within 30-day window)

Result: Chapter Sealed (Tier 1) is Featured Legacy Moment.
Reason: Tier 1 > Tier 2. Recency is irrelevant when tiers differ.
```

---

## Section 6 — Edge Cases

### 6.1 No Events of Any Type

**Condition:** Brand-new athlete. No workouts logged, no chapter created, no photos added. No events of any type in their legacy history.

**Behavior:** The Featured Legacy Moment section is omitted from L-1 entirely. No empty state, no placeholder, no invitation copy. The section does not exist on screen until the athlete's first qualifying event of any tier.

**Why omit rather than empty-state:** The Featured Legacy Moment section's purpose is to show what the athlete has built. An athlete who has not yet built anything has nothing to show. An empty state would misrepresent the section as a container waiting to be filled, when it is actually a curation of what exists.

---

### 6.2 Only Tier 5 Events Exist (Photos Only, No Milestones)

**Condition:** Athlete has logged workouts, added photos, but has no completed chapters, no achieved goals, no rank-ups, no program graduations, no honors.

**Behavior:** Featured Legacy Moment shows the most recently added photo (Tier 5 fallback). Section is present, minimal in meaning-weight, but alive.

**Practical occurrence:** This state is rare for any active user. First workout triggers the first honor. Completing any program triggers graduation. The system is designed so normal usage quickly produces higher-tier events.

---

### 6.3 Rank Up Occurring Simultaneously With Chapter Sealing

**Condition:** Athlete seals a chapter. The chapter sealing pushes their Legacy Score past a rank threshold. Both "Chapter Sealed" (Priority 1) and "Rank Up" (Priority 3) occur at the same moment.

**Behavior:** Chapter Sealed is the Featured Legacy Moment. Rank Up exists in the event history and will become Featured Legacy Moment if Chapter Sealed exits the active window first and Rank Up is still within its own 30-day window.

**Why:** Priority 1 > Priority 3. Simultaneous occurrence does not change priority resolution.

---

### 6.4 Goal Achieved and Chapter Sealed in the Same Session

**Condition:** Athlete achieves their primary goal. The goal achievement triggers chapter sealing (athlete seals the chapter in the same session).

**Behavior:** Chapter Sealed (Priority 1) is the Featured Legacy Moment. Goal Achieved (Priority 2) exists in the event history and is eligible for Featured Legacy Moment if Chapter Sealed exits the active window first and Goal Achieved is still within its 30-day window.

**Note:** In this scenario, both events have the same occurrence date. The Chapter Sealed event is the culminating event (it comes after goal achievement in the flow). It takes priority 1.

---

### 6.5 30-Day Window Expiry With No Replacement Event

**Condition:** Athlete completed a chapter 31 days ago. Since then, they have logged workouts but no new milestones.

**Behavior:** The Chapter Sealed event exits the active window. No Tier 1–3 events are active. The system falls through to the most recent Tier 4 event. If no Tier 4 event exists, falls through to most recent Tier 5. If the athlete has no Tier 4 or Tier 5 events at all, the Featured Legacy Moment section is omitted.

---

### 6.6 Very Active Athlete — Many Events in Active Window

**Condition:** Athlete has completed a chapter (Day -5), achieved a goal (Day -3), graduated a program (Day -8), and earned three honors (Days -1, -2, -4) all within the 30-day window.

**Behavior:** Chapter Sealed (Priority 1, Day -5) is the Featured Legacy Moment. All other events exist in the history and are eligible to become Featured Legacy Moment in priority order as higher-priority events exit the window.

**The queue:** When Chapter Sealed (Day -5) exits the window on Day 25, Goal Achieved (Day -3, Priority 2) becomes the next Featured Legacy Moment.

---

### 6.7 New Chapter Started Immediately After Previous Chapter Sealing

**Condition:** Athlete completes Chapter 3 (Day 0) and immediately creates Chapter 4 (Day 0).

**Behavior:** Chapter Sealed (Chapter 3) is the Featured Legacy Moment. The act of creating a new chapter is not a qualifying Featured Legacy Moment event. "Chapter Started" is a timeline entry but not a featured moment event type.

**Rationale:** Chapter creation is the beginning of a story, not the completion of one. The Featured Legacy Moment system celebrates completions and transformations. The opening of a new chapter is accounted for by the Current Chapter Card (Tier 1 Feature Card at the top of L-1).

---

### 6.8 Honor Earned With Active Tier 1–2 Events Also Present

**Condition:** Athlete earned an honor today (Tier 3). They also completed a program 12 days ago (Tier 2, within window) and completed a chapter 20 days ago (Tier 1, within window).

**Behavior:** Chapter Sealed (Tier 1) is the Featured Legacy Moment. The system works backward through priority, not forward through time. The most meaningful thing in the window is always shown.

---

### 6.9 Memory Added to a Very Old Archived Chapter

**Condition:** Athlete is in Chapter 6. They navigate to archived Chapter 2 and add a memory (photo + note). No recent Tier 1–3 events exist within the active window.

**Behavior:** Memory Added (Tier 4) becomes the Featured Legacy Moment. The display shows the chapter context of where the memory was added and the date the memory was added — not the original chapter date.

**Why this behavior is correct:** The act of adding a memory to an old chapter is itself a legacy moment — the athlete is actively tending to their archive.

---

### 6.10 Athlete Returns After a Long Absence (> 30 Days of No Activity)

**Condition:** Athlete was active through Chapter 3 (completed 60 days ago). Returns today after a 55-day absence.

**Behavior:** Chapter Sealed (60 days ago) is outside the 30-day active window. If no Tier 4–5 events exist, Featured Legacy Moment is omitted on return. The athlete's full history remains accessible via the Timeline.

**Why the app does not show stale events indefinitely:** The 30-day window prevents showing a chapter completion from 60 days ago as "current." Staleness would misrepresent the system's purpose.

---

### 6.11 Workout With Friend

**Condition:** An athlete logs a Workout With Friend session with a squad member.

**Behavior:** Workout With Friend events are not Featured Legacy Moment candidates for either athlete. They are Squad Activity events that appear in the Squad Activity Feed (S-2). The partner's workout is not the athlete's Featured Legacy Moment.

**Rationale:** Featured Legacy Moment is about the athlete's own transformational arc. Squad presence lives in the Squads system.

---

## Section 7 — Example Scenarios

### Scenario A: Standard Progression

**Event history:**
- Program Graduated 35 days ago (Tier 2 — outside 30-day window)
- Honor Earned: 10 Workouts in Chapter — 8 days ago (Tier 3 — within window)
- Photo Added — 2 days ago (Tier 5)

**Selection:** Honor Earned (Tier 3, Day -8).
**Featured Legacy Moment shows:** "HONOR EARNED — 10 Workouts in Chapter · [Date]"
**Why:** Tier 3 > Tier 5. Recency of the photo does not override the honor's higher tier.

---

### Scenario B: Priority Defeats Recency

**Event history (all within 30-day window):**
- Chapter Sealed — 10 days ago (Tier 1)
- Photo Added — 9 days ago (Tier 5)
- Photo Added — 5 days ago (Tier 5)
- Photo Added — yesterday (Tier 5)

**Selection:** Chapter Sealed (Tier 1, Day -10).
**Featured Legacy Moment shows:** "CHAPTER SEALED — Chapter 4: The Rebuild · [Date]"
**Why:** Tier 1 > Tier 5. Three recent photos do not displace a chapter completion inside its active window.

---

### Scenario C: Tiebreaker Within Tier

**Event history:**
- Program Graduated: "Beginner Strength v1.0" — 18 days ago (Tier 2, Priority 4)
- Program Graduated: "5/3/1 Strength v2.0" — 6 days ago (Tier 2, Priority 4)

**Selection:** "5/3/1 Strength v2.0" (Day -6). Tiebreaker: most recent wins within same tier.

---

### Scenario D: Window Expiry Cascade

**Event history:**
- Day -28: Goal Achieved (Tier 1) — exits window on Day +2
- Day -15: Program Graduated (Tier 2) — exits window on Day +15
- Day -3: Honor Earned (Tier 3) — exits window on Day +27

**Today:** Goal Achieved is Featured Legacy Moment.
**Day +2:** Goal Achieved exits. Program Graduated becomes Featured Legacy Moment.
**Day +15:** Program Graduated exits. Honor Earned becomes Featured Legacy Moment.
**Day +27:** Honor Earned exits. Fallback activates.

---

### Scenario E: The Fallback State

**Event history:**
- Most recent Tier 1–3 event: Chapter Sealed, 45 days ago (outside window)
- Most recent Tier 4 event: Reflection Added, 40 days ago
- Most recent Tier 5 event: Photo Added, 3 days ago

**Selection:** Photo Added (Tier 5, Day -3) — most recent Tier 4–5 event.
**Why:** In fallback mode, recency drives selection across tiers.

---

### Scenario F: First Major Milestone

**Event history (before today):**
- Honor Earned: "First Step" — Day -10 (Tier 3)
- Honor Earned: "5 Workouts Logged" — Day -1 (Tier 3)

**Today:** Goal Achieved: "Run a Mile Without Stopping" — Day 0 (Tier 1)

**Selection:** Goal Achieved (Tier 1, Day 0). Immediately displaces all previous events.
**Featured Legacy Moment shows:** "GOAL ACHIEVED — Run a Mile Without Stopping · Today"

---

## Section 8 — UX Rationale

### 8.1 Why a Single Curated Moment, Not a List

Showing a single Featured Legacy Moment is an editorial act. The product is saying: "Out of everything in your legacy, this is what matters most right now." A list removes that editorial voice. One moment, presented with authority, produces an emotional response. A list produces a review.

### 8.2 Why Priority Over Recency

Chronological order is the absence of editorial judgment — it treats all events as equivalent and lets time be the arbiter. Forge Legacy's identity is built on the principle that transformation is more valuable than activity. A system that prioritizes a chapter completion over a photo addition embodies that principle in its behavior, not just in its copy.

An athlete who sees their chapter completion featured — even when it is 10 days old — receives the message: "The product remembers what mattered, not just what was recent."

### 8.3 Why 30 Days

**Need 1:** Transformation events should hold their featured position long enough to matter. A chapter completion should not be displaced the next day by a photo. 30 days gives major milestones a meaningful tenure.

**Need 2:** The Legacy tab must eventually reflect the present. An athlete who is actively training 45 days after their last milestone should eventually see something current.

30 days is the balance point. Long enough to be meaningful, short enough to stay current.

### 8.4 Why the Fallback Keeps the Section Alive

An athlete mid-chapter, working toward a goal, not yet at the finish line — that is the core use case, not an edge case. The fallback keeps the Featured Legacy Moment section present for these athletes, communicating: "Your archive is active. You are building." The fallback is a trace of activity, not a major milestone. It holds the space for the next transformation.

### 8.5 Why the Section Is Omitted for New Athletes

An empty state for the Featured Legacy Moment would require copy that either invites action ("Start building your legacy") — turning a reflection section into a call-to-action — or explains an absence ("No legacy moments yet") — which is evaluative. Neither is correct. The cleanest solution is to not show the section until there is something genuine to show.

### 8.6 Why Workout With Friend Is Not a Featured Legacy Moment Event

Training with a partner is meaningful, but not transformational in the Featured Legacy Moment sense. Including it would blur the semantic distinction between "what I have built" (Legacy) and "who I have trained with" (Squad). Workout With Friend belongs in Squad Activity.

---

## Section 9 — Mission Alignment

### 9.1 The Product Rewards Transformation, Not Activity

The selection algorithm literally weights transformation over activity: a chapter completed 25 days ago outranks a photo added yesterday. Every time an athlete opens the Legacy tab and sees their chapter completion featured rather than their most recent photo, the product communicates: "I know the difference between what you did and what you built."

### 9.2 Every Legacy Starts With a Foundation

The first Featured Legacy Moment any athlete sees will be a Tier 3 event — a first honor earned — or a Tier 4 event. The system does not demand a chapter completion to produce a Featured Legacy Moment. Foundation-level athletes have their milestones recognized from the beginning.

### 9.3 Memories Can Be Added, History Cannot Be Rewritten

The Memory Added event (Tier 4) as a Featured Legacy Moment event type directly implements this principle. An athlete who adds a memory to a sealed chapter is recognized for tending to their archive. The athlete is not rewriting history — they are enriching it. The Featured Legacy Moment system honors both behaviors.

### 9.4 Never Charge For History

The Featured Legacy Moment system does not differentiate between free and premium athletes. The selection algorithm is identical for both tiers. Every qualifying event from every chapter is eligible regardless of subscription status. History belongs to the athlete. The algorithm that surfaces it is not a premium feature.

### 9.5 The Legacy Is the Product

The Featured Legacy Moment is the product saying: "This is what you have built. This is what your training has become." It is curation. It is the product holding up a mirror.

An app that shows you your most recent workout as its featured moment is a workout logger. An app that shows you your chapter completion — from 10 days ago, over all the activity since — is a Legacy product.

The Featured Legacy Moment system, implemented faithfully, is the single most direct expression of that difference.

---

## Appendix — Quick Reference

### Selection Algorithm Summary

```
1. Has any Tier 1–3 event occurred in the last 30 days?
   YES → Show highest-priority event (lowest number wins)
          Within same priority level → most recent wins
   NO  → Has any Tier 4 or Tier 5 event ever occurred?
          YES → Show most recent Tier 4 event
                If no Tier 4 → show most recent Tier 5 event
          NO  → Omit Featured Legacy Moment section
```

### Priority Tier Reference

| Tier | Priority | Event |
|------|----------|-------|
| 1 | 1 | Chapter Sealed |
| 1 | 2 | Goal Achieved |
| 1 | 3 | Rank Up |
| 2 | 4 | Program Graduation |
| 2 | 5 | Major Accomplishment |
| 3 | 6 | Honor Earned |
| 4 | 7 | Reflection Added |
| 4 | 8 | Memory Added |
| 5 | 9 | Photo Added |

### Active Window Reference

| Tier | Active Window | Fallback Eligibility |
|------|--------------|---------------------|
| 1–3 | 30 days | Primary selection only |
| 4–5 | No window | Fallback only (all time) |

### Tie-Breaker Reference

| Condition | Rule |
|-----------|------|
| Same tier, different priority | Lower priority number wins |
| Same tier, same priority | Most recent event wins |
| Same day, same tier, same priority | Latest timestamp wins |
| Different tiers | Higher tier (lower number) always wins regardless of date |

---

*Forge Legacy Featured Legacy Moment Standards Document v1.0 — This document is locked. All implementation decisions regarding the Featured Legacy Moment selection system must conform to the rules defined here. Changes to this document require explicit product approval and must be versioned. This is the authority for all L-1 Featured Legacy Moment implementation in Phase 2B and beyond.*

---

**Amendment FLM-A2 — Reflection Added Trigger Scoped to Path B | June 2026**
Priority 7 "Reflection Added" trigger updated to clarify it fires only on the post-sealing reflection path (L-4 → L-6, "Path B"). The M-5 → L-6 sealing-flow reflection path ("Path A") is excluded because "Chapter Sealed" Priority 1 already fires at that moment. Authorized as part of the Phase 2B batch closure amendment set.
