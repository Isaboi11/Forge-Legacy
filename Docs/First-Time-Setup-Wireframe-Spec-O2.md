# Forge Legacy — First-Time Setup Wireframe Specification
## O-2 | Phase 2B | Version 1.0 — June 2026

**Status:** Locked
**Authority:** Forge Legacy Master PRD Section 3 (Target User), Section 5 (MVP), Section 17 (Profile), Product DNA, Identity Amendment 001 v1.1, O-1 Account Creation v1.0
**PRD Authority:** Section 5 (MVP Scope — dual-path onboarding), Section 3 (New to Fitness / Experienced Athlete paths), Section 17 (Athlete Type enum)

---

## Preamble: What O-2 Is For

O-2 transforms a newly created account into an athlete profile.

Before O-2, Forge Legacy knows the athlete's name and credentials. After O-2, it knows who they are.

O-2 answers: "Who am I as an athlete?"

This is a declaration, not a form. The athlete is not configuring settings — they are stating an identity. Every decision in this spec serves that framing. The experience should feel personal, intentional, and meaningful. Not corporate. Not social-media driven. Not a productivity app setup wizard.

**O-2 contains six sub-screens, five of which are shared across both onboarding paths:**

1. **O-2a — Path Selection:** New to Fitness vs. Experienced Athlete
2. **O-2b — Athlete Type:** The declaration of what the athlete trains
3. **O-2c — Username:** The searchable address (optional, per Identity Amendment 001)
4. **O-2d — Profile Photo:** The face in the system (optional)
5. **O-2e — Prior Accomplishments:** Honor what has already been built (Path B only)
6. **O-2f — Completion Moment:** The profile reveal. The emotional outcome of O-2.

**O-2 flows into O-3 (First Chapter Invitation).** O-3 is defined in a separate spec. O-2 does not flow directly to Home.

---

## Architecture Decisions

Eight decisions were required to complete this specification.

---

### Decision 1 — Dual-Path Architecture

**Recommendation: A single path-selection screen at the start of O-2. One path difference: Prior Accomplishments (O-2e) appears in Path B only.**

The Master PRD locks a dual-path structure: "New to Fitness" (Path A) and "Experienced Athlete" (Path B). The question is where the path diverges.

The paths diverge at O-2e. Everything before it (O-2a–O-2d) is identical. The Prior Accomplishments step appears only for Path B athletes — it would be confusing and premature for an athlete who is just starting out.

**Path A (New to Fitness):** O-2a → O-2b → O-2c → O-2d → O-2f
**Path B (Experienced Athlete):** O-2a → O-2b → O-2c → O-2d → O-2e → O-2f

O-2a (Path Selection) is a single-tap choice — no Continue button, no form. Tapping a path option immediately advances to O-2b. The path is stored server-side and determines whether O-2e surfaces.

The path selection copy is non-judgmental:
- "I'm just getting started." — not "I'm a beginner" or "New to fitness"
- "I've been training for a while." — not "Experienced athlete" or "Advanced"

Both framings are honest and forward-looking. The system categorizes internally; the athlete simply answers truthfully.

---

### Decision 2 — Athlete Type: Required

**Recommendation: Required. No skip. "General" is always available as the correct option for athletes who don't fit a specific category.**

The seven athlete types (Strength, Bodybuilding, Hybrid, Running, Cycling, Combat, General) cover the full MVP user range. "General" is not a fallback for athletes who don't know — it is a legitimate athlete identity that covers general fitness, multi-sport, and unspecialized training.

Athlete type is required because:
1. It appears on P-1 Profile immediately after onboarding — the profile is incomplete without it
2. It contextualizes the athlete's identity in squad rosters and the Limited Athlete Profile
3. The selection is trivially fast: one tap from seven tiles
4. "General" prevents any athlete from being unable to complete the step

No athlete should reach the completion moment without having declared what they train.

**Athlete type can be changed in P-2 at any time.** This is not a permanent classification. The framing ("What do you train?") communicates that it describes current practice, not a permanent category.

---

### Decision 3 — Username Placement and Behavior

**Recommendation: O-2c, after Athlete Type. Optional but strongly encouraged. Per Identity Amendment 001 v1.1.**

Username is placed after Athlete Type because:
- Athlete Type is required — it must come before optional steps
- Username is a utility field, not an identity declaration — placing it after the identity steps keeps the emotional arc coherent

The username step behavior is fully defined in Identity Amendment 001 v1.1. This spec does not re-define username rules — it establishes where the step lives in the flow.

O-2c behavior summary:
- Auto-suggests username from display name
- Live availability check
- "Skip for now" always present and functional
- Continue enabled when a valid, available username is entered

---

### Decision 4 — Profile Photo: Optional

**Recommendation: Optional. "Skip for now" always present. Initials avatar as default.**

Profile photo is optional throughout the MVP. The P-1 spec locks that "Avatar defaults to athlete's initials if no photo is set." The initials avatar is a complete, acceptable default — not a placeholder state that implies incompleteness.

The Profile Photo step (O-2d) shows the athlete's initials avatar as a preview. The athlete can add a photo or skip. If skipped, the initials avatar is what appears in squads, WwF partner selection, and the profile.

Photo can be added or changed at any time in P-2 (Edit Profile).

**Photo access permission:** When the athlete taps "Choose Photo," the system requests photo library access permission (iOS/Android). If denied, a prompt explains: "Allow photo access to add a profile photo." No photo is added; the athlete proceeds with initials. No error state — the permission denial is graceful.

---

