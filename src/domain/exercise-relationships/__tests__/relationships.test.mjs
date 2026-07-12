/**
 * relationships.test.mjs — automated tests for the exercise relationship graph.
 * Run:  node --test src/domain/exercise-relationships/__tests__/relationships.test.mjs
 * Zero dependencies (node:test + node:assert).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  loadSources, buildIndex, generateRelationships, projectToArrays, createQueryService,
  preservesPattern, decideType, RELATIONSHIP_TYPES, ALTERNATIVE_TYPES, SYSTEM_MUSCLE_IDS, MOVEMENT_PATTERNS,
} from '../engine.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REL_PATH = join(HERE, '..', 'exercise_relationships.json');

const sources = loadSources();
const index = buildIndex(sources);
const edges = generateRelationships(index);
const committed = JSON.parse(readFileSync(REL_PATH, 'utf8'));
const byId = index.byId;
const relsOf = (id) => edges.filter((e) => e.sourceExerciseId === id);
const targets = (id, type) => relsOf(id).filter((e) => !type || e.type === type).map((e) => e.targetExerciseId);

// ─────────────────────────────────────────────────────────────────────────────
test('deterministic generation — two runs are byte-identical', () => {
  const a = JSON.stringify(generateRelationships(buildIndex(loadSources())));
  const b = JSON.stringify(generateRelationships(buildIndex(loadSources())));
  assert.equal(a, b);
});

test('committed exercise_relationships.json is up to date with the generator', () => {
  const fresh = [...edges].sort((a, b) =>
    a.sourceExerciseId < b.sourceExerciseId ? -1 : a.sourceExerciseId > b.sourceExerciseId ? 1 : a.rank - b.rank);
  assert.equal(JSON.stringify(fresh), JSON.stringify(committed));
});

test('stable IDs — id === `${source}__${target}` and unique', () => {
  const seen = new Set();
  for (const e of edges) {
    assert.equal(e.id, `${e.sourceExerciseId}__${e.targetExerciseId}`);
    assert.ok(!seen.has(e.id), `duplicate id ${e.id}`);
    seen.add(e.id);
  }
});

test('duplicate detection — no duplicate source→target pairs, no self references', () => {
  const pairs = new Set();
  for (const e of edges) {
    const key = `${e.sourceExerciseId}>${e.targetExerciseId}`;
    assert.ok(!pairs.has(key), `duplicate pair ${key}`);
    pairs.add(key);
    assert.notEqual(e.sourceExerciseId, e.targetExerciseId);
  }
});

test('foreign-key integrity — every source and target exists in the catalog', () => {
  for (const e of edges) {
    assert.ok(byId.has(e.sourceExerciseId), `missing source ${e.sourceExerciseId}`);
    assert.ok(byId.has(e.targetExerciseId), `missing target ${e.targetExerciseId}`);
  }
});

test('valid relationship types only', () => {
  for (const e of edges) assert.ok(RELATIONSHIP_TYPES.includes(e.type), `bad type ${e.type}`);
});

test('MOVEMENT-PATTERN PRESERVATION — no edge crosses movement patterns', () => {
  for (const e of edges) {
    const a = byId.get(e.sourceExerciseId); const b = byId.get(e.targetExerciseId);
    assert.equal(a.movementPattern, b.movementPattern, `${e.id} crosses pattern`);
    assert.equal(e.preservesPattern, true);
  }
});

test('no edge is based on a non-discriminating "Other" pattern', () => {
  for (const e of edges) assert.notEqual(byId.get(e.sourceExerciseId).movementPattern, 'Other');
});

test('preservesPattern & samePrimaryMuscle are computed honestly', () => {
  for (const e of edges) {
    const a = byId.get(e.sourceExerciseId); const b = byId.get(e.targetExerciseId);
    assert.equal(e.preservesPattern, preservesPattern(a, b));
    const shared = [...a.realPrimary].filter((m) => b.realPrimary.has(m));
    assert.equal(e.samePrimaryMuscle, shared.length > 0);
    for (const m of e.sharedPrimaryMuscleIds) assert.ok(!SYSTEM_MUSCLE_IDS.has(m), `system bucket leaked: ${m}`);
  }
});

test('ranking consistency — ranks contiguous 1..N, score monotonic non-increasing', () => {
  const bySrc = new Map();
  for (const e of edges) (bySrc.get(e.sourceExerciseId) ?? bySrc.set(e.sourceExerciseId, []).get(e.sourceExerciseId)).push(e);
  for (const [, list] of bySrc) {
    const ordered = list.slice().sort((a, b) => a.rank - b.rank);
    ordered.forEach((e, i) => assert.equal(e.rank, i + 1));
    for (let i = 1; i < ordered.length; i++)
      assert.ok(ordered[i].compatibilityScore <= ordered[i - 1].compatibilityScore);
    assert.ok(list.length <= 8, 'exceeds 8-per-exercise target');
  }
});

test('Equipment Alternative — same family, different equipment, same pattern', () => {
  const eq = edges.filter((e) => e.type === 'Equipment Alternative');
  assert.ok(eq.length > 0);
  for (const e of eq) {
    const a = byId.get(e.sourceExerciseId); const b = byId.get(e.targetExerciseId);
    assert.equal(a.family, b.family);
    assert.notEqual(a.equipmentId, b.equipmentId);
    assert.equal(e.equipmentChange, true);
    assert.equal(a.movementPattern, b.movementPattern);
  }
});

test('Variation — same family, same equipment, same pattern', () => {
  const v = edges.filter((e) => e.type === 'Variation');
  assert.ok(v.length > 0);
  for (const e of v) {
    const a = byId.get(e.sourceExerciseId); const b = byId.get(e.targetExerciseId);
    assert.equal(a.family, b.family);
    assert.equal(a.equipmentId, b.equipmentId);
    assert.equal(e.equipmentChange, false);
  }
});

test('Progression — target is strictly higher demand, same pattern', () => {
  const p = edges.filter((e) => e.type === 'Progression');
  assert.ok(p.length > 0);
  for (const e of p) {
    const a = byId.get(e.sourceExerciseId); const b = byId.get(e.targetExerciseId);
    assert.ok(b.demand - a.demand >= 2, `${e.id} not enough demand delta`);
    assert.equal(a.movementPattern, b.movementPattern);
  }
});

test('Regression — target is strictly lower demand, same pattern', () => {
  const r = edges.filter((e) => e.type === 'Regression');
  assert.ok(r.length > 0);
  for (const e of r) {
    const a = byId.get(e.sourceExerciseId); const b = byId.get(e.targetExerciseId);
    assert.ok(a.demand - b.demand >= 2, `${e.id} not enough demand delta`);
    assert.equal(a.movementPattern, b.movementPattern);
  }
});

test('decideType is antisymmetric for Progression/Regression', () => {
  const a = byId.get('push-up'); const b = byId.get('archer-push-up');
  if (a && b && preservesPattern(a, b)) {
    const fwd = decideType(a, b); const bwd = decideType(b, a);
    if (fwd === 'Progression') assert.equal(bwd, 'Regression');
    if (fwd === 'Regression') assert.equal(bwd, 'Progression');
  }
});

test('EL-D12 projection — the three arrays never overlap', () => {
  const proj = projectToArrays(edges, index.ids);
  for (const [, arrs] of proj) {
    const alt = new Set(arrs.alternativeExerciseIds);
    for (const x of arrs.regressionExerciseIds) assert.ok(!alt.has(x));
    for (const x of arrs.progressionExerciseIds) assert.ok(!alt.has(x));
    const reg = new Set(arrs.regressionExerciseIds);
    for (const x of arrs.progressionExerciseIds) assert.ok(!reg.has(x));
  }
});

// ── Query service (mirrors query-service.ts) ──────────────────────────────────
const qs = createQueryService(edges, index);

test('query service — substitution pool excludes progressions (Exercise-002)', () => {
  const pool = qs.getSubstitutionPool('barbell-bench-press');
  assert.ok(pool.length > 0);
  for (const e of pool) assert.notEqual(e.type, 'Progression');
});

test('home-gym filtering — only targets executable at home remain', () => {
  const rels = qs.getRelationships('barbell-bench-press');
  const home = qs.filterByEnvironment(rels, 'Home Gym');
  assert.ok(home.length > 0);
  for (const e of home) {
    const eqId = byId.get(e.targetExerciseId).equipmentId;
    const envs = index.equipmentById.get(eqId).environments;
    assert.ok(envs.includes('Home Gym'), `${e.targetExerciseId} not home-compatible`);
  }
  // cable machine (commercial-only) must be filtered out
  assert.ok(!home.some((e) => byId.get(e.targetExerciseId).equipmentId === 'cable'));
});

test('bodyweight filtering — push-up substitutes can be narrowed to bodyweight', () => {
  const rels = qs.getRelationships('push-up');
  const bw = qs.filterByEquipment(rels, 'bodyweight');
  assert.ok(bw.length > 0);
  for (const e of bw) assert.ok(qs.isBodyweight(e.targetExerciseId));
});

test('cardio filtering — Easy Run relates only to cardio/locomotion targets', () => {
  assert.ok(qs.isCardio('easy-run'));
  const rels = qs.getRelationships('easy-run');
  assert.ok(rels.length > 0);
  for (const e of rels) assert.equal(byId.get(e.targetExerciseId).movementPattern, 'Cardio / Locomotion');
});

// ── Smith Machine handling (source now corrected) ──────────────────────────────
test('Smith Machine — all smith-machine-* reference equipment smith_machine', () => {
  const smith = [...byId.values()].filter((e) => e.id.startsWith('smith-machine-'));
  assert.equal(smith.length, 15);
  for (const e of smith) assert.equal(e.equipmentId, 'smith_machine', `${e.id} not smith_machine`);
  const rels = relsOf('smith-machine-bench-press');
  assert.ok(rels.length > 0);
  for (const e of rels) assert.equal(byId.get(e.targetExerciseId).movementPattern, 'Horizontal Push');
});

// ── Representative exercises look coach-sane ───────────────────────────────────
test('Bench Press — has incline/decline Variations and a dumbbell Equipment Alternative', () => {
  const rels = relsOf('barbell-bench-press');
  assert.ok(rels.length >= 5 && rels.length <= 8);
  assert.ok(targets('barbell-bench-press', 'Variation').includes('barbell-incline-bench-press'));
  assert.ok(targets('barbell-bench-press', 'Equipment Alternative').includes('dumbbell-bench-press'));
  for (const e of rels) assert.equal(byId.get(e.targetExerciseId).movementPattern, 'Horizontal Push');
});

test('Back Squat — every relationship is Squat / Knee Dominant (no lunge→crunch class)', () => {
  const rels = relsOf('barbell-back-squat');
  assert.ok(rels.length > 0);
  for (const e of rels) assert.equal(byId.get(e.targetExerciseId).movementPattern, 'Squat / Knee Dominant');
});

test('Deadlift & Romanian Deadlift — all Hinge / Hip Dominant', () => {
  for (const id of ['barbell-deadlift', 'barbell-romanian-deadlift']) {
    const rels = relsOf(id);
    assert.ok(rels.length > 0);
    for (const e of rels) assert.equal(byId.get(e.targetExerciseId).movementPattern, 'Hinge / Hip Dominant');
  }
  assert.ok(targets('barbell-romanian-deadlift', 'Equipment Alternative').includes('dumbbell-romanian-deadlift'));
});

test('Pull-Up — all Vertical Pull', () => {
  const rels = relsOf('pull-up');
  assert.ok(rels.length > 0);
  for (const e of rels) assert.equal(byId.get(e.targetExerciseId).movementPattern, 'Vertical Pull');
});

test('Cable Row & Box Jump exist and stay in-pattern', () => {
  for (const [id, pat] of [['low-cable-row', 'Horizontal Pull'], ['box-jump', 'Power / Plyometric']]) {
    const rels = relsOf(id);
    assert.ok(rels.length > 0, `${id} has no relationships`);
    for (const e of rels) assert.equal(byId.get(e.targetExerciseId).movementPattern, pat);
  }
});

test('previously-broken cross-pattern clusters now produce no bad links', () => {
  // behind-the-neck press must never link to cleans/pulls (different patterns)
  const bad = ['barbell-clean', 'barbell-clean-pull', 'barbell-block-pull'];
  for (const t of targets('barbell-behind-the-neck-press')) assert.ok(!bad.includes(t));
  // shrug must never link to ab rollout / active hang
  for (const t of targets('barbell-shrug')) assert.ok(!['ab-wheel-rollout', 'active-hang'].includes(t));
});

// ── Source-catalog corrections are locked in ──────────────────────────────────
test('corrected movement patterns — categories moved out of Other/system-buckets', () => {
  const pat = (id) => byId.get(id).movementPattern;
  assert.equal(pat('barbell-walking-lunge'), 'Squat / Knee Dominant');   // was Cardio/Locomotion
  assert.equal(pat('crunch'), 'Core');                                   // was Cardio/Locomotion
  assert.equal(pat('barbell-clean'), 'Power / Plyometric');              // was Other
  assert.equal(pat('barbell-snatch'), 'Power / Plyometric');             // was Other
  assert.equal(pat('barbell-shrug'), 'Shoulder Isolation');             // was Other
  assert.equal(pat('barbell-floor-press'), 'Horizontal Push');
});

test('no exercise carries a System-bucket muscle as a scored primary in an edge', () => {
  // every edge with samePrimaryMuscle=true shares a REAL anatomical muscle
  for (const e of edges) {
    if (e.samePrimaryMuscle) assert.ok(e.sharedPrimaryMuscleIds.length > 0);
    for (const m of e.sharedPrimaryMuscleIds)
      assert.ok(!SYSTEM_MUSCLE_IDS.has(m), `system bucket ${m} in ${e.id}`);
  }
});

test('walking-lunge no longer substitutes for a crunch (source miscategorization fixed)', () => {
  const t = targets('barbell-walking-lunge');
  assert.ok(!t.includes('machine-abdominal-crunch'));
  assert.ok(!t.includes('bicycle-crunch'));
  // and it now relates to real squat-pattern lunges
  for (const id of t) assert.equal(byId.get(id).movementPattern, 'Squat / Knee Dominant');
});

test('carries no longer use grip (system bucket) as primary; relate to other carries', () => {
  const rels = relsOf('dumbbell-farmer-carry');
  assert.ok(rels.length > 0);
  for (const e of rels) assert.equal(byId.get(e.targetExerciseId).movementPattern, 'Carry');
});

// ── Taxonomy amendments (Shoulder Isolation, Neck Isolation, neck muscle) ──────
test('every exercise movementPattern is in the canonical enum', () => {
  for (const n of byId.values()) assert.ok(MOVEMENT_PATTERNS.has(n.movementPattern), `bad pattern: ${n.id} → ${n.movementPattern}`);
});

test('Shoulder Isolation & Neck Isolation are in the canonical enum', () => {
  assert.ok(MOVEMENT_PATTERNS.has('Shoulder Isolation'));
  assert.ok(MOVEMENT_PATTERNS.has('Neck Isolation'));
});

test('neck muscle exists and neck machines use Neck Isolation + neck primary', () => {
  const neckMuscle = sources.muscles.find((m) => m.id === 'neck');
  assert.ok(neckMuscle && neckMuscle.name === 'Neck' && neckMuscle.region === 'Upper Body');
  const neckIds = ['neck-flexion-machine', 'neck-extension-machine', 'machine-neck-lateral-flexion'];
  for (const id of neckIds) {
    const n = byId.get(id);
    assert.equal(n.movementPattern, 'Neck Isolation');
    assert.ok(n.realPrimary.has('neck'), `${id} missing neck primary`);
  }
  // they relate to each other (biomechanically defensible same-pattern match)
  const rels = relsOf('neck-flexion-machine');
  assert.ok(rels.length > 0);
  for (const e of rels) assert.equal(byId.get(e.targetExerciseId).movementPattern, 'Neck Isolation');
});

test('specialized movements are NOT force-linked (stay same-pattern or zero)', () => {
  // strongman / gymnastics / agility residue must never gain cross-pattern links
  for (const id of ['tire-flip', 'planche-hold', 'kettlebell-halo', 'sprawl', 'atlas-stone-lift']) {
    const n = byId.get(id);
    if (!n) continue;
    for (const e of relsOf(id)) assert.equal(byId.get(e.targetExerciseId).movementPattern, n.movementPattern);
  }
});
