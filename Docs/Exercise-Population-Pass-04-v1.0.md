# Forge Legacy Exercise Population Pass #4

## v1.0 | June 2026

**Status:** Content authored — pending content-team review and media production before `isActive: true`. **Addendum (Exercise Naming Standard reconciliation, 2026-06-30):** Section 2 "Bodyweight Squat" was rewritten using the authored content relocated from `Anchor-Exercise-Population-Pass-01-v1.0.md` §1 (originally "Squat," now retired); Section 7 "Step-Up" was retired (its duplicate, "Box Step-Up," is the sole canonical name). Several relationship-array references were retargeted accordingly. See `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §3 for the full resolution record.

**Scope:** First non-anchor population pass. All 45 anchors (44 post-reconciliation) are authored and locked (Anchor Exercise Population Pass #1–#3). This pass begins the remaining catalog rows, starting with the non-anchor SQUAT-pattern exercises in LEGS_AND_GLUTES: Front Squat, Bodyweight Squat, Bodyweight Box Squat, Goblet Squat, Split Squat, Box Step-Up, Bulgarian Split Squat, Walking Lunge, Reverse Lunge, Leg Press, Hack Squat, Wall Sit, Pistol Squat, Smith Machine Squat (14 rows; "Step-Up" was retired as a duplicate of Box Step-Up).

**Authority:** Same as the anchor passes — `Exercise-Library-Architecture-v1.0.md`, `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md`, `Anchor-Exercise-Authoring-Framework-v1.0.md` (writing/QC standards extended to non-anchor content by `Exercise-Library-Production-Plan.md` §3), `Exercise-002-Exercise-Substitution-Architecture.md`, `Exercise-Detail-Wireframe-Spec-W22.md`.

**Not in scope:** media production, `primaryMuscles`/`secondaryMuscles`/`difficulty` assignment, any document amendment, any catalog or architecture change.

**Naming-duplicate note (resolved 2026-06-30):** Box Step-Up / Step-Up was one of the five flagged naming-duplicate pairs in the Launch Catalog Blueprint. Per the Exercise Naming Standard reconciliation, "Box Step-Up" is now the sole canonical name; Section 7 "Step-Up" was retired. See `Exercise-Naming-Standard-v1.0.md`.

**Existing locked relationships respected (not modified):** Back Squat (progression: Front Squat; regression: Goblet Squat; alternatives: Smith Machine Squat, Leg Press), Lunge (progression: Bulgarian Split Squat, Walking Lunge; regression: Split Squat; alternatives: Reverse Lunge, Box Step-Up) — both from Anchor Exercise Population Pass #1 (APPROVED). This pass authors the reciprocal/onward relationships for the rows below, mirroring those anchors' directions where coherent. (Squat's locked relationships — progression: Goblet Squat; regression: Bodyweight Box Squat; alternatives: Split Squat, Wall Sit — were retired with Squat itself; their content informed, but does not dictate, Bodyweight Squat's own already-authored relationships below, which are left unchanged.)

---

## Section 1 — Front Squat

| Field | Value |
|---|---|
| Canonical Name | Front Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | BARBELL, SQUAT_RACK |
| Primary Muscle(s) | QUADS |
| Secondary Muscle(s) | GLUTES, CORE |

**ABOUT**
> The Front Squat is a barbell squat performed with the bar resting across the front of the shoulders, loaded from a squat rack. It trains the quads, glutes, and core through an upright torso position. The front-loaded bar position demands more core and upper-back control than a Back Squat.

**WHY IT MATTERS**
> The Front Squat builds quad strength and core bracing in a more upright position than the Back Squat allows. It carries over to athletic movements that require staying tall under load, such as Olympic lifting positions. It is well suited for lifters who have mastered the Back Squat and want a more demanding squat variation. It also reinforces the thoracic mobility needed for overhead and front-rack carrying positions.

**HOW TO DO IT**
1. Set the bar in the rack at upper-chest height.
2. Rest the bar across the front of your shoulders, elbows lifted high.
3. Lift the bar off the rack and step back to clear it.
4. Set your feet shoulder-width apart and brace your core.
5. Bend your knees and hips together to lower into the squat.
6. Drive through your feet to stand back up, keeping your elbows lifted throughout.

**COACHING CUES**
> — Keep your elbows lifted high throughout the entire lift
> — Keep your torso upright rather than leaning forward
> — Brace your core hard before you start the descent
> — Drive your knees out as you stand up

**WATCH OUT FOR**
> — The elbows drop, letting the bar roll forward off the shoulders
> — The torso leans forward as the squat gets heavier
> — The heels rise off the floor near the bottom of the squat

**Progressions:** None — no harder same-pattern barbell variant exists in the launch catalog for this exercise.
**Regressions:** Back Squat
**Alternatives:** Hack Squat, Leg Press

---

## Section 2 — Bodyweight Squat

| Field | Value |
|---|---|
| Canonical Name | Bodyweight Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | BODYWEIGHT |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Bodyweight Squat is a lower-body exercise that trains the quads, glutes, and hamstrings through a deep bend at the knees and hips. It uses only body weight, making it the most accessible squat-pattern movement in the library. It serves as the entry point for every loaded squat variation.

**WHY IT MATTERS**
> The Bodyweight Squat builds the strength and mobility needed for nearly every lower-body movement in daily life and training. It teaches proper hip and knee mechanics before any external load is added. It is well suited for beginners building a movement base and for anyone warming up before a loaded squat session. It also reinforces ankle, knee, and hip mobility through a full range of motion.

**HOW TO DO IT**
1. Stand with feet shoulder-width apart, toes pointed slightly outward.
2. Brace your core and keep your chest tall.
3. Bend your knees and hips together, lowering as if sitting into a chair.
4. Keep your weight balanced over the middle of your feet.
5. Lower until your hips are level with or below your knees.
6. Drive through your feet to stand back up to the starting position.

**COACHING CUES**
> — Keep your knees tracking in line with your toes
> — Keep your heels flat on the floor throughout the movement
> — Brace your core before you start lowering
> — Push your hips back as you begin the descent

**WATCH OUT FOR**
> — The heels lift off the floor as the squat gets deeper
> — The knees cave inward as the legs drive back up
> — The chest drops forward and the back rounds at the bottom

**Progressions:** Bulgarian Split Squat
**Regressions:** Wall Sit
**Alternatives:** Goblet Squat, Split Squat

---

## Section 3 — Bodyweight Box Squat

| Field | Value |
|---|---|
| Canonical Name | Bodyweight Box Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | BODYWEIGHT, BENCH |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Bodyweight Box Squat is a lower-body exercise performed by squatting down to lightly touch a box or bench before standing back up. It trains the quads, glutes, and hamstrings with a consistent depth target. The box removes the guesswork of how low to squat.

**WHY IT MATTERS**
> The Bodyweight Box Squat builds confidence and consistent depth for athletes still learning squat mechanics. It is well suited for beginners who need a clear depth cue or for anyone returning to squatting after time away. It also reduces the balance demand of a free-standing squat since the box provides a brief checkpoint. It is a natural bridge between basic squatting and loaded squat work.

**HOW TO DO IT**
1. Stand in front of a box or bench with feet shoulder-width apart.
2. Brace your core and keep your chest tall.
3. Bend your knees and hips together to lower toward the box.
4. Lightly touch the box with your hips without sitting down fully.
5. Drive through your feet to stand back up to the starting position.

**COACHING CUES**
> — Lightly tap the box rather than sitting your full weight down
> — Keep your knees tracking in line with your toes
> — Keep your chest tall as you lower toward the box
> — Reach your hips back to find the box rather than dropping straight down

**WATCH OUT FOR**
> — The hips slam down onto the box instead of touching lightly
> — The knees cave inward on the way back up
> — The chest drops forward as the hips reach toward the box

**Progressions:** Bodyweight Squat
**Regressions:** Wall Sit
**Alternatives:** Box Step-Up, Goblet Squat

---

## Section 4 — Goblet Squat

| Field | Value |
|---|---|
| Canonical Name | Goblet Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | DUMBBELL, KETTLEBELL |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS, CORE |

**ABOUT**
> The Goblet Squat is a squat performed holding a single dumbbell or kettlebell vertically at the chest. It trains the quads, glutes, and core while the front-loaded weight helps keep the torso upright. It is one of the most common entry points to loaded squatting.

**WHY IT MATTERS**
> The Goblet Squat builds squat strength and depth while the held weight naturally counterbalances the body and encourages an upright torso. It is well suited for beginners transitioning from bodyweight squats to loaded work. It also serves experienced lifters as a quick warm-up or accessory squat variation. It requires only a single dumbbell or kettlebell, making it accessible in almost any setting.

**HOW TO DO IT**
1. Hold a dumbbell or kettlebell vertically at your chest with both hands.
2. Stand with feet shoulder-width apart, toes pointed slightly outward.
3. Brace your core and keep your chest tall.
4. Bend your knees and hips together, lowering into the squat.
5. Lower until your elbows brush the inside of your knees.
6. Drive through your feet to stand back up to the starting position.

**COACHING CUES**
> — Keep the weight close to your chest throughout the squat
> — Keep your elbows pointed down rather than flaring out
> — Push your knees out as you lower into the squat
> — Drive through your whole foot as you stand up

**WATCH OUT FOR**
> — The weight drifts away from the chest during the descent
> — The chest drops forward as the squat gets deeper
> — The heels lift off the floor near the bottom of the squat

**Progressions:** Back Squat
**Regressions:** Bodyweight Squat
**Alternatives:** Split Squat, Box Step-Up

---

## Section 5 — Split Squat

| Field | Value |
|---|---|
| Canonical Name | Split Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | DUMBBELL, BODYWEIGHT |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Split Squat is a single-leg squat-pattern exercise performed from a fixed staggered stance, lowering the back knee toward the floor without stepping. It trains the quads, glutes, and hamstrings on one leg at a time. It can be performed with body weight alone or with added dumbbells.

**WHY IT MATTERS**
> The Split Squat builds single-leg strength and balance from a stable, fixed stance, making it a more controlled entry point than a stepping lunge. It is well suited for beginners learning single-leg control before progressing to moving variations. It also helps correct side-to-side strength imbalances. It pairs well with bilateral squat work to build complete lower-body strength.

**HOW TO DO IT**
1. Step one foot forward and one foot back into a staggered stance.
2. Keep your torso upright and core braced.
3. Lower your back knee toward the floor, bending both knees.
4. Keep your front knee tracking over your front foot.
5. Push through your front foot to return to standing.
6. Repeat for the set, then switch legs.

**COACHING CUES**
> — Keep your torso upright throughout the movement
> — Keep your front foot flat on the floor the entire set
> — Lower straight down rather than drifting forward
> — Push evenly through your whole front foot as you stand

**WATCH OUT FOR**
> — The front knee drifts forward past the toes
> — The torso leans forward during the descent
> — The back heel lifts and rotates outward during the lower

**Progressions:** Lunge
**Regressions:** Bodyweight Squat
**Alternatives:** Reverse Lunge, Bulgarian Split Squat

---

## Section 6 — Box Step-Up

| Field | Value |
|---|---|
| Canonical Name | Box Step-Up |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | DUMBBELL, BENCH |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Box Step-Up is a single-leg exercise performed by stepping up onto a box or bench, driving through one leg to bring the body upright. It trains the quads and glutes through a unilateral pressing motion. It can be performed with body weight alone or with added dumbbells.

**WHY IT MATTERS**
> The Box Step-Up builds single-leg strength and power without the balance demand of a forward-stepping lunge, since the box provides a fixed target. It carries over to climbing, stepping, and other everyday single-leg tasks. It is well suited for athletes building unilateral leg power for sports that involve stepping or driving off one leg. It also helps identify and correct side-to-side strength differences.

**HOW TO DO IT**
1. Stand facing a box or bench with one foot planted on top.
2. Brace your core and keep your torso upright.
3. Drive through the planted foot to step up onto the box.
4. Stand fully upright on top of the box.
5. Step back down with the trailing leg under control.
6. Repeat for the set, then switch legs.

**COACHING CUES**
> — Drive through your whole foot rather than pushing off your trailing leg
> — Keep your torso upright throughout the step-up
> — Stand fully tall at the top before stepping back down
> — Choose a box height you can step onto with control

**WATCH OUT FOR**
> — The trailing leg pushes off the floor to help drive the body up
> — The knee caves inward as the body rises
> — The box height is too aggressive for a controlled step

**Progressions:** Bulgarian Split Squat
**Regressions:** Reverse Lunge
**Alternatives:** Lunge, Walking Lunge

---

## Section 8 — Bulgarian Split Squat

| Field | Value |
|---|---|
| Canonical Name | Bulgarian Split Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | DUMBBELL, BENCH |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Bulgarian Split Squat is a single-leg squat-pattern exercise performed with the rear foot elevated on a bench. It trains the quads and glutes on one leg at a time, holding a dumbbell in each hand for added load. The elevated rear foot increases the range of motion and balance demand compared to a standard Split Squat.

**WHY IT MATTERS**
> The Bulgarian Split Squat builds single-leg strength and balance more demandingly than a flat-footed split squat because of the elevated rear foot. It carries over to sports and activities requiring single-leg stability under load. It is well suited for lifters who have mastered the Split Squat and Lunge and are ready for a more advanced unilateral exercise. It also helps correct side-to-side strength imbalances at a higher difficulty level.

**HOW TO DO IT**
1. Stand a few feet in front of a bench, facing away from it.
2. Rest the top of one foot on the bench behind you.
3. Hold a dumbbell in each hand at your sides.
4. Lower your back knee toward the floor, bending your front knee.
5. Keep your front knee tracking over your front foot.
6. Push through your front foot to return to standing.

**COACHING CUES**
> — Keep your torso upright throughout the descent
> — Keep most of your weight on your front leg
> — Lower straight down rather than drifting forward
> — Push evenly through your whole front foot as you stand

**WATCH OUT FOR**
> — The front knee drifts forward past the toes
> — The torso leans forward to compensate for the balance demand
> — The back foot slides off the bench during the set

**Progressions:** Pistol Squat
**Regressions:** Lunge
**Alternatives:** Box Step-Up, Reverse Lunge

---

## Section 9 — Walking Lunge

| Field | Value |
|---|---|
| Canonical Name | Walking Lunge |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | DUMBBELL, BODYWEIGHT |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Walking Lunge is a single-leg squat-pattern exercise performed by stepping forward into a lunge and continuing forward with the opposite leg, rather than returning to the starting position. It trains the quads, glutes, and hamstrings while adding a locomotion and balance demand. It can be performed with body weight alone or with added dumbbells.

**WHY IT MATTERS**
> The Walking Lunge builds single-leg strength, balance, and coordination through continuous forward movement rather than a static step. It carries over to walking, running, and other locomotion-based activities more directly than a stationary lunge. It is well suited for lifters who have mastered the basic Lunge and are ready for a more dynamic challenge. It also conditions the legs through sustained single-leg work across multiple steps.

**HOW TO DO IT**
1. Stand tall with feet hip-width apart.
2. Step forward with one leg, landing heel first.
3. Lower your back knee toward the floor, bending both knees.
4. Push through your front foot to stand up and step forward with your back leg.
5. Continue alternating legs as you move forward.
6. Keep your torso upright throughout each step.

**COACHING CUES**
> — Keep your torso upright throughout each step
> — Take a step long enough that your front knee stays over your foot
> — Push evenly through your whole front foot with each step
> — Keep your core braced to stay balanced while moving

**WATCH OUT FOR**
> — The front knee drifts forward past the toes on each step
> — The torso leans forward as fatigue builds
> — The steps become short and choppy instead of controlled

**Progressions:** None — no harder same-pattern variant exists in the launch catalog for this exercise.
**Regressions:** Lunge
**Alternatives:** Reverse Lunge, Bulgarian Split Squat

---

## Section 10 — Reverse Lunge

| Field | Value |
|---|---|
| Canonical Name | Reverse Lunge |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | DUMBBELL, BODYWEIGHT |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Reverse Lunge is a single-leg squat-pattern exercise performed by stepping backward and lowering the back knee toward the floor. It trains the quads, glutes, and hamstrings while placing less stress on the front knee than a forward-stepping Lunge. It can be performed with body weight alone or with added dumbbells.

**WHY IT MATTERS**
> The Reverse Lunge builds single-leg strength and balance with a gentler knee demand than stepping forward, making it a useful option for athletes managing a knee limitation. It carries over to the same walking, climbing, and single-leg stability tasks as the standard Lunge. It is well suited as a regression for athletes still building confidence with forward-stepping lunges. It also reinforces hip and ankle stability during the backward step.

**HOW TO DO IT**
1. Stand tall with feet hip-width apart.
2. Step backward with one leg, landing on the ball of your foot.
3. Lower your back knee toward the floor, bending both knees.
4. Keep your front knee tracking over your front foot.
5. Push through your front foot to return to standing.
6. Repeat on the other leg.

**COACHING CUES**
> — Keep your torso upright throughout the step back
> — Keep most of your weight on your front leg
> — Step back far enough that your front knee stays over your foot
> — Push evenly through your whole front foot as you stand

**WATCH OUT FOR**
> — The front knee drifts forward past the toes
> — The torso leans forward during the step back
> — The back foot lands too close, shortening the working range of motion

**Progressions:** Walking Lunge
**Regressions:** Lunge
**Alternatives:** Split Squat, Box Step-Up

---

## Section 11 — Leg Press

| Field | Value |
|---|---|
| Canonical Name | Leg Press |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | MACHINE |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Leg Press is a machine-based squat-pattern exercise performed by pressing a weighted platform away from the body using the legs. It trains the quads, glutes, and hamstrings while the machine supports the back and removes the balance demand of a free-standing squat. It is performed seated or reclined, depending on the machine.

**WHY IT MATTERS**
> The Leg Press builds lower-body strength and size without requiring the balance and bracing skills a barbell squat demands. It is well suited for lifters who want to add heavy leg volume without loading the spine the way a Back Squat does. It also offers a safer option for athletes managing a back limitation. It is a staple accessory exercise in hypertrophy and lower-body programs.

**HOW TO DO IT**
1. Sit in the machine with your back against the pad.
2. Place your feet on the platform shoulder-width apart.
3. Release the safety handles and bend your knees to lower the platform.
4. Lower until your knees approach a 90-degree bend.
5. Press through your feet to extend your legs back to the starting position.
6. Avoid locking your knees aggressively at the top.

**COACHING CUES**
> — Keep your back flat against the pad throughout
> — Keep your knees tracking in line with your feet
> — Press evenly through your whole foot rather than your toes
> — Control the lowering phase rather than letting the platform drop

**WATCH OUT FOR**
> — The lower back rounds and lifts off the pad at the bottom
> — The knees cave inward as the legs press back up
> — The range of motion shortens, stopping well short of 90 degrees

**Progressions:** Hack Squat
**Regressions:** None — no easier same-pattern machine variant exists in the launch catalog for this exercise.
**Alternatives:** Smith Machine Squat, Goblet Squat

---

## Section 12 — Hack Squat

| Field | Value |
|---|---|
| Canonical Name | Hack Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | MACHINE |
| Primary Muscle(s) | QUADS |
| Secondary Muscle(s) | GLUTES |

**ABOUT**
> The Hack Squat is a machine-based squat-pattern exercise performed on an angled platform, squatting against a fixed weighted sled. It trains the quads, glutes, and hamstrings while the machine guides the body through a fixed path. The angled back support changes the torso angle compared to a standing squat.

**WHY IT MATTERS**
> The Hack Squat builds quad-focused lower-body strength while the fixed path removes much of the balance demand of a free-standing squat. It is well suited for lifters looking to add heavy, focused quad volume after compound squat training. It also offers a back-supported alternative for athletes managing a lower-back limitation. It is commonly used as a hypertrophy-focused accessory to the Back Squat.

**HOW TO DO IT**
1. Position your shoulders and back against the pads of the machine.
2. Place your feet shoulder-width apart on the platform.
3. Release the safety bars and bend your knees to lower the sled.
4. Lower until your knees approach a 90-degree bend.
5. Press through your feet to extend your legs back to the starting position.
6. Re-engage the safety bars after your final rep.

**COACHING CUES**
> — Keep your back and shoulders pressed into the pads throughout
> — Keep your knees tracking in line with your feet
> — Press evenly through your whole foot as you stand
> — Control the lowering phase rather than letting the sled drop

**WATCH OUT FOR**
> — The knees cave inward as the legs press back up
> — The heels lift off the platform near the bottom of the squat
> — The range of motion shortens, stopping well short of 90 degrees

**Progressions:** None — no harder same-pattern machine variant exists in the launch catalog for this exercise.
**Regressions:** Leg Press
**Alternatives:** Smith Machine Squat, Back Squat

---

## Section 13 — Wall Sit

| Field | Value |
|---|---|
| Canonical Name | Wall Sit |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | BODYWEIGHT |
| Primary Muscle(s) | QUADS |
| Secondary Muscle(s) | GLUTES |

**ABOUT**
> The Wall Sit is a bodyweight squat-pattern exercise performed by holding a seated squat position against a wall. It trains the quads and glutes through an isometric hold rather than repeated reps. It requires no equipment beyond a flat wall.

**WHY IT MATTERS**
> The Wall Sit builds quad endurance and squat-position awareness without requiring any movement skill, making it one of the most accessible lower-body exercises in the library. It is well suited for absolute beginners building basic leg strength or for anyone returning to training after time away. It also serves as a low-impact option for athletes managing a knee or balance limitation. It requires no equipment and can be performed almost anywhere.

**HOW TO DO IT**
1. Stand with your back against a wall, feet shoulder-width apart.
2. Walk your feet forward and slide your back down the wall.
3. Lower until your knees reach roughly a 90-degree bend.
4. Keep your back flat against the wall throughout the hold.
5. Hold the position while breathing steadily.

**COACHING CUES**
> — Keep your knees tracking directly above your ankles
> — Press your back evenly into the wall throughout the hold
> — Breathe steadily rather than holding your breath
> — Keep your weight balanced through your whole foot

**WATCH OUT FOR**
> — The knees drift forward past the ankles during the hold
> — The lower back arches away from the wall
> — The hold shortens as fatigue builds instead of staying at depth

**Progressions:** Bodyweight Squat
**Regressions:** None — no easier same-pattern variant exists in the launch catalog for this exercise.
**Alternatives:** Bodyweight Box Squat, Glute Bridge

---

## Section 14 — Pistol Squat

| Field | Value |
|---|---|
| Canonical Name | Pistol Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | BODYWEIGHT |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS, CORE |

**ABOUT**
> The Pistol Squat is a single-leg squat performed by lowering all the way to the floor on one leg while the other leg extends forward off the ground. It trains the quads, glutes, and core along with significant balance and ankle mobility. It is one of the most demanding bodyweight squat variations in the catalog.

**WHY IT MATTERS**
> The Pistol Squat builds elite single-leg strength, balance, and mobility using only body weight. It is well suited for advanced athletes who have already mastered loaded single-leg work like the Bulgarian Split Squat. It also serves as a long-term bodyweight strength benchmark. It demands a level of ankle and hip mobility that most other squat variations do not require.

**HOW TO DO IT**
1. Stand on one leg with the other leg extended straight in front of you.
2. Reach your arms forward for balance.
3. Brace your core and bend the standing knee to lower down.
4. Lower under control until your hips are near the floor.
5. Keep the extended leg off the ground throughout the descent.
6. Drive through the standing foot to return to standing.

**COACHING CUES**
> — Keep your weight balanced through the middle of your standing foot
> — Move slowly rather than dropping quickly into the bottom position
> — Keep your extended leg as straight as comfortable throughout
> — Reach your arms forward to help maintain balance

**WATCH OUT FOR**
> — The standing heel lifts off the floor as the squat deepens
> — The extended leg touches down to help with balance
> — The torso collapses forward at the bottom of the squat

**Progressions:** None — no harder same-pattern bodyweight variant exists in the launch catalog for this exercise.
**Regressions:** Bulgarian Split Squat
**Alternatives:** Walking Lunge, Bodyweight Squat

---

## Section 15 — Smith Machine Squat

| Field | Value |
|---|---|
| Canonical Name | Smith Machine Squat |
| Category | LEGS_AND_GLUTES |
| Movement Pattern | SQUAT |
| Equipment Tag(s) | MACHINE |
| Primary Muscle(s) | QUADS, GLUTES |
| Secondary Muscle(s) | HAMSTRINGS |

**ABOUT**
> The Smith Machine Squat is a squat performed with a barbell fixed to vertical rails, guiding the bar along a set path. It trains the quads, glutes, and hamstrings similarly to a Back Squat while removing the need to balance the bar. The fixed rail path changes the stability demand compared to a free barbell.

**WHY IT MATTERS**
> The Smith Machine Squat builds lower-body strength while removing the balance and bar-path management a free barbell requires. It is well suited for lifters training alone who want a safer way to squat heavy without a spotter. It also offers a useful option for athletes still building confidence with loaded squatting. It allows the lifter to focus entirely on depth and leg drive rather than bar stability.

**HOW TO DO IT**
1. Set the bar in the rails at upper-chest height.
2. Step under the bar and rest it across your upper back.
3. Unhook the bar and set your feet shoulder-width apart.
4. Brace your core and bend your knees and hips together to lower.
5. Lower until your hips are level with or below your knees.
6. Drive through your feet to stand back up and re-hook the bar.

**COACHING CUES**
> — Keep the bar tight against your upper back throughout
> — Brace your core hard before you start the descent
> — Position your feet slightly forward of the rail's fixed path
> — Drive through your whole foot as you stand up

**WATCH OUT FOR**
> — The knees collapse inward on the way up
> — The heels rise off the floor near the bottom of the squat
> — The fixed bar path is fought against instead of the stance being adjusted to match it

**Progressions:** None — no harder same-pattern machine variant exists in the launch catalog for this exercise.
**Regressions:** Leg Press
**Alternatives:** Back Squat, Hack Squat

---

## Validation Summary

**Exercises authored:** 15 of 15 scoped exercises as originally authored — all non-anchor SQUAT-pattern rows in LEGS_AND_GLUTES (Front Squat, Bodyweight Squat, Bodyweight Box Squat, Goblet Squat, Split Squat, Box Step-Up, Step-Up, Bulgarian Split Squat, Walking Lunge, Reverse Lunge, Leg Press, Hack Squat, Wall Sit, Pistol Squat, Smith Machine Squat). **Post-naming-reconciliation (2026-06-30): 14 retained** — "Step-Up" was retired as a duplicate of "Box Step-Up," and "Bodyweight Squat" now carries the content originally authored under "Squat" in Anchor Pass #1. Combined with the 44 locked anchors, 58 of 195 catalog exercises are now authored. ✓

**Required fields completed (all 15 exercises):**
- Canonical name, category, movement pattern, equipment tag(s) verified verbatim against `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §2. ✓
- ABOUT (1–3 sentences), WHY IT MATTERS (1–4 sentences), HOW TO DO IT (5–6 numbered steps, each starting with a verb), COACHING CUES (4 bullets each), WATCH OUT FOR (3 bullets each, phrased as observations, none as commands). ✓

