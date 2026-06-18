# Forge Legacy — First Chapter / First Goal Wireframe Specification
## O-3 | Phase 2B | Version 1.0 — June 2026

**Status:** Locked
**Authority:** Forge Legacy Master PRD Section 5 (MVP), Section 6 (Chapter System), Product DNA, O-1 v1.0, O-2 v1.0, G-3 Goal Create/Edit v1.1, Accomplishments Architecture Note v1.0
**PRD Authority:** Section 6 (Chapter System), Section 5 (MVP — dual-path onboarding)

---

## Preamble: What O-3 Is For

O-3 is the final screen of onboarding.

Before O-3, the athlete exists in Forge Legacy as a named, typed, dated profile. After O-3, they exist as an athlete with somewhere to go.

O-3 answers: "What are you building?"

This is a commitment, not a configuration. The athlete is not setting up a project. They are naming a chapter of their life and declaring what they're working toward. That distinction should be felt in every design decision.

**The onboarding arc:**
- O-1: *Who are you?* — Account, credentials, display name
- O-2: *Who are you as an athlete?* — Type, username, photo, history, identity
- O-3: *What are you building?* — Chapter name, primary goal, direction

O-3 has two sub-screens:
1. **O-3a — Chapter Creation:** "Name your first chapter." — the athlete names what they are building
2. **O-3b — Goal Creation:** "What are you building toward?" — the athlete declares the purpose of the chapter

**O-3 is a gentle invitation. It is not a gate.**

An athlete who skips O-3 entirely has a complete, valid Forge Legacy profile. They land on Home and encounter the chapter creation invitation organically through W-1. No chapter is required to log a workout.

---

## Architecture Decisions

Nine decisions were required to complete this specification.

---

### Decision 1 — First Chapter: Skippable

**Recommendation: Skippable. O-3 is an invitation, not a requirement. "Maybe Later" is always present on O-3a.**

The Product DNA is clear: "Chapters encouraged, never required." The W-1 "No Active Chapter" card exists precisely to invite chapter creation post-onboarding. An athlete who is not ready to name a chapter should not be blocked from using Forge Legacy.

The athlete who skips O-3:
- Lands on Home (H-1)
- Sees the W-1 "No Active Chapter" card: "Your training builds your legacy. Start a chapter to give it a name."
- Can create a chapter at any time via L-5

"Maybe Later" is the correct skip copy — not "Skip for now." It implies the commitment is coming, just not today. "Skip" implies it doesn't matter. "Maybe Later" respects the weight of the act without forcing it.

**O-3 does not automatically resurface after "Maybe Later."** The W-1 card and L-5 are the organic and explicit post-onboarding invitation paths. See Decision 9 and Section 11.3 for the rationale.

---

### Decision 2 — First Goal: Optional Within O-3

**Recommendation: Optional. Creating a chapter does not require creating a goal. "Skip for now" on O-3b creates the chapter with no goal set.**

The G-3 spec explicitly confirms: "the athlete who skips goal creation in L-5 reaches G-1 in the 'Active Chapter, No Goals' empty state." The chapter can exist without a primary goal at creation.

An athlete who creates a chapter but no goal:
- Chapter is created with name only
- G-1 shows "Active Chapter, No Goals" empty state: "What are you building toward? Define the goal for this chapter." — invitation to add a primary goal
- No nudge, no prompt, no pressure elsewhere in the product

This is especially important for Path A athletes. They may know the chapter name ("Getting Started") without knowing a specific goal yet. Forcing a goal would feel premature.

---

### Decision 3 — Creation Order: Chapter First, Then Goal

**Recommendation: O-3a (Chapter Name) precedes O-3b (Goal). The chapter is the container; the goal is what lives inside it.**

A goal without a named chapter is contextless. Naming the chapter first creates the emotional frame — the athlete declares the chapter of their life, then optionally quantifies its purpose. The PRD specifies "chapter name" as the first field, primary goal as the second. "Road to 405" as a chapter name COMMUNICATES the goal implicitly — the formal goal step confirms it with precision.

There is no version of O-3 where the goal is created before the chapter.

---

### Decision 4 — Chapter Naming Guidance: Blank Field, Path-Specific Placeholder Examples

**Recommendation: A clean text field with path-specific placeholder copy. No suggestion cards. No templates. No categories.**

The chapter name is a personal declaration. Templates undercut personal ownership — if the athlete selects a template, it is the product's name, not theirs.

Placeholder text communicates tone without prescribing content:
- **Path A (New to Fitness) placeholder:** "e.g. Getting Started, My First 5K, Building a Foundation"
- **Path B (Experienced Athlete) placeholder:** "e.g. Road to 405, First Marathon, Rebuilding Consistency"

Sub-copy (15sp, muted) provides framing without pressure:
- Path A: "Give your training a name. It can be anything."
- Path B: "What chapter of your training begins today?"

No inspiration cards. No "What should I name it?" help text. The field is the experience.

---

### Decision 5 — Goal Creation Model: Inline in O-3b, Same Data Model as G-3

**Recommendation: O-3b embeds the goal fields inline as a navigation screen. Uses the identical data model to G-3. Does NOT launch the G-3 full-screen modal.**

G-3 is a "full-screen modal — commitment-framing presentation" designed for post-onboarding goal creation from G-1. Launching G-3 as a modal within onboarding would break the sequential navigation flow.

