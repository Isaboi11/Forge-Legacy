# O-2 Amendment 001 — Athlete Type Declaration
## Amendment to First-Time Setup Wireframe Spec (O-2)
### June 2026

**Status:** LOCKED v1.0

**Type:** Screen Specification Amendment

**Date:** June 2026

**Amends:** First-Time-Setup-Wireframe-Spec-O2.md v1.0 (LOCKED)

**Amendment Trigger:** Q8 decision in Rank-Calibration-Decisions.md v1.0 (LOCKED)

**Authority Chain:**
- Rank-Calibration-Decisions.md v1.0 Q8 (LOCKED — athlete type declaration mechanism)
- Rank-Computation-Model.md Sessions 1–5 (LOCKED — Personal Improvement evaluation model)
- First-Time-Setup-Wireframe-Spec-O2.md v1.0 (LOCKED — amended by this document)

**Downstream Dependents:**
- P-1 Profile Amendment (required — athlete type editability; see Section 9)
- Rank Evaluation Service (type-dependent Personal Improvement evaluation; see Section 7)
- P-2.2 Rank Journey Detail (OQ-P2S-2 resolution — type display in Personal Improvement signal)

**Amendment Log:**
- v1.0 — June 2026 (LOCKED): Initial specification. Four-type athlete type model (Strength, Bodybuilding, Endurance, Hybrid) established. O-2b tile set replaced. Editability reference corrected to P-1. Type change policy, re-attribution model, and Personal Improvement evaluation context defined. Subtitle copy locked (Option A). Hybrid positioning accepted as MVP home for combat/martial arts athletes. Bodybuilding set-level data dependency noted as engineering prerequisite for evaluation implementation (not lock blocker). Q8 type label supersession documented. All open questions and concerns resolved. Downstream dependencies confirmed unchanged.

---

## Section 1 — Amendment Summary

O-2 v1.0 Section 5 establishes O-2b (Athlete Type) as a required step collecting one of seven profile display types: Strength, Bodybuilding, Hybrid, Running, Cycling, Combat, General. This set was specified before the Rank Calibration Decisions were resolved.

Q8 (Rank-Calibration-Decisions.md, LOCKED) establishes the authoritative set of MVP athlete types for Personal Improvement evaluation. Q8 specifies that athlete type is declared at onboarding (O-2) and is editable via P-1 Profile. This amendment implements Q8's declaration mechanism using four types — **Strength, Bodybuilding, Endurance, Hybrid** — which reflect the product's actual athlete population and provide a more extensible foundation than Q8's provisional type labels. See Section 15 for the full type model revision rationale.

**This amendment reconciles O-2 v1.0 with Q8 by:**

1. Replacing the seven-tile O-2b layout with a four-tile layout — Strength, Bodybuilding, Endurance, Hybrid
2. Correcting the editability reference from "P-2" to "P-1 Edit Profile" (O-2 v1.0 Decision 2 contained an incorrect reference)
3. Defining tile copy principles and selection behavior for the four-type model
4. Establishing the downstream connection between O-2b selection and the Rank Evaluation Service
5. Defining the type change policy for athletes who update their type post-onboarding

**Scope:**
This amendment modifies O-2 Sections 5, 10.1, 14.3, 15, 18, and 19. All other O-2 sections are unaffected. This amendment does not redesign onboarding, modify the navigation map, alter skip behavior for other steps, create new athlete types, or modify rank architecture.

---

## Section 2 — What This Amendment Changes

| O-2 Section | Change |
|---|---|
| Section 5 — O-2b (Athlete Type) | Replace seven-tile layout with four-tile layout (Strength, Bodybuilding, Endurance, Hybrid); update tile copy; update editability reference from P-2 to P-1; all other O-2b behaviors unchanged |
| Decision 2 (Architecture Decisions) | Correct editability reference: "editable via P-1 Profile" (not "P-2") |
| Section 10.1 — Skip Behavior table | Athlete Type row unchanged (still required); footnote added referencing Q8 type mapping |
| Section 14.3 — Tap Target Minimums | Update grid tile specification from 2×3 + 1 to 2×2; minimum sizes unchanged |
| Section 15 — Accessibility | Update O-2b accessibility labels to reflect four types |
| Section 18 — Validation Checklist | Replace O-2b checklist items to reflect four types and corrected editability reference |
| Section 19 — Downstream Dependencies | Update athlete type data model note to reflect four-type enum |

---

## Section 3 — What This Amendment Does Not Change

- O-2a Path Selection — unaffected
- O-2c Username — unaffected
- O-2d Profile Photo — unaffected
- O-2e Prior Accomplishments (Path B) — unaffected
- O-2f Completion Moment — unaffected (athlete type line still displays the selected type)
- Navigation map — unaffected (O-2b → O-2c on tile tap; back → O-2a)
- Required status of O-2b — athlete type remains required; no skip path
- Auto-advance behavior — tile tap selects and auto-advances, unchanged
- Progressive save behavior — type saved server-side on tile tap, unchanged
- Abandoned onboarding recovery — O-2b selected tile shown as pre-selected on resume, unchanged
- O-2 emotional arc and identity-declaration framing — unchanged
- Rank promotion logic — no rank architecture is modified
- Personal Improvement evaluation rules — no modification to Q8–Q13 decisions

