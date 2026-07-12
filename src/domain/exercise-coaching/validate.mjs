/**
 * validate.mjs — validates the coaching content store against the canonical catalog.
 *
 *   node src/domain/exercise-coaching/validate.mjs            # validate committed store
 *   node src/domain/exercise-coaching/validate.mjs --dry-run  # generate in-memory + validate (no writes)
 *
 * Exit code 1 on any hard FAIL. VIOLATION (content-rule breaches) and WARN
 * (editorial edge cases) are reported but do not fail the build — the sibling
 * relationships validator uses the same three-tier contract.
 *
 *   FAIL      — schema/integrity. Must be zero.
 *   VIOLATION — content-quality rule breaches (mismatch, contradiction, missing parts).
 *   WARN      — editorial signals for human review (coverage gap, duplicate wording, ...).
 *
 * --dry-run generates a full-catalog batch IN MEMORY (nothing written/committed)
 * so the validator can be exercised across all exercises before any approved
 * production run. No coaching content is persisted.
 */

import { loadStore } from './store.mjs';
import {
  loadSources, loadRelationships, buildIndex, generateAll, detectDuplicates, detectContradictions,
  bannedPhrases, CONTENT_STATUSES, RISK_TIERS, REVIEW_FLAG_CODES, COACHING_SCHEMA_VERSION,
} from './engine.mjs';

const DRY = process.argv.includes('--dry-run');
const FIXED_NOW = '2026-07-11T00:00:00.000Z';

const fails = []; const violations = []; const warns = [];
const fail = (m) => fails.push(m);
const violation = (m) => violations.push(m);
const warn = (m) => warns.push(m);

// ── load ──────────────────────────────────────────────────────────────────────
const sources = loadSources();
const index = buildIndex(sources, loadRelationships());
const { byId, ids } = index;

const records = DRY ? generateAll(index, { now: FIXED_NOW }) : loadStore();

const STATUS_SET = new Set(CONTENT_STATUSES);
const RISK_SET = new Set(RISK_TIERS);
const FLAG_SET = new Set(REVIEW_FLAG_CODES);
const SEVERITY_SET = new Set(['info', 'warn', 'block']);
const STRING_ARRAYS = ['setupInstructions', 'executionSteps', 'coachingTips', 'commonMistakes',
  'cueHierarchy', 'advancedCoachingNotes', 'beginnerNotes', 'safetyNotes'];
const NULLABLE_STRINGS = ['breathingGuidance', 'tempoGuidance', 'rangeOfMotionNotes', 'equipmentSetup',
  'spottingNotes', 'difficultyConsiderations', 'coachNotes'];

const hasDup = (arr) => new Set(arr.map((x) => x.trim().toLowerCase())).size !== arr.length;

// ── 1. one record per exercise + valid ids ─────────────────────────────────────
const seen = new Set();
for (const r of records) {
  if (!r || typeof r !== 'object') { fail('record is not an object'); continue; }
  if (!r.exerciseId) { fail('record missing exerciseId'); continue; }
  if (seen.has(r.exerciseId)) fail(`duplicate record for exercise: ${r.exerciseId}`);
  seen.add(r.exerciseId);
  if (!byId.has(r.exerciseId)) fail(`record references unknown exercise id: ${r.exerciseId}`);
}