### Decision 5 — Prior Accomplishments: Optional, Path B Only

**Recommendation: Optional freeform text entries, Path B only. Any number of entries. Entire step skippable.**

Prior Accomplishments honors the Experienced Athlete path mandate from the PRD: "Experienced path includes optional prior accomplishment entry." This step creates entries in the Accomplishments system — the same system used by L-12 (Accomplishments Detail) and visible on P-1.

Each entry is freeform text (no categories, no structured fields). An athlete writes what they've built: "Ran my first marathon in under 4 hours (2022)" or "Competed in 3 powerlifting meets." The accomplishment record is exactly what they type.

Entries added in O-2e are labeled with the creation date (today) — they are not backdated. If an athlete wants to record an accomplishment with historical context, the text they write communicates that (e.g., "Ran my first marathon in 2022"). The system records when they added it to Forge Legacy, not when the achievement occurred.

The step is skippable — not all experienced athletes will want to list accomplishments during onboarding. The accomplishments system is available from P-1 at any time post-onboarding.

---

### Decision 6 — Forging Since: Revealed at Completion, Not Editable

**Recommendation: "Forging Since" is not shown or collected during O-2 steps. It is revealed for the first time in the completion moment (O-2f).**

"Forging Since" is set at O-1b completion (account creation) and is permanently immutable. It requires no athlete input.

The completion moment (O-2f) is where the athlete first sees their assembled profile: name, athlete type, starting rank, and — for the first time — "Forging since [Month Year]." This is the emotional reveal of O-2. The date is not a field to fill in; it is a fact that already exists. Revealing it at completion communicates: *your legacy has already begun.*

The framing in O-2f: "Forging since June 2026" (same format as P-1). 13sp, muted secondary, centered below rank.

**Never show "Forging Since" as an editable field anywhere in the product.** It appears only as a display element.

---

### Decision 7 — Privacy Defaults

**Recommendation: Privacy defaults are set silently during account creation and O-2. No privacy screen in O-2. Configurable post-onboarding via P-6.**

Privacy defaults:
- Non-squad athlete search: **On** (per Identity Amendment 001 — athletes are searchable by default)
- WwF non-squad tagging: **On** (follows searchability — the same toggle governs both)
- Squad visibility: **On** — squad members can see your presence and profile card

These defaults are appropriate for the product's core use case: small, trusted groups. An athlete who wants more privacy configures it in P-6 (Privacy Settings) post-onboarding.

O-2 does not present a privacy settings screen. Showing privacy controls before the athlete has experienced the product creates pre-emptive friction and implies the product is more public than it is. The correct moment for privacy configuration is after the athlete understands what they're private from.

A single passive acknowledgment appears in O-2f (completion): "Your profile is visible to your squad members." (13sp, muted, below the primary CTA). This is information, not a consent action.

---

### Decision 8 — Completion Flow and Emotional Outcome

**Recommendation: O-2 flows into O-3 (First Chapter Invitation), not directly to Home. Emotional outcome: Ownership.**

After "Start Building" in O-2f, the athlete navigates to O-3 (First Chapter Invitation), defined in a separate spec. O-3 is a gentle, skippable invitation to create the athlete's first chapter. It is not a gate — the athlete who skips O-3 goes directly to Home and encounters the chapter creation invitation in the Home empty state.

The decision to use O-3 rather than landing on Home directly is intentional: O-2 establishes identity; O-3 establishes purpose. The onboarding arc is:
- O-1: *Who are you?* (Account creation, credentials, display name)
- O-2: *Who are you as an athlete?* (Type, username, photo, history)
- O-3: *What are you building?* (Chapter creation invitation)

**Emotional outcome of O-2: Ownership.**

The athlete who completes O-2 should feel: *This is mine. This is me in Forge Legacy.*

Not excitement at features. Not gamification energy. Not anticipation of challenges. The quiet, meaningful recognition that the athlete has established their record in a system that will hold it for years.

The completion moment achieves this through restraint. No confetti. No celebration animation. No "Welcome to the community!" copy. Just: the athlete's assembled profile, reflected back to them for the first time. "Your legacy starts here." A single CTA to continue.

---

## Section 1 — Purpose

O-2 establishes the athlete's identity in Forge Legacy.

Not their goals. Not their programs. Not their social connections. Their identity.

After O-2, Forge Legacy can address the athlete by name, display their type, show their face in squads, and hold their prior history. The product feels personal from the first session.

**O-2 is a declaration, not a configuration.** The athlete is not setting up features — they are answering a question about who they are. Every step serves that.

---

## Section 2 — Screen Goals

**O-2 succeeds when:**
1. The athlete declares what they train (Athlete Type — required)
2. The athlete has the opportunity to establish a unique address (Username — optional)
3. The athlete has the opportunity to put a face to their profile (Photo — optional)
4. Experienced athletes have the opportunity to honor their prior history (Accomplishments — optional, Path B)
5. The completion moment makes the athlete feel the weight and ownership of having begun something real
6. The entire flow takes under 3 minutes

**O-2 fails when:**
- The athlete is asked for information they cannot understand the purpose of
- A skippable step blocks or pressures the athlete into completion
- The completion moment celebrates features instead of the athlete's beginning
- The flow feels like a productivity tool or social media profile builder
- The athlete type step requires more than a single tap

---

## Section 3 — Information Hierarchy

O-2 is a six-screen sequential flow. The hierarchy:

**O-2a — Path Selection (TIER 1):** Two choices. No form. Tapping a choice is the action. Determines whether O-2e appears.

