/**
 * For every clip the PO rejected outright (`no`), find the OTHER takes of that movement in the raw
 * library so a replacement can be chosen.
 *
 * WHY THIS ONLY PROPOSES: the rejections are not "the matte broke", they are "this is the wrong
 * clip" — seated when it should be standing, a band when it should be a cable, dumbbells in a
 * bodyweight movement. Those distinctions live in the PICTURE, not the filename, and the library is
 * full of near-miss names ("Cable Standing Crossover" vs "Cable Low Crossover"). An automatic pick
 * here would quietly ship the wrong movement, which is worse than shipping none — so this ranks
 * candidates, carries the PO's own note next to them, and stops. A human picks.
 *
 * The clip currently in the bucket is always excluded: it is the one already judged wrong.
 *
 *   node scripts/animation-processing/find_alternates.mjs [--csv path] [--json out.json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const arg = (n, d = null) => {
  const i = process.argv.indexOf(n);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};

const STOP = new Set(['the', 'a', 'with', 'to', 'and', 'of', 'on', 'in', 'male', 'female', 'fix',
                      'for', 'at', 'an', '', 'version', 'variation']);

const toks = (s) => new Set(
  s.toLowerCase().replace(/&/g, 'and').split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => w.replace(/(?<=.{3})s$/, ''))
);

/** Words that decide whether a take is the RIGHT take. The PO's notes are almost entirely these. */
const DISCRIMINATORS = ['standing', 'seated', 'sitting', 'lying', 'kneeling', 'incline', 'decline',
                        'flat', 'single', 'one', 'arm', 'leg', 'cable', 'band', 'dumbbell', 'barbell',
                        'machine', 'lever', 'smith', 'bodyweight', 'assisted', 'bench', 'floor'];

function findLibrary() {
  const roots = ['F:', 'D:', 'E:', 'G:'].map((d) => path.join(d + '\\', 'Forge Legacy Animations'));
  const hit = roots.find((r) => fs.existsSync(path.join(r, 'MP4')));
  if (!hit) throw new Error(`Seagate not mounted — looked on ${roots.join(', ')}`);
  return hit;
}

function parseCsv(text) {
  return text.trim().split(/\r?\n/).slice(1).map((line) => {
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
    return { id: cells[0], name: cells[1], variant: cells[2], verdict: cells[3], note: cells[4] };
  });
}

const LIB = findLibrary();
const sourceMap = JSON.parse(fs.readFileSync(path.join(HERE, 'source-map.json'), 'utf8')).map;
const rows = parseCsv(fs.readFileSync(arg('--csv', path.join(HERE, 'animation-review.csv')), 'utf8'))
  .filter((r) => r.verdict === 'no');

// Index the raw library once, per gender.
const library = { male: [], female: [] };
for (const sex of ['MALE', 'FEMALE']) {
  const base = path.join(LIB, 'MP4', sex);
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.toLowerCase().endsWith('.mp4')) {
        library[sex.toLowerCase()].push({
          file: e.name,
          rel: path.relative(LIB, p).replace(/\\/g, '/'),
          toks: toks(e.name.replace(/\.mp4$/i, '')),
        });
      }
    }
  };
  if (fs.existsSync(base)) walk(base);
}
// De-duplicate: the library keeps the same clip under Gym_Workout_ and Library_database.
for (const g of ['male', 'female']) {
  const seen = new Set();
  library[g] = library[g].filter((c) => (seen.has(c.file) ? false : (seen.add(c.file), true)));
}
console.log(`library: male ${library.male.length} · female ${library.female.length} (deduplicated)`);

const out = [];
for (const r of rows) {
  const key = `${r.variant}/${r.id}`;
  const current = sourceMap[key]?.source || null;
  const want = toks(r.name);
  const noteToks = toks(r.note || '');
  const wanted = DISCRIMINATORS.filter((d) => noteToks.has(d));

  const scored = library[r.variant]
    .filter((c) => c.rel !== current)
    .map((c) => {
      const overlap = [...want].filter((w) => c.toks.has(w)).length / Math.max(1, want.size);
      const extra = [...c.toks].filter((w) => !want.has(w)).length;
      // A candidate that satisfies the PO's own words is worth more than one that merely
      // matches the exercise name — the note is why the first pick was rejected.
      const noteHit = wanted.filter((w) => c.toks.has(w)).length;
      return { ...c, score: overlap + noteHit * 0.5 - extra * 0.02, overlap, noteHit };
    })
    .filter((c) => c.overlap >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  out.push({
    key, id: r.id, name: r.name, variant: r.variant, note: r.note || '',
    current,
    wanted_from_note: wanted,
    candidates: scored.map((c) => ({ file: c.file, rel: c.rel, overlap: +c.overlap.toFixed(2), noteHit: c.noteHit })),
  });
}

const none = out.filter((o) => !o.candidates.length);
const outPath = arg('--json', path.join(HERE, 'alternates.json'));
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(`\nrejected clips: ${out.length}`);
console.log(`  with candidates: ${out.length - none.length}`);
console.log(`  NO alternate in the library: ${none.length}`);
for (const n of none) console.log(`     ${n.key} — ${n.name}${n.note ? `  (${n.note})` : ''}`);
console.log(`\n-> ${path.relative(ROOT, outPath)}`);
