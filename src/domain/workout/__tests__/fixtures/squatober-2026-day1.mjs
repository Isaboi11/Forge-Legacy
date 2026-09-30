/*
 * Squatober Season Twelve, Day 1 ("DEEP End Diving") — the PO's own photo of the card, 2026-09-30, and what the
 * live functions' prompts actually returned for it that day. Nothing here is typed by hand or tidied:
 * `feedback_test_fixtures_must_be_real_input` — a fixture reconstructed from a screenshot passed, and the real
 * table then crashed the reader (a short row has no Reps cell).
 *
 *   S12_DAY1_TABLE        program-photo-read's deployed prompt: the photo as a table (TSV).
 *   S12_DAY1_TABLE_TIDY_* workout-tidy's deployed prompt on that table's box text, two runs.
 *   S12_DAY1_CARD         a whole-card, line-by-line read (a prompt tried in the test; NOT deployed).
 *   S12_DAY1_CARD_TIDY_*  workout-tidy's deployed prompt on that card text, two runs.
 */

export const S12_DAY1_TABLE = `Day	Exercise	Sets	Reps	Time
1	Warm Up: Trunk Twists and Crack the Knuckles				
1	BACK SQUAT	9 total sets	5 reps 60%,65%,70% / 3 reps 73%,75%,78% / 1 rep 82%,85%,87%	2 min rest between each set
1	BENCH PRESS		3 reps 70%,75%,80%,80%,80%	90 seconds rest between sets
1	DEADlift	4 sets	3 reps 75%	90 sec rest between sets *No tapping or Bouncing weight off floor
1	Dips (Cardio "Scary Arms" superset all 3)	3 sets	8-12 reps	
1	BB Bicep Curls (Cardio "Scary Arms" superset all 3)	3 sets	15 reps	
1	Bumper Plate Pinch Holds (Cardio "Scary Arms" superset all 3)	3 sets		20 seconds
1	Rest between sets (Cardio)				90 sec
1	Recovery: STEAK and Eggs				
1	Recovery: 30 min Walk				
1	Recovery: 8+ hrs of DEEP sleep`;

export const S12_DAY1_TABLE_TIDY_1 = `Warm up: Trunk Twists and Crack the Knuckles
1. Back Squat 5 reps @ 60%, 5 reps @ 65%, 5 reps @ 70%, 3 reps @ 73%, 3 reps @ 75%, 3 reps @ 78%, 1 rep @ 82%, 1 rep @ 85%, 1 rep @ 87%
rest 2:00
2. Bench Press 3 reps @ 70%, 3 reps @ 75%, 3 reps @ 80%, 3 reps @ 80%, 3 reps @ 80%
rest 1:30
3. Deadlift 4 sets of 3 reps @ 75%
* No tapping or bouncing weight off floor
rest 1:30
4. a. Dips 3 sets of 8-12 reps
* Cardio "Scary Arms" superset all 3
super set b. BB Bicep Curls 3 sets of 15 reps
super set c. Bumper Plate Pinch Holds 3 sets of 20 seconds
rest 1:30 between each super set
Recovery: Steak and Eggs · 30 min Walk · 8+ hrs of deep sleep`;

export const S12_DAY1_TABLE_TIDY_2 = `Warm up: Trunk Twists and Crack the Knuckles
1. Back Squat 5 reps @ 60% rest 2:00, 5 reps @ 65% rest 2:00, 5 reps @ 70% rest 2:00, 3 reps @ 73% rest 2:00, 3 reps @ 75% rest 2:00, 3 reps @ 78% rest 2:00, 1 rep @ 82% rest 2:00, 1 rep @ 85% rest 2:00, 1 rep @ 87% rest 2:00
2. Bench Press 3 reps @ 70% rest 1:30, 3 reps @ 75% rest 1:30, 3 reps @ 80% rest 1:30, 3 reps @ 80% rest 1:30, 3 reps @ 80% rest 1:30
3. Deadlift 4 sets of 3 reps @ 75%
* No tapping or bouncing weight off floor
rest 1:30
4. a. Dips 3 sets of 8-12 reps
* Cardio "Scary Arms" superset all 3
super set b. BB Bicep Curls 3 sets of 15 reps
* Cardio "Scary Arms" superset all 3
super set c. Bumper Plate Pinch Holds 3 sets
* 20 seconds, Cardio "Scary Arms" superset all 3
rest 1:30 between each super set
Recovery: Steak and Eggs · 30 min Walk · 8+ hrs of Deep sleep`;