---

## Section 4 — Replaced: O-2 Section 5 — O-2b: Athlete Type

The following replaces O-2 v1.0 Section 5 in its entirety. All behaviors not explicitly redefined here carry forward from O-2 v1.0 Section 5 without change.

---

### O-2b — Athlete Type

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
│  This shapes how your         [15sp, secondary, muted]  │
│  development is recognized.                             │
│  You can change it later.                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌────────────────────┐   ┌────────────────────┐       │
│  │                    │   │                    │       │
│  │     Strength       │   │   Bodybuilding     │       │
│  │                    │   │                    │       │
│  └────────────────────┘   └────────────────────┘       │
│                                                         │
│  ┌────────────────────┐   ┌────────────────────┐       │
│  │                    │   │                    │       │
│  │    Endurance       │   │     Hybrid         │       │
│  │                    │   │                    │       │
│  └────────────────────┘   └────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Title copy by path:**
- Path B (Experienced Athlete): "What do you train?" — declarative. The experienced athlete is stating current practice.
- Path A (New to Fitness): "What interests you?" — forward-looking. The new athlete is declaring intent.

**Subtitle copy:**
"This shapes how your development is recognized. You can change it later."

This subtitle replaces O-2 v1.0's "This shows on your profile. You can change it later." The updated copy is accurate to the type's primary function: it governs how the Rank Evaluation Service reads the athlete's Personal Improvement signals. It still communicates that the choice is changeable — the decision carries no permanent consequence.

**Tile layout:** 2×2 grid. Four tiles total. Each tile occupies half the available width and is a tappable surface — minimum 88dp height for the tile container including label.

**Tile labels (locked per this amendment):**
Strength | Bodybuilding | Endurance | Hybrid

**Selection behavior:** Tapping a tile selects it (highlighted state, 300ms) then auto-advances to O-2c. No Continue button. Tile tap is both the selection action and the navigation action.

**Athlete type saved server-side immediately on tile tap** (progressive save). If the athlete backs up to O-2b, the selected tile renders in its highlighted/selected state.

**No skip path.** Athlete type is required. Every athlete must tap a tile to proceed. All four types are unambiguous — no athlete should be unable to find a type that fits. Hybrid is the correct choice for athletes who train multiple disciplines or who do not primarily identify with Strength, Bodybuilding, or Endurance.

**Editability:** Athlete type can be changed at any time via the Edit Profile action on P-1 (Profile screen). It is not editable from P-2 (Progress Hub). The type change policy is defined in Section 8 of this amendment.

**Back navigation:** ‹ returns to O-2a (Path Selection) with no data loss.

---

## Section 5 — Tile Copy Specification

### 5.1 Tile Display Content

Each tile contains the type name. Tiles may additionally include a brief descriptor in secondary type below the label — implementation detail not locked by this spec. If descriptors are included, they must adhere to the copy principles in Section 5.2.

**Reference descriptors (not locked — design decision):**

| Tile | Label | Reference Descriptor |
|---|---|---|
| Strength | Strength | Lifting, powerlifting, max-effort resistance |
| Bodybuilding | Bodybuilding | Hypertrophy, volume training, physique-focused |
| Endurance | Endurance | Running, cycling, rowing, cardio-based sports |
| Hybrid | Hybrid | Multiple disciplines or general fitness |

### 5.2 Tile Copy Principles

**Identity-first language.** The tile labels name what the athlete does, not a performance category. "Strength" names an activity identity; "Advanced Lifter" would name a performance tier. These are identity declarations, not ability assessments.

**Bodybuilding and Strength are distinct identities.** Both involve resistance training, but they represent different training philosophies and different personal best signals. Strength athletes train for maximal output — the heaviest lift, the highest intensity. Bodybuilding athletes train for volume and hypertrophy — progressive overload across volume, not single-rep maximums. An athlete who identifies with physique development, volume programming, or hypertrophy-focused training selects Bodybuilding. An athlete who identifies with maximal strength, powerlifting, or intensity-focused resistance training selects Strength. The two tiles are equal in visual weight and position — neither implies superiority.

**Endurance covers the full aerobic modality spectrum.** Endurance is not limited to running. It covers running, cycling, rowing, swimming, trail running, triathlon, and any activity where sustained aerobic output and pace or distance improvement are the primary training targets. The descriptor "Running, cycling, rowing, cardio-based sports" communicates this breadth without listing every modality. An athlete whose primary training identity is any endurance discipline selects Endurance.

**Hybrid is not a fallback.** Hybrid is a first-class athlete identity. Athletes who train across modalities — Strength and Endurance, Bodybuilding and another discipline, any cross-training combination — are Hybrid athletes. The tile design, size, and position give Hybrid equal standing with the other three types. The reference descriptor ("Multiple disciplines or general fitness") communicates that Hybrid covers both intentional multi-sport athletes and athletes who follow general fitness programming. Athletes who are uncertain which type fits best should be guided toward Hybrid — the evaluation logic is the most inclusive and accommodating of mixed training.

**No performance implication.** No tile implies a higher or lower training level than any other. "Strength" does not imply more dedication than "Endurance," and "Bodybuilding" does not imply more effort than either. Each type names a modality identity, not an achievement level.

