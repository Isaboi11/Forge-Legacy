/**
 * Re-runs the clips the PO flagged in the review pass back through the CURRENT pipeline, and writes
 * them at the delivery format the bucket actually holds.
 *
 * WHY THIS IS A RE-PROCESS AND NOT A RE-SOURCE: every clip in the bucket was produced on 2026-08-05.
 * The machine-flicker fix (`clip_threshold` + `static_background`) landed 2026-08-08 and the
 * gap-flash relaxation (`BG_FRAC`) after the review. Nothing in the app has been through either. For
 * a clip the PO marked `glitchy` the SOURCE is fine — the matte was not — so the same source re-run
 * is the whole fix. A clip marked `no` is a different problem (wrong movement, wrong equipment,
 * wrong position) and is NOT touched here; that needs a new source clip, not a new matte.
 *
 *   node scripts/animation-processing/reprocess.mjs --verdict glitchy [--limit N] [--dry-run]
 *
 * Resumable: a clip whose output already exists is skipped, so a run killed at hour six costs
 * nothing. Nothing is uploaded — this only writes local files. Review them, then upload.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const has = (name) => process.argv.includes(name);

const VERDICT = arg('--verdict', 'glitchy');
const LIMIT = Number(arg('--limit', '0')) || Infinity;
const DRY = has('--dry-run');
const REVIEW_CSV = arg('--csv', path.join(HERE, 'animation-review.csv'));

function findLibrary() {
  const roots = ['F:', 'D:', 'E:', 'G:'].map((d) => path.join(d + '\\', 'Forge Legacy Animations'));
  const hit = roots.find((r) => fs.existsSync(path.join(r, 'MP4')));
  if (!hit) throw new Error(`Seagate not mounted — looked on ${roots.join(', ')}`);
  return hit;
}

/** The notes column contains commas and escaped quotes; a split(',') mangles it. */
function parseCsv(text) {
  const rows = [];
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const cells = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    const [id, name, variant, verdict, note] = cells;
    rows.push({ id, name, variant, verdict, note });
  }
  return rows;
}

const LIB = findLibrary();
const OUT_DIR = path.join(LIB, 'Reprocessed');
const sourceMap = JSON.parse(fs.readFileSync(path.join(HERE, 'source-map.json'), 'utf8')).map;

if (!fs.existsSync(REVIEW_CSV)) throw new Error(`review CSV not found: ${REVIEW_CSV}`);
const rows = parseCsv(fs.readFileSync(REVIEW_CSV, 'utf8')).filter((r) => r.verdict === VERDICT);

/**
 * A clip uploaded by `process_pending.py` was written under its catalog id, so `source-map.json`
 * cannot read the source out of the filename. Its source is recorded in `pending-clips.json`
 * instead — with an absolute path from whichever drive letter the Seagate had that day, so keep the
 * tail and re-root it on today's mount.
 */
const pendingSrc = new Map();
for (const p of JSON.parse(fs.readFileSync(path.join(HERE, 'pending-clips.json'), 'utf8')).pending) {
  const rel = (s) => (s ? s.replace(/^[A-Za-z]:[\\/]Forge Legacy Animations[\\/]/i, '') : null);
  if (p.catalog_id && p.male_src) pendingSrc.set(`male/${p.catalog_id}`, rel(p.male_src));
  if (p.catalog_id && p.female_src) pendingSrc.set(`female/${p.catalog_id}`, rel(p.female_src));
}

const work = [];
const skipped = [];
for (const r of rows) {
  const key = `${r.variant}/${r.id}`;
  const rel = sourceMap[key]?.source || pendingSrc.get(key);
  if (!rel) { skipped.push(`${key} — no source in source-map.json or pending-clips.json`); continue; }
  const src = path.join(LIB, rel);
  if (!fs.existsSync(src)) { skipped.push(`${key} — source file missing: ${rel}`); continue; }
  work.push({ ...r, key, src, out: path.join(OUT_DIR, r.variant, `${r.id}.webp`) });
}

console.log(`library    ${LIB}`);
console.log(`verdict    ${VERDICT} — ${rows.length} clips in the review`);
console.log(`resolved   ${work.length}   ·   unresolved ${skipped.length}`);
if (skipped.length) {
  console.log(`\nNOT PROCESSED (a missing source is reported, never guessed at):`);
  for (const s of skipped) console.log(`  ${s}`);
}

const todo = work.filter((w) => !fs.existsSync(w.out)).slice(0, LIMIT);
console.log(`\nalready done ${work.length - work.filter((w) => !fs.existsSync(w.out)).length} · to process ${todo.length}`);
if (DRY) { console.log('\n--dry-run: stopping before any work.'); process.exit(0); }

for (const v of ['male', 'female']) fs.mkdirSync(path.join(OUT_DIR, v), { recursive: true });

/** One clip: full pipeline at 720p, then the delivery downscale the bucket actually holds. */
function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    let err = '';
    p.stdout.on('data', () => {});
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(err.slice(-400)))));
  });
}

/**
 * Concurrency. A single clip is ~3 minutes and 210 of them is most of a day, but the pipeline is
 * numpy/scipy over one frame at a time — one core each, ~1.5GB peak. Workers get their OWN work
 * directory: `process_clip.py` clears `*.png` in its work dir on entry, so a shared one would have
 * two workers deleting each other's decoded frames mid-run.
 */
const JOBS = Math.max(1, Number(arg('--jobs', '4')));
const started = Date.now();
let done = 0, failed = 0, next = 0;

async function worker(slot) {
  const myWork = path.join(OUT_DIR, `_work${slot}`);
  while (true) {
    const i = next++;
    if (i >= todo.length) return;
    const w = todo[i];
    const full = w.out.replace(/\.webp$/, '.full.webp');
    try {
      await run('python', [path.join(HERE, 'process_clip.py'), w.src, full, myWork]);
      await run('python', [path.join(HERE, 'deliver.py'), full, w.out]);
      fs.unlinkSync(full);
      done++;
    } catch (e) {
      failed++;
      console.log(`  FAILED ${w.key}: ${e.message.split('\n').pop()}`);
      continue;
    }
    const per = (Date.now() - started) / done / 1000;
    const left = ((todo.length - done) * per / 60).toFixed(0);
    console.log(`[${done}/${todo.length}] ${w.key}  ·  ${per.toFixed(0)}s/clip avg  ·  ~${left}m left`);
  }
}

console.log(`running ${JOBS} workers\n`);
await Promise.all(Array.from({ length: JOBS }, (_, i) => worker(i)));

console.log(`\ndone ${done} · failed ${failed} · ${((Date.now() - started) / 60000).toFixed(0)}m total`);
console.log(`-> ${OUT_DIR}`);
console.log(`Nothing has been uploaded. Review, then run the upload step.`);
