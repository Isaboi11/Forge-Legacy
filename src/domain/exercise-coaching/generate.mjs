/**
 * generate.mjs — resumable, idempotent batch generator for coaching content.
 *
 *   node src/domain/exercise-coaching/generate.mjs [options]
 *
 * Options:
 *   --batch=<Name>     Only generate one batch (Machines, Cable, Dumbbells, ...).
 *   --regenerate       Refresh EXISTING auto-generated records (bumps version on
 *                      material change; never touches Editor-Edited/Approved/Published).
 *   --limit=<N>        Cap the number of NEW records this run (smoke tests).
 *   --now=<iso>        Fixed timestamp for reproducible output (tests/CI).
 *   --dry-run          Compute + report, write NOTHING.
 *
 * Resumability: by default, exercises that already have a record are LEFT ALONE,
 * so re-running only fills gaps. Running the generator twice never duplicates
 * work and (with --now fixed) produces byte-identical output.
 *
 * NOTE: Per the current project gate, NO batch production run has been executed.
 * The committed store (content/coaching_content.json) is intentionally empty and
 * awaits human approval before the first real generation run.
 */

import { STORE_PATH, MANIFEST_PATH, loadStore, writeStore, buildManifest } from './store.mjs';
import {
  loadSources, loadRelationships, buildIndex, assignBatch,
  buildRecord, regenerateRecord, detectDuplicates, routeStatus,
  GENERATION_BATCHES, GENERATOR_VERSION,
} from './engine.mjs';

// ── args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getOpt = (name) => { const a = args.find((x) => x.startsWith(`--${name}=`)); return a ? a.split('=').slice(1).join('=') : undefined; };
const hasFlag = (name) => args.includes(`--${name}`);
const onlyBatch = getOpt('batch');
const regenerate = hasFlag('regenerate');
const limit = getOpt('limit') ? Number(getOpt('limit')) : Infinity;
const now = getOpt('now') ?? new Date().toISOString();
const dryRun = hasFlag('dry-run');

if (onlyBatch && !GENERATION_BATCHES.includes(onlyBatch)) {
  console.error(`Unknown batch "${onlyBatch}". Valid: ${GENERATION_BATCHES.join(', ')}`);
  process.exit(1);
}

// ── load ──────────────────────────────────────────────────────────────────────
const sources = loadSources();
const index = buildIndex(sources, loadRelationships());
const store = loadStore();
const byId = new Map(store.map((r) => [r.exerciseId, r]));

// target ids in batch order, then id, filtered to a single batch if requested.
const targets = index.ids
  .map((id) => ({ id, node: index.byId.get(id), batch: assignBatch(index.byId.get(id)) }))
  .filter((t) => !onlyBatch || t.batch === onlyBatch)
  .sort((a, b) => (GENERATION_BATCHES.indexOf(a.batch) - GENERATION_BATCHES.indexOf(b.batch)) || (a.id < b.id ? -1 : 1));

// ── generate / resume ─────────────────────────────────────────────────────────
let created = 0; let regenerated = 0; let skipped = 0; let untouchedHuman = 0;
for (const { id, node } of targets) {
  const existing = byId.get(id);
  if (!existing) {
    if (created >= limit) { skipped++; continue; }
    byId.set(id, buildRecord(node, { now }));
    created++;
  } else if (regenerate) {
    const next = regenerateRecord(node, existing, { now });
    if (next === existing) { untouchedHuman += (existing.source === 'Editor-Edited' || existing.contentStatus === 'Approved' || existing.contentStatus === 'Published') ? 1 : 0; skipped++; }
    else { byId.set(id, next); regenerated++; }
  } else {
    skipped++;
  }
}

// ── cross-record duplicate-wording pass ───────────────────────────────────────
let allRecords = [...byId.values()];
const dupes = detectDuplicates(allRecords, index);
let dupFlagged = 0;
for (const r of allRecords) {
  const hits = dupes.get(r.exerciseId);
  const alreadyFlagged = r.reviewFlags.some((f) => f.code === 'DUPLICATE_WORDING');
  if (hits && hits.length && !alreadyFlagged) {
    // only re-flag automation-owned records (never mutate human-locked content)
    if (r.source === 'Editor-Edited' || r.contentStatus === 'Approved' || r.contentStatus === 'Published') continue;
    const top = hits.slice().sort((a, b) => b.similarity - a.similarity)[0];
    r.reviewFlags = [...r.reviewFlags, { code: 'DUPLICATE_WORDING', severity: 'warn', detail: `~${top.similarity}% identical wording to ${top.other}.` }];
    const node = index.byId.get(r.exerciseId);
    r.contentStatus = routeStatus(node, r, r.confidenceScore, r.reviewFlags, r.riskTier);
    dupFlagged++;
  }
}

// ── write ─────────────────────────────────────────────────────────────────────
allRecords = [...byId.values()].sort((a, b) => (a.exerciseId < b.exerciseId ? -1 : 1));
const manifest = buildManifest(allRecords, index, now);

if (!dryRun) {
  writeStore(allRecords, manifest);
}

// ── summary ───────────────────────────────────────────────────────────────────
const total = index.ids.length;
const covered = allRecords.length;
const byStatus = {};
for (const r of allRecords) byStatus[r.contentStatus] = (byStatus[r.contentStatus] ?? 0) + 1;
console.log(`${dryRun ? '[dry-run] ' : ''}Coaching generation — generator ${GENERATOR_VERSION}${onlyBatch ? ` (batch: ${onlyBatch})` : ''}`);
console.log(`  catalog: ${total}   covered: ${covered}   gap: ${total - covered}`);
console.log(`  created: ${created}   regenerated: ${regenerated}   skipped: ${skipped}   human-locked untouched: ${untouchedHuman}   duplicate-flagged: ${dupFlagged}`);
console.log('  by status:', byStatus);
if (!dryRun) console.log(`  wrote → ${STORE_PATH}\n         → ${MANIFEST_PATH}`);
else console.log('  (dry-run — nothing written)');
