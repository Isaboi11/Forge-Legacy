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

export const COACHING_SCHEMA_VERSION = 2;
export const GENERATOR_VERSION = 'coach-gen@2';

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
// NOTE: no bare 'lever' — it matched `leverage-squat-machine`, a Beginner selectorized squat machine,
// and classified it as an advanced gymnastics skill requiring expert review. The specific lever holds
// are already listed explicitly.
const GYMNASTICS_TOKENS = ['planche', 'front-lever', 'back-lever', 'iron-cross', 'muscle-up',
  'handstand', 'skin-the-cat', 'human-flag', 'maltese'];
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

  // All regression & progression candidate edges per exercise, ranked best-first.
  const regEdges = new Map();
  const progEdges = new Map();
  for (const e of relationships) {
    const bucket = e.type === 'Regression' ? regEdges : e.type === 'Progression' ? progEdges : null;
    if (!bucket) continue;
    if (!bucket.has(e.sourceExerciseId)) bucket.set(e.sourceExerciseId, []);
    bucket.get(e.sourceExerciseId).push(e);
  }
  for (const list of regEdges.values()) list.sort((a, b) => a.rank - b.rank);
  for (const list of progEdges.values()) list.sort((a, b) => a.rank - b.rank);

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
    node.secondaryNames = [...node.realSecondary].map((m) => (muscleName.get(m) ?? m)).sort();
    node.regressionEdges = regEdges.get(ex.id) ?? [];
    node.progressionEdges = progEdges.get(ex.id) ?? [];
    node.isMachine = ex.equipmentId === 'selectorized_machine' || ex.equipmentId === 'smith_machine';
    node.isCable = ex.equipmentId === 'cable';
    node.isBodyweight = ex.equipmentId === 'bodyweight';
    node.isBand = ex.equipmentId === 'resistance_band';
    node.isFreeWeight = eq ? eq.category === 'Free Weight' : false;
    node.position = positionOf(node);
    byId.set(ex.id, node);
  }

  // Second pass (needs the full byId): pick the first ELIGIBLE regression/progression
  // candidate as coaching guidance; keep the eligibility result for editorial transparency.
  for (const node of byId.values()) {
    const reg = selectGuidance(node, node.regressionEdges, byId);
    const prog = selectGuidance(node, node.progressionEdges, byId);
    node.regressionTarget = reg.target;
    node.regressionEligibility = reg.eligibility;
    node.progressionTarget = prog.target;
    node.progressionEligibility = prog.eligibility;
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
      'Start with the resistance under control and your elbows fixed.'],
    execution: ['Straighten your elbows to a full lockout.',
      'Squeeze your triceps at full lockout.',
      'Bend your elbows under control back to the start.'],
    tips: ['Keep your elbows fixed and pointing forward the whole set.',
      'Lock out fully to finish each rep.',
      'Keep your upper arms still and move only at the elbow.'],
    mistakes: [
      { mistake: 'Letting the elbows flare and drift to recruit the shoulders.', correction: 'Keep your elbows tucked and pointing forward throughout.' },
      { mistake: 'Stopping short of a full lockout.', correction: 'Straighten your arms completely at the end of each rep.' },
      { mistake: 'Using body swing or momentum to move through the rep.', correction: 'Keep your torso still and move only at the elbow joint.' }],
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
      'Pause briefly where your midsection is working hardest.',
      'Control the return rather than dropping quickly at the end.'],
    tips: ['Move under control — no yanking or rushing the reps.',
      'Curl your ribs toward your hips rather than pulling with your neck.',
      'Keep the tension on your midsection, not your hip flexors or lower back.'],
    mistakes: [
      { mistake: 'Pulling on the neck or head to complete the rep.', correction: 'Keep your hands light and lead the movement from your midsection.' },
      { mistake: 'Rushing through reps with momentum.', correction: 'Slow each rep down and control both directions.' },
      { mistake: 'Arching the lower back away from a braced position.', correction: 'Keep your ribs down and your midsection tight through the whole rep.' }],
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
      'Keep the load from swinging by holding your sides tight.',
      'Set the load down under control at the end of the distance rather than dropping it.'],
    tips: ['Stand tall and walk with short, controlled steps.',
      'Keep the load steady rather than letting it swing.',
      'Keep your shoulders back and down for the full distance.'],
    mistakes: [
      { mistake: 'Leaning to one side under an uneven load.', correction: 'Stay stacked and tall, resisting the pull to one side.' },
      { mistake: 'Taking long, rushed strides that let the load sway.', correction: 'Shorten your steps and keep a steady, controlled pace.' },
      { mistake: 'Rounding the shoulders forward under the load.', correction: 'Keep your chest up and your shoulders pulled back for the full distance.' }],
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
      'Keep your breathing matched to your pace throughout.',
      'Adjust your effort so the last minute feels as controlled as the first.'],
    tips: ['Settle into a cadence you can hold for the full effort.',
      'Breathe rhythmically and in time with your pace.',
      'Build the pace gradually rather than starting too hard.'],
    mistakes: [
      { mistake: 'Starting too fast and fading in the second half.', correction: 'Open at a pace you could hold to the end, then build.' },
      { mistake: 'Tensing the shoulders and upper body while working.', correction: 'Relax your hands, shoulders and face so the effort stays in your legs and lungs.' },
      { mistake: 'Letting the effort drift down whenever your attention wanders.', correction: 'Check your pace regularly and hold it steady to the end.' }],
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
      'Absorb the landing or return softly through your hips and knees.',
      'Reset to a stable, balanced position before the next rep.'],
    tips: ['Be explosive on the way up and controlled on the way down.',
      'Land softly on your mid-foot, absorbing through your hips and knees.',
      'Reset fully between reps rather than rushing the next one.'],
    mistakes: [
      { mistake: 'Landing stiff-legged with a hard, loud impact.', correction: 'Land quietly and let your hips and knees bend to absorb the force.' },
      { mistake: 'Rushing reps and losing power output.', correction: 'Take a full reset between reps so each one is maximally explosive.' },
      { mistake: 'Letting the knees collapse inward on landing.', correction: 'Land with your knees tracking over your toes and your hips back.' }],
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
      'Ease slightly deeper on each exhale.',
      'Hold the end position briefly, then return smoothly to the start.'],
    tips: ['Move to the first point of tension rather than into pain.',
      'Breathe out as you ease a little deeper into the range.',
      'Move smoothly and slowly rather than bouncing.'],
    mistakes: [
      { mistake: 'Forcing or bouncing into an end range.', correction: 'Move slowly to gentle tension and let it ease with your breath.' },
      { mistake: 'Holding your breath while you hold the position.', correction: 'Keep breathing slowly and let each exhale ease you a little deeper.' },
      { mistake: 'Snapping quickly from one rep to the next.', correction: 'Move slowly into and out of each repetition.' }],
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
      'Pause for a beat at the top.',
      'Lower under control until you feel a full stretch through your calves.'],
    tips: ['Rise as high onto your toes as possible at the top.',
      'Lower under control into a full stretch at the bottom.',
      'Pause briefly at the top to remove any bounce.'],
    mistakes: [
      { mistake: 'Bouncing through short, fast reps.', correction: 'Pause at the top and control a full stretch at the bottom.' },
      { mistake: 'Cutting the stretch short at the bottom.', correction: 'Let your heels drop below the platform for a full stretch.' },
      { mistake: 'Letting the ankles roll outward as you rise.', correction: 'Drive evenly through your big toe and keep your ankles stacked.' }],
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
      'Squeeze the working glute at the end of each rep.',
      'Lower the leg under control back to the start without resting.'],
    tips: ['Squeeze the working glute at the top of each rep for a beat.',
      'Keep your torso still and move only at the hip.',
      'Control the return rather than letting the leg drop.'],
    mistakes: [
      { mistake: 'Twisting the torso to swing the leg higher.', correction: 'Keep your hips and torso square and move only at the working hip.' },
      { mistake: 'Rushing reps and losing the glute contraction.', correction: 'Slow down and pause to feel the working glute at the top.' },
      { mistake: 'Arching the lower back to gain more range.', correction: 'Keep your lower back flat and move only as far as the hip allows.' }],
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
      'Pause briefly at the top.',
      'Lower the load under control to the start.'],
    tips: ['Lead with your elbows and stop at shoulder height.',
      'Keep a soft, fixed bend in your elbows throughout.',
      'Lower under control rather than dropping the load.'],
    mistakes: [
      { mistake: 'Swinging the load up with the torso.', correction: 'Keep your torso still and raise the load with your shoulders, not momentum.' },
      { mistake: 'Raising the load well above shoulder height and shrugging.', correction: 'Stop at shoulder height and keep your traps relaxed.' },
      { mistake: 'Letting the wrists roll or drop under the load.', correction: 'Keep your wrists flat and level with your forearms throughout.' }],
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
      'Pause briefly at the end of the range.',
      'Return under control to the start.'],
    tips: ['Move slowly through a comfortable range.',
      'Use light resistance and controlled reps.',
      'Keep the rest of your body relaxed and still.'],
    mistakes: [
      { mistake: 'Using heavy resistance and jerky reps.', correction: 'Reduce the load and move slowly through a pain-free range.' },
      { mistake: 'Letting the rest of the body move to help the neck.', correction: 'Keep your shoulders and torso still and move only at the neck.' },
      { mistake: 'Pushing into a range that pinches or feels sharp.', correction: 'Work only through a smooth, comfortable range.' }],
    breathing: 'Breathe steadily throughout each rep.',
    tempo: 'Move slowly and under full control in both directions.',
    rom: 'Work through a comfortable, pain-free range only.',
    beginner: ['Start with the lightest resistance and build slowly.'],
    advanced: ['Progress resistance gradually while keeping reps slow and controlled.'],
  },
  'Other': {
    setup: ['Set a stable starting position appropriate to the movement.',
      'Take up any slack and set your position before the first rep.'],
    execution: ['Move through the intended range under control from start to finish.',
      'Keep the working muscles under tension rather than using momentum.',
      'Return to the start under control before the next repetition.'],
    tips: ['Move under control through the full range of the movement.',
      'Keep your torso stable unless the movement itself requires it to move.',
      'Match your effort and range on both sides if the movement works one side at a time.'],
    mistakes: [
      { mistake: 'Rushing the movement and losing control of the load or your body.', correction: 'Slow each repetition down and control both directions.' },
      { mistake: 'Using a swing or momentum to get through the hardest point.', correction: 'Move deliberately and let the working muscles do the work.' },
      { mistake: 'Shortening the range to complete more repetitions.', correction: 'Work the full intended range on every rep, even if it means fewer reps.' }],
    breathing: 'Breathe steadily and exhale on the effort.',
    tempo: 'Move under control throughout.',
    rom: null,
    beginner: ['Start light and learn the movement before adding intensity.'],
    advanced: ['Add load or range only once the movement is well controlled.'],
  },
};

/**
 * Metadata-specific coaching bank for hamstring LEG CURLS (knee flexion).
 *
 * The canonical catalog categorises leg curls & hamstring nordic curls under
 * movementPattern "Elbow Flexion" (a name-based miscategorisation — they are
 * knee-flexion hamstring movements, not arm curls). Rather than edit the
 * canonical data, the generator detects them by (pattern = Elbow Flexion AND
 * primary muscle = hamstrings) and coaches them correctly. The underlying
 * catalog miscategorisation is reported for a separate data-correction decision.
 */
