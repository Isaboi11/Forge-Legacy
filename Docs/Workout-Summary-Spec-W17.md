# Forge Legacy — Workout Summary & Completion Experience Specification
## W-17 | Phase 2B | Version 1.1 — June 2026

---

## Preamble: The Transition

The workout is finished. The work happened.

W-17 is the moment where execution becomes preservation. The athlete crossed from the engine room to the archive. What they did in the last hour will now live in their chapter, their legacy, and their history for as long as they choose to keep it.

W-17 answers two questions:

**"What happened?"** — a clear, calm record of the session just completed.

**"Where does this go?"** — a confirmation that this effort has been claimed by the chapter it was building.

W-17 is not a celebration. Forge Legacy does not celebrate activity. W-17 is a quiet acknowledgment that work was done, that it mattered, and that it belongs now to something larger than a single session.

**The athlete should leave W-17 feeling:** "This work now belongs to my legacy."

Not accomplished. Not rewarded. Settled.

The transition from execution to preservation is not dramatic. It is clean. The screen should be calm enough that the athlete who glances at it for thirty seconds and taps "Done" has seen everything they need. The athlete who lingers for two minutes should find depth — chapter impact, program progress, partner context, notes — without noise.

W-17 is the first screen in Forge Legacy that is neither execution nor pure reflection. It stands between both and belongs to both.

---

## Section 1 — W-17 Goals

W-17 exists to accomplish four things:

1. **Close the session** — confirm the workout record and give the athlete a clean exit from the workout context
2. **Claim the work for the chapter** — show the athlete that their effort has been attributed and that the chapter is now different because of this session
3. **Advance the program** — surface the program's updated position so the athlete leaves knowing where they stand
4. **Open the reflection window** — provide the natural moment to add a partner, review notes, or step into the chapter for deeper context

**What W-17 answers:**
- What did I complete today?
- Which chapter does this session belong to?
- Did my program advance? To what position?
- Who did I train with, if anyone?
- What notes did I add?
- Where do I go from here?

**What W-17 does NOT answer:**
- How does this compare to my last session?
- Am I improving?
- How many calories did I burn?
- What is my total training volume this week?
- What are others doing?

**Why this scope:**
W-17 is the closing of one session, not the opening of a review cycle. Comparisons, trends, and analytics belong in L-3 Chapter Detail where the athlete explicitly chooses to examine their progress. W-17 serves the athlete who just trained and wants to close the loop. It does not serve the data enthusiast mining their history — that is W-18 and W-19's job.

**Supporting the mission:**
"The workout tracker is the engine. The Legacy is the product." W-17 is the moment the engine hands its output to the legacy. Every element of W-17 is designed to express that handoff — the chapter receives the work, the program records the session, and the athlete confirms the transfer and moves on.

---

## Section 2 — Information Hierarchy

W-17 inverts the hierarchy of W-9 through W-16. During the workout, Tier 1 was "what to do next." On W-17, Tier 1 is "where this effort went."

**TIER 1 — Chapter Attribution (where this effort belongs)**
The chapter that received this workout. This is the first thing the athlete sees on W-17. Not the set count. Not the weight. The chapter. Because the chapter is the product. The workout is material for building it.

**TIER 2 — Session Summary (what happened)**
A calm, scannable record of the session. Exercises, sets, and the key data for each. For cardio: activity, duration, distance. Not analytics. Not volume totals. The record of what was done.

**TIER 3 — Program Progress (what advanced)**
If the session was program-driven: the program's updated position. Clear, compact. The athlete sees exactly where they are in the program without needing to navigate elsewhere.

**TIER 4 — Partner Context (who was there)**
Workout With Friend tagging. Optional. Calm. The moment to record who trained alongside. Not a social feed. Not a sharing prompt. A clean, optional record of presence.

**TIER 5 — Session Notes (reflection)**
Exercise notes and workout-level notes from the session. Reviewable, editable, addable here. The post-workout reflection window.

**Tier 6 — Navigation (where to go next)**
"Done" returns to W-1. "View in Chapter" opens L-3 for deeper context. Secondary paths available but not prominent.

**Hierarchy principle:**
The chapter leads because Forge Legacy is Legacy First. An athlete who only looks at Tier 1 before tapping "Done" has confirmed the most important thing: their work has been preserved. Every subsequent tier provides depth for the athlete who wants it.

---

## Section 3 — Full Screen Wireframe Structure

W-17 restores the Top App Bar and Bottom Tab Bar. The active workout is complete. The full-screen workout mode ends at W-17. Normal navigation context is restored.

