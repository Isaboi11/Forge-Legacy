# Forge Legacy Anchor Exercise Population Pass #1

## v1.0 | June 2026

**Status:** APPROVED — content as written. Pending media production before `isActive: true`. **Addendum (Exercise Naming Standard reconciliation, 2026-06-30):** Section 1 "Squat" was retired and its authored content relocated to `Exercise-Population-Pass-04-v1.0.md` §2 "Bodyweight Squat"; Sections 4 and 7 were renamed in place to their canonical names ("Barbell Romanian Deadlift", "Barbell Bench Press") per `Exercise-Naming-Standard-v1.0.md`. No other content in this pass was altered. See `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §3 for the full resolution record.

**Scope:** Tier 1 anchors only (`Anchor-Exercise-Authoring-Framework-v1.0.md` §6), the 9 PAS-named compounds: Back Squat, Deadlift, Barbell Romanian Deadlift, Hip Thrust, Lunge, Barbell Bench Press, Overhead Press, Barbell Row, Pull-Up. (A 10th, the generic "Squat," was retired by the naming reconciliation above; its content now lives under "Bodyweight Squat.")

**Authority:** `Exercise-Library-Architecture-v1.0.md` (taxonomy, field bounds), `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` (canonical names, category, movement pattern, equipment), `Anchor-Exercise-Authoring-Framework-v1.0.md` (writing standards, relationship standards), `Exercise-002-Exercise-Substitution-Architecture.md` (alternative/regression relationship semantics), `Exercise-Detail-Wireframe-Spec-W22.md` (field display order and purpose).

**Not in scope:** media production, `primaryMuscles`/`secondaryMuscles`/`difficulty` assignment, any document amendment, any catalog or architecture change.

---

## Section 2 — Back Squat

| Field | Value |
|---|---|
| Canonical Name | Back Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | BARBELL, SQUAT_RACK |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS, CORE |

**ABOUT**
> The Back Squat is a barbell squat performed with the bar resting across the upper back, loaded from a squat rack. It trains the quads, glutes, and hamstrings under heavy external load. It is widely regarded as one of the most effective lower-body strength builders in resistance training.

**WHY IT MATTERS**
> The Back Squat builds raw lower-body strength and muscle mass more effectively than most other exercises. It carries over directly to athletic movements that require leg power, such as jumping and sprinting. It is a cornerstone lift in nearly every strength and hypertrophy program. Training the Back Squat also reinforces the bracing and bar-handling skills used in other barbell lifts.

**HOW TO DO IT**
1. Set the bar in the rack at upper-chest height.
2. Step under the bar and rest it across your upper back and shoulders.
3. Lift the bar off the rack and step back to clear it.
4. Set your feet shoulder-width apart and brace your core.
5. Bend your knees and hips together to lower into the squat.
6. Lower until your hips are level with or below your knees.
7. Drive through your feet to stand back up.
8. Re-rack the bar after your final rep.

**COACHING CUES**
> — Keep the bar tight against your upper back, not your neck
> — Brace your core hard before you start the descent
> — Keep your chest tall throughout the movement
> — Drive your knees out as you stand up

**WATCH OUT FOR**
> — The lower back rounds as the squat gets heavier
> — The knees collapse inward on the way up
> — The heels rise off the floor near the bottom of the squat

**Progressions:** Front Squat
**Regressions:** Goblet Squat
**Alternatives:** Smith Machine Squat, Leg Press

---

## Section 3 — Deadlift

| Field | Value |
|---|---|
| Canonical Name | Deadlift |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | HINGE |
| Equipment Tag(s) | BARBELL |
| Primary Muscle(s) | LOWER_BACK, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS, CORE |

**ABOUT**
> The Deadlift is a barbell hip-hinge exercise that trains the glutes, hamstrings, and lower back by lifting a loaded bar off the floor. The athlete pulls the bar in a straight line from the ground to hip height. It trains the entire posterior chain in a single movement.

**WHY IT MATTERS**
> The Deadlift builds total-body pulling strength and a powerful posterior chain. It develops the hip hinge pattern that carries over to picking up and carrying heavy objects safely. It is a benchmark strength lift used across nearly every strength program. It also reinforces the spinal bracing needed for safe heavy lifting in general.

**HOW TO DO IT**
1. Stand with feet hip-width apart, with the bar over the middle of your feet.
2. Bend at your hips and knees to grip the bar just outside your shins.
3. Drop your hips, flatten your back, and pull your shoulders back.
4. Brace your core and take a deep breath in.
5. Drive through your feet to lift the bar, keeping it close to your legs.
6. Stand fully upright with your hips and knees locked out.
7. Lower the bar back to the floor under control.

**COACHING CUES**
> — Keep the bar close to your shins and thighs the whole lift
> — Push the floor away with your feet rather than yanking the bar
> — Keep your back flat from setup through lockout
> — Finish by squeezing your glutes at the top

**WATCH OUT FOR**
> — The lower back rounds as the bar leaves the floor
> — The bar drifts away from the body during the pull
> — The hips rise faster than the chest at the start of the lift

**Progressions:** None — no harder same-pattern variant exists in the launch catalog for this exercise.
**Regressions:** Dumbbell Deadlift
**Alternatives:** Sumo Deadlift

---

## Section 4 — Barbell Romanian Deadlift

| Field | Value |
|---|---|
| Canonical Name | Barbell Romanian Deadlift |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | HINGE |
| Equipment Tag(s) | BARBELL |
| Primary Muscle(s) | HAMSTRINGS, GLUTES |
| Secondary Muscle(s) | LOWER_BACK |

**ABOUT**
> The Barbell Romanian Deadlift is a hip-hinge exercise performed with a barbell, targeting the hamstrings and glutes through a controlled lowering and raising of the bar. Unlike the Deadlift, it starts from a standing position rather than the floor. It emphasizes a slow, controlled hip hinge rather than a maximal pull.

**WHY IT MATTERS**
> The Barbell Romanian Deadlift builds hamstring and glute strength through a deep, controlled stretch under load. It develops hip hinge control that protects the lower back during everyday bending and lifting. It is especially valuable for building posterior chain strength without the technical demands of a full deadlift. It pairs well with squat-pattern training to balance the lower body.

**HOW TO DO IT**
1. Stand holding the bar at hip height with feet hip-width apart.
2. Keep a slight bend in your knees throughout the movement.
3. Push your hips back as you lower the bar down your legs.
4. Keep the bar close to your legs as it travels down.
5. Lower until you feel a deep stretch in your hamstrings.
6. Drive your hips forward to return to standing.

**COACHING CUES**
> — Keep the bar in contact with your legs throughout
> — Push your hips back rather than bending your knees forward
> — Keep your shoulders pulled back and your chest tall
> — Stop lowering once your lower back wants to round

**WATCH OUT FOR**
> — The lower back rounds as the bar moves below the knees
> — The knees bend too much, turning the hinge into a squat
> — The bar drifts forward away from the legs during the lowering phase

**Progressions:** Single-Leg Romanian Deadlift
**Regressions:** Dumbbell Romanian Deadlift
**Alternatives:** Good Morning, Cable Pull-Through

---

## Section 5 — Hip Thrust

| Field | Value |
|---|---|
| Canonical Name | Hip Thrust |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | HINGE |
| Equipment Tag(s) | BARBELL, BENCH |
| Primary Muscle(s) | GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Hip Thrust is a barbell hip-hinge exercise that trains the glutes by driving the hips upward against a loaded bar while the shoulders rest on a bench. It isolates hip extension more directly than the Deadlift or Squat. It is one of the most effective exercises in the catalog for direct glute development.

**WHY IT MATTERS**
> The Hip Thrust builds glute strength and size more directly than almost any other exercise. It develops hip extension power that carries over to sprinting, jumping, and heavier squats and deadlifts. It is well suited for anyone seeking glute-specific strength as part of a lower-body program. It also offers a lower-skill alternative to the Deadlift for training the same muscle group.

**HOW TO DO IT**
1. Sit on the floor with your upper back against a bench.
2. Roll the loaded bar over your hips and hold it in place.
3. Plant your feet flat on the floor, knees bent.
4. Brace your core and drive your hips up toward the ceiling.
5. Squeeze your glutes hard at the top of the movement.
6. Lower your hips back down under control.

**COACHING CUES**
> — Keep your chin tucked and your eyes forward throughout
> — Drive through your heels as you push your hips up
> — Pause and squeeze your glutes at the top of each rep
> — Keep the bar steady and centered over your hips

**WATCH OUT FOR**
> — The lower back arches excessively at the top of the movement
> — The heels lift off the floor during the drive up
> — The hips rise unevenly from side to side

**Progressions:** Single-Leg Hip Thrust
**Regressions:** Glute Bridge
**Alternatives:** Banded Hip Thrust, Back Extension

---

## Section 6 — Lunge

| Field | Value |
|---|---|
| Canonical Name | Lunge |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | BODYWEIGHT, DUMBBELL |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Lunge is a single-leg squat-pattern exercise performed by stepping forward and lowering the back knee toward the floor. It trains the quads, glutes, and hamstrings while challenging balance on one leg at a time. It can be performed with body weight alone or with added dumbbells.

**WHY IT MATTERS**
> The Lunge builds single-leg strength and balance that the bilateral Squat does not directly train. It carries over to walking, climbing, and any activity that requires stability on one leg. It is well suited for beginners learning single-leg control and for lifters correcting side-to-side strength imbalances. It also builds hip and knee stability that supports other lower-body lifts.

**HOW TO DO IT**
1. Stand tall with feet hip-width apart.
2. Step forward with one leg, landing heel first.
3. Lower your back knee toward the floor, bending both knees.
4. Keep your front knee tracking over your front foot.
5. Push through your front foot to return to standing.
6. Repeat on the other leg.

**COACHING CUES**
> — Keep your torso upright throughout the step
> — Take a step long enough that your front knee stays over your foot
> — Push evenly through your whole front foot as you stand
> — Keep your core braced to stay balanced

**WATCH OUT FOR**
> — The front knee drifts forward past the toes
> — The torso leans forward during the descent
> — The back knee drops into the floor without control

**Progressions:** Bulgarian Split Squat, Walking Lunge
**Regressions:** Split Squat
**Alternatives:** Reverse Lunge, Box Step-Up

---

## Section 7 — Barbell Bench Press

| Field | Value |
|---|---|
| Canonical Name | Barbell Bench Press |
| Category | PUSH |
| Movement Pattern | PUSH_HORIZONTAL |
| Equipment Tag(s) | BARBELL, BENCH |
| Primary Muscle(s) | CHEST |
| Secondary Muscle(s) | TRICEPS, SHOULDERS |

**ABOUT**
> The Barbell Bench Press is a pressing exercise performed lying on a bench, pushing a barbell from the chest to full arm extension. It trains the chest, shoulders, and triceps through a horizontal pressing pattern. It is one of the most widely used upper-body strength exercises.

**WHY IT MATTERS**
> The Barbell Bench Press builds upper-body pressing strength and chest size more effectively than most other exercises. It is a benchmark strength lift used to measure upper-body progress across strength programs. It is well suited to any lifter building chest, shoulder, and triceps strength as a program cornerstone. It also reinforces the bar-control and bracing skills used in other pressing movements.

**HOW TO DO IT**
1. Lie flat on the bench with your eyes under the bar.
2. Grip the bar slightly wider than shoulder width.
3. Unrack the bar and hold it over your chest with arms extended.
4. Lower the bar under control to the middle of your chest.
5. Keep your elbows at roughly a 45-degree angle as you lower.
6. Press the bar back up to full arm extension.
7. Re-rack the bar after your final rep.

**COACHING CUES**
> — Keep your feet flat on the floor throughout the lift
> — Squeeze your shoulder blades together before unracking the bar
> — Drive your feet into the floor to create full-body tension
> — Control the lowering phase rather than dropping the bar to your chest

**WATCH OUT FOR**
> — The elbows flare out wide rather than staying at roughly 45 degrees
> — The bar bounces off the chest instead of pausing under control
> — The lower back arches excessively off the bench during the press

**Progressions:** Dip
**Regressions:** Dumbbell Bench Press
**Alternatives:** Push-Up, Cable Chest Press

---

## Section 8 — Overhead Press

| Field | Value |
|---|---|
| Canonical Name | Overhead Press |
| Category | PUSH |
| Movement Pattern | PUSH_VERTICAL |
| Equipment Tag(s) | BARBELL |
| Primary Muscle(s) | SHOULDERS |
| Secondary Muscle(s) | TRICEPS, CORE |

**ABOUT**
> The Overhead Press is a barbell pressing exercise that drives the bar from shoulder height to full arm extension overhead. It trains the shoulders, triceps, and upper chest through a vertical pressing pattern. It is performed standing, which also demands core and full-body stability.

**WHY IT MATTERS**
> The Overhead Press builds shoulder strength and stability that carries over to nearly every overhead task. It develops total-body bracing since the core and legs must stabilize the lift while standing. It is a staple exercise for building well-rounded upper-body pressing power. It pairs well with horizontal pressing work like the Barbell Bench Press to balance shoulder development.

**HOW TO DO IT**
1. Stand with feet shoulder-width apart, holding the bar at shoulder height.
2. Grip the bar slightly wider than shoulder width.
3. Brace your core and squeeze your glutes.
4. Press the bar straight up overhead until your arms are fully extended.
5. Move your head back slightly to let the bar pass close to your face.
6. Lower the bar back to shoulder height under control.

**COACHING CUES**
> — Brace your core hard before each rep
> — Keep the bar path close to your face on the way up
> — Squeeze your glutes to avoid leaning back excessively
> — Finish each rep with your arms fully locked out overhead

**WATCH OUT FOR**
> — The lower back arches excessively to help the bar travel overhead
> — The bar drifts forward away from the body during the press
> — The elbows flare out wide instead of staying under the bar

**Progressions:** Handstand Push-Up
**Regressions:** Seated Dumbbell Shoulder Press
**Alternatives:** Arnold Press, Cable Overhead Press

---

## Section 9 — Barbell Row

| Field | Value |
|---|---|
| Canonical Name | Barbell Row |
| Category | PULL |
| Movement Pattern | PULL_HORIZONTAL |
| Equipment Tag(s) | BARBELL |
| Primary Muscle(s) | BACK |
| Secondary Muscle(s) | BICEPS, SHOULDERS |

**ABOUT**
> The Barbell Row is a barbell pulling exercise performed by hinging forward at the hips and pulling the bar to the torso. It trains the back, biceps, and rear shoulders through a horizontal pulling pattern. It is performed with a bent-over torso position held throughout the set.

**WHY IT MATTERS**
> The Barbell Row builds back thickness and pulling strength that balances out pressing-heavy training. It develops the postural strength needed to keep the upper back healthy under load. It is a staple exercise for building a strong, balanced upper body. It also reinforces hip-hinge control that carries over to the Deadlift and Barbell Romanian Deadlift.

**HOW TO DO IT**
1. Stand with feet hip-width apart, holding the bar with an overhand grip.
2. Push your hips back and hinge your torso forward to about 45 degrees.
3. Let the bar hang with your arms fully extended.
4. Brace your core and keep your back flat.
5. Pull the bar up toward your lower ribs.
6. Squeeze your shoulder blades together at the top of the pull.
7. Lower the bar back down under control.

**COACHING CUES**
> — Keep your back flat throughout the entire set
> — Pull with your elbows rather than your hands
> — Squeeze your shoulder blades together at the top of each rep
> — Keep the bar close to your body as it travels up

**WATCH OUT FOR**
> — The lower back rounds as the bar gets heavier
> — The torso rises up toward vertical during the pull
> — The bar swings away from the body instead of traveling in a straight line

**Progressions:** Single-Arm Dumbbell Row
**Regressions:** Chest-Supported Row
**Alternatives:** Seated Cable Row, Inverted Row

---

## Section 10 — Pull-Up

| Field | Value |
|---|---|
| Canonical Name | Pull-Up |
| Category | PULL |
| Movement Pattern | PULL_VERTICAL |
| Equipment Tag(s) | PULL_UP_BAR |
| Primary Muscle(s) | BACK |
| Secondary Muscle(s) | BICEPS |

**ABOUT**
> The Pull-Up is a bodyweight pulling exercise performed by hanging from a bar and pulling the chin above it. It trains the back, biceps, and shoulders through a vertical pulling pattern. It requires the athlete to lift their own body weight without any assistance.

**WHY IT MATTERS**
> The Pull-Up builds upper-body pulling strength relative to body weight, a standard many lifters work toward. It develops grip, back, and bicep strength in a single compound movement. It is well suited for anyone who has built a strength base and is ready for a bodyweight pulling challenge. It also serves as a long-term benchmark for upper-body strength progress.

**HOW TO DO IT**
1. Hang from the bar with hands slightly wider than shoulder width.
2. Brace your core and squeeze your shoulder blades down and back.
3. Pull your body upward by driving your elbows toward your hips.
4. Continue pulling until your chin clears the bar.
5. Lower yourself back down under control to a full hang.

**COACHING CUES**
> — Start each rep from a full hang with arms straight
> — Pull your elbows down and back rather than just bending your arms
> — Keep your core braced to avoid excessive swinging
> — Lower yourself with control rather than dropping

**WATCH OUT FOR**
> — The body swings to build momentum instead of pulling with control
> — Only the arms bend without the shoulder blades engaging first
> — The range of motion shortens, stopping short of a full hang at the bottom

**Progressions:** None — no harder same-pattern variant exists in the launch catalog for this exercise.
**Regressions:** Band-Assisted Pull-Up, Negative Pull-Up
**Alternatives:** Lat Pulldown, Chin-Up

---

## Validation Summary

**Exercises authored:** 9 of 9 Tier 1 anchors retained in this pass (Back Squat, Deadlift, Barbell Romanian Deadlift, Hip Thrust, Lunge, Barbell Bench Press, Overhead Press, Barbell Row, Pull-Up). ✓ (A 10th, originally authored here as "Squat," was retired and its content relocated to `Exercise-Population-Pass-04-v1.0.md` §2 "Bodyweight Squat" per the 2026-06-30 Exercise Naming Standard reconciliation — see this doc's header addendum.)

**Required fields completed (all 9 exercises):**
- Canonical name, category, movement pattern, equipment tag(s) — verified verbatim against `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §2. ✓
- ABOUT (1–3 sentences), WHY IT MATTERS (1–4 sentences), HOW TO DO IT (5–8 numbered steps, each starting with a verb), COACHING CUES (4 bullets each), WATCH OUT FOR (3 bullets each, all phrased as observations, none as commands). ✓
- Every anchor has at least one of `progressionExerciseIds` / `regressionExerciseIds` populated (Deadlift and Pull-Up have no progression — no genuinely harder same-pattern variant exists in the 200-name catalog for either — but both have regressions populated). ✓

