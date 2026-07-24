# Forge Legacy — Exercise Library Difficulty Assignment Pass

## v1.0 | June 2026

**Status:** COMPLETE — all 195 V1 exercises (post-2026-06-30 Exercise Naming Standard reconciliation; originally 200) have been assigned exactly one difficulty value. The five retired naming-duplicate rows (Squat, Step-Up, Romanian Deadlift, Bench Press, Plank) were removed from Section 2; their difficulty value carried forward unchanged on the surviving canonical row in every case. See `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §3.

**Phase:** Phase 3 of the exercise data-completion sequence (Phase 1 = Muscle Taxonomy Lock; Phase 2 = Muscle Assignment; Phase 3 = Difficulty Assignment; Phase 4 = Media Production).

**Authority:** `Exercise-Library-Architecture-v1.0.md` §2.1 (schema; `difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null`), `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` (canonical 200-exercise list with category, movement pattern, and equipment), `Anchor-Exercise-Population-Pass-01/02/03-v1.0.md` and `Exercise-Population-Pass-04` through `14-v1.0.md` (narrative content and relationship arrays).

**Scope and constraints:**
- Exactly three allowed values: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`. (`null` is the CUSTOM-exercise default; no FORGE exercise may remain null.)
- Difficulty is based on **technical skill required to perform the exercise safely and correctly**, not on how much weight can be lifted.
- Factors considered: movement complexity, coordination requirements, stability demands, learning curve, injury risk from incorrect execution.
- Consistency rule: similar movement patterns must receive comparable ratings unless a clear distinguishing factor is documented.
- This pass does not modify any existing field (names, muscles, categories, patterns, equipment, relationships, narrative content, or media URLs). It adds difficulty values only.

**Remaining unassigned fields after this pass:** media (`gifUrl`, `gifThumbnailUrl`, `videoUrl`, `imageUrl`). No exercise can flip `isActive: true` until media is also assigned.

---

## Section 1 — Difficulty Criteria Reference

| Value | Meaning |
|---|---|
| `BEGINNER` | Simple, low-risk movement. Machine-guided, single-plane, or well-supported. Accessible to a first-time gym user with basic verbal instruction. Low learning curve. |
| `INTERMEDIATE` | Compound or multi-joint movement, unilateral balance demands, or meaningful coordination/stability requirements. Requires coaching repetitions to execute safely and correctly. Moderate learning curve. |
| `ADVANCED` | High technical complexity, multiple simultaneous demands (balance + mobility + coordination), significant injury risk if performed with poor technique, or steep prerequisite-skill requirement before attempting. High learning curve. |

---

## Section 2 — Complete Difficulty Assignments

All 195 exercises in catalog-blueprint order (post-reconciliation). `✓` marks anchor exercises.

### LEGS_AND_GLUTES (55)

#### SQUAT pattern (16)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Back Squat | INTERMEDIATE | ✓ |
| Front Squat | ADVANCED | |
| Bodyweight Squat | BEGINNER | |
| Bodyweight Box Squat | BEGINNER | |
| Goblet Squat | BEGINNER | |
| Split Squat | INTERMEDIATE | |
| Box Step-Up | BEGINNER | |
| Lunge | BEGINNER | ✓ |
| Bulgarian Split Squat | INTERMEDIATE | |
| Walking Lunge | INTERMEDIATE | |
| Reverse Lunge | BEGINNER | |
| Leg Press | BEGINNER | |
| Hack Squat | BEGINNER | |
| Wall Sit | BEGINNER | |
| Pistol Squat | ADVANCED | |
| Smith Machine Squat | BEGINNER | |

#### HINGE pattern (15)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Deadlift | INTERMEDIATE | ✓ |
| Barbell Romanian Deadlift | INTERMEDIATE | ✓ |
| Hip Thrust | INTERMEDIATE | ✓ |
| Dumbbell Romanian Deadlift | BEGINNER | |
| Sumo Deadlift | INTERMEDIATE | |
| Single-Leg Romanian Deadlift | ADVANCED | |
| Kettlebell Swing | INTERMEDIATE | |
| Good Morning | INTERMEDIATE | |
| Glute Bridge | BEGINNER | |
| Cable Pull-Through | BEGINNER | |
| Single-Leg Hip Thrust | INTERMEDIATE | |
| Back Extension | BEGINNER | |
| Kettlebell Deadlift | BEGINNER | |
| Banded Hip Thrust | BEGINNER | |
| Dumbbell Deadlift | BEGINNER | |

