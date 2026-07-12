/**
 * report.mjs — editorial review reports over the coaching content store.
 *
 *   node src/domain/exercise-coaching/report.mjs            # report on committed store
 *   node src/domain/exercise-coaching/report.mjs --dry-run  # report on in-memory full generation
 *   node src/domain/exercise-coaching/report.mjs --json     # machine-readable output
 *
 * Sections: summary statistics, coverage by batch, status/risk breakdown, flag
 * frequency, lowest confidence, specialist exercises, needs-review queue,
 * most-edited, duplicate wording, and missing content (coverage gap).
 *
 * These reports drive the human editorial pass — they never mutate content.
 */

import { loadStore, loadManifest } from './store.mjs';
import {
  loadSources, loadRelationships, buildIndex, generateAll, detectDuplicates, assignBatch,
  GENERATION_BATCHES,
} from './engine.mjs';

const DRY = process.argv.includes('--dry-run');
const JSON_OUT = process.argv.includes('--json');
const FIXED_NOW = '2026-07-11T00:00:00.000Z';
const TOP = 15;

const sources = loadSources();
const index = buildIndex(sources, loadRelationships());
const { byId, ids } = index;
const records = DRY ? generateAll(index, { now: FIXED_NOW }) : loadStore();
const name = (id) => byId.get(id)?.name ?? id;

// ── aggregate ──────────────────────────────────────────────────────────────────
const covered = new Set(records.map((r) => r.exerciseId));
const gap = ids.filter((id) => !covered.has(id));

const byStatus = {}; const byRisk = {}; const byBatch = {}; const flagFreq = {};
for (const b of GENERATION_BATCHES) byBatch[b] = 0;
for (const r of records) {
  byStatus[r.contentStatus] = (byStatus[r.contentStatus] ?? 0) + 1;
  byRisk[r.riskTier] = (byRisk[r.riskTier] ?? 0) + 1;
  const node = byId.get(r.exerciseId);
  if (node) byBatch[assignBatch(node)]++;
  for (const f of r.reviewFlags) flagFreq[f.code] = (flagFreq[f.code] ?? 0) + 1;
}
const confidences = records.map((r) => r.confidenceScore);
const avgConf = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
const confBands = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 };
for (const c of confidences) {
  if (c >= 90) confBands['90-100']++; else if (c >= 80) confBands['80-89']++;
  else if (c >= 70) confBands['70-79']++; else if (c >= 60) confBands['60-69']++; else confBands['<60']++;
}

const lowest = records.slice().sort((a, b) => a.confidenceScore - b.confidenceScore || (a.exerciseId < b.exerciseId ? -1 : 1)).slice(0, TOP);
const specialists = records.filter((r) => r.riskTier === 'Specialist').sort((a, b) => (a.exerciseId < b.exerciseId ? -1 : 1));
const needsReview = records.filter((r) => r.contentStatus === 'Needs Review');
const mostEdited = records.slice().sort((a, b) => b.contentVersion - a.contentVersion || b.history.length - a.history.length).slice(0, TOP).filter((r) => r.contentVersion > 1);
const dupes = detectDuplicates(records, index);
const dupPairs = new Set();
for (const [id, hits] of dupes) for (const h of hits) dupPairs.add([id, h.other].sort().join(' ↔ '));

const summary = {
  catalogSize: ids.length,
  covered: records.length,
  coverageGap: gap.length,
  coveragePct: ids.length ? Math.round((records.length / ids.length) * 1000) / 10 : 0,
  avgConfidence: Math.round(avgConf * 10) / 10,
  byStatus, byRisk, byBatch, flagFrequency: flagFreq, confidenceBands: confBands,
  needsReview: needsReview.length,
  duplicateWordingPairs: dupPairs.size,
  regeneratedRecords: mostEdited.length,
};

// ── json mode ───────────────────────────────────────────────────────────────────
if (JSON_OUT) {
  console.log(JSON.stringify({
    dryRun: DRY,
    summary,
    lowestConfidence: lowest.map((r) => ({ exerciseId: r.exerciseId, confidence: r.confidenceScore, risk: r.riskTier, status: r.contentStatus })),
    specialists: specialists.map((r) => r.exerciseId),
    needsReview: needsReview.map((r) => r.exerciseId),
    duplicateWordingPairs: [...dupPairs],
    coverageGapSample: gap.slice(0, 50),
  }, null, 2));
  process.exit(0);
}