**Relationship integrity verified:**
- Every progression/regression target shares its source exercise's exact `movementPattern` (SQUAT, HINGE, PUSH_HORIZONTAL, PUSH_VERTICAL, PULL_HORIZONTAL, or PULL_VERTICAL as applicable). ✓
- Every relationship target (progression, regression, and alternative) checked directly against the 195-name Launch Catalog Blueprint (post-naming-reconciliation) and confirmed present: Goblet Squat, Front Squat, Smith Machine Squat, Leg Press, Dumbbell Deadlift, Sumo Deadlift, Single-Leg Romanian Deadlift, Dumbbell Romanian Deadlift, Good Morning, Cable Pull-Through, Single-Leg Hip Thrust, Glute Bridge, Banded Hip Thrust, Back Extension, Bulgarian Split Squat, Walking Lunge, Split Squat, Reverse Lunge, Box Step-Up, Dip, Dumbbell Bench Press, Push-Up, Cable Chest Press, Handstand Push-Up, Seated Dumbbell Shoulder Press, Arnold Press, Cable Overhead Press, Single-Arm Dumbbell Row, Chest-Supported Row, Seated Cable Row, Inverted Row, Band-Assisted Pull-Up, Negative Pull-Up, Lat Pulldown, Chin-Up. ✓
- No relationship array exceeds the 1–3 cap (progressions/regressions) or sits outside the 2–6 editorial range (alternatives, per Exercise-002 §3.2); each anchor in this pass carries 2 alternatives. ✓
- No exercise appears in more than one relationship array on the same source exercise (Independence Rule, EX-002 §4.5). ✓
- No relationship targets a CUSTOM exercise; no relationship is self-referential. ✓
- No alternative was forced where a genuine same-intent, different-execution substitute did not exist; no progression was forced where no genuinely harder same-pattern variant exists in the catalog (Deadlift, Pull-Up). ✓