O-3b presents the same fields directly as a standard navigation screen:
- **Goal Name** — required to create a goal (max 100 chars)
- **Target** — optional (numeric, > 0)
- **Unit** — conditional on Target having a value (max 30 chars, freeform)
- **Program Association** — ABSENT (no Active program exists for a new athlete, per G-3's own rule)

The data model and API endpoint are identical to G-3. The presentation is contextually appropriate for onboarding.

---

### Decision 6 — Narrative and Quantifiable Goals: Both Supported

**Recommendation: Both goal types are supported via the standard G-3 data model. No goal-type selector. The presence or absence of a Target determines the type.**

Quantifiable goals (Target set) display with progress bars in G-1 and G-2. Narrative goals (no Target) display as "In Progress." Both are legitimate, first-class goal records.

Path A framing explicitly validates narrative goals:
Sub-copy: "A goal can be a number to hit, or just something you'll know when you reach it."

---

### Decision 7 — Empty State Anxiety: Handled by Copy, Not Features

**Recommendation: Path-specific placeholder text and sub-copy do the work. No inspiration cards. No "I don't know what to name it" help links. Trust the athlete.**

The anxiety of "I don't know what to name my chapter" is addressed by:
1. Placeholder text with approachable examples — shows that simple names are valid
2. Sub-copy that sets low expectations — "It can be anything." removes pressure
3. The skip path — "Maybe Later" confirms that not naming a chapter right now is completely valid

Adding templates or prompt cards would imply there IS a right answer. "Simplicity Wins" means trusting a clean field.

---

### Decision 8 — Completion Flow and Emotional Outcome

**Recommendation: O-3 has NO completion screen. On "Done" or "Skip for now" on O-3b: navigate to Home (H-1) with a toast confirmation. Emotional outcome: Direction.**

O-2f was the ceremony. A second ceremony screen after O-3 would undercut the first and feel repetitive.

On chapter creation completion:
1. Chapter is created
2. Optional goal is created
3. Navigate to Home (H-1)
4. Toast: **"[Chapter Name] has started."** — auto-dismiss, 3 seconds

The Home screen itself provides the visual confirmation — the athlete sees their chapter card for the first time.

**Emotional outcome of O-3: Direction.**

Not excited. Not proud. Just directed. Ready. The quiet confidence of knowing what they're building. "Direction" is awareness — the athlete has a chapter, they know its name, and now they go train.

---

### Decision 9 — Abandoned O-3: No Automatic Resurfacing. Local Draft Preserved. Atomic Chapter Creation.

**Recommendation: Three rules govern O-3 abandonment.**

**Rule A — No automatic resurfacing after "Maybe Later."**

"Maybe Later" is a deliberate decision made by an athlete who has just completed O-2 and understands what they are deferring. Resurfacing O-3 automatically on subsequent launches treats their decision as provisional rather than real. This conflicts with "Chapters encouraged, never required" and "Accountability Without Shame."

After "Maybe Later," O-3 is never automatically surfaced again. The W-1 "No Active Chapter" card and L-5 (post-onboarding chapter creation) are the organic and explicit paths to chapter creation. These are persistent and non-pressuring. They do not retry a decision the athlete already made.

**Rule B — Local draft is preserved on unexpected exit.**

O-3a chapter name and O-3b goal name, target, and unit values are saved to local device storage on every change (debounced). If the athlete exits mid-flow unexpectedly (crash, lock, background), their typed values are restored when O-3 reopens.

Draft is cleared when:
- O-3 is completed successfully ("Done" or "Skip for now" on O-3b)
- "Maybe Later" is tapped on O-3a (the deliberate skip clears the intention; the text goes with it)

No server-side records are created until O-3 completion. The local draft is purely convenience state — it does not represent a committed chapter.

**Rule C — Chapter creation is atomic. No server-side save between O-3a and O-3b.**

The chapter record is NOT created until the athlete taps "Done" or "Skip for now" on O-3b. Back navigation from O-3b to O-3a is safe — no orphan chapter record exists. Chapter creation and optional goal creation are sequential API calls at O-3b completion.

---

## Section 1 — Purpose

O-3 establishes the athlete's direction in Forge Legacy.

Not their workout logging. Not their squad membership. Not their rank progression. Their direction.

After O-3, the product has a chapter to attribute training to. The athlete has a purpose to build toward.

**O-3 is a commitment, not a configuration.** The athlete is naming something meaningful. Every design choice must protect that meaning.

---

## Section 2 — Screen Goals

**O-3 succeeds when:**
1. The athlete names a chapter they feel ownership over (not a template they chose)
2. The athlete has the opportunity to declare a primary goal (quantifiable or narrative)
3. Athletes who skip feel respected, not failed — "Maybe Later" communicates that the chapter will come when they're ready
4. The entire O-3 flow takes under 2 minutes
5. The athlete arrives at Home feeling directed

**O-3 fails when:**
- The chapter name feels like a product label, not a personal declaration
- Skipping feels like abandonment or failure
- The goal step creates anxiety instead of relieving it
- The completion feels administrative
- The athlete arrives at Home not knowing they just started something real

---

## Section 3 — Information Hierarchy

O-3 is a two-screen sequential flow.

**O-3a — Chapter Creation (TIER 1, Declarative):** The naming of a chapter. Required to proceed to O-3b. Skippable via "Maybe Later." The primary creative act of O-3.

**O-3b — Goal Creation (TIER 2, Optional):** The declaration of purpose. Optional. Skippable via "Skip for now." Creates a primary goal within the chapter. Identical data model to G-3.

No O-3c screen. The completion moment is a toast on Home (H-1) arrival: "[Chapter Name] has started."

---

## Section 4 — O-3a: Chapter Creation

The first screen of O-3. The athlete names their first chapter.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Name your first chapter.    [22sp, primary weight]     │
│                                                         │
│  [Path A]:                                              │
│  Give your training a name.  [15sp, secondary, muted]   │
│  It can be anything.                                    │
│                                                         │
│  [Path B]:                                              │
│  What chapter of your        [15sp, secondary, muted]   │
│  training begins today?                                 │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Path A]: e.g. Getting Started, My First 5K     │   │  ← Placeholder
│  │  [Path B]: e.g. Road to 405, First Marathon      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [  Continue  ]               ← Primary, 52dp          │
│       (disabled until ≥ 1 non-whitespace character)     │
│                                                         │
│  [  Maybe Later  ]            ← Tertiary text link     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Title:** "Name your first chapter." — 22sp, primary weight. Same across both paths.

