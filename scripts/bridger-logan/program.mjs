/**
 * "Bridger Logan — 6 Weeks", transcribed from the athlete's own purchased copy.
 *
 * ══ THIS IS PERSONAL DATA, NOT CATALOG CONTENT ══
 *
 * It lives under `scripts/` and is deliberately NOT importable from `src/`. The program is a commercial
 * product the athlete bought; transcribing it for their own training is ordinary use, shipping it as a
 * Forge built-in that every user can adopt is republishing somebody else's paid work. Keeping it out of
 * the app bundle is what makes that distinction structural rather than a promise.
 *
 * The output is one `programs` row (the `ProgramStructure` jsonb in `src/data/programs-live.ts`).
 *
 * ══ SHAPE ══
 *
 * 32 sessions across 6 weeks: six days in weeks 1–2, five thereafter. Week 4 abandons Push/Pull/Legs for
 * Upper/Lower/Athletic — deliberate, not a transcription slip — and week 6 peaks on Max Effort triples.
 */

// ── the DSL ──────────────────────────────────────────────────────────────────

/** A lift with a per-set ladder: `S('Bench Press', [6, 6, 4, 4])`. */
const S = (name, repScheme) => ({ name, repScheme });
/** A lift with one target across N sets. */
const F = (name, sets, reps) => ({ name, repScheme: Array.from({ length: sets }, () => reps) });
/** Work measured by the clock. */
const T = (name, durationSec, sets = 1) => ({ name, durationSec, ...(sets > 1 ? { sets } : null) });
/** A cardio bout prescribed by minutes. */
const CARDIO = (name, activity, min, modality = 'indoor') => ({
  name,
  kind: 'cardio',
  activity,
  modality,
  targetSec: min * 60,
  targetMi: null,
  targetPaceSec: null,
  targetSpdMph: null,
});

let gid = 0;
/** A circuit run `rounds` times. Every member repeats the block metadata — see `ProgramExercise`. */
const CIRCUIT = (groupName, rounds, items) => {
  const groupId = `g${(gid += 1)}`;
  return items.map((i) => ({ ...i, groupId, groupName, groupRounds: rounds }));
};
/** A block bounded by a clock instead of a round count. */
const AMRAP = (groupName, capMin, items) => {
  const groupId = `g${(gid += 1)}`;
  return items.map((i) => ({ ...i, groupId, groupName, groupCapSec: capMin * 60 }));
};
/** An item the athlete owes nothing by skipping. */
const OPT = (item) => ({ ...item, optional: true });

const day = (letter, name, warmup, main, cooldown = []) => ({ letter, name, warmup, main, cooldown });

// ── the three standing warm-ups ──────────────────────────────────────────────

const WU_PUSH = () =>
  CIRCUIT('Warm up muscle group', 2, [
    T('Straight bar stretch', 30),
    T('Banded Pull Aparts', 30),
    T('90/90 DB external rotation', 30),
    T('Light DB shoulder press', 30),
  ]);

const WU_PULL = () =>
  CIRCUIT('Warm up muscle group', 2, [
    T('Straight bar stretch', 30),
    T('Banded Pull Aparts', 30),
    T('90/90 DB external rotation', 30),
    T('Light Bent Over DB Row', 30),
  ]);

const WU_LOWER = () => [
  OPT(CARDIO('Stairmaster', 'stair', 3)),
  ...CIRCUIT('Warmup', 2, [
    T('90/90 Stretch', 30),
    T('DB Reverse Lunge', 30),
    T('DB Squat', 30),
    T('DB Staggered-Stance Rom deadlift', 30),
  ]),
];

/** The recovery block that closes several sessions — a 5- or 10-minute cap, not a round count. */
const STRETCH = (name, capMin) =>
  AMRAP(name, capMin, [T('Worlds Greatest Stretch', 120), T('Straight bar stretch', 120)]);