**O-2b — Athlete Type (TIER 1, Declarative):** The most important identity declaration. Required. One tap.

**O-2c — Username (TIER 2, Utility):** Search address. Optional. Auto-suggested. Low friction.

**O-2d — Profile Photo (TIER 2, Expression):** Face in the system. Optional. Initials avatar as default.

**O-2e — Prior Accomplishments (TIER 2, Honoring history — Path B only):** What has already been built. Optional. Freeform. Skippable.

**O-2f — Completion Moment (TIER 1, Ceremonial):** The assembled profile, revealed for the first time. The emotional outcome. One CTA forward.

---

## Section 4 — O-2a: Path Selection

The first screen of O-2. Two paths. One tap to proceed.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tell us about your           [22sp, primary weight]    │
│  journey.                                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  I'm just getting started.                  →   │   │  ← Path A
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  I've been training for a while.            →   │   │  ← Path B
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**No Continue button.** Tapping a path option immediately advances to O-2b. The tap is the selection AND the navigation action. The selected row briefly highlights (300ms) before transitioning.

**No back navigation from O-2a.** The account was created in O-1 — there is nothing meaningful to go back to. The first screen of O-2 has no ‹ or ✕.

**Path copy rationale:**
- "I'm just getting started." — warm, specific, non-labeling. Not "I'm a beginner" (implies low status) or "New to fitness" (might not be true — they may be new to Forge Legacy but not to training).
- "I've been training for a while." — factual, inclusive. Not "Experienced athlete" (sounds like a category assignment) or "Advanced" (implies hierarchy).

**Path is stored server-side.** If the athlete exits O-2 after O-2a and returns, the path selection is remembered and O-2 resumes from O-2b.

**Path affects only O-2e.** Athletes can update their self-identification (by adding accomplishments, updating athlete type) post-onboarding through P-2. The path selection is not a permanent classification.

---

## Section 5 — O-2b: Athlete Type

The identity declaration. Required.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ‹                                                      │
│                                                         │
│  What do you train?           [22sp, primary weight]    │
│           [Path A variant: "What interests you?"]       │
│                                                         │
│  This shows on your profile.  [15sp, secondary, muted]  │
│  You can change it later.                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌────────────────────┐   ┌────────────────────┐       │
│  │     Strength       │   │   Bodybuilding     │       │
│  └────────────────────┘   └────────────────────┘       │
│                                                         │
│  ┌────────────────────┐   ┌────────────────────┐       │
│  │      Hybrid        │   │     Running        │       │
│  └────────────────────┘   └────────────────────┘       │
│                                                         │
│  ┌────────────────────┐   ┌────────────────────┐       │
│  │     Cycling        │   │     Combat         │       │
│  └────────────────────┘   └────────────────────┘       │
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │                  General                     │      │  ← Full-width last tile
│  └──────────────────────────────────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Title copy by path:**
- Path A: "What interests you?" — forward-looking. The new athlete is declaring intent.
- Path B: "What do you train?" — declarative. The experienced athlete is stating fact.

**Tile layout:** 2×3 grid + 1 full-width tile. 7 tiles total. Each tile is a tappable surface — minimum 52dp height.

**Tile labels (locked per P-1 spec and PRD):**
Strength | Bodybuilding | Hybrid | Running | Cycling | Combat | General

**Tile design:** Tiles may include a small icon above the label — icon selection is a design decision not locked by this spec. Labels are locked.

**Selection behavior:** Tapping a tile selects it (highlighted state, 300ms) then auto-advances to O-2c. No Continue button.

**"General" tile:** Full-width, positioned last. This communicates: it is a complete and valid choice, not a fallback or lesser option. Athletes who do multiple disciplines, follow general fitness routines, or don't fit one of the six specific categories use General.

**No skip path.** Athlete Type is required. Every athlete must tap a tile to proceed. "General" is always a valid answer — no athlete is ever stuck.

**Athlete type can be changed in P-2.** The subtitle copy ("This shows on your profile. You can change it later.") sets this expectation without making the decision feel consequential.

---

## Section 6 — O-2c: Username

Per Identity Amendment 001 v1.1. The username step is optional but strongly encouraged.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ‹                                                      │
│                                                         │
│  Choose your username         [22sp, primary weight]    │
│                                                         │
│  This is how athletes find    [15sp, secondary]         │
│  you in Forge Legacy.                                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Username                         [13sp, muted label]   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  @  isaiahaltamirano                             │   │  ← Auto-suggested, editable
│  └─────────────────────────────────────────────────┘   │
│  Available ✓                  [13sp, success green]     │
│                                                         │
│  [  Continue  ]                   ← Primary, 52dp      │
│                                                         │
│  [  Skip for now  ]               ← Tertiary text link │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**All username rules defined in Identity Amendment 001 v1.1, Section 2.1.** This section establishes placement, not rules.

**Back navigation:** ‹ returns to O-2b (Athlete Type).

**Auto-suggestion:** Username field pre-populated from display name (e.g., "Isaiah Altamirano" → "isaiahaltamirano"). Athlete can edit. Live availability check runs on change.

**Continue button:** Enabled when username is available and format-valid. Disabled (not hidden) when field is empty or invalid.

**"Skip for now":** Always present and functional. Proceeds to O-2d without a username set.

---

## Section 7 — O-2d: Profile Photo

