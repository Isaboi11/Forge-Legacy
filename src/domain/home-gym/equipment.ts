/**
 * Home Gym — the athlete's owned-equipment profile, and the eligibility resolver every
 * "Home Gym" filter reads.
 *
 * Ported from the design's `forge-homegym.js`. The inventory (32 items / 6 groups), the grouping
 * order, the hints and the deliberate stand-ins (a functional trainer covers cable + light machine,
 * a Smith covers barbell + machine) are preserved exactly. Three things had to change to survive
 * contact with the real 809-exercise catalog:
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
 * ══ THE BENCH, AND WHY THIS FILE NEEDED AN "AND" (2026-08-06) ══
 *
 * This header used to read: "KNOWN LOOSENESS, inherited from the design on purpose: `Bench` unlocks
 * nothing. Pressing movements don't require it, so a bench-less gym still sees Bench Press. Tightening
 * that needs a per-exercise pass over ~90 pressing movements and a product call, not a regex on
 * bench|incline|seated."
 *
 * That is what happened. The product call came from authoring `close-quarters-6day` — a dumbbells-only
 * home program in which TWELVE prescriptions need a bench, every one of which passed every home check
 * the app had. `bench` was already in the inventory AND in the ten-item onboarding quick-pick, so an
 * athlete could tick it and have it change nothing, which is worse than not offering it.
 *
 * **A press needs dumbbells AND a bench, and OR could not say that.** `['dumbbells', 'bench']` reads as
 * *either*, so a bench-owner with no dumbbells would still be shown Dumbbell Bench Press. Hence
 * `GearRequirement`: a plain array is unchanged (any-of), and `{ all: [...] }` is every group satisfied
 * by any one of its members. Every pre-existing entry stays a plain array.
 *
 * The bench is composed onto the LOAD requirement rather than written into each entry, so `EQUIP_UNLOCK`
 * stays the single source of truth for what a dumbbell exercise needs and the two cannot drift.
 *
 * THE NARROWING THAT MADE THE PASS TRACTABLE: a machine brings its own seat. A chest press machine, a
 * preacher curl station and a seated row all have the pad built in, so `bench` is only ever composed
 * onto FREE-WEIGHT and BODYWEIGHT movements. That is what takes it from "~90 pressing movements" to the
 * two hand-checked sets below.
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
  /**
   * ⚠ `ezbar` USED TO BE IN THIS LIST, AND IT WAS A LIE THE ATHLETE COULD TICK.
   *
   * The editor has offered "EZ-curl bar" since it was written, and mapping it onto `barbell` meant an
   * athlete who owned nothing but a curl bar was told they could Back Squat, Deadlift and Bench Press.
   * You cannot squat with an EZ bar. The reason the mapping existed at all is that the catalogue held
   * NO EZ-bar movement to unlock — so the choice was between claiming too much and the checkbox meaning
   * nothing, and it claimed too much.
   *
   * The catalogue now has twelve, under their own `ez_bar` equipment id, so the honest mapping exists:
   * a curl bar unlocks curl-bar work and nothing else.
   *
   * `trapbar` STAYS, deliberately and unhappily. It has the same shape of problem — a trap bar deadlifts
   * and shrugs and carries, it does not bench — but there is not one trap-bar movement in the catalogue
   * to point it at, so removing it would take a trap-bar owner from "too much" to "nothing at all".
   * That is a worse answer, and it is the argument for a trap-bar pass, not for a change here.
   */
  barbell: ['barbell', 'plates', 'rack', 'trapbar', 'smith'],
  // The curl bar unlocks the curl bar. Nothing stands in for it: a straight bar changes the wrist angle
  // the implement exists to change, which is why both rows are in the catalogue rather than one.
  ez_bar: ['ezbar'],
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

/**
 * You must LIE ON or SIT ON a bench to do these, and nothing else in the inventory serves.
 *
 * Hand-checked, because a regex cannot do it in either direction. `dumbbell-chest-fly` names no bench
 * and needs one; `dumbbell-floor-press` is the movement that exists precisely because you have not got
 * one. Machine equivalents are absent by construction — see the header.
 */