**No activity restriction implied.** The subtitle copy ("This shapes how your development is recognized. You can change it later.") frames the type as a recognition lens, not a gate. Athletes who select Strength can still log Endurance sessions. Athletes who select Endurance can still log Strength workouts. The type selection does not restrict the athlete's activity logging in any way.

### 5.3 Path A (New to Fitness) Considerations

For athletes who tap "I'm just getting started" on O-2a, the O-2b title reads "What interests you?" The tiles are identical. The framing communicates that this is a declaration of interest, not a certification of experience. An athlete who is new to fitness and primarily interested in lifting for strength taps Strength. An athlete new to lifting who wants to train for size and aesthetics taps Bodybuilding. An athlete who wants to run or do cardio-based training taps Endurance. An athlete who plans to mix modalities or is still exploring selects Hybrid. The tiles present four equally valid directions.

---

## Section 6 — Validation Behavior

### 6.1 Required, No Skip

Athlete type is required. The Continue or auto-advance mechanism does not fire until a tile is tapped. "General" (O-2 v1.0) is no longer present — Hybrid serves this function.

If the athlete attempts to navigate forward without selecting a tile (which cannot occur in the auto-advance model, but is documented for completeness): no forward navigation occurs. The tile grid remains presented.

### 6.2 Back Navigation Preserves Selection

If the athlete selects a tile, auto-advances to O-2c, then navigates ‹ back to O-2b: the selected tile renders in its selected state. Tapping a different tile changes the selection, saves the new type server-side, and auto-advances to O-2c.

### 6.3 Progressive Save

Type is saved to the athlete's server-side record the moment the tile tap fires. If the athlete exits mid-onboarding after O-2b, the saved type is pre-populated when O-2 resumes. The athlete sees their selected tile highlighted. They can change it or continue forward.

### 6.4 Completion Moment (O-2f)

The selected athlete type is displayed on the O-2f Completion Moment screen in the Identity Header, consistent with O-2 v1.0. The displayed type name matches the tile label exactly (e.g., "Strength", "Bodybuilding", "Endurance", "Hybrid").

---

## Section 7 — Downstream Impact on Rank Evaluation Service and Personal Improvement Signal

### 7.1 Athlete Type as Evaluation Context

The athlete type declared in O-2b is the primary context input for the Rank Evaluation Service's Personal Improvement module (TBD-8, resolved in RCM Sessions 1–5). The evaluation service reads `athlete.athleteType` to determine which performance signals constitute a personal best for this athlete.

Personal Improvement evaluation by type (per RCM §9, Q8, as implemented by this amendment):

| Athlete Type | Primary Signal | Secondary Fallback | Evaluation Logic |
|---|---|---|---|
| Strength | Intensity personal best — highest weight lifted at any rep count on a primary compound exercise (1RM equivalent) | Next-highest intensity exercise if primary exercise inactive | AND — primary signal must show improvement |
| Bodybuilding | Volume personal best — highest total session volume (sets × reps × weight) on a primary compound exercise | Rep personal best (most reps at a working weight) if volume data insufficient | AND — primary signal must show improvement |
| Endurance | Pace or distance personal best across any endurance activity type (running, cycling, rowing, etc.) | Next-best endurance activity if primary inactive | AND — primary signal must show improvement |
| Hybrid | Any modality personal best across all canonical activity types | All canonical activity types eligible | OR — improvement in any one actively trained modality counts |

**Strength vs. Bodybuilding signal distinction:** Both types use resistance training sessions. They diverge on the dimension of measurement. Strength tracks the highest intensity moment (the heaviest lift, regardless of volume). Bodybuilding tracks the highest volume session (the most total work done on a given exercise). An athlete who sets a new 1RM on bench press increments a Strength personal best. An athlete who sets a new session volume on bench press (e.g., more total load than any prior session) increments a Bodybuilding personal best. An athlete declared as Bodybuilding who also sets a new 1RM has that data recorded in session history — but it does not increment their Bodybuilding personal best count unless the volume signal was also a personal best.

The evaluation service does not evaluate improvement across types. It reads the declared type and applies the matching evaluation logic exclusively. If an athlete's type is Strength, their Endurance personal bests are recorded in the session history but do not increment their Personal Improvement count for rank evaluation purposes.

### 7.2 What Athlete Type Does Not Do

| Restriction | Applies? | Notes |
|---|---|---|
| Restricts activity logging | No | Athletes log any canonical activity type regardless of declared type |
| Restricts program enrollment | No | All programs are available regardless of type |
| Restricts honor eligibility | No | All honors are evaluated independently of type |
| Affects rank promotion thresholds (other than Personal Improvement) | No | Training Consistency, Volume, Program Progression, Goals, Chapters are type-agnostic |
| Restricts squad membership or WwF eligibility | No | Social features are type-agnostic |
| Determines what appears on the athlete's P-1 profile | Display only | The selected type label appears in the P-1 Identity Header as a profile identity field |

### 7.3 Type Known at Session One

Declaring type at O-2 ensures the evaluation service can correctly attribute Personal Improvement signals from the first native session. The athlete's earliest sessions establish their personal best baseline — the foundational measurement from which improvement is calculated (Q8 rationale: "Personal Improvement baseline starts at session one"). Type declared during onboarding eliminates the silent failure mode where early sessions have no type attribution.