const KNEE_FLEXION_BANK = {
  setup: ['Set the pad or ankle strap just above your heels with your legs straight.',
    'Take up the slack and start with your knees straight and the resistance under control.'],
  execution: ['Curl your heels toward your glutes by bending your knees.',
    'Squeeze your hamstrings hard at the top of the curl.',
    'Lower under control until your legs are straight.'],
  tips: ['Curl by bending at the knees while keeping your hips still.',
    'Squeeze your hamstrings at the top for a beat.',
    'Lower all the way until your knees are straight each rep.'],
  mistakes: [
    { mistake: 'Letting the hips rise or the pelvis tilt to gain more range.', correction: 'Keep your hips pinned down and move only at the knees.' },
    { mistake: 'Cutting the curl short of a full hamstring squeeze.', correction: 'Curl your heels as close to your glutes as your range allows.' },
    { mistake: 'Lowering too quickly on the way down.', correction: 'Lower under control until your knees are straight.' }],
  breathing: 'Exhale as you curl your heels in, breathe in as you lower.',
  tempo: 'Curl with intent and lower for about two counts.',
  rom: 'Move from fully straight knees to a hard hamstring squeeze.',
  beginner: ['Use a light resistance you can curl without your hips lifting.'],
  advanced: ['Slow the lowering phase to three counts for extra hamstring tension.'],
};

/**
 * Metadata-specific bank for LEG EXTENSIONS (single-joint knee extension). The
 * catalog buckets them under "Squat / Knee Dominant" (a knee-dominant grouping),
 * but a leg extension is a seated isolation, not a squat — the squat template
 * (hips + knees, stand up, feet on the floor) is wrong. Detected by name.
 */
const LEG_EXTENSION_BANK = {
  setup: ['Set the pad against the front of your lower shins and line your knees up with the pivot.',
    'Start with your knees bent and the resistance under control.'],
  execution: ['Straighten your knees to lift the resistance until your legs are nearly straight.',
    'Squeeze your quads hard at the top for a beat.',
    'Lower under control until your knees are bent back to the start.'],
  tips: ['Straighten your knees fully and squeeze your quads at the top.',
    'Move only at the knees — keep your hips and back against the seat.',
    'Lower under control rather than letting the weight drop.'],
  mistakes: [
    { mistake: 'Swinging or using momentum to fling the weight up.', correction: 'Move at a controlled speed and let your quads do the work.' },
    { mistake: 'Cutting the top short of a full knee extension.', correction: 'Straighten your knees fully and hold the squeeze for a beat.' },
    { mistake: 'Letting the weight slam down at the bottom.', correction: 'Lower under control until your knees are bent back to the start.' }],
  breathing: 'Exhale as you straighten your knees, breathe in as you lower.',
  tempo: 'Extend with control and lower for about two counts.',
  rom: 'Move from bent knees to a full, straight-knee squeeze.',
  beginner: ['Use a light weight you can control through the full range.'],
  advanced: ['Add a pause at full extension for a stronger quad contraction.'],
};

/**
 * Bodyweight coaching for the compound patterns. The loaded templates describe
 * moving an external load (e.g. "lower the load toward your chest"), which is
 * both wrong and mechanically inverted for calisthenics — a push-up lowers the
 * BODY to the floor, not a load to the chest. These body-appropriate banks are
 * used whenever a compound-pattern exercise is bodyweight (Product rule: never
 * describe a bodyweight exercise as externally loaded).
 */
const BODYWEIGHT_BANKS = {
  'Horizontal Push': {
    phrase: 'push-up',
    bank: {
      setup: ['Set your hands about shoulder-width, slightly wider than your chest.',
        'Set a straight line from your head to your heels and brace before you begin.'],
      execution: ['Lower your chest under control toward the floor.',
        'Keep your elbows tucked to about 45 degrees from your torso.',
        'Press back up until your arms are straight.'],
      tips: ['Keep a straight line from your head to your heels throughout.',
        'Tuck your elbows to about 45 degrees rather than flaring them wide.',
        'Lower until your chest is just off the floor for a full range.'],
      mistakes: [
        { mistake: 'Letting the hips sag toward the floor.', correction: 'Squeeze your glutes and keep a straight line from head to heels.' },
        { mistake: 'Flaring the elbows straight out to the sides.', correction: 'Point your elbows back toward your hips as you lower.' },
        { mistake: 'Only lowering partway before pressing back up.', correction: 'Lower until your chest is just off the floor each rep.' }],
      breathing: 'Breathe in as you lower, exhale as you press up.',
      tempo: 'Lower for about two counts, then press up with intent.',
      rom: 'Lower until your chest is just off the floor and press to straight arms.',
      beginner: ['Do the movement from your knees or with your hands on a raised surface until you can complete full reps.'],
      advanced: ['Elevate your feet or pause at the bottom to make it harder.'],
    },
  },
  'Squat / Knee Dominant': {
    phrase: 'squat',
    bank: {
      setup: ['Set your feet about shoulder-width with your toes turned out slightly.',
        'Set a tall chest and brace before you descend.'],
      execution: ['Break at the hips and knees together and lower under control.',
        'Descend until your thighs reach at least parallel to the floor.',
        'Drive through the middle of your foot to stand back up.'],
      tips: ['Keep your weight balanced over the middle of your foot.',
        'Let your knees track in line with your toes.',
        'Keep your chest up as you descend and stand.'],
      mistakes: [
        { mistake: 'Letting the knees cave inward.', correction: 'Push your knees out toward your little toes as you descend and stand.' },
        { mistake: 'Letting the heels lift off the floor.', correction: 'Keep your whole foot planted and your weight over the mid-foot.' },
        { mistake: 'Cutting the depth short above parallel.', correction: 'Lower until your hip crease drops below the top of your knee.' }],
      breathing: 'Breathe in on the way down, exhale as you stand.',
      tempo: 'Lower under control for about two counts, then stand with intent.',
      rom: 'Lower to at least thighs-parallel and stand up tall each rep.',
      beginner: ['Lower to a box or bench behind you to learn consistent depth.'],
      advanced: ['Slow the descent or add a pause at the bottom to increase the challenge.'],
    },
  },
  'Hinge / Hip Dominant': {
    phrase: 'hip hinge',
    bank: {
      setup: ['Set your feet about hip-width and set a flat back before you begin.',
        'Brace your midsection before the first rep.'],
      execution: ['Push your hips back and hinge your torso forward with a flat back.',
        'Feel your hamstrings stretch as your hips travel back.',
        'Drive your hips forward to stand tall and squeeze your glutes.'],
      tips: ['Push your hips back until you feel a stretch in your hamstrings.',
        'Keep your back flat from your head to your hips the whole way.',
        'Finish by squeezing your glutes, not by leaning back past standing.'],
      mistakes: [
        { mistake: 'Rounding the lower back as you hinge forward.', correction: 'Set a flat back and lead with your chest as you hinge.' },
        { mistake: 'Bending mostly at the knees instead of the hips.', correction: 'Send your hips backward first and keep your shins near vertical.' },
        { mistake: 'Leaning back and over-arching at the top.', correction: 'Stop when you are standing tall with your glutes squeezed.' }],
      breathing: 'Breathe in as you hinge, exhale as you stand tall.',
      tempo: 'Lower for about two counts, then drive up with intent.',
      rom: 'Hinge until you feel a hamstring stretch with a flat back, then stand tall.',
      beginner: ['Practice the hinge with your hands on your hips to groove a flat back.'],
      advanced: ['Slow the lowering phase or add a pause at the bottom of the hinge.'],
    },
  },
  'Horizontal Pull': {
    phrase: 'row',
    bank: {
      setup: ['Set your grip about shoulder-width and set a straight line from your head to your heels.',
        'Start with your arms straight and your shoulder blades reaching forward.'],
      execution: ['Pull your chest toward the bar or handles, leading with your elbows.',
        'Squeeze your shoulder blades back at the top.',
        'Lower under control until your arms are straight and your shoulder blades reach forward.'],
      tips: ['Lead with your elbows and drive them back past your ribs.',
        'Keep a straight line from your head to your heels throughout.',
        'Squeeze your shoulder blades together at the top of each rep.'],
      mistakes: [
        { mistake: 'Letting the hips sag so the body bends at the waist.', correction: 'Squeeze your glutes and keep a straight line from head to heels.' },
        { mistake: 'Shrugging the shoulders up toward the ears while pulling.', correction: 'Keep your shoulders down and pull your elbows back.' },
        { mistake: 'Cutting the pull short before the chest reaches the bar.', correction: 'Pull until your chest reaches the bar or handles.' }],
      breathing: 'Exhale as you pull up, breathe in as you lower.',
      tempo: 'Pull with intent, then lower for about two counts.',
      rom: 'Pull your chest to the bar and lower to straight arms each rep.',
      beginner: ['Raise the bar or walk your feet back to make the angle easier.'],
      advanced: ['Lower the bar or elevate your feet to increase the challenge.'],
    },
  },
};

/**
 * Metadata-specific bank for DIPS. The catalog tags dips (bench/parallel-bar/
 * straight-bar/machine/assisted) as "Horizontal Push", so they inherit
 * bench-press / push-up coaching. A dip is a vertical press — you lower your
 * body by bending the elbows and press back up — so it needs its own coaching.
 * Detected by name within Horizontal Push.
 */
const DIP_BANK = {
  setup: ['Support your weight on the handles or bars with your arms straight and your shoulders pulled down.',
    'Set a slight forward lean and brace before you lower.'],
  execution: ['Lower under control by bending your elbows until your upper arms are about parallel to the floor.',
    'Keep your elbows tracking back rather than flaring wide.',
    'Press back up until your arms are straight.'],
  tips: ['Lower until your upper arms reach about parallel to the floor.',
    'Keep your elbows tracking back over your wrists, not flaring out.',
    'Lean your torso forward slightly to bias the chest, or stay upright to bias the triceps.'],
  mistakes: [
    { mistake: 'Shrugging the shoulders up toward the ears at the bottom.', correction: 'Keep your shoulders pulled down and away from your ears throughout.' },
    { mistake: 'Only dipping a few inches instead of reaching depth.', correction: 'Lower until your upper arms are about parallel to the floor.' },
    { mistake: 'Letting the elbows flare wide as you press.', correction: 'Keep your elbows tracking back over your wrists.' }],
  breathing: 'Breathe in as you lower, exhale as you press up.',
  tempo: 'Lower for about two counts, then press up with intent.',
  rom: 'Lower until your upper arms are about parallel, then press to straight arms.',
  beginner: ['Use band or machine assistance, or keep the range shallow, until you can control full-depth reps.'],
  advanced: ['Add a pause at the bottom or progress the difficulty once you own full-depth reps.'],
};

/**
 * Metadata-specific bank for GLUTE BRIDGES & HIP THRUSTS. These are supine
 * hip-extension movements (drive the hips UP off the floor) but the catalog
 * groups them under "Hinge / Hip Dominant", so they inherit standing-hinge
 * coaching ("push your hips back and hinge forward") which is wrong. Detected by
 * name within the Hinge pattern.
 */
