/**
 * engine.mjs — deterministic core for the Forge Legacy exercise relationship graph.
 *
 * Pure, dependency-free ES module. Imported by generate.mjs, validate.mjs, the
 * test suite, and mirrored (typed) by query-service.ts. Given the same canonical
 * source files, generateRelationships() always returns byte-identical output.
 *
 * Design authority: the task brief ("Movement Pattern is the primary
 * discriminator") reconciled with Exercise-Library-Architecture-v1.0 (EL-D12)
 * and Exercise-002 (substitution pools). See README.md for the full rationale.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SOURCE_DIR = join(HERE, 'source');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const RELATIONSHIP_TYPES = [
  'Substitute',
  'Equipment Alternative',
  'Regression',
  'Progression',
  'Variation',
];

/** Canonical MovementPattern taxonomy (mirror of schema.ts MOVEMENT_PATTERNS). */
export const MOVEMENT_PATTERNS = new Set([
  'Squat / Knee Dominant', 'Hinge / Hip Dominant', 'Horizontal Push', 'Vertical Push',
  'Horizontal Pull', 'Vertical Pull', 'Elbow Flexion', 'Elbow Extension', 'Core', 'Carry',
  'Cardio / Locomotion', 'Power / Plyometric', 'Mobility', 'Calf / Ankle', 'Hip Isolation',
  'Shoulder Isolation', 'Neck Isolation', 'Other',
]);

/** Muscle ids that are descriptors, not anatomical muscles — never scored. */
export const SYSTEM_MUSCLE_IDS = new Set([
  'full_body',
  'cardiovascular',
  'mobility',
  'grip',
  'balance',
]);

/** Movement patterns that are non-discriminating: never a basis for a relationship. */
export const NON_DISCRIMINATING_PATTERNS = new Set(['Other']);

/** Alternative-family types project onto EL-D12 `alternativeExerciseIds`. */
export const ALTERNATIVE_TYPES = new Set(['Substitute', 'Equipment Alternative', 'Variation']);

const DIFFICULTY_ORD = { Beginner: 0, Intermediate: 1, Advanced: 2 };

/** Stability / technical-demand contribution per equipment id (machines guided → low). */
const EQUIP_INSTABILITY = {
  selectorized_machine: 0,
  smith_machine: 0,
  cable: 1,
  plyo_box: 1,
  sled: 1,
  cardio: 1,
  barbell: 2,
  resistance_band: 2,
  medicine_ball: 2,
  battle_rope: 2,
  bodyweight: 2,
  dumbbell: 3,
  kettlebell: 3,
  suspension_trainer: 4,
};

/** Tokens in an exercise id that indicate unilateral / higher-stability execution. */
const UNILATERAL_TOKENS = [
  'single-arm', 'single-leg', 'one-arm', 'one-leg', 'pistol', 'bulgarian',
  'archer', 'staggered', 'b-stance', 'cossack', 'shrimp', 'skater', 'curtsy',
  'single-',
];

/** Human-friendly phrase for each movement pattern (used in reason text). */
const PATTERN_PHRASE = {
  'Horizontal Push': 'horizontal press',
  'Vertical Push': 'vertical press',
  'Horizontal Pull': 'horizontal pull',
  'Vertical Pull': 'vertical pull',
  'Hinge / Hip Dominant': 'hip hinge',
  'Squat / Knee Dominant': 'squat',
  'Elbow Flexion': 'elbow flexion',
  'Elbow Extension': 'elbow extension',
  'Core': 'core',
  'Carry': 'loaded carry',
  'Cardio / Locomotion': 'conditioning',
  'Power / Plyometric': 'explosive power',
  'Mobility': 'mobility',
  'Calf / Ankle': 'calf raise',
  'Hip Isolation': 'hip isolation',
};

/** Generation tuning. */
export const DEFAULTS = { minScore: 55, maxPerSource: 8, progressionThreshold: 2 };

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

const round1 = (x) => Math.round(x * 10) / 10;
const isUnilateral = (id) => UNILATERAL_TOKENS.some((t) => id.includes(t));

/**
 * Build an in-memory index keyed by exercise id. Each node carries pre-computed
 * muscle sets (real anatomical only, system buckets stripped), demand score,
 * and equipment metadata.
 */