export const S12_DAY1_CARD = `SQUATOBER
SEASON TWELVE

"DEEP End Diving"

Day: 1                    Thursday 10-1-26

Warm Up: Trunk Twists and Crack the Knuckles

1. BACK SQUAT 5 reps 60%, 65%, 70%
   • 9 total sets      3 reps 73%, 75%, 78%
   • 27 total reps
   * 2 min rest between  1 rep 82%, 85%, 87%
   each set

2. BENCH PRESS
   3 reps 70%, 75%, 80%, 80%, 80%
   * 90 seconds rest between sets

3. DEAD lift  4 sets of 3 reps 75%
   * 90 sec rest between sets
   * No tapping or Bouncing weight off floor

Cardio    "Scary Arms"
super
set    • Dips  3 sets of 8-12 reps
all 3   • BB Bicep Curls 3 sets of 15 reps
        • Bumper Plate Pinch Holds
                3 sets of 20 seconds
   * 90 sec rest between sets

Recovery    • STEAK and Eggs
            • 30 min Walk
            • 8+ hrs of DEEP sleep

When in doubt, SQUAT it out!`;

export const S12_DAY1_CARD_TIDY_1 = `"Squatober Season Twelve: Deep End Diving"
Warm up: Trunk Twists and Crack the Knuckles
1. Back Squat 5 reps @ 60%, 5 reps @ 65%, 5 reps @ 70%, 3 reps @ 73%, 3 reps @ 75%, 3 reps @ 78%, 1 rep @ 82%, 1 rep @ 85%, 1 rep @ 87%
* 9 total sets, 27 total reps
rest 2:00
2. Bench Press 3 reps @ 70%, 3 reps @ 75%, 3 reps @ 80%, 3 reps @ 80%, 3 reps @ 80%
rest 1:30
3. Deadlift 4 sets of 3 reps @ 75%
* No tapping or bouncing weight off floor
rest 1:30
Cardio: "Scary Arms"
4. a. Dips 3 sets of 8-12 reps
super set b. BB Bicep Curls 3 sets of 15 reps
super set c. Bumper Plate Pinch Holds 3 sets
* 20 seconds
rest 1:30 between each super set
Recovery: Steak and Eggs · 30 min Walk · 8+ hrs of deep sleep`;

export const S12_DAY1_CARD_TIDY_2 = `"DEEP End Diving"
Warm up: Trunk Twists and Crack the Knuckles
1. Back Squat 5 reps @ 60%, 5 reps @ 65%, 5 reps @ 70%, 3 reps @ 73%, 3 reps @ 75%, 3 reps @ 78%, 1 rep @ 82%, 1 rep @ 85%, 1 rep @ 87%
rest 2:00
2. Bench Press 3 reps @ 70%, 3 reps @ 75%, 3 reps @ 80%, 3 reps @ 80%, 3 reps @ 80%
rest 1:30
3. Deadlift 4 sets of 3 reps @ 75%
* No tapping or Bouncing weight off floor
rest 1:30
4. a. Dips 3 sets of 8-12 reps
super set b. BB Bicep Curls 3 sets of 15 reps
super set c. Bumper Plate Pinch Holds 3 sets
* 20 seconds
rest 1:30 between each super set
Recovery: Steak and Eggs · 30 min Walk · 8+ hrs of DEEP sleep`;