### 7.4 Import Athletes

Imported sessions do not carry athlete type metadata. At import time, the athlete's declared type (set in O-2b before import execution) applies retroactively to the imported session history. Personal bests from imported performance data (weight, reps, distance, pace) establish the athlete's historical baseline. Improvement is evaluated from that baseline forward using the declared type's evaluation logic.

If the athlete changes their type after import (via P-1 Edit Profile), historical improvement data is re-attributed to the new type per the type change policy in Section 8.

### 7.5 P-2.2 Personal Improvement Signal Display (OQ-P2S-2 Resolution)

The P-2 Progress Hub Spec (OQ-P2S-2) asks whether the athlete's declared type should appear in parentheses within the Personal Improvement Category Signal in P-2.2 Rank Journey Detail. The recommendation in OQ-P2S-2 is Option A (show type in parentheses).

**This amendment supports Option A.** The athlete type declared in O-2b is the precise context the evaluation service uses. Displaying it in P-2.2 creates a legible connection between the athlete's declared identity and how their improvement is being recognized:

> Personal Improvement (Strength) ◑ Developing

The type label in parentheses confirms to the athlete which modality's personal bests are being evaluated. This is especially valuable for Hybrid athletes, whose improvement is evaluated across all active modalities.

The display format in P-2.2 uses the tile label verbatim (Strength / Bodybuilding / Endurance / Hybrid). Resolution of OQ-P2S-2 remains at user discretion; this amendment documents that the required data (athlete type) is available from O-2b to support Option A.

---

## Section 8 — Type Change Policy (Editability Handoff to P-1)

### 8.1 Where Editability Lives

Athlete type is editable via the **Edit Profile action on P-1 (Profile screen)**. This corrects O-2 v1.0 Decision 2, which incorrectly stated "Athlete type can be changed in P-2 at any time." P-2 is the Progress Hub — athlete type is not editable there. The correct surface is P-1 Edit Profile.

P-1 requires a follow-up amendment to add the athlete type field (editable). See Section 9.

### 8.2 What Happens When an Athlete Changes Their Type

Per Q8 decision (LOCKED), the following applies on every type change:

1. **Historical sessions are re-attributed to the new type.** The Rank Evaluation Service runs a re-evaluation job against the athlete's full session history using the new type's evaluation logic. Personal Improvement history is recalculated.

2. **Personal best records from the prior type are retained in session history.** If the new type uses a different primary signal (e.g., an athlete switches from Endurance to Strength), endurance-specific personal bests remain in the session log but no longer feed the active Personal Improvement count. They are not deleted.

3. **Type changes are non-destructive.** If an athlete switches from Strength to Endurance and then back to Strength, the re-attribution applies each time. Historical data is never deleted. The most recent type declaration is always the active evaluation context.

4. **Type change is logged with a timestamp** on the athlete data model: `typeHistory: [{ type: AthleteType, effectiveDate: DateTime }]`. This log is required for audit, for correctly anchoring improvement pattern detection across type transitions, and for the evaluation service to correctly interpret the chronology of type changes when evaluating personal bests.

5. **The re-evaluation job is asynchronous.** From the athlete's perspective, their type updates immediately on P-1. The evaluation service re-attribution runs in the background. P-2.2 Personal Improvement signals may briefly reflect a stale state until re-evaluation completes.

### 8.3 Type Change Is Not Consequential

The O-2b subtitle ("You can change it later.") communicates that the initial declaration is revisable. Athlete type changes do not affect rank promotions already granted, honors already earned, or chapters already sealed. The only downstream effect of a type change is on the Personal Improvement signal computation going forward — and retroactively, on historical improvement evidence (which is re-attributed, not deleted).

### 8.4 Type Transition Examples

| Scenario | Outcome |
|---|---|
| Strength → Bodybuilding (athlete shifts training focus from intensity to volume) | Intensity-based personal bests (1RM-equivalent records) are retained in session history but no longer increment the active improvement count. Volume-based personal bests (session volume records on compound exercises) become the new primary signal. The evaluation service re-runs against full session history using the volume signal — any volume personal bests already in the history are now counted. |
| Endurance → Hybrid (athlete adds serious resistance training to their running base) | Prior pace and distance personal bests are retained. Endurance AND-logic is replaced by Hybrid OR-logic. All canonical activity types are now eligible. Strength and Bodybuilding personal bests logged while declared as Endurance are now included in the Hybrid evaluation pool. Improvement count recalculated via OR logic across all active modalities. |
| Hybrid → Strength (athlete narrows focus to maximal strength development) | Hybrid OR-logic is replaced by Strength AND-logic. Only intensity-based personal bests (1RM-equivalent records on primary compound exercises) increment the active improvement count. Endurance and Bodybuilding personal bests remain in session history but no longer contribute to the improvement count. |
| Strength → Endurance (athlete pivots to endurance sports after years of resistance training) | Intensity-based personal bests are retained in session history. Endurance personal bests (pace, distance) accumulated during the Strength period are now re-evaluated under Endurance AND-logic. If the athlete has accumulated endurance personal bests while declared as Strength, those are now counted. The prior Strength personal best record does not apply to the new signal. |

---

## Section 9 — Required P-1 Follow-Up Amendment