**Sub-copy (path-specific, 15sp, secondary, muted):**
- Path A: "Give your training a name. It can be anything."
- Path B: "What chapter of your training begins today?"

**Chapter name field:**
- Full-width text input
- Maximum 60 characters
- Character counter appears at ≤ 15 remaining (13sp, muted), turns accent color at 0
- Keyboard: default text keyboard
- Auto-focus on screen open (keyboard appears immediately)
- Local draft restored on re-entry if athlete exited unexpectedly (see Section 14.6)

**Placeholder text (path-specific, shown when field is empty):**
- Path A: "e.g. Getting Started, My First 5K, Building a Foundation"
- Path B: "e.g. Road to 405, First Marathon, Rebuilding Consistency"

**"Continue" button:**
- Full-width, 52dp, primary
- Disabled (not hidden) when field is empty or whitespace-only
- Enabled when ≥ 1 non-whitespace character
- Advances to O-3b

**"Maybe Later" link:**
- Tertiary text link, always present
- Navigates to Home (H-1) without creating a chapter
- Clears local draft immediately (deliberate skip clears the intention)
- No confirmation dialog — the tap is the decision
- O-3 is NOT automatically surfaced again after this tap

**No back navigation from O-3a.** O-2 is complete. There is nothing meaningful to go back to. The ‹ is absent.

---

## Section 5 — O-3b: Goal Creation

The second screen of O-3. The athlete optionally declares a primary goal for their chapter.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ‹                                                      │
│                                                         │
│  [Path A]:                                              │
│  What are you building       [22sp, primary weight]     │
│  toward?                                                │
│                                                         │
│  [Path B]:                                              │
│  What's your goal for        [22sp, primary weight]     │
│  this chapter?                                          │
│                                                         │
│  [Path A sub-copy]:                                     │
│  A goal can be a number to   [15sp, secondary, muted]   │
│  hit, or just something you'll                          │
│  know when you reach it.                                │
│                                                         │
│  [Path B sub-copy]:                                     │
│  Add a goal now, or come     [15sp, secondary, muted]   │
│  back later.                                            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Goal                                  [13sp, muted]   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  e.g. Squat 405 lbs, Run a 5K, Just show up      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Target (optional)                     [13sp, muted]   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  e.g. 405                                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Unit                                  [13sp, muted]   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  e.g. lbs                                        │   │
│  └─────────────────────────────────────────────────┘   │
│  (Unit appears only when Target has a value)            │
│                                                         │
│  [  Done  ]                   ← Primary, 52dp          │
│                                                         │
│  [  Skip for now  ]           ← Tertiary text link     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Title (path-specific, 22sp, primary weight):**
- Path A: "What are you building toward?"
- Path B: "What's your goal for this chapter?"

**Sub-copy (path-specific, 15sp, secondary, muted):**
- Path A: "A goal can be a number to hit, or just something you'll know when you reach it."
- Path B: "Add a goal now, or come back later."

**Goal Name field:**
- 13sp label: "Goal" (muted, above field)
- Placeholder: "e.g. Squat 405 lbs, Run a 5K, Just show up"
- Maximum 100 characters (per G-3)
- Character counter at ≤ 15 remaining
- Auto-focus on screen open
- Local draft restored on re-entry if athlete exited unexpectedly

**Target field:**
- 13sp label: "Target (optional)" (muted, above field)
- Placeholder: "e.g. 405"
- Numeric keyboard; decimals supported; must be > 0 if entered

**Unit field:**
- 13sp label: "Unit" (muted, above field)
- Placeholder: "e.g. lbs"
- Maximum 30 characters
- **Appears only when Target has a value. Hidden (not disabled) when Target is empty.**
- Identical to G-3's progressive unit disclosure behavior

**"Done" button:**
- Full-width, 52dp, primary
- **Always enabled**
- When Goal Name has text: creates chapter + primary goal (with optional Target and Unit)
- When Goal Name is empty: creates chapter only
- Navigates to Home (H-1) + toast: "[Chapter Name] has started."
- Clears local draft

**"Skip for now" link:**
- Tertiary text link, always present
- Semantic skip — the athlete is explicitly choosing not to set a goal
- Creates chapter only (no goal); same server-side result as "Done" with empty Goal Name
- Navigates to Home (H-1) + toast: "[Chapter Name] has started."
- Clears local draft

