# Forge Legacy — Exercise Library Handoff

**A single consolidated document of the full exercise catalog: metadata, muscles, coaching content, and how every exercise relates to the others.** Built for Claude Design.

- **Data file:** `Exercise-Library-Consolidated.json` (this folder)
- **Generated:** 2026-07-13
- **Catalog:** 794 exercises · 556 with full coaching · 238 coaching-pending
- **Relationships:** 5,698 edges (~7.2 per exercise)

---

## 1. What's inside

The JSON is `{ "meta": {...}, "exercises": [ ... 794 objects ... ] }`. Every exercise object is fully **self-contained** — its metadata, muscles, coaching, and related exercises are all joined in place, so nothing needs to be cross-referenced by hand.

```
exercise = {
  id, name, aliases[], family, modality, difficulty, movementPattern,
  equipment:  { id, name, category },
  muscles:    { primary:[{id,name,region}], secondary:[{id,name,region}] },
  coachingStatus: "complete" | "pending",
  coaching:   <W-22 view>  | null,     // design the Exercise Detail screen against this
  coachingExtended: <extra authored content> | null,
  related:    [ { targetId, targetName, type, rank, compatibilityScore,
                  swapContexts[], equipmentChange, sharedPrimaryMuscleIds[], reason } ]
}
```

### `coaching` — the locked W-22 Exercise Detail view

This mirrors the app's real projection (`integration.ts` → `ExerciseCoachingView`), in the **locked W-22 section order**. Design the Exercise Detail screen directly against these fields:

| JSON field | W-22 section | Shape |
|---|---|---|
| `whyItMatters` | **WHY IT MATTERS** | paragraph |
| `instructions` | **HOW TO DO IT** | ordered steps (setup + execution merged) |
| `tips` | **COACHING CUES** | ordered cues (cue-hierarchy order) |
| `commonMistakes` | **WATCH OUT FOR** | list |
| `safetyNotes` | Safety (additive, optional) | list |
| `advancedNotes` | Advanced (additive, optional) | list |
| `progressionGuidance` | Progression (additive, optional) | object |

### `coachingExtended` — additional authored content

Real athlete-facing content that isn't part of the locked W-22 view but is available for richer screens or future sections: `equipmentSetup`, `mistakeCorrections` (mistake → why → correction triples), `beginnerNotes`, `breathingGuidance`, `tempoGuidance`, `rangeOfMotionNotes`, `spottingNotes`, `difficultyExplanation`, `difficultyConsiderations`.

> **Excluded on purpose:** internal pipeline fields (confidence score, risk tier, review flags, content hashes, generator version, edit history). Those never reach the UI and would only be noise for design.

### `related` — the substitution / progression graph

Each edge is one of five types. Sorted per-exercise by type priority then rank (rank 1 = best match). `compatibilityScore` is 0–100. Use these to design **Swap / Substitute**, **Make it easier / harder**, and **Alternatives** flows (W-23 Exercise Picker, W-9 in-session Replace).

| Relationship type | Count | Meaning |
|---|---|---|
| Substitute | 4,015 | Like-for-like swap — preserves the movement pattern and primary muscle |
| Progression | 610 | A harder variation to advance toward |
| Regression | 567 | An easier variation to scale back to |
| Equipment Alternative | 394 | Same movement, different equipment |
| Variation | 112 | A related variant that shifts emphasis or angle |

---

## 2. Coverage & enums (design to the real distribution)

**Coaching status** — 556 of 794 exercises have coaching content. The remaining 238 carry full metadata + relationships with `coaching: null` and `coachingStatus: "pending"`. Design the Exercise Detail screen so absent sections are simply hidden (matches W-22 §4.2 section-visibility rules).

**Modality**
| value | count |
|---|---|
| Strength | 586 |
| Cardio | 60 |
| Mobility | 54 |
| Power | 50 |
| Strength / Conditioning | 44 |

**Difficulty**
| value | count |
|---|---|
| Intermediate | 643 |
| Beginner | 120 |
| Advanced | 31 |

**Equipment**
| value | count |
|---|---|
| Bodyweight | 171 |
| Dumbbell | 92 |
| Cable Machine | 86 |
| Selectorized Machine | 78 |
| Barbell | 77 |
| Cardio Equipment / Outdoors | 60 |
| Resistance Band | 50 |
| Kettlebell | 46 |
| Sled / Prowler | 39 |
| Plyometric Box | 30 |
| Suspension Trainer | 25 |
| Medicine Ball | 20 |
| Smith Machine | 15 |
| Battle Rope | 5 |