### 9.1 What P-1 Must Add

Q8 (LOCKED) specifies: "P-1 Profile screen: Add athlete type field, editable. Show current type. On change: trigger improvement re-evaluation job."

P-1 v1.0 (LOCKED) shows athlete type in the Identity Header (Section 4.4) and lists it as "Editable in P-2 Edit Profile" — which, per this amendment, is corrected to P-1 Edit Profile (accessible from P-1 directly). The P-1 spec already anticipates athlete type display; it requires an amendment to formalize:

1. **The athlete type field in P-1 Edit Profile:** A selectable field showing the current type with an edit action. Tapping opens a bottom sheet or equivalent surface presenting the four type tiles (same labels, same auto-select behavior as O-2b).

2. **The re-evaluation job trigger:** On type change confirmation in P-1 Edit Profile, the evaluation service receives a re-attribution job signal.

3. **Correction of the editability reference:** P-1 v1.0 Section 4.4 currently reads "Editable in P-2 Edit Profile." This must be corrected to "Editable via Edit Profile on P-1."

### 9.2 P-1 Amendment Scope

The P-1 follow-up amendment is limited to:
- Adding the athlete type field to the P-1 Edit Profile flow
- Correcting the editability reference in Section 4.4
- Specifying the type selection UI within Edit Profile (four tiles, same behavior as O-2b)
- Specifying the re-evaluation trigger behavior

The P-1 amendment does not redesign P-1, does not modify the Identity Header display format, and does not alter any other Edit Profile fields.

### 9.3 P-1 Amendment Priority

Per the Rank-Calibration-Decisions.md Remaining Decisions table: "P-1 Profile screen amendment — HIGH — required per Q8 decision — Add athlete type field, editable." The P-1 amendment is a prerequisite for athlete type editability. O-2 implementation does not require the P-1 amendment to be complete — athletes can declare type at onboarding regardless. The P-1 amendment is required before athletes can change their type post-onboarding.

---

## Section 10 — Architecture Decisions

| Decision ID | Decision |
|---|---|
| **A001-D1 — Four-type tile set** | O-2b presents four athlete types: Strength, Bodybuilding, Endurance, Hybrid. This replaces the seven types in O-2 v1.0. No additional types are introduced at MVP. The type set is established by this amendment; see Section 15 for the type model rationale and extensibility analysis. |
| **A001-D2 — Hybrid covers general fitness and cross-training** | Hybrid is the correct type for athletes who train across multiple modalities or who follow general fitness programming. "General" from O-2 v1.0 is not carried forward as a separate option. Hybrid's reference descriptor ("Multiple disciplines or general fitness") communicates this scope. Hybrid uses OR-logic evaluation — improvement in any actively trained modality counts. |
| **A001-D3 — Bodybuilding and Strength are distinct evaluation contexts** | Both Bodybuilding and Strength involve resistance training but use different primary personal best signals. Strength tracks intensity (weight-based 1RM-equivalent records). Bodybuilding tracks volume (session volume personal bests). The distinction is meaningful: a Strength athlete chasing heavier lifts has a different improvement story than a Bodybuilding athlete chasing more total work. The evaluation service applies the correct signal based on declared type. This distinction is not explained in O-2b copy — the athlete declares their identity, not their evaluation method. |
| **A001-D4 — Endurance replaces Running as a supercategory** | Endurance covers the full aerobic modality spectrum: running, cycling, rowing, swimming, and any other pace- or distance-primary activity. This is a more extensible framing than "Running," which excluded cycling and rowing athletes from clean self-identification. The tile label is "Endurance" (not "Running" or "Cardio"). The reference descriptor clarifies the scope. |
| **A001-D5 — Type is evaluation context, not activity restriction** | Athlete type selection does not restrict any logging, program, or social behavior. It is an evaluation lens for Personal Improvement only. This principle is communicated in O-2b subtitle copy. |
| **A001-D6 — Subtitle copy updated** | O-2b subtitle changes from "This shows on your profile. You can change it later." to "This shapes how your development is recognized. You can change it later." The updated copy accurately describes the type's primary function (evaluation context) without requiring the athlete to understand the technical definition. The changeable nature of the declaration is retained in both versions. |
| **A001-D7 — Editability reference corrected** | O-2 v1.0 Decision 2 stated "Athlete type can be changed in P-2 at any time." This is corrected: athlete type is editable via P-1 Edit Profile. P-2 (Progress Hub) does not surface athlete type editing. |
| **A001-D8 — O-2b does not surface evaluation logic** | O-2b does not explain what "shapes how your development is recognized" means mechanically. The athlete does not need to understand the distinction between volume and intensity personal bests, or that their type drives a specific signal. The copy communicates the practical implication (it affects recognition) without requiring the athlete to understand the evaluation model. |
| **A001-D9 — Type change is non-destructive** | Per Q8: all historical session data is retained on type change. Re-attribution runs on the existing history. No personal best records are deleted. This policy is not surfaced in O-2b but governs the post-onboarding type change flow in P-1. |
| **A001-D10 — Data model: four-value enum** | `athlete.athleteType`: enum STRENGTH \| BODYBUILDING \| ENDURANCE \| HYBRID. `athlete.typeHistory`: array of `{ type: AthleteType, effectiveDate: DateTime }`. Both fields required per Q8 implementation impacts. |