const HIP_THRUST_BANK = {
  setup: ['Set your upper back or shoulders as the pivot and your feet flat, about hip-width and close to your hips.',
    'Tuck your ribs down and brace before the first rep.'],
  execution: ['Drive through your heels to lift your hips until your body forms a straight line from shoulders to knees.',
    'Squeeze your glutes hard at the top for a beat.',
    'Lower your hips under control back toward the floor.'],
  tips: ['Drive through your heels, not your toes.',
    'Finish each rep by squeezing your glutes at the top, not by arching your lower back.',
    'Keep your ribs down and your chin slightly tucked so the work stays in your glutes.'],
  mistakes: [
    { mistake: 'Arching the lower back to push the hips higher.', correction: 'Stop at a straight line from shoulders to knees and squeeze your glutes.' },
    { mistake: 'Pushing through the toes so the heels lift.', correction: 'Keep your whole foot down and drive through your heels.' },
    { mistake: 'Rushing reps without a real glute squeeze at the top.', correction: 'Pause and squeeze your glutes hard at the top of each rep.' }],
  breathing: 'Exhale as you drive your hips up, breathe in as you lower.',
  tempo: 'Drive up with intent and lower under control for about two counts.',
  rom: 'Lift until your hips reach a straight shoulder-to-knee line, then lower under control.',
  beginner: ['Start with bodyweight and learn to feel your glutes doing the work before adding resistance.'],
  advanced: ['Add a pause at the top or increase the resistance once you own the movement.'],
};

const isDip = (id) => /(^|-)dip/.test(id) && !id.includes('hip');
const isHipThrust = (id) => /glute-bridge|hip-thrust/.test(id);
const isFacePull = (id) => /face-pull/.test(id);
const isShrug = (id) => /shrug/.test(id);
const isBackExtension = (id) => /back-extension|superman|roman-chair|glute-ham|hyperextension|reverse-hyper/.test(id);

/**
 * Metadata-specific bank for SHRUGS. The catalog groups them under "Shoulder
 * Isolation" alongside lateral/front raises, so they inherit "raise to shoulder
 * height" cues. A shrug is a straight-up trap movement, not a raise. Detected by
 * name within Shoulder Isolation.
 */
const SHRUG_BANK = {
  setup: ['Hold the load at arm’s length with your shoulders relaxed down.',
    'Set a tall spine and let your shoulders hang before the first rep.'],
  execution: ['Shrug your shoulders straight up toward your ears.',
    'Squeeze your traps hard at the top for a beat.',
    'Lower your shoulders under control to a full stretch.'],
  tips: ['Shrug straight up and down, not in a rolling circle.',
    'Squeeze your traps at the top for a beat.',
    'Let your shoulders drop into a full stretch at the bottom.'],
  mistakes: [
    { mistake: 'Rolling the shoulders in circles at the top.', correction: 'Shrug straight up and lower straight down.' },
    { mistake: 'Using the arms to curl or lift the load.', correction: 'Keep your arms straight and lift only by shrugging.' },
    { mistake: 'Cutting the range short with a shallow shrug.', correction: 'Shrug as high as you can and lower to a full stretch.' }],
  breathing: 'Exhale as you shrug up, breathe in as you lower.',
  tempo: 'Shrug up with intent and lower for about two counts.',
  rom: 'Move from a full shoulder stretch at the bottom to a full shrug at the top.',
  beginner: ['Use a load you can lift by shrugging alone, without swinging.'],
  advanced: ['Add a pause at the top of the shrug for a stronger contraction.'],
};

/**
 * Metadata-specific bank for BACK EXTENSIONS & prone posterior-chain raises
 * (back extension, roman chair, superman, glute-ham raise). The catalog groups
 * them under "Hinge / Hip Dominant", so they inherit standing-hinge cues ("push
 * your hips back… stand tall"), but here the torso raises from a forward bend to
 * a straight line. Detected by name within the Hinge pattern.
 */
const BACK_EXTENSION_BANK = {
  setup: ['Set your position so your torso can move from a forward bend to a straight line with your body.',
    'Set a flat back and brace your midsection before the first rep.'],
  execution: ['Raise your torso by extending your hips and lower back until your body forms a straight line.',
    'Squeeze your glutes at the top without arching past a straight line.',
    'Lower under control back to the start.'],
  tips: ['Move by extending your hips and back, not by swinging.',
    'Stop at a straight line — don’t arch past it.',
    'Control the lowering phase on the way back down.'],
  mistakes: [
    { mistake: 'Over-arching and hyperextending at the top.', correction: 'Stop when your body reaches a straight line and hold briefly.' },
    { mistake: 'Using momentum to swing the torso up.', correction: 'Raise under control by extending your hips and back.' },
    { mistake: 'Rounding the back on the way down instead of controlling it.', correction: 'Lower under control and keep your back set.' }],
  breathing: 'Exhale as you raise your torso, breathe in as you lower.',
  tempo: 'Raise with control and lower for about two counts.',
  rom: 'Move from a comfortable forward bend to a straight-line torso, without arching past it.',
  beginner: ['Start with bodyweight and a short range until you can control the movement.'],
  advanced: ['Add a pause at the top or a light load once you own the bodyweight movement.'],
};

/**
 * Metadata-specific bank for SEATED GOOD MORNINGS — a hip hinge performed seated
 * on a bench. The standing-hinge template ("stand up by driving your hips
 * forward") is wrong here; the athlete never stands. Detected by seated position
 * within the Hinge pattern.
 */
const SEATED_GOOD_MORNING_BANK = {
  setup: ['Sit tall on the bench with your feet flat and the load set across your upper back.',
    'Set a flat back and brace your midsection before you begin.'],
  execution: ['Hinge forward at the hips, lowering your chest toward your thighs with a flat back.',
    'Lower as far as you can while keeping your lower back flat.',
    'Extend at the hips to bring your torso back to upright.'],
  tips: ['Move at the hips, not by rounding your spine.',
    'Keep your back flat from your head to your hips the whole way.',
    'Only lower as far as you can hold a flat back.'],
  mistakes: [
    { mistake: 'Rounding the lower back as you lean forward.', correction: 'Keep a flat back and hinge only as far as you can hold it.' },
    { mistake: 'Bouncing at the bottom of the lean.', correction: 'Lower under control and reverse smoothly from the bottom.' },
    { mistake: 'Turning it into a spinal crunch instead of a hip hinge.', correction: 'Lead the movement from your hips with your chest proud.' }],
  breathing: 'Breathe in as you hinge forward, exhale as you return to upright.',
  tempo: 'Lower for about two to three counts, then return under control.',
  rom: 'Hinge until you feel a stretch with a flat back, then return to sitting tall.',
  beginner: ['Use a light load and a short range until you can keep a flat back throughout.'],
  advanced: ['Increase the range or load only while your back stays flat.'],
};

/**
 * Metadata-specific bank for FACE PULLS. The catalog groups them under
 * "Horizontal Pull", so they inherit rowing cues ("pull to your lower ribs").
 * A face pull is a high pull toward the face with external rotation, biasing the
 * rear delts and upper back. Detected by name within Horizontal Pull.
 */
const FACE_PULL_BANK = {
  setup: ['Set the anchor at about head height and grip with your thumbs pointing back toward you.',
    'Start with your arms straight out in front of your face and your shoulders down.'],
  execution: ['Pull toward your forehead, driving your elbows high and back.',
    'Rotate your hands so your knuckles finish pointing behind you as your shoulder blades squeeze together.',
    'Return under control until your arms are straight and your shoulder blades reach forward.'],
  tips: ['Pull toward your face or forehead, not down toward your hips.',
    'Drive your elbows high and back, keeping them level with or above your hands.',
    'Finish by squeezing your shoulder blades together and rotating your knuckles back.'],
  mistakes: [
    { mistake: 'Rowing the handle down toward the chest or hips.', correction: 'Pull high toward your face and keep your elbows up.' },
    { mistake: 'Heaving a heavy load with the whole body.', correction: 'Lighten the resistance and pull with your rear shoulders and upper back.' },
    { mistake: 'Letting the elbows drop below the hands.', correction: 'Keep your elbows high, level with or above your hands.' }],
  breathing: 'Exhale as you pull toward your face, breathe in as you return.',
  tempo: 'Pull with control and return for about two counts.',
  rom: 'Pull until your hands reach either side of your forehead, then return to straight arms.',
  beginner: ['Use a light resistance so you can keep your elbows high and control the movement.'],
  advanced: ['Add a pause at the fully squeezed position before returning.'],
};

/**
 * Select the coaching bank + human phrase for a node, applying metadata-specific
 * overrides where a canonical pattern label would otherwise produce wrong
 * coaching:
 *   • Elbow Flexion + hamstrings primary        → leg-curl (knee-flexion) bank.
 *   • Squat/Knee + "leg-extension" name          → knee-extension isolation bank.
 *   • Horizontal Push + "dip" name               → dip (vertical press) bank.
 *   • Hinge + "glute-bridge"/"hip-thrust" name   → supine hip-extension bank.
 *   • Hinge + back-extension/superman/GHD name   → prone posterior-chain raise bank.
 *   • Hinge + seated position                    → seated good-morning bank.
 *   • Horizontal Pull + "face-pull" name         → face-pull (high pull) bank.
 *   • Shoulder Isolation + "shrug" name          → shrug (straight-up trap) bank.
 *   • bodyweight compound pattern                → body-appropriate (non-"load") bank.
 */
function selectProfile(node) {
  const p = node.movementPattern;
  if (p === 'Elbow Flexion' && node.realPrimary.has('hamstrings')) {
    return { bank: KNEE_FLEXION_BANK, phrase: 'leg curl' };
  }
  if (p === 'Squat / Knee Dominant' && /leg-extension/.test(node.id)) {
    return { bank: LEG_EXTENSION_BANK, phrase: 'leg extension' };
  }
  if (p === 'Horizontal Push' && isDip(node.id)) {
    return { bank: DIP_BANK, phrase: 'dip' };
  }
  if (p === 'Hinge / Hip Dominant' && isHipThrust(node.id)) {
    return { bank: HIP_THRUST_BANK, phrase: 'hip thrust' };
  }
  if (p === 'Hinge / Hip Dominant' && isBackExtension(node.id)) {
    return { bank: BACK_EXTENSION_BANK, phrase: 'back extension' };
  }
  if (p === 'Hinge / Hip Dominant' && node.position === 'seated') {
    return { bank: SEATED_GOOD_MORNING_BANK, phrase: 'seated good morning' };
  }
  if (p === 'Horizontal Pull' && isFacePull(node.id)) {
    return { bank: FACE_PULL_BANK, phrase: 'face pull' };
  }
  if (p === 'Shoulder Isolation' && isShrug(node.id)) {
    return { bank: SHRUG_BANK, phrase: 'shrug' };
  }
  if (node.isBodyweight && BODYWEIGHT_BANKS[p]) {
    return BODYWEIGHT_BANKS[p];
  }
  return {
    bank: PATTERN_BANK[p] ?? PATTERN_BANK.Other,
    phrase: PATTERN_PHRASE[p] ?? 'movement',
  };
}

