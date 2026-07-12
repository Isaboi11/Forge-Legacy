/**
 * engine.mjs — deterministic core for the Forge Legacy exercise coaching system.
 *
 * Pure, dependency-free ES module. Imported by generate.mjs, validate.mjs,
 * report.mjs and the test suite, and mirrored (typed) by schema.ts. Given the
 * same canonical source files + a fixed clock, every function returns
 * byte-identical output — generation is fully reproducible and idempotent.
 *
 * It CONSUMES the canonical datasets (never mutates them):
 *   ../exercise-relationships/source/{exercises,exercise_muscles,equipment,muscles}.json
 *   ../exercise-relationships/exercise_relationships.json   (relationship quality)
 *
 * Responsibilities:
 *   • load + index the catalog (real anatomical muscle sets, position, unilateral)
 *   • classifyRisk       — Standard | Technical | Specialist (deterministic rules)
 *   • assignBatch        — one of the ten ordered generation batches
 *   • composeContent     — metadata-driven coaching generator (pattern × equipment × position)
 *   • confidence         — 0–100 editorial-only score
 *   • computeFlags       — automatic review flags
 *   • detectDuplicates   — cross-record near-identical coaching detector
 *   • buildRecord/routeStatus — assemble a record & route it through the workflow
 *   • WORKFLOW           — the editorial state machine (Approve/Publish are human-only)
 *   • projectToView      — strip editorial fields → the UI-safe projection
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REL_DIR = join(HERE, '..', 'exercise-relationships');
export const SOURCE_DIR = join(REL_DIR, 'source');

// ─────────────────────────────────────────────────────────────────────────────
// Constants (mirror of schema.ts)
// ─────────────────────────────────────────────────────────────────────────────

export const COACHING_SCHEMA_VERSION = 1;
export const GENERATOR_VERSION = 'coach-gen@1';

export const CONTENT_STATUSES = ['Draft', 'Auto-Validated', 'Needs Review', 'Approved', 'Published'];
export const AUTOMATABLE_STATUSES = new Set(['Draft', 'Auto-Validated', 'Needs Review']);
export const USER_VISIBLE_STATUSES = new Set(['Published']);
export const RISK_TIERS = ['Standard', 'Technical', 'Specialist'];
export const REVIEW_FLAG_CODES = [
  'LOW_CONFIDENCE', 'OLYMPIC_LIFT', 'ADVANCED_GYMNASTICS', 'STRONGMAN', 'SPECIALIST_TIER',
  'TECHNICAL_TIER', 'SPOTTING_REQUIRED', 'METADATA_INCONSISTENCY', 'AMBIGUOUS_SETUP',
  'UNUSUAL_EQUIPMENT', 'DUPLICATE_WORDING', 'POSSIBLE_CONTRADICTION', 'MOVEMENT_PATTERN_MISMATCH',
  'STANDING_SEATED_CONTRADICTION', 'MACHINE_FREEWEIGHT_MISMATCH', 'ZERO_RELATIONSHIPS', 'SPARSE_CONTENT',
];
export const GENERATION_BATCHES = [
  'Machines', 'Cable', 'Dumbbells', 'Bodyweight', 'Barbell', 'Bands',
  'Kettlebells', 'Cardio', 'Mobility', 'Specialist',
];

export const MOVEMENT_PATTERNS = new Set([
  'Squat / Knee Dominant', 'Hinge / Hip Dominant', 'Horizontal Push', 'Vertical Push',
  'Horizontal Pull', 'Vertical Pull', 'Elbow Flexion', 'Elbow Extension', 'Core', 'Carry',
  'Cardio / Locomotion', 'Power / Plyometric', 'Mobility', 'Calf / Ankle', 'Hip Isolation',
  'Shoulder Isolation', 'Neck Isolation', 'Other',
]);

export const SYSTEM_MUSCLE_IDS = new Set(['full_body', 'cardiovascular', 'mobility', 'grip', 'balance']);
const MUSCLELESS_PATTERNS = new Set(['Cardio / Locomotion', 'Mobility', 'Carry', 'Power / Plyometric']);
const UNUSUAL_EQUIPMENT = new Set(['sled', 'battle_rope', 'suspension_trainer', 'medicine_ball']);

const DIFFICULTY_ORD = { Beginner: 0, Intermediate: 1, Advanced: 2 };

// Confidence / routing thresholds (editorial only).
export const LOW_CONFIDENCE_THRESHOLD = 70;   // raises LOW_CONFIDENCE flag
export const REVIEW_CONFIDENCE_THRESHOLD = 75; // below → Needs Review
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.95; // near-identical wording across exercises

// ── Risk-token vocabularies ──────────────────────────────────────────────────
const OLYMPIC_TOKENS = ['snatch', 'clean-and-jerk', 'clean & jerk', 'power-clean', 'hang-clean',
  'squat-clean', 'power-jerk', 'split-jerk', 'push-jerk', 'clean-pull', 'snatch-pull', 'clean', 'jerk'];
const GYMNASTICS_TOKENS = ['planche', 'front-lever', 'back-lever', 'iron-cross', 'muscle-up',
  'handstand', 'skin-the-cat', 'human-flag', 'maltese', 'lever'];
const STRONGMAN_TOKENS = ['atlas-stone', 'stone-load', 'tire-flip', 'keg', 'sandbag', 'yoke',
  'log-press', 'log-clean', 'farmers-walk-heavy', 'car-deadlift', 'viking-press', 'sled-drag',
  'sled-push', 'rope-pull'];
const GETUP_TOKENS = ['turkish-get-up', 'get-up', 'getup'];

const UNILATERAL_TOKENS = ['single-arm', 'single-leg', 'one-arm', 'one-leg', 'pistol', 'bulgarian',
  'archer', 'staggered', 'b-stance', 'cossack', 'shrimp', 'skater', 'curtsy', 'single-', 'split-squat',
  'suitcase', 'one-'];

// ─────────────────────────────────────────────────────────────────────────────
// Loading & indexing
// ─────────────────────────────────────────────────────────────────────────────

export function loadSources(dir = SOURCE_DIR) {
  const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
  return {
    exercises: read('exercises.json'),
    exerciseMuscles: read('exercise_muscles.json'),
    equipment: read('equipment.json'),
    muscles: read('muscles.json'),
  };
}

export function loadRelationships(dir = REL_DIR) {
  try {
    return JSON.parse(readFileSync(join(dir, 'exercise_relationships.json'), 'utf8'));
  } catch {
    return [];
  }
}

const has = (hay, needles) => needles.some((n) => hay.includes(n));
const isUnilateral = (id) => UNILATERAL_TOKENS.some((t) => id.includes(t));

/** Coarse body position, derived from name/family tokens; editors refine. */
function positionOf(node) {
  const t = `${node.id} ${node.family}`.toLowerCase();
  if (has(t, ['incline'])) return 'incline';
  if (has(t, ['decline'])) return 'decline';
  if (has(t, ['hang', 'pull-up', 'chin-up', 'pullup', 'chinup'])) return 'hanging';
  if (has(t, ['prone', 'reverse-hyper', 'reverse hyper'])) return 'prone';
  if (has(t, ['kneeling', 'half-kneeling'])) return 'kneeling';
  if (has(t, ['seated', 'sit-up', 'sit up'])) return 'seated';
  if (has(t, ['lying', 'supine', 'floor-press', 'bench-press', 'chest-press', 'fly', 'flye',
    'pullover', 'skull', 'crusher', 'leg-press'])) return 'supine';
  if (has(t, ['bent-over', 'bent over', 'romanian', 'good-morning', 'pendlay'])) return 'bent-over';
  if (has(t, ['standing'])) return 'standing';
  // fall back to pattern defaults
  switch (node.movementPattern) {
    case 'Horizontal Push': return 'supine';
    case 'Squat / Knee Dominant':
    case 'Hinge / Hip Dominant':
    case 'Vertical Push':
    case 'Carry':
    case 'Shoulder Isolation':
    case 'Elbow Flexion':
    case 'Calf / Ankle':
      return 'standing';
    case 'Vertical Pull': return 'hanging';
    default: return 'standing';
  }
}