Optional. Initials avatar is the complete default.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ‹                                                      │
│                                                         │
│  Add a photo                  [22sp, primary weight]    │
│                                                         │
│  This is how you appear       [15sp, secondary]         │
│  in squads.                                             │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│              ┌───────────────┐                          │
│              │               │                          │
│              │      I A      │  ← Initials, 88dp circle │
│              │               │                          │
│              └───────────────┘                          │
│                                                         │
│  [  Choose Photo  ]               ← Primary, 52dp      │
│                                                         │
│  [  Skip for now  ]               ← Tertiary text link │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Initials avatar preview:** Shows the athlete's actual initials from their display name — "I A" for "Isaiah Altamirano." Not a generic icon. This communicates: the default is not empty; it is already a valid representation.

**"Choose Photo" tap:**
1. Requests photo library permission (iOS/Android system permission dialog)
2. If granted: opens system photo picker
3. Photo selected → inline crop/preview within O-2d
4. Athlete confirms → photo saved; "Choose Photo" becomes "Change Photo"; "Remove Photo" appears below; "Skip for now" becomes "Continue"
5. If permission denied: inline message "Allow photo access in your device settings to add a photo." Athlete proceeds with initials. No error state.

**Back navigation:** ‹ returns to O-2c (Username).

**"Skip for now":** Always present until photo is confirmed. Proceeds to O-2e (Path B) or O-2f (Path A).

---

## Section 8 — O-2e: Prior Accomplishments (Path B Only)

Honoring what has already been built. Entirely optional. Path B (Experienced Athlete) only.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ‹                                                      │
│                                                         │
│  What have you built          [22sp, primary weight]    │
│  so far?                                                │
│                                                         │
│  Honor what you've already    [15sp, secondary]         │
│  accomplished.                                          │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  + Add an accomplishment                         │   │  ← Tappable row
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  (Added entries appear as scrollable cards with × )     │
│                                                         │
│  [  Continue  ]                   ← Primary, 52dp      │
│                                                         │
│  [  Skip for now  ]               ← Tertiary text link │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Entry card (after adding):**
```
┌─────────────────────────────────────────────────────────┐
│  [×]  Ran my first marathon in under 4 hours (2022)     │
└─────────────────────────────────────────────────────────┘
```

**"+ Add an accomplishment" tap:** Inline text field appears below the row (not a new screen). Athlete types a short description. Tapping "Add" creates an entry card. Field clears; row becomes "+ Add another."

**Entry rules:**
- Freeform text, maximum 150 characters per entry
- Minimum 1 non-whitespace character to enable "Add"
- No categories, no date picker, no structured fields
- No maximum entry count in MVP
- Character counter appears at ≤ 15 remaining

**Entries are saved server-side immediately on "Add" tap** (progressive save, not held until O-2f completion). If the athlete exits and returns, entries are preserved.

**Creation date for entries:** Set to today. Entries are not backdated. The athlete communicates historical context through their entry text.

**Continue:** Advances to O-2f whether or not any entries were added.

**"Skip for now":** Advances to O-2f without any accomplishment entries.

**Back navigation:** ‹ returns to O-2d (Profile Photo). Entries are preserved. If an inline entry field is open (text typed but not yet added) and the athlete taps ‹, a confirmation appears: "Discard this entry?" — Discard / Keep Editing.

**This screen does NOT appear in Path A.**

---

## Section 9 — O-2f: Completion Moment

The assembled profile, revealed for the first time. The emotional outcome of O-2.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR (light text on dark)                 │
│                                                         │
│  [Background: dark charcoal. Optional: faint warm       │
│   photography at low opacity — same aesthetic as O-1a.  │
│   Design decision; not locked by this spec.]            │
│                                                         │
│          ┌──────────────────────┐                       │
│          │                      │                       │
│          │   [Photo or  I A ]   │  ← 88dp circle        │
│          │                      │                       │
│          └──────────────────────┘                       │
│                                                         │
│          [Display Name]       [22sp, light, centered]   │
│          [Athlete Type]       [14sp, muted, centered]   │
│          Apprentice · I       [14sp, muted, centered]   │
│          Forging since        [13sp, muted, centered]   │
│          June 2026                                      │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Your legacy starts here.     [17sp, light, centered]   │
│                                                         │
│  [  Start Building  ]           ← Primary CTA, 52dp    │
│                                                         │
│  Your profile is visible to your squad members.        │
│                               [13sp, muted, centered]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**What appears:**
- Profile photo (or initials avatar if no photo was set)
- Display Name — 22sp, light, centered
- Athlete Type — 14sp, muted, centered
- Starting rank: **Apprentice · I** — 14sp, muted, centered — system-assigned, shown here for the first time
- **"Forging since [Month Year]"** — 13sp, muted, centered — the founding date of their legacy, revealed here for the first time

**"Forging since [Month Year]":**
The emotional center of the completion moment. The athlete did not input this date — it was established when they created their account. Seeing it as part of their assembled profile communicates: *this record already exists. Your legacy has already begun.*

**Starting rank:**
"Apprentice · I" is the first rank for all new athletes. System-assigned, no input required. The completion moment is where the athlete first sees their rank — not as something to grind toward, but as the beginning of a long trajectory.

**"Your legacy starts here.":**
17sp, light, centered. Not a product tagline. A direct acknowledgment of the moment. Not "Welcome to Forge Legacy!" or "You're all set!" — those are product-facing. "Your legacy starts here." is athlete-facing.

**"Your profile is visible to your squad members.":**
Single passive privacy acknowledgment. 13sp, muted, below the primary CTA. Informational only — not a consent action, not a decision point.

**"Start Building" CTA:**
- Full-width, 52dp, primary
- Navigates to O-3 (First Chapter Invitation)
- The only action on this screen