#### KNEE_ISOLATION pattern (14)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Leg Extension | BEGINNER | ✓ |
| Seated Leg Curl | BEGINNER | ✓ |
| Lying Leg Curl | BEGINNER | |
| Standing Calf Raise | BEGINNER | |
| Seated Calf Raise | BEGINNER | |
| Dumbbell Calf Raise | BEGINNER | |
| Cable Kickback | BEGINNER | |
| Nordic Hamstring Curl | ADVANCED | |
| Sissy Squat | ADVANCED | |
| Banded Leg Extension | BEGINNER | |
| Wall Calf Raise | BEGINNER | |
| Single-Leg Calf Raise | BEGINNER | |
| Adductor Machine | BEGINNER | |
| Abductor Machine | BEGINNER | |

#### PLYOMETRIC_LOWER pattern (10)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Box Jump | INTERMEDIATE | ✓ |
| Jump Squat | INTERMEDIATE | ✓ |
| Broad Jump | INTERMEDIATE | |
| Lateral Bound | INTERMEDIATE | |
| Tuck Jump | INTERMEDIATE | |
| Depth Jump | ADVANCED | |
| Skater Hop | INTERMEDIATE | |
| Jump Lunge | INTERMEDIATE | |
| Single-Leg Box Jump | ADVANCED | |
| Pogo Hop | BEGINNER | |

---

### MOBILITY (44)

#### STRETCH_STATIC pattern (12)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Pigeon Pose | BEGINNER | ✓ |
| Standing Hamstring Stretch | BEGINNER | ✓ |
| Quad Stretch | BEGINNER | |
| Couch Stretch | BEGINNER | |
| Seated Forward Fold | BEGINNER | |
| Butterfly Stretch | BEGINNER | |
| Figure-Four Stretch | BEGINNER | |
| Doorway Chest Stretch | BEGINNER | |
| Child's Pose | BEGINNER | |
| Kneeling Hip Flexor Stretch | BEGINNER | |
| Lat Stretch | BEGINNER | |
| Calf Wall Stretch | BEGINNER | |

#### STRETCH_DYNAMIC pattern (10)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Cat-Cow | BEGINNER | ✓ |
| World's Greatest Stretch | INTERMEDIATE | ✓ |
| Leg Swing | BEGINNER | |
| Arm Circles | BEGINNER | |
| Walking Knee Hug | BEGINNER | |
| Inchworm | INTERMEDIATE | |
| Hip Circles | BEGINNER | |
| Shoulder Rolls | BEGINNER | |
| Standing Spinal Twist | BEGINNER | |
| Dynamic Lunge with Reach | INTERMEDIATE | |

#### JOINT_MOBILITY pattern (10)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| 90/90 Hip Switch | INTERMEDIATE | ✓ |
| Thoracic Rotation | BEGINNER | ✓ |
| Ankle Circles | BEGINNER | |
| Wrist Mobility Flow | BEGINNER | |
| Shoulder CARs | INTERMEDIATE | |
| Hip CARs | INTERMEDIATE | |
| Deep Squat Hold | INTERMEDIATE | |
| Scapular Push-Up | INTERMEDIATE | |
| Neck Mobility Flow | BEGINNER | |
| Light Treadmill Walk | BEGINNER | |

#### FOAM_ROLL pattern (7)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Foam Rolling Quads | BEGINNER | ✓ |
| Foam Rolling Upper Back | BEGINNER | ✓ |
| Foam Rolling IT Band | BEGINNER | |
| Foam Rolling Calves | BEGINNER | |
| Foam Rolling Glutes | BEGINNER | |
| Lacrosse Ball Glute Release | BEGINNER | |
| Lacrosse Ball Foot Release | BEGINNER | |

#### BREATHWORK pattern (5)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Box Breathing | BEGINNER | ✓ |
| Diaphragmatic Breathing | BEGINNER | |
| 4-7-8 Breathing | BEGINNER | |
| Resonant Breathing | BEGINNER | |
| Breath-Led Cooldown | BEGINNER | |