**Back navigation:** ‹ returns to O-3a. The chapter name field on O-3a restores from local draft (which was not cleared — back navigation is not a skip, it is a revision). No chapter has been created yet.

---

## Section 6 — Creation Order

Chapter creation precedes goal creation in O-3. This is locked.

The chapter is the container; the goal lives inside it. Naming the chapter ("Road to 405") often implicitly expresses the goal — the formal goal step gives it precision, not introduction.

**O-3 chapter and goal are created atomically at O-3b completion:**
- No chapter record is created between O-3a and O-3b
- Chapter record is created on "Done" or "Skip for now" on O-3b
- Back navigation from O-3b to O-3a is safe — no orphan record exists

**Sequential API calls at completion:**
1. Create chapter (name, athlete ID, creation date, status = Active) → receive chapter ID
2. If goal was entered: create primary goal (name, chapter ID, target, unit if set, type = Primary)

---

## Section 7 — Chapter Naming Guidance

The chapter name field is blank and clean. No templates. No categories. No "What should I name it?" affordance.

**What exists:**
- Path-specific placeholder text in the correct tone for that athlete
- Path-specific sub-copy that sets appropriate expectations
- A character limit (60) that encourages concision

**What does not exist:**
- Template tiles or suggestion cards
- Category selectors
- A "Need inspiration?" help link
- Any copy implying there is a right or wrong name

**Why:** The chapter name is the athlete's. Templates produce product-labeled chapters, not personally-owned ones. "It can be anything" is the truth, and saying it removes the pressure of having to produce something brilliant.

**Chapter name rules:**
- Minimum: 1 non-whitespace character (Continue button gate)
- Maximum: 60 characters
- No uniqueness validation — two chapters may have the same name (chapters are records, not unique keys)
- No profanity filter in MVP

---

## Section 8 — Goal Creation Rules

Goal creation in O-3b follows the G-3 data model exactly.

**Goal Name:** Tapping "Done" with an empty Goal Name creates the chapter without a goal — this is not an error. The goal is optional.

**Target:** Optional numeric field. If entered, must be > 0. Decimals permitted. Entering a Target reveals the Unit field.

**Unit:** Optional freeform text. Max 30 characters. Appears only when Target has a value. No enforced unit vocabulary.

**Goal type determined by data model:**
- Goal Name + Target → Quantifiable goal (displays with progress bar in G-1 and G-2)
- Goal Name, no Target → Narrative goal (displays as "In Progress" in G-1 and G-2)
- No goal entered → Chapter with no primary goal (G-1 "Active Chapter, No Goals" empty state)

**No Program Association field in O-3b.** New athletes have no Active program. Absent per G-3's own rule: "absent when no Active program exists."

---

## Section 9 — Narrative and Quantifiable Goal Support

Both goal types are fully supported in O-3b via the standard G-3 data model. Type is determined by whether a Target is set — there is no goal-type selector.

**Path A framing acknowledges narrative goals explicitly:**
"A goal can be a number to hit, or just something you'll know when you reach it."

This validates both:
- Quantifiable: "a number to hit" (Squat 405 lbs)
- Narrative: "something you'll know when you reach it" (Train with my son, Just be consistent)

**Examples in the Goal Name placeholder cover both:**
"e.g. Squat 405 lbs, Run a 5K, Just show up"

"Just show up" is intentional — it validates the most minimal possible commitment as a real goal.

---

## Section 10 — Empty State Guidance

An athlete who doesn't know what to name their chapter or what their goal is encounters no friction, no failure state, and no locked door.

**"I don't know what to name my chapter":**
- Sub-copy: "It can be anything." — the most validating response possible
- Placeholder: shows examples spanning simple to specific
- "Maybe Later" is always visible
- No minimum quality standard (1 character = valid)

**"I don't know what my goal is":**
- Path A sub-copy explicitly validates not having a number
- "Skip for now" always visible — creates the chapter without a goal
- G-1 "Active Chapter, No Goals" state invites goal creation post-onboarding

**"I don't know if I should start a chapter at all":**
- "Maybe Later" on O-3a — no chapter created, no pressure
- W-1 "No Active Chapter" card is the organic, persistent invitation
- Training can be logged without a chapter — the product never gates the workout

**What does NOT exist in O-3:**
- Inspiration card tiles ("Choose a template")
- Social proof ("What other athletes are building")
- "Need ideas?" help links
- Any framing that implies the athlete is incomplete without a chapter or goal

---

## Section 11 — Skip Behavior

### 11.1 Skip Map

| Skip action | What gets created | Where athlete lands |
|-------------|------------------|---------------------|
| "Maybe Later" on O-3a | Nothing | Home (H-1), no toast |
| "Skip for now" on O-3b | Chapter (name only, no goal) | Home (H-1) + toast |
| "Done" on O-3b with empty Goal Name | Chapter (name only, no goal) | Home (H-1) + toast |
| "Done" on O-3b with Goal Name | Chapter + primary goal | Home (H-1) + toast |

### 11.2 "Maybe Later" vs "Skip for now"

- **"Maybe Later"** (O-3a): The athlete is choosing not to start a chapter today. No chapter is created. O-3 is not automatically surfaced again. Local draft is cleared.
- **"Skip for now"** (O-3b): The athlete HAS started a chapter. They are choosing not to set a goal right now. The chapter exists; the goal can be added later via G-1 → "Add a Goal."

