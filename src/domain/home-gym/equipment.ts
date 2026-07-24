/**
 * Home Gym — the athlete's owned-equipment profile, and the eligibility resolver every
 * "Home Gym" filter reads.
 *
 * Ported from the design's `forge-homegym.js`. The inventory (32 items / 6 groups), the grouping
 * order, the hints and the deliberate stand-ins (a functional trainer covers cable + light machine,
 * a Smith covers barbell + machine) are preserved exactly. Three things had to change to survive
 * contact with the real 797-exercise catalog:
 *
 *  1. WE STORE IDS, NOT LABELS. The design persists labels to localStorage; we persist to a Postgres
 *     column, where renaming "Leg curl / extension" would silently empty every athlete's gym. Ids are
 *     the stable key; labels are presentation.
 *
 *  2. `cardio` IS ONE CATALOG ID FOR 61 EXERCISES — treadmill, rower, spin bike, pool, trail and
 *     boxing bag all share it. The design's `Treadmill -> [Cardio]` would hand a treadmill owner
 *     "Open-Water Swim" and "Row Erg Sprint". So cardio resolves PER EXERCISE (`EXERCISE_GEAR`).
 *
 *  3. `bodyweight` INCLUDES ~30 RIG-DEPENDENT MOVES — Pull-Up, Muscle-Up, Parallel Bar Dip, Inverted
 *     Row. The design's "Bodyweight is always true" shows "One-Arm Pull-Up" to an athlete who owns
 *     nothing. Those exercises carry an explicit requirement too.
 *
 * A requirement is satisfied by owning ANY ONE of the listed item ids (OR). An empty requirement
 * means nothing beyond a floor is needed. A requirement naming an id that is NOT in the inventory
 * (`pool`, `bicycle`, `punchbag`, `skierg`, `stairmachine`, `sled`, `battlerope`) is real gear this
 * editor deliberately doesn't offer — those exercises are simply never claimed as trainable at home,
 * which is the honest answer rather than a false yes.
 *
 * KNOWN LOOSENESS, inherited from the design on purpose: `Bench` unlocks nothing. Pressing movements
 * don't require it, so a bench-less gym still sees Bench Press. Tightening that needs a per-exercise
 * pass over ~90 pressing movements and a product call, not a regex on "bench|incline|seated".
 */

export interface HomeGymItem {
  id: string;
  label: string;
  hint: string;
  group: HomeGymGroup;
}

export type HomeGymGroup =
  | 'Barbell & rack'
  | 'Free weights'
  | 'Machines & cable'
  | 'Cardio'
  | 'Bodyweight & rigs'
  | 'Bands & accessories';

/** The six groups, in the design's fixed display order. */
export const HOME_GYM_GROUPS: HomeGymGroup[] = [
  'Barbell & rack',
  'Free weights',
  'Machines & cable',
  'Cardio',
  'Bodyweight & rigs',
  'Bands & accessories',
];