**Framework compliance verified:**
- Per-field voice matches `Anchor-Exercise-Authoring-Framework-v1.0.md` §2: ABOUT and WHY IT MATTERS are third-person with no "you"; HOW TO DO IT and COACHING CUES are second-person imperative with the subject dropped; WATCH OUT FOR is third-person descriptive with zero imperative phrasing. ✓
- No biomechanics jargon (scapular retraction, anterior pelvic tilt, eccentric loading, etc.) appears in any field; only plain anatomical terms (chest, shoulders, hips, knees, glutes, hamstrings, quads, lower back, shoulder blades, core). ✓
- No exclamation points, no emoji, no all-caps emphasis in any authored field. ✓
- Each exercise refers to itself by its exact canonical Launch Catalog Blueprint name throughout its own content fields, with no synonym substitution. ✓
- Sentence and step counts sit within their locked bounds, generally near the middle of each range rather than at the ceiling. ✓

**Not yet complete (explicitly out of scope for this pass):** media (GIF/video) attachment, `primaryMuscles`/`secondaryMuscles`/`difficulty` assignment, `isActive: true` flag (per QC checklist, only set once media is attached and all content fields are verified against this document). This pass authors content only; it does not flip any exercise to active in the catalog.

**Recommended next action:** Anchor Exercise Population Pass #2, covering the remaining 35 anchors per `Anchor-Exercise-Authoring-Framework-v1.0.md` §6 Tiers 2–4, beginning with Tier 2 (PUSH/PULL/CORE).