// ── human-readable ────────────────────────────────────────────────────────────
const h = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);
const line = () => console.log('─'.repeat(74));
const pct = (n) => `${Math.round((n / Math.max(1, records.length)) * 100)}%`;

console.log(`\n${DRY ? '[DRY-RUN — in-memory generation, nothing persisted]\n' : ''}FORGE COACHING CONTENT — REVIEW REPORT`);
line();
const manifest = DRY ? null : loadManifest();
if (manifest) console.log(`store updated: ${manifest.updatedAt}  ·  generator: ${manifest.generatorVersion}`);

h('SUMMARY');
console.log(`  catalog exercises:   ${summary.catalogSize}`);
console.log(`  coaching records:    ${summary.covered}  (${summary.coveragePct}% coverage, ${summary.coverageGap} missing)`);
console.log(`  average confidence:  ${summary.avgConfidence}`);
console.log(`  needs review:        ${summary.needsReview}`);
console.log(`  regenerated (>v1):   ${summary.regeneratedRecords}`);
console.log(`  duplicate pairs:     ${summary.duplicateWordingPairs}`);

h('COVERAGE BY BATCH');
for (const b of GENERATION_BATCHES) console.log(`  ${b.padEnd(12)} ${byBatch[b]}`);

h('STATUS BREAKDOWN');
for (const s of Object.keys(byStatus)) console.log(`  ${s.padEnd(16)} ${byStatus[s]}  (${pct(byStatus[s])})`);

h('RISK BREAKDOWN');
for (const s of Object.keys(byRisk)) console.log(`  ${s.padEnd(12)} ${byRisk[s]}  (${pct(byRisk[s])})`);

h('CONFIDENCE DISTRIBUTION');
for (const band of Object.keys(confBands)) console.log(`  ${band.padEnd(8)} ${confBands[band]}`);

h('REVIEW-FLAG FREQUENCY');
for (const code of Object.keys(flagFreq).sort((a, b) => flagFreq[b] - flagFreq[a])) console.log(`  ${code.padEnd(30)} ${flagFreq[code]}`);

h(`LOWEST CONFIDENCE (top ${TOP})`);
for (const r of lowest) console.log(`  ${String(r.confidenceScore).padStart(5)}  ${r.riskTier.padEnd(11)} ${r.exerciseId}`);

h(`SPECIALIST EXERCISES (${specialists.length})`);
for (const r of specialists.slice(0, 30)) console.log(`  ${r.exerciseId}  — ${r.reviewFlags.filter((f) => f.severity === 'block' || f.code.includes('SPECIALIST')).map((f) => f.code).join(', ') || 'SPECIALIST_TIER'}`);
if (specialists.length > 30) console.log(`  … +${specialists.length - 30} more`);

h(`NEEDS REVIEW QUEUE (${needsReview.length}${needsReview.length > 20 ? ', showing 20' : ''})`);
for (const r of needsReview.slice(0, 20)) console.log(`  ${r.exerciseId.padEnd(38)} conf ${String(r.confidenceScore).padStart(5)}  flags: ${r.reviewFlags.map((f) => f.code).join(', ')}`);

h(`MOST EDITED (${mostEdited.length})`);
if (!mostEdited.length) console.log('  (none — no records regenerated past v1)');
for (const r of mostEdited) console.log(`  v${r.contentVersion}  ${r.exerciseId}  (${r.history.length} history entries)`);

h(`DUPLICATE WORDING (${dupPairs.size} pair(s))`);
if (!dupPairs.size) console.log('  (none)');
for (const p of [...dupPairs].slice(0, 20)) console.log(`  ${p}`);

h(`MISSING CONTENT (${gap.length})`);
if (!gap.length) console.log('  (none — full coverage)');
else console.log(`  ${gap.slice(0, 20).map(name).join(', ')}${gap.length > 20 ? `, … +${gap.length - 20} more` : ''}`);

console.log('');