// ── week 1 ───────────────────────────────────────────────────────────────────

const W1 = [
  day('A', 'PUSH', WU_PUSH(), [
    S('Incline Bench Press', [6, 6, 4, 4]),
    S('EZ-Bar Skull Crushers', [10, 8, 6]),
    S('Barbell Standing Military Press', [6, 6, 4, 4]),
    F('Low to High Cable Chest Fly', 3, 8),
    F('Bent Arm DB Lateral Raise', 3, 8),
    S('Dips', ['F', 'F', 'F']),
    ...CIRCUIT('HIIT finisher', 3, [T('Alt Arm KB Swing', 60), T('Burpees', 30), T('V Ups', 30)]),
  ]),
  day('B', 'PULL', WU_PULL(), [
    S('Overhand Grip Barbell Row', [6, 6, 4, 4]),
    F('Cable Straight Arm Pulldown', 3, 8),
    S('EZ-Bar Preacher Curls', [6, 6, 4, 4]),
    F('V-Bar Seated Cable Row', 4, 6),
    F('Incline DB Curls', 3, 8),
    S('Neutral Grip Pull Ups', ['F', 'F', 'F']),
    CARDIO('Treadmill Run', 'run', 15),
  ]),
  day('C', 'LEGS', WU_LOWER(), [
    S('Barbell Squat', [10, 8, 6, 4]),
    F('Machine Leg Extensions', 3, 8),
    F('Lying Hamstring Curl Machine', 3, 8),
    F('DB Bulgarian Split Squat', 3, 16),
    ...CIRCUIT('Sled Push/Pull', 3, [T('Sled Push', 30), T('Sled Pull', 30)]),
    ...CIRCUIT('HIIT Finisher', 3, [
      { name: 'KB Goblet Squat', reps: 20 },
      { name: 'Jumping Lunges', reps: 20 },
      T('Plank Down Ups', 45),
    ]),
  ]),
  day('D', 'UPPER', WU_PUSH(), [
    S('Bench Press', [10, 8, 6, 4]),
    F('Alt DB Front Raise', 3, 12),
    S('Reverse Grip Lat Pulldown', [10, 8, 6, 4]),
    F('Cable Rope Tricep Extension', 3, 10),
    F('Side Rear Delt Fly Machine', 3, 12),
    S('Push Ups', ['F', 'F', 'F']),
    CARDIO('Row', 'row', 10),
  ]),
  day('E', 'LOWER or RUN', WU_LOWER(), [
    S('Barbell Hip Thrust', [8, 8, 6, 6]),
    S('Conventional Deadlift', [8, 8, 6, 6]),
    F('Heel Elevated DB Front Squat', 3, 10),
    F('DB Staggered-Stance Rom deadlift', 3, 12),
    F('45° Back Extension', 3, 10),
    F('Hanging Knee Raise - CORE', 4, 10),
  ]),
  day('F', 'OPTIONAL FULL BODY HIIT', [], [
    ...AMRAP('AMRAP #1', 8, [
      { name: 'Pulse Squats', reps: 20 },
      { name: 'DB Plank Pull Through', reps: 20 },
      { name: 'DB half burpee row', reps: 10 },
      { name: 'Reverse Lunge, Hammer Curl, Press (Left)' },
    ]),
    ...AMRAP('AMRAP #2', 8, [
      { name: 'Reverse Crunches', reps: 10 },
      { name: 'Narrow Squat, hammer curl, front raise', reps: 10 },
      { name: 'Narrow Stance Snatch', reps: 12 },
      { name: 'Reverse Lunge, Hammer Curl, Press (Right)' },
    ]),
  ]),
];

// ── week 2 ───────────────────────────────────────────────────────────────────