/** The canonical inventory — verbatim from `forge-homegym.js`. Bodyweight is implied, never listed. */
export const HOME_GYM_EQUIPMENT: HomeGymItem[] = [
  { id: 'barbell', label: 'Barbell', hint: 'Bar + plates', group: 'Barbell & rack' },
  { id: 'plates', label: 'Weight plates', hint: 'Bumper or iron', group: 'Barbell & rack' },
  { id: 'rack', label: 'Squat rack', hint: 'Rack, stands or cage', group: 'Barbell & rack' },
  { id: 'bench', label: 'Bench', hint: 'Flat / adjustable', group: 'Barbell & rack' },
  { id: 'ezbar', label: 'EZ-curl bar', hint: 'Curl / triceps bar', group: 'Barbell & rack' },
  { id: 'trapbar', label: 'Trap bar', hint: 'Hex / trap bar', group: 'Barbell & rack' },
  { id: 'smith', label: 'Smith machine', hint: 'Guided barbell', group: 'Barbell & rack' },

  { id: 'dumbbells', label: 'Dumbbells', hint: 'Fixed or adjustable', group: 'Free weights' },
  { id: 'kettlebells', label: 'Kettlebells', hint: 'One or a set', group: 'Free weights' },
  { id: 'medball', label: 'Medicine ball', hint: 'Med / slam ball', group: 'Free weights' },
  { id: 'sandbag', label: 'Sandbag', hint: 'Sandbag / bag', group: 'Free weights' },
  { id: 'weightvest', label: 'Weight vest', hint: 'Loaded vest', group: 'Free weights' },

  { id: 'cable', label: 'Cable machine', hint: 'Cable / functional trainer', group: 'Machines & cable' },
  { id: 'latpulldown', label: 'Lat pulldown', hint: 'Pulldown / row station', group: 'Machines & cable' },
  { id: 'legpress', label: 'Leg press', hint: 'Leg press / hack squat', group: 'Machines & cable' },
  { id: 'legmachine', label: 'Leg curl / extension', hint: 'Hamstring / quad machine', group: 'Machines & cable' },

  { id: 'treadmill', label: 'Treadmill', hint: 'Treadmill', group: 'Cardio' },
  { id: 'rower', label: 'Rowing machine', hint: 'Rower / erg', group: 'Cardio' },
  { id: 'bike', label: 'Exercise bike', hint: 'Upright / spin bike', group: 'Cardio' },
  { id: 'airbike', label: 'Air bike', hint: 'Fan / assault bike', group: 'Cardio' },
  { id: 'elliptical', label: 'Elliptical', hint: 'Cross-trainer', group: 'Cardio' },
  { id: 'jumprope', label: 'Jump rope', hint: 'Skipping rope', group: 'Cardio' },

  { id: 'pullup', label: 'Pull-up bar', hint: 'Bar or rig', group: 'Bodyweight & rigs' },
  { id: 'dip', label: 'Dip bars', hint: 'Dip station / parallettes', group: 'Bodyweight & rigs' },
  { id: 'rings', label: 'Gymnastic rings', hint: 'Rings', group: 'Bodyweight & rigs' },
  { id: 'trx', label: 'Suspension trainer', hint: 'TRX / straps', group: 'Bodyweight & rigs' },
  { id: 'plyobox', label: 'Plyo box', hint: 'Jump box', group: 'Bodyweight & rigs' },

  { id: 'bands', label: 'Bands', hint: 'Resistance / tube bands', group: 'Bands & accessories' },
  { id: 'minibands', label: 'Mini bands', hint: 'Glute / loop bands', group: 'Bands & accessories' },
  { id: 'abwheel', label: 'Ab wheel', hint: 'Ab roller', group: 'Bands & accessories' },
  { id: 'foamroller', label: 'Foam roller', hint: 'Recovery roller', group: 'Bands & accessories' },
  { id: 'mat', label: 'Exercise mat', hint: 'Yoga / floor mat', group: 'Bands & accessories' },
];

const VALID_IDS = new Set(HOME_GYM_EQUIPMENT.map((e) => e.id));

/**
 * The onboarding QUICK-PICKER — "a conservative subset of these labels", per the design's own note.
 * Ten items that between them cover most of what a real home gym holds, asked in one short step so a
 * new athlete isn't handed a 32-checkbox form before they've seen their first program.
 *
 * This is deliberately a SEED, not the profile: whatever is picked here is saved as a normal Home Gym
 * and refined in full later. The step's copy has to say so — an athlete who thinks these ten are the
 * whole vocabulary will assume the app simply doesn't know about their trap bar.
 */
export const QUICK_PICK_IDS = [
  'barbell',
  'rack',
  'bench',
  'dumbbells',
  'kettlebells',
  'pullup',
  'cable',
  'bands',
  'treadmill',
  'bike',
] as const;

export const quickPickItems = (): HomeGymItem[] =>
  QUICK_PICK_IDS.map((id) => HOME_GYM_EQUIPMENT.find((e) => e.id === id)).filter((e): e is HomeGymItem => Boolean(e));

export const homeGymItem = (id: string) => HOME_GYM_EQUIPMENT.find((e) => e.id === id);

/** The editor's sections: six groups in order, each with its items. */
export function byGroup(): { group: HomeGymGroup; items: HomeGymItem[] }[] {
  return HOME_GYM_GROUPS.map((group) => ({
    group,
    items: HOME_GYM_EQUIPMENT.filter((e) => e.group === group),
  }));
}