/** Equipment-specific setup line (feeds `equipmentSetup`), or null when trivial. */
function equipmentSetupLine(node) {
  switch (node.equipmentId) {
    case 'selectorized_machine':
      return 'Adjust the seat and any pads so the working joint lines up with the machine’s pivot, set the pin to your working weight, and keep contact with the support pad throughout.';
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
    case 'cardio': {
      // The `cardio` tag covers "Cardio Equipment / Outdoors" — both an erg and a hill sprint. Telling
      // someone to "set the machine" before a trail run is nonsense, so only machine-based work gets
      // the machine line; everything else falls through to its movement coaching.
      const id = String(node.id ?? '').toLowerCase();
      const MACHINE = ['treadmill', 'rower', 'row-erg', 'erg', 'bike', 'cycle', 'elliptical', 'stair', 'ski', 'assault', 'arm-ergometer'];
      return MACHINE.some((m) => id.includes(m))
        ? 'Set the machine to your working effort and settle into a rhythm before pushing.'
        : null;
    }
    default:
      return null;
  }
}

/** Equipment-flavoured coaching tip that keeps each record distinct. */
function equipmentTip(node) {
  if (node.equipmentId === 'smith_machine') return 'The bar is locked to the rails, so drive it straight up and down that fixed path.';
  if (node.equipmentId === 'selectorized_machine') return 'Follow the machine’s guided lever path smoothly and control the weight back to the stack.';
  if (node.isCable) return 'Keep steady tension on the cable through the whole range, including the return.';
  if (node.equipmentId === 'dumbbell') return 'Control each dumbbell independently so your stronger side doesn’t take over.';
  if (node.equipmentId === 'kettlebell') return 'Keep your wrist stacked and the bell path tight to your body.';
  if (node.equipmentId === 'resistance_band') return 'Match your effort to the band — its resistance climbs toward the end of the range.';
  if (node.equipmentId === 'suspension_trainer') return 'Set the difficulty with your foot position and how far you lean into the straps.';
  if (node.equipmentId === 'medicine_ball') return 'Move the ball with intent and catch or reset it under control each rep.';
  if (node.isBodyweight) return 'Own the full range of every rep before you add reps or make it harder.';
  return null;
}

/** Optional equipment-specific mistake+correction (tightens machine/cable/band coaching). */
function equipmentMistake(node) {
  if (node.equipmentId === 'selectorized_machine') return { mistake: 'Letting the weight stack slam down at the bottom.', correction: 'Control the return so the plates settle without banging.' };
  if (node.equipmentId === 'smith_machine') return { mistake: 'Losing control of the bar against the rails on the way down.', correction: 'Guide the bar down the rails under control every rep.' };
  if (node.isCable) return { mistake: 'Letting the cable yank your arm back at the end of the rep.', correction: 'Control the return against the cable tension rather than giving in to it.' };
  if (node.equipmentId === 'resistance_band') return { mistake: 'Letting the band snap you back through the last part of the range.', correction: 'Control the return as the band’s tension pulls you back.' };
  return null;
}

// ── Deterministic differentiation banks (README §"variation") ──────────────────
// Content varies by exercise family, equipment, position, unilateral/bilateral,
// compound/isolation role, primary muscle, machine-path vs free-weight-path, and
// open- vs closed-chain — so genuinely different exercises are not interchangeable.

/** A real, muscle-specific focus cue (not generic filler). */
const MUSCLE_CUE = {
  chest: 'Think about squeezing your chest to drive the movement, not just pushing with your arms.',
  upper_back: 'Pull with your back and squeeze your shoulder blades together, not just your arms.',
  lats: 'Drive your elbows down and back to pull from your lats.',
  front_deltoids: 'Keep the effort on the front of your shoulders through the press.',
  lateral_deltoids: 'Lead with your elbow and feel the side of your shoulder do the work.',
  rear_deltoids: 'Squeeze the back of your shoulders and pull your elbows back and apart.',
  traps: 'Shrug straight up and squeeze your traps at the top.',
  biceps: 'Keep the tension on your biceps and stop your elbows from drifting forward.',
  triceps: 'Keep your elbows fixed and lock out fully to load your triceps.',
  forearms: 'Keep a firm grip and let your forearms do the work.',
  rotator_cuff: 'Move slowly and keep the effort in the small muscles around your shoulder.',
  erector_spinae: 'Brace your spine and lengthen through your back as you extend.',
  rectus_abdominis: 'Curl your ribs toward your hips and feel your abs shorten.',
  obliques: 'Rotate or bend from your waist and feel the side of your trunk work.',
  transverse_abdominis: 'Brace as if bracing for a punch and keep that tension.',
  hip_flexors: 'Drive your knee up and feel the front of your hip work.',
  glutes: 'Squeeze your glutes hard at the top of each rep.',
  quadriceps: 'Drive through your knees and feel the front of your thighs work.',
  hamstrings: 'Feel the back of your thighs work through the rep.',
  adductors: 'Squeeze your inner thighs together through the working range.',
  abductors: 'Drive your leg outward and feel the side of your hip work.',
  calves: 'Rise all the way onto your toes and squeeze your calves at the top.',
  tibialis_anterior: 'Pull your toes up toward your shin and feel the front of your shin work.',
  neck: 'Move slowly and keep the effort in your neck muscles only.',
};

/** Equipment path / stability note — how the implement shapes the movement. */
const EQUIP_PATH = {
  selectorized_machine: 'Because the machine guides the path, put your attention on driving with the target muscle.',
  smith_machine: 'The bar travels one fixed vertical line on the rails, so there is no bar path to balance — just drive.',
  cable: 'The cable holds constant tension on the muscle through the whole range, including the return.',
  resistance_band: 'The band is lightest at the start and hardest at the end, so it loads the top of the range most.',
  dumbbell: 'Each dumbbell is balanced on its own, so both sides have to pull their own weight.',
  kettlebell: 'The bell hangs below your hand, so keep your wrist stacked and the path tight.',
  barbell: 'You balance and drive the bar yourself, so groove the bar path before chasing weight.',
  bodyweight: 'You move and stabilise your own bodyweight, so change leverage to progress rather than adding weight.',
  suspension_trainer: 'You set the difficulty with your foot position and how far you lean into the straps.',
  medicine_ball: 'The ball lets you accelerate and release or catch it, so move it explosively.',
  plyo_box: 'The box fixes the height, so land and stand on it under full control.',
  sled: 'The sled only loads you while you drive it, so keep a steady, forceful pace.',
  battle_rope: 'The rope loads your effort continuously, so keep the waves going at a steady pace.',
  cardio: 'The machine holds a steady resistance, so settle into a pace you can sustain.',
};

const ISO_PATTERNS = new Set(['Elbow Flexion', 'Elbow Extension', 'Shoulder Isolation', 'Hip Isolation', 'Calf / Ankle', 'Neck Isolation']);
const COMPOUND_PATTERNS = new Set(['Squat / Knee Dominant', 'Hinge / Hip Dominant', 'Horizontal Push', 'Vertical Push', 'Horizontal Pull', 'Vertical Pull']);

/** Compound vs isolation role, honouring the leg-extension/leg-curl isolation overrides. */
function roleOf(node) {
  if (/leg-extension/.test(node.id)) return 'isolation';
  if (ISO_PATTERNS.has(node.movementPattern)) return 'isolation';
  if (COMPOUND_PATTERNS.has(node.movementPattern)) return 'compound';
  return null;
}

/** Open- vs closed-chain where clearly inferable, else null. */
function chainOf(node) {
  const p = node.movementPattern;
  if (/leg-extension/.test(node.id)) return 'open';
  if (p === 'Calf / Ankle') return 'closed';
  if (ISO_PATTERNS.has(p)) return 'open';
  if (p === 'Squat / Knee Dominant' || p === 'Hinge / Hip Dominant') return 'closed';
  if (p === 'Horizontal Push' || p === 'Vertical Push' || p === 'Horizontal Pull' || p === 'Vertical Pull') {
    return node.isBodyweight ? 'closed' : 'open';
  }
  return null;
}

/** The primary muscle (display order) that carries a focus cue, or null. */
function primaryCueMuscle(node) {
  for (const m of node.realPrimary) if (MUSCLE_CUE[m]) return m;
  return null;
}

const EQUIP_CLASS = {
  selectorized_machine: 'machine', smith_machine: 'Smith-machine', cable: 'cable', barbell: 'barbell',
  dumbbell: 'dumbbell', kettlebell: 'kettlebell', resistance_band: 'band', bodyweight: 'bodyweight',
  suspension_trainer: 'suspension-trainer', medicine_ball: 'medicine-ball', plyo_box: 'plyometric',
  sled: 'sled', battle_rope: 'battle-rope', cardio: 'cardio',
};

/**
 * A substantive, multi-axis training note (feeds `difficultyConsiderations`).
 * References family + role + equipment path/stability + chain + unilateral +
 * difficulty, so genuinely different exercises read differently. Editorial field
 * (not in the W-22 user projection) — depth here does not bloat user-facing text.
 */
function buildTrainingNote(node) {
  const role = roleOf(node);
  const cls = EQUIP_CLASS[node.equipmentId] ?? '';
  const parts = [];
  parts.push(role
    ? `The ${node.family} is ${role === 'isolation' ? 'an isolation' : 'a compound'} ${cls} movement.`
    : `The ${node.family} is a ${cls} movement.`.replace('  ', ' '));
  const path = EQUIP_PATH[node.equipmentId];
  if (path) parts.push(path);
  const chain = chainOf(node);
  if (chain === 'closed') parts.push('Your hands or feet stay planted, so you move your body against the resistance.');
  else if (chain === 'open') parts.push('Your working limb moves freely, so keep the joint you are training under control.');
  if (node.unilateral) parts.push('Working one side at a time, match the reps and range on your weaker side.');
  parts.push(node.difficulty === 'Advanced'
    ? 'It is an advanced movement — build control on easier variations first.'
    : node.difficulty === 'Beginner'
      ? 'It suits newer athletes and is a good place to build the pattern.'
      : 'Add load gradually as your control improves.');
  return parts.join(' ');
}

/**
 * Coarse cardio/locomotion modality label (run/bike/row/ski/swim/…), keyed on the
 * exercise name. Used both for modality-specific coaching and for the guidance
 * eligibility check (cardio guidance must stay within one conditioning modality).
 */
export function cardioModality(node) {
  const id = node.id;
  if (/row-erg|rowing/.test(id)) return 'row';
  if (/ski-erg/.test(id)) return 'ski';
  if (/swim/.test(id)) return 'swim';
  if (/cycl|bike|ride|spin|pedal/.test(id)) return 'bike';
  if (/crawl|bear|crab|wall-walk/.test(id)) return 'crawl';
  if (/jump-rope|double-under|skip/.test(id)) return 'rope';
  if (/box|bag|kickbox|shadow|mitt/.test(id)) return 'boxing';
  if (/stair|step|climb|ladder|versaclimber/.test(id)) return 'stair';
  if (/ellipt|arc-trainer/.test(id)) return 'elliptical';
  if (/walk|hike|ruck/.test(id)) return 'walk';
  if (/run|sprint|jog|fartlek|stride|repeat|tempo|threshold|interval|progression|recovery/.test(id)) return 'run';
  if (/sled/.test(id)) return 'sled';
  if (/erg|ergometer/.test(id)) return 'erg';
  return null;
}