const W2 = [
  day('A', 'PUSH', WU_PUSH(), [
    F('Incline Bench Press', 5, 5),
    F('EZ-Bar Skull Crushers', 3, 10),
    F('Seated DB Shoulder Press w/ 3 Sec Negative', 3, 8),
    F('Low to High Cable Chest Fly', 3, 10),
    S('EZ-Bar Upright Row', [10, 10, 10, 'F']),
    F('Dips w/ 3 Sec Negatives', 3, 10),
    ...CIRCUIT('HIIT FINISHER', 4, [
      { name: 'Burpees', reps: 10 },
      T('DB Suitcase Carry', 30),
      { name: 'V Ups', reps: 15 },
    ]),
  ]),
  day('B', 'PULL', WU_PULL(), [
    F('Plate Loaded Low Row', 4, 8),
    F('Overhand Grip Lat Pulldown', 4, 6),
    F('Cable Straight Arm Pulldown', 3, 12),
    F('Neutral Grip Seated Cable Row', 3, 10),
    ...CIRCUIT('Bicep Circut', 3, [
      { name: 'EZ-Bar Preacher Curls', reps: 8 },
      { name: 'DB Hammer Curls', reps: 10 },
    ]),
    CARDIO('Treadmill Run', 'run', 15),
  ]),
  day('C', 'LEGS', WU_LOWER(), [
    F('Barbell Squat', 5, 5),
    F('DB Bulgarian Split Squat', 3, 16),
    F('Lying Hamstring Curl Machine', 2, 15),
    ...CIRCUIT('Sled Push/Pull', 3, [T('Sled Push', 30), T('Sled Pull', 30)]),
    ...CIRCUIT('Core', 3, [
      { name: 'Half Kneeling KB High to Low chop', reps: 16 },
      { name: 'Alt DB Sit Ups', reps: 12 },
    ]),
  ]),
  day('D', 'UPPER or RUN', WU_PUSH(), [
    F('Bench Press', 4, 6),
    F('Reverse Grip Lat Pulldown', 3, 8),
    F('Cable Rope Face Pulls', 3, 12),
    F('Cable Rope Tricep Extension', 3, 10),
    F('Side Rear Delt Fly Machine', 3, 12),
    S('Push Ups', ['F', 'F']),
    CARDIO('Row - 20 sec hard / 40 sec easy', 'row', 8),
  ]),
  day('E', 'LOWER', WU_LOWER(), [
    F('Conventional Deadlift', 4, 5),
    F('Barbell Hip Thrust', 3, 8),
    F('KB/DB Curtsy Lunge', 3, 16),
    F('45° Back Extension', 2, 15),
    F('Hanging Knee Raise', 4, 10),
  ]),
  day('F', 'OPTIONAL FULL BODY HIIT', [], [
    ...AMRAP('AMRAP #1', 10, [
      { name: 'Wall Ball Burpee', reps: 10 },
      { name: 'Wall Ball Sit Up', reps: 10 },
      { name: 'Wall Ball Alt Jump Lunge', reps: 12 },
      { name: 'Wall Ball Mt Climbers', reps: 20 },
    ]),
    ...AMRAP('AMRAP #2', 10, [
      { name: 'Kneeling Rotational Wall Ball Throw', reps: 12 },
      { name: 'Wall Ball Squat Toss', reps: 15 },
      { name: 'Wall Ball Alt Kneeling Roll Out', reps: 12 },
    ]),
  ]),
];

// ── week 3 ───────────────────────────────────────────────────────────────────