---

### PUSH (31)

#### PUSH_HORIZONTAL pattern (13)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Barbell Bench Press | INTERMEDIATE | ✓ |
| Push-Up | BEGINNER | ✓ |
| Dumbbell Bench Press | BEGINNER | ✓ |
| Incline Push-Up | BEGINNER | |
| Push-Up Progression | INTERMEDIATE | |
| Incline Dumbbell Press | BEGINNER | |
| Decline Bench Press | INTERMEDIATE | |
| Cable Chest Press | BEGINNER | |
| Chest Press Machine | BEGINNER | |
| Dumbbell Fly | INTERMEDIATE | |
| Cable Fly | BEGINNER | |
| Diamond Push-Up | INTERMEDIATE | |
| Dip | INTERMEDIATE | |

#### PUSH_VERTICAL pattern (12)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Overhead Press | INTERMEDIATE | ✓ |
| Seated Dumbbell Shoulder Press | BEGINNER | ✓ |
| Dumbbell Shoulder Press | INTERMEDIATE | |
| Push Press | INTERMEDIATE | |
| Pike Push-Up | INTERMEDIATE | |
| Arnold Press | INTERMEDIATE | |
| Shoulder Press Machine | BEGINNER | |
| Cable Overhead Press | INTERMEDIATE | |
| Kettlebell Overhead Press | INTERMEDIATE | |
| Handstand Push-Up | ADVANCED | |
| Dumbbell Lateral Raise | BEGINNER | |
| Triceps Pressdown | BEGINNER | |

#### PUSH_DIAGONAL pattern (6)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Landmine Press | BEGINNER | ✓ |
| Incline Cable Press | INTERMEDIATE | ✓ |
| Half-Kneeling Landmine Press | INTERMEDIATE | |
| Dumbbell Squeeze Press | BEGINNER | |
| TRX Push-Up | INTERMEDIATE | |
| Resistance Band Diagonal Press | BEGINNER | |

---

### PULL (29)

#### PULL_HORIZONTAL pattern (12)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Barbell Row | INTERMEDIATE | ✓ |
| Dumbbell Row | BEGINNER | ✓ |
| Chest-Supported Row | BEGINNER | ✓ |
| Seated Cable Row | BEGINNER | |
| T-Bar Row | INTERMEDIATE | |
| Inverted Row | INTERMEDIATE | |
| Single-Arm Dumbbell Row | BEGINNER | |
| Cable Row Machine | BEGINNER | |
| Resistance Band Row | BEGINNER | |
| Band Pull Apart | BEGINNER | |
| Rear Delt Fly | BEGINNER | |
| Face Pull | BEGINNER | |

#### PULL_VERTICAL pattern (11)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Pull-Up | INTERMEDIATE | ✓ |
| Lat Pulldown | BEGINNER | ✓ |
| Chin-Up | INTERMEDIATE | |
| Assisted Pull-Up | BEGINNER | |
| Band-Assisted Pull-Up | BEGINNER | |
| Wide-Grip Lat Pulldown | BEGINNER | |
| Straight-Arm Pulldown | BEGINNER | |
| Kneeling Pulldown | BEGINNER | |
| Neutral-Grip Pull-Up | INTERMEDIATE | |
| Lat Pulldown Machine | BEGINNER | |
| Negative Pull-Up | INTERMEDIATE | |

#### PULL_CURL pattern (6)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Dumbbell Curl | BEGINNER | ✓ |
| Hammer Curl | BEGINNER | ✓ |
| Barbell Curl | BEGINNER | |
| Cable Curl | BEGINNER | |
| Preacher Curl | BEGINNER | |
| Resistance Band Curl | BEGINNER | |

---

### CORE (21)

#### CORE_ANTI_EXTENSION pattern (5)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Front Plank | BEGINNER | ✓ |
| Dead Bug | INTERMEDIATE | ✓ |
| Ab Wheel Rollout | ADVANCED | |
| Stability Ball Plank | INTERMEDIATE | |
| Forearm Plank to Push-Up | INTERMEDIATE | |