"Later" acknowledges the chapter commitment hasn't been made yet. "For now" acknowledges the chapter commitment HAS been made, just without a specific goal.

### 11.3 After "Maybe Later" — What Surfaces Chapter Creation

O-3 is not automatically surfaced after "Maybe Later." The athlete's decision is respected.

Chapter creation remains available through:
- **W-1 "No Active Chapter" card** — present on every visit to the Workouts Hub: "Your training builds your legacy. Start a chapter to give it a name." → L-5
- **L-5 Chapter Creation** — the post-onboarding chapter creation flow (separate spec)

These are persistent, organic, and non-pressuring. They do not retry a decision the athlete already made.

### 11.4 Skip Does Not Mean Incomplete

An athlete who skips O-3 entirely has a complete, valid Forge Legacy account. The product never tells them their profile is incomplete, missing a chapter, or less than ready. The W-1 card is an invitation, not a failure flag.

---

## Section 12 — Completion Flow

When the athlete taps "Done" or "Skip for now" on O-3b:

1. **Chapter is created** server-side (name, athlete ID, creation date, status = Active)
2. **Goal is created** server-side if Goal Name has text (goal name, chapter ID, target if set, unit if set, type = Primary)
3. **Local draft is cleared**
4. **Navigate to Home (H-1)**
5. **Toast notification** appears at the bottom of H-1: **"[Chapter Name] has started."** — auto-dismiss after 3 seconds

**The toast:**
- Confirms the action without requiring a separate screen
- Uses the athlete's own chapter name — the first time they see it displayed back to them as a created record
- 3-second auto-dismiss; non-tappable

**H-1 first appearance after O-3:**
The athlete lands on Home for the first time. Their chapter card appears in the D-Lite hero. This is the visual confirmation. No modal, no celebration, no screen — the product simply shows them their chapter, as if it was always there.

**Emotional outcome: Direction.**

The athlete is ready. Not excited — directed. They know what they're building. The question has been answered. Now they go answer it with training.

---

## Section 13 — Navigation

### 13.1 O-3 Screen Flow

```
O-2f (Completion Moment) — "Start Building"
          ↓
O-3a (Chapter Creation)
          ↓ "Continue" (chapter name entered)
O-3b (Goal Creation)
          ↓ "Done" or "Skip for now"
Home (H-1) + toast: "[Chapter Name] has started."
```

**Skip paths:**

```
O-3a — "Maybe Later"
          ↓
Home (H-1), no toast, no chapter created
Draft cleared. O-3 not automatically surfaced again.
W-1 card and L-5 serve as chapter creation paths.
```

```
O-3b — "Skip for now" or "Done" with empty goal
          ↓
Home (H-1) + toast: "[Chapter Name] has started."
Chapter created. No goal created.
```

### 13.2 Back Navigation

| Screen | Back navigates to |
|--------|-----------------|
| O-3a | No back (O-2 is complete; nothing to return to) |
| O-3b | O-3a (chapter name restored from local draft; no chapter created yet) |

Back from O-3b to O-3a: The chapter name field shows the previously typed name (from local draft — not a server-side save). The Unit field on O-3b resets to hidden on return if Target was cleared.

### 13.3 O-3 Does Not Navigate To

- O-1 or O-2 screens (onboarding phases complete)
- Legacy Hub (L-1) — post-onboarding navigation
- Profile (P-1) — accessible from Home
- Any workout, squad, or program screen

---

## Section 14 — Mobile UX

### 14.1 Screen Types

Both O-3a and O-3b are standard navigation screens in the sequential push-navigation stack established by O-1 and O-2. Not modals. Consistent with all prior onboarding screens.

### 14.2 Keyboard Behavior

- O-3a: keyboard appears automatically on screen open (auto-focus on chapter name field)
- O-3b: keyboard appears automatically on screen open (auto-focus on Goal Name field)
- Keyboard avoidance: screens scroll to keep active field above keyboard
- Unit field appears dynamically when Target is filled; keyboard focus shifts to Unit field automatically on Target entry completion (or athlete taps Unit field)

### 14.3 Tap Target Minimums

| Element | Minimum |
|---------|---------|
| Chapter name field (O-3a) | Full-width × 52dp |
| Continue button (O-3a) | Full-width × 52dp |
| "Maybe Later" link | 44dp touch area minimum |
| ‹ back button (O-3b only) | 44×44dp |
| Goal Name field (O-3b) | Full-width × 52dp |
| Target field (O-3b) | Full-width × 52dp |
| Unit field (O-3b) | Full-width × 52dp |
| "Done" button (O-3b) | Full-width × 52dp |
| "Skip for now" link | 44dp touch area minimum |

### 14.4 Portrait Orientation

Both O-3 screens are portrait only.

### 14.5 Chapter Creation Atomicity

No server-side writes occur between O-3a and O-3b. The chapter record is created only at O-3b "Done" / "Skip for now." Mid-O-3 abandonment leaves no orphaned chapter records.

### 14.6 Local Draft Preservation

All text fields in O-3 are saved to local device storage as the athlete types (debounced — no more than one write per 500ms).

**Fields preserved:**
- O-3a: chapter name
- O-3b: goal name, target value, unit

