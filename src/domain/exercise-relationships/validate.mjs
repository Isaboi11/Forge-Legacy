/**
 * validate.mjs — validates exercise_relationships.json against the canonical catalog.
 *
 * Usage:  node src/domain/exercise-relationships/validate.mjs
 * Exit code 1 if any hard FAIL is found. VIOLATION (source-data) and WARN
 * (editorial edge cases) are reported but do not fail the build — per the brief
 * ("Report any violations instead of silently correcting them").
 *
 * Three tiers:
 *   FAIL      — graph/generator integrity. Must be zero.
 *   VIOLATION — canonical source-data rule breaches surfaced by the graph.
 *   WARN      — edge cases flagged for human editorial review.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SOURCE_DIR, loadSources, buildIndex, RELATIONSHIP_TYPES, ALTERNATIVE_TYPES,
  SYSTEM_MUSCLE_IDS, NON_DISCRIMINATING_PATTERNS, MOVEMENT_PATTERNS, preservesPattern, projectToArrays,
} from './engine.mjs';

const REL_PATH = join(SOURCE_DIR, '..', 'exercise_relationships.json');

const fails = [];
const violations = [];
const warns = [];
const fail = (m) => fails.push(m);
const violation = (m) => violations.push(m);
const warn = (m) => warns.push(m);

// ── Load ──────────────────────────────────────────────────────────────────────
const sources = loadSources();
const index = buildIndex(sources);
const { byId, ids, equipmentById } = index;
const equipIds = new Set(sources.equipment.map((e) => e.id));
const muscleIds = new Set(sources.muscles.map((m) => m.id));

let edges;
try {
  edges = JSON.parse(readFileSync(REL_PATH, 'utf8'));
} catch (e) {
  console.error('FAIL: cannot parse exercise_relationships.json —', e.message);
  process.exit(1);
}

// ── 1. Source-catalog integrity (the inputs the graph is built on) ─────────────
{
  // primary/secondary overlap per exercise
  const prim = new Map(); const sec = new Map();
  for (const r of sources.exerciseMuscles) {
    (r.role === 'Primary' ? prim : sec).set(
      r.exerciseId, (r.role === 'Primary' ? prim : sec).get(r.exerciseId) ?? new Set());
    (r.role === 'Primary' ? prim : sec).get(r.exerciseId).add(r.muscleId);
    if (!muscleIds.has(r.muscleId)) violation(`invalid muscle id in join table: ${r.exerciseId} → ${r.muscleId}`);
  }
  let overlap = 0;
  for (const eid of byId.keys()) {
    const p = prim.get(eid) ?? new Set(); const s = sec.get(eid) ?? new Set();
    for (const m of p) if (s.has(m)) overlap++;
  }
  if (overlap) violation(`${overlap} exercise(s) reference the same muscle as both Primary and Secondary`);

  // equipment id + movementPattern-enum validity
  for (const ex of sources.exercises) {
    if (!equipIds.has(ex.equipmentId)) violation(`invalid equipmentId: ${ex.id} → ${ex.equipmentId}`);
    if (!ex.movementPattern) fail(`exercise missing movementPattern: ${ex.id}`);
    else if (!MOVEMENT_PATTERNS.has(ex.movementPattern))
      fail(`movementPattern not in canonical enum: ${ex.id} → "${ex.movementPattern}"`);
  }

  // Smith Machine exercises must reference smith_machine
  const smith = sources.exercises.filter((e) => e.id.startsWith('smith-machine-') || /smith/i.test(e.name));
  const smithWrong = smith.filter((e) => e.equipmentId !== 'smith_machine');
  if (smithWrong.length) {
    violation(`${smithWrong.length}/${smith.length} Smith Machine exercises do NOT reference equipment 'smith_machine' `
      + `(they reference '${smithWrong[0].equipmentId}'). e.g. ${smithWrong.slice(0, 4).map((e) => e.id).join(', ')}`);
  }
  // Anything referencing smith_machine should be an actual smith exercise (sanity)
  const smithEquip = sources.exercises.filter((e) => e.equipmentId === 'smith_machine');
  if (smithEquip.length === 0) violation(`no exercise references equipment 'smith_machine' (defined in equipment.json but unused)`);
}

// ── 2. Graph structure / integrity (hard FAIL tier) ────────────────────────────
const idSet = new Set();
const pairSet = new Set();
const bySource = new Map();
for (const e of edges) {
  // required fields
  for (const k of ['id', 'sourceExerciseId', 'targetExerciseId', 'type', 'rank', 'compatibilityScore',
    'movementPattern', 'preservesPattern', 'samePrimaryMuscle', 'sharedPrimaryMuscleIds',
    'equipmentChange', 'swapContexts', 'reason', 'editorialStatus']) {
    if (!(k in e)) fail(`edge ${e.id ?? '?'} missing field ${k}`);
  }
  if (e.id !== `${e.sourceExerciseId}__${e.targetExerciseId}`) fail(`id != source__target: ${e.id}`);
  if (idSet.has(e.id)) fail(`duplicate id: ${e.id}`); idSet.add(e.id);
  const pair = `${e.sourceExerciseId}>${e.targetExerciseId}`;
  if (pairSet.has(pair)) fail(`duplicate source-target pair: ${pair}`); pairSet.add(pair);
  if (e.sourceExerciseId === e.targetExerciseId) fail(`self reference: ${e.id}`);
  if (!byId.has(e.sourceExerciseId)) fail(`invalid source exercise id: ${e.sourceExerciseId}`);
  if (!byId.has(e.targetExerciseId)) fail(`invalid target exercise id: ${e.targetExerciseId}`);
  if (!RELATIONSHIP_TYPES.includes(e.type)) fail(`invalid type: ${e.id} → ${e.type}`);
  if (!Number.isInteger(e.rank) || e.rank < 1) fail(`invalid rank: ${e.id} → ${e.rank}`);
  if (typeof e.compatibilityScore !== 'number' || e.compatibilityScore < 0 || e.compatibilityScore > 100)
    fail(`invalid compatibilityScore: ${e.id} → ${e.compatibilityScore}`);
  if (!e.reason || typeof e.reason !== 'string') fail(`missing reason: ${e.id}`);
  if (!e.movementPattern) fail(`missing movementPattern: ${e.id}`);
  if (e.editorialStatus !== 'Auto-Generated') fail(`edge not Auto-Generated: ${e.id}`);
  if (!Array.isArray(e.swapContexts) || e.swapContexts.length === 0) fail(`empty swapContexts: ${e.id}`);
  // shared primary must be real anatomical muscles, and must reflect samePrimaryMuscle
  for (const m of e.sharedPrimaryMuscleIds) {
    if (SYSTEM_MUSCLE_IDS.has(m)) fail(`sharedPrimaryMuscleIds contains system bucket: ${e.id} → ${m}`);
    if (!muscleIds.has(m)) fail(`sharedPrimaryMuscleIds invalid muscle: ${e.id} → ${m}`);
  }
  if (e.samePrimaryMuscle !== (e.sharedPrimaryMuscleIds.length > 0)) fail(`samePrimaryMuscle inconsistent: ${e.id}`);
  if (!bySource.has(e.sourceExerciseId)) bySource.set(e.sourceExerciseId, []);
  bySource.get(e.sourceExerciseId).push(e);
}

// ── 3. Movement-pattern preservation (the core rule) ───────────────────────────
for (const e of edges) {
  const a = byId.get(e.sourceExerciseId); const b = byId.get(e.targetExerciseId);
  if (!a || !b) continue;
  const crosses = a.movementPattern !== b.movementPattern;
  if (crosses) fail(`edge crosses movement patterns (${a.movementPattern} → ${b.movementPattern}): ${e.id}`);
  if (NON_DISCRIMINATING_PATTERNS.has(a.movementPattern)) fail(`edge based on non-discriminating pattern: ${e.id}`);
  // per-type explicit checks required by brief
  if ((e.type === 'Substitute' || e.type === 'Progression' || e.type === 'Regression') && crosses)
    fail(`${e.type} crosses movement patterns: ${e.id}`);
  // preservesPattern honesty
  const expected = preservesPattern(a, b);
  if (e.preservesPattern !== expected) fail(`preservesPattern dishonest: ${e.id} (is ${e.preservesPattern}, expected ${expected})`);
  if (!e.preservesPattern) fail(`edge with preservesPattern=false should not exist: ${e.id}`);
  // samePrimaryMuscle honesty vs real muscle overlap
  const shared = [...a.realPrimary].filter((m) => b.realPrimary.has(m));
  if (e.samePrimaryMuscle !== (shared.length > 0)) fail(`samePrimaryMuscle mismatch vs catalog: ${e.id}`);
  // equipmentChange honesty
  if (e.equipmentChange !== (a.equipmentId !== b.equipmentId)) fail(`equipmentChange dishonest: ${e.id}`);
}

// ── 4. Rank consistency per source ─────────────────────────────────────────────
for (const [sid, list] of bySource) {
  const ranks = list.map((e) => e.rank).sort((x, y) => x - y);
  const expected = Array.from({ length: list.length }, (_, i) => i + 1);
  if (JSON.stringify(ranks) !== JSON.stringify(expected)) fail(`ranks not contiguous 1..N for ${sid}: ${ranks}`);
  const ordered = list.slice().sort((a, b) => a.rank - b.rank);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].compatibilityScore > ordered[i - 1].compatibilityScore)
      fail(`score increases with rank for ${sid} at rank ${ordered[i].rank}`);
  }
  if (list.length > 8) warn(`${sid} has ${list.length} relationships (>8 target)`);
}

// ── 5. Projection non-overlap (EL-D12: the three arrays must not overlap) ───────
{
  const proj = projectToArrays(edges, ids);
  for (const [id, arrs] of proj) {
    const a = new Set(arrs.alternativeExerciseIds);
    const r = new Set(arrs.regressionExerciseIds);
    const p = new Set(arrs.progressionExerciseIds);
    for (const x of r) if (a.has(x)) fail(`projection overlap alt∩regression: ${id} → ${x}`);
    for (const x of p) if (a.has(x)) fail(`projection overlap alt∩progression: ${id} → ${x}`);
    for (const x of p) if (r.has(x)) fail(`projection overlap regression∩progression: ${id} → ${x}`);
  }
}

// ── 6. Reciprocal type sanity (if both directions exist) ───────────────────────
{
  const present = new Map(edges.map((e) => [`${e.sourceExerciseId}>${e.targetExerciseId}`, e]));
  const INV = { Progression: 'Regression', Regression: 'Progression', Substitute: 'Substitute', Variation: 'Variation', 'Equipment Alternative': 'Equipment Alternative' };
  let mism = 0;
  for (const e of edges) {
    const back = present.get(`${e.targetExerciseId}>${e.sourceExerciseId}`);
    if (back && back.type !== INV[e.type]) mism++;
  }
  if (mism) warn(`${mism} reciprocal edge(s) have non-inverse types (e.g. Progression not mirrored by Regression)`);
}

// ── 7. Editorial edge cases (WARN) ─────────────────────────────────────────────
{
  // exercises with zero relationships
  const zero = ids.filter((id) => !bySource.has(id));
  const zeroByPattern = {};
  for (const id of zero) { const p = byId.get(id).movementPattern; zeroByPattern[p] = (zeroByPattern[p] ?? 0) + 1; }
  warn(`${zero.length} exercises have zero relationships. By movement pattern: ${JSON.stringify(zeroByPattern)}`);

  // probable source miscategorization: exercise sits in a muscle-less pattern yet carries a real
  // anatomical secondary muscle (its primary is a system bucket) → cross-intent fallback links.
  const suspicious = [];
  for (const id of byId.keys()) {
    const n = byId.get(id);
    if (n.realPrimary.size === 0 && n.realSecondary.size > 0 && bySource.has(id)) {
      // does it have any cross-family substitute formed purely on the muscle-less fallback?
      const crossFamilySubs = bySource.get(id).filter((e) =>
        e.type === 'Substitute' && byId.get(e.targetExerciseId).family !== n.family && !e.samePrimaryMuscle);
      if (crossFamilySubs.length) suspicious.push({ id, pattern: n.movementPattern, n: crossFamilySubs.length });
    }
  }
  if (suspicious.length) {
    warn(`${suspicious.length} exercises form cross-family "muscle-less fallback" substitutes (probable source `
      + `miscategorization: real primary is a system bucket). Examples: `
      + suspicious.slice(0, 8).map((s) => `${s.id}[${s.pattern}]`).join(', '));
  }
}

// ── Report ─────────────────────────────────────────────────────────────────────
const line = (n) => console.log('─'.repeat(n));
console.log(`\nValidated ${edges.length} relationships across ${bySource.size} source exercises.`);
line(70);
console.log(`FAIL (integrity):        ${fails.length}`);
console.log(`VIOLATION (source data): ${violations.length}`);
console.log(`WARN (editorial):        ${warns.length}`);
line(70);
if (fails.length) { console.log('\n❌ FAILURES:'); fails.slice(0, 40).forEach((m) => console.log('  -', m)); }
if (violations.length) { console.log('\n⚠️  SOURCE-DATA VIOLATIONS (report, do not silently correct):'); violations.forEach((m) => console.log('  -', m)); }
if (warns.length) { console.log('\nℹ️  EDITORIAL EDGE CASES:'); warns.forEach((m) => console.log('  -', m)); }

if (fails.length) { console.log('\nRESULT: FAIL'); process.exit(1); }
console.log('\nRESULT: PASS (0 integrity failures)');