**No back navigation on O-2f.** The profile has been assembled; the onboarding arc is complete. The ‹ is absent.

**No animation or celebration.** The completion moment is still and intentional. No confetti, no "You did it!" overlay, no pulsing achievements. The profile card is the ceremony.

**If display name was skipped in O-1c:**
The Display Name line shows "Athlete" (the system placeholder). An inline prompt appears below: "Add your name" (14sp, muted, tappable) — tapping opens an inline text field within O-2f. The athlete can add their display name before tapping "Start Building." "Start Building" is not blocked by the absent display name.

---

## Section 10 — Skip Behavior

### 10.1 What Is Skippable

| Step | Skippable | Default if skipped |
|------|-----------|-------------------|
| O-2a Path Selection | No — selection IS the navigation action | N/A |
| O-2b Athlete Type | No — required, "General" always available | N/A |
| O-2c Username | Yes | No username set |
| O-2d Profile Photo | Yes | Initials avatar |
| O-2e Prior Accomplishments | Yes (entire step, Path B only) | No accomplishments added |
| O-2f Completion Moment | No — "Start Building" is the only forward path | N/A |

### 10.2 Skip Does Not Mean Incomplete

An athlete who skips Username and Profile Photo has a complete, valid Forge Legacy profile. Skipped fields are not shown as incomplete or missing — they are the correct default state for that athlete at that time.

- No "Complete your profile" progress bar on P-1
- No "X% complete" indicator anywhere in the product
- The only post-onboarding nudge: if Username was skipped, a single contextual prompt appears in P-1 — "Add a username so athletes can find you." No nudges for skipped photo or accomplishments.

### 10.3 Skip and Return

Any skipped field can be set later via P-2 (Edit Profile). No time limit, no penalty, no expiration.

---

## Section 11 — Privacy Defaults

Privacy defaults are set silently at account creation or during O-2 processing. The athlete takes no privacy actions during onboarding.

| Setting | Default | Governs |
|---------|---------|---------|
| Non-squad athlete search | On | Whether non-squad athletes can find this athlete by display name or username search |
| WwF non-squad tagging | On (follows search toggle) | Whether non-squad athletes can initiate a WwF tag request |
| Squad member visibility | On | Whether squad members can see presence and profile card |

All settings are configurable post-onboarding in P-6 (Privacy Settings). P-6 is accessible from P-1 → Settings → Privacy.

The passive privacy disclosure in O-2f is informational only. It does not present the privacy toggle. It does not require a response.

---

## Section 12 — Abandoned Onboarding Recovery

Per O-1 Decision 7: if the athlete exits after O-1 completion but before O-2 completion, O-2 surfaces on next launch before Home. The skip prompt appears for up to 3 launches before the app stops surfacing it.

**Within O-2, each step is a progressive save:**
- Path selected → saved immediately
- Athlete type selected → saved immediately
- Username set → saved immediately
- Photo confirmed → saved immediately
- Accomplishment added → saved immediately

**If the athlete exits mid-O-2 and returns:**
- O-2 resumes from the last uncompleted step
- Previously saved data is pre-populated (athlete type tile shows selection; username field shows saved value; etc.)
- The athlete can back up to earlier steps to change selections

**If the athlete exits at O-2f without tapping "Start Building":**
On return: O-3 is shown. O-2 is not reshown (profile assembly is complete).

---

## Section 13 — Navigation

### 13.1 O-2 Screen Flow (Path A — New to Fitness)

```
O-1c (Display Name) — or O-1b via social auth
         ↓ account created
O-2a (Path Selection) — "I'm just getting started."
         ↓ tile tap
O-2b (Athlete Type)
         ↓ tile tap
O-2c (Username)
         ↓ Continue OR Skip for now
O-2d (Profile Photo)
         ↓ Continue OR Skip for now
O-2f (Completion Moment)
         ↓ "Start Building"
O-3 (First Chapter Invitation)
```

### 13.2 O-2 Screen Flow (Path B — Experienced Athlete)

```
O-2a (Path Selection) — "I've been training for a while."
         ↓ tile tap
O-2b (Athlete Type)
         ↓ tile tap
O-2c (Username)
         ↓ Continue OR Skip for now
O-2d (Profile Photo)
         ↓ Continue OR Skip for now
O-2e (Prior Accomplishments)
         ↓ Continue OR Skip for now
O-2f (Completion Moment)
         ↓ "Start Building"
O-3 (First Chapter Invitation)
```

### 13.3 Back Navigation

| Screen | Back navigates to |
|--------|-----------------|
| O-2a | No back (first O-2 screen; account already created) |
| O-2b | O-2a |
| O-2c | O-2b |
| O-2d | O-2c |
| O-2e | O-2d |
| O-2f | No back (profile assembled; onboarding arc complete) |

Back navigation returns to the previous O-2 screen with existing selections preserved. Athlete type selection persists through back navigation — the tile shows as selected on return to O-2b.

### 13.4 O-2 Does Not Navigate To

- Home (H-1) directly — O-2 exits to O-3
- Profile (P-1) — accessible post-onboarding
- Any workout, squad, goal, or program screen
- O-1 screens — account already created

---

## Section 14 — Mobile UX

### 14.1 Screen Types

All O-2 screens are standard navigation screens in a sequential push-navigation stack. Not modals. Not bottom sheets — except the accomplishment inline entry field in O-2e, which is an in-place expanding field.

### 14.2 Keyboard Behavior