/** Drop anything unknown and de-duplicate — applied on every read AND every write. */
export function sanitize(ids: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  return ids.filter((id) => typeof id === 'string' && VALID_IDS.has(id) && !seen.has(id) && seen.add(id) !== undefined);
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Catalog `equipmentId` -> home-gym item ids that unlock it. The design's `EX_UNLOCK`, widened to
 * our 14 catalog ids. `bodyweight` is absent because it needs nothing; `cardio` is absent because it
 * resolves per exercise below.
 */
export const EQUIP_UNLOCK: Record<string, readonly string[]> = {
  barbell: ['barbell', 'plates', 'rack', 'ezbar', 'trapbar', 'smith'],
  smith_machine: ['smith'],
  dumbbell: ['dumbbells'],
  kettlebell: ['kettlebells'],
  medicine_ball: ['medball'],
  plyo_box: ['plyobox'],
  resistance_band: ['bands', 'minibands'],
  suspension_trainer: ['trx', 'rings'],
  // A functional trainer stands in for cable AND light machine work — the design's call, kept.
  cable: ['cable', 'latpulldown'],
  selectorized_machine: ['legpress', 'legmachine', 'cable', 'latpulldown', 'smith'],
  // Gear the editor doesn't offer: never claimed as trainable at home.
  sled: ['sled'],
  battle_rope: ['battlerope'],
};

/**
 * Per-exercise overrides, for the two catalog ids that lump unlike gear together.
 * Keyed by catalog exercise id; the value replaces the equipment-level requirement entirely.
 */
export const EXERCISE_GEAR: Record<string, readonly string[]> = {
  // ── cardio: needs nothing but ground ──────────────────────────────────────
  'brisk-walk': [], 'easy-run': [], 'fartlek-run': [], hike: [], 'hill-repeats': [],
  'hill-sprint': [], 'interval-run': [], 'long-run': [], 'outdoor-walk': [],
  'progression-run': [], 'recovery-run': [], ruck: [], 'run-walk-intervals': [],
  'shadow-boxing': [], sprint: [], 'stair-climb': [], strides: [], 'tempo-run': [],
  'threshold-run': [], 'track-repeats': [], 'trail-run': [], 'weighted-walk': [],

  // ── cardio: needs a specific machine ──────────────────────────────────────
  'treadmill-run': ['treadmill'], 'treadmill-walk': ['treadmill'], 'treadmill-incline-walk': ['treadmill'],
  'row-erg': ['rower'], 'row-erg-intervals': ['rower'], 'row-erg-sprint': ['rower'],
  'indoor-cycling': ['bike', 'airbike'], 'stationary-bike': ['bike', 'airbike'],
  'recumbent-bike': ['bike'], 'cycling-intervals': ['bike', 'airbike'],
  'cycling-sprints': ['bike', 'airbike'], 'endurance-ride': ['bike'],
  'hill-climb-ride': ['bike'], 'recovery-ride': ['bike'], 'tempo-ride': ['bike'],
  'threshold-ride': ['bike'],
  'air-bike': ['airbike'], 'air-bike-intervals': ['airbike'],
  elliptical: ['elliptical'], 'elliptical-intervals': ['elliptical'], 'arc-trainer': ['elliptical'],
  'jump-rope': ['jumprope'], 'jump-rope-intervals': ['jumprope'], 'double-under': ['jumprope'],

  // ── cardio: gear the editor doesn't offer ─────────────────────────────────
  'stair-climber': ['stairmachine'], stepmill: ['stairmachine'],
  'ski-erg': ['skierg'], 'ski-erg-intervals': ['skierg'],
  'road-cycling': ['bicycle'], 'mountain-biking': ['bicycle'],
  'heavy-bag-boxing': ['punchbag'], 'kickboxing-bag-work': ['punchbag'], 'boxing-mitt-work': ['punchbag'],
  'open-water-swim': ['pool'], 'pool-intervals': ['pool'], 'swimming-backstroke': ['pool'],
  'swimming-breaststroke': ['pool'], 'swimming-butterfly': ['pool'], 'swimming-freestyle': ['pool'],

  // ── bodyweight that needs something to hang from ──────────────────────────
  'pull-up': ['pullup'], 'chin-up': ['pullup'], 'wide-grip-pull-up': ['pullup'],
  'neutral-grip-pull-up': ['pullup'], 'chest-to-bar-pull-up': ['pullup'],
  'commando-pull-up': ['pullup'], 'archer-pull-up': ['pullup'], 'negative-pull-up': ['pullup'],
  'scapular-pull-up': ['pullup'], 'one-arm-pull-up': ['pullup'], 'assisted-pull-up': ['pullup'],
  'straight-bar-dip': ['pullup', 'dip'],
  'active-hang': ['pullup', 'rings'], 'dead-hang': ['pullup', 'rings'],
  'dead-hang-mobility': ['pullup', 'rings'], 'hanging-knee-raise': ['pullup', 'rings'],
  'hanging-leg-raise': ['pullup', 'rings'],
  'bar-muscle-up': ['pullup'], 'muscle-up': ['pullup', 'rings'],
  'back-lever-hold': ['pullup', 'rings'], 'front-lever-hold': ['pullup', 'rings'],
  'front-lever-row': ['pullup', 'rings'],
  'parallel-bar-dip': ['dip'],
  'ring-muscle-up': ['rings'], 'ring-push-up': ['rings'],
  // An inverted row needs a bar at hip height, straps or rings — several ways in.
  'inverted-row': ['rack', 'pullup', 'trx', 'rings'],
  'underhand-inverted-row': ['rack', 'pullup', 'trx', 'rings'],
  'feet-elevated-inverted-row': ['rack', 'pullup', 'trx', 'rings'],
  'bodyweight-row': ['rack', 'pullup', 'trx', 'rings'],
};

/** What an exercise needs: the per-exercise override if there is one, else its equipment's unlock. */
export function requirementFor(ex: { key: string; equipId: string }): readonly string[] {
  const override = EXERCISE_GEAR[ex.key];
  if (override) return override;
  return EQUIP_UNLOCK[ex.equipId] ?? [];
}

/** Can this exercise be trained with what the athlete owns? Nothing required = always yes. */
export function canDoExercise(ex: { key: string; equipId: string }, owned: readonly string[]): boolean {
  const req = requirementFor(ex);
  if (req.length === 0) return true;
  return req.some((id) => owned.includes(id));
}

/**
 * Program eligibility — lenient by design: a program fits if it needs nothing, or nothing is
 * missing, or at most ONE piece is missing AND the athlete already owns at least one required
 * piece (a genuine minor swap). A program whose gear the athlete owns none of never fits.
 * Kept intentionally loose per the design note; tightening it is a product decision.
 */
export const PROGRAM_REQ: Record<string, readonly string[] | 'always'> = {
  Barbell: ['barbell', 'plates', 'rack', 'smith'],
  Rack: ['rack'],
  Dumbbells: ['dumbbells'],
  Machines: ['cable', 'latpulldown', 'legpress', 'legmachine', 'smith'],
  Cables: ['cable', 'latpulldown'],
  Kettlebell: ['kettlebells'],
  Kettlebells: ['kettlebells'],
  Band: ['bands', 'minibands'],
  Bands: ['bands', 'minibands'],
  Rower: ['rower'],
  Bike: ['bike', 'airbike'],
  Mat: 'always',
  Bodyweight: 'always',
  'Running shoes': 'always',
  Track: 'always',
};

export interface ProgramFit {
  fits: boolean;
  owned: number;
  missing: string[];
}

export function programFit(equipment: readonly string[], owned: readonly string[]): ProgramFit {
  const missing: string[] = [];
  let realReq = 0;
  let haveCount = 0;

  for (const tag of equipment) {
    const req = PROGRAM_REQ[tag];
    if (req === 'always' || !req) continue; // unknown or no-gear tags never block
    realReq++;
    if (req.some((id) => owned.includes(id))) haveCount++;
    else missing.push(tag);
  }

  const fits = realReq === 0 || missing.length === 0 || (missing.length <= 1 && haveCount >= 1);
  return { fits, owned: realReq - missing.length, missing };
}

export interface GymCoverage {
  total: number;
  doable: number;
  /** Distinct exercise names the athlete has no gear for, in first-prescribed order. */
  missing: string[];
}

/**
 * How much of a program the athlete can actually train, derived from the exercises it really
 * prescribes rather than an authored equipment tag (our programs carry none, and a derived answer
 * can't drift from the content the way a hand-written tag does).
 *
 * De-duplicated by exercise: a squat prescribed on three days is one movement you can or can't do,
 * not three. Exercises with no resolvable catalog key are skipped rather than guessed at — an unknown
 * movement is not evidence of a missing rack.
 */
export function programCoverage(
  exercises: readonly { key: string; equipId: string; name: string }[],
  owned: readonly string[],
): GymCoverage {
  const seen = new Set<string>();
  const missing: string[] = [];
  let total = 0;
  let doable = 0;

  for (const ex of exercises) {
    if (!ex.key || seen.has(ex.key)) continue;
    seen.add(ex.key);
    total++;
    if (canDoExercise(ex, owned)) doable++;
    else missing.push(ex.name);
  }

  return { total, doable, missing };
}

/** The commit bar's live summary. */
export const ownedSummary = (n: number) =>
  n === 0 ? 'Nothing added yet — bodyweight only' : `${n} item${n === 1 ? '' : 's'} in your gym`;