/** Modality-specific coaching cue for cardio — real technique differences, not artificial wording. */
function cardioModalityCue(node) {
  switch (cardioModality(node)) {
    case 'row': return 'Drive with your legs first, then swing your torso back, then pull with your arms — reverse that order on the return.';
    case 'ski': return 'Drive down and back with your whole body, hinging at your hips as you pull.';
    case 'swim': return 'Keep a long, smooth stroke and exhale steadily into the water.';
    case 'bike': return 'Keep a smooth, round pedal stroke and a steady cadence.';
    case 'crawl': return 'Keep your hips low and move your opposite hand and foot together.';
    case 'rope': return 'Keep your jumps low and turn the rope from your wrists.';
    case 'boxing': return 'Stay light on your feet and bring your hands back to guard between strikes.';
    case 'stair': return 'Drive through your whole foot on each step and stand tall.';
    case 'elliptical': return 'Keep a smooth, continuous stride and drive through the whole foot.';
    case 'walk': return 'Walk tall with a purposeful stride and a steady arm swing.';
    case 'run': return 'Run tall with a quick, light cadence and relaxed shoulders and hands.';
    case 'sled': return 'Lean into the sled and drive with powerful, steady steps.';
    case 'erg': return 'Set a smooth, repeatable stroke rhythm and hold it.';
    default: return null;
  }
}

/**
 * Semantic eligibility for using a relationship edge (source → target) as
 * user-facing progression/regression guidance. The graph is the candidate source,
 * but valid coaching guidance must be a genuine training continuation. Deterministic.
 * @returns {{ candidateExerciseId: string, eligible: boolean, confidence: number, reasons: string[], rejectionReasons: string[] }}
 */
function guidanceEligibility(source, target) {
  const reasons = [];
  const rejectionReasons = [];

  if (source.modality === target.modality) reasons.push('same training modality');
  else rejectionReasons.push('modality changes');

  if (source.movementPattern === target.movementPattern) reasons.push('same movement pattern');
  else rejectionReasons.push('movement pattern changes');

  const isCardio = source.movementPattern === 'Cardio / Locomotion' || source.modality === 'Cardio';
  if (isCardio) {
    const sm = cardioModality(source);
    const tm = cardioModality(target);
    if (sm && tm && sm === tm) reasons.push('same conditioning modality');
    else rejectionReasons.push('different conditioning modality');
  } else {
    const shared = [...source.realPrimary].filter((m) => target.realPrimary.has(m));
    if (shared.length > 0) reasons.push('shares the primary training intent');
    else rejectionReasons.push('different primary training intent');

    if (source.family === target.family) reasons.push('same exercise family');
    else if (shared.length > 0 && roleOf(source) && roleOf(source) === roleOf(target)) reasons.push('closely related mechanics');
    else rejectionReasons.push('no recognizable skill progression');

    // A same-family, same-difficulty swap of equipment is an equipment alternative, not a step.
    if (source.family === target.family && source.difficulty === target.difficulty && source.equipmentId !== target.equipmentId) {
      rejectionReasons.push('primarily an equipment alternative');
    }
  }

  const eligible = rejectionReasons.length === 0;
  const confidence = eligible ? Math.min(96, 52 + 12 * reasons.length) : 0;
  return { candidateExerciseId: target.id, eligible, confidence, reasons, rejectionReasons };
}

/**
 * Pick the first ELIGIBLE candidate from a ranked list of relationship edges.
 * Returns the chosen target (id + name) and the eligibility result of the chosen
 * edge, or — when none is eligible — the eligibility of the top candidate (to
 * explain the rejection). Deterministic (candidates are pre-sorted by rank).
 */
function selectGuidance(source, edges, byId) {
  if (!edges || edges.length === 0) return { target: null, eligibility: null };
  let top = null;
  for (const e of edges) {
    const target = byId.get(e.targetExerciseId);
    if (!target) continue;
    const elig = guidanceEligibility(source, target);
    if (!top) top = elig;
    if (elig.eligible) return { target: { id: target.id, name: target.name }, eligibility: elig };
  }
  return { target: null, eligibility: top };
}

const oxford = (arr) => arr.length <= 1 ? (arr[0] ?? '') : arr.length === 2 ? `${arr[0]} and ${arr[1]}` : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;

/**
 * Why each common mistake matters — the cost of the error (lost effectiveness,
 * wasted effort, a weaker position). Educational and mechanical, never a medical
 * claim. Keyed on the exact mistake string; validate.mjs enforces full coverage.
 */
const MISTAKE_WHY = {
  'Arching the lower back away from a braced position.': 'A loose lower back leaks force and takes the work off your abs.',
  'Arching the lower back to gain more range.': 'The extra range comes from your spine, not the target muscle, so it adds little.',
  'Arching the lower back to press the load up.': 'Arching turns a shoulder press into a decline press and takes tension off your shoulders.',
  'Arching the lower back to push the hips higher.': 'Extra height from your spine, not your hips, means your glutes do less of the work.',
  'Bending mostly at the knees instead of the hips.': 'Turning the hinge into a squat shifts the work off your hamstrings and glutes.',
  'Bouncing at the bottom of the lean.': 'Bouncing uses momentum instead of muscle, so the working muscles get less out of each rep.',
  'Bouncing the load off the chest.': 'Bouncing skips the hardest part of the press, so you build less pressing strength.',
  'Bouncing through short, fast reps.': 'Short bounces use the tendon’s spring instead of your calves, so they do less work.',
  'Cutting the curl short of a full hamstring squeeze.': 'Stopping short leaves the strongest part of the contraction untrained.',
  'Cutting the depth short above parallel.': 'A shallow squat trains a fraction of the range and much less of your legs.',
  'Cutting the lower-half of the range short.': 'Skipping the bottom half leaves strength and size on the table.',
  'Cutting the pull short before the chest reaches the bar.': 'A partial pull trains less of your back through its range.',
  'Cutting the range short with a shallow shrug.': 'A shallow shrug barely works the traps you are trying to build.',
  'Cutting the stretch short at the bottom.': 'Skipping the stretch removes the part of the range that builds the most.',
  'Cutting the top short of a full knee extension.': 'Stopping short of lockout leaves the peak quad contraction untrained.',
  'Failing to reach a full stretch between reps.': 'Without the full stretch you train a shorter range and build less.',
  'Flaring the elbows straight out to the sides.': 'Flared elbows put your shoulders in a weaker, less comfortable pressing position.',
  'Forcing or bouncing into an end range.': 'Forcing past your range fights the stretch instead of easing it and does little for mobility.',
  'Heaving a heavy load with the whole body.': 'Body english takes the work off your rear shoulders, which is the point of the movement.',
  'Holding your breath while you hold the position.': 'Holding your breath tenses you up and stops you easing deeper into the range.',
  'Hyperextending and leaning back at the top.': 'Leaning back past standing loads your lower back and adds nothing to the lift.',
  'Kipping or swinging to complete the rep.': 'Swinging uses momentum instead of your back and arms, so the pull does less.',
  'Landing stiff-legged with a hard, loud impact.': 'A stiff landing wastes the force your legs should be absorbing.',
  'Leaning back and over-arching at the top.': 'Over-arching shifts load to your spine and away from your glutes.',
  'Leaning to one side under an uneven load.': 'Leaning lets the load win and takes the anti-lean work off your trunk.',
  'Letting the ankles roll outward as you rise.': 'Rolling out sends force through the outside of your foot instead of your calves.',
  'Letting the band snap you back through the last part of the range.': 'Giving in to the band skips the controlled lowering where much of the work happens.',
  'Letting the cable yank your arm back at the end of the rep.': 'Giving in to the cable skips the lowering phase, cutting the work in half.',
  'Letting the effort drift down whenever your attention wanders.': 'Coasting drops the training effect for that stretch of the effort.',
  'Letting the elbows drift forward to lift the load higher.': 'Moving the elbows turns a curl into a partial front raise and takes tension off your biceps.',
  'Letting the elbows drop below the hands.': 'Low elbows turn the face pull into a row and take the work off your rear shoulders.',
  'Letting the elbows flare and drift to recruit the shoulders.': 'Flaring brings your shoulders in and takes the work off your triceps.',
  'Letting the elbows flare wide as you press.': 'Wide elbows put your shoulders in a weaker position to press from.',
  'Letting the heels lift off the floor.': 'On your toes you lose your base and shift the squat onto your knees.',
  'Letting the hips rise or the pelvis tilt to gain more range.': 'Extra range from the hips means your hamstrings do less of the curl.',
  'Letting the hips sag so the body bends at the waist.': 'A sagging body breaks the straight line and takes tension off the working muscles.',
  'Letting the hips sag toward the floor.': 'Sagging hips break the plank line and shift load to your lower back.',
  'Letting the knees cave inward under load.': 'Caved knees are a weaker position and rob power from the lift.',
  'Letting the knees cave inward.': 'Knees caving in is a weaker position and takes force off your glutes.',
  'Letting the knees collapse inward on landing.': 'A collapsed-knee landing is a weak position to absorb force.',
  'Letting the rest of the body move to help the neck.': 'Body movement does the work the neck muscles should, so they get little out of it.',
  'Letting the weight slam down at the bottom.': 'Dropping the weight skips the lowering phase, where a lot of the muscle work happens.',
  'Letting the weight stack slam down at the bottom.': 'A slammed stack means gravity did the lowering, not your muscles.',
  'Letting the wrists roll or drop under the load.': 'Bent wrists leak force and move the effort away from the muscle you want.',
  'Losing control of the bar against the rails on the way down.': 'An uncontrolled bar wastes the lowering phase and rushes the next rep.',
  'Losing the shoulder-blade set at the bottom.': 'When the blades slip you lose your pressing base and control of the bar.',
  'Lowering too quickly on the way down.': 'Rushing the lower skips the part of the rep that builds the most control and strength.',
  'Only dipping a few inches instead of reaching depth.': 'A shallow dip trains a small slice of the range and much less of your chest and triceps.',
  'Only lowering partway before pressing back up.': 'Half reps train a fraction of the range and build less.',
  'Over-arching and hyperextending at the top.': 'Arching past a straight line loads your spine and adds nothing to the movement.',
  'Pressing the load forward instead of straight up.': 'A forward press is a weaker, longer path and stresses your shoulders more.',
  'Pulling on the neck or head to complete the rep.': 'Pulling your head does the work your abs should, so your midsection gets less out of it.',
  'Pushing into a range that pinches or feels sharp.': 'Working into a sharp range gains nothing and is your cue to back off.',
  'Pushing through the toes so the heels lift.': 'On your toes your glutes do less and the hip drive weakens.',
  'Raising the load well above shoulder height and shrugging.': 'Going too high brings your traps in and takes the work off the muscle you want.',
  'Rising hips-first so the load shifts forward onto your toes.': 'Hips shooting up first tips you forward and turns the squat into a good morning.',
  'Rolling the shoulders in circles at the top.': 'Rolling adds no extra trap work and moves your shoulders through a weaker path.',
  'Rounding the back on the way down instead of controlling it.': 'A rounded, uncontrolled lower puts your spine in a weak position under load.',
  'Rounding the lower back as the load leaves the floor.': 'A rounded back is the weakest position to lift from.',
  'Rounding the lower back as you hinge forward.': 'Rounding takes the stretch off your hamstrings and loads your spine instead.',
  'Rounding the lower back as you lean forward.': 'Rounding turns a hip hinge into a spinal bend, loading your back.',
  'Rounding the shoulders forward under the load.': 'Rounded shoulders are a weaker position to carry and hold the load.',
  'Rowing the handle down toward the chest or hips.': 'Pulling low turns the face pull into a row and misses the rear shoulders.',
  'Rushing reps and losing power output.': 'Rushed reps are less explosive, and power is the whole point of the movement.',
  'Rushing reps and losing the glute contraction.': 'Without a squeeze at the top your glutes do far less of the work.',
  'Rushing reps without a real glute squeeze at the top.': 'Skipping the squeeze leaves the strongest part of the contraction untrained.',
  'Rushing the movement and losing control of the load or your body.': 'Rushing hands the work to momentum instead of your muscles.',
  'Rushing through reps with momentum.': 'Momentum does the work your abs should, so the set does less.',
  'Shortening the range to complete more repetitions.': 'More reps through less range build less than fewer full-range reps.',
  'Shrugging the shoulder up toward the ear while pulling.': 'A shrugging shoulder takes the pull off your back and into your traps.',
  'Shrugging the shoulders up toward the ears at the bottom.': 'Shrugged shoulders put your shoulder in a weaker, more exposed position at the bottom.',
  'Shrugging the shoulders up toward the ears while pulling.': 'Shrugging brings your traps in and takes the work off the muscle you want.',
  'Snapping quickly from one rep to the next.': 'Snapping through reps skips the controlled range that mobility work depends on.',
  'Starting too fast and fading in the second half.': 'A fast start you cannot hold means the back half of the effort suffers.',
  'Stopping short of a full lockout.': 'Skipping lockout leaves the peak triceps contraction untrained.',
  'Stopping short of a full overhead lockout.': 'Without full lockout you miss the top of the press and the strength it builds.',
  'Stopping the pull the moment your chin clears your hands.': 'Stopping at the chin trains a shorter range and less of your back.',
  'Swinging or using momentum to fling the weight up.': 'A swung weight is lifted by momentum, not your quads.',
  'Swinging the load up with the torso.': 'Body swing does the lifting, so your shoulders get little out of it.',
  'Swinging the torso to start the load moving.': 'A torso swing starts the curl with momentum instead of your biceps.',
  'Taking long, rushed strides that let the load sway.': 'A swaying load pulls you around and takes the anti-sway work off your trunk.',
  'Tensing the shoulders and upper body while working.': 'Tension up top wastes energy that should go into your legs and lungs.',
  'Turning it into a spinal crunch instead of a hip hinge.': 'Crunching your spine misses the hip hinge you are trying to train.',
  'Turning the hinge into a squat by bending the knees too early.': 'Early knee bend takes the stretch and work off your hamstrings and glutes.',
  'Twisting the torso to swing the leg higher.': 'Twisting fakes extra range and takes the work off the working hip.',
  'Using a swing or momentum to get through the hardest point.': 'Momentum carries you past the point that would build the most strength.',
  'Using body swing or momentum to move through the rep.': 'Body english takes the work off the muscle you are trying to train.',
  'Using heavy resistance and jerky reps.': 'Heavy, jerky reps move your neck through a weak, uncontrolled range.',
  'Using momentum to swing the torso up.': 'Swinging up uses momentum instead of your back and glutes.',
  'Using the arms to curl or lift the load.': 'Curling with your arms takes the work off the traps you are trying to build.',
  'Yanking with the lower back and using momentum.': 'Yanking uses your back and momentum instead of the muscles you are rowing with.',
};