---

## Section 11 — Validation Checklist

The following replaces the O-2b section of the O-2 v1.0 Validation Checklist (Section 18).

### O-2b — Athlete Type (Amended)
- [ ] Title: "What do you train?" (Path B) / "What interests you?" (Path A) — 22sp, primary weight
- [ ] Subtitle: "This shapes how your development is recognized. You can change it later." — 15sp, muted
- [ ] Four tiles: Strength, Bodybuilding, Endurance, Hybrid — exactly four, no others
- [ ] Layout: 2×2 grid; each tile minimum 88dp height
- [ ] No skip path — required; no Continue button until tile tap
- [ ] Tile tap: 300ms highlight → auto-advance to O-2c
- [ ] Athlete type saved server-side on tile tap (`athlete.athleteType` set)
- [ ] `typeHistory` entry created with effective date on initial declaration
- [ ] Back navigation returns to O-2a; tile selection is preserved on return to O-2b
- [ ] O-2f Completion Moment displays selected type label verbatim
- [ ] Athlete type accessible label: "[Type] — tap to select and continue"
- [ ] Rank Evaluation Service reads `athlete.athleteType` for Personal Improvement evaluation
- [ ] Type declaration does not restrict activity logging, program enrollment, or social features
- [ ] Editability reference in O-2 Decision 2 corrected: P-1 Edit Profile (not P-2)

### Downstream Connections
- [ ] `athlete.athleteType` enum accepts: STRENGTH, BODYBUILDING, ENDURANCE, HYBRID only
- [ ] `athlete.typeHistory` array records initial declaration with timestamp
- [ ] Rank Evaluation Service Personal Improvement module reads declared type at evaluation time
- [ ] P-1 Edit Profile amendment queued (required for post-onboarding editability — separate document)
- [ ] Re-evaluation job trigger is defined and wired in P-1 amendment before athlete type editing is enabled

---

## Section 12 — Partial Updates to Other O-2 Sections

### 12.1 Decision 2 (Architecture Decisions) — Corrected

**Original text (O-2 v1.0):** "Athlete type can be changed in P-2 at any time."

**Corrected text:** "Athlete type can be changed at any time via the Edit Profile action on P-1 (Profile screen)."

All other content of Decision 2 is unchanged.

### 12.2 Section 10.1 — Skip Behavior Table

The Athlete Type row in the skip behavior table is unchanged: "O-2b Athlete Type — Skippable: No — Default if skipped: N/A."

Footnote added to the table: "*Athlete type determines Personal Improvement evaluation context in the Rank Evaluation Service. Four MVP types: Strength, Bodybuilding, Endurance, Hybrid. See O-2 Amendment 001.*"

### 12.3 Section 14.3 — Tap Target Minimums

The athlete type grid tile entry is updated:

| Element | Minimum |
|---|---|
| Athlete type grid tiles (O-2b) — four tiles, 2×2 | ~50% width × 88dp |

The "General" full-width tile row is removed (no longer present).

### 12.4 Section 15 — Accessibility (O-2b)

Updated to reflect four types:
- Screen title announced on load: same ("What do you train?" / "What interests you?")
- Each tile: `accessibilityLabel` = "[Type] — tap to select and continue"
  - Strength — tap to select and continue
  - Bodybuilding — tap to select and continue
  - Endurance — tap to select and continue
  - Hybrid — tap to select and continue
- Selected tile: `accessibilityValue` communicates selected state (unchanged behavior)

### 12.5 Section 19 — Downstream Dependencies

The athlete type data model row is updated:

| Dependency | What O-2 Requires | Priority |
|---|---|---|
| Athlete type data model | Accept one of four enum values (STRENGTH, BODYBUILDING, ENDURANCE, HYBRID); `athleteType` and `typeHistory` stored at account level; re-evaluation job trigger on type change (Q8) | High |

---

## Section 13 — Lock Record

**Status: LOCKED v1.0 — June 2026**

All conditions resolved. This document is locked and authoritative.

### What This Lock Establishes

O-2 Amendment 001 supersedes O-2 v1.0 Section 5 and corrects O-2 v1.0 Decision 2. The amended O-2 is the authoritative onboarding specification for athlete type declaration. All downstream systems — Rank Evaluation Service, P-1 Edit Profile, P-2.2 Category Signals — draw athlete type from the four-value enum established here:

**STRENGTH | BODYBUILDING | ENDURANCE | HYBRID**

The athlete type taxonomy in this document supersedes Q8's provisional type labels (Strength, Running, Boxing, Hybrid) while preserving all of Q8's behavioral decisions: onboarding declaration, P-1 editability, non-destructive re-attribution, and `typeHistory` logging.

### Resolved Conditions

**OQ-A001-1 — Subtitle copy:** Option A accepted. Locked subtitle: *"This shapes how your development is recognized. You can change it later."*

**Tile descriptor treatment:** Reference descriptors in Section 5.1 are not locked — design decision deferred to implementation. Tile labels are locked: Strength | Bodybuilding | Endurance | Hybrid.

**Concern 1 (combat athletes):** Hybrid positioning accepted. Hybrid is the correct MVP category for combat and martial arts athletes. No additional athlete types are added. No descriptor update required.

