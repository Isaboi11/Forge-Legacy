/**
 * publish.mjs — promote reviewed coaching records to `Published` (the only user-visible status).
 *
 * `Approved` and `Published` are HUMAN-ONLY transitions (schema.ts §status). This script does not
 * decide what is good; it applies a decision already made, and records who made it in `approvedBy` so
 * the attestation is traceable rather than anonymous.
 *
 * SELECTION — deliberately narrow. A record is publishable only when ALL hold:
 *   1. Its coaching body is UNIQUE across the store. 449 of 556 records share a body with another
 *      exercise, because generation templates by movement pattern and swaps the name in. That is how
 *      Barbell Step-Up ended up with squat coaching ("descend until your thighs reach parallel") at
 *      confidence 100. Uniqueness is the only signal that separates real per-exercise coaching from a
 *      template — the confidence score does not, and DUPLICATE_WORDING catches under a quarter of it.
 *   2. confidenceScore >= 80.
 *   3. No `warn`-severity review flag.
 *
 * Everything else stays unpublished and the UI simply omits those sections (W-22 §4.2). Fixing the rest
 * is a generator problem, not an editing problem.
 *
 *   node src/domain/exercise-coaching/publish.mjs --actor "Isaiah Altamirano"
 *   node src/domain/exercise-coaching/publish.mjs --dry
 */
import crypto from 'node:crypto';
import { loadStore, loadManifest, writeStore } from './store.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
/**
 * Return published records to the editorial pool so they can be regenerated.
 *
 * Publishing human-locks a record, which means a later engine improvement skips it — the record stays
 * frozen on the content it had when it was approved, while its neighbours improve around it. Publishing
 * must therefore be the LAST step after a generation pass, and re-running a pass means resetting first.
 */
const RESET = args.includes('--reset');
const actorIdx = args.indexOf('--actor');
const ACTOR = actorIdx >= 0 ? args[actorIdx + 1] : 'product-owner';

const bodyHash = (r) =>
  crypto
    .createHash('md5')
    .update(JSON.stringify([r.setupInstructions, r.executionSteps, r.coachingTips, r.commonMistakes]))
    .digest('hex');

const hasWarn = (r) => (r.reviewFlags ?? []).some((f) => f && f.severity === 'warn');

/**
 * `block` = "requires expert technical review" — Olympic lifts, advanced gymnastics, strongman
 * implements. These are NEVER published by this script, in any mode.
 *
 * Generic coaching is harmless on a leg extension and dangerous on an atlas stone lift, which currently
 * carries confidence 18 and the cue "Move under control through the full range of the movement". The
 * broad-coverage mode below deliberately accepts bland, repeated copy; it does not accept bland copy on
 * movements that can break someone. Those 63 need a specialist, not a lower threshold.
 */
const isBlocked = (r) => (r.reviewFlags ?? []).some((f) => f && f.severity === 'block');

/** Publish everything that isn't expert-review material — coverage over polish, by PO decision. */
const ALL = args.includes('--all');

const records = loadStore();
if (!records.length) {
  console.error('No coaching records found.');
  process.exit(1);
}

if (RESET) {
  const reverted = records.map((r) =>
    r.contentStatus === 'Published'
      ? { ...r, contentStatus: 'Auto-Validated', approvedBy: null, approvedAt: null }
      : r,
  );
  const n = records.filter((r) => r.contentStatus === 'Published').length;
  writeStore(reverted, loadManifest());
  console.log(`Reset ${n} published records to Auto-Validated. Re-run generation, then publish.`);
  process.exit(0);
}

const counts = new Map();
for (const r of records) counts.set(bodyHash(r), (counts.get(bodyHash(r)) ?? 0) + 1);

const isPublishable = (r) =>
  isBlocked(r)
    ? false
    : ALL || (counts.get(bodyHash(r)) === 1 && (r.confidenceScore ?? 0) >= 80 && !hasWarn(r));

const selected = records.filter(isPublishable);
const now = new Date().toISOString();

console.log(`records            ${records.length}`);
console.log(`mode               ${ALL ? 'ALL (coverage — generic accepted)' : 'STRICT (unique + confident + unflagged)'}`);
console.log(`unique-body        ${records.filter((r) => counts.get(bodyHash(r)) === 1).length}`);
console.log(`expert-review only ${records.filter(isBlocked).length}  (never published)`);
console.log(`→ publishing       ${selected.length}`);
console.log(`  held back        ${records.length - selected.length}`);

if (DRY) {
  console.log('\n--dry: nothing written.\n');
  for (const r of selected.slice(0, 10)) console.log(`  ${r.exerciseId}  (conf ${r.confidenceScore})`);
  process.exit(0);
}

const publishing = new Set(selected.map((r) => r.exerciseId));
const next = records.map((r) => {
  if (!publishing.has(r.exerciseId) || r.contentStatus === 'Published') return r;
  const version = (r.contentVersion ?? 1) + 1;
  return {
    ...r,
    contentStatus: 'Published',
    contentVersion: version,
    approvedBy: ACTOR,
    approvedAt: now,
    updatedAt: now,
    history: [...(r.history ?? []), { version, action: 'published', at: now, actor: ACTOR }],
  };
});

// The manifest is rebuilt from the catalog index during generation; publishing changes status only, so
// the existing manifest stays valid — carry it forward rather than fabricating a new one.
writeStore(next, loadManifest());
console.log(`\nPublished ${selected.length} records as "${ACTOR}" at ${now}`);