/** Fallback why for any mistake not in the map (validate.mjs still flags the gap). */
const fallbackWhy = () => 'This takes work off the target muscle and reduces what you get from the set.';

/** Exercise-level "why it matters" — purpose + adaptation. Non-medical. */
function buildWhyItMatters(node, role) {
  if (node.realPrimary.size > 0) {
    const muscles = oxford([...node.primaryNames, ...node.secondaryNames].slice(0, 4).map(lower));
    const roleClause = role === 'isolation'
      ? 'As an isolation movement, it targets those muscles directly to build size and balance.'
      : 'As a compound movement, it trains several muscles together and carries over to real-world strength and power.';
    return `The ${node.family} builds strength and size in your ${muscles}. ${roleClause}`;
  }
  const byPattern = {
    'Cardio / Locomotion': `The ${node.family} builds your aerobic base, work capacity and conditioning.`,
    'Mobility': `The ${node.family} helps you move more freely through the positions your training demands.`,
    'Carry': `The ${node.family} builds full-body tension, grip and a trunk that stays stable under load.`,
    'Power / Plyometric': `The ${node.family} builds explosive power and how fast you can produce force.`,
    'Other': `The ${node.family} develops strength and control through its range.`,
  };
  return byPattern[node.movementPattern] ?? `The ${node.family} develops strength and control.`;
}

/** Plain explanation of why the exercise carries its difficulty rating. */
function buildDifficultyExplanation(node, role, risk) {
  const reasons = [];
  if (node.isMachine) reasons.push('the machine guides the path, so there is little balance to manage');
  else if (node.isCable) reasons.push('the cable is stable and easy to control');
  else if (node.isBodyweight) reasons.push('you manage only your own bodyweight');
  else if (node.isBand) reasons.push('the band is forgiving and easy to scale');
  else if (node.isFreeWeight) reasons.push('you balance and control the weight yourself');
  else if (node.movementPattern === 'Cardio / Locomotion') reasons.push('you can scale the pace and duration to your fitness');
  else if (node.movementPattern === 'Mobility') reasons.push('it works through a comfortable, controllable range');
  else reasons.push('you can scale the effort and load to your level');
  if (node.unilateral) reasons.push('working one side at a time adds a balance demand');
  if (role === 'compound') reasons.push('it coordinates several joints at once');
  else if (role === 'isolation') reasons.push('it works one joint, so it is simpler to learn');
  if (risk === 'Specialist') reasons.push('it demands a high level of skill');
  else if (risk === 'Technical') reasons.push('it rewards practising the technique');
  const because = reasons.length ? reasons.join(', and ') : 'of its overall demands';
  return `Rated ${node.difficulty} because ${because}.`;
}

/** Structured regression/progression guidance from the relationship graph. */
function buildProgressionGuidance(node) {
  const g = {};
  if (node.regressionTarget) {
    g.regressionExerciseId = node.regressionTarget.id;
    g.regressionReason = `Drop back to ${node.regressionTarget.name} to groove the movement before you add load or complexity.`;
  }
  if (node.progressionTarget) {
    g.progressionExerciseId = node.progressionTarget.id;
    g.progressionReason = `Move up to ${node.progressionTarget.name} once you can control this one for all your reps.`;
  }
  return g;
}

/**
 * Compose the coaching content body for a node. Deterministic, metadata-driven.
 * @returns the content-field subset of ExerciseCoachingContent (no editorial meta).
 */
// ─────────────────────────────────────────────────────────────────────────────
// VARIANT MODIFIERS — the axis that was missing
// ─────────────────────────────────────────────────────────────────────────────
//
// Pattern + equipment + primary muscle + unilateral were the only differentiators, so every exercise
// sharing those four produced byte-identical coaching: 15 push-up variants, 27 core movements, 44
// mobility drills — 449 of 556 records shared a body with another exercise.
//
// What actually separates them is the MODIFIER in the name: archer, deficit, close-grip, incline,
// paused. Each entry contributes at most one setup line, one execution line, one cue and one mistake —
// enough to make the coaching specific without displacing the pattern fundamentals, which are correct.
//
// Matching is on id substrings, so `close-grip-bench-press` matches `close-grip`. The list is ordered by
// priority and capped at two matches, so a long name can't stack five modifiers and drown the pattern.
const SUPPLANT_BANK = [
  // ── MOVEMENT SUB-TYPES ────────────────────────────────────────────────────
  // Core, Mobility and Cardio each collapse to ONE pattern bank, but they aren't variants of a single
  // movement — a dead bug and a dragon flag share nothing but a body region. These sub-types are
  // matched first (and are specific enough to win the two-match cap) so the coaching reflects what the
  // movement actually asks of you. Ordered most-specific-first: `side-plank` before `plank`.
  //
  // Unilateral leg work misfiled under "Squat / Knee Dominant". These are the records that made the
  // problem visible: Barbell Step-Up and Barbell Walking Lunge were both being told to "descend until
  // your thighs reach parallel" at confidence 100 — squat coaching on movements that aren't squats.
  { match: ['step-up'],
    setup: ['Set the box at a height where your working thigh is about parallel with your foot on it.',
      'Stand close enough that you step up rather than forward.'],
    execution: ['Place your whole foot on the box with your weight through the middle of it.',
      'Drive through the top foot and stand tall without pushing off the trailing leg.',
      'Lower under control until the trailing foot touches, then repeat.'],
    tip: 'The trailing leg is not a helper — keep its toe light so the top leg does the work.',
    mistake: { mistake: 'Pushing off the bottom foot to get up.', correction: 'Lower the box until you can rise without the trailing leg driving.' } },
  { match: ['walking-lunge', 'reverse-lunge', 'forward-lunge', 'lunge'],
    setup: ['Take a stride long enough that both knees can reach about ninety degrees.',
      'Set your torso tall and your ribs down before the first rep.'],
    execution: ['Step into the stride and lower straight down rather than forward.',
      'Lower until your back knee is just off the floor.',
      'Drive up through your front foot to return to standing.'],
    tip: 'Stay tall through your torso — leaning forward turns this into a hinge.',
    mistake: { mistake: 'Taking a stride so short the front knee travels well past the toes.', correction: 'Lengthen the stride until your front shin is close to vertical at the bottom.' } },
];

/**
 * Modifiers that AUGMENT the pattern. Two kinds live here:
 *   · true variants (close-grip, incline, paused) — the pattern archetype with a twist;
 *   · movement sub-types (planks, stretches, intervals) whose pattern text is GENERIC but not wrong,
 *     so adding to it differentiates them without discarding correct fundamentals.
 * `group` keeps near-siblings from stacking: `side-plank` matches both the side-plank and plank
 * entries, and taking both produced "stack your elbow" beside "set your elbows … forearms flat".
 */