**Concern 2 (Bodybuilding signal data):** Resolved as non-blocker. The Bodybuilding Personal Improvement signal (volume personal best) depends on set-level workout data already captured by the workout logging architecture. Each set is logged individually with weight and reps, making session volume computable at evaluation time without a schema change. Engineering should verify this at Personal Improvement implementation — it is not a lock blocker for O-2b.

**Concern 3 (Q8 terminology):** Resolved. Q8 established the declaration mechanism; this amendment supersedes Q8's provisional type labels. The underlying evaluation architecture is fully preserved. No further action required.

### Downstream Dependencies — Confirmed Unchanged

- P-1 Profile Amendment — still required for athlete type editability post-onboarding (separate document, not a lock dependency here)
- OQ-P2S-2 (athlete type display in P-2.2) — resolved in P-2 workstream; data availability confirmed by this amendment
- Rank Evaluation Service — reads `athlete.athleteType`; Personal Improvement module must implement the Strength/Bodybuilding signal distinction per Section 7.1 before evaluation is complete

---

## Section 14 — Type Model Revision: Rationale, Extensibility, and Resolved Concerns

### 14.1 Summary of Changes from Initial Draft

This revision replaces the four provisional athlete types from Q8 (Strength, Running, Boxing, Hybrid) with a revised set (Strength, Bodybuilding, Endurance, Hybrid). All architecture decisions, flows, behaviors, the declaration model, the re-attribution model, the editability handoff, and the four-tile onboarding structure are preserved. Only the specific type labels and their evaluation signal mappings change.

| Original Type | Revised Type | Change |
|---|---|---|
| Strength | Strength | Unchanged — label, signal, and evaluation logic identical |
| Running | Endurance | Label broadened from modality-specific to category-level; now covers all aerobic disciplines |
| Boxing | Bodybuilding | Label replaced entirely; evaluation signal changed from combat to volume-based resistance training |
| Hybrid | Hybrid | Unchanged — label, OR-logic, and scope identical |

### 14.2 Updated Athlete Type Architecture

**The four revised types and their design roles:**

**Strength** — Intensity-focused resistance training. Athletes who identify with maximal output: powerlifting, Olympic lifting, heavy compound work, and any training where the primary goal is lifting heavier. Personal best signal: intensity (1RM-equivalent weight). The identity statement is about being the strongest version of oneself.

**Bodybuilding** — Volume-focused resistance training. Athletes who identify with hypertrophy, physique development, and progressive overload across volume: bodybuilding, aesthetics-driven training, high-volume programs. Personal best signal: volume (total load per session on primary exercises). The identity statement is about being the most developed version of oneself through accumulated work. Bodybuilding is meaningfully different from Strength in training philosophy, program structure, and what "improvement" means — the evaluation signal reflects this.

**Endurance** — Aerobic output-focused training. Athletes who identify with sustained performance: runners, cyclists, rowers, swimmers, triathletes, and anyone for whom distance, pace, or time-at-effort is the primary training metric. Personal best signal: pace or distance personal best across any endurance activity. Endurance is a supercategory — it does not require the athlete to be a runner specifically. A cyclist selecting "Endurance" is correctly identified; "Running" would have excluded them.

**Hybrid** — Multi-modality or general fitness. Athletes who train across disciplines intentionally or who do not primarily identify with one of the three specialized types. OR-logic evaluation: any personal best in any actively trained modality counts. Hybrid serves athletes with genuinely cross-training identities and also serves as the appropriate landing point for athletes who are uncertain or who train broadly.

### 14.3 Updated Enum Definition

```
enum AthleteType {
  STRENGTH      // Intensity-focused resistance training
  BODYBUILDING  // Volume-focused resistance training
  ENDURANCE     // Aerobic / pace-distance training, any modality
  HYBRID        // Multi-modality or general fitness (OR-logic evaluation)
}
```

`athlete.athleteType: AthleteType` — required, set at O-2b, never nullable post-onboarding.
`athlete.typeHistory: [{ type: AthleteType, effectiveDate: DateTime }]` — append-only log, initialized at O-2b completion.

### 14.4 Extensibility Assessment

**Does the revised model better support long-term Forge extensibility?**

Yes — on three dimensions:

**1. Endurance as supercategory eliminates premature specificity.**
The prior label "Running" named a single activity type. As Forge adds cycling programs, rowing content, and triathlon-adjacent programming, "Running" would have required either expansion or a second tile ("Cycling," "Rowing") that would grow the type set beyond four. "Endurance" is a stable category that absorbs all future aerobic activity types without a label change. A cyclist, rower, or triathlete selecting "Endurance" in 2026 is correctly identified; they do not need a new tile in 2028 when Forge releases dedicated cycling programs.

**2. Bodybuilding occupies a real and distinct athletic identity.**
Bodybuilding is one of the largest athlete categories globally and is distinct from powerlifting or general strength training in philosophy, training structure, and measurable outcomes. Including it as a first-class type gives Forge accurate self-identification for a major segment of the resistance training population. The prior "Boxing" type addressed a smaller, more specialized population; combat athletes are now best served by Hybrid (OR-logic evaluates any modality they actively train). The trade-off is acknowledged in Section 15.5.

