/**
 * coaching.test.mjs — automated tests for the Forge coaching content system.
 * Run:  node --test src/domain/exercise-coaching/__tests__/coaching.test.mjs
 * Zero dependencies (node:test + node:assert).
 *
 * Covers: schema, generation, validation invariants, versioning, confidence,
 * workflow, duplicate detection, review flags, risk classification, batch
 * generation, idempotency, and integration/projection.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadSources, loadRelationships, buildIndex, generateAll, buildRecord, regenerateRecord,
  classifyRisk, assignBatch, composeContent, contentHash,
  detectContradictions, detectDuplicates, bannedPhrases, routeStatus, transition, canTransition,
  projectToView, signatureTokens,
  CONTENT_STATUSES, AUTOMATABLE_STATUSES, RISK_TIERS, REVIEW_FLAG_CODES, GENERATION_BATCHES,
  COACHING_SCHEMA_VERSION, GENERATOR_VERSION,
} from '../engine.mjs';
import { loadStore, loadManifest } from '../store.mjs';

const FIXED = '2026-07-11T00:00:00.000Z';
const sources = loadSources();
const index = buildIndex(sources, loadRelationships());
const records = generateAll(index, { now: FIXED });
const byRecId = new Map(records.map((r) => [r.exerciseId, r]));
const rec = (id) => byRecId.get(id);
const node = (id) => index.byId.get(id);

const CONTENT_STATUS_SET = new Set(CONTENT_STATUSES);
const RISK_SET = new Set(RISK_TIERS);
const FLAG_SET = new Set(REVIEW_FLAG_CODES);

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
test('schema — every record carries the required fields with correct types', () => {
  for (const r of records) {
    for (const k of ['exerciseId', 'locale', 'setupInstructions', 'executionSteps', 'coachingTips',
      'commonMistakes', 'mistakeCorrections', 'cueHierarchy', 'advancedCoachingNotes', 'beginnerNotes',
      'safetyNotes', 'reviewFlags', 'riskTier', 'confidenceScore', 'contentStatus', 'source',
      'contentVersion', 'schemaVersion', 'generatorVersion', 'contentHash', 'generatedAt', 'updatedAt',
      'reviewedBy', 'approvedBy', 'approvedAt', 'history']) {
      assert.ok(k in r, `${r.exerciseId} missing ${k}`);
    }
    assert.ok(Array.isArray(r.setupInstructions) && Array.isArray(r.executionSteps));
    assert.equal(r.schemaVersion, COACHING_SCHEMA_VERSION);
    assert.equal(r.generatorVersion, GENERATOR_VERSION);
    assert.ok(CONTENT_STATUS_SET.has(r.contentStatus));
    assert.ok(RISK_SET.has(r.riskTier));
    assert.equal(r.locale, 'en');
  }
});

test('schema — exactly one record per catalog exercise, ids unique', () => {
  assert.equal(records.length, index.ids.length);
  const seen = new Set();
  for (const r of records) {
    assert.ok(!seen.has(r.exerciseId), `duplicate ${r.exerciseId}`);
    seen.add(r.exerciseId);
    assert.ok(index.byId.has(r.exerciseId), `unknown id ${r.exerciseId}`);
  }
});

test('schema — every review flag uses a known code + valid severity', () => {
  for (const r of records) for (const f of r.reviewFlags) {
    assert.ok(FLAG_SET.has(f.code), `bad flag ${f.code}`);
    assert.ok(['info', 'warn', 'block'].includes(f.severity));
    assert.equal(typeof f.detail, 'string');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GENERATION (metadata-driven, specific, non-generic)
// ─────────────────────────────────────────────────────────────────────────────
test('generation — full catalog coverage, non-empty setup + execution + tips', () => {
  for (const r of records) {
    assert.ok(r.setupInstructions.length >= 1, `${r.exerciseId} empty setup`);
    assert.ok(r.executionSteps.length >= 1, `${r.exerciseId} empty execution`);
    assert.ok(r.coachingTips.length >= 1, `${r.exerciseId} no tips`);
  }
});

test('generation — deliberately sparse "Other"-pattern residue is flagged SPARSE_CONTENT', () => {
  const other = records.filter((r) => node(r.exerciseId).movementPattern === 'Other');
  assert.ok(other.length > 0);
  const sparse = other.filter((r) => r.reviewFlags.some((f) => f.code === 'SPARSE_CONTENT'));
  assert.ok(sparse.length > 0, 'expected some Other-pattern records to be flagged sparse');
});

test('generation — no banned generic phrasing anywhere', () => {
  for (const r of records) assert.equal(bannedPhrases(r).length, 0, `${r.exerciseId}: ${bannedPhrases(r)}`);
});

test('generation — corrections are 1:1 with mistakes and reference real mistakes', () => {
  for (const r of records) {
    assert.equal(r.mistakeCorrections.length, r.commonMistakes.length, `${r.exerciseId} correction count`);
    const mset = new Set(r.commonMistakes);
    for (const c of r.mistakeCorrections) {
      assert.ok(mset.has(c.mistake), `${r.exerciseId}: correction for unknown mistake`);
      assert.ok(c.correction.trim().length > 0);
    }
  }
});

test('generation — coaching is equipment-appropriate (machines never say "bar"/"barbell")', () => {
  for (const r of records) {
    const n = node(r.exerciseId);
    if (n.equipmentId !== 'selectorized_machine') continue;
    const text = signatureTokens(r);
    assert.ok(!text.has('barbell'), `${r.exerciseId} machine mentions barbell`);
  }
});

test('generation — unilateral exercises get single-side coaching', () => {
  const uni = records.filter((r) => node(r.exerciseId).unilateral).slice(0, 20);
  assert.ok(uni.length > 0);
  for (const r of uni) {
    const joined = [...r.executionSteps, ...r.coachingTips].join(' ').toLowerCase();
    assert.ok(joined.includes('one side') || joined.includes('working side'), `${r.exerciseId} missing unilateral cue`);
  }
});

test('generation — machine records carry an equipment setup line', () => {
  for (const r of records) {
    const n = node(r.exerciseId);
    if (n.isMachine || n.isCable) assert.ok(r.equipmentSetup, `${r.exerciseId} missing equipmentSetup`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION INVARIANTS
// ─────────────────────────────────────────────────────────────────────────────
test('validation — generated corpus has zero definite (violation-tier) contradictions', () => {
  for (const r of records) {
    const bad = detectContradictions(node(r.exerciseId), r).filter((c) => c.tier === 'violation');
    assert.equal(bad.length, 0, `${r.exerciseId}: ${JSON.stringify(bad)}`);
  }
});

test('validation — the committed store is EMPTY (no content generated yet)', () => {
  assert.deepEqual(loadStore(), []);
  const m = loadManifest();
  for (const b of GENERATION_BATCHES) assert.deepEqual(m.completedByBatch[b], []);
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE
// ─────────────────────────────────────────────────────────────────────────────
test('confidence — every score is 0..100 with one decimal', () => {
  for (const r of records) {
    assert.ok(r.confidenceScore >= 0 && r.confidenceScore <= 100);
    assert.equal(Math.round(r.confidenceScore * 10) / 10, r.confidenceScore);
  }
});

test('confidence — Specialist averages below Standard', () => {
  const avg = (tier) => {
    const xs = records.filter((r) => r.riskTier === tier).map((r) => r.confidenceScore);
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };
  assert.ok(avg('Specialist') < avg('Standard'), 'specialist should be less confident than standard');
});

test('confidence — an "Other"-pattern exercise scores lower than a clean standard machine', () => {
  const other = records.filter((r) => node(r.exerciseId).movementPattern === 'Other')[0];
  const clean = rec('machine-chest-press');
  assert.ok(other.confidenceScore < clean.confidenceScore);
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
test('workflow — automation never emits Approved/Published', () => {
  for (const r of records) assert.ok(AUTOMATABLE_STATUSES.has(r.contentStatus), `${r.exerciseId} → ${r.contentStatus}`);
});

test('workflow — clean standard exercise auto-validates; specialist routes to review', () => {
  // isolate routing from the cross-record duplicate pass by building directly
  assert.equal(buildRecord(node('machine-chest-press'), { now: FIXED }).contentStatus, 'Auto-Validated');
  assert.equal(rec('barbell-snatch').contentStatus, 'Needs Review');
  assert.equal(rec('barbell-back-squat').contentStatus, 'Needs Review'); // Technical
});

test('workflow — Approve/Publish are human-only and set approver metadata', () => {
  const base = buildRecord(node('machine-chest-press'), { now: FIXED });
  // automation cannot approve
  assert.throws(() => transition(base, 'Approved', { now: FIXED }), /human-only/);
  // human review path: Auto-Validated → Approved → Published
  const approved = transition(base, 'Approved', { actor: 'editor@forge', isHuman: true, now: FIXED });
  assert.equal(approved.contentStatus, 'Approved');
  assert.equal(approved.approvedBy, 'editor@forge');
  assert.equal(approved.approvedAt, FIXED);
  assert.ok(approved.history.length > base.history.length);
  const published = transition(approved, 'Published', { actor: 'editor@forge', isHuman: true, now: FIXED });
  assert.equal(published.contentStatus, 'Published');
});

test('workflow — illegal transitions are rejected', () => {
  assert.ok(!canTransition('Draft', 'Published'));
  assert.throws(() => transition({ ...rec('machine-chest-press'), contentStatus: 'Draft' }, 'Published', { actor: 'x', isHuman: true }));
});

test('workflow — routeStatus is a pure function of risk/flags/confidence', () => {
  const n = node('machine-chest-press');
  const c = composeContent(n);
  assert.equal(routeStatus(n, c, 90, [], 'Standard'), 'Auto-Validated');
  assert.equal(routeStatus(n, c, 90, [{ code: 'SPARSE_CONTENT', severity: 'warn', detail: '' }], 'Standard'), 'Needs Review');
  assert.equal(routeStatus(n, c, 50, [], 'Standard'), 'Needs Review');
  assert.equal(routeStatus(n, c, 99, [], 'Specialist'), 'Needs Review');
});

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONING
// ─────────────────────────────────────────────────────────────────────────────
test('versioning — regenerate with no change is idempotent (same version, untouched)', () => {
  const original = buildRecord(node('machine-chest-press'), { now: FIXED });
  const again = regenerateRecord(node('machine-chest-press'), original, { now: '2027-01-01T00:00:00.000Z' });
  assert.equal(again.contentVersion, original.contentVersion);
  assert.equal(again.contentHash, original.contentHash);
});

test('versioning — content change bumps version + appends history', () => {
  const original = buildRecord(node('machine-chest-press'), { now: FIXED });
  const edited = { ...original, coachingTips: [...original.coachingTips, 'A brand new tip about the handle.'] };
  edited.contentHash = contentHash(edited);
  const regen = regenerateRecord(node('machine-chest-press'), edited, { now: '2027-01-01T00:00:00.000Z' });
  assert.equal(regen.contentVersion, edited.contentVersion + 1);
  assert.equal(regen.history[regen.history.length - 1].action, 'regenerated');
  assert.equal(regen.updatedAt, '2027-01-01T00:00:00.000Z');
});

test('versioning — human-edited / approved content is never overwritten', () => {
  const editor = { ...buildRecord(node('machine-chest-press'), { now: FIXED }), source: 'Editor-Edited', coachingTips: ['human wording'] };
  assert.equal(regenerateRecord(node('machine-chest-press'), editor, { now: FIXED }), editor);
  const approved = { ...buildRecord(node('machine-chest-press'), { now: FIXED }), contentStatus: 'Approved' };
  assert.equal(regenerateRecord(node('machine-chest-press'), approved, { now: FIXED }), approved);
});

test('versioning — contentHash is deterministic and content-sensitive', () => {
  const a = composeContent(node('barbell-bench-press'));
  const b = composeContent(node('barbell-bench-press'));
  assert.equal(contentHash(a), contentHash(b));
  const c = { ...a, coachingTips: [...a.coachingTips, 'extra'] };
  assert.notEqual(contentHash(a), contentHash(c));
});

// ─────────────────────────────────────────────────────────────────────────────
// RISK CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────
test('risk — Specialist for Olympic/gymnastics/strongman', () => {
  for (const id of ['barbell-snatch', 'planche-hold', 'atlas-stone-lift']) assert.equal(classifyRisk(node(id)), 'Specialist');
});

test('risk — Technical for free-weight compounds and bodyweight skills', () => {
  for (const id of ['barbell-back-squat', 'barbell-deadlift', 'pull-up']) assert.equal(classifyRisk(node(id)), 'Technical');
});

test('risk — Standard for machines / cable isolation', () => {
  for (const id of ['leg-extension-machine', 'machine-chest-press', 'cable-biceps-curl']) assert.equal(classifyRisk(node(id)), 'Standard');
});

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW FLAGS
// ─────────────────────────────────────────────────────────────────────────────
test('flags — Olympic/gymnastics/strongman raise a blocking flag', () => {
  assert.ok(rec('barbell-snatch').reviewFlags.some((f) => f.code === 'OLYMPIC_LIFT' && f.severity === 'block'));
  assert.ok(rec('planche-hold').reviewFlags.some((f) => f.code === 'ADVANCED_GYMNASTICS' && f.severity === 'block'));
  assert.ok(rec('atlas-stone-lift').reviewFlags.some((f) => f.code === 'STRONGMAN' && f.severity === 'block'));
});

test('flags — "Other" pattern raises METADATA_INCONSISTENCY', () => {
  const other = records.filter((r) => node(r.exerciseId).movementPattern === 'Other');
  assert.ok(other.length > 0);
  for (const r of other) assert.ok(r.reviewFlags.some((f) => f.code === 'METADATA_INCONSISTENCY'));
});

test('flags — spotting guidance raises SPOTTING_REQUIRED for free-weight bench/overhead', () => {
  const bench = rec('barbell-bench-press');
  assert.ok(bench.spottingNotes);
  assert.ok(bench.reviewFlags.some((f) => f.code === 'SPOTTING_REQUIRED'));
});

test('flags — clean machine record carries no blocking flags', () => {
  assert.ok(!rec('machine-chest-press').reviewFlags.some((f) => f.severity === 'block'));
});

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATE DETECTION
// ─────────────────────────────────────────────────────────────────────────────
const CONTENT_ARR_KEYS = ['setupInstructions', 'executionSteps', 'coachingTips', 'commonMistakes', 'cueHierarchy', 'beginnerNotes', 'advancedCoachingNotes', 'safetyNotes'];
function fakeRec(id, phrase) {
  const r = { exerciseId: id, mistakeCorrections: [], breathingGuidance: phrase, tempoGuidance: null, rangeOfMotionNotes: null, equipmentSetup: null, spottingNotes: null, difficultyConsiderations: null, coachNotes: null };
  for (const k of CONTENT_ARR_KEYS) r[k] = [phrase];
  return r;
}
function fakeIndex(nodes) { return { byId: new Map(nodes.map((n) => [n.id, n])), ids: nodes.map((n) => n.id) }; }

test('duplicates — identical wording across DIFFERENT families+muscles is flagged', () => {
  const idx = fakeIndex([
    { id: 'a', family: 'FamA', realPrimary: new Set(['chest']), movementPattern: 'Horizontal Push' },
    { id: 'b', family: 'FamB', realPrimary: new Set(['quadriceps']), movementPattern: 'Horizontal Push' },
  ]);
  const dup = detectDuplicates([fakeRec('a', 'press the load with control'), fakeRec('b', 'press the load with control')], idx);
  assert.ok(dup.get('a')?.some((h) => h.other === 'b'));
});

test('duplicates — shared FAMILY wording is acceptable (not flagged)', () => {
  const idx = fakeIndex([
    { id: 'a', family: 'FamA', realPrimary: new Set(['chest']), movementPattern: 'Horizontal Push' },
    { id: 'c', family: 'FamA', realPrimary: new Set(['chest']), movementPattern: 'Horizontal Push' },
  ]);
  const dup = detectDuplicates([fakeRec('a', 'press the load with control'), fakeRec('c', 'press the load with control')], idx);
  assert.ok(!dup.has('a') && !dup.has('c'));
});

test('duplicates — shared PRIMARY muscle wording is acceptable (not flagged)', () => {
  const idx = fakeIndex([
    { id: 'a', family: 'FamA', realPrimary: new Set(['chest']), movementPattern: 'Horizontal Push' },
    { id: 'b', family: 'FamB', realPrimary: new Set(['chest']), movementPattern: 'Horizontal Push' },
  ]);
  const dup = detectDuplicates([fakeRec('a', 'press the load with control'), fakeRec('b', 'press the load with control')], idx);
  assert.ok(!dup.has('a'));
});

// ─────────────────────────────────────────────────────────────────────────────
// BATCH GENERATION
// ─────────────────────────────────────────────────────────────────────────────
test('batch — every exercise maps to exactly one known batch', () => {
  const set = new Set(GENERATION_BATCHES);
  for (const id of index.ids) assert.ok(set.has(assignBatch(node(id))), `${id} bad batch`);
});

test('batch — assignment matches expectations', () => {
  assert.equal(assignBatch(node('barbell-snatch')), 'Specialist');
  assert.equal(assignBatch(node('easy-run')), 'Cardio');
  assert.equal(assignBatch(node('machine-chest-press')), 'Machines');
  assert.equal(assignBatch(node('cable-biceps-curl')), 'Cable');
});

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY
// ─────────────────────────────────────────────────────────────────────────────
test('idempotency — buildRecord twice with fixed clock is byte-identical', () => {
  const a = JSON.stringify(buildRecord(node('barbell-bench-press'), { now: FIXED }));
  const b = JSON.stringify(buildRecord(node('barbell-bench-press'), { now: FIXED }));
  assert.equal(a, b);
});

test('idempotency — generateAll twice is byte-identical', () => {
  const a = JSON.stringify(generateAll(index, { now: FIXED }));
  const b = JSON.stringify(generateAll(buildIndex(loadSources(), loadRelationships()), { now: FIXED }));
  assert.equal(a, b);
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION / PROJECTION
// ─────────────────────────────────────────────────────────────────────────────
test('integration — projection strips ALL internal editorial fields', () => {
  const published = { ...rec('machine-chest-press'), contentStatus: 'Published' };
  const view = projectToView(published);
  assert.deepEqual(Object.keys(view).sort(), ['advancedNotes', 'commonMistakes', 'exerciseId', 'instructions', 'safetyNotes', 'tips'].sort());
  for (const leak of ['confidenceScore', 'reviewFlags', 'contentStatus', 'riskTier', 'coachNotes', 'mistakeCorrections', 'history', 'source']) {
    assert.ok(!(leak in view), `projection leaked ${leak}`);
  }
});

test('integration — only Published content is served; instructions = setup + execution', () => {
  const published = { ...rec('machine-chest-press'), contentStatus: 'Published' };
  assert.equal(projectToView({ ...rec('machine-chest-press'), contentStatus: 'Needs Review' }), null);
  const view = projectToView(published);
  assert.deepEqual(view.instructions, [...published.setupInstructions, ...published.executionSteps]);
  assert.deepEqual(view.commonMistakes, published.commonMistakes);
});