const W3 = [
  day('A', 'PUSH', WU_PUSH(), [
    F('Barbell Standing Military Press', 4, 6),
    F('DB Chest Press', 4, 8),
    F('Incline DB Chest Fly', 3, 12),
    F('Bent Arm DB Lateral Raise', 3, 12),
    F('Alt DB Front Raise', 3, 12),
    F('Hanging Knee Raise', 4, 10),
    CARDIO('Treadmill Run', 'run', 10),
  ]),
  day('B', 'PULL', WU_PULL(), [
    F('Conventional Deadlift', 5, 5),
    F('Plate Loaded Low Row', 4, 8),
    F('Overhand Grip Lat Pulldown', 4, 10),
    ...CIRCUIT('Incline Bench Circuit', 3, [
      { name: 'Inclined DB Reverse Fly', reps: 18 },
      { name: 'Incline DB Curls', reps: 12 },
    ]),
    ...CIRCUIT('AMRAP #1', 4, [
      { name: 'DB Plank Row', reps: 20 },
      { name: 'Single Arm DB Snatch', reps: 20 },
      { name: 'Half Kneeling KB High to Low chop', reps: 20 },
    ]),
  ]),
  day('C', 'LEGS / HITT', WU_LOWER(), [
    F('Single Leg Press', 4, 16),
    ...CIRCUIT('Heavy Sled Push / Pull', 4, [T('Sled Push', 30), T('Sled Pull', 30)]),
    ...CIRCUIT('AMRAP #1', 3, [
      { name: 'Wall Balls', reps: 20 },
      { name: 'DB Deadlift', reps: 12 },
      T('Max Effort Assault Bike', 45),
    ]),
    ...CIRCUIT('AMRAP #2', 3, [
      { name: 'DB Walking Lunges', reps: 20 },
      { name: 'Box Jumps', reps: 20 },
      { name: 'Alt DB Sit Ups', reps: 16 },
    ]),
  ]),
  day('D', 'UPPER', WU_PUSH(), [
    F('Bench Press', 3, 12),
    F('Cable Rope Face Pulls', 3, 12),
    F('EZ-Bar Skull Crushers', 3, 10),
    F('Cable Curls', 3, 15),
    CARDIO('Easy Row', 'row', 5),
  ], STRETCH('Stretch sore areas of body', 5)),
  day('E', 'LOWER', WU_LOWER(), [
    F('Conventional Deadlift', 4, 5),
    F('Barbell Hip Thrust', 3, 8),
    ...CIRCUIT('HIIT', 4, [
      { name: 'Wall Balls', reps: 20 },
      T('Assault Bike', 60),
      { name: 'Ball Slams', reps: 20 },
      T('DB Suitcase Carry', 20),
      { name: 'V Ups', reps: 20 },
    ]),
  ]),
];

// ── week 4 — the split changes ───────────────────────────────────────────────

const W4 = [
  day('A', 'UPPER', WU_PUSH(), [
    F('Barbell Standing Military Press', 4, 5),
    F('Bench Press', 4, 6),
    F('Plate Loaded Low Row', 3, 10),
    F('Cable Straight Arm Pulldown', 4, 8),
    F('Bent Arm DB Lateral Raise', 3, 12),
    F('Hanging Knee Raise', 4, 10),
  ]),
  day('B', 'LOWER', WU_LOWER(), [
    F('Barbell Squat', 5, 5),
    F('Romanian Deadlift', 4, 8),
    F('DB Bulgarian Split Squat', 3, 16),
    F('Lying Hamstring Curl Machine', 3, 12),
    F('Calf raise', 3, 15),
    ...CIRCUIT('Core Finisher', 3, [
      { name: 'Alt DB Sit Ups', reps: 24 },
      { name: 'KB Russian Twists', reps: 24 },
    ]),
  ]),
  day('C', 'ATHLETIC CONDITIONING', [], [
    T('Sprint Sled Push', 20, 5),
    ...CIRCUIT('HIIT CIRCUIT', 4, [
      { name: 'Box Jumps', reps: 12 },
      { name: 'KB Swing', reps: 20 },
      T('Assault Bike', 45),
      { name: 'Kneeling Med Ball Slam', reps: 16 },
    ]),
    S('Pull Ups', ['F', 'F']),
  ], STRETCH('Stretch where you are sore', 10)),
  day('D', 'UPPER PUMP', WU_PUSH(), [
    F('Incline Bench Press', 4, 10),
    F('V-Bar Seated Cable Row', 4, 10),
    F('Cable Rope Face Pulls', 3, 15),
    ...CIRCUIT('Arm pump', 3, [
      { name: 'Cable Curls', reps: 12 },
      { name: 'Cable Rope Tricep Extension', reps: 12 },
    ]),
    CARDIO('Treadmill Run', 'run', 10),
  ], STRETCH('Stretch sore areas of body', 5)),
  day('E', 'ATHLETIC TRAINING', [
    CARDIO('Warm up Row', 'row', 3),
    ...CIRCUIT('Warmup', 2, [
      T('90/90 Stretch', 30),
      T('DB Reverse Lunge', 30),
      { name: 'Banded Pull Aparts', reps: 20 },
      { name: 'Light Bent Over DB Row', reps: 20 },
    ]),
  ], [
    ...AMRAP('AMRAP 25 Min', 25, [
      { name: 'Row', reps: 12 },
      { name: 'Wall Balls', reps: 20 },
      { name: 'Alt Single Arm DB Snatch', reps: 12 },
      { name: 'DB Plank Row', reps: 20 },
      { name: 'No Weight Walking Lunges', reps: 20 },
    ]),
    F('Push Ups', 3, 30),
  ]),
];