- O-2c (Username): auto-focus on screen open, keyboard appears immediately
- O-2e accomplishment entry: keyboard appears when "+ Add an accomplishment" is tapped
- All screens: keyboard avoidance via scroll — active field stays above keyboard

### 14.3 Tap Target Minimums

| Element | Minimum |
|---------|---------|
| Path selection tiles (O-2a) | Full-width × 64dp |
| Athlete type grid tiles (O-2b) | ~50% width × 52dp |
| "General" full-width tile (O-2b) | Full-width × 52dp |
| ‹ back button | 44×44dp |
| Continue / "Start Building" buttons | Full-width × 52dp |
| "Skip for now" text link | 44dp touch area minimum |
| "Choose Photo" button | Full-width × 52dp |
| "+ Add an accomplishment" row | Full-width × 52dp |
| Accomplishment × remove | 44×44dp |

### 14.4 Portrait Orientation

All O-2 screens are portrait only.

### 14.5 Progressive Save

All step completions are saved server-side immediately. O-2 does not hold a draft until the completion moment.

---

## Section 15 — Accessibility

**O-2a (Path Selection):**
- Screen title announced on load: "Tell us about your journey"
- Path A tile: `accessibilityLabel` = "I'm just getting started — tap to choose this path"
- Path B tile: `accessibilityLabel` = "I've been training for a while — tap to choose this path"

**O-2b (Athlete Type):**
- Screen title announced on load
- Each tile: `accessibilityLabel` = "[Type] — tap to select and continue"
- Selected tile: `accessibilityValue` communicates selected state

**O-2c (Username):**
- Per Identity Amendment 001 v1.1 accessibility requirements

**O-2d (Profile Photo):**
- Initials avatar: `accessibilityLabel` = "[Initials] — your default avatar"
- "Choose Photo": `accessibilityLabel` = "Choose a profile photo"
- "Skip for now": `accessibilityLabel` = "Skip, continue with initials avatar"
- After photo confirmed: "Change Photo" and "Remove Photo" labeled accordingly

**O-2e (Prior Accomplishments):**
- "+ Add an accomplishment": `accessibilityLabel` = "Add an accomplishment — tap to enter text"
- Each entry card: `accessibilityLabel` = "[entry text], removable"
- × remove button: `accessibilityLabel` = "Remove: [entry text]"

**O-2f (Completion Moment):**
- Profile card elements are in the accessibility tree (read-only)
- "Start Building": `accessibilityLabel` = "Start building your legacy"
- "Forging since [Month Year]": in accessibility tree
- Privacy disclosure: in accessibility tree

---

## Section 16 — Edge Cases

### 16.1 Display Name Skipped in O-1c

O-2a through O-2e proceed normally. At O-2f: Display Name line shows "Athlete." An inline prompt below reads "Add your name" (14sp, muted, tappable) — opens an inline text field. Athlete can set their name before tapping "Start Building." "Start Building" is not blocked.

### 16.2 Back Navigation to Change Athlete Type

If the athlete selects Strength, advances to O-2c, then navigates ‹ back to O-2b: the Strength tile shows as selected. Tapping a different tile changes the selection and saves immediately.

### 16.3 Username Auto-Suggestion Exceeds 20 Characters

Display name "Alexander Hamilton Fitzgerald" → truncates to "alexanderhamilto" (20 chars). Pre-populated; athlete edits if desired. No error.

### 16.4 Username Auto-Suggestion Already Taken

System appends incrementing number: "alexanderhamilto2", "alexanderhamilto3", etc. First available variant is suggested. If variants through 99 are all taken: field shown empty; athlete enters manually.

### 16.5 Photo Upload Fails (Network Error)

Toast: "Couldn't save your photo. Check your connection and try again." "Choose Photo" and crop preview remain visible. Athlete can retry or skip. Onboarding does not block on upload failure.

### 16.6 Large Photo File

System compresses before upload. Crop/preview shows compressed result. No explicit file size error — compression is transparent to the athlete.

### 16.7 Accomplishment Text at Limit

Input blocked at 150 characters. Counter appears at ≤ 15 remaining; turns accent color at 0 remaining.

### 16.8 Accomplishment Entry Open on Back Navigation

If the inline entry field has unsaved text and the athlete taps ‹: "Discard this entry?" — Discard / Keep Editing. Discard: navigates to O-2d, entry dropped. Keep Editing: returns to O-2e, text preserved.

### 16.9 O-3 Not Yet Built at Ship Time

"Start Building" navigates to Home (H-1). The W-1 "No Active Chapter" empty state serves as the chapter creation invitation. Documented as a temporary fallback; O-3 replaces it when built.

### 16.10 Athlete Completed O-2 on One Device, Opens App on Another

O-2 is NOT reshown (onboarding completion is account-level, not device-level). Athlete goes directly to their current state — O-3 if not yet completed, or Home.

### 16.11 Path B Athlete Exits After Adding Accomplishments, Returns

O-2e shows the preserved entry cards on resume. Athlete can add more, remove existing, or continue.

---

## Section 17 — Architecture Risks

### Risk 1 — O-3 Spec Undefined

**Issue:** O-2f exits to O-3, which has not been specified. If O-3 is not ready when O-2 is implemented, "Start Building" has no destination.

**Recommendation:** Implement O-2f → Home (H-1) as a fallback until O-3 is built. Home empty state (W-1 "No Active Chapter" card) is a functional equivalent. Document as temporary.

**Risk level:** Low for O-2. Medium for onboarding arc completeness.

---