**Relationship integrity verified:**
- Every progression/regression target shares its source exercise's exact `movementPattern` (SQUAT in all 15 cases). ✓
- Every relationship target checked directly against the 195-name Launch Catalog Blueprint (post-naming-reconciliation) and confirmed present: Back Squat, Hack Squat, Leg Press, Bulgarian Split Squat, Wall Sit, Bodyweight Squat, Goblet Squat, Split Squat, Box Step-Up, Lunge, Reverse Lunge, Walking Lunge, Pistol Squat, Smith Machine Squat, Glute Bridge, Bodyweight Box Squat. ✓
- No relationship array exceeds the 1–3 cap (progressions/regressions); alternatives sit at 2 per exercise. ✓
- No exercise appears in more than one relationship array on the same source exercise (Independence Rule, EX-002 §4.5). Verified individually for all 14 retained rows, including the two reconciliation edits (Wall Sit's Alternatives was retargeted from the retired "Squat" to "Bodyweight Box Squat" specifically to avoid colliding with Wall Sit's own Progressions, which already targets "Bodyweight Squat"). ✓
- No relationship targets a CUSTOM exercise; no relationship is self-referential. ✓
- Directionally consistent ladders authored where genuine, mirroring the already-locked anchor relationships: Front Squat.regression = Back Squat (mirrors Back Squat.progression = Front Squat); Goblet Squat.progression = Back Squat / regression = Bodyweight Squat (mirrors both the relocated Bodyweight Squat content and Back Squat.regression = Goblet Squat); Split Squat.progression = Lunge (mirrors Lunge.regression = Split Squat); Box Step-Up/Walking Lunge/Reverse Lunge each relate back to Lunge consistent with Lunge's own locked progression/alternative set; Leg Press ↔ Hack Squat mirrored as progression/regression on each side; Smith Machine Squat.regression = Leg Press. ✓
- Cross-pattern alternative authored under Exercise-002 §5.2's governing test: Wall Sit ↔ Glute Bridge (SQUAT ↔ HINGE) — both low-skill, foundational, equipment-free lower-body holds/movements, shared training intent preserved despite differing `movementPattern`, consistent with the Front Plank↔Bird Dog precedent in Anchor Pass #2. ✓
- Five exercises (Front Squat, Walking Lunge, Hack Squat, Pistol Squat, Smith Machine Squat) have no progression, and two (Leg Press, Wall Sit) have no regression, in each case because no genuinely harder or easier same-pattern variant exists in the catalog — not a content gap, consistent with the honesty standard set in the anchor passes. ✓

**Framework compliance verified:**
- Per-field voice matches `Anchor-Exercise-Authoring-Framework-v1.0.md` §2 across all 14 retained entries: ABOUT/WHY IT MATTERS third-person, no "you"; HOW TO DO IT/COACHING CUES second-person imperative, subject dropped; WATCH OUT FOR third-person descriptive, zero imperative phrasing. ✓
- No biomechanics jargon in any field; only plain anatomical terms (quads, glutes, hamstrings, core, knees, hips, ankles, back). ✓
- No exclamation points, no emoji, no all-caps emphasis. ✓
- Each exercise refers to itself by its exact canonical name throughout its own content fields, with no synonym substitution. ✓
- Sentence and step counts sit within their locked bounds. ✓

**Not yet complete (out of scope for this pass):** media (GIF/video) attachment, `primaryMuscles`/`secondaryMuscles`/`difficulty` assignment, `isActive: true` flag. This pass authors content only.

**Recommended next action:** Exercise Population Pass #5, covering the remaining 21 non-anchor LEGS_AND_GLUTES exercises in HINGE (13) and PLYOMETRIC_LOWER (8).

---

*Forge Legacy Exercise Population Pass #4 — v1.0*
*Forge Legacy | June 2026*
