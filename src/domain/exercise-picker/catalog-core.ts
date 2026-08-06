/**
 * Exercise Picker catalog — the pure mapping from the authoritative 794-exercise dataset onto the
 * browse/filter vocabulary the Picker renders. Kept free of JSON imports so it runs under `node --test`
 * (the JSON is wired in `data.ts`, following the `active-program-core` / `active-program` split).
 *
 * WHY A MAPPING EXISTS AT ALL: `Exercise-Library-Architecture-v1.0` (LOCKED, EL-D3) makes the 6-value
 * `ExerciseCategory` the browse taxonomy and says `MovementPattern` is "internal only" — but `category`
 * is an AUTHORED field and the 794 shipped records don't carry one (the repo's own relationships README
 * calls bridging the two "an editorial follow-up"). So the category is derived here, from the locked
 * doc's own rules, and never written back into the dataset (which is append/annotate-only).
 *
 * Every rule below is traceable to the locked spec, except one flagged judgement call (Neck Isolation).
 */

// ─────────────────────────────────────────────────────────────────────────────
// BROWSE TAXONOMY — the 6 locked categories, in the locked display order
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ══ SEVEN, AND THE SEVENTH IS AN AMENDMENT ══
 *
 * `Exercise-Library-Wireframe-Spec-W21` §5 locks SIX browse categories, and this file previously refused
 * to add one — correctly, at the time: the six are a governed decision about how the 797-exercise
 * catalogue is divided, and bending them to fit code would be amending an architecture from the wrong end.
 *
 * CARDIO does not divide that catalogue. It divides nothing: no exercise in `exercises.json` is ever
 * assigned to it, `categoryFor` cannot return it (it falls back to FULL_BODY), and `PICKER_DB` is
 * untouched — the invariant that the catalogue comes wholly from `exercises.json`, name-sorted, still
 * holds and is still tested. It is a seventh DOOR onto conditioning, which until now was reachable only
 * by scrolling past every lift or by searching a word you had to already know.
 *
 * PO decision, 2026-08-02: cardio gets a category you can tap into. Recorded here because the spec says
 * six, and a build that quietly says seven without saying why is how a locked document becomes fiction.
 */
export type ExerciseCategoryKey = 'PUSH' | 'PULL' | 'LEGS_AND_GLUTES' | 'CORE' | 'FULL_BODY' | 'MOBILITY' | 'CARDIO';

/** Fixed order per `Exercise-Library-Wireframe-Spec-W21` §5 + W-23 §9.1. */
export const EXERCISE_CATEGORIES: { key: ExerciseCategoryKey; label: string }[] = [
  { key: 'PUSH', label: 'Push (Upper Body)' },
  { key: 'PULL', label: 'Pull (Upper Body)' },
  { key: 'LEGS_AND_GLUTES', label: 'Legs & Glutes' },
  { key: 'CORE', label: 'Core & Stability' },
  { key: 'FULL_BODY', label: 'Carry & Full Body' },
  { key: 'MOBILITY', label: 'Mobility & Flexibility' },
  // Last, and sourced from CARDIO_ACTIVITIES rather than the catalogue — see the type doc above.
  { key: 'CARDIO', label: 'Cardio & Conditioning' },
];

/**
 * movementPattern → category. Sources for each decision:
 *  · Push/Pull splits          — arch §3.3 (pressing vs pulling primary movers)
 *  · Elbow Flexion → PULL,
 *    Elbow Extension → PUSH    — arch §3.3 ("bicep primary movers" / "tricep primary movers")
 *  · Squat/Hinge/Hip/Calf      — Amendment R1-1 collapsed HINGE into LEGS_AND_GLUTES
 *  · Carry/Cardio/Power        — arch §3.3 "Carry & Full Body"
 *  · Other → FULL_BODY         — DATA-DERIVED, not a guess: all 34 `Other` records carry primary
 *                                muscle `full_body` (levers, muscle-ups, get-ups, sled drags)
 *  · Neck Isolation → CORE     — ⚠ THE ONE JUDGEMENT CALL. 3 machine flexion/extension movements with
 *                                primary muscle `neck`; the 6 locked categories have no neck home, and
 *                                "Core & Stability" is the closest mechanical fit. Revisit if the
 *                                editorial pass assigns them elsewhere.
 */