// ── 2. per-record structural + content checks ──────────────────────────────────
for (const r of records) {
  if (!r?.exerciseId || !byId.has(r.exerciseId)) continue;
  const id = r.exerciseId;
  const node = byId.get(id);

  // required top-level fields
  for (const k of ['locale', 'setupInstructions', 'executionSteps', 'coachingTips', 'commonMistakes',
    'mistakeCorrections', 'cueHierarchy', 'advancedCoachingNotes', 'beginnerNotes', 'safetyNotes',
    'reviewFlags', 'riskTier', 'confidenceScore', 'contentStatus', 'source', 'contentVersion',
    'schemaVersion', 'generatorVersion', 'contentHash', 'generatedAt', 'updatedAt', 'history']) {
    if (!(k in r)) fail(`${id}: missing field ${k}`);
  }
  for (const k of NULLABLE_STRINGS) if (!(k in r)) fail(`${id}: missing nullable field ${k}`);

  // array shape + duplicate content
  for (const k of STRING_ARRAYS) {
    if (!Array.isArray(r[k])) { fail(`${id}: ${k} is not an array`); continue; }
    if (r[k].some((x) => typeof x !== 'string')) fail(`${id}: ${k} contains a non-string`);
  }
  if (Array.isArray(r.coachingTips) && hasDup(r.coachingTips)) violation(`${id}: duplicate coaching tips`);
  if (Array.isArray(r.commonMistakes) && hasDup(r.commonMistakes)) violation(`${id}: duplicate common mistakes`);

  // required content presence
  if (Array.isArray(r.setupInstructions) && r.setupInstructions.length === 0) violation(`${id}: missing setup instructions`);
  if (Array.isArray(r.executionSteps) && r.executionSteps.length === 0) violation(`${id}: missing execution steps`);

  // corrections integrity — every mistake must have a matching correction
  if (!Array.isArray(r.mistakeCorrections)) fail(`${id}: mistakeCorrections is not an array`);
  else {
    const mSet = new Set((r.commonMistakes ?? []).map((m) => m.trim()));
    if ((r.commonMistakes ?? []).length !== r.mistakeCorrections.length)
      violation(`${id}: ${r.mistakeCorrections.length} corrections for ${(r.commonMistakes ?? []).length} mistakes (missing corrections)`);
    for (const c of r.mistakeCorrections) {
      if (!c || typeof c.mistake !== 'string' || typeof c.correction !== 'string') { fail(`${id}: malformed mistakeCorrection`); continue; }
      if (!mSet.has(c.mistake.trim())) violation(`${id}: correction references a mistake not in commonMistakes`);
      if (!c.correction.trim()) violation(`${id}: empty correction text`);
    }
  }

  // enums / numeric ranges
  if (!STATUS_SET.has(r.contentStatus)) fail(`${id}: invalid contentStatus "${r.contentStatus}"`);
  if (!RISK_SET.has(r.riskTier)) fail(`${id}: invalid riskTier "${r.riskTier}"`);
  if (r.source !== 'Auto-Generated' && r.source !== 'Editor-Edited') fail(`${id}: invalid source "${r.source}"`);
  if (typeof r.confidenceScore !== 'number' || r.confidenceScore < 0 || r.confidenceScore > 100 || Number.isNaN(r.confidenceScore))
    fail(`${id}: invalid confidenceScore ${r.confidenceScore}`);
  if (!Number.isInteger(r.contentVersion) || r.contentVersion < 1) fail(`${id}: invalid contentVersion ${r.contentVersion}`);
  if (r.schemaVersion !== COACHING_SCHEMA_VERSION) violation(`${id}: schemaVersion ${r.schemaVersion} != ${COACHING_SCHEMA_VERSION}`);

  // review flags
  if (Array.isArray(r.reviewFlags)) {
    for (const f of r.reviewFlags) {
      if (!FLAG_SET.has(f.code)) fail(`${id}: unknown review flag code "${f.code}"`);
      if (!SEVERITY_SET.has(f.severity)) fail(`${id}: invalid flag severity "${f.severity}"`);
    }
  } else fail(`${id}: reviewFlags is not an array`);

  // history
  if (!Array.isArray(r.history) || r.history.length === 0) fail(`${id}: history must be a non-empty array`);

  // workflow-state legality
  if ((r.contentStatus === 'Approved' || r.contentStatus === 'Published') && !r.approvedBy)
    violation(`${id}: status ${r.contentStatus} but approvedBy is null`);
  if (r.contentStatus === 'Published' && r.approvedAt == null)
    violation(`${id}: Published but approvedAt is null`);
  // automation invariant: an Auto-Generated record must never be self-approved
  if (r.source === 'Auto-Generated' && (r.contentStatus === 'Approved' || r.contentStatus === 'Published') && !r.approvedBy)
    fail(`${id}: auto-generated content advanced past review without a human approver`);

  // metadata contradiction checks (equipment / position / pattern)
  for (const c of detectContradictions(node, r)) {
    if (c.tier === 'violation') violation(`${id}: ${c.code} — ${c.detail}`);
    else warn(`${id}: ${c.code} — ${c.detail}`);
  }

  // banned generic phrasing
  const banned = bannedPhrases(r);
  if (banned.length) violation(`${id}: banned generic phrasing (${banned.join(', ')})`);
}

// ── 3. duplicate wording (cross-record) ────────────────────────────────────────
const dupes = detectDuplicates(records, index);
if (dupes.size) {
  const pairs = new Set();
  for (const [id, hits] of dupes) for (const h of hits) pairs.add([id, h.other].sort().join(' ↔ '));
  warn(`${pairs.size} near-identical coaching pair(s) across DIFFERENT exercises. Examples: ${[...pairs].slice(0, 6).join('; ')}`);
}

// ── 4. coverage + editorial summary (WARN) ─────────────────────────────────────
const covered = new Set(records.map((r) => r.exerciseId));
const gap = ids.filter((id) => !covered.has(id));
if (gap.length) warn(`coverage gap: ${gap.length}/${ids.length} exercises have no coaching record. e.g. ${gap.slice(0, 6).join(', ')}`);
const byStatus = {}; const byRisk = {};
for (const r of records) { byStatus[r.contentStatus] = (byStatus[r.contentStatus] ?? 0) + 1; byRisk[r.riskTier] = (byRisk[r.riskTier] ?? 0) + 1; }
if (records.length) {
  warn(`status breakdown: ${JSON.stringify(byStatus)}`);
  warn(`risk breakdown: ${JSON.stringify(byRisk)}`);
  const needs = records.filter((r) => r.contentStatus === 'Needs Review').length;
  const low = records.filter((r) => r.confidenceScore < 70).length;
  warn(`${needs} record(s) need review; ${low} below confidence 70`);
}

// ── report ─────────────────────────────────────────────────────────────────────
const line = (n) => console.log('─'.repeat(n));
console.log(`\n${DRY ? '[DRY-RUN — in-memory generation, nothing persisted] ' : ''}Validated ${records.length} coaching record(s) against ${ids.length} catalog exercises.`);
line(74);
console.log(`FAIL (integrity):      ${fails.length}`);
console.log(`VIOLATION (content):   ${violations.length}`);
console.log(`WARN (editorial):      ${warns.length}`);
line(74);
if (fails.length) { console.log('\n❌ FAILURES:'); fails.slice(0, 50).forEach((m) => console.log('  -', m)); }
if (violations.length) { console.log('\n⚠️  CONTENT VIOLATIONS:'); violations.slice(0, 50).forEach((m) => console.log('  -', m)); if (violations.length > 50) console.log(`  … +${violations.length - 50} more`); }
if (warns.length) { console.log('\nℹ️  EDITORIAL:'); warns.forEach((m) => console.log('  -', m)); }

if (fails.length) { console.log('\nRESULT: FAIL'); process.exit(1); }
console.log('\nRESULT: PASS (0 integrity failures)');