export function buildIndex(sources, relationships = []) {
  const { exercises, exerciseMuscles, equipment, muscles } = sources;
  const equipmentById = new Map(equipment.map((e) => [e.id, e]));
  const muscleName = new Map(muscles.map((m) => [m.id, m.name]));

  const primary = new Map();
  const secondary = new Map();
  const primaryWithSystem = new Map();
  for (const row of exerciseMuscles) {
    const bucket = row.role === 'Primary' ? primary : secondary;
    if (!bucket.has(row.exerciseId)) bucket.set(row.exerciseId, new Set());
    if (row.role === 'Primary') {
      if (!primaryWithSystem.has(row.exerciseId)) primaryWithSystem.set(row.exerciseId, new Set());
      primaryWithSystem.get(row.exerciseId).add(row.muscleId);
    }
    if (!SYSTEM_MUSCLE_IDS.has(row.muscleId)) bucket.get(row.exerciseId).add(row.muscleId);
  }

  // family / pattern rarity counts
  const familyCount = new Map();
  const patternCount = new Map();
  for (const ex of exercises) {
    familyCount.set(ex.family, (familyCount.get(ex.family) ?? 0) + 1);
    patternCount.set(ex.movementPattern, (patternCount.get(ex.movementPattern) ?? 0) + 1);
  }
  const relCount = new Map();
  for (const e of relationships) relCount.set(e.sourceExerciseId, (relCount.get(e.sourceExerciseId) ?? 0) + 1);

  const byId = new Map();
  for (const ex of exercises) {
    const eq = equipmentById.get(ex.equipmentId);
    const node = {
      id: ex.id,
      name: ex.name,
      family: ex.family,
      equipmentId: ex.equipmentId,
      equipmentName: eq ? eq.name : ex.equipmentId,
      equipCategory: eq ? eq.category : null,
      environments: eq ? eq.environments : [],
      portable: eq ? eq.portable : false,
      movementPattern: ex.movementPattern,
      difficulty: ex.difficulty,
      difficultyOrd: DIFFICULTY_ORD[ex.difficulty] ?? 1,
      modality: ex.modality ?? null,
      realPrimary: primary.get(ex.id) ?? new Set(),
      realSecondary: secondary.get(ex.id) ?? new Set(),
      primaryWithSystem: primaryWithSystem.get(ex.id) ?? new Set(),
      unilateral: isUnilateral(ex.id),
      familyPeers: familyCount.get(ex.family) ?? 1,
      patternPeers: patternCount.get(ex.movementPattern) ?? 1,
      relCount: relCount.get(ex.id) ?? 0,
    };
    node.primaryNames = [...node.realPrimary].map((m) => (muscleName.get(m) ?? m)).sort();
    node.isMachine = ex.equipmentId === 'selectorized_machine' || ex.equipmentId === 'smith_machine';
    node.isCable = ex.equipmentId === 'cable';
    node.isBodyweight = ex.equipmentId === 'bodyweight';
    node.isBand = ex.equipmentId === 'resistance_band';
    node.isFreeWeight = eq ? eq.category === 'Free Weight' : false;
    node.position = positionOf(node);
    byId.set(ex.id, node);
  }
  const ids = [...byId.keys()].sort();
  return { byId, ids, equipmentById, muscleName };
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk classification (deterministic, priority-ordered)
// ─────────────────────────────────────────────────────────────────────────────

/** @returns {'Standard'|'Technical'|'Specialist'} */
export function classifyRisk(node) {
  const id = node.id.toLowerCase();
  // 1) Specialist — Olympic lifts, advanced gymnastics, strongman, loaded get-ups.
  if (has(id, OLYMPIC_TOKENS)) return 'Specialist';
  if (has(id, GYMNASTICS_TOKENS)) return 'Specialist';
  if (has(id, STRONGMAN_TOKENS)) return 'Specialist';
  if (has(id, GETUP_TOKENS)) return 'Specialist';

  // 2) Technical — free-weight compound / loaded-spine / overhead / bodyweight skill / plyometric.
  const compoundPatterns = new Set([
    'Squat / Knee Dominant', 'Hinge / Hip Dominant', 'Horizontal Push', 'Vertical Push',
    'Horizontal Pull', 'Vertical Pull',
  ]);
  const isCompound = compoundPatterns.has(node.movementPattern);
  const guided = node.isMachine || node.equipmentId === 'cardio';
  if (!guided) {
    if (node.isFreeWeight && isCompound && node.difficultyOrd >= 1) return 'Technical';
    if (node.movementPattern === 'Vertical Pull' && node.isBodyweight) return 'Technical'; // pull-ups, dips
    if (node.movementPattern === 'Vertical Push' && (node.isFreeWeight)) return 'Technical'; // overhead
    if (node.movementPattern === 'Power / Plyometric' && node.difficultyOrd >= 1) return 'Technical';
    if (node.difficulty === 'Advanced' && isCompound) return 'Technical';
  }
  // 3) Standard — everything else (machines, cables, isolation, beginner bodyweight).
  return 'Standard';
}

/** Spotting is relevant only for loaded free-weight overhead / supine press / back-loaded squat. */
export function needsSpotting(node) {
  if (node.isMachine || node.isCable || node.isBodyweight || node.isBand) return false;
  if (!node.isFreeWeight) return false;
  if (node.movementPattern === 'Horizontal Push' && (node.position === 'supine' || node.position === 'incline' || node.position === 'decline')) return true;
  if (node.movementPattern === 'Vertical Push') return true;
  if (node.movementPattern === 'Squat / Knee Dominant' && node.equipmentId === 'barbell'
    && !node.id.includes('front') && !node.id.includes('goblet')) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch assignment (one batch per exercise; matches GENERATION_BATCHES order)
// ─────────────────────────────────────────────────────────────────────────────

export function assignBatch(node, risk = classifyRisk(node)) {
  if (risk === 'Specialist') return 'Specialist';
  if (node.movementPattern === 'Mobility' || node.modality === 'Mobility') return 'Mobility';
  if (node.equipmentId === 'cardio' || node.modality === 'Cardio' || node.movementPattern === 'Cardio / Locomotion') return 'Cardio';
  if (node.isMachine) return 'Machines';
  if (node.equipmentId === 'cable') return 'Cable';
  if (node.equipmentId === 'dumbbell') return 'Dumbbells';
  if (node.equipmentId === 'barbell') return 'Barbell';
  if (node.equipmentId === 'resistance_band') return 'Bands';
  if (node.equipmentId === 'kettlebell') return 'Kettlebells';
  return 'Bodyweight'; // bodyweight, suspension_trainer, medicine_ball, plyo_box, sled, battle_rope
}

// ─────────────────────────────────────────────────────────────────────────────
// Content generation — metadata-driven templates
// ─────────────────────────────────────────────────────────────────────────────
//
// Fragments are SPECIFIC, OBSERVABLE and ACTIONABLE per the writing philosophy.
// Banned generic phrases ("use good form", "engage your core", "keep your
// posture") never appear — validate.mjs enforces this. Every record references
// its own equipment / movement pattern / position / unilateral status, so two
// different exercises never receive identical coaching (see detectDuplicates).

const lower = (s) => s.toLowerCase();

/** Human phrase for a movement pattern. */
const PATTERN_PHRASE = {
  'Squat / Knee Dominant': 'squat', 'Hinge / Hip Dominant': 'hip hinge',
  'Horizontal Push': 'press', 'Vertical Push': 'overhead press',
  'Horizontal Pull': 'row', 'Vertical Pull': 'pull-down', 'Elbow Flexion': 'curl',
  'Elbow Extension': 'triceps extension', 'Core': 'core', 'Carry': 'loaded carry',
  'Cardio / Locomotion': 'effort', 'Power / Plyometric': 'explosive rep', 'Mobility': 'mobility drill',
  'Calf / Ankle': 'calf raise', 'Hip Isolation': 'hip movement', 'Shoulder Isolation': 'raise',
  'Neck Isolation': 'neck movement', 'Other': 'movement',
};

/** Per-pattern coaching bank. Tips/mistakes are concrete and observable. */
const PATTERN_BANK = {
  'Squat / Knee Dominant': {
    setup: ['Set your feet about shoulder-width with your toes turned out slightly.',
      'Take a full breath into your belly and brace before you descend.'],
    execution: ['Break at the hips and knees together and lower under control.',
      'Descend until your thighs reach at least parallel to the floor.',
      'Drive through the middle of your foot to stand back up.'],
    tips: ['Keep the load stacked over the middle of your foot.',
      'Let your knees track in line with your toes.',
      'Push your knees out as you descend into the bottom.'],
    mistakes: [
      { mistake: 'Letting the knees cave inward under load.', correction: 'Push your knees out toward your little toes as you descend and stand.' },
      { mistake: 'Rising hips-first so the load shifts forward onto your toes.', correction: 'Lead with your chest and drive your hips and shoulders up at the same rate.' },
      { mistake: 'Cutting the depth short above parallel.', correction: 'Lower until your hip crease drops below the top of your knee.' }],
    breathing: 'Take a big breath at the top, hold it through the descent and drive, then exhale at the top.',
    tempo: 'Lower under control for about two counts, then stand with intent.',
    rom: 'Aim for thighs at or below parallel while keeping your heels flat on the floor.',
    beginner: ['Start with a box or bench behind you to learn consistent depth.'],
    advanced: ['Add a pause in the bottom position to build strength out of the hole.'],
  },
  'Hinge / Hip Dominant': {
    setup: ['Set your feet about hip-width with the load close to your shins.',
      'Set your back flat and take a breath into your belly before you pull.'],
    execution: ['Push your hips back and let your knees bend slightly as the load lowers.',
      'Keep the load brushing your legs the whole way.',
      'Stand up by driving your hips forward until you are tall.'],
    tips: ['Push your hips back until you feel a stretch in your hamstrings.',
      'Keep the load in contact with your legs from start to finish.',
      'Finish by squeezing your glutes, not by leaning back past standing.'],
    mistakes: [
      { mistake: 'Rounding the lower back as the load leaves the floor.', correction: 'Set your back flat and lift your chest before the load moves.' },
      { mistake: 'Turning the hinge into a squat by bending the knees too early.', correction: 'Send your hips backward first and let the knees follow.' },
      { mistake: 'Hyperextending and leaning back at the top.', correction: 'Stop when you are standing tall with your glutes squeezed.' }],
    breathing: 'Breathe in at the top, brace, hold through the lift, then exhale once you are standing.',
    tempo: 'Lower for about two to three counts, then drive up with intent.',
    rom: 'Lower until you feel a hamstring stretch with a flat back — depth is limited by your hamstrings, not the floor.',
    beginner: ['Practice the hip hinge with a light load or dowel to groove the pattern first.'],
    advanced: ['Pause just below the knee to build control in the stretched position.'],
  },
  'Horizontal Push': {
    setup: ['Set your grip evenly and pull your shoulder blades down and together.',
      'Set your feet and create full-body tension before you begin.'],
    execution: ['Lower the load under control toward the middle of your chest.',
      'Keep your forearms vertical as you lower.',
      'Press back to a full lockout.'],
    tips: ['Keep the load stacked directly over your elbows.',
      'Tuck your elbows to about 45 degrees from your torso.',
      'Drive your shoulder blades back and down and hold that position.'],
    mistakes: [
      { mistake: 'Flaring the elbows straight out to the sides.', correction: 'Point your elbows toward your hips as you lower.' },
      { mistake: 'Bouncing the load off the chest.', correction: 'Control the descent and pause briefly before you press.' },
      { mistake: 'Losing the shoulder-blade set at the bottom.', correction: 'Keep your blades pinned back and down throughout the rep.' }],
    breathing: 'Breathe in as you lower, then exhale as you press through the sticking point.',
    tempo: 'Lower for about two counts, then press with intent.',
    rom: 'Lower until the load lightly touches or nearly touches your chest, then press to full extension.',
    beginner: ['Start light and groove the movement before adding load.'],
    advanced: ['Add a pause on the chest to remove the stretch reflex and build pressing strength.'],
  },
  'Vertical Push': {
    setup: ['Set your grip just outside shoulder-width with the load at shoulder height.',
      'Squeeze your glutes and take a breath to keep your ribs down.'],
    execution: ['Press the load straight overhead, moving your head back slightly to clear the path.',
      'Once the load passes your forehead, move your head back through and finish overhead.',
      'Lower under control back to shoulder height.'],
    tips: ['Finish with the load stacked over the middle of your foot.',
      'Squeeze your glutes to stop your lower back from arching.',
      'Keep your forearms vertical throughout the press.'],
    mistakes: [
      { mistake: 'Arching the lower back to press the load up.', correction: 'Squeeze your glutes and keep your ribs pulled down.' },
      { mistake: 'Pressing the load forward instead of straight up.', correction: 'Move your head back to let the load travel in a straight line over your shoulders.' },
      { mistake: 'Stopping short of a full overhead lockout.', correction: 'Finish each rep with your elbows locked and the load over your ears.' }],
    breathing: 'Breathe in and brace at shoulder height, press, then exhale at the top.',
    tempo: 'Press with intent and lower under control for about two counts.',
    rom: 'Lower to shoulder height and press to a full overhead lockout each rep.',
    beginner: ['Use a lighter load and press one arm at a time if bracing is difficult.'],
    advanced: ['Pause at shoulder height to remove momentum between reps.'],
  },
  'Horizontal Pull': {
    setup: ['Set your torso and let your working arm hang with the shoulder blade relaxed forward.',
      'Set a stable base before you begin pulling.'],
    execution: ['Pull your elbow back toward your hip, leading with the elbow.',
      'Draw the load to your lower ribs and squeeze your shoulder blade back.',
      'Lower under control until your arm is straight and the shoulder blade reaches forward.'],
    tips: ['Lead with your elbow, not your hand.',
      'Draw the load toward your belt line rather than your chest.',
      'Let your shoulder blade slide back and down at the top of each rep.'],
    mistakes: [
      { mistake: 'Yanking with the lower back and using momentum.', correction: 'Keep your torso still and let your arm and shoulder blade do the work.' },
      { mistake: 'Shrugging the shoulder up toward the ear while pulling.', correction: 'Keep your shoulder down and pull your elbow straight back.' },
      { mistake: 'Cutting the stretch short at the bottom.', correction: 'Let your arm fully straighten and your shoulder blade reach forward before the next rep.' }],
    breathing: 'Exhale as you pull, breathe in as you return under control.',
    tempo: 'Pull with intent, then lower for about two counts.',
    rom: 'Reach into a full stretch at the bottom and pull until your shoulder blade is fully retracted.',
    beginner: ['Use a load you can pull without leaning back or jerking.'],
    advanced: ['Pause and squeeze for one count at the fully retracted position.'],
  },
  'Vertical Pull': {
    setup: ['Set your grip and start from a full hang or fully stretched position.',
      'Set your shoulders down away from your ears before the first rep.'],
    execution: ['Drive your elbows down toward your hips.',
      'Pull until your chest reaches your hands.',
      'Lower under control back to a full stretch.'],
    tips: ['Drive your elbows down toward your hips to lead the pull.',
      'Pull your chest up to your hands rather than leading with your chin.',
      'Start every rep from a full stretch at the top.'],
    mistakes: [
      { mistake: 'Kipping or swinging to complete the rep.', correction: 'Pull from a dead hang and keep your body quiet.' },
      { mistake: 'Stopping the pull the moment your chin clears your hands.', correction: 'Pull until your collarbone or chest reaches your hands.' },
      { mistake: 'Failing to reach a full stretch between reps.', correction: 'Let your arms straighten fully and your shoulder blades rise at the top.' }],
    breathing: 'Exhale as you pull up, breathe in as you lower under control.',
    tempo: 'Pull with intent, then lower for about two to three counts.',
    rom: 'Travel from a full hang to your hands at your chest every rep.',
    beginner: ['Use assistance or a resistance band to complete full-range reps.'],
    advanced: ['Add a pause at the top with your chest to your hands before lowering.'],
  },
  'Elbow Flexion': {
    setup: ['Set a tall torso with your upper arms pinned against your sides.',
      'Start with your arms straight and the load under control.'],
    execution: ['Bend your elbows and curl the load up while keeping your upper arms still.',
      'Squeeze at the top for a beat.',
      'Lower under control until your arms are straight.'],
    tips: ['Keep your elbows pinned to your sides throughout.',
      'Turn your pinky slightly up at the top to finish the squeeze.',
      'Lower all the way until your arm is straight each rep.'],
    mistakes: [
      { mistake: 'Swinging the torso to start the load moving.', correction: 'Stand tall and keep your upper arms fixed against your sides.' },
      { mistake: 'Letting the elbows drift forward to lift the load higher.', correction: 'Keep your elbows under your shoulders and stop the curl where your upper arm wants to move.' },
      { mistake: 'Cutting the lower-half of the range short.', correction: 'Straighten your arm fully at the bottom of each rep.' }],
    breathing: 'Exhale as you curl up, breathe in as you lower.',
    tempo: 'Curl with control and lower for about two counts.',
    rom: 'Move from a fully straight arm to a hard squeeze at the top.',
    beginner: ['Pick a load you can lift without swinging your body.'],
    advanced: ['Slow the lowering phase to three counts to add time under tension.'],
  },
  'Elbow Extension': {
    setup: ['Set your upper arms in position and keep your elbows pointing forward.',
      'Start with the load under control and your elbows fixed.'],
    execution: ['Straighten your elbows to extend the load fully.',
      'Squeeze your triceps at full lockout.',
      'Bend your elbows under control back to the start.'],
    tips: ['Keep your elbows fixed and pointing forward the whole set.',
      'Lock out fully to finish each rep.',
      'Keep your upper arms still and move only at the elbow.'],
    mistakes: [
      { mistake: 'Letting the elbows flare and drift to recruit the shoulders.', correction: 'Keep your elbows tucked and pointing forward throughout.' },
      { mistake: 'Stopping short of a full lockout.', correction: 'Straighten your arms completely at the end of each rep.' },
      { mistake: 'Using body english to drive the load.', correction: 'Keep your torso still and move only at the elbow joint.' }],
    breathing: 'Exhale as you extend, breathe in as you return.',
    tempo: 'Extend with intent, return for about two counts.',
    rom: 'Move from a full stretch at the elbow to a complete lockout.',
    beginner: ['Use a load light enough to keep your elbows still.'],
    advanced: ['Pause at full lockout for a one-count contraction.'],
  },
  'Core': {
    setup: ['Set your position and take the slack out of your midsection before you begin.',
      'Start each rep from a controlled, stable position.'],
    execution: ['Move slowly and deliberately through the working range.',
      'Control the return rather than letting the load or your body drop.'],
    tips: ['Move under control — no yanking or rushing the reps.',
      'Curl your ribs toward your hips rather than pulling with your neck.',
      'Keep the tension on your midsection, not your hip flexors or lower back.'],
    mistakes: [
      { mistake: 'Pulling on the neck or head to complete the rep.', correction: 'Keep your hands light and lead the movement from your midsection.' },
      { mistake: 'Rushing through reps with momentum.', correction: 'Slow each rep down and control both directions.' }],
    breathing: 'Exhale as you contract, breathe in as you return.',
    tempo: 'Move slowly in both directions and avoid using momentum.',
    rom: 'Work through a range you can control without your lower back taking over.',
    beginner: ['Reduce the range or leverage until you can control every rep.'],
    advanced: ['Add a pause at the hardest point of the range for extra tension.'],
  },
  'Carry': {
    setup: ['Pick up the load with a flat back and stand tall.',
      'Set your shoulders back and down before you start walking.'],
    execution: ['Walk with short, deliberate steps while staying tall.',
      'Keep the load from swinging by bracing your sides.'],
    tips: ['Stand tall and walk with short, controlled steps.',
      'Keep the load steady rather than letting it swing.',
      'Keep your shoulders back and down for the full distance.'],
    mistakes: [
      { mistake: 'Leaning to one side under an uneven load.', correction: 'Stay stacked and tall, resisting the pull to one side.' },
      { mistake: 'Taking long, rushed strides that let the load sway.', correction: 'Shorten your steps and keep a steady, controlled pace.' }],
    breathing: 'Breathe steadily and rhythmically throughout the carry.',
    tempo: 'Move at a controlled, deliberate walking pace.',
    rom: 'Cover the target distance or time while holding position.',
    beginner: ['Start with a shorter distance and a load you can control the whole way.'],
    advanced: ['Increase the distance or load while keeping your torso perfectly upright.'],
  },
  'Cardio / Locomotion': {
    setup: ['Set your effort to a pace you can sustain for the planned duration.',
      'Settle into a rhythm before pushing the pace.'],
    execution: ['Hold a steady, repeatable rhythm for the working duration.',
      'Adjust your effort so the last minute feels as controlled as the first.'],
    tips: ['Settle into a cadence you can hold for the full effort.',
      'Breathe rhythmically and in time with your pace.',
      'Build the pace gradually rather than starting too hard.'],
    mistakes: [
      { mistake: 'Starting too fast and fading in the second half.', correction: 'Open at a pace you could hold to the end, then build.' }],
    breathing: 'Breathe in a steady rhythm matched to your cadence.',
    tempo: 'Hold a sustainable, repeatable pace for the target duration.',
    rom: null,
    beginner: ['Use intervals of easier effort to build duration over time.'],
    advanced: ['Add pace changes or intervals to raise the training stimulus.'],
  },
  'Power / Plyometric': {
    setup: ['Set a stable, athletic base with your feet under your hips.',
      'Load your hips and take a breath before the explosive rep.'],
    execution: ['Be explosive on the way up, moving the load or your body as fast as possible.',
      'Absorb the landing or return softly through your hips and knees.'],
    tips: ['Be explosive on the way up and controlled on the way down.',
      'Land softly on your mid-foot, absorbing through your hips and knees.',
      'Reset fully between reps rather than rushing the next one.'],
    mistakes: [
      { mistake: 'Landing stiff-legged with a hard, loud impact.', correction: 'Land quietly and let your hips and knees bend to absorb the force.' },
      { mistake: 'Rushing reps and losing power output.', correction: 'Take a full reset between reps so each one is maximally explosive.' }],
    breathing: 'Take a breath and brace before each rep, then exhale on the effort.',
    tempo: 'Explode on the effort; land and reset under full control.',
    rom: 'Complete the full jump, throw or drive, then reset before the next rep.',
    beginner: ['Start with lower height or lighter load and step down between reps.'],
    advanced: ['Increase height, distance or load only while landings stay quiet and controlled.'],
  },
  'Mobility': {
    setup: ['Ease into the starting position without forcing the range.',
      'Set a comfortable position you can control before moving.'],
    execution: ['Move to the first point of tension, not into pain.',
      'Ease slightly deeper on each exhale.'],
    tips: ['Move to the first point of tension rather than into pain.',
      'Breathe out as you ease a little deeper into the range.',
      'Move smoothly and slowly rather than bouncing.'],
    mistakes: [
      { mistake: 'Forcing or bouncing into an end range.', correction: 'Move slowly to gentle tension and let it ease with your breath.' }],
    breathing: 'Breathe slowly and use each exhale to relax a little deeper.',
    tempo: 'Move slowly and hold positions rather than bouncing.',
    rom: 'Work to a comfortable end range that eases over the set.',
    beginner: ['Reduce the range and build gradually session to session.'],
    advanced: ['Add a gentle contraction at end range before relaxing deeper.'],
  },
  'Calf / Ankle': {
    setup: ['Set the balls of your feet on a stable surface with your heels free to drop.',
      'Find a light hold for balance if you need it.'],
    execution: ['Rise onto the balls of your feet as high as you can.',
      'Lower under control until you feel a full stretch through your calves.'],
    tips: ['Rise as high onto your toes as possible at the top.',
      'Lower under control into a full stretch at the bottom.',
      'Pause briefly at the top to remove any bounce.'],
    mistakes: [
      { mistake: 'Bouncing through short, fast reps.', correction: 'Pause at the top and control a full stretch at the bottom.' },
      { mistake: 'Cutting the stretch short at the bottom.', correction: 'Let your heels drop below the platform for a full stretch.' }],
    breathing: 'Exhale as you rise, breathe in as you lower.',
    tempo: 'Rise with control, pause at the top, then lower slowly.',
    rom: 'Move from a deep heel-dropped stretch to a full rise on your toes.',
    beginner: ['Do the movement on flat ground before adding a deficit or load.'],
    advanced: ['Add a two-count pause in the stretched position for extra range.'],
  },
  'Hip Isolation': {
    setup: ['Set your working hip in position with your torso stable.',
      'Start from a controlled position without momentum.'],
    execution: ['Move the working leg through its range while keeping your torso still.',
      'Squeeze the working glute at the end of each rep.'],
    tips: ['Squeeze the working glute at the top of each rep for a beat.',
      'Keep your torso still and move only at the hip.',
      'Control the return rather than letting the leg drop.'],
    mistakes: [
      { mistake: 'Twisting the torso to swing the leg higher.', correction: 'Keep your hips and torso square and move only at the working hip.' },
      { mistake: 'Rushing reps and losing the glute contraction.', correction: 'Slow down and pause to feel the working glute at the top.' }],
    breathing: 'Exhale as you contract, breathe in as you return.',
    tempo: 'Move with control and pause at peak contraction.',
    rom: 'Work through the range where you feel the glute working, without your back compensating.',
    beginner: ['Use no load or a light band until you feel the glute working.'],
    advanced: ['Add a pause and a band for constant tension through the range.'],
  },
  'Shoulder Isolation': {
    setup: ['Set a tall torso with a slight bend in your elbows.',
      'Start with the load under control at your sides or front.'],
    execution: ['Lead with your elbows and raise the load to shoulder height.',
      'Lower the load under control to the start.'],
    tips: ['Lead with your elbows and stop at shoulder height.',
      'Keep a soft, fixed bend in your elbows throughout.',
      'Lower under control rather than dropping the load.'],
    mistakes: [
      { mistake: 'Swinging the load up with the torso.', correction: 'Stand tall and raise the load with your shoulders, not momentum.' },
      { mistake: 'Raising the load well above shoulder height and shrugging.', correction: 'Stop at shoulder height and keep your traps relaxed.' }],
    breathing: 'Exhale as you raise, breathe in as you lower.',
    tempo: 'Raise with control and lower for about two counts.',
    rom: 'Raise to shoulder height and lower to a light stretch at the start.',
    beginner: ['Use a light load and stop the moment your form breaks down.'],
    advanced: ['Add a pause at shoulder height before lowering.'],
  },
  'Neck Isolation': {
    setup: ['Set a comfortable, supported starting position.',
      'Use a light resistance you can control the whole way.'],
    execution: ['Move your head slowly through a comfortable range.',
      'Return under control to the start.'],
    tips: ['Move slowly through a comfortable range.',
      'Use light resistance and controlled reps.',
      'Keep the rest of your body relaxed and still.'],
    mistakes: [
      { mistake: 'Using heavy resistance and jerky reps.', correction: 'Reduce the load and move slowly through a pain-free range.' }],
    breathing: 'Breathe steadily throughout each rep.',
    tempo: 'Move slowly and under full control in both directions.',
    rom: 'Work through a comfortable, pain-free range only.',
    beginner: ['Start with the lightest resistance and build slowly.'],
    advanced: ['Progress resistance gradually while keeping reps slow and controlled.'],
  },
  'Other': {
    setup: ['Set a stable starting position appropriate to the movement.'],
    execution: ['Perform the movement under control through its intended range.'],
    tips: ['Move under control through the full intended range.'],
    mistakes: [
      { mistake: 'Rushing the movement and losing control.', correction: 'Slow down and control the full range of each rep.' }],
    breathing: 'Breathe steadily and exhale on the effort.',
    tempo: 'Move under control throughout.',
    rom: null,
    beginner: ['Start light and learn the movement before adding intensity.'],
    advanced: ['Add load or range only once the movement is well controlled.'],
  },
};

/** Equipment-specific setup line (feeds `equipmentSetup`), or null when trivial. */
function equipmentSetupLine(node) {
  switch (node.equipmentId) {
    case 'selectorized_machine':
      return 'Adjust the seat and any pads so the working joint lines up with the machine’s axis, then set the pin to your working weight.';
    case 'smith_machine':
      return 'Set the safety stops, load the bar evenly, and rotate the bar to unlock it from the hooks before your first rep.';
    case 'cable':
      return `Set the pulley to the right height, attach the handle, and step back to remove the slack before your first rep.`;
    case 'barbell':
      return 'Load the bar evenly on both sides and secure it with collars before you lift.';
    case 'dumbbell':
      return 'Choose a pair you can control for every planned rep and get them into position cleanly.';
    case 'kettlebell':
      return 'Set the bell in a solid rack or hold position with your wrist stacked and neutral.';
    case 'resistance_band':
      return 'Anchor the band securely, check there is no slack at the start, and expect the tension to rise through the range.';
    case 'suspension_trainer':
      return 'Check the anchor is secure and set the strap length, then load your weight gradually to test it before full reps.';
    case 'medicine_ball':
      return 'Pick a ball weight you can control and clear the space around you before you start.';
    case 'plyo_box':
      return 'Set a box height you can land on comfortably and make sure it is stable and won’t slide.';
    case 'sled':
      return 'Load the sled to a weight you can move steadily and check the surface is clear ahead.';
    case 'battle_rope':
      return 'Anchor the rope securely and take a stable, athletic stance with tension in the line.';
    case 'bodyweight':
      return null;
    case 'cardio':
      return 'Set the machine to your working effort and settle into a rhythm before pushing.';
    default:
      return null;
  }
}

/** Equipment-flavoured coaching tip that keeps each record distinct. */
function equipmentTip(node) {
  if (node.isMachine) return 'Follow the machine’s fixed path smoothly rather than fighting it.';
  if (node.isCable) return 'Keep steady tension on the cable through the whole range, including the return.';
  if (node.equipmentId === 'dumbbell') return 'Control each dumbbell independently so your stronger side doesn’t take over.';
  if (node.equipmentId === 'kettlebell') return 'Keep your wrist stacked and the bell path tight to your body.';
  if (node.equipmentId === 'resistance_band') return 'Match your effort to the band — it fights back hardest at the end of the range.';
  if (node.equipmentId === 'suspension_trainer') return 'Adjust the difficulty by changing your foot position and body angle.';
  if (node.isBodyweight) return 'Own the full range of every rep before adding reps or load.';
  return null;
}

const oxford = (arr) => arr.length <= 1 ? (arr[0] ?? '') : arr.length === 2 ? `${arr[0]} and ${arr[1]}` : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;

/**
 * Compose the coaching content body for a node. Deterministic, metadata-driven.
 * @returns the content-field subset of ExerciseCoachingContent (no editorial meta).
 */
export function composeContent(node) {
  const bank = PATTERN_BANK[node.movementPattern] ?? PATTERN_BANK.Other;
  const phrase = PATTERN_PHRASE[node.movementPattern] ?? 'movement';
  const eqSetup = equipmentSetupLine(node);

  // setupInstructions: equipment setup first (if any) then pattern setup.
  const setupInstructions = [...(eqSetup ? [eqSetup] : []), ...bank.setup];

  // executionSteps
  const executionSteps = [...bank.execution];
  if (node.unilateral) executionSteps.push('Complete all your reps on one side, then repeat with the other, matching the reps on your weaker side.');

  // coachingTips (+ equipment flavour + unilateral note) → keeps records distinct
  const coachingTips = [...bank.tips];
  const eqTip = equipmentTip(node);
  if (eqTip) coachingTips.push(eqTip);
  if (node.unilateral) coachingTips.push('Resist the urge to twist toward the working side — keep your hips and shoulders square.');

  // commonMistakes + 1:1 corrections
  const commonMistakes = bank.mistakes.map((m) => m.mistake);
  const mistakeCorrections = bank.mistakes.map((m) => ({ mistake: m.mistake, correction: m.correction }));

  // cueHierarchy: most-important cue first (the pattern's lead tip), then equipment, then the rest.
  const cueHierarchy = [...bank.tips.slice(0, 1), ...(eqTip ? [eqTip] : []), ...bank.tips.slice(1)];

  // ROM note — reference the exercise's own primary muscle when available (distinctiveness).
  let rangeOfMotionNotes = bank.rom;
  if (rangeOfMotionNotes && node.primaryNames.length) {
    rangeOfMotionNotes += ` Take the ${lower(oxford(node.primaryNames))} through their full working range each rep.`;
  }

  // spotting — only when genuinely relevant.
  const spotting = needsSpotting(node);
  const spottingNotes = spotting
    ? `Use a spotter or set safety pins when the load is heavy on this ${phrase}, so you can bail a failed rep safely.`
    : null;

  // safety — only for higher-risk / loaded patterns (kept non-medical).
  const safetyNotes = [];
  const risk = classifyRisk(node);
  const loadedSpine = node.equipmentId === 'barbell'
    && (node.movementPattern === 'Squat / Knee Dominant' || node.movementPattern === 'Hinge / Hip Dominant' || node.movementPattern === 'Vertical Push');
  if (risk !== 'Standard' || loadedSpine) safetyNotes.push('Reduce the load if you lose control of the movement.');
  if (risk !== 'Standard' || loadedSpine) safetyNotes.push('Stop the set if you feel sharp pain.');
  if (node.movementPattern === 'Power / Plyometric') safetyNotes.push('When you fatigue, step down rather than jumping down between reps.');

  // difficulty considerations
  const difficultyConsiderations = node.difficulty === 'Advanced'
    ? `This is an advanced ${phrase}; build the skill and control on easier variations before loading it heavily.`
    : node.difficulty === 'Beginner'
      ? `This ${phrase} is approachable for newer athletes and a good place to build the pattern.`
      : `Progress the load on this ${phrase} gradually as your control improves.`;

  // beginner / advanced
  const beginnerNotes = [...bank.beginner];
  const advancedCoachingNotes = [...bank.advanced];

  // equipmentSetup field: the equipment line (or null for trivial bodyweight).
  const equipmentSetup = eqSetup;

  return {
    setupInstructions,
    executionSteps,
    coachingTips,
    commonMistakes,
    mistakeCorrections,
    breathingGuidance: bank.breathing ?? null,
    tempoGuidance: bank.tempo ?? null,
    rangeOfMotionNotes: rangeOfMotionNotes ?? null,
    cueHierarchy,
    advancedCoachingNotes,
    beginnerNotes,
    equipmentSetup,
    spottingNotes,
    safetyNotes,
    difficultyConsiderations,
    coachNotes: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence engine (0–100, editorial only)
// ─────────────────────────────────────────────────────────────────────────────

const round1 = (x) => Math.round(x * 10) / 10;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** Deterministic 0–100 confidence. Higher = safer to auto-validate. Users never see it. */
export function confidence(node, risk = classifyRisk(node)) {
  let s = 100;
  // movement complexity
  if (risk === 'Specialist') s -= 30;
  else if (risk === 'Technical') s -= 8;
  if (node.difficulty === 'Advanced') s -= 8;
  // metadata quality
  if (node.movementPattern === 'Other') s -= 30;
  const muscleExpected = !MUSCLELESS_PATTERNS.has(node.movementPattern) && node.movementPattern !== 'Other';
  if (muscleExpected && node.realPrimary.size === 0) s -= 15;
  if (node.primaryWithSystem.size > 0 && node.realPrimary.size === 0 && muscleExpected) s -= 5;
  // equipment ambiguity
  if (UNUSUAL_EQUIPMENT.has(node.equipmentId)) s -= 6;
  // exercise rarity
  if (node.familyPeers <= 1) s -= 6;
  if (node.patternPeers <= 3) s -= 4;
  // relationship quality
  if (node.relCount === 0) s -= 10;
  else if (node.relCount <= 2) s -= 4;
  return round1(clamp(s, 0, 100));
}

// ─────────────────────────────────────────────────────────────────────────────
// Text ↔ metadata contradiction detection (shared by flag engine + validator)
// ─────────────────────────────────────────────────────────────────────────────

const BANNED_GENERIC = [
  'use good form', 'good form', 'engage your core', 'keep your posture', 'keep good posture',
  'maintain proper form', 'proper form', 'be careful',
];

const allText = (content) => [
  ...content.setupInstructions, ...content.executionSteps, ...content.coachingTips,
  ...content.commonMistakes, ...content.mistakeCorrections.map((c) => c.correction),
  ...content.cueHierarchy, ...content.beginnerNotes, ...content.advancedCoachingNotes,
  ...content.safetyNotes,
  content.breathingGuidance, content.tempoGuidance, content.rangeOfMotionNotes,
  content.equipmentSetup, content.spottingNotes, content.difficultyConsiderations,
].filter(Boolean).join(' \n ').toLowerCase();

/**
 * Detect contradictions between a content body and the exercise's metadata.
 * `tier: 'violation'` = a definite contradiction (validator VIOLATION).
 * `tier: 'warn'` = a heuristic suspicion from weak signals like name-derived
 * body position (validator WARN; still raised as a review flag).
 * @returns array of { code, detail, tier }.
 */
export function detectContradictions(node, content) {
  const out = [];
  const text = allText(content);
  // standing/seated
  const saysSeated = /\bseated\b|\bsit(ting)?\b/.test(text);
  const saysStanding = /\bstand(ing)?\b|\bstand tall\b/.test(text);
  if (saysSeated && saysStanding) out.push({ code: 'STANDING_SEATED_CONTRADICTION', tier: 'violation', detail: 'Coaching text describes both seated and standing execution.' });
  else if (node.position === 'seated' && saysStanding) out.push({ code: 'STANDING_SEATED_CONTRADICTION', tier: 'warn', detail: `Name implies a seated exercise but text uses standing language (${node.id}) — verify.` });
  // machine / free-weight. Note: the Smith machine legitimately uses a bar, so
  // only a SELECTORIZED machine referencing barbell language is a real mismatch.
  const saysMachine = /\bmachine\b|\bthe pin\b|\bseat pad\b/.test(text);
  const saysBarbell = /\bbarbell\b|\bthe bar\b/.test(text);
  if (node.isFreeWeight && saysMachine) out.push({ code: 'MACHINE_FREEWEIGHT_MISMATCH', tier: 'violation', detail: `Free-weight exercise ${node.id} references machine setup language.` });
  if (node.equipmentId === 'selectorized_machine' && saysBarbell) out.push({ code: 'MACHINE_FREEWEIGHT_MISMATCH', tier: 'violation', detail: `Selectorized-machine exercise ${node.id} references barbell language.` });
  // movement pattern mismatch — text names a foreign pattern verb
  const foreignVerbs = {
    'Elbow Flexion': ['press overhead', 'squat down'],
    'Squat / Knee Dominant': ['curl the'],
  };
  const fv = foreignVerbs[node.movementPattern] ?? [];
  for (const v of fv) if (text.includes(v)) out.push({ code: 'MOVEMENT_PATTERN_MISMATCH', tier: 'violation', detail: `Text uses "${v}" which conflicts with pattern ${node.movementPattern}.` });
  return out;
}

/** Banned generic phrases present in a content body (validator + generator guard). */
export function bannedPhrases(content) {
  const text = allText(content);
  return BANNED_GENERIC.filter((p) => text.includes(p));
}

// ─────────────────────────────────────────────────────────────────────────────
// Review-flag engine
// ─────────────────────────────────────────────────────────────────────────────

const flag = (code, severity, detail) => ({ code, severity, detail });

/** Compute the automatic review flags for a node + content body + confidence. */
export function computeFlags(node, content, conf, risk = classifyRisk(node)) {
  const flags = [];
  const id = node.id.toLowerCase();

  if (has(id, OLYMPIC_TOKENS)) flags.push(flag('OLYMPIC_LIFT', 'block', 'Olympic lift — requires expert technical review.'));
  else if (has(id, GYMNASTICS_TOKENS)) flags.push(flag('ADVANCED_GYMNASTICS', 'block', 'Advanced gymnastics skill — requires expert review.'));
  else if (has(id, STRONGMAN_TOKENS)) flags.push(flag('STRONGMAN', 'block', 'Strongman implement — requires specialist review.'));
  else if (risk === 'Specialist') flags.push(flag('SPECIALIST_TIER', 'warn', 'Specialist-tier movement — human review required.'));

  if (risk === 'Technical') flags.push(flag('TECHNICAL_TIER', 'info', 'Technical-tier movement — human review recommended.'));
  if (content.spottingNotes) flags.push(flag('SPOTTING_REQUIRED', 'info', 'Spotting guidance present — verify accuracy.'));

  // metadata inconsistency
  if (node.movementPattern === 'Other') flags.push(flag('METADATA_INCONSISTENCY', 'warn', 'movementPattern is "Other" — coaching cannot be pattern-specific.'));
  const overlap = [...node.realPrimary].some((m) => node.realSecondary.has(m));
  if (overlap) flags.push(flag('METADATA_INCONSISTENCY', 'warn', 'Same muscle listed as both primary and secondary.'));

  // ambiguous setup
  const setupExpected = node.isMachine || node.isCable || node.equipmentId === 'resistance_band' || node.equipmentId === 'suspension_trainer';
  if (setupExpected && !content.equipmentSetup) flags.push(flag('AMBIGUOUS_SETUP', 'warn', 'Equipment expects a setup step but none is present.'));

  if (UNUSUAL_EQUIPMENT.has(node.equipmentId)) flags.push(flag('UNUSUAL_EQUIPMENT', 'info', `Unusual equipment (${node.equipmentId}) — verify setup fits.`));
  if (node.relCount === 0) flags.push(flag('ZERO_RELATIONSHIPS', 'info', 'No relationship edges — sparse metadata neighbourhood.'));

  // sparse content
  if (content.executionSteps.length < 2 || content.coachingTips.length < 2 || content.commonMistakes.length < 1)
    flags.push(flag('SPARSE_CONTENT', 'warn', 'Content body is unusually sparse.'));

  // contradictions
  for (const c of detectContradictions(node, content)) flags.push(flag(c.code, 'warn', c.detail));

  // low confidence (last, so it reflects the final score)
  if (conf < LOW_CONFIDENCE_THRESHOLD) flags.push(flag('LOW_CONFIDENCE', 'warn', `Confidence ${conf} < ${LOW_CONFIDENCE_THRESHOLD}.`));

  return flags;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic content hash (idempotency + change detection)
// ─────────────────────────────────────────────────────────────────────────────

/** FNV-1a 32-bit hex hash of the stable-serialised content body (metadata excluded). */
export function contentHash(content) {
  const stable = JSON.stringify({
    setupInstructions: content.setupInstructions,
    executionSteps: content.executionSteps,
    coachingTips: content.coachingTips,
    commonMistakes: content.commonMistakes,
    mistakeCorrections: content.mistakeCorrections,
    breathingGuidance: content.breathingGuidance,
    tempoGuidance: content.tempoGuidance,
    rangeOfMotionNotes: content.rangeOfMotionNotes,
    cueHierarchy: content.cueHierarchy,
    advancedCoachingNotes: content.advancedCoachingNotes,
    beginnerNotes: content.beginnerNotes,
    equipmentSetup: content.equipmentSetup,
    spottingNotes: content.spottingNotes,
    safetyNotes: content.safetyNotes,
    difficultyConsiderations: content.difficultyConsiderations,
    coachNotes: content.coachNotes,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < stable.length; i++) {
    h ^= stable.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow state machine
// ─────────────────────────────────────────────────────────────────────────────

export const WORKFLOW = {
  transitions: {
    Draft: ['Auto-Validated', 'Needs Review'],
    'Auto-Validated': ['Needs Review', 'Approved'],
    'Needs Review': ['Approved', 'Draft'],
    Approved: ['Published', 'Needs Review'],
    Published: ['Needs Review'],
  },
  /** Transitions automation is allowed to perform (no human identity required). */
  automatable: new Set(['Draft>Auto-Validated', 'Draft>Needs Review', 'Auto-Validated>Needs Review']),
  /** Transitions that REQUIRE a human actor. */
  humanOnly: new Set(['Auto-Validated>Approved', 'Needs Review>Approved', 'Approved>Published']),
};

export function canTransition(from, to) {
  return (WORKFLOW.transitions[from] ?? []).includes(to);
}

/**
 * Apply a workflow transition. `Approved`/`Published` require `actor` + `isHuman`.
 * Automation must never request a human-only transition. Mutates and returns a
 * NEW record (does not mutate the input), appending a history entry.
 */
export function transition(record, to, { actor, isHuman = false, note, now } = {}) {
  const from = record.contentStatus;
  if (!canTransition(from, to)) throw new Error(`illegal transition ${from} → ${to} for ${record.exerciseId}`);
  const key = `${from}>${to}`;
  if (WORKFLOW.humanOnly.has(key)) {
    if (!isHuman || !actor) throw new Error(`transition ${key} is human-only and requires an actor (${record.exerciseId})`);
  }
  const ts = now ?? new Date().toISOString();
  const next = { ...record, contentStatus: to, updatedAt: ts };
  const action = to === 'Approved' ? 'approved' : to === 'Published' ? 'published' : to === 'Needs Review' ? 'reviewed' : 'validated';
  if (to === 'Approved') { next.reviewedBy = actor ?? record.reviewedBy; next.approvedBy = actor; next.approvedAt = ts; }
  next.history = [...record.history, { version: record.contentVersion, action, at: ts, actor: actor ?? GENERATOR_VERSION, note }];
  return next;
}

/** The status a freshly-built/validated record should rest at (automation only). */
export function routeStatus(node, content, conf, flags, risk = classifyRisk(node)) {
  // Any structurally invalid body stays Draft — caller decides validity.
  if (risk === 'Specialist') return 'Needs Review';
  if (flags.some((f) => f.severity === 'block')) return 'Needs Review';
  if (risk === 'Technical') return 'Needs Review';
  if (conf < REVIEW_CONFIDENCE_THRESHOLD) return 'Needs Review';
  if (flags.some((f) => f.severity === 'warn')) return 'Needs Review';
  return 'Auto-Validated';
}

// ─────────────────────────────────────────────────────────────────────────────
// Record assembly
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a complete coaching record for a node. Deterministic given `now`.
 * Automation NEVER produces Approved/Published — the highest automation can emit
 * is Auto-Validated (clean) or Needs Review (flagged / low-confidence / risky).
 */
export function buildRecord(node, { now = '1970-01-01T00:00:00.000Z' } = {}) {
  const risk = classifyRisk(node);
  const content = composeContent(node);
  const conf = confidence(node, risk);
  const flags = computeFlags(node, content, conf, risk);
  const status = routeStatus(node, content, conf, flags, risk);
  const hash = contentHash(content);
  return {
    exerciseId: node.id,
    locale: 'en',
    ...content,
    reviewFlags: flags,
    riskTier: risk,
    confidenceScore: conf,
    contentStatus: status,
    source: 'Auto-Generated',
    contentVersion: 1,
    schemaVersion: COACHING_SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    contentHash: hash,
    generatedAt: now,
    updatedAt: now,
    reviewedBy: null,
    approvedBy: null,
    approvedAt: null,
    history: [{ version: 1, action: 'generated', at: now, actor: GENERATOR_VERSION }],
  };
}

/**
 * Regenerate content for an existing record without clobbering human work.
 * If the content hash is unchanged → returns the record untouched (idempotent).
 * If the record was human-edited/approved → returns it untouched (never overwrite).
 * Otherwise bumps contentVersion, refreshes body/flags/status, appends history.
 */
export function regenerateRecord(node, existing, { now = '1970-01-01T00:00:00.000Z' } = {}) {
  if (existing.source === 'Editor-Edited') return existing;
  if (existing.contentStatus === 'Approved' || existing.contentStatus === 'Published') return existing;
  const fresh = buildRecord(node, { now });
  if (fresh.contentHash === existing.contentHash) return existing; // no material change
  const version = existing.contentVersion + 1;
  return {
    ...fresh,
    contentVersion: version,
    generatedAt: existing.generatedAt,
    updatedAt: now,
    history: [...existing.history, { version, action: 'regenerated', at: now, actor: GENERATOR_VERSION }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Similarity detection (accidental copy-paste across DIFFERENT exercises)
// ─────────────────────────────────────────────────────────────────────────────

const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'your', 'you', 'as', 'at', 'in', 'on', 'for', 'with', 'it', 'is', 'be', 'each', 'rep', 'reps']);

/** Normalised token set of the coaching prose (used for near-duplicate detection). */
export function signatureTokens(record) {
  const text = allText(record);
  return new Set(text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)));
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Flag pairs of records whose coaching is near-identical AND that are genuinely
 * different exercises (different family, no shared real primary muscle). Shared
 * FAMILY language is acceptable and is NOT flagged. Grouped by movement pattern
 * to stay tractable. Deterministic.
 * @returns Map<exerciseId, Array<{ other, similarity }>>
 */
export function detectDuplicates(records, index, threshold = DUPLICATE_SIMILARITY_THRESHOLD) {
  const byId = index.byId;
  const sig = new Map(records.map((r) => [r.exerciseId, signatureTokens(r)]));
  const groups = new Map();
  for (const r of records) {
    const p = byId.get(r.exerciseId)?.movementPattern ?? 'Other';
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(r);
  }
  const result = new Map();
  const push = (id, other, similarity) => {
    if (!result.has(id)) result.set(id, []);
    result.get(id).push({ other, similarity: round1(similarity * 100) });
  };
  for (const list of groups.values()) {
    const sorted = list.slice().sort((a, b) => (a.exerciseId < b.exerciseId ? -1 : 1));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]; const b = sorted[j];
        const na = byId.get(a.exerciseId); const nb = byId.get(b.exerciseId);
        if (!na || !nb) continue;
        const sameFamily = na.family === nb.family;
        const sharedMuscle = [...na.realPrimary].some((m) => nb.realPrimary.has(m));
        if (sameFamily) continue; // shared family language is acceptable
        const s = jaccard(sig.get(a.exerciseId), sig.get(b.exerciseId));
        if (s >= threshold && !sharedMuscle) {
          push(a.exerciseId, b.exerciseId, s);
          push(b.exerciseId, a.exerciseId, s);
        }
      }
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration projection (UI-safe; strips ALL editorial fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Project a record onto the UI-facing view. Returns null when the record is not
 * user-visible (only Published content is served). NEVER leaks confidence,
 * flags, status, risk tier, coach notes, or corrections.
 */
export function projectToView(record, { requireStatus = 'Published' } = {}) {
  if (requireStatus && record.contentStatus !== requireStatus) return null;
  return {
    exerciseId: record.exerciseId,
    instructions: [...record.setupInstructions, ...record.executionSteps],
    tips: record.cueHierarchy.length ? [...record.cueHierarchy] : [...record.coachingTips],
    commonMistakes: [...record.commonMistakes],
    safetyNotes: [...record.safetyNotes],
    advancedNotes: [...record.advancedCoachingNotes],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Whole-catalog materialisation (shared by validate/report --dry-run and tests)
// ─────────────────────────────────────────────────────────────────────────────

/** Add DUPLICATE_WORDING flags (+ re-route status) for automation-owned records. */
export function applyDuplicateFlags(records, index) {
  const dupes = detectDuplicates(records, index);
  for (const r of records) {
    const hits = dupes.get(r.exerciseId);
    if (!hits || !hits.length) continue;
    if (r.reviewFlags.some((f) => f.code === 'DUPLICATE_WORDING')) continue;
    if (r.source === 'Editor-Edited' || r.contentStatus === 'Approved' || r.contentStatus === 'Published') continue;
    const top = hits.slice().sort((a, b) => b.similarity - a.similarity)[0];
    r.reviewFlags = [...r.reviewFlags, { code: 'DUPLICATE_WORDING', severity: 'warn', detail: `~${top.similarity}% identical wording to ${top.other}.` }];
    r.contentStatus = routeStatus(index.byId.get(r.exerciseId), r, r.confidenceScore, r.reviewFlags, r.riskTier);
  }
  return records;
}

/**
 * Generate a coaching record for EVERY catalog exercise, in memory, with the
 * cross-record duplicate pass applied. Deterministic given `now`. Used by the
 * dry-run tooling and the test suite; it never writes or persists anything.
 */
export function generateAll(index, { now = '1970-01-01T00:00:00.000Z' } = {}) {
  const records = index.ids.map((id) => buildRecord(index.byId.get(id), { now }));
  return applyDuplicateFlags(records, index);
}