**Draft is restored when:**
- The athlete re-enters O-3 after an unexpected exit (crash, lock, background termination)
- The athlete navigates back from O-3b to O-3a (chapter name restored; goal fields cleared on return to O-3b per Edge Case 16.7)

**Draft is cleared when:**
- O-3 is completed successfully ("Done" or "Skip for now" on O-3b)
- "Maybe Later" is tapped on O-3a (deliberate skip clears the intention)

**Draft does NOT persist to L-5 or any other screen.** If the athlete eventually creates a chapter via L-5 post-onboarding, they type a fresh chapter name. The O-3 onboarding draft is scoped to O-3 only.

---

## Section 15 — Accessibility

**O-3a (Chapter Creation):**
- Screen title announced on load: "Name your first chapter"
- Chapter name field: `accessibilityLabel` = "Chapter name"
- "Continue": `accessibilityLabel` = "Continue to goal step"; when disabled: `accessibilityHint` = "Enter a chapter name to continue"
- "Maybe Later": `accessibilityLabel` = "Skip chapter creation, set it up later"

**O-3b (Goal Creation):**
- Screen title announced on load: "What are you building toward" (Path A) or "What's your goal for this chapter" (Path B)
- Goal Name field: `accessibilityLabel` = "Goal name — optional"
- Target field: `accessibilityLabel` = "Target — optional"
- Unit field: `accessibilityLabel` = "Unit — optional"; `accessibilityHint` = "Appears when a target is entered"; excluded from accessibility tree when hidden
- "Done": `accessibilityLabel` = "Done — create chapter and goal" (when Goal Name has text) or "Done — create chapter without a goal" (when Goal Name is empty)
- "Skip for now": `accessibilityLabel` = "Skip, create chapter without a goal"

---

## Section 16 — Edge Cases

### 16.1 Athlete Returns After O-3 Is Complete

If the athlete completed O-3 (chapter created) and returns: O-3 is never shown again. On next launch: Home (H-1).

### 16.2 Athlete Taps "Maybe Later"

O-3 is not surfaced again. Local draft is cleared. The athlete goes directly to Home on all future launches. Chapter creation is available via W-1 "No Active Chapter" card and L-5.

### 16.3 Chapter Name Contains Only Spaces

"Continue" remains disabled. The field appears to have text visually but the button checks non-whitespace count. No error message needed — the button simply stays disabled.

### 16.4 Chapter Name at 60-Character Limit

Input is blocked at 60. Character counter appears at ≤ 15 remaining, turns accent color at 0 remaining.

### 16.5 Network Failure on O-3b "Done"

If chapter creation fails (network error):
- Toast: "Couldn't save your chapter. Check your connection and try again."
- O-3b fields remain intact with the athlete's text (local draft also preserves them)
- "Done" and "Skip for now" re-enabled after dismissal
- O-3 does not navigate to Home until chapter creation succeeds

### 16.6 Network Failure on Goal Creation Only (Chapter Saves, Goal Fails)

If the chapter saves but goal creation fails:
- Chapter is created (permanent legacy record — cannot be undone)
- Toast: "Chapter started. Couldn't save your goal — add it from your chapter."
- Navigate to Home
- G-1 "Active Chapter, No Goals" state surfaces the goal creation invitation

### 16.7 Athlete Navigates Back from O-3b to O-3a, Then Returns to O-3b

On back from O-3b to O-3a: chapter name is restored in the field from local draft. On Continue back to O-3b: goal fields (name, target, unit) are cleared. The athlete re-enters them. This is correct — the back navigation was a revision of the chapter name, not the goal. The goal entry starts fresh in the new chapter context.

### 16.8 Target Cleared on O-3b

When Target field is emptied: Unit field hides immediately. If the athlete had typed a Unit value, it is discarded (consistent with G-3 progressive disclosure behavior). No undo. Target is cleared → Unit is gone.

### 16.9 Duplicate Chapter Name

Chapter names are not unique. No duplicate warning. An athlete may start a second "Road to 405" chapter years later — that is valid and meaningful. Chapter identity is defined by its record ID and creation date, not its name.

### 16.10 O-3 Shown on New Device After Partial Completion

If the athlete completed O-2 but not O-3 on one device and opens the app on a new device: O-3 is shown (O-3 completion state is account-level). The local draft does NOT transfer between devices (local-only). O-3a opens with an empty chapter name field on the new device.

### 16.11 Athlete Types Goal Name, Then Taps "Skip for now"

"Skip for now" creates the chapter without a goal, regardless of what is in the Goal Name field. The typed goal name is discarded and the local draft is cleared. No confirmation dialog. The athlete can add a goal via G-1 → "Add a Goal" post-onboarding.

### 16.12 Draft Restored on Unexpected Re-entry

If the athlete typed "Road to 405" in O-3a and the app was backgrounded and terminated before they could tap Continue: on next launch, O-3a opens with "Road to 405" pre-populated in the chapter name field. The character counter reflects the pre-populated text. "Continue" is enabled immediately (no re-tap required). The athlete can edit or proceed as-is.

---

## Section 17 — Architecture Risks

### Risk 1 — O-3 vs. L-5: Shared Chapter Creation API

**Issue:** O-3 and L-5 (post-onboarding chapter creation, not yet specced) both create chapter records and must use the same API endpoint. Their UX differs by design — O-3 is an onboarding screen; L-5 is a full creation modal that may collect additional optional fields.