Back gesture from W-17 navigates to W-1. The active workout screen has been removed from the navigation stack; back does not return to the session.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  [←]   Workout Summary                                  │  ← Top App Bar (restored)
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Building →                                     │   │  ← Chapter Attribution Card
│  │  Chapter 3: The Rebuild                         │   │    [Tier 1 — prominent]
│  │                                                 │   │
│  │  This session belongs to your chapter.          │   │
│  │                                                 │   │
│  │  315lb Squat                          67%       │   │  ← Goal + updated %
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  SESSION SUMMARY                    [Tier 2]    │   │  ← Workout Summary Card
│  │  Upper Body A  ·  Strength  ·  Jun 9            │   │
│  │  Duration  1h 04m                               │   │
│  │  ─────────────────────────────────────────────  │   │
│  │  WARM-UP                                        │   │  ← Section label (if warm-up had exercises)
│  │  Light Row       2 sets  ·  45 lb × 12          │   │
│  │  MAIN WORKOUT                                   │   │  ← Section label
│  │  Bench Press     5 sets  ·  95 lb × 5           │   │
│  │  Squat           5 sets  ·  135 lb × 5          │   │
│  │  Barbell Row     3 sets  ·  85 lb × 5           │   │
│  │  [+ 2 more  ↓]                                  │   │  ← Collapsed exercise rows
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  PROGRAM PROGRESS               [Tier 3 — cond] │   │  ← Program card (conditional)
│  │  Stronglift 5×5                                 │   │
│  │  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  10 of 16                │   │
│  │  Next: Lower Body A                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  WHO TRAINED WITH YOU?          [Tier 4 — opt]  │   │  ← WwF tagging (optional)
│  │  [  + Tag a training partner  ]                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  SESSION NOTES                  [Tier 5 — opt]  │   │  ← Notes section
│  │  Bench Press: Felt strong. Try 100 lb next.     │   │
│  │  [+ Add session note]                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [              Done              ]                     │  ← Primary CTA → W-1
│                                                         │
│  [      View in Chapter      ]                          │  ← Secondary → L-3
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR (restored)                              │
└─────────────────────────────────────────────────────────┘
```

**Why the Tab Bar is restored on W-17:**
The active workout session has ended. Full-screen mode was appropriate for the execution context — the athlete needed focus and protection from accidental navigation. W-17 is a summary and reflection screen. Normal navigation context belongs here. The athlete who taps the Legacy tab from W-17 has not made an error; they have chosen to see their chapter immediately. That is a supported and meaningful path.

---

## Section 4 — Workout Summary Specification

### 4.1 Summary Card Anatomy

The Session Summary card is Tier 2. It confirms what happened in plain, scannable terms.

```
┌───────────────────────────────────────────────────────────┐
│  [Workout Name]  ·  [Activity Type]  ·  [Date]            │  ← Workout identity header
│  Duration  [elapsed time]                                  │  ← Session length
│  ─────────────────────────────────────────────────────    │
│  WARM-UP                                                   │  ← Section label (if warm-up had exercises)
│  [Exercise 1]   [N] sets  ·  [representative load]        │  ← Exercise row
│  MAIN WORKOUT                                              │  ← Section label
│  [Exercise 2]   [N] sets  ·  [representative load]        │
│  [Exercise 3]   [N] sets  ·  [representative load]        │
│  [+ X more  ↓]                                            │  ← Expand toggle if > 3 exercises
└───────────────────────────────────────────────────────────┘
```

**What appears:**
- Workout name: program workout name (e.g., "Upper Body A") or activity type for free workouts (e.g., "Strength")
- Activity type: always present (Strength, Run, Walk, etc.)
- Date: the date the session occurred
- Duration: elapsed session time from screen entry to "Save Workout" confirmation
- Section labels: if the workout had sections with exercises, section name labels (WARM-UP, MAIN WORKOUT, COOL-DOWN) appear as compact dividers between exercise groups. Labels appear only for sections that contained at least one logged exercise. Empty sections (plan had the section but no exercises were logged in it) produce no label and no placeholder.
- Exercise rows: for Strength and HIIT, each exercise listed with set count and representative load, grouped under their section label
- Expand toggle: if more than 3 exercises total, first 3 shown and the rest collapsed behind "[+ X more ↓]". The expand toggle operates on the flat exercise count — section labels are not counted toward the 3-exercise threshold.
- Single-section workouts (MAIN only): no section label displayed. The flat list format is preserved when there is only one section. Section labels add value when multiple sections exist; they add visual noise when only MAIN was used.

**Representative load:**
The exercise row shows a compact load summary — not a full per-set breakdown. "5 sets · 95 lb × 5" represents the most common set within the exercise. If sets varied significantly, the summary shows the range: "5 sets · 90–100 lb × 5." If the exercise was bodyweight: "5 sets · BW × 10."

**What does not appear:**
- Total volume (total lbs lifted, total reps across all exercises)
- Calorie estimate
- Average rest time
- Comparison to any prior session
- Personal record indicators ("✦ PR" or similar)
- Percentage change vs. last session

**Why duration appears:**
Duration is factual. The athlete spent time training. Showing the time is respectful — it acknowledges the cost of the effort without evaluating the quality. "1h 04m" is information. It is not judgment.

**Why total volume does not appear:**
Total volume (e.g., "2,750 lbs lifted") is an analytics metric that converts physical effort into an abstraction. It creates a gamification axis — the athlete optimizes for the number rather than the training. Forge Legacy measures transformation, not accumulation. Total volume belongs in analytics tools, not in a legacy-building product.

### 4.2 Cardio Activity Summary

For Run, Walk, Cycle, Swim, Yoga, HIIT, and Other:

```
┌───────────────────────────────────────────────────────────┐
│  [Activity Type]  ·  [Date]                               │  ← Identity header
│  Duration  [elapsed time]                                  │
│  Distance  [X km]  (if entered)                            │  ← Only if athlete entered a value
│  Laps  [N]  (Swimming only, if entered)                    │
│  Rounds  [N]  (HIIT only, if entered)                      │
└───────────────────────────────────────────────────────────┘
```

Cardio summaries are simpler by design. The session is summarized in 2–3 lines. Notes are available in the Notes section below.

### 4.3 Skipped Exercises

Exercises where no sets were logged appear in the summary as:
"[Exercise Name] — no sets logged"

This is factual. The exercise was in the program or was added but not executed. It appears in the record. It carries no shame indicator.

### 4.4 Partial Session Label

If the athlete saved via "Save & Exit" from the abandonment flow: a "Partial Session" label appears in the summary card header alongside the workout name. The rest of the card is identical. See Section 10 for full partial session behavior.

---

## Section 5 — Chapter Impact Specification

### 5.1 Chapter Attribution Card Anatomy

The Chapter Attribution Card is Tier 1 on W-17. It is the first thing the athlete sees. It is more prominent than its counterpart on W-1 — the chapter context card on W-1 is compact orientation. The chapter attribution card on W-17 is the emotional focal point of the screen.

```
┌───────────────────────────────────────────────────────────┐
│  Building →                                               │  ← Context label (same bronze treatment as W-1)
│  [Chapter Name]                                           │  ← Chapter name — larger than W-1 (20-22sp)
│                                                           │
│  This session belongs to your chapter.                    │  ← Attribution statement (13sp, secondary)
│                                                           │
│  [Primary Goal Name]                           [X%]       │  ← Goal + updated progress %
└───────────────────────────────────────────────────────────┘
```

Entire card tappable → L-3 Chapter Detail.

**What appears:**
- "Building →" context label — the chapter is still under construction. The session contributed to it. The arrow maintains the forward motion of the chapter context established on W-1.
- Chapter name — larger than W-1 treatment. This is the emotional headline of W-17. The chapter received the work. Its name is prominent.
- Attribution statement: "This session belongs to your chapter." — declarative, calm, permanent. This work cannot be taken back. It has been preserved.
- Primary goal name + current progress percentage

**What does not appear:**
- Goal progress bar — the percentage alone is appropriate for W-17. The full progress bar lives in L-3 Chapter Detail, where the athlete explicitly reviews progress.
- Secondary goals
- Chapter start date
- Workout count for the chapter
- "Your chapter grew by X%" — no delta language
- Celebration copy ("Crushing it!" or similar)

**Why "This session belongs to your chapter" is the attribution statement:**
This phrasing does three things simultaneously: (1) it confirms attribution clearly — this session, this chapter; (2) it uses ownership language — "belongs" communicates permanence and possession, not just logging; (3) it is calm — no exclamation point, no emoji, no performance. The athlete who trained hard and the athlete who trained lightly receive the same statement. The effort was theirs. It belongs to their chapter regardless of magnitude.

**Why the chapter name is larger on W-17 than on W-1:**
On W-1, the chapter context is orientation before execution — the athlete glances at it and moves to action. On W-17, the chapter is the destination of the effort — the athlete has arrived. The larger chapter name acknowledges that arrival. The visual hierarchy expresses the product hierarchy: execution serves the chapter, and on W-17, the chapter claims what it was owed.

### 5.2 Goal Progress on W-17

The goal progress percentage shown is the updated value reflecting this session's contribution. If the athlete logged a Strength session and made measurable progress toward their primary goal, the percentage is updated.

The percentage appears as a compact "[X%]" aligned to the right of the goal name — identical to the W-1 chapter context card format, but at the W-17 moment the value may have changed since the athlete last saw it on W-1.

**The athlete does not need to be told the previous percentage.** Forge Legacy does not present deltas ("up from 63%"). The athlete remembers what they saw on W-1. Seeing 67% on W-17 where they saw 63% this morning is its own quiet satisfaction — earned without the product performing it.

### 5.3 When No Active Chapter Exists

If the workout was logged without an active chapter:

```
┌───────────────────────────────────────────────────────────┐
│  This session has been saved.                             │  ← Simple, non-judgmental
│                                                           │
│  Your training builds your legacy.                        │  ← Invitation copy (same as W-1)
│  Start a chapter to give it a name.                       │
│                                                           │
│  [  Create a Chapter  →  ]                                │  ← Secondary CTA
└───────────────────────────────────────────────────────────┘
```

The session is saved. It exists in W-18 Activity History as uncategorized. The invitation to create a chapter is Secondary — never Primary. The athlete who saved a workout without a chapter made a valid choice. The product acknowledges the session first ("This session has been saved.") and then offers the chapter path as an enhancement, not a correction.

---

## Section 6 — Program Progress Update Specification

### 6.1 Program Progress Card Anatomy

Appears only when the session was launched as a program workout. Omitted entirely for free workouts — no empty state, no "you're not on a program" message.

```
┌───────────────────────────────────────────────────────────┐
│  [Program Name]                                           │  ← Program name, 16sp
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  10 of 16                         │  ← Updated progress bar + X of Y
│  Next: [Next Workout Name]                                │  ← Next prescribed workout
└───────────────────────────────────────────────────────────┘
```

**What appears:**
- Program name
- Updated progress bar — reflects the just-completed workout. If this was workout 9 before the session, the bar now shows 10 of 16.
- "Next: [Workout Name]" — the next prescribed workout in the program. The athlete sees immediately where they are going next. This is orientation, not pressure.

**What does not appear:**
- "Great progress!"
- Percentage complete of the program
- Projected completion date
- How this session compared to prior sessions in the program
- Any streak or consistency data

**Why "Next: [Workout Name]" appears:**
The athlete who just completed workout 10 of 16 is already thinking about workout 11. Surfacing the next workout name on W-17 eliminates one moment of "what's next?" on the next training day. It is not a prompt to train again — it is information. The athlete who closes the app immediately and comes back in three days will see the same "Next: Lower Body A" on their program card in W-1. W-17 previews what W-1 will say.

### 6.2 Program Progress Update Timing

Program progress updates before W-17 loads. The athlete sees the updated progress bar — 10 of 16, not 9 of 16 — immediately. There is no delay, no "saving progress..." indicator, no spinners. The update is synchronous with the session save.

### 6.3 Multiple Active Programs

If the athlete is enrolled in multiple programs but only one was the source of this workout session, only the active program's card appears. The other programs are not shown on W-17. Their progress is visible on W-1 and W-3.

W-17 shows what this session did. What other programs look like is W-1's job.

---

## Section 7 — Workout With Friend Tagging Specification

### 7.1 Tagging Section Anatomy

Post-workout partner tagging is the correct moment for Workout With Friend creation from the athlete's side. It appears as a calm, optional section on W-17.

```
┌───────────────────────────────────────────────────────────┐
│  Who trained with you today?                              │  ← Invitation question
│                                                           │
│  [  + Tag a training partner  ]                           │  ← Secondary CTA
└───────────────────────────────────────────────────────────┘
```

Tapping "+ Tag a training partner" opens the partner selection sheet:
- Squad member list (athletes in the athlete's squads)
- Search field for non-squad athletes

After selection: the tag is created (M-8 or M-9 fires depending on squad membership), and the section updates to show the tagged partner:

```
┌───────────────────────────────────────────────────────────┐
│  Trained with [Name]  ·  [Squad Name]           [×]       │  ← Tagged partner + remove
└───────────────────────────────────────────────────────────┘
```

The athlete can remove the tag before tapping "Done" using the [×] control.

### 7.2 Pre-Tagged Partner State

If the athlete initiated a Train Together session via S-2 → S-10, the partner was associated with the workout before it began. On W-17, the tagging section shows the pre-associated partner as already confirmed:

```
┌───────────────────────────────────────────────────────────┐
│  Trained with [Name]  ·  [Squad Name]                     │  ← Pre-tagged, confirmed
└───────────────────────────────────────────────────────────┘
```

No action required. No "Confirm partner" CTA. The pre-tag is the confirmation. The [×] remove option is still available if the athlete wants to remove the association.

### 7.3 Tagging Principles

- The tag fires M-8 (squad member) or M-9 (non-squad) when the athlete taps "Done" with a tagged partner, not at the moment of selection. This allows the athlete to add and remove tags freely on W-17 before committing.
- The tagged partner receives the appropriate notification after the athlete exits W-17 via "Done."
- The athlete does not receive confirmation that the partner accepted or declined the tag from within W-17. That result surfaces in W-1 when the partner responds.

### 7.4 Why Partner Tagging Is Here and Not in the Active Workout

Partner tagging is a reflection action — the recognition of shared presence. Reflection belongs after execution. During the workout, the athlete is working. W-17 is the first moment of reflection. This is the natural and correct place for the question "Who trained with me today?"

Forcing the question mid-workout or at the "Save Workout" confirmation would interrupt the flow at the wrong moment. W-17 is specifically designed for this kind of optional, calm addition to the session record.

### 7.5 Tagging Omission

If the athlete taps "Done" without tagging anyone, no WwF record is created for this session. No "You didn't tag a partner" message. No prompt to reconsider. The section simply closes. Absence of a tag is not a gap in the record — it is the truth.

---

## Section 8 — Notes Review Specification

### 8.1 Notes Section Anatomy

Exercise notes added during the workout are surfaced in the Notes section. The athlete can review, edit, and add here.

**If notes were added during the workout:**
```
┌───────────────────────────────────────────────────────────┐
│  Session Notes                                            │  ← Section label
│  ─────────────────────────────────────────────────────    │
│  Bench Press                                              │  ← Exercise name header
│  Felt strong. Shoulder stable at 95 lb.                   │  ← Note content (secondary text)
│  ─────────────────────────────────────────────────────    │
│  Workout note: Felt tired by the end. Left hip tight.     │  ← Workout-level note (if exists)
│  ─────────────────────────────────────────────────────    │
│  [+ Add session note]                                     │  ← Add workout-level note (if none)
└───────────────────────────────────────────────────────────┘
```

**If no notes were added:**
```
┌───────────────────────────────────────────────────────────┐
│  [+ Add session note]                                     │  ← Sole element
└───────────────────────────────────────────────────────────┘
```

**What appears:**
- Per-exercise notes: each exercise note appears under the exercise name. Only exercises with notes are shown.
- Workout-level note: if a workout note was added via "⋯ Options" during the session, it appears here with the label "Workout note:"
- "+ Add session note" CTA: always present. Tapping opens a notes sheet for adding a workout-level note.
- Exercise notes are tappable for editing — tapping opens the exercise notes sheet pre-populated with the existing note.

**What does not appear:**
- Exercise notes for exercises where no note was added
- "No notes for this session" empty state — if no notes exist, only "+ Add session note" appears. Silence is preferable to a placeholder.
- Prompts or suggestions for what to write

### 8.2 Note Editing on W-17

Notes edited on W-17 save immediately on "Save Note" confirmation within the notes sheet. The athlete does not need to tap "Done" to preserve note changes — notes are independent of the navigation exit action.

### 8.3 Note Visibility After W-17

Notes survive to:
- W-18 Activity History (workout row shows note indicator)
- W-19 Activity Detail (full notes visible)
- L-3 Chapter Detail (notes accessible from the workout entry in the chapter timeline)

---

## Section 9 — Save Behavior Specification

### 9.1 What Has Already Happened by the Time W-17 Loads

The primary save occurred in W-9 through W-16 at the "Save Workout" confirmation step. By the time the athlete sees W-17:
- The full session record is written to local storage
- Program progress has been updated
- Chapter record has been updated
- The active workout has been removed from the navigation stack

W-17 is a read-and-augment screen. The athlete reviews what was saved and can add to it (notes, partner tag). The core record is already preserved.

### 9.2 What W-17 Saves

Two types of additions are made on W-17:
1. **Partner tag:** fires when the athlete taps "Done" with a tagged partner
2. **Notes added/edited on W-17:** saved immediately on "Save Note" confirmation within the notes sheet

There is no "Save" button on W-17. There is no save state. The core session is already saved. Additions on W-17 save at the moment they are confirmed — incrementally, not deferred to "Done."

### 9.3 What "Done" Does

"Done" navigates the athlete to W-1. It does not save anything — saving has already happened incrementally. "Done" is a navigation action, not a save action.

If a partner tag was added and not yet fired (the athlete selected a partner but did not yet tap "Done"), the tag fires as part of the "Done" navigation event. This is the one action "Done" triggers beyond navigation.

### 9.4 Discarding vs. Abandoning on W-17

The athlete cannot discard a saved session from W-17. The session is complete and preserved. If the athlete needs to delete a session, that path is through W-19 Activity Detail (post-MVP consideration). W-17 has no "discard this workout" action.

---

## Section 10 — Partial Workout Summary Behavior

### 10.1 Entry into Partial W-17

The athlete arrives at W-17 via "Save & Exit" from the Abandonment Confirmation Sheet. The session contains sets logged up to the exit point.

### 10.2 Partial Session Label

The Workout Summary card shows a "Partial Session" label alongside the workout name:

```
│  Upper Body A  ·  Partial Session  ·  Strength  ·  Jun 9   │
```

This label is factual. It is not rendered in an error color. It is not followed by explanatory copy ("You left early"). It describes the type of record, not a failure.

### 10.3 Chapter Attribution Card in Partial Sessions

Identical to the full session Chapter Attribution Card. "This session belongs to your chapter." does not change based on whether the session was complete or partial. The athlete trained. The chapter holds that training. Partial training is real training.

### 10.4 Program Progress in Partial Sessions

The program progress card shows the **unchanged** position. If the athlete was on workout 9 of 16 and saved partial, the bar still shows 9 of 16. The card shows:

```
│  [Program Name]                                           │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  9 of 16                          │  ← Unchanged
│  Next: [Next Workout Name]                                │
│  Partial session — program position unchanged.            │  ← Informational note, secondary text
```

The informational note is factual. It explains without shaming. The athlete who saved a partial session knows why. The product confirms the mechanical consequence (position unchanged) without editorializing.

### 10.5 All Other Sections in Partial Sessions

WwF tagging, notes review, and navigation are identical to the full session W-17. A partial session is a complete record of what was done, even if what was done was less than what was prescribed.

---

## Section 11 — Program Workout Completion Behavior

### 11.1 Standard Program Completion

The most common case: the athlete completed a program workout, logged all or most prescribed sets, and saved. W-17 shows:
- Chapter Attribution Card with updated goal %
- Session Summary with the program workout name and exercise list
- Program Progress Card with the advanced position
- WwF tagging (optional)
- Notes section
- "Done" Primary and "View in Chapter" Secondary

Nothing unusual. The screen is calm and clear.

### 11.2 Program Workout With Skipped Exercises

If the athlete skipped one or more exercises (no sets logged for them), the Session Summary shows those exercises with "no sets logged" in secondary text. The Program Progress still advances. No warning, no notation that deviation occurred.

### 11.3 Program Graduation (Final Workout of Program)

When the completed session is the last workout of an active program, the Program Progress Card has a distinct state:

```
┌───────────────────────────────────────────────────────────┐
│  [Program Name]                                           │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  16 of 16                        │  ← Full bar
│  ✓  Complete                                              │  ← Completion indicator
└───────────────────────────────────────────────────────────┘
```

**What the graduation state shows:**
- Full progress bar (all segments filled)
- "✓ Complete" — compact, factual, calm. Not "Congratulations!" Not a badge. A mark.
- No "Find your next program" prompt on W-17. Program discovery belongs in W-2. W-17's job is to close this session, not to recruit the athlete into the next one.

**Why no celebration on graduation:**
Program completion is significant. Forge Legacy honors it — but with the right register. The graduation moment should feel earned and quiet, not gamified. A full progress bar and "✓ Complete" communicate exactly what happened: the program is done. The athlete already knows this is significant. The product does not need to perform significance back at them.

The graduation flow (M-4) surfaces in W-2 on the athlete's next visit to the programs section. That is the appropriate moment for program closure reflection.

### 11.4 Chapter Goal Reaches 100%

If the athlete's primary goal percentage reaches 100% as a result of this session, the Chapter Attribution Card shows:

```
│  Building →                                               │
│  [Chapter Name]                                           │
│                                                           │
│  This session belongs to your chapter.                    │
│                                                           │
│  [Primary Goal Name]                         100%         │
└───────────────────────────────────────────────────────────┘
```

No special treatment beyond the percentage. The athlete sees 100%. That is the milestone. Forge Legacy does not pop a confetti animation. The athlete's chapter has reached a declared goal — sealing the chapter is their choice, accessible via L-3. W-17 reports what happened; it does not prescribe what to do next.

---

## Section 12 — Free Workout Completion Behavior

### 12.1 Free Workout W-17

The athlete completed a free workout — not launched from a program. W-17 shows:
- Chapter Attribution Card with updated goal %
- Session Summary with the activity type and exercise list (no program workout name)
- **No Program Progress Card** (omitted; no empty state)
- WwF tagging (optional)
- Notes section
- "Done" Primary and "View in Chapter" Secondary

The absence of the Program Progress Card is correct behavior, not a gap. Free workout athletes are not on a program. There is no program position to report. The screen is slightly shorter and cleaner as a result.

### 12.2 Free Workout Workout Name

The Session Summary card header shows the activity type and date:
"Strength · Jun 9"

For free workouts, there is no program workout name. The activity type is the name. The athlete does not need to name their workouts manually — the activity type and date are sufficient context.

If the athlete wants to name their workout, that is a future consideration (Custom Workout Names — not in MVP scope). W-17 does not prompt for a name.

### 12.3 Chapter Attribution for Free Workouts

Free workouts are attributed to the active chapter identically to program workouts. The Chapter Attribution Card is identical. The copy "This session belongs to your chapter." does not distinguish between program and free workouts. The chapter received the effort regardless of how the workout was structured.

---

## Section 13 — Chapter Attribution Rules

### 13.1 Attribution Is Captured at Session Start

Chapter attribution is anchored to the chapter that was active when the athlete began the workout, not the chapter state when the session was saved. If a chapter was sealed mid-workout (from another device, or from L-3 in another tab), the session is still attributed to the chapter that was active at start time.

### 13.2 Sessions Without an Active Chapter

If no chapter was active when the workout began:
- The session is saved to W-18 Activity History with no chapter attribution
- The Chapter Attribution Card on W-17 shows the no-chapter state (Section 5.3)
- "Create a Chapter →" Secondary CTA is available but not prominent
- The session cannot be retroactively attributed to a chapter once saved. Attribution is immutable. This is by design — history cannot be rewritten.

### 13.3 Partial Sessions

Partial sessions are attributed to the chapter exactly as full sessions are. Training occurred. The chapter holds it. The "Partial" label describes the session structure, not its legitimacy as chapter material.

### 13.4 Session Attribution in L-3

After W-17, the session appears in L-3 Chapter Detail:
- In the chapter's workout history/timeline section
- Attributed to the chapter's time period
- With all notes, partner tags, and logged data accessible via W-19 Activity Detail

The athlete who taps "View in Chapter" from W-17 will see their session in L-3 within the chapter context immediately.

### 13.5 Chapter Goal Progress Calculation

Goal progress percentage shown on W-17 is calculated based on all logged sessions attributed to the chapter, including the just-completed session. The calculation methodology is defined in the PRD and L-3 spec — W-17 displays the result, it does not define the formula.

---

## Section 14 — Navigation Paths From W-17

### 14.1 Primary Path: Done → W-1

Tapping "Done" navigates to W-1 Workouts Hub. This is the expected exit for the majority of athletes after every session. They trained. They confirmed. They returned to base.

W-1 reflects the completed session immediately:
- Recent Workouts section shows the just-completed workout at the top
- Program progress bar (if applicable) reflects the updated count
- Chapter context card shows the updated goal percentage

### 14.2 Secondary Path: View in Chapter → L-3

"View in Chapter" navigates to L-3 Chapter Detail (Active state), where the athlete can see their workout in the full chapter timeline and context. This is the bridge between W-17's summary and the chapter's ongoing story.

The athlete who has sealed this chapter because the primary goal reached 100% and wants to review before sealing — this is the path. The athlete who wants to see their recent training in the context of the chapter arc — this is the path.

"View in Chapter" is Secondary class. It is available for the athlete who wants it. It does not compete with "Done."

### 14.3 Tertiary Path: Tab Bar Navigation

Because the Tab Bar is restored on W-17, the athlete can navigate to any tab directly:
- Legacy tab → L-1 Legacy Hub
- Squads tab → S-1 Squad Hub
- Profile tab → Profile modal

These are valid paths. The athlete who finishes a workout and immediately wants to see their Legacy Hub is making a natural and supported choice. They do not need to pass through "Done" first.

### 14.4 Back Gesture

Back gesture from W-17 navigates to W-1. The active workout is closed. Back does not re-enter the workout screen.

### 14.5 W-17 Is Not the Navigation Entry to W-18 or W-19

W-17 does not contain a "View full activity record" link to W-18 or W-19. The session is fresh. The full history is accessible via W-1 → W-18 at any time. W-17 is not a gateway to the activity archive — it is the closing of one session.

---

## Section 15 — Edge Cases

### 15.1 Chapter Sealed Between Workout Start and W-17

If the athlete sealed their chapter on another device or from another tab while the workout was in progress, the session is still attributed to the sealed chapter (attribution is captured at start). On W-17, the Chapter Attribution Card reflects the chapter name and the session attribution statement. The chapter's sealed status does not change W-17's presentation of the attribution — the session happened during the chapter's active period and belongs to it.

### 15.2 Program Graduation + Chapter Goal at 100% Simultaneously

If the last program workout also causes the chapter's primary goal to reach 100%, both states appear independently on W-17:
- Program Progress Card shows "✓ Complete" at 16 of 16
- Chapter Attribution Card shows the primary goal at 100%

Neither state triggers a special overlay or celebration screen. Both are presented in their respective sections with their standard formatting. The athlete experiences both milestones in the same quiet, factual register.

### 15.3 First-Ever Workout (First Session, No Prior History)

If this was the athlete's first logged session:
- Chapter Attribution Card: shows the chapter if one was created during onboarding, or the no-chapter state if not
- Session Summary: the single exercise, single set, or short cardio session is presented identically to any other session
- Program Progress: omitted unless the athlete was enrolled in a program during the first session
- WwF: absent (no squad context established yet — the tagging UI still appears but squad list is empty; search is available)
- Notes: standard
- "Done" returns to W-1, which now shows the first entry in Recent Workouts

No "Welcome to your first workout!" overlay. No onboarding celebration. The first session is a session. The product treats it accordingly.

### 15.4 Cardio Session With No Distance Entered

If the athlete completed a Run or Walk session but did not enter a distance, the Session Summary shows:
"Run · Jun 9 · Duration 24:13"

No distance field appears if no distance was entered. No "no distance recorded" label. The record contains what was entered. That is the record.

### 15.5 Long Session Summary (10+ Exercises)

The first 3 exercises are shown. The remainder are collapsed behind "[+ X more ↓]". The collapsed count is accurate — if there are 10 exercises, it shows "[+ 7 more ↓]". The athlete who wants to review all exercises expands the list. The athlete who is satisfied with the top-line glance does not need to scroll through all 10.

### 15.6 Session With Only Skipped Sets (No Data Logged)

An athlete who opened a workout, skipped every set, and tapped "End Workout" would normally be blocked by the minimum save requirement ("Log at least one set to save"). This edge case is prevented upstream. W-17 is not reachable with a zero-data session unless via a partial save — and a partial save also requires at least one logged set.

This edge case is handled in W-9–W-16 and does not reach W-17.

### 15.7 App Force-Quit After Save but Before W-17 Loads

If the app is force-quit after "Save Workout" was confirmed but before W-17 loads, the session is already in local storage (the save was synchronous). On next launch, the athlete sees the normal app state. W-17 does not appear on restart — that window has passed. The session is visible in W-18 Activity History and in W-1 Recent Workouts.

The partner tag was not yet fired (that fires on "Done"). If the athlete wanted to tag a partner, they would need to initiate that from the athlete's existing record via the partner tagging flow. This is an acceptable edge case given its rarity.

### 15.8 Network Lost Before Cloud Sync After Save

Session is in local storage. W-17 loads and displays correctly from local storage. The athlete completes W-17 (adds notes, possibly tags a partner) and taps "Done." All of this is local. Cloud sync queues and executes when connection restores. The athlete sees nothing about network state on W-17.

### 15.9 Partner Tagged Who Has No Forge Legacy Account

Athletes can be tagged by phone number or email (search flow) even if they haven't created a Forge Legacy account. The tag is queued. The notification (M-9) fires when/if the invitee creates an account. This is not a W-17 concern — the tagging section behaves identically. The downstream handling is a notification system concern.

### 15.10 HIIT Session With Zero Rounds Logged

If the athlete completed an HIIT session but the rounds counter was left at 0 (never tapped), the minimum save requirement for HIIT is elapsed time ≥ 60 seconds (same as cardio). The session saves with "Duration: 22:15 · 0 rounds logged." No prompt to correct this. The record is factual: rounds were not tracked. 

---

## Section 16 — Mobile UX Considerations

### 16.1 Tab Bar Restoration

The Tab Bar is visible on W-17. Full-screen workout mode ended when the workout was saved. Normal navigation is restored. The athlete can navigate to any tab from W-17 without passing through "Done" first. This is correct and supported behavior.

### 16.2 Scroll Depth

W-17 in full state (chapter card + summary + program + WwF + notes + CTAs):
Approximately 2.5–3 screen heights.

W-17 in minimal state (chapter card + summary + CTAs, no program, no partner activity, no notes):
Approximately 1.5 screen heights.

W-17 is a summary screen. The athlete should not need to scroll far to reach the "Done" CTA. The CTA is positioned at the bottom of the content — not sticky, but reachable after a brief scroll in the full state.

**Why "Done" is not sticky on W-17:**
On W-9 through W-16, "End Workout" was sticky because the athlete needed access at all scroll positions during a long, active session. W-17 is a summary with bounded content. The athlete will scroll through the content once. The "Done" CTA at the bottom of the content is the natural destination of that scroll. Stickying it would prioritize exit over content review.

### 16.3 Chapter Attribution Card Height

The Chapter Attribution Card is larger than the W-1 chapter context card:
- W-1 compact card: ~72–80dp (orientation before action)
- W-17 chapter attribution card: ~120–140dp (destination of effort)

The larger height is justified by the emotional weight of the moment. This is not a navigation element — it is a statement. The additional height allows the chapter name, attribution statement, and goal line to breathe without feeling dense.

### 16.4 Above the Fold

On standard devices (375×812), the following must be visible without scrolling:
- Chapter Attribution Card (complete)
- Top portion of the Session Summary card (workout name, date, and first 1–2 exercise rows)

The athlete should see the chapter attribution and the beginning of their session record in the first glance. Both pieces of information answer the two questions W-17 exists to answer: "Where did this go?" (chapter card) and "What happened?" (summary card beginning).

### 16.5 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| Chapter Attribution Card (tappable → L-3) | Full-width × 120dp minimum |
| Session Summary expand toggle "[+ X more ↓]" | Full-width × 44dp |
| "+ Tag a training partner" CTA | Full-width × 44dp |
| Tagged partner remove [×] | 44×44dp |
| "+ Add session note" CTA | Full-width × 44dp |
| Exercise note tap-to-edit rows | Full-width × 44dp |
| "Done" Primary CTA | Full-width × 56dp |
| "View in Chapter" Secondary CTA | Full-width × 48dp |

### 16.6 The Goal Percentage as Visual Anchor

The goal percentage in the Chapter Attribution Card is aligned to the right of the goal name — the same visual treatment as the W-1 context card. The athlete who saw "63%" on W-1 this morning and sees "67%" on W-17 now will register the change without the product calling attention to it. The visual anchor is consistent across both contexts. The athlete's memory provides the comparison that the product declines to make.

### 16.7 Notes Section Progressive Disclosure

If the athlete added notes during the workout, the notes section shows them immediately — no collapse needed. If the athlete added notes for 5 exercises, all 5 are visible within the Notes section (each exercise note is compact, 1–2 lines). If note content is very long (athlete wrote a paragraph), the note truncates at 3 lines with a "Read more" expansion. W-17 shows the note — it does not hide it behind a tap unless length requires it.

### 16.8 Orientation

W-17 supports portrait orientation only — matching the Active Workout Flow. The summary screen was designed for portrait.

### 16.9 Safe Area Compliance

- Top App Bar respects the status bar safe area
- "Done" CTA above the bottom safe area with minimum 8dp padding above the Tab Bar
- "View in Chapter" Secondary CTA above "Done" with 8dp spacing between
- Chapter Attribution Card begins with 16dp top margin below the Top App Bar separator

---

## Section 17 — W-17 Validation Checklist

### Screen Architecture
- [ ] Top App Bar restored (not full-screen mode): "Workout Summary" title + back arrow (→ W-1)
- [ ] Bottom Tab Bar restored and functional
- [ ] Back gesture navigates to W-1 — not to the active workout screen
- [ ] Active workout screen is no longer in the navigation stack

### Chapter Attribution Card (Tier 1)
- [ ] Chapter Attribution Card is the first element on screen
- [ ] "Building →" context label present with bronze accent treatment
- [ ] Chapter name at larger typography than W-1 context card (20–22sp)
- [ ] "This session belongs to your chapter." attribution statement present
- [ ] Primary goal name + updated percentage present
- [ ] No goal progress bar — percentage only
- [ ] No delta language ("up from X%")
- [ ] No celebration copy
- [ ] Entire card tappable → L-3 Chapter Detail
- [ ] No-chapter state shows "This session has been saved." + invitation copy + Secondary "Create a Chapter →" CTA

### Session Summary Card (Tier 2)
- [ ] Workout name (program name or activity type) + activity type + date visible in header
- [ ] Session duration present
- [ ] Exercises listed with set count and representative load (Strength/HIIT)
- [ ] Cardio sessions: duration + distance/laps/rounds if entered
- [ ] Skipped exercises shown as "[Exercise Name] — no sets logged" (secondary text, no shame indicator)
- [ ] More than 3 exercises: first 3 shown, remainder behind "[+ X more ↓]" expand toggle
- [ ] No total volume metric
- [ ] No calorie estimate
- [ ] No personal record indicators
- [ ] No comparison to prior sessions
- [ ] Partial sessions: "Partial Session" label in header alongside workout name

### Workout Sections in W-17
- [ ] Section labels (WARM-UP, MAIN WORKOUT, COOL-DOWN) appear as compact dividers between exercise groups when multiple sections were used
- [ ] Section label appears only if the section contained at least one logged exercise
- [ ] Empty sections (plan had section, no exercises logged) produce no label and no placeholder
- [ ] Single-section workouts (MAIN only): no section label — flat list format preserved
- [ ] Expand toggle "[+ X more ↓]" counts exercises only, not section labels

### Program Progress Card (Tier 3)
- [ ] Card present only when session was program-launched; fully omitted for free workouts
- [ ] Program name present
- [ ] Updated progress bar showing current position (post-session count)
- [ ] "Next: [Workout Name]" present
- [ ] Graduation state: full bar + "✓ Complete" — no celebration overlay, no "Find next program" CTA
- [ ] Partial session: bar unchanged + "Partial session — program position unchanged." in muted secondary text
- [ ] Multiple programs enrolled: only the active program shown (not all enrolled programs)

### Workout With Friend Tagging (Tier 4)
- [ ] Tagging section present with "Who trained with you today?" invitation
- [ ] Pre-tagged partner (Train Together) shown as confirmed, no action required
- [ ] Partner selection opens squad list + search
- [ ] Selected partner shown with [×] remove option
- [ ] Tag fires on "Done" tap, not on partner selection
- [ ] No tagging: no message, no prompt, no gap in record
- [ ] Section omitted if… actually, WwF section is always present as an optional invitation

### Notes Section (Tier 5)
- [ ] Exercise notes from the session listed under exercise name headers
- [ ] Workout-level note shown with "Workout note:" label if it exists
- [ ] Notes tappable for editing (opens notes sheet)
- [ ] "+ Add session note" CTA always present
- [ ] Notes save immediately on "Save Note" confirmation — not deferred to "Done"
- [ ] No "no notes" empty state copy — "+ Add session note" alone when empty
- [ ] Notes truncate at 3 lines with "Read more" expansion for long entries

### Save and Navigation
- [ ] Session record is already saved by the time W-17 loads — W-17 does not re-save
- [ ] "Done" fires partner tag (if pending) and navigates to W-1
- [ ] "Done" is full-width × 56dp minimum — not sticky (positioned at bottom of content)
- [ ] "View in Chapter" is Secondary class, full-width × 48dp — positioned above "Done"
- [ ] No "discard session" action on W-17
- [ ] W-1 shows updated Recent Workouts and program progress immediately after returning from W-17

### Partial Workout Summary
- [ ] "Partial Session" label in Session Summary header — not an error color
- [ ] Chapter Attribution Card identical to full session
- [ ] Program Progress Card shows unchanged position + informational note
- [ ] All other sections (WwF, notes, navigation) identical to full session

### Program Completion
- [ ] Graduation state: Program Progress Card shows full bar + "✓ Complete"
- [ ] No graduation celebration overlay
- [ ] No "Find your next program" CTA on W-17
- [ ] 100% goal progress: Chapter Attribution Card shows "100%" in standard format — no special treatment

### Chapter Attribution Rules
- [ ] Attribution anchored to chapter active at session start, not at save time
- [ ] Sessions without chapter: no-chapter state shown; "Create a Chapter" is Secondary
- [ ] Attribution is immutable after save — no retroactive re-attribution path on W-17

### Accountability Without Shame
- [ ] No comparison to prior sessions anywhere on W-17
- [ ] No personal record indicators on W-17
- [ ] No performance judgment language
- [ ] Skipped exercises: factual label only, no shame indicator
- [ ] Partial sessions: "Partial" label, no judgment copy
- [ ] Sets remain unlogged: no "You didn't finish" messaging anywhere
- [ ] Goal percentage shown without delta — no "up from X%"

### Transformation Over Activity
- [ ] Chapter Attribution Card is Tier 1 — before workout data
- [ ] No total volume metric
- [ ] No calorie metric
- [ ] Session duration is the only session-level numeric shown outside the exercise summary
- [ ] Story (chapter attribution, program advancement) precedes data (exercise list)

### Mobile UX
- [ ] Portrait orientation only
- [ ] Top App Bar respects safe area
- [ ] Chapter Attribution Card fully visible above fold on 375×812
- [ ] Top of Session Summary card visible above fold on 375×812
- [ ] All tap targets ≥ 44×44dp
- [ ] "Done" minimum 56dp height
- [ ] "View in Chapter" minimum 48dp height
- [ ] "Done" positioned at bottom of content — not sticky
- [ ] Safe area compliance: top and bottom
- [ ] Tab Bar visible and functional

### Mission Alignment
- [ ] Does W-17 answer "What happened?" clearly and calmly?
- [ ] Does W-17 answer "Where does this go?" with the chapter attribution as the lead?
- [ ] Does the athlete leave W-17 understanding: what they completed, what chapter benefited, what program advanced, what was preserved?
- [ ] Does W-17 feel calm, clear, earned, and reflective — not gamified, competitive, social-first, or achievement-hunting?
- [ ] Does the screen express "This work now belongs to my legacy" without stating it explicitly in those words?
- [ ] Is the chapter the first thing the athlete sees and the last thing they carry with them when they tap "Done"?

---

---

## Change Log

### v1.1 — June 2026

**WS-A3 (Workout Structure Amendment 001):**
- **§3 Wireframe** — Session Summary card diagram updated with section labels (WARM-UP, MAIN WORKOUT) between exercise groups
- **§4.1** — Summary Card Anatomy updated: section labels defined; single-section rule documented; expand toggle behavior clarified (exercises only, not labels); empty section rule documented
- **§17** — Validation Checklist: new "Workout Sections in W-17" block added

---

*Forge Legacy Workout Summary & Completion Experience Specification — W-17*
*v1.1 — June 2026*
*All decisions derived from the Phase 2A locked architecture, the Forge Legacy Master PRD, the Forge Legacy UX Framework v1.0, and the approved H-1, L-1, L-3/L-4, W-1, and W-9–W-16 wireframe specifications.*
*WS-A3 applied June 2026: section grouping in exercise summary; empty sections absent from W-17.*
*This document is the authority for all Workout Summary implementation in Phase 2B.*