### Risk 2 — Dual-Path State Persistence

**Issue:** Path selection (A vs. B) must be stored server-side. If stored client-only, a device switch or reinstall loses the state and defaults to Path A, causing experienced athletes to skip O-2e.

**Recommendation:** Path selection is the first server-save of O-2. Must be treated as account-level state, not a local preference.

**Risk level:** Medium.

---

### Risk 3 — L-5 Chapter Creation and O-3

**RESOLVED — O-2-A1 | June 2026**

L-5 Chapter Creation has been specced (L-5-Chapter-Creation-Spec.md). The O-3/L-5/G-3 integration is now defined: O-3 is the onboarding entry point, which flows into L-5 for chapter creation; G-3 (Goal Create/Edit) is reached from L-5 during chapter setup. No changes to O-2 are required; the risk fully transferred to O-3 design as originally noted.

**Original issue:** G-3 (Goal Create/Edit) references "L-5 Chapter Creation" as an entry point. L-5 was not yet specced. O-3 is the onboarding entry point for chapter creation. The relationship between O-3, L-5, and G-3 integration was undefined.

**Risk level:** Closed — L-5 specced.

---

### Risk 4 — Accomplishments API: Account-Level Entries

**Issue:** O-2e accomplishments must be stored in the Accomplishments system (used by L-12 and P-1). These entries have no chapter association — they are account-level pre-history. The API must support chapter-less entries.

**Architecture clarification:** The Accomplishments system must support two distinct contexts — account-level (created outside any chapter, e.g., O-2e) and chapter-level (created within a chapter later in the product). Both are first-class records. Neither is secondary to the other. A `chapterId` field (or equivalent) must be nullable: `null` for account-level entries, `[id]` for chapter-level entries. Full model documented in `Docs/Accomplishments-Architecture-Note.md`.

**Recommendation:** Confirm Accomplishments data model supports nullable chapter association before implementing O-2e.

**Risk level:** Medium. Requires explicit data model confirmation before O-2e implementation.

---

## Section 18 — Validation Checklist

### O-2a — Path Selection
- [ ] Title: "Tell us about your journey." — 22sp, primary weight
- [ ] Two tiles: "I'm just getting started." / "I've been training for a while."
- [ ] No Continue button — tile tap navigates immediately with 300ms highlight
- [ ] Path stored server-side on tap
- [ ] No back navigation from O-2a

### O-2b — Athlete Type
- [ ] Title: "What do you train?" (Path B) / "What interests you?" (Path A) — 22sp
- [ ] Subtitle: "This shows on your profile. You can change it later." — 15sp, muted
- [ ] All 7 tiles: Strength, Bodybuilding, Hybrid, Running, Cycling, Combat, General
- [ ] Layout: 2×3 grid + 1 full-width "General" tile
- [ ] No skip path — required
- [ ] Tile tap: 300ms highlight → auto-advance to O-2c
- [ ] Athlete type saved server-side on tile tap
- [ ] Back navigation returns to O-2a

### O-2c — Username
- [ ] Per Identity Amendment 001 v1.1 validation checklist
- [ ] Positioned after O-2b, before O-2d
- [ ] Back navigation returns to O-2b

### O-2d — Profile Photo
- [ ] Title: "Add a photo" — 22sp
- [ ] Subtitle: "This is how you appear in squads." — 15sp
- [ ] Initials avatar: 88dp circle, athlete's actual initials
- [ ] "Choose Photo" — full-width, 52dp
- [ ] "Skip for now" link — present until photo confirmed
- [ ] Permission request fires on "Choose Photo" tap
- [ ] Permission denied: inline message, graceful fallback to initials
- [ ] After photo confirmed: "Change Photo" / "Remove Photo" visible; "Skip for now" → "Continue"
- [ ] Photo saved server-side on confirmation
- [ ] Back navigation returns to O-2c

### O-2e — Prior Accomplishments (Path B Only)
- [ ] Title: "What have you built so far?" — 22sp
- [ ] Subtitle: "Honor what you've already accomplished." — 15sp
- [ ] "+ Add an accomplishment" tappable row — full-width, 52dp
- [ ] Inline text field: freeform, max 150 characters
- [ ] Character counter at ≤ 15 remaining
- [ ] "Add" disabled until ≥ 1 non-whitespace character
- [ ] Entry card with × remove
- [ ] No maximum entry count
- [ ] Entries saved server-side immediately on "Add"
- [ ] Continue advances regardless of entry count
- [ ] "Skip for now" always present
- [ ] Open entry field on ‹ back triggers discard confirmation
- [ ] NOT present in Path A flow

### O-2f — Completion Moment
- [ ] No back navigation
- [ ] Profile photo or initials avatar — 88dp
- [ ] Display Name — 22sp, light, centered
- [ ] Athlete Type — 14sp, muted, centered
- [ ] Starting rank: "Apprentice · I" — 14sp, muted, centered
- [ ] "Forging since [Month Year]" — 13sp, muted, centered
- [ ] Statement: "Your legacy starts here." — 17sp, light, centered
- [ ] "Start Building" CTA — full-width, 52dp, primary
- [ ] Privacy disclosure: "Your profile is visible to your squad members." — 13sp, muted, below CTA
- [ ] If display name skipped: "Add your name" inline prompt; "Start Building" not blocked
- [ ] No animation, confetti, or celebration overlay
- [ ] "Start Building" → O-3 (or Home fallback if O-3 not built)

