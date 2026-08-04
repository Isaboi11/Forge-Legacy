/**
 * Written name → catalogue id, decided by hand.
 *
 * ══ WHY THIS EXISTS AT ALL ══
 *
 * `matchExercise` ABSTAINS on a tie, and it is right to. "Barbell Squat" is a subset of Barbell Back
 * Squat, Barbell Front Squat and Barbell Box Squat alike, and a matcher that broke that tie by picking
 * the shortest name would eventually tell somebody they front-squatted when they back-squatted. So it
 * returns nothing and a person decides. This file is that person deciding, in a form that can be read
 * and argued with, which a fuzzy score cannot.
 *
 * ══ WHAT IS DELIBERATELY ABSENT ══
 *
 * Anything whose EQUIPMENT would change, and anything genuinely novel. "90/90 DB external rotation" is
 * not `cable-external-rotation`; "Half Kneeling KB High to Low chop" is not the cable wood chop; the
 * Wall Ball combinations and the three-part complexes ("Reverse Lunge, Hammer Curl, Press") are not in a
 * catalogue of single movements and should not be forced into one. They stay unmatched and train fine —
 * they simply have no detail page, which is the honest outcome. A wrong link is worse: it is invisible,
 * it drives the equipment list and the substitution graph, and nobody ever goes back to check it.
 */

export const ALIASES = {
  // ── warm-ups ──
  'Banded Pull Aparts': 'band-pull-apart',
  'Light DB shoulder press': 'dumbbell-overhead-press',
  'Light Bent Over DB Row': 'dumbbell-bent-over-row',
  '90/90 Stretch': '90-90-hip-stretch',
  'DB Reverse Lunge': 'dumbbell-reverse-lunge',
  'DB Squat': 'dumbbell-goblet-squat',
  'DB Staggered-Stance Rom deadlift': 'dumbbell-romanian-deadlift',
  'Worlds Greatest Stretch': 'world-s-greatest-stretch',

  // ── presses ──
  'Bench Press': 'barbell-bench-press',
  'Bench Press - Max Effort': 'barbell-bench-press',
  'Incline Bench Press': 'barbell-incline-bench-press',
  'DB Chest Press': 'dumbbell-bench-press',
  'Barbell Standing Military Press': 'barbell-overhead-press',
  'Seated DB Shoulder Press': 'seated-dumbbell-shoulder-press',
  'Seated DB Shoulder Press w/ 3 Sec Negative': 'seated-dumbbell-shoulder-press',
  'Dips': 'parallel-bar-dip',
  'Dips w/ 3 Sec Negatives': 'parallel-bar-dip',
  'Push Ups': 'push-up',

  // ── shoulders / arms ──
  'Bent Arm DB Lateral Raise': 'dumbbell-lateral-raise',
  'Alt DB Front Raise': 'dumbbell-front-raise',
  'Side Rear Delt Fly Machine': 'machine-rear-delt-fly',
  'Inclined DB Reverse Fly': 'incline-dumbbell-rear-delt-fly',
  'EZ-Bar Upright Row': 'barbell-upright-row',
  // The EZ-bar is a barbell variant, and the catalogue holds no EZ-bar entries of its own.
  'EZ-Bar Skull Crushers': 'barbell-skull-crusher',
  'EZ-Bar Preacher Curls': 'barbell-preacher-curl',
  'Cable Rope Tricep Extension': 'cable-rope-pushdown',
  'Cable Rope Face Pulls': 'cable-face-pull',
  'Cable Curls': 'cable-biceps-curl',
  'Incline DB Curls': 'dumbbell-incline-curl',
  'DB Hammer Curls': 'dumbbell-hammer-curl',

  // ── chest ──
  'Low to High Cable Chest Fly': 'low-to-high-cable-fly',
  'Incline DB Chest Fly': 'dumbbell-incline-chest-fly',

  // ── back ──
  'Overhand Grip Barbell Row': 'barbell-bent-over-row',
  'Plate Loaded Low Row': 'machine-low-row',
  'Cable Straight Arm Pulldown': 'straight-arm-cable-pulldown',
  // Grip variants of one machine movement; the catalogue does not split pulldowns by grip.
  'Overhand Grip Lat Pulldown': 'cable-lat-pulldown',
  'Reverse Grip Lat Pulldown': 'cable-lat-pulldown',
  'V-Bar Seated Cable Row': 'cable-seated-row',
  'Neutral Grip Seated Cable Row': 'cable-seated-row',
  'Neutral Grip Pull Ups': 'neutral-grip-pull-up',
  'Pull Ups': 'pull-up',
  'DB Plank Row': 'dumbbell-renegade-row',
  'DB Renegade Rows': 'dumbbell-renegade-row',

  // ── lower ──
  'Barbell Squat': 'barbell-back-squat',
  'Barbell Squat - Max Effort': 'barbell-back-squat',
  'Conventional Deadlift': 'barbell-deadlift',
  'Romanian Deadlift': 'barbell-romanian-deadlift',
  'Heel Elevated DB Front Squat': 'dumbbell-front-squat',
  'DB Bulgarian Split Squat': 'dumbbell-bulgarian-split-squat',
  'Machine Leg Extensions': 'leg-extension-machine',
  'Lying Hamstring Curl Machine': 'lying-leg-curl-machine',
  'Single Leg Press': 'single-leg-leg-press',
  'DB Box Step Ups': 'dumbbell-step-up',
  'KB/DB Curtsy Lunge': 'dumbbell-curtsy-lunge',
  'DB Walking Lunges': 'dumbbell-walking-lunge',
  'No Weight Walking Lunges': 'walking-lunge',
  '45° Back Extension': 'back-extension',
  'Calf raise': 'calf-raise',
  'Standing DB Calf Raise': 'dumbbell-calf-raise',
  'KB Goblet Squat': 'kettlebell-goblet-squat',

  // ── conditioning / core ──
  'Sled Push': 'sled-push',
  'Sled Pull': 'backward-sled-drag',
  'Sprint Sled Push': 'light-sled-sprint',
  'Assault Bike': 'air-bike',
  'Max Effort Assault Bike': 'air-bike',
  'KB Swing': 'kettlebell-swing',
  'Alt Arm KB Swing': 'single-arm-kettlebell-swing',
  'Single Arm DB Snatch': 'single-arm-dumbbell-snatch',
  'Alt Single Arm DB Snatch': 'single-arm-dumbbell-snatch',
  'DB Thrusters': 'dumbbell-thruster',
  'Wall Balls': 'medicine-ball-wall-ball',
  'Ball Slams': 'medicine-ball-slam',
  'Kneeling Med Ball Slam': 'medicine-ball-slam',
  'DB Suitcase Carry': 'dumbbell-suitcase-carry',
  'Box Jumps': 'box-jump',
  'Burpees': 'burpee',
  'V Ups': 'v-up',
  'Reverse Crunches': 'reverse-crunch',
  'Alt DB Sit Ups': 'sit-up',
  'Hanging Knee Raise': 'hanging-knee-raise',
  'Hanging Knee Raise - CORE': 'hanging-knee-raise',
  'KB Russian Twists': 'kettlebell-russian-twist',
};