const MODIFIER_BANK = [
  // Core
  { group: 'plank', match: ['copenhagen'], setup: 'Set your top leg on the bench and stack your shoulder over your elbow.',
    execution: 'Lift your hips until your body is in a straight line and hold.',
    tip: 'This is an adductor exercise as much as a side plank — expect the inner thigh to fatigue first.',
    mistake: { mistake: 'Letting the hips sag toward the floor as the hold gets hard.', correction: 'End the set when your hips drop rather than pushing through.' } },
  { group: 'plank', match: ['side-plank'], setup: 'Lie on your side and stack your elbow directly under your shoulder.',
    execution: 'Lift your hips until your body forms a straight line from head to heels, and hold.',
    tip: 'Push the floor away with your bottom elbow to keep your shoulder from sinking.',
    mistake: { mistake: 'Rolling the top hip forward or back.', correction: 'Keep both hips stacked vertically as if pressed between two walls.' } },
  { group: 'plank', match: ['rkc-plank', 'forearm-plank', 'plank'], setup: 'Set your elbows under your shoulders with your forearms flat.',
    execution: 'Brace hard and hold a straight line from head to heels for the prescribed time.',
    tip: 'Squeeze your glutes and pull your ribs down — a plank is a hard brace, not a rest position.',
    mistake: { mistake: 'Letting the hips pike up or sag down.', correction: 'Set a straight line and end the hold when you lose it.' } },
  { group: 'core', match: ['dead-bug', 'bird-dog'], setup: 'Set your lower back flat against the floor before you move a limb.',
    execution: 'Extend opposite limbs slowly while keeping your torso completely still.',
    tip: 'The goal is a trunk that does not move — go only as far as you can without your back arching.',
    mistake: { mistake: 'Rushing the reps so the lower back lifts off the floor.', correction: 'Slow down and shorten the reach until your back stays flat.' } },
  { group: 'core', match: ['hanging-leg-raise', 'hanging-knee-raise', 'toes-to-bar', 'l-sit'], setup: 'Hang from the bar with your shoulders pulled down away from your ears.',
    execution: 'Raise your legs by curling your pelvis up, not just by bending at the hip.',
    tip: 'Start each rep from a dead hang and stop swinging before you begin.',
    mistake: { mistake: 'Using a swing to generate the lift.', correction: 'Pause at the bottom until you are still, then lift.' } },
  { group: 'core', match: ['ab-wheel', 'dragon-flag', 'hollow-rock', 'v-up', 'v-sit'], setup: 'Set your ribs down and your lower back flat before the first rep.',
    execution: 'Extend only as far as you can hold that flat back, then return under control.',
    tip: 'Range is earned — the moment your lower back arches, you have gone past your working range.',
    mistake: { mistake: 'Extending to full range before the trunk can hold it.', correction: 'Shorten the range and build it out over weeks.' } },
  { group: 'core', match: ['crunch', 'sit-up', 'curl-up'], setup: 'Lie on your back with your feet flat and your lower back in a neutral position.',
    execution: 'Curl your ribs toward your hips, lifting one vertebra at a time.',
    tip: 'Move your ribs toward your pelvis rather than yanking on your neck.',
    mistake: { mistake: 'Pulling on the head or neck to get up.', correction: 'Rest your hands lightly at your temples and lead with your ribs.' } },
  { group: 'core', match: ['mountain-climber'], setup: 'Start in a push-up position with your shoulders over your hands.',
    execution: 'Drive one knee toward your chest and switch, keeping your hips level.',
    tip: 'Keep your hips low — the moment they bounce up this stops being a core exercise.',
    mistake: null },
  // Mobility
  { group: 'mobility', match: ['foam-roll', 'lacrosse-ball', 'release'], setup: 'Place the roller or ball under the target area and support your weight with your hands.',
    execution: 'Roll slowly, pausing for a few breaths on any spot that feels tight.',
    tip: 'Slow is the whole point — fast rolling passes over the tissue you are trying to reach.',
    mistake: { mistake: 'Rolling quickly back and forth over the area.', correction: 'Cover an inch at a time and pause where it is tender.' } },
  { group: 'mobility', match: ['-car', 'car-', 'controlled-articular'], setup: 'Set the joint in a neutral position and keep the rest of your body still.',
    execution: 'Move the joint slowly through the largest circle you can control.',
    tip: 'Control is the goal — no momentum, and no other joint should move to help.',
    mistake: { mistake: 'Letting the trunk or shoulder swing to make the circle bigger.', correction: 'Shrink the circle until only the target joint is moving.' } },
  { group: 'mobility', match: ['breathing', 'crocodile'], setup: 'Settle into the position and let your shoulders relax.',
    execution: 'Breathe slowly in through your nose and out for longer than you breathed in.',
    tip: 'Feel the breath expand your ribs sideways, not just lift your chest.',
    mistake: null },
  { group: 'mobility', match: ['cat-cow', 'thread-the-needle', 'open-book', 'wall-angel', 'thoracic'], setup: 'Set a stable base and move only the segment you are targeting.',
    execution: 'Move through the range slowly, one segment at a time.',
    tip: 'Go for a smooth, even bend rather than forcing the end range in one place.',
    mistake: null },
  { group: 'mobility', match: ['dead-hang', 'active-hang'], setup: 'Take a shoulder-width grip and let your feet come off the floor.',
    execution: 'Hang for the prescribed time, breathing steadily.',
    tip: 'Let your shoulders relax up toward your ears on a dead hang; pull them down for an active hang.',
    mistake: null },
  { group: 'mobility', match: ['stretch', 'pose', 'toe-touch', 'inchworm'], setup: 'Ease into the position without forcing the range.',
    execution: 'Move to the first point of tension and hold there, breathing steadily.',
    tip: 'Tension, never pain — back off the moment it sharpens.',
    mistake: { mistake: 'Bouncing or forcing into the end range.', correction: 'Hold a still position and let the tissue release on its own.' } },
  // Cardio
  { group: 'cardio', match: ['sprint', 'hill-repeat', 'track-repeat', 'interval'], setup: 'Warm up thoroughly before the first hard effort.',
    execution: 'Run each repetition at the assigned effort and take the full recovery between them.',
    tip: 'The recovery is part of the session — cutting it short turns the whole thing into a moderate run.',
    mistake: { mistake: 'Starting the first repetition faster than you can repeat.', correction: 'Set the pace you could hold for the last rep and start there.' } },
  { group: 'cardio', match: ['easy-run', 'recovery-run', 'long-run'], setup: 'Start easy and let the pace settle rather than forcing it.',
    execution: 'Hold a conversational effort for the full duration.',
    tip: 'If you could not hold a conversation, you are running this one too hard.',
    mistake: { mistake: 'Drifting faster as you warm up until the easy run becomes a moderate one.', correction: 'Check your effort every few minutes and ease back.' } },
  { group: 'cardio', match: ['fartlek', 'progression-run'], execution: 'Change pace on the plan rather than on how you feel.',
    tip: 'Finish faster than you started — hold something back early.', mistake: null },

  // ── grip / hand position ──
  { match: ['close-grip', 'diamond'], setup: 'Set your hands narrower than shoulder-width, just inside your ribs.',
    tip: 'The narrow grip shifts work onto your triceps — keep your elbows close to your sides.',
    mistake: { mistake: 'Letting the elbows flare wide, which defeats the narrow grip.', correction: 'Keep your upper arms brushing past your ribs on every rep.' } },
  { match: ['wide-grip'], setup: 'Take a grip wider than shoulder-width.',
    tip: 'The wider grip shortens the range and biases the outer chest and back — control the stretch at the end.',
    mistake: { mistake: 'Going so wide the shoulders roll forward at the bottom.', correction: 'Widen only until you can still keep your shoulder blades set.' } },
  { match: ['reverse-grip', 'underhand', 'supinated'], setup: 'Take an underhand grip with your palms facing up.',
    tip: 'The underhand grip brings your biceps and lower lats into the pull.',
    mistake: { mistake: 'Curling the weight up with the arms instead of driving with the back.', correction: 'Lead with your elbows and think of your hands as hooks.' } },
  { match: ['neutral-grip'], setup: 'Take a neutral grip with your palms facing each other.',
    tip: 'The neutral grip is easier on the shoulders and wrists — use it to train around irritation.', mistake: null },
  // ── angle / body position ──
  { match: ['incline'], setup: 'Set the bench to a low incline, around 30 degrees.',
    tip: 'The incline shifts work to the upper chest and front delts — keep your hips down on the bench.',
    mistake: { mistake: 'Setting the bench so steep it becomes a shoulder press.', correction: 'Keep the incline at or below about 45 degrees.' } },
  { match: ['decline'], setup: 'Set the bench to a slight decline and secure your legs.',
    tip: 'The decline biases the lower chest and shortens the range slightly.', mistake: null },
  { match: ['seated'], setup: 'Sit tall with your back supported and both feet flat on the floor.',
    tip: 'Sitting takes the legs out of it — keep your torso still and let the target muscle work.',
    mistake: { mistake: 'Rocking the torso to start the rep.', correction: 'Keep your back against the pad and move only the working joint.' } },
  { match: ['prone', 'chest-supported'], setup: 'Lie chest-down so your torso is fully supported.',
    tip: 'With your chest supported you cannot cheat with momentum — let that expose the honest weight.', mistake: null },
  { match: ['half-kneeling', 'kneeling'], setup: 'Take a kneeling position with your hips stacked under your shoulders.',
    tip: 'Kneeling narrows your base — squeeze the glute on the down leg to stay steady.', mistake: null },
  { match: ['bent-over'], setup: 'Hinge at the hips until your torso is close to parallel with the floor.',
    tip: 'Hold the hinge still for the whole set — your torso should not rise as you pull.',
    mistake: { mistake: 'Standing up out of the hinge as the set gets hard.', correction: 'Pick a spot on the floor ahead of you and keep your eyes there.' } },
  // ── range of motion ──
  { match: ['deficit'], setup: 'Stand on a plate or low platform so you start below the usual position.',
    tip: 'The deficit adds range — only use one you can reach without your back rounding.',
    mistake: { mistake: 'Taking a deficit so large the start position collapses.', correction: 'Lower the platform until you can set your back flat at the bottom.' } },
  { match: ['floor-press', 'floor'], setup: 'Set up lying on the floor so your upper arms stop against it.',
    tip: 'The floor caps the range and takes the stretch off the shoulder — press from a dead stop.', mistake: null },
  { match: ['pause', 'paused', 'dead-stop', 'deadstop', 'pin'], execution: 'Hold the bottom position still for a full count before you drive back.',
    tip: 'The pause kills the bounce — each rep starts from a dead stop, not a rebound.',
    mistake: { mistake: 'Shortening the pause as the set gets hard.', correction: 'Count the pause out loud so every rep gets the same hold.' } },
  { match: ['box'], setup: 'Set the box at a height you can reach while keeping good position.',
    tip: 'Touch the box under control rather than dropping onto it.',
    mistake: { mistake: 'Relaxing or rocking back once you touch the box.', correction: 'Stay braced the whole time you are in contact.' } },
  // ── tempo / intent ──
  { match: ['explosive', 'jump', 'plyo', 'clap', 'speed'], execution: 'Move as fast as you can on the way up while staying in control.',
    tip: 'Intent is the point — every rep should be maximally fast, and the set ends when speed drops.',
    mistake: { mistake: 'Grinding out slow reps once fatigue sets in.', correction: 'End the set the moment bar or body speed visibly slows.' } },
  { match: ['tempo', 'eccentric', 'negative'], execution: 'Lower deliberately over a slow count before reversing.',
    tip: 'The lowering is the work — resist all the way rather than letting it fall.', mistake: null },
  { match: ['isometric', 'hold'], execution: 'Hold the position without moving for the prescribed time.',
    tip: 'Keep breathing through the hold rather than locking your breath down.',
    mistake: { mistake: 'Letting position degrade as the hold gets hard.', correction: 'End the hold when your position breaks, not when the clock does.' } },
  // ── direction ──
  { match: ['lateral-raise', 'lateral'], tip: 'Lead with your elbow and stop around shoulder height.',
    mistake: { mistake: 'Swinging the weight up with a hip drive.', correction: 'Slow it down and let the shoulder raise the weight on its own.' } },
  { match: ['front-raise'], tip: 'Raise to about eye level and lower under control.', mistake: null },
  { match: ['rear-delt', 'reverse'], tip: 'Think about pulling your shoulder blades apart at the top rather than yanking with your arms.', mistake: null },
  { match: ['overhead'], setup: 'Set your ribs down and squeeze your glutes before you press overhead.',
    tip: 'Finish with the weight stacked over the middle of your foot, not out in front.',
    mistake: { mistake: 'Arching the lower back to get the weight up.', correction: 'Brace your midsection and stop the rep where your position holds.' } },
  // ── stance ──
  { match: ['sumo'], setup: 'Take a wide stance with your toes turned out and your hands inside your knees.',
    tip: 'Push the floor apart with your feet as you start the pull.', mistake: null },
  { match: ['split-squat', 'staggered', 'b-stance'], setup: 'Take a split stance with most of your weight through the front foot.',
    tip: 'The back leg is for balance only — drive through the front foot.',
    mistake: { mistake: 'Pushing off the back foot to complete the rep.', correction: 'Keep the back toe light and let the front leg do the work.' } },
  { match: ['archer'], setup: 'Set your hands wider than normal so one arm straightens as the other bends.',
    tip: 'The straight arm is a kickstand, not a pusher — the bending side does the work.',
    mistake: { mistake: 'Sharing the load evenly between both arms.', correction: 'Shift your weight over the working side until the straight arm feels light.' } },
  { match: ['pike'], setup: 'Walk your feet in and pike your hips high so your torso angles toward vertical.',
    tip: 'The higher your hips, the more this becomes a shoulder press.', mistake: null },
];

