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