export function buildIndex(sources) {
  const { exercises, exerciseMuscles, equipment, muscles } = sources;

  const equipmentById = new Map(equipment.map((e) => [e.id, e]));
  const muscleName = new Map(muscles.map((m) => [m.id, m.name]));

  const primary = new Map();
  const secondary = new Map();
  const allPrimaryWithSystem = new Map();
  for (const row of exerciseMuscles) {
    const bucket = row.role === 'Primary' ? primary : secondary;
    if (!bucket.has(row.exerciseId)) bucket.set(row.exerciseId, new Set());
    if (row.role === 'Primary') {
      if (!allPrimaryWithSystem.has(row.exerciseId)) allPrimaryWithSystem.set(row.exerciseId, new Set());
      allPrimaryWithSystem.get(row.exerciseId).add(row.muscleId);
    }
    if (!SYSTEM_MUSCLE_IDS.has(row.muscleId)) bucket.get(row.exerciseId).add(row.muscleId);
  }

  const byId = new Map();
  for (const ex of exercises) {
    const eq = equipmentById.get(ex.equipmentId);
    const difficultyOrd = DIFFICULTY_ORD[ex.difficulty] ?? 1;
    const realPrimary = primary.get(ex.id) ?? new Set();
    const realSecondary = secondary.get(ex.id) ?? new Set();
    const demand =
      2 * difficultyOrd + (EQUIP_INSTABILITY[ex.equipmentId] ?? 2) + (isUnilateral(ex.id) ? 1 : 0);
    byId.set(ex.id, {
      id: ex.id,
      name: ex.name,
      family: ex.family,
      equipmentId: ex.equipmentId,
      equipCategory: eq ? eq.category : null,
      movementPattern: ex.movementPattern,
      difficulty: ex.difficulty,
      difficultyOrd,
      modality: ex.modality ?? null,
      realPrimary,
      realSecondary,
      allPrimaryWithSystem: allPrimaryWithSystem.get(ex.id) ?? new Set(),
      demand,
    });
  }

  const ids = [...byId.keys()].sort();
  return { byId, ids, equipmentById, muscleName };
}

// ─────────────────────────────────────────────────────────────────────────────
// Similarity primitives
// ─────────────────────────────────────────────────────────────────────────────

function intersect(a, b) {
  const out = [];
  for (const x of a) if (b.has(x)) out.push(x);
  return out.sort();
}
function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** TRUE only when both share the same *real* (non-"Other") movement pattern. */
export function preservesPattern(a, b) {
  if (NON_DISCRIMINATING_PATTERNS.has(a.movementPattern)) return false;
  return a.movementPattern === b.movementPattern;
}

/**
 * Candidacy gate. Returns null if B may not relate to A; otherwise the shared
 * real primary muscles. Requires same real movement pattern AND a similarity
 * tie (same family, OR real primary overlap, OR — for muscle-less patterns —
 * same modality). This is the fix for cross-pattern / broad-bucket junk.
 */