const PATTERN_CATEGORY: Record<string, ExerciseCategoryKey> = {
  'Horizontal Push': 'PUSH',
  'Vertical Push': 'PUSH',
  'Elbow Extension': 'PUSH',
  'Horizontal Pull': 'PULL',
  'Vertical Pull': 'PULL',
  'Elbow Flexion': 'PULL',
  'Squat / Knee Dominant': 'LEGS_AND_GLUTES',
  'Hinge / Hip Dominant': 'LEGS_AND_GLUTES',
  'Hip Isolation': 'LEGS_AND_GLUTES',
  'Calf / Ankle': 'LEGS_AND_GLUTES',
  Core: 'CORE',
  'Neck Isolation': 'CORE',
  Mobility: 'MOBILITY',
  Carry: 'FULL_BODY',
  'Cardio / Locomotion': 'FULL_BODY',
  'Power / Plyometric': 'FULL_BODY',
  Other: 'FULL_BODY',
};

/**
 * `Shoulder Isolation` (21) is the one pattern that spans both upper-body categories, so it resolves on
 * the primary mover rather than the pattern — the locked §3.4 tiebreaker ("the musculature doing the most
 * work"). Rear delts and traps pull; lateral and front delts press.
 */
const PULLING_SHOULDER = new Set(['rear_deltoids', 'traps']);

export function categoryFor(pattern: string, primaryMuscleIds: readonly string[]): ExerciseCategoryKey {
  if (pattern === 'Shoulder Isolation') {
    return primaryMuscleIds.some((m) => PULLING_SHOULDER.has(m)) ? 'PULL' : 'PUSH';
  }
  return PATTERN_CATEGORY[pattern] ?? 'FULL_BODY';
}

// ─────────────────────────────────────────────────────────────────────────────
// VOCABULARIES — taken from the dataset itself, never invented
// ─────────────────────────────────────────────────────────────────────────────

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export const DIFFS: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

/** `equipment.json`'s own `category` — all six of them — also what picks the row glyph. */
export type EquipClass = 'Free Weight' | 'Machine' | 'Bodyweight' | 'Accessory' | 'Conditioning' | 'Cardio';

/** Filter display order: the gym's own hierarchy, heaviest to lightest. */
export const EQUIP_CLASS_ORDER: EquipClass[] = [
  'Free Weight',
  'Machine',
  'Bodyweight',
  'Accessory',
  'Conditioning',
  'Cardio',
];

/**
 * `muscles.json` marks these `region: 'System'` and `schema.ts` calls them "descriptors, not anatomical
 * muscles". They stay on the item (a row may legitimately read "Full Body") but are kept out of the
 * muscle filter, which is a body-part chooser.
 */
export const SYSTEM_MUSCLE_IDS = new Set(['full_body', 'cardiovascular', 'grip', 'mobility', 'balance']);

/** Anatomical regions, in head-to-toe reading order, for grouping the muscle filter chips. */
export const MUSCLE_REGIONS = ['Upper Body', 'Core', 'Lower Body'] as const;

export interface RawExercise {
  id: string;
  name: string;
  aliases?: string[];
  family: string;
  equipmentId: string;
  movementPattern: string;
  difficulty: string;
  modality: string;
}
export interface RawMuscleLink {
  exerciseId: string;
  muscleId: string;
  role: string;
  displayOrder: number;
}
export interface RawMuscle {
  id: string;
  name: string;
  region: string;
}
export interface RawEquipment {
  id: string;
  name: string;
  category: string;
  /** Where this equipment is realistically available — drives the Library's "where you train" filter. */
  environments?: string[];
}