**3. The four-category structure maps to a stable taxonomy.**
The four types represent four genuinely distinct athletic philosophies: maximum output (Strength), maximum accumulation (Bodybuilding), sustained aerobic performance (Endurance), and multi-modality (Hybrid). This taxonomy is stable — it is not likely to be destabilized by new activity types, new programs, or expanded catalog offerings. Future expansion (e.g., a "Sport" or "Combat" type post-MVP) would add to the four, not replace them.

**Extensibility risk:** The Strength/Bodybuilding signal distinction requires the Rank Evaluation Service to implement two separate resistance-training personal best signal types. This is a new engineering requirement that did not exist in the Q8 provisional model. The implementation is well-defined in Section 7.1, but it is additional complexity. Engineers must ensure that the session log records sufficient granularity (both intensity and volume dimensions) for the service to compute both signal types, even when the athlete is currently declared as only one type — this ensures that a type change does not result in missing historical signal data for re-attribution.

### 14.5 Concerns — Resolved at Lock

**Concern 1 — Combat and martial arts athletes (RESOLVED)**

The prior "Boxing" tile gave combat athletes an explicit named tile. The revised model has no combat tile; athletes who train boxing, MMA, wrestling, Muay Thai, or martial arts select Hybrid. Hybrid's OR-logic correctly evaluates improvement across any modality they actively train.

**Resolution:** Hybrid positioning accepted. Hybrid is the correct MVP category for combat and martial arts athletes. No additional athlete types are added at MVP. The Hybrid reference descriptor ("Multiple disciplines or general fitness") remains as written — no update required.

---

**Concern 2 — Bodybuilding Personal Improvement signal requires set-level session data (RESOLVED — NOT A LOCK BLOCKER)**

The Bodybuilding evaluation signal (volume personal best: total load = sets × reps × weight on a primary compound exercise) requires set-level data in the session log. Without individual set records, session volume cannot be computed.

**Resolution:** The Bodybuilding Personal Improvement signal depends on set-level workout data already captured by the workout logging architecture. The workout logging system records each set individually with weight and reps, making session volume computable at evaluation time without a schema change. This is not a lock blocker for O-2b. Engineering should verify set-level data availability when implementing the Personal Improvement module in the Rank Evaluation Service.

---

**Concern 3 — Q8 type terminology supersession (RESOLVED)**

Q8 (LOCKED) named four provisional types: Strength, Running, Boxing, Hybrid. This amendment establishes a different set: Strength, Bodybuilding, Endurance, Hybrid.

**Resolution:** Q8 established the declaration mechanism — onboarding declaration, P-1 editability, non-destructive re-attribution, `typeHistory` logging. All of these behavioral decisions are fully preserved. The specific type labels in Q8 were provisional; this amendment supersedes them with a more accurate and extensible taxonomy. No further Q8 amendment is required. The athlete type taxonomy established here is the implementation target.

### 14.6 Extensibility Conclusion (Locked)

The four-type model — Strength | Bodybuilding | Endurance | Hybrid — is more extensible than the Q8 provisional set on two dimensions:

1. **Endurance** absorbs all future aerobic activity types (cycling programs, rowing content, triathlon programming) without requiring a new tile or label change.
2. **Bodybuilding** occupies a first-class identity for the largest unaddressed segment of resistance-training athletes — a population that is distinct from powerlifting and strength athletes in training philosophy, program structure, and what "improvement" means.

The four categories represent four stable, non-overlapping athletic philosophies: maximum output (Strength), maximum accumulation (Bodybuilding), sustained aerobic performance (Endurance), and multi-modality (Hybrid). This taxonomy is not likely to be destabilized by new programs, activity types, or catalog expansion. Future post-MVP additions (e.g., a Combat or Sport type) would extend the four, not replace them.

---

## Change Log

### v1.0 — June 2026 (LOCKED)

Initial specification. Athlete type declaration added to O-2 First-Time Setup per Q8 (Rank-Calibration-Decisions.md). O-2b tile set revised from Q8's provisional four types (Strength, Running, Boxing, Hybrid) to the locked four types (Strength, Bodybuilding, Endurance, Hybrid). Rationale: Endurance supersedes Running as a stable aerobic supercategory; Bodybuilding replaces Boxing to address the largest unaddressed resistance-training population with a distinct volume-based evaluation signal. O-2b seven-tile layout (O-2 v1.0) replaced with 2×2 four-tile layout. Subtitle copy locked: "This shapes how your development is recognized. You can change it later." Editability reference corrected from P-2 to P-1 Edit Profile. Type change policy, re-attribution model (non-destructive), and `typeHistory` log defined per Q8. Hybrid accepted as the MVP home for combat and martial arts athletes. Bodybuilding set-level data dependency confirmed non-blocking (set-level data already captured by workout logging architecture). Q8 type label supersession documented; Q8 behavioral decisions fully preserved. All open questions and concerns resolved at lock. Downstream dependencies confirmed unchanged.

---

*O-2 Amendment 001 — Athlete Type Declaration*
*Amendment to First-Time-Setup-Wireframe-Spec-O2.md v1.0*
*June 2026*
*Authority: Rank-Calibration-Decisions.md Q8 (LOCKED — mechanism); type taxonomy established by this amendment*
*Status: LOCKED v1.0 — June 2026*