**Recommendation:** The chapter record created in O-3 uses only: name, athlete ID, creation date, status = Active. L-5 may offer additional optional fields (e.g., chapter dates). Those fields must be optional in the data model — L-5 cannot require fields O-3 doesn't collect.

**Risk level:** Medium. Requires data model coordination between O-3 and the future L-5 spec.

---

### Risk 2 — Sequential API Calls at O-3b Completion

**Issue:** Chapter creation must complete and return a chapter ID before goal creation can be called. These are sequential API calls, not parallel. Implementation must handle the timing dependency and the failure case where chapter succeeds but goal fails (Edge Case 16.6).

**Recommendation:** O-3b completion triggers: (1) chapter creation → receive chapter ID → (2) if goal entered, goal creation using that chapter ID. Implement as a server-side transaction or a client-side two-step sequence with explicit error handling for the chapter-succeeds/goal-fails state.

**Risk level:** High. Must be explicitly implemented.

---

### Risk 3 — Path State Read at O-3 Entry

**Issue:** O-3 uses path-specific copy (placeholder text, sub-copy). The path selection (A vs. B) was stored server-side in O-2a. O-3 must read it on screen load.

**Recommendation:** O-3 reads account onboarding path on load. If unavailable (API failure), default to Path A copy (more accommodating, less assumes experience).

**Risk level:** Low.

---

### Risk 4 — H-1 "New Chapter, No Workouts" State

**Issue:** When the athlete lands on H-1 immediately after O-3, the D-Lite hero must handle a chapter that was JUST created: no workouts logged, no goal progress, potentially no goal at all.

**Recommendation:** This is an existing H-1 edge case. O-3 navigates to H-1 and the toast provides context. H-1 spec must be verified to handle this state correctly.

**Risk level:** Low for O-3. Medium for H-1 spec completeness.

---

### Risk 5 — G-1 "Active Chapter, No Goals" After Skip

**Issue:** When the athlete skips goal creation (O-3b "Skip for now"), G-1 must show the "Active Chapter, No Goals" empty state correctly. This is already specced in G-1 v1.1 but must be verified in implementation.

**Recommendation:** No changes to G-1 required. O-3 relies on G-1's existing specced empty state.

**Risk level:** Low. State is already specced.

---

## Section 18 — Validation Checklist

### O-3a — Chapter Creation
- [ ] No back navigation
- [ ] Title: "Name your first chapter." — 22sp, primary weight
- [ ] Sub-copy (Path A): "Give your training a name. It can be anything." — 15sp, muted
- [ ] Sub-copy (Path B): "What chapter of your training begins today?" — 15sp, muted
- [ ] Chapter name field: full-width, auto-focus on open
- [ ] Local draft restored in field on re-entry after unexpected exit
- [ ] Placeholder (Path A): "e.g. Getting Started, My First 5K, Building a Foundation"
- [ ] Placeholder (Path B): "e.g. Road to 405, First Marathon, Rebuilding Consistency"
- [ ] Maximum 60 characters; character counter at ≤ 15 remaining; accent color at 0
- [ ] "Continue": disabled when field is empty or whitespace-only; enabled when ≥ 1 non-whitespace char; full-width, 52dp, primary
- [ ] "Maybe Later": tertiary text link, always present
- [ ] "Maybe Later" → Home (no chapter created); local draft cleared immediately
- [ ] O-3 NOT automatically surfaced after "Maybe Later"

### O-3b — Goal Creation
- [ ] ‹ back navigation → O-3a with chapter name restored; goal fields cleared
- [ ] Title (Path A): "What are you building toward?" — 22sp, primary weight
- [ ] Title (Path B): "What's your goal for this chapter?" — 22sp, primary weight
- [ ] Sub-copy (Path A): "A goal can be a number to hit, or just something you'll know when you reach it." — 15sp, muted
- [ ] Sub-copy (Path B): "Add a goal now, or come back later." — 15sp, muted
- [ ] Goal Name field: 13sp "Goal" label, full-width, auto-focus on open
- [ ] Goal Name placeholder: "e.g. Squat 405 lbs, Run a 5K, Just show up"
- [ ] Goal Name: max 100 chars; character counter at ≤ 15 remaining
- [ ] Local draft restored in Goal Name, Target, Unit on re-entry after unexpected exit
- [ ] Target field: 13sp "Target (optional)" label, numeric keyboard, decimals permitted, must be > 0
- [ ] Unit field: 13sp "Unit" label; appears only when Target has a value; hidden when Target empty
- [ ] Unit: max 30 chars; focus shifts automatically when Target entry completes
- [ ] Target cleared → Unit field hides immediately; typed Unit value discarded
- [ ] "Done": full-width, 52dp, primary; always enabled
- [ ] "Done" with Goal Name text: creates chapter + primary goal → Home + toast; draft cleared
- [ ] "Done" with empty Goal Name: creates chapter only → Home + toast; draft cleared
- [ ] "Skip for now": tertiary text link, always present; creates chapter only → Home + toast; draft cleared
- [ ] Goal Name typed, "Skip for now" tapped: goal discarded; chapter only created; draft cleared
- [ ] Network failure on "Done": error toast; O-3b fields intact; retry available; no navigation to Home
- [ ] Network failure (chapter saves, goal fails): chapter created; explanatory toast; navigate to Home

