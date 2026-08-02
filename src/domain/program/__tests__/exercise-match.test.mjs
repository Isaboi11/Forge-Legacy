import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { matchExercise, tokenize } from '../exercise-match.ts';

/** The real catalogue, read as data — the picker's module pulls in JSON that `node --test` can't load. */
const raw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/domain/exercise-relationships/source/exercises.json'), 'utf8'),
);
const CATALOG = (Array.isArray(raw) ? raw : (raw.exercises ?? [])).map((r) => ({
  key: r.id,
  name: r.name,
  aliases: r.aliases ?? [],
}));
const m = (s) => matchExercise(s, CATALOG);

test('the catalogue is the real one', () => {
  assert.ok(CATALOG.length > 700, `expected the full catalogue, got ${CATALOG.length}`);
});

/*
 * ══ THE SAFETY PROPERTY ══
 *
 * A wrong match is worse than no match, and by a long way. An unmatched name keeps what the athlete
 * wrote and works fine as a plain exercise; a WRONG key silently gives them the wrong detail page, the
 * wrong equipment, and files their personal records against a lift they never performed. Everything
 * below is about refusing rather than guessing.
 */

test('a word the athlete wrote is never ignored — Front Squat is not Back Squat', () => {
  // The single most dangerous shape for a fuzzy matcher: one word apart, completely different lifts.
  for (const [written, forbidden] of [
    ['Front Squat', 'back squat'],
    ['Back Squat', 'front squat'],
    ['Incline Bench Press', 'decline'],
    ['Close-Grip Bench Press', 'wide'],
    ['Romanian Deadlift', 'sumo'],
  ]) {
    const r = m(written);
    if (r) assert.ok(!r.name.toLowerCase().includes(forbidden), `"${written}" resolved to "${r.name}"`);
  }
});

test('naming the equipment is respected, never overridden by the preference', () => {
  const db = m('Dumbbell Bench Press');
  assert.ok(db?.name.toLowerCase().includes('dumbbell'), `got ${db?.name}`);
  assert.equal(db?.byPreference, false, 'the athlete said dumbbell — nothing was preferred on their behalf');
});

test('ONE generic word will not accept a qualifier nobody wrote', () => {
  // "Dips" matched "Bench Dip" — a unique nearest candidate and the wrong exercise. A single word may
  // resolve to an exact name or to an equipment variant of itself, and to nothing else.
  const dips = m('Dips');
  if (dips) assert.ok(!/bench|assisted|band/i.test(dips.name), `"Dips" resolved to "${dips.name}"`);
});

test('nonsense matches nothing', () => {
  for (const junk of ['Zercher Wall Ball Complex', 'asdfgh', 'Coach Special', '???']) {
    assert.equal(m(junk), null, `"${junk}" should not have matched`);
  }
});

test('a real ambiguity abstains rather than picking', () => {
  // "Lunges" is a dozen different lifts and none of them is the obvious default.
  const r = m('Lunges');
  assert.equal(r, null, `"Lunges" resolved to ${r?.name} — it should have kept what the athlete wrote`);
});

/*
 * ══ WHAT IT SHOULD ACTUALLY GET ══
 *
 * Verbatim from a real six-day split that imported with 0 of 18 names matched.
 */

test('the names people actually write resolve to the right lift', () => {
  const expected = [
    ['Bench press', 'Barbell Bench Press'],
    ['Incline Dumbbell press', 'Dumbbell Incline Bench Press'],
    ['Deadlifts', 'Barbell Deadlift'],
    ['Front Squat', 'Barbell Front Squat'],
    ['Overhead Press', 'Barbell Overhead Press'],
    ['Lat Pulldowns', 'Cable Lat Pulldown'],
    ['Face Pulls', 'Cable Face Pull'],
    ['Hammer Curls', 'Dumbbell Hammer Curl'],
    ['Lateral Raises', 'Dumbbell Lateral Raise'],
    ['Tricep Pushdowns', 'Cable Triceps Pushdown'],
  ];
  for (const [written, want] of expected) {
    assert.equal(m(written)?.name, want, `"${written}"`);
  }
});