export const NEEDS_BENCH: ReadonlySet<string> = new Set([
  // Pressing, on your back or on an incline
  'barbell-bench-press', 'barbell-close-grip-bench-press', 'barbell-decline-bench-press',
  'barbell-incline-bench-press', 'dumbbell-bench-press', 'dumbbell-decline-bench-press',
  'dumbbell-incline-bench-press', 'dumbbell-neutral-grip-bench-press',
  'alternating-dumbbell-bench-press', 'single-arm-dumbbell-bench-press',
  'single-arm-dumbbell-incline-press', 'dumbbell-squeeze-press', 'dumbbell-jm-press',
  'dumbbell-tate-press',
  // Seated pressing — a seat with a back, not a stool
  'barbell-seated-overhead-press', 'seated-dumbbell-shoulder-press',
  // Flys. The flat one names no bench and needs one, which is the whole argument against a regex.
  'dumbbell-chest-fly', 'dumbbell-decline-chest-fly', 'dumbbell-incline-chest-fly',
  'incline-dumbbell-rear-delt-fly',
  // Pullovers
  'barbell-pullover', 'dumbbell-pullover', 'kettlebell-pullover', 'dumbbell-pullover-row',
  // Rows that brace the torso on a bench
  'dumbbell-chest-supported-row', 'dumbbell-incline-bench-row', 'barbell-seal-row', 'dumbbell-seal-row',
  // Triceps on your back
  'barbell-skull-crusher', 'dumbbell-skull-crusher',
  // Curls braced against a pad or an incline
  'dumbbell-incline-curl', 'dumbbell-spider-curl', 'barbell-preacher-curl', 'dumbbell-preacher-curl',
  // The EZ-bar family (0127-era catalogue append). The same three shapes need the same pad: a preacher
  // curl is defined by the bench it is done over, a spider curl hangs the arms off one, and a skull
  // crusher is performed lying down. The other nine EZ movements are standing and need nothing.
  'ez-bar-preacher-curl', 'ez-bar-spider-curl', 'ez-bar-skull-crusher',
  // Shoulders on the bench
  'barbell-hip-thrust', 'dumbbell-hip-thrust', 'band-hip-thrust',
  // Seated barbell work
  'barbell-seated-good-morning',
  // Bodyweight and mobility that name the bench as the implement
  'bench-dip', 'lat-stretch-on-bench', 'thoracic-extension-on-bench',
]);

/**
 * These need something sturdy and raised — a bench OR a plyo box, either will do.
 *
 * Kept separate from `NEEDS_BENCH` because a rear foot or a lead foot does not care which it is, and
 * collapsing the two would tell a box owner they cannot do a split squat.
 *
 * NOT here, deliberately: incline and decline PUSH-UPS. They want an elevated surface too, but a stair,
 * a sofa or a kitchen counter all serve, and gating a bodyweight push-up behind gym furniture buys
 * accuracy nobody asked for at the cost of the most available exercise in the catalogue.
 */
export const NEEDS_ELEVATION: ReadonlySet<string> = new Set([
  'bulgarian-split-squat', 'barbell-bulgarian-split-squat', 'dumbbell-bulgarian-split-squat',
  'kettlebell-bulgarian-split-squat', 'cable-bulgarian-split-squat',
  'step-up', 'barbell-step-up', 'dumbbell-step-up', 'kettlebell-step-up', 'cable-step-up',
  'dumbbell-box-step-down', 'box-squat-to-bench',
]);

/**
 * ANY ONE of these ids unlocks it (OR), or EVERY group in `all` must be satisfied by any one of its
 * members (AND-of-ORs). A bare array is the original shape and still means exactly what it did.
 */
export type GearRequirement = readonly string[] | { readonly all: readonly (readonly string[])[] };

const isAllOf = (r: GearRequirement): r is { readonly all: readonly (readonly string[])[] } =>
  !Array.isArray(r);

/**
 * What an exercise needs: the per-exercise override if there is one, else its equipment's unlock —
 * and then whatever it needs to lie on or step onto, composed on top.
 */
export function requirementFor(ex: { key: string; equipId: string }): GearRequirement {
  const base = EXERCISE_GEAR[ex.key] ?? EQUIP_UNLOCK[ex.equipId] ?? [];
  if (NEEDS_BENCH.has(ex.key)) return { all: [base, ['bench']] };
  if (NEEDS_ELEVATION.has(ex.key)) return { all: [base, ['bench', 'plyobox']] };
  return base;
}

/** Can this exercise be trained with what the athlete owns? Nothing required = always yes. */
export function canDoExercise(ex: { key: string; equipId: string }, owned: readonly string[]): boolean {
  const req = requirementFor(ex);
  // An empty group is satisfied by definition — a bodyweight movement that only needs a bench still
  // resolves to `all: [[], ['bench']]`, and the floor half of that must not read as "impossible".
  if (isAllOf(req)) return req.all.every((g) => g.length === 0 || g.some((id) => owned.includes(id)));
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