### Skip Behavior
- [ ] Username skip: no username set; P-1 nudge appears post-onboarding
- [ ] Photo skip: initials avatar; no post-onboarding nudge for photo
- [ ] Accomplishments skip (Path B): no entries created; no post-onboarding nudge
- [ ] No "complete your profile" progress bar anywhere
- [ ] No "X% complete" metric anywhere

### Privacy Defaults
- [ ] Non-squad search On by default — set silently at account creation
- [ ] No privacy screen in O-2
- [ ] O-2f privacy disclosure is passive — no action required
- [ ] P-6 accessible post-onboarding from P-1 → Settings → Privacy

### Navigation
- [ ] O-2a → O-2b on tile tap
- [ ] O-2b → O-2c on tile tap
- [ ] O-2c → O-2d on Continue or Skip
- [ ] O-2d → O-2e (Path B) or O-2f (Path A) on Continue or Skip
- [ ] O-2e → O-2f on Continue or Skip
- [ ] O-2f → O-3 on "Start Building"
- [ ] All ‹ back navigations functional except O-2a and O-2f

### Abandoned Onboarding Recovery
- [ ] Each step saves server-side immediately (progressive save)
- [ ] O-2 resumes from last uncompleted step on return
- [ ] Previously saved selections pre-populated on resume
- [ ] O-2 not reshown after O-2f completion

---

## Section 19 — Downstream Dependencies

| Dependency | What O-2 Requires | Priority |
|------------|------------------|----------|
| O-3 spec | Must define First Chapter Invitation and skip behavior | High — O-2f exit destination |
| Accomplishments API | Must support account-level entries with no chapter association | High — blocks O-2e implementation |
| Photo upload service | Photo library access, upload, storage from O-2d | High |
| Athlete type data model | Accept one of 7 enum values; stored at account level | High |
| Username system | Fully defined by Identity Amendment 001 — must be implemented per that spec | High |
| P-1 Profile | O-2f completion moment mirrors P-1 identity block — must use same data model | Medium |
| P-2 Edit Profile | All O-2 fields are editable post-onboarding via P-2 | Medium |
| P-6 Privacy | Default privacy settings applied at account creation; P-6 surfaces them post-onboarding | Medium |
| L-5 Chapter Creation | Referenced by O-3 — not a direct O-2 dependency | RESOLVED — L-5 specced (O-2-A1) |

---

## Section 20 — Post-MVP Architecture Backlog

Items in this section are deferred for post-MVP consideration. **No O-2 v1.0 behavior, flow, navigation, validation, copy, or wireframe is affected by any item below.**

---

### Post-MVP Item 1 — Athlete Type Expansion Framework

**The seven MVP athlete types are locked. This entry documents the deferral and records future expansion considerations only.**

**MVP athlete types (final for v1.0):**
- Strength
- Bodybuilding
- Hybrid
- Running
- Cycling
- Combat
- General

**Candidate types considered and intentionally deferred:**
- CrossFit (requires community/affiliation context not yet specced)
- Hiking / Trail Running (sub-specialization of Running considered but deferred)
- Triathlon (multi-sport; may require a composite type model)
- Functional Fitness (overlaps significantly with Hybrid)
- Team Sports (requires team and sport context not yet specced)

**What post-MVP expansion requires (for future architecture work):**
- Athlete Type data model that supports extending the enum without migrating existing athlete records
- O-2b UI changes: additional tiles, or a scrollable tile pattern if the type list grows beyond 9–10
- P-1 and P-2 changes to reflect new type values
- A decision on whether existing "General" athletes can retroactively re-categorize when new types become available

This backlog item does not affect O-2 v1.0.

---

## Change Log

### v1.0 — June 2026 (Locked)

Initial specification. O-2 First-Time Setup established as the identity-declaration phase of onboarding. Six sub-screens: O-2a Path Selection, O-2b Athlete Type, O-2c Username, O-2d Profile Photo, O-2e Prior Accomplishments (Path B only), O-2f Completion Moment. Eight architecture decisions resolved: dual-path via single selection screen (O-2e differentiates paths); athlete type required with "General" as inclusive full-width option; username placement and behavior per Identity Amendment 001 v1.1; profile photo optional with initials default; prior accomplishments optional freeform text for Path B only; Forging Since revealed at completion moment (system-set, never editable, never collected); privacy defaults set silently with passive disclosure in O-2f; O-2 exits to O-3 (not Home) with Ownership as the intended emotional outcome. Four architecture risks documented. Downstream dependency on O-3 spec identified as the highest-priority follow-up.

**Non-behavior additions applied at lock (no screen, flow, navigation, validation, copy, or wireframe changes):**
- Section 20 added: Post-MVP Athlete Type Expansion Framework. Documents the MVP 7-type enum as locked and records deferred expansion candidates.
- Risk 4 expanded: Architecture clarification added documenting account-level vs. chapter-level accomplishment distinction. References `Docs/Accomplishments-Architecture-Note.md`.
- Status updated from Lock-Ready to Locked.

---

---

### v1.0.1 (O-2-A1) — June 2026

Batch closure amendment. Architecture Risk 3 (L-5/O-3 integration undefined) marked RESOLVED — L-5 Chapter Creation spec now exists. §19 downstream dependencies table updated. No O-2 screen, flow, navigation, copy, or wireframe changes.

---

*Forge Legacy First-Time Setup Wireframe Specification — O-2*
*v1.0 — June 2026 | Amended O-2-A1 June 2026*
*Authority: Master PRD Section 5 (MVP), Section 3 (Target User), Product DNA, Identity Amendment 001 v1.1, O-1 v1.0*