### Local Draft Preservation
- [ ] Chapter name saved to local storage on change (debounced, ≤ 500ms)
- [ ] Goal name, target, unit saved to local storage on change (debounced)
- [ ] Draft restored on unexpected re-entry (pre-populates fields, Continue immediately enabled if name valid)
- [ ] Draft cleared on: "Done", "Skip for now", "Maybe Later"
- [ ] Draft scoped to O-3 only — does not persist to L-5 or other screens
- [ ] Draft does NOT transfer between devices

### Creation Atomicity
- [ ] No server-side writes between O-3a and O-3b
- [ ] Chapter created only on O-3b "Done" or "Skip for now"
- [ ] Back from O-3b → O-3a: no chapter record exists
- [ ] Chapter creation call completes and returns chapter ID before goal creation call is made

### Completion Flow
- [ ] "Done" / "Skip for now" → Home (H-1) + toast: "[Chapter Name] has started."
- [ ] Toast: auto-dismiss after 3 seconds; non-tappable
- [ ] "Maybe Later" → Home (H-1); no toast; no chapter created
- [ ] H-1 D-Lite hero shows newly created chapter on first arrival

### Skip Behavior
- [ ] "Maybe Later": no chapter created; O-3 NOT resurfaced automatically; W-1 card is the organic invitation
- [ ] "Skip for now": chapter created without goal; G-1 "Active Chapter, No Goals" state active
- [ ] "Done" with empty goal: chapter created without goal; same outcome as "Skip for now"
- [ ] No "chapter incomplete" or "missing goal" indicators anywhere post-skip

### Navigation
- [ ] O-2f "Start Building" → O-3a
- [ ] O-3a "Continue" → O-3b
- [ ] O-3a "Maybe Later" → Home (no chapter); draft cleared
- [ ] O-3b ‹ → O-3a (name restored from draft; goal fields cleared)
- [ ] O-3b "Done" → Home + toast; draft cleared
- [ ] O-3b "Skip for now" → Home + toast; draft cleared

---

## Section 19 — Downstream Dependencies

| Dependency | What O-3 Requires | Priority |
|------------|------------------|----------|
| Chapter creation API | Endpoint accepting: name, athlete ID. Returns: chapter ID, creation date, status. Must support name-only creation (goal not required). | High — core O-3 operation |
| Goal creation API | Endpoint accepting: name, chapter ID, target (optional), unit (optional), type = Primary. Same endpoint used by G-3. | High — O-3b operation |
| O-3 completion state | Account-level flag: O-3 completed (chapter created). Prevents O-3 from showing again on any device after completion. | High — controls O-3 lifecycle |
| H-1 D-Lite hero | Must handle "New Chapter, No Workouts" state for athlete arriving from O-3 | Medium |
| G-1 "Active Chapter, No Goals" state | Already specced in G-1 v1.1; must be correctly implemented | Medium |
| W-1 "No Active Chapter" card | Already specced in W-1 v1.0; serves as organic chapter creation invitation after "Maybe Later" | Medium |
| L-5 Chapter Creation | Post-onboarding chapter creation (not yet specced). Must share the chapter creation API established by O-3. Chapter data model established here must remain compatible with L-5's additional optional fields. | Medium — future spec |

---

## Change Log

### v1.0 — June 2026 (Locked)

Initial specification. O-3 First Chapter / First Goal established as the final onboarding step and the moment the athlete declares direction. Two sub-screens: O-3a (Chapter Creation) and O-3b (Goal Creation). No O-3c completion screen — completion communicated via toast on H-1 arrival.

Nine architecture decisions resolved: first chapter skippable via "Maybe Later" (invitation, not gate); first goal optional via "Skip for now" (chapter can exist without a goal); creation order is chapter-first, goal-second (chapter is the container); chapter naming via blank field with path-specific placeholder text (no templates); goal creation uses G-3 data model inline as a navigation screen (not G-3 modal); narrative and quantifiable goals both supported via target-presence model; empty state anxiety addressed by copy alone (no inspiration cards); completion flows to Home with toast (no O-3c ceremony screen); abandoned O-3 uses no automatic resurfacing, local draft preservation, and atomic chapter creation.

Five architecture risks documented. Emotional outcome: Direction.

**Pre-lock revisions incorporated:**
- **Revision 1 (No automatic resurfacing):** "Maybe Later" is a deliberate decision. Automatic resurfacing on subsequent launches conflicts with "Chapters encouraged, never required" and "Accountability Without Shame." Removed the 3-launch resurfacing counter. W-1 "No Active Chapter" card and L-5 are the post-onboarding chapter creation paths. Affected: Decision 9, Section 11.3, Edge Case 16.2, Validation Checklist, Section 19.
- **Revision 2 (Local draft preservation):** Local device storage preserves O-3a and O-3b field values on each change. Draft is restored on unexpected re-entry. Draft is cleared on "Done," "Skip for now," and "Maybe Later." No server-side records are created before O-3b completion — atomic chapter creation is maintained. The athlete's effort is respected without compromising the commitment model. Affected: Decision 9, Section 14.6, Edge Cases 16.12, Validation Checklist.

---

*Forge Legacy First Chapter / First Goal Wireframe Specification — O-3*
*v1.0 — June 2026*
*Authority: Master PRD Section 5 (MVP), Section 6 (Chapter System), Product DNA, O-1 v1.0, O-2 v1.0, G-3 v1.1*