#### CORE_ANTI_ROTATION pattern (6)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Pallof Press | BEGINNER | ✓ |
| Bird Dog | BEGINNER | ✓ |
| Half-Kneeling Cable Chop | INTERMEDIATE | |
| Side Plank | INTERMEDIATE | |
| Plank Reach-Through | INTERMEDIATE | |
| Resistance Band Anti-Rotation Hold | BEGINNER | |

#### CORE_FLEXION pattern (5)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Hanging Leg Raise | INTERMEDIATE | ✓ |
| Sit-Up | BEGINNER | ✓ |
| Crunch | BEGINNER | |
| Cable Crunch | BEGINNER | |
| Reverse Crunch | BEGINNER | |

#### CORE_ROTATION pattern (5)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Russian Twist | BEGINNER | ✓ |
| Cable Woodchop | INTERMEDIATE | ✓ |
| Standing Trunk Rotation | BEGINNER | |
| Bicycle Crunch | BEGINNER | |
| Medicine Ball Rotational Throw | INTERMEDIATE | |

---

### FULL_BODY (15)

#### CARRY pattern (8)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Farmer Carry | BEGINNER | ✓ |
| Suitcase Carry | INTERMEDIATE | ✓ |
| Front-Loaded Carry | INTERMEDIATE | |
| Overhead Carry | ADVANCED | |
| Sled Push | BEGINNER | |
| Sled Drag | BEGINNER | |
| Yoke Carry | ADVANCED | |
| Trap Bar Carry | INTERMEDIATE | |

#### EXPLOSIVE_FULLBODY pattern (7)

| Exercise | Difficulty | Anchor |
|---|---|:---:|
| Turkish Get-Up | ADVANCED | ✓ |
| Burpee | INTERMEDIATE | ✓ |
| Medicine Ball Slam | BEGINNER | |
| Battle Ropes | BEGINNER | |
| Rowing Machine Intervals | BEGINNER | |
| Clean and Press | ADVANCED | |
| Wall Ball | INTERMEDIATE | |

---

## Section 3 — Validation

**Total exercises:** 195 (post-2026-06-30 Exercise Naming Standard reconciliation; originally 200)