// ── week 5 ───────────────────────────────────────────────────────────────────

const W5 = [
  day('A', 'UPPER', WU_PUSH(), [
    F('Bench Press', 5, 5),
    F('EZ-Bar Skull Crushers', 3, 10),
    F('Seated DB Shoulder Press', 4, 10),
    F('Overhand Grip Lat Pulldown', 4, 8),
    F('Side Rear Delt Fly Machine', 3, 20),
    S('Dips', ['F', 'F', 'F']),
    ...CIRCUIT('3 Round Finisher', 3, [
      { name: 'Push Ups', reps: 20 },
      { name: 'Bent Arm DB Lateral Raise', reps: 15 },
      { name: 'V Ups', reps: 25 },
    ]),
  ]),
  day('B', 'PULL', WU_PULL(), [
    F('Overhand Grip Barbell Row', 4, 6),
    F('Overhand Grip Lat Pulldown', 4, 10),
    ...CIRCUIT('Incline Bench and DB workout rotation', 4, [
      { name: 'Inclined DB Reverse Fly', reps: 10 },
      { name: 'Incline DB Curls', reps: 8 },
    ]),
    F('Plate Loaded Low Row', 3, 15),
    ...CIRCUIT('4 Round Finisher', 4, [
      { name: 'DB Renegade Rows', reps: 16 },
      { name: 'KB Swing', reps: 20 },
      { name: 'DB Deadlift', reps: 20 },
    ]),
  ]),
  day('C', 'LEGS', WU_LOWER(), [
    F('Barbell Squat', 5, 5),
    F('DB Box Step Ups', 3, 16),
    F('Romanian Deadlift', 3, 12),
    F('Machine Leg Extensions', 3, 10),
    F('Standing DB Calf Raise', 4, 12),
    ...CIRCUIT('3 Round Finisher', 3, [
      { name: 'Box Jumps', reps: 10 },
      T('Assault Bike', 45),
      { name: 'Wall Balls', reps: 20 },
    ]),
  ]),
  day('D', 'UPPER', WU_PUSH(), [
    F('Incline Bench Press', 4, 12),
    F('Reverse Grip Lat Pulldown', 3, 15),
    F('Cable Rope Face Pulls', 3, 12),
    ...CIRCUIT('Arm Pump', 3, [
      { name: 'Cable Curls', reps: 12 },
      { name: 'Cable Rope Tricep Extension', reps: 12 },
    ]),
    F('Alt DB Front Raise', 3, 16),
    CARDIO('Row - 20 sec hard / 40 sec easy', 'row', 5),
    ...CIRCUIT('Abs of Steel', 3, [
      { name: 'KB Russian Twists', reps: 30 },
      { name: 'Alt DB Sit Ups', reps: 20 },
      { name: 'Half Kneeling KB High to Low chop', reps: 20 },
    ]),
  ]),
  day('E', 'LOWER AND CONDITIONER', WU_LOWER(), [
    F('Conventional Deadlift', 4, 5),
    F('Barbell Hip Thrust', 3, 8),
    ...AMRAP('20 MIN AMRAP', 20, [
      { name: 'DB Thrusters', reps: 10 },
      { name: 'Box Jumps', reps: 15 },
      { name: 'DB Walking Lunges', reps: 20 },
      { name: 'Row', reps: 12 },
      { name: 'V Ups', reps: 15 },
    ]),
  ]),
];