**Movement patterns:** 18 distinct — Calf / Ankle, Cardio / Locomotion, Carry, Core, Elbow Extension, Elbow Flexion, Hinge / Hip Dominant, Hip Isolation, Horizontal Pull, Horizontal Push, Mobility, Neck Isolation, Other, Power / Plyometric, Shoulder Isolation, Squat / Knee Dominant, Vertical Pull, Vertical Push.

---

## 3. Worked example — `barbell-biceps-curl`

A complete exercise object, showing every populated section:

```json
{
  "id": "barbell-biceps-curl",
  "name": "Barbell Biceps Curl",
  "aliases": [],
  "family": "Biceps Curl",
  "modality": "Strength",
  "difficulty": "Intermediate",
  "movementPattern": "Elbow Flexion",
  "equipment": {
    "id": "barbell",
    "name": "Barbell",
    "category": "Free Weight"
  },
  "muscles": {
    "primary": [
      {
        "id": "biceps",
        "name": "Biceps",
        "region": "Upper Body"
      }
    ],
    "secondary": []
  },
  "coachingStatus": "complete",
  "coaching": {
    "whyItMatters": "The Biceps Curl builds strength and size in your biceps. As an isolation movement, it targets those muscles directly to build size and balance.",
    "instructions": [
      "Load the bar evenly on both sides and secure it with collars before you lift.",
      "Set a tall torso with your upper arms pinned against your sides.",
      "Start with your arms straight and the load under control.",
      "Bend your elbows and curl the load up while keeping your upper arms still.",
      "Squeeze at the top for a beat.",
      "Lower under control until your arms are straight."
    ],
    "tips": [
      "Keep your elbows pinned to your sides throughout.",
      "Keep the tension on your biceps and stop your elbows from drifting forward.",
      "Turn your pinky slightly up at the top to finish the squeeze.",
      "Lower all the way until your arm is straight each rep."
    ],
    "commonMistakes": [
      "Swinging the torso to start the load moving.",
      "Letting the elbows drift forward to lift the load higher.",
      "Cutting the lower-half of the range short."
    ],
    "safetyNotes": [],
    "advancedNotes": [
      "Slow the lowering phase to three counts to add time under tension."
    ],
    "progressionGuidance": {
      "regressionExerciseId": "machine-biceps-curl",
      "regressionReason": "Drop back to Machine Biceps Curl to groove the movement before you add load or complexity."
    }
  },
  "coachingExtended": {
    "equipmentSetup": "Load the bar evenly on both sides and secure it with collars before you lift.",
    "mistakeCorrections": [
      {
        "mistake": "Swinging the torso to start the load moving.",
        "whyItMatters": "A torso swing starts the curl with momentum instead of your biceps.",
        "correction": "Stand tall and keep your upper arms fixed against your sides."
      },
      {
        "mistake": "Letting the elbows drift forward to lift the load higher.",
        "whyItMatters": "Moving the elbows turns a curl into a partial front raise and takes tension off your biceps.",
        "correction": "Keep your elbows under your shoulders and stop the curl where your upper arm wants to move."
      },
      {
        "mistake": "Cutting the lower-half of the range short.",
        "whyItMatters": "Skipping the bottom half leaves strength and size on the table.",
        "correction": "Straighten your arm fully at the bottom of each rep."
      }
    ],
    "beginnerNotes": [
      "Pick a load you can lift without swinging your body."
    ],
    "breathingGuidance": "Exhale as you curl up, breathe in as you lower.",
    "tempoGuidance": "Curl with control and lower for about two counts.",
    "rangeOfMotionNotes": "Move from a fully straight arm to a hard squeeze at the top. Take the biceps through its full working range each rep.",
    "difficultyExplanation": "Rated Intermediate because you balance and control the weight yourself, and it works one joint, so it is simpler to learn.",
    "difficultyConsiderations": "The Biceps Curl is an isolation barbell movement. You balance and drive the bar yourself, so groove the bar path before chasing weight. Your working limb moves freely, so keep the joint you are training under control. Add load gradually as your control improves."
  },
  "related": [
    {
      "targetId": "barbell-drag-curl",
      "targetName": "Barbell Drag Curl",
      "type": "Substitute",
      "rank": 5,
      "compatibilityScore": 79,
      "swapContexts": [
        "General swap"
      ],
      "equipmentChange": false,
      "sharedPrimaryMuscleIds": [
        "biceps"
      ],
      "reason": "Preserves the elbow flexion pattern and trains the biceps with a different exercise."
    },
    {
      "targetId": "barbell-preacher-curl",
      "targetName": "Barbell Preacher Curl",
      "type": "Substitute",
      "rank": 6,
      "compatibilityScore": 79,
      "swapContexts": [
        "General swap"
      ],
      "equipmentChange": false,
      "sharedPrimaryMuscleIds": [
        "biceps"
      ],
      "reason": "Preserves the elbow flexion pattern and trains the biceps with a different exercise."
    },
    {
      "targetId": "barbell-reverse-curl",
      "targetName": "Barbell Reverse Curl",
      "type": "Substitute",
      "rank": 7,
      "compatibilityScore": 79,
      "swapContexts": [
        "General swap"
      ],
      "equipmentChange": false,
      "sharedPrimaryMuscleIds": [
        "biceps"
      ],
      "reason": "Preserves the elbow flexion pattern and trains the biceps with a different exercise."
    },
    {
      "targetId": "alternating-dumbbell-curl",
      "targetName": "Alternating Dumbbell Curl",
      "type": "Substitute",
      "rank": 8,
      "compatibilityScore": 76,
      "swapContexts": [
        "Equipment unavailable",
        "Home gym",
        "Hotel gym",
        "Different equipment"
      ],
      "equipmentChange": true,
      "sharedPrimaryMuscleIds": [
        "biceps"
      ],
      "reason": "Preserves the elbow flexion pattern and trains the biceps with a different exercise."
    },
    {
      "targetId": "machine-biceps-curl",
      "targetName": "Machine Biceps Curl",
      "type": "Regression",
      "rank": 4,
      "compatibilityScore": 85.5,
      "swapContexts": [
        "Equipment unavailable",
        "Different equipment",
        "More stability",
        "Skill regression"
      ],
      "equipmentChange": true,
      "sharedPrimaryMuscleIds": [
        "biceps"
      ],
      "reason": "An easier elbow flexion regression using selectorized machine instead of barbell."
    },
    {
      "targetId": "dumbbell-biceps-curl",
      "targetName": "Dumbbell Biceps Curl",
      "type": "Equipment Alternative",
      "rank": 1,
      "compatibilityScore": 91,
      "swapContexts": [
        "Equipment unavailable",
        "Home gym",
        "Hotel gym",
        "Different equipment"
      ],
      "equipmentChange": true,
      "sharedPrimaryMuscleIds": [
        "biceps"
      ],
      "reason": "Preserves the elbow flexion movement while using dumbbell instead of barbell."
    },
    {
      "targetId": "band-biceps-curl",
      "targetName": "Band Biceps Curl",
      "type": "Equipment Alternative",
      "rank": 2,
      "compatibilityScore": 89,
      "swapContexts": [
        "Equipment unavailable",
        "Home gym",
        "Hotel gym",
        "Different equipment"
      ],
      "equipmentChange": true,
      "sharedPrimaryMuscleIds": [
        "biceps"
      ],
      "reason": "Preserves the elbow flexion movement while using resistance band instead of barbell."
    },
    {
      "targetId": "cable-biceps-curl",
      "targetName": "Cable Biceps Curl",
      "type": "Equipment Alternative",
      "rank": 3,
      "compatibilityScore": 89,
      "swapContexts": [
        "Equipment unavailable",
        "Different equipment"
      ],
      "equipmentChange": true,
      "sharedPrimaryMuscleIds": [
        "biceps"
      ],
      "reason": "Preserves the elbow flexion movement while using cable machine instead of barbell."
    }
  ]
}
```

---

## 4. Provenance & notes

Joined from four committed source files by exercise `id`:

- `src/domain/exercise-relationships/source/exercises.json` — catalog (metadata)
- `src/domain/exercise-relationships/source/exercise_muscles.json` — muscle roles
- `src/domain/exercise-coaching/content/coaching_content.json` — coaching content
- `src/domain/exercise-relationships/exercise_relationships.json` — relationship graph

**Encoding:** the source and this export are clean UTF-8 (curly apostrophes/em-dashes intact). An earlier "mojibake" concern was a false alarm from a Windows console-encoding artifact — there is no corruption in the data.

**Editorial maturity:** of the 556 coaching records, 556 are populated; internally 446 are `Auto-Validated` and 110 are `Needs Review` (not yet human-approved). Content is machine-generated and pre-approval — treat copy as representative, not final locked wording.