test('LATERAL RAISES is a dumbbell lift — the preference order was wrong and this catches it', () => {
  // Cable outranked dumbbell in the first version. Nobody means a cable lateral raise by those words.
  assert.equal(m('Lateral Raises')?.name, 'Dumbbell Lateral Raise');
});

test('plurals, casing and abbreviations do not change the answer', () => {
  const canonical = m('Barbell Bench Press')?.key;
  assert.ok(canonical);
  for (const variant of ['barbell bench presses', 'BARBELL BENCH PRESS', 'BB Bench Press', 'bb  bench   press']) {
    assert.equal(m(variant)?.key, canonical, `"${variant}"`);
  }
});

test('word order does not matter', () => {
  assert.equal(m('Incline Dumbbell Bench Press')?.key, m('Dumbbell Incline Bench Press')?.key);
});

test('a match reports whether the words settled it or a convention did', () => {
  // The distinction is shown to the athlete, so a convention is never mistaken for a fact.
  assert.equal(m('Bench press')?.byPreference, true, 'no equipment was named — a convention chose one');
  assert.equal(m('Barbell Bench Press')?.byPreference, false, 'the name was exact');
});

test('tokenize drops noise but never a defining word', () => {
  assert.deepEqual([...tokenize('Seated Cable Row')].sort(), ['cable', 'row', 'seated']);
  assert.deepEqual([...tokenize('DB Incline Press')].sort(), ['dumbbell', 'incline', 'press']);
  assert.ok(tokenize('Front Squat').has('front'), 'the word that distinguishes it must survive');
});

test('matching the whole split — most resolve, and every miss keeps what was written', () => {
  const split = [
    'Bench press', 'Incline Dumbbell press', 'Chest Flys', 'Dips', 'Overhead Tricep Extension',
    'Tricep Pushdowns', 'Deadlifts', 'Lat Pulldowns', 'Barbell Rows', 'Seated row', 'Hammer Curls',
    'Face Pulls', 'Front Squat', 'Lunges', 'Legs press', 'Calf Raises', 'Overhead Press', 'Lateral Raises',
  ];
  const hits = split.filter((n) => m(n));
  assert.ok(hits.length >= 13, `expected most of the split to resolve, got ${hits.length}/${split.length}`);
  // And nothing resolved to something absurd — every match must contain every word that was written.
  for (const n of hits) {
    const got = tokenize(m(n).name);
    for (const w of tokenize(n)) {
      assert.ok(got.has(w), `"${n}" → "${m(n).name}" dropped the word "${w}"`);
    }
  }
});

/*
 * ══ NEAREST IS NOT THE SAME AS RIGHT ══
 *
 * Three matches from a real import that were the closest candidate by word count and the wrong lift.
 * Each one now abstains — the athlete keeps what they wrote, which is always survivable.
 */

test('a bare word never resolves to an obscure implement', () => {
  // "Squats" → CABLE Squat and "Leg curls" → BAND Leg Curl. Both nearest by word count, both absurd:
  // the catalogue simply holds those variants under shorter names than the ones people mean.
  for (const [written, forbidden] of [['Squats', /cable/i], ['Leg curls', /band/i], ['Leg Curls', /band/i]]) {
    const r = m(written);
    if (r) assert.ok(!forbidden.test(r.name), `"${written}" resolved to "${r.name}"`);
  }
});

test('but a cable lift a bare word DOES mean still resolves', () => {
  // The rule must not become "abstain whenever it is a cable" — pulldowns and face pulls are cable lifts.
  assert.match(m('Lat Pulldowns')?.name ?? '', /Cable Lat Pulldown/);
  assert.match(m('Face Pulls')?.name ?? '', /Cable Face Pull/);
});

test('naming the obscure implement yourself is honoured', () => {
  // The restriction is on ASSUMING one, never on obeying one.
  const r = m('Band Leg Curl');
  assert.ok(r?.name.toLowerCase().includes('band'), `got ${r?.name}`);
});