// ── week 6 — the peak ────────────────────────────────────────────────────────

const W6 = [
  day('A', 'PUSH', WU_PUSH(), [
    F('Bench Press - Max Effort', 5, 3),
    F('Incline DB Chest Fly', 3, 12),
    F('Alt DB Front Raise', 3, 20),
    F('Cable Rope Tricep Extension', 4, 10),
    F('Dips', 3, 12),
    ...CIRCUIT('Abs Blaster', 4, [
      { name: 'Hanging Knee Raise', reps: 15 },
      { name: 'Alt DB Sit Ups', reps: 20 },
    ]),
  ]),
  day('B', 'PULL', WU_PULL(), [
    F('Plate Loaded Low Row', 4, 8),
    F('Overhand Grip Lat Pulldown', 4, 10),
    F('Cable Straight Arm Pulldown', 4, 10),
    ...CIRCUIT('Incline Bench Circuit', 3, [
      { name: 'Inclined DB Reverse Fly', reps: 18 },
      { name: 'Incline DB Curls', reps: 12 },
    ]),
    ...CIRCUIT('HIIT FINISHER', 4, [
      { name: 'DB Plank Row', reps: 20 },
      { name: 'Single Arm DB Snatch', reps: 20 },
      { name: 'Half Kneeling KB High to Low chop', reps: 20 },
    ]),
  ]),
  day('C', 'LEGS', WU_LOWER(), [
    F('Barbell Squat - Max Effort', 4, 3),
    F('Machine Leg Extensions', 3, 20),
    F('Lying Hamstring Curl Machine', 3, 20),
    ...CIRCUIT('Heavy Sled Push / Pull', 4, [T('Sled Push', 30), T('Sled Pull', 30)]),
    F('Standing DB Calf Raise', 3, 15),
  ]),
  day('D', 'UPPER', WU_PUSH(), [
    F('Barbell Standing Military Press', 4, 3),
    F('Cable Rope Face Pulls', 3, 12),
    F('EZ-Bar Preacher Curls', 4, 8),
    F('EZ-Bar Skull Crushers', 3, 10),
    CARDIO('Easy Row', 'row', 5),
  ], STRETCH('Stretch sore areas of body', 5)),
  day('E', 'LOWER', WU_LOWER(), [
    F('Conventional Deadlift', 5, 5),
    F('Barbell Hip Thrust', 4, 8),
    ...CIRCUIT('HIIT', 4, [
      { name: 'Wall Balls', reps: 20 },
      T('Assault Bike', 60),
      { name: 'Ball Slams', reps: 20 },
      T('DB Suitcase Carry', 20),
      { name: 'V Ups', reps: 20 },
    ]),
  ]),
];

export const WEEKS = [W1, W2, W3, W4, W5, W6];

/** The `ProgramStructure` that goes into the `programs` row. */
export const STRUCTURE = {
  name: 'Bridger Logan — 6 Weeks',
  weeks: 6,
  // The headline figure. Weeks 3-6 run five days; `weekSizes` reads each week for itself.
  daysPerWeek: 6,
  vary: true,
  days: W1,
  weekPlans: WEEKS.map((days) => ({ days })),
};
