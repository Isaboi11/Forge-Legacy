/**
 * Audits every mapped clip: does the SOURCE filename actually describe the exercise it was uploaded
 * as? Reports mismatches, worst first.
 *
 * WHY THIS IS WORTH RUNNING AFTER A FULL HUMAN REVIEW: the review pass asks "is this animation
 * correct?" one clip at a time, and the eye is good at movement but forgiving about qualifiers. A
 * pause deadlift looks exactly like a deadlift for most of its frames, so `barbell-deadlift` sourced
 * from `Barbell-Pause-Deadlift_Hips.mp4` passed as `yes`. The filename carries the qualifier the
 * picture buries. Comparing the two catches a class of error the review structurally cannot.
 *
 * It reports; it never rewrites a mapping. A qualifier in a filename is sometimes just the vendor's
 * naming ("Alternative-Fly" IS the plain flat-bench fly), so every hit needs a human.
 *
 *   node scripts/animation-processing/audit_sources.mjs [--csv path]
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
                      'for', 'at', 'an', '', 'version', 'variation', 'gym', 'workout', 'home',
                      'library', 'database', 'mp4']);

/** The vendor appends the worked muscle group to every filename; it is not part of the movement. */
const MUSCLE = new Set(['chest', 'back', 'shoulder', 'shoulders', 'thigh', 'thighs', 'hip', 'hips',
                        'waist', 'upper', 'arm', 'arms', 'calf', 'calve', 'calves', 'neck', 'forearm',
                        'forearms', 'cardio', 'plyometric', 'stretching', 'weightlifting']);

const toks = (s) => new Set(
  s.toLowerCase().replace(/&/g, 'and').split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => w.replace(/(?<=.{3})s$/, ''))
);

/**
 * A word that CHANGES THE MOVEMENT if it appears on one side only. "pause", "smith", "kneeling"
 * make a different exercise; "grip" or "standard" do not. Only these drive the severity.
 */
const QUALIFIERS = new Set([
  'pause', 'paused', 'deficit', 'rack', 'pin', 'board', 'floor', 'seal', 'incline', 'decline',
  'seated', 'standing', 'lying', 'kneeling', 'bent', 'single', 'one', 'alternate', 'alternating',
  'assisted', 'band', 'cable', 'dumbbell', 'barbell', 'kettlebell', 'machine', 'lever', 'smith',
  'plate', 'loaded', 'bodyweight', 'jump', 'explosive', 'negative', 'wide', 'close', 'neutral',
  'reverse', 'sumo', 'front', 'hack', 'zercher', 'goblet', 'bulgarian', 'split', 'walking',
  'suitcase', 'overhead', 'hammer', 'preacher', 'spider', 'concentration', 'drag', 'zottman',
  'skull', 'crusher', 'pullover', 'thruster', 'clean', 'snatch', 'jerk', 'hang', 'power',
]);

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

const { map } = JSON.parse(fs.readFileSync(path.join(HERE, 'source-map.json'), 'utf8'));
const verdicts = new Map(
  parseCsv(fs.readFileSync(arg('--csv', path.join(HERE, 'animation-review.csv')), 'utf8'))
    .map((r) => [`${r.variant}/${r.id}`, r])
);

const findings = [];
for (const [key, m] of Object.entries(map)) {
  if (!m.source) continue;
  const row = verdicts.get(key);
  const name = row?.name || m.id;
  const want = toks(name);
  const got = new Set([...toks(path.basename(m.source, '.mp4'))].filter((w) => !MUSCLE.has(w)));

  const extra = [...got].filter((w) => !want.has(w) && QUALIFIERS.has(w));
  const missing = [...want].filter((w) => !got.has(w) && QUALIFIERS.has(w));
  if (!extra.length && !missing.length) continue;

  findings.push({
    key, name, verdict: row?.verdict || '?',
    source: path.basename(m.source),
    extra, missing,
    severity: extra.length + missing.length * 1.5,   // a MISSING qualifier is the worse signal
  });
}

findings.sort((a, b) => b.severity - a.severity || a.key.localeCompare(b.key));

const passed = findings.filter((f) => f.verdict === 'yes');
console.log(`mapped clips audited: ${Object.values(map).filter((m) => m.source).length}`);
console.log(`name/source mismatches: ${findings.length}   ·   of those, PASSED as "yes": ${passed.length}\n`);

console.log(`── passed the review but the source name disagrees (${passed.length}) ──`);
for (const f of passed.slice(0, 40)) {
  const bits = [];
  if (f.missing.length) bits.push(`missing "${f.missing.join(' ')}"`);
  if (f.extra.length) bits.push(`source adds "${f.extra.join(' ')}"`);
  console.log(`  ${f.key.padEnd(46)} ${bits.join(' · ')}`);
  console.log(`  ${''.padEnd(46)} ${f.source}`);
}
if (passed.length > 40) console.log(`  … and ${passed.length - 40} more`);

const out = path.join(HERE, 'source-audit.json');
fs.writeFileSync(out, JSON.stringify(findings, null, 2));
console.log(`\n-> ${path.relative(ROOT, out)}  (all ${findings.length}, worst first)`);