// Supplanting entries are matched FIRST (a step-up should never fall through to squat coaching) and
// carry the flag that tells composeContent to drop the pattern's setup and execution.
const VARIANT_BANK = [...SUPPLANT_BANK.map((v) => ({ ...v, replaces: true })), ...MODIFIER_BANK];

/**
 * Modifier entries matching this exercise's id, highest-priority first.
 *
 * At most ONE supplanting entry: they each replace the pattern's setup and execution, so a second would
 * contradict the first — `side-plank` matches both the side-plank sub-type and the generic plank one,
 * and taking both produced "stack your elbow under your shoulder" alongside "set your elbows under your
 * shoulders with your forearms flat". Modifiers stack fine, so up to two of those.
 */
function variantModifiers(node, limit = 2) {
  const id = String(node.id ?? '').toLowerCase();
  const matches = VARIANT_BANK.filter((v) => v.match.some((m) => id.includes(m)));
  const supplant = matches.find((v) => v.replaces);
  if (supplant) return [supplant];

  // One per group, most specific first — `side-plank` beats the generic `plank` entry and the two
  // never appear together.
  const seen = new Set();
  const picked = [];
  for (const v of matches) {
    if (v.group && seen.has(v.group)) continue;
    if (v.group) seen.add(v.group);
    picked.push(v);
    if (picked.length >= limit) break;
  }
  return picked;
}

/** Variant setup/execution may be a single line or several — normalise to an array. */
const variantLines = (variants, key) => variants.flatMap((v) => (Array.isArray(v[key]) ? v[key] : v[key] ? [v[key]] : []));

export function composeContent(node) {
  const { bank, phrase } = selectProfile(node);
  const eqSetup = equipmentSetupLine(node);
  // What makes THIS exercise different from its pattern-mates (archer, deficit, paused, incline …).
  const variants = variantModifiers(node);

  // A `replaces` variant is one whose movement ISN'T the archetype of its pattern — a step-up filed
  // under Squat, a dead bug under Core. For those the pattern's setup and execution are not a useful
  // base to build on, they're simply wrong, so the variant supplants them. Grip/angle/tempo variants
  // (close-grip, incline, paused) genuinely ARE the pattern plus a twist, so they augment instead.
  const supplants = variants.some((v) => v.replaces);

  // setupInstructions: equipment setup → variant setup → pattern setup.
  // Capped at the schema's ranges (setup 2-4, exec 3-6): equipment + two variants + pattern can
  // otherwise overflow, as barbell-overhead-carry did at five setup lines.
  const setupInstructions = [
    ...(eqSetup ? [eqSetup] : []),
    ...variantLines(variants, 'setup'),
    ...(supplants ? [] : bank.setup),
  ].slice(0, 4);

  // executionSteps — a supplanting variant leads and the pattern steps are dropped entirely.
  const variantExec = variantLines(variants, 'execution');
  const executionSteps = (supplants ? [...variantExec] : [...bank.execution, ...variantExec]).slice(0, 6);
  if (node.unilateral) executionSteps.push('Complete all your reps on one side, then repeat with the other, matching the reps on your weaker side.');

  // deterministic differentiators
  const eqTip = equipmentTip(node);
  const cueMuscle = primaryCueMuscle(node);
  // muscle-focus for muscled movements; modality cue for cardio/locomotion.
  const focusCue = (cueMuscle ? MUSCLE_CUE[cueMuscle] : null)
    ?? (node.movementPattern === 'Cardio / Locomotion' ? cardioModalityCue(node) : null);

  // coachingTips: variant cue leads (it's the one thing that isn't true of every pattern-mate), then
  // pattern cues → focus cue → equipment flavour → unilateral, capped at 5.
  const variantTips = variants.map((v) => v.tip).filter(Boolean);
  const tips = [...variantTips, ...bank.tips];
  if (focusCue) tips.push(focusCue);
  if (eqTip) tips.push(eqTip);
  if (node.unilateral) tips.push('Resist the urge to twist toward the working side — keep your hips and shoulders square.');
  const coachingTips = tips.slice(0, 5);

  // commonMistakes + 1:1 corrections (+ an equipment-specific mistake where relevant,
  // skipped when a pattern mistake already covers the same "slam/control-down" concept).
  const mistakeList = [...variants.map((v) => v.mistake).filter(Boolean), ...bank.mistakes];
  const eqMistake = equipmentMistake(node);
  const eqDup = eqMistake && /slam/.test(eqMistake.mistake) && mistakeList.some((m) => /slam/.test(m.mistake));
  if (eqMistake && !eqDup && mistakeList.length < 5) mistakeList.push(eqMistake);
  const commonMistakes = mistakeList.map((m) => m.mistake);
  const mistakeCorrections = mistakeList.map((m) => ({
    mistake: m.mistake,
    whyItMatters: MISTAKE_WHY[m.mistake] ?? fallbackWhy(),
    correction: m.correction,
  }));

  // cueHierarchy: lead pattern cue → focus cue → equipment → remaining pattern cues, capped at 5.
  const cueHierarchy = [
    ...variantTips,
    bank.tips[0],
    ...(focusCue ? [focusCue] : []),
    ...(eqTip ? [eqTip] : []),
    ...bank.tips.slice(1),
  ].slice(0, 5);

  // ROM note — reference the exercise's own primary muscle when available (distinctiveness).
  let rangeOfMotionNotes = bank.rom;
  if (rangeOfMotionNotes && node.primaryNames.length) {
    const poss = node.primaryNames.length === 1 ? 'its' : 'their';
    rangeOfMotionNotes += ` Take the ${lower(oxford(node.primaryNames))} through ${poss} full working range each rep.`;
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

  // difficulty considerations — a substantive multi-axis training note (editorial field).
  const role = roleOf(node);
  const difficultyConsiderations = buildTrainingNote(node);
  const difficultyExplanation = buildDifficultyExplanation(node, role, risk);

  // why it matters (purpose/adaptation) + structured progression guidance (relationship graph).
  const whyItMatters = buildWhyItMatters(node, role);
  const progressionGuidance = buildProgressionGuidance(node);

  // beginner / advanced
  const beginnerNotes = [...bank.beginner];
  const advancedCoachingNotes = [...bank.advanced];

  // equipmentSetup field: the equipment line (or null for trivial bodyweight).
  const equipmentSetup = eqSetup;

  return {
    whyItMatters,
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
    difficultyExplanation,
    progressionGuidance,
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
  'stay controlled', 'do not go too heavy', "don't go too heavy", 'go too heavy',
];

const allText = (content) => [
  content.whyItMatters,
  ...content.setupInstructions, ...content.executionSteps, ...content.coachingTips,
  ...content.commonMistakes,
  ...content.mistakeCorrections.map((c) => c.correction),
  ...content.mistakeCorrections.map((c) => c.whyItMatters),
  ...content.cueHierarchy, ...content.beginnerNotes, ...content.advancedCoachingNotes,
  ...content.safetyNotes,
  content.breathingGuidance, content.tempoGuidance, content.rangeOfMotionNotes,
  content.equipmentSetup, content.spottingNotes, content.difficultyConsiderations,
  content.difficultyExplanation,
  content.progressionGuidance?.regressionReason, content.progressionGuidance?.progressionReason,
].filter(Boolean).join(' \n ').toLowerCase();

/**
 * Movement-instruction text only (setup/execution/cues/mistakes/ROM), EXCLUDING
 * the meta training note (`difficultyConsiderations`) which legitimately names the
 * exercise family — family names like "Wall Sit" or "Sit-to-Stand" would otherwise
 * trip the standing/seated scan. Used for contradiction detection.
 */
const movementText = (content) => [
  ...content.setupInstructions, ...content.executionSteps, ...content.coachingTips,
  ...content.commonMistakes, ...content.mistakeCorrections.map((c) => c.correction),
  ...content.cueHierarchy, ...content.beginnerNotes, ...content.advancedCoachingNotes,
  content.rangeOfMotionNotes, content.equipmentSetup, content.spottingNotes,
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
  const text = movementText(content);
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
    whyItMatters: content.whyItMatters,
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
    difficultyExplanation: content.difficultyExplanation,
    progressionGuidance: content.progressionGuidance,
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
    guidanceEligibility: {
      regression: node.regressionEligibility ?? null,
      progression: node.progressionEligibility ?? null,
    },
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
/**
 * Similarity signature text. EXCLUDES fields that are deterministic projections of
 * other content — the per-mistake `whyItMatters` (strict 1:1 with `commonMistakes`)
 * and `difficultyExplanation` (a fixed function of equipment/difficulty/role). Counting
 * them would double-weight content already represented elsewhere and inflate the
 * similarity of exercises that merely share a movement pattern. Banned-phrase
 * scanning still covers those fields via `allText`.
 */
const signatureText = (content) => [
  content.whyItMatters,
  ...content.setupInstructions, ...content.executionSteps, ...content.coachingTips,
  ...content.commonMistakes, ...content.mistakeCorrections.map((c) => c.correction),
  ...content.cueHierarchy, ...content.beginnerNotes, ...content.advancedCoachingNotes,
  ...content.safetyNotes,
  content.breathingGuidance, content.tempoGuidance, content.rangeOfMotionNotes,
  content.equipmentSetup, content.spottingNotes, content.difficultyConsiderations,
  content.progressionGuidance?.regressionReason, content.progressionGuidance?.progressionReason,
].filter(Boolean).join(' \n ').toLowerCase();

export function signatureTokens(record) {
  const text = signatureText(record);
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
    whyItMatters: record.whyItMatters ?? null,
    instructions: [...record.setupInstructions, ...record.executionSteps],
    tips: record.cueHierarchy.length ? [...record.cueHierarchy] : [...record.coachingTips],
    commonMistakes: [...record.commonMistakes],
    safetyNotes: [...record.safetyNotes],
    advancedNotes: [...record.advancedCoachingNotes],
    progressionGuidance: { ...record.progressionGuidance },
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