export function candidate(a, b) {
  if (a.id === b.id) return null;
  if (!preservesPattern(a, b)) return null;
  const shared = intersect(a.realPrimary, b.realPrimary);
  const sameFamily = a.family === b.family;
  let tie = false;
  if (sameFamily) tie = true;
  else if (shared.length > 0) tie = true;
  else if (a.realPrimary.size === 0 && b.realPrimary.size === 0 && a.modality === b.modality) tie = true;
  return tie ? { shared } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring (0–100). Movement pattern carries the largest single weight.
// ─────────────────────────────────────────────────────────────────────────────
//   pattern preserved ............ 45   (candidacy guarantees this)
//   same family .................. 15
//   primary muscle Jaccard ....... 15 * j
//   secondary muscle Jaccard ......6 * j
//   difficulty proximity ......... 7 * (1 - |Δ|/2)
//   same modality ................. 4
//   equipment (same 5 / cat 2 / 0)
//   compound-vs-isolation role .... 3  (constant: same pattern ⇒ same role)
//   → capped at 100
export function scorePair(a, b) {
  let s = 45;
  if (a.family === b.family) s += 15;
  s += 15 * jaccard(a.realPrimary, b.realPrimary);
  s += 6 * jaccard(a.realSecondary, b.realSecondary);
  const dd = Math.abs(a.difficultyOrd - b.difficultyOrd);
  s += 7 * (1 - dd / 2);
  if (a.modality && a.modality === b.modality) s += 4;
  if (a.equipmentId === b.equipmentId) s += 5;
  else if (a.equipCategory && a.equipCategory === b.equipCategory) s += 2;
  s += 3;
  return round1(Math.min(100, s));
}

/** Assign exactly one relationship type from the demand delta + family/equipment. */
export function decideType(a, b, progressionThreshold = DEFAULTS.progressionThreshold) {
  const d = b.demand - a.demand;
  if (d >= progressionThreshold) return 'Progression';
  if (d <= -progressionThreshold) return 'Regression';
  const sameFamily = a.family === b.family;
  const equipmentChange = a.equipmentId !== b.equipmentId;
  if (sameFamily && !equipmentChange) return 'Variation';
  if (sameFamily && equipmentChange) return 'Equipment Alternative';
  return 'Substitute';
}

const patternPhrase = (p) => PATTERN_PHRASE[p] ?? p.toLowerCase();

export function buildReason(a, b, type, shared, muscleName, equipmentById) {
  const phrase = patternPhrase(a.movementPattern);
  const nameEq = (id) => (equipmentById?.get(id)?.name ?? id).toLowerCase();
  const eqN = nameEq(b.equipmentId);
  const eqS = nameEq(a.equipmentId);
  const equipChange = a.equipmentId !== b.equipmentId;
  const musc = shared.length ? shared.map((m) => (muscleName.get(m) ?? m).toLowerCase()).join(' & ') : null;
  switch (type) {
    case 'Equipment Alternative':
      return `Preserves the ${phrase} movement while using ${eqN} instead of ${eqS}.`;
    case 'Variation':
      return `A ${a.family.toLowerCase()} variation that keeps the ${phrase} pattern with a different execution.`;
    case 'Regression':
      return equipChange
        ? `An easier ${phrase} regression using ${eqN} instead of ${eqS}.`
        : `An easier ${phrase} regression with lower technical and stability demand.`;
    case 'Progression':
      return equipChange
        ? `A more demanding ${phrase} progression using ${eqN} instead of ${eqS}.`
        : `A more demanding ${phrase} progression with greater technical and stability demand.`;
    case 'Substitute':
    default:
      return musc
        ? `Preserves the ${phrase} pattern and trains the ${musc} with a different exercise.`
        : `Preserves the ${phrase} pattern with a similar exercise.`;
  }
}

export function buildSwapContexts(a, b, type, equipmentById) {
  const out = [];
  const equipChange = a.equipmentId !== b.equipmentId;
  const tEq = equipmentById.get(b.equipmentId);
  const tEnv = tEq ? tEq.environments : [];
  const tPortable = tEq ? tEq.portable : false;
  const addEquip = type === 'Equipment Alternative' || ((type === 'Substitute' || type === 'Regression') && equipChange);
  if (addEquip) {
    out.push('Equipment unavailable');
    if (b.equipmentId === 'bodyweight') out.push('No equipment');
    if (tPortable && tEnv.includes('Home Gym')) out.push('Home gym');
    if (tPortable && tEnv.includes('Hotel Gym')) out.push('Hotel gym');
    out.push('Different equipment');
  }
  if (type === 'Regression') out.push('More stability', 'Skill regression');
  if (type === 'Progression') out.push('Skill progression');
  if (type === 'Variation') out.push('General swap');
  if (out.length === 0) out.push('General swap');
  return [...new Set(out)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Generation
// ─────────────────────────────────────────────────────────────────────────────

export function generateRelationships(index, opts = {}) {
  const { minScore, maxPerSource, progressionThreshold } = { ...DEFAULTS, ...opts };
  const { byId, ids, equipmentById, muscleName } = index;
  const edges = [];

  for (const sourceId of ids) {
    const a = byId.get(sourceId);
    const scored = [];
    for (const targetId of ids) {
      const b = byId.get(targetId);
      const c = candidate(a, b);
      if (!c) continue;
      const score = scorePair(a, b);
      if (score < minScore) continue;
      const type = decideType(a, b, progressionThreshold);
      scored.push({ b, score, type, shared: c.shared });
    }
    // Deterministic order: score desc, then target id asc.
    scored.sort((x, y) => (y.score - x.score) || (x.b.id < y.b.id ? -1 : 1));
    const kept = scored.slice(0, maxPerSource);
    kept.forEach((cand, i) => {
      const { b, score, type, shared } = cand;
      edges.push({
        id: `${a.id}__${b.id}`,
        sourceExerciseId: a.id,
        targetExerciseId: b.id,
        type,
        rank: i + 1,
        compatibilityScore: score,
        movementPattern: a.movementPattern,
        preservesPattern: preservesPattern(a, b),
        samePrimaryMuscle: shared.length > 0,
        sharedPrimaryMuscleIds: shared,
        equipmentChange: a.equipmentId !== b.equipmentId,
        swapContexts: buildSwapContexts(a, b, type, equipmentById),
        reason: buildReason(a, b, type, shared, muscleName, equipmentById),
        editorialStatus: 'Auto-Generated',
      });
    });
  }
  return edges;
}

// ─────────────────────────────────────────────────────────────────────────────
// Projection onto the locked EL-D12 relationship arrays + query helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Project the directed edge graph onto {alternative, regression, progression} arrays per exercise. */
export function projectToArrays(edges, ids) {
  const outBySource = new Map();
  const altInByTarget = new Map();
  for (const e of edges) {
    if (!outBySource.has(e.sourceExerciseId)) outBySource.set(e.sourceExerciseId, []);
    outBySource.get(e.sourceExerciseId).push(e);
    if (ALTERNATIVE_TYPES.has(e.type)) {
      if (!altInByTarget.has(e.targetExerciseId)) altInByTarget.set(e.targetExerciseId, []);
      altInByTarget.get(e.targetExerciseId).push(e);
    }
  }
  const result = new Map();
  const allIds = ids ?? [...new Set(edges.flatMap((e) => [e.sourceExerciseId, e.targetExerciseId]))].sort();
  for (const id of allIds) {
    const out = (outBySource.get(id) ?? []).slice().sort((x, y) => x.rank - y.rank);
    const altOut = out.filter((e) => ALTERNATIVE_TYPES.has(e.type)).map((e) => e.targetExerciseId);
    const altIn = (altInByTarget.get(id) ?? []).slice().sort((x, y) => x.rank - y.rank).map((e) => e.sourceExerciseId);
    const alternativeExerciseIds = [...new Set([...altOut, ...altIn])];
    const regressionExerciseIds = out.filter((e) => e.type === 'Regression').map((e) => e.targetExerciseId);
    const progressionExerciseIds = out.filter((e) => e.type === 'Progression').map((e) => e.targetExerciseId);
    result.set(id, { exerciseId: id, alternativeExerciseIds, regressionExerciseIds, progressionExerciseIds });
  }
  return result;
}

/** Query surface used by tests and mirrored by query-service.ts. */
export function createQueryService(edges, index) {
  const bySource = new Map();
  for (const e of edges) {
    if (!bySource.has(e.sourceExerciseId)) bySource.set(e.sourceExerciseId, []);
    bySource.get(e.sourceExerciseId).push(e);
  }
  for (const list of bySource.values()) list.sort((a, b) => a.rank - b.rank);
  const { byId, equipmentById } = index;
  const envOf = (id) => equipmentById.get(byId.get(id)?.equipmentId)?.environments ?? [];

  return {
    getRelationships: (id) => (bySource.get(id) ?? []).slice(),
    getByType: (id, type) => (bySource.get(id) ?? []).filter((e) => e.type === type),
    getAlternatives: (id) => (bySource.get(id) ?? []).filter((e) => ALTERNATIVE_TYPES.has(e.type)),
    getRegressions: (id) => (bySource.get(id) ?? []).filter((e) => e.type === 'Regression'),
    getProgressions: (id) => (bySource.get(id) ?? []).filter((e) => e.type === 'Progression'),
    /** Substitution pool per Exercise-002: alternatives (primary) + regressions (secondary); progressions excluded. */
    getSubstitutionPool: (id) =>
      (bySource.get(id) ?? []).filter((e) => ALTERNATIVE_TYPES.has(e.type) || e.type === 'Regression'),
    filterByEnvironment: (rels, env) => rels.filter((e) => envOf(e.targetExerciseId).includes(env)),
    filterByEquipment: (rels, equipmentId) =>
      rels.filter((e) => byId.get(e.targetExerciseId)?.equipmentId === equipmentId),
    isBodyweight: (id) => byId.get(id)?.equipmentId === 'bodyweight',
    isCardio: (id) => byId.get(id)?.modality === 'Cardio' || byId.get(id)?.movementPattern === 'Cardio / Locomotion',
  };
}
