import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hasMedal, medalSpec, medalSvg } from '../medal-art.ts';
import { MEDALS } from '../medal-data.ts';

/**
 * ══ WHY THIS FILE EXISTS ══
 *
 * The Honor Medals design (2026-09-25) sat in `design_reference/` for three days while the Honors screen
 * kept drawing one generic category glyph per honor — nobody had mapped the design's 179 honors onto the
 * app's `honor_type` slugs. These tests hold the two things that mapping and port can silently lose:
 *
 *   1. EVERY honor the database can grant has a medal. A new `honor_catalog` row without one would fall
 *      back to the old glyph without anyone noticing, so this reads the migrations themselves.
 *   2. The port draws what the design's engine draws. The full 177 × 2-face comparison against the engine
 *      was run when this was built (8,874 elements, 0 differences); the fixtures below pin the numbers it
 *      produced so a hand edit to the geometry fails here.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const migrations = path.resolve(here, '../../../../supabase/migrations');

function seededHonorSlugs() {
  const slugs = new Set();
  for (const f of fs.readdirSync(migrations).filter((n) => n.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(migrations, f), 'utf8');
    if (!sql.includes('honor_catalog')) continue;
    // ('slug', 'Display Name', 'Category', 'metric', …) — the catalog seed rows.
    for (const m of sql.matchAll(/\(\s*'([a-z0-9_]+)'\s*,\s*'(?:[^']|'')+'\s*,\s*'[A-Za-z ]+'\s*,\s*'[a-z_]+'/g)) {
      slugs.add(m[1]);
    }
  }
  return slugs;
}

test('every honor the database seeds has a medal', () => {
  const seeded = seededHonorSlugs();
  assert.ok(seeded.size >= 170, `expected the full catalog, read only ${seeded.size} slugs`);
  const missing = [...seeded].filter((s) => !hasMedal(s));
  assert.deepEqual(missing, [], `honors with no medal (add them to medal-data.ts): ${missing.join(', ')}`);
});

test('initiative — granted outside the catalog — has its medal too', () => {
  assert.ok(hasMedal('initiative'));
});

test('the hand-matched honors point at the right design medals', () => {
  assert.equal(MEDALS.origin_not_alone[0], 'org-first-connection');
  assert.equal(MEDALS.bw_bench_125[0], 'rel-bench-125');
  assert.equal(MEDALS.bw_press_075[0], 'rel-ohp-075');
});

test('relative-strength exergues carry a real multiplication sign', () => {
  // The first generation of medal-data.ts decoded the engine's output as cp1252 and struck "1.25Ã—".
  assert.equal(MEDALS.bw_bench_125[3], '1.25×');
  assert.equal(MEDALS.bw_press_075[3], '0.75×');
  for (const [slug, r] of Object.entries(MEDALS)) assert.ok(!/Ã/.test(r[3]), `${slug}: mojibake in "${r[3]}"`);
});

test('an unknown honor has no medal, so the caller keeps its glyph', () => {
  assert.equal(medalSvg('not_a_real_honor'), null);
  assert.equal(hasMedal(undefined), false);
});

test('clean face is the mark alone: no frame, no number, no corona', () => {
  const xml = medalSvg('workouts_logged_25', { face: 'clean' });
  assert.ok(xml);
  assert.ok(!xml.includes('<text'), 'the clean face carries no exergue');
  assert.equal(medalSpec('workouts_logged_25', 'clean')?.face, 'clean');
});

test('struck face carries the threshold in the exergue', () => {
  const xml = medalSvg('workouts_logged_25', { face: 'struck', fontFamily: 'PlayfairDisplay_600SemiBold' });
  assert.ok(xml);
  assert.match(xml, />25<\/text>/);
  assert.match(xml, /font-family="PlayfairDisplay_600SemiBold"/);
});

test('no pass relies on currentColor — react-native-svg does not inherit it reliably', () => {
  for (const slug of Object.keys(MEDALS)) {
    for (const face of ['clean', 'struck']) {
      const xml = medalSvg(slug, { face });
      assert.ok(!xml.includes('currentColor'), `${slug} ${face}`);
      assert.ok(!xml.includes('__FILL__'), `${slug} ${face}: an unresolved fill token`);
    }
  }
});

test('each instance gets its own gradient id (web: a shared DOM id can paint nothing)', () => {
  const a = medalSvg('first_workout_logged', { instance: ':r1:' });
  const b = medalSvg('first_workout_logged', { instance: ':r2:' });
  const idA = a.match(/id="([^"]+)"/)[1];
  const idB = b.match(/id="([^"]+)"/)[1];
  assert.notEqual(idA, idB);
  assert.ok(a.includes(`url(#${idA})`));
  assert.match(idA, /^[a-zA-Z0-9_-]+$/, 'the instance is sanitised to a valid id');
});

test('geometry matches the design engine (fixtures from forge-honor-art.js)', () => {
  // First Workout Logged, clean face: the engine fits the count mark at translate(6.5,6.5) scale(2.13), stroke 1.46.
  const clean = medalSvg('first_workout_logged', { face: 'clean' });
  assert.ok(clean.includes('<g transform="translate(6.5,6.5) scale(2.13)" stroke-width="1.46">'));
  // Engraving passes: shadow nudged up 0.58, warm catch down 0.58.
  assert.ok(clean.includes('<g transform="translate(0,-0.58)" stroke="rgba(0,0,0,0.66)" opacity="0.85">'));
  assert.ok(clean.includes('<g transform="translate(0,0.58)" stroke="rgb(214,176,124)" opacity="0.62">'));
});

test('the apex tier strikes the metallic sweep and the corona', () => {
  const apex = Object.entries(MEDALS).find(([, r]) => r[4] === 4);
  assert.ok(apex, 'the catalog has apex medals');
  const xml = medalSvg(apex[0], { face: 'struck' });
  assert.ok(xml.includes('fl-medal-apex'));
  assert.ok(xml.includes('opacity="0.42"'), 'corona rays');
});