**Completeness check:** Every one of the 195 canonical exercises listed in `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §2 has exactly one `difficulty` value assigned in Section 2 above, drawn only from the locked enum (`BEGINNER` | `INTERMEDIATE` | `ADVANCED`). No exercise was skipped; no exercise received more than one value. Counts were tallied per movement pattern, rolled up per category, and cross-checked against the Blueprint's category totals (LEGS_AND_GLUTES 55, MOBILITY 44, PUSH 31, PULL 29, CORE 21, FULL_BODY 15 = 195).

**Difficulty distribution:**

| Difficulty | Count | % |
|---|---:|---:|
| BEGINNER | 119 | 61.0% |
| INTERMEDIATE | 63 | 32.3% |
| ADVANCED | 13 | 6.7% |
| **Total** | **195** | **100%** |

**By category:**

| Category | BEGINNER | INTERMEDIATE | ADVANCED | Total |
|---|---:|---:|---:|---:|
| LEGS_AND_GLUTES | 30 | 18 | 7 | 55 |
| MOBILITY | 36 | 8 | 0 | 44 |
| PUSH | 14 | 16 | 1 | 31 |
| PULL | 22 | 7 | 0 | 29 |
| CORE | 11 | 9 | 1 | 21 |
| FULL_BODY | 6 | 5 | 4 | 15 |
| **Total** | **119** | **63** | **13** | **195** |

**Consistency notes:**
- MOBILITY and PULL_CURL contain zero ADVANCED ratings — consistent with these patterns having low technical-skill ceilings regardless of equipment or load (mobility work and isolation curls are self-limiting by range of motion, not coordination).
- ADVANCED is reserved for genuine outliers within an otherwise BEGINNER/INTERMEDIATE pattern (e.g., Nordic Hamstring Curl and Sissy Squat inside KNEE_ISOLATION, Pistol Squat inside SQUAT) rather than spread evenly — this matches the requirement to flag exceptions instead of smoothing ratings across a family.
- Squat-family variants (SQUAT pattern) show the expected spread: bodyweight/machine-supported variants (Bodyweight Squat, Goblet Squat, Leg Press, Smith Machine Squat) = BEGINNER; free-weight bilateral and split-stance loaded variants (Back Squat, Split Squat, Bulgarian Split Squat, Walking Lunge) = INTERMEDIATE; single-leg/free-balance variants (Front Squat, Pistol Squat) = ADVANCED.
- **Naming-duplicate reconciliation (2026-06-30):** five rows removed (Squat/BEGINNER, Step-Up/BEGINNER, Romanian Deadlift/INTERMEDIATE, Bench Press/INTERMEDIATE, Plank/BEGINNER), each a duplicate of a surviving canonical row that already carried the same or an equivalent difficulty value. No difficulty rating was recalculated; only duplicate rows were removed. See `Exercise-Naming-Standard-v1.0.md`.

---

## Section 4 — Ambiguous Cases and Resolutions

The following exercises required a judgment call because they sit at a boundary between two difficulty tiers or diverge from their pattern's otherwise-consistent rating. Each is resolved with a stated rationale so the reasoning is auditable rather than silently inconsistent.

| # | Exercise | Pattern | Resolution | Rationale |
|---|---|---|---|---|
| 1 | Push-Up Progression | PUSH_HORIZONTAL | INTERMEDIATE | Name implies a harder variant than the baseline Push-Up (BEGINNER); rated up one tier rather than left ambiguous. |
| 2 | Hack Squat | SQUAT | BEGINNER | Machine-guided fixed path removes the balance/coordination demand that drives higher ratings elsewhere in SQUAT — kept consistent with other machine variants (Leg Press, Smith Machine Squat). |
| 3 | Hip Thrust (barbell) | HINGE | INTERMEDIATE | Barbell-across-hips setup and bench positioning add technical/safety demands absent from the bodyweight Glute Bridge and Banded Hip Thrust (both BEGINNER). |
| 4 | Face Pull | PULL_HORIZONTAL | BEGINNER | Has an external-rotation component that could argue for INTERMEDIATE, but it is near-universally taught as an entry-level corrective movement; rated for its actual learning curve, not its anatomical nuance. |
| 5 | Pogo Hop | PLYOMETRIC_LOWER | BEGINNER | The simplest entry point into plyometric work (low amplitude, double-leg, minimal eccentric demand) — an intentional outlier low end in a pattern that otherwise runs INTERMEDIATE/ADVANCED. |
| 6 | Nordic Hamstring Curl | KNEE_ISOLATION | ADVANCED | Extreme eccentric loading and injury risk place it well outside the otherwise-BEGINNER isolation pattern; rated for safety-critical technical demand, not load. |
| 7 | Sissy Squat | KNEE_ISOLATION | ADVANCED | Unusual knee range of motion and balance demand under bodyweight loading place it outside the otherwise-BEGINNER pattern, same reasoning as #6. |
| 8 | Yoke Carry | CARRY | ADVANCED | Specialized strongman apparatus plus the balance/bracing demand of a raised, rigid load justify it as the sole ADVANCED rating in CARRY (vs. Overhead Carry and Trap Bar Carry at INTERMEDIATE). |
| 9 | Inverted Row | PULL_HORIZONTAL | INTERMEDIATE | Requires whole-body tension and scapular control that supported/machine rows (Chest-Supported Row, Cable Row Machine, both BEGINNER) do not demand. |
| 10 | Scapular Push-Up | JOINT_MOBILITY | INTERMEDIATE | Filed under a largely-BEGINNER mobility pattern, but its specific demand — isolated scapular protraction/retraction control — is a genuine motor-control skill, not a stretch; rated for that skill rather than its category placement. |

No exercise was left without a final, single difficulty value. The table above documents every case where the rating required explicit reasoning beyond direct comparison to an identical sibling exercise.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-06-29 | Initial publication. Difficulty assigned to all 200 V1 exercises (Phase 3 of the Exercise Library content-completion sequence, following Phase 1 Muscle Taxonomy Readiness and Phase 2 Muscle Assignment). 10 ambiguous cases identified and resolved. Does not modify muscle assignments, taxonomy, media fields, exercise names, or architecture. |