/** Training environments, widest first. Taken from `equipment.json`, not invented. */
export const ENVIRONMENTS = ['Commercial Gym', 'Home Gym', 'Hotel Gym', 'Outdoors'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export interface PickerItem {
  key: string; // the catalog id — also the ProgramExercise.catalogKey written on save
  name: string;
  cat: ExerciseCategoryKey;
  equipId: string;
  equip: string; // display name, e.g. "Cable Machine"
  equipClass: EquipClass;
  muscleIds: string[]; // primary first, then secondary
  muscles: string[]; // display names, same order
  primaryMuscleIds: string[];
  difficulty: Difficulty;
  pattern: string;
  modality: string;
  aliases: string[];
  /** Environments this exercise can be trained in, via its equipment. */
  environments: string[];
}

const asDifficulty = (v: string): Difficulty =>
  v === 'Beginner' || v === 'Advanced' || v === 'Intermediate' ? v : 'Intermediate';

const asEquipClass = (v: string): EquipClass =>
  (EQUIP_CLASS_ORDER as string[]).includes(v) ? (v as EquipClass) : 'Accessory';

/**
 * Exercises withheld from the app — hidden from browse, search, alternatives and detail.
 *
 * Advanced gymnastics skills (PO decision): rings and lever work is a different sport with its own
 * progressions, and offering a Planche Hold beside a leg extension implies this app can coach it. It
 * cannot, and the generated coaching for these was generic enough to be dangerous.
 *
 * This is a PRESENTATION filter, deliberately not a deletion from `exercises.json`: that file is the
 * authoritative catalog, 63 relationship edges point at these ids, and any athlete who already logged
 * one would lose the record of what they trained. Hiding is reversible; deleting history is not.
 */
export const HIDDEN_EXERCISE_IDS: ReadonlySet<string> = new Set([
  // ─────────────────────────────────────────────────────────────────────────
  // CARDIO ACTIVITIES THE CONDITIONING SYSTEM ALREADY OWNS (49)
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Not clutter — a TRAP. These rows are ordinary catalogue entries, so picking "Interval Run" here
  // builds three sets of eight reps of a run: no distance, no pace, no time. Only `cardio:run`,
  // `cardio:walk` and their five siblings are recognised as conditioning (`activityFromKey`), and those
  // live in `CARDIO_ACTIVITIES`, reachable from the picker's own "Running & Cardio" section and from
  // Home's Cardio chooser. So the catalogue offered a second, worse way to log the same thing — and the
  // worse one was the easier one to find, because it sat among the 794.
  //
  // HIDDEN, NOT DELETED, for two reasons. `exercises.json` is append/annotate-only by standing rule; and
  // a row that somebody has already logged must keep resolving, or their history loses the name of what
  // they did. Hiding removes it from what is OFFERED and touches nothing that was recorded.
  //
  // ══ WHAT IS DELIBERATELY KEPT (12) ══
  //
  // Boxing (heavy bag · mitts · shadow · kickboxing), Jump Rope, Double-Under, Hike, Ruck, Ski Erg ×2
  // and Arc Trainer. None of the seven conditioning activities covers them, so hiding these would
  // remove the capability rather than de-duplicate it — there would be no way to log a boxing session
  // at all. They stay until conditioning grows to hold them.
  //
  // Two of the 49 are arguable and went with the group by PO decision: `weighted-walk` and `ruck` are a
  // loaded carry, which is a strength stimulus Cardio's Walk cannot express. Ruck is KEPT; Weighted Walk
  // is hidden, because "Walk" plus a weight is the thing Cardio already asks you to describe.
  // Run — the Cardio activity measures a run in distance, pace and time; these measure it in sets.
  'easy-run',
  'fartlek-run',
  'hill-repeats',
  'hill-sprint',
  'interval-run',
  'long-run',
  'progression-run',
  'recovery-run',
  'sprint',
  'strides',
  'tempo-run',
  'threshold-run',
  'track-repeats',
  'trail-run',
  'treadmill-run',
  // Walk
  'brisk-walk',
  'outdoor-walk',
  'run-walk-intervals',
  'treadmill-incline-walk',
  'treadmill-walk',
  'weighted-walk',
  // Ride
  'air-bike',
  'air-bike-intervals',
  'cycling-intervals',
  'cycling-sprints',
  'endurance-ride',
  'hill-climb-ride',
  'indoor-cycling',
  'mountain-biking',
  'recovery-ride',
  'recumbent-bike',
  'road-cycling',
  'stationary-bike',
  'tempo-ride',
  'threshold-ride',
  // Row
  'row-erg',
  'row-erg-intervals',
  'row-erg-sprint',
  // Elliptical
  'elliptical',
  'elliptical-intervals',
  // Stair
  'stair-climb',
  'stair-climber',
  'stepmill',
  // Swim
  'open-water-swim',
  'pool-intervals',
  'swimming-backstroke',
  'swimming-breaststroke',
  'swimming-butterfly',
  'swimming-freestyle',

  // ── Competition strongman: implements a commercial gym doesn't stock (PO decision) ──
  // NOT decided from `equipment.environments` — 23 of the 24 strongman movements are tagged
  // "Sled / Prowler", a catch-all bucket for odd objects, so that field reports Commercial Gym even for
  // an atlas stone. This is an editorial split on the implement itself.
  //
  // KEPT (sleds, prowlers and rope pulls are standard on commercial gym turf, as are sandbag carries,
  // squats and lunges in a functional area): sled-push, heavy-sled-push, forward/backward/lateral-sled-drag,
  // cable-sled-drag, sled-rope-pull, hand-over-hand-rope-pull, sandbag-bear-hug-carry,
  // sandbag-front-carry, sandbag-shoulder-carry, sandbag-squat, sandbag-lunge.
  'atlas-stone-lift',
  'atlas-stone-load',
  'keg-carry',
  'keg-load',
  'keg-press',
  'tire-flip',
  'viking-press',
  'yoke-carry',
  // Competition sandbag movements — loading to a platform or throwing over a bar needs equipment and
  // space a normal gym floor doesn't have, unlike simply carrying or squatting a bag.
  'sandbag-ground-to-shoulder',
  'sandbag-load-to-platform',
  'sandbag-over-shoulder-throw',

  // ── Advanced gymnastics: a different sport with its own progressions ──
  'back-lever-hold',
  'bar-muscle-up',
  'front-lever-hold',
  'front-lever-row',
  'handstand-hold',
  'handstand-push-up',
  'handstand-walk',
  'muscle-up',
  'planche-hold',
  'planche-lean',
  'pseudo-planche-push-up',
  'ring-muscle-up',
  'skin-the-cat',
  'wall-handstand-push-up',

  // ─────────────────────────────────────────────────────────────────────────
  // ONE LIFT FILED TWICE (1)
  // ─────────────────────────────────────────────────────────────────────────
  //
  // `cable-reverse-fly` and `cable-rear-delt-fly` are the same exercise. Same equipment (`cable`),
  // same movement pattern (Horizontal Push), same difficulty, same primary muscle (`rear_deltoids`).
  // They differ in one authored string — `family`, "Reverse Fly" against "Rear Delt Fly" — and in
  // nothing an athlete could see or feel. They even name each other as rank-1 substitutes, which is
  // the graph saying, in its own vocabulary, that they are interchangeable.
  //
  // Two rows for one lift is worse than clutter, and worse in a way the picker does not show: pick
  // one on Monday and the other on Thursday and the same movement holds two separate histories, so
  // neither is the truth about what this athlete presses. `personal_records` is keyed by display
  // name, so it splits too.
  //
  // KEPT: `cable-rear-delt-fly`. Its name matches the four siblings (Band · Dumbbell · Machine ·
  // Incline Dumbbell Rear Delt Fly), and it carries three coaching entries to the other's one.
  //
  // HIDDEN, NOT DELETED — 65 references across 6 files point at these two ids (38 relationship
  // edges, 6 muscle links, 4 coaching entries, 2 manifest lines), plus `catalog_key` values already
  // written into `workout_exercises` and `exercise_favorites`, neither of which is a foreign key.
  // Deleting the row would leave every one of those resolving to nothing, silently. The vernacular
  // alias `cable reverse fly` (see `aliases.ts`) points the old name at the kept row, so an athlete
  // who logged it still reaches a real exercise.
  //
  // ── ONE LIFT FILED TWICE (2) ──
  //
  // `jump-squat` ("Jump Squat") and `squat-jump` ("Squat Jump") are the same movement under the same
  // two words in the other order, same pattern and same difficulty. PO ruling 2026-08-05: Jump Squat
  // lives.
  //
  // They disagree on ONE field — `jump-squat` is `bodyweight`, `squat-jump` is `plyo_box` — and that
  // is not a real distinction. Every row in the plyometrics family carries `plyo_box`, including
  // Bounding, Broad Jump and Pogo Jump, none of which touch a box. It is a family default, not
  // equipment, so it does not describe two exercises.
  'squat-jump',

  // ⚠ THE MEDIA IS A SEPARATE, MANUAL STEP. Demo URLs are DERIVED from the id with no manifest, so
  // hiding a row does not move its animation. The PO preferred `cable-reverse-fly`'s loop, and it
  // must be copied over `cable-rear-delt-fly`'s in FOUR places in the `exercise-media` bucket:
  // `male/`, `female/`, `poster/male/`, `poster/female/`. Until that is done the kept row keeps its
  // own, which is a worse animation but never a broken one.
  'cable-reverse-fly',
]);

/** Join the four source tables into the flat, name-sorted list the Picker renders. */
export function buildPickerDb(src: {
  exercises: readonly RawExercise[];
  exerciseMuscles: readonly RawMuscleLink[];
  muscles: readonly RawMuscle[];
  equipment: readonly RawEquipment[];
}): PickerItem[] {
  const muscleById = new Map(src.muscles.map((m) => [m.id, m]));
  const equipById = new Map(src.equipment.map((e) => [e.id, e]));

  // Primary muscles first, then secondary; each group in authored displayOrder.
  const linksFor = new Map<string, RawMuscleLink[]>();
  for (const l of src.exerciseMuscles) {
    const list = linksFor.get(l.exerciseId);
    if (list) list.push(l);
    else linksFor.set(l.exerciseId, [l]);
  }
  const rank = (l: RawMuscleLink) => (l.role === 'Primary' ? 0 : 1);

  return src.exercises
    .filter((e) => !HIDDEN_EXERCISE_IDS.has(e.id))
    .map((e) => {
      const links = (linksFor.get(e.id) ?? [])
        .slice()
        .sort((a, b) => rank(a) - rank(b) || a.displayOrder - b.displayOrder);
      const muscleIds = links.map((l) => l.muscleId);
      const primaryMuscleIds = links.filter((l) => l.role === 'Primary').map((l) => l.muscleId);
      const eq = equipById.get(e.equipmentId);
      return {
        key: e.id,
        name: e.name,
        cat: categoryFor(e.movementPattern, primaryMuscleIds),
        equipId: e.equipmentId,
        equip: eq?.name ?? e.equipmentId,
        equipClass: asEquipClass(eq?.category ?? ''),
        muscleIds,
        muscles: muscleIds.map((id) => muscleById.get(id)?.name ?? id),
        primaryMuscleIds,
        difficulty: asDifficulty(e.difficulty),
        pattern: e.movementPattern,
        modality: e.modality,
        aliases: e.aliases ?? [],
        environments: eq?.environments ?? [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Muscle filter chips, grouped by anatomical region (System descriptors excluded). */
export function buildMuscleFilterGroups(muscles: readonly RawMuscle[]): { region: string; muscles: RawMuscle[] }[] {
  return MUSCLE_REGIONS.map((region) => ({
    region,
    muscles: muscles.filter((m) => m.region === region && !SYSTEM_MUSCLE_IDS.has(m.id)),
  })).filter((g) => g.muscles.length > 0);
}

/** Equipment filter chips, grouped by the dataset's own equipment category. */
export function buildEquipFilterGroups(equipment: readonly RawEquipment[]): { category: string; equipment: RawEquipment[] }[] {
  const known = new Set<string>(EQUIP_CLASS_ORDER);
  // Anything the dataset adds later still surfaces (appended after the known order) rather than
  // silently vanishing from the filter — the failure mode this function's test was written to catch.
  const extras = [...new Set(equipment.map((e) => e.category))].filter((c) => !known.has(c)).sort();
  return [...EQUIP_CLASS_ORDER, ...extras]
    .map((category) => ({ category, equipment: equipment.filter((e) => e.category === category) }))
    .filter((g) => g.equipment.length > 0);
}
