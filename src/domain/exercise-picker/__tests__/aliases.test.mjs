import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ALIAS_INDEX,
  EXERCISE_CONVENTIONS,
  EXERCISE_SYNONYMS,
  aliasKey,
  resolveAgainstCatalog,
} from '../aliases.ts';
import { HIDDEN_EXERCISE_IDS } from '../catalog-core.ts';
import { matchExercise } from '../../program/exercise-match.ts';

/** The real catalogue, read as data — `data.ts` imports JSON in a way `node --test` cannot load. */
const raw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/domain/exercise-relationships/source/exercises.json'), 'utf8'),
);
const ROWS = Array.isArray(raw) ? raw : (raw.exercises ?? []);

/**
 * ⚠ THE VISIBLE CATALOGUE, NOT THE FILE.
 *
 * `resolveExerciseName` matches against `catalogForMatching()`, which is derived from `PICKER_DB` —
 * and `PICKER_DB` has `HIDDEN_EXERCISE_IDS` filtered out. A hidden row is not an answer this app is
 * allowed to give, anywhere: not in browse, not in search, and not in a program import either.
 *
 * This test used to build its catalogue straight from `exercises.json` and so modelled 797 rows the
 * matcher never sees. That made the safety property below assert something stricter than production
 * enforces, and it would have rejected a legitimate alias for a name whose row had been RETIRED —
 * which is precisely how a duplicate is supposed to be resolved here.
 */
const CATALOG = ROWS.filter((r) => !HIDDEN_EXERCISE_IDS.has(r.id)).map((r) => ({
  key: r.id,
  name: r.name,
  aliases: r.aliases ?? [],
}));
const r = (s) => resolveAgainstCatalog(s, CATALOG);
const ALL = { ...EXERCISE_SYNONYMS, ...EXERCISE_CONVENTIONS };

test('the catalogue is the real one', () => {
  assert.ok(CATALOG.length > 700, `expected the full catalogue, got ${CATALOG.length}`);
  assert.ok(ROWS.length > CATALOG.length, 'nothing is hidden — this test is no longer proving anything');
});

test('every alias points at a VISIBLE exercise', () => {
  // Pointing at a hidden row would resolve a name to something the athlete can never reach again.
  const visible = new Set(CATALOG.map((e) => e.key));
  for (const [alias, id] of Object.entries({ ...EXERCISE_SYNONYMS, ...EXERCISE_CONVENTIONS })) {
    assert.ok(visible.has(id), `"${alias}" → "${id}", which is hidden from the app`);
  }
});

/*
 * ══ THE SAFETY PROPERTY ══
 *
 * An alias may only ever rescue a name the matcher could not reach. The moment one can override a real
 * catalogue name, a typo in this file silently redirects a lift — which is exactly what a first draft
 * did, mapping "calf raise" to the Standing Calf Raise Machine while an entry named "Calf Raise" exists.
 */

test('no alias can override an answer the matcher already gives', () => {
  const hijacks = Object.keys(ALL)
    .map((alias) => ({ alias, got: matchExercise(alias, CATALOG) }))
    .filter((x) => x.got);
  assert.deepEqual(
    hijacks.map((h) => `${h.alias} → ${h.got.name}`),
    [],
    'these aliases are redundant at best and a silent redirect at worst — the matcher already answers them',
  );
});

test('no alias shadows a real catalogue name', () => {
  const names = new Set(CATALOG.map((e) => aliasKey(e.name)));
  for (const alias of Object.keys(ALL)) {
    assert.ok(!names.has(aliasKey(alias)), `"${alias}" is already the name of a real exercise`);
  }
});

test('every alias points at an exercise that exists', () => {
  const ids = new Set(CATALOG.map((e) => e.key));
  for (const [alias, id] of Object.entries(ALL)) {
    assert.ok(ids.has(id), `"${alias}" → "${id}", which is not in the catalogue`);
  }
});

test('no alias is defined twice, and the two maps never disagree', () => {
  const seen = new Map();
  for (const alias of Object.keys(ALL)) {
    const key = aliasKey(alias);
    assert.ok(!seen.has(key), `"${alias}" collides with "${seen.get(key)}" once normalised`);
    seen.set(key, alias);
  }
  assert.equal(seen.size, ALIAS_INDEX.size, 'the built index lost or merged an entry');
  for (const k of Object.keys(EXERCISE_SYNONYMS)) {
    assert.ok(!(k in EXERCISE_CONVENTIONS), `"${k}" is in both maps`);
  }
});

/*
 * ══ THE THIRTEEN ══
 *
 * Verbatim from the six-day split that imported with thirteen names unresolved. Every one of these was
 * already in the catalogue under a formal name; none of them needed a new entry.
 */

test('the names that failed the real import now resolve to the right lift', () => {
  const expected = [
    ['Dips', 'Parallel Bar Dip'],
    ['Peckdek fly', 'Pec Deck Fly'],
    ['Flat Dumbbell Fly', 'Dumbbell Chest Fly'],
    ['Seated Leg Extension', 'Leg Extension Machine'],
    ['Leg curls', 'Seated Leg Curl Machine'],
    ['Legs press', 'Machine Leg Press'],
    ['Squats', 'Barbell Back Squat'],
    ['Barbell Rows', 'Barbell Bent-Over Row'],
    ['Military press', 'Barbell Overhead Press'],
    ['Side Lateral Raises', 'Dumbbell Lateral Raise'],
    ['Cable Row', 'Cable Seated Row'],
  ];
  for (const [written, want] of expected) {
    assert.equal(r(written)?.name, want, `"${written}"`);
  }
});

/*
 * ══ THE TWO THE PO HIT IN A REAL SESSION (2026-08-05) ══
 */

test('a barbell shoulder press is findable by that name', () => {
  /*
   * It was not. The lift is filed as "Barbell Overhead Press", search is token-AND, and the token
   * "shoulder" appears in none of that row's fields — not the name, not its aliases (military ·
   * strict · standing), not its equipment, and not its muscles, because the muscle is called "Front
   * Deltoids" and nothing in the vocabulary is named "Shoulders". So the single most common barbell
   * press in the world returned zero results out of 723.
   */
  assert.equal(r('Barbell Shoulder Press')?.key, 'barbell-overhead-press');
  assert.equal(r('barbell shoulder press')?.key, 'barbell-overhead-press');
  assert.equal(r('Seated Barbell Shoulder Press')?.key, 'barbell-seated-overhead-press');
  assert.equal(r('Band Shoulder Press')?.key, 'band-overhead-press');
});

test('the machine and dumbbell shoulder presses still win their own names', () => {
  // The half of the vocabulary split that always worked must keep working — an alias for the other
  // half must not reach across and claim these.
  assert.equal(r('Machine Shoulder Press')?.key, 'machine-shoulder-press');
  assert.equal(r('Seated Dumbbell Shoulder Press')?.key, 'seated-dumbbell-shoulder-press');
  assert.equal(r('Smith Machine Shoulder Press')?.key, 'smith-machine-shoulder-press');
});

test('the retired half of a duplicate pair still lands on the lift that survived', () => {
  /*
   * `cable-reverse-fly` and `cable-rear-delt-fly` were one exercise filed twice — same equipment,
   * pattern, difficulty and primary muscle, differing in one authored `family` string. The duplicate
   * is hidden rather than deleted, so anyone who logged it keeps a real exercise to open.
   */
  assert.equal(r('Cable Reverse Fly')?.key, 'cable-rear-delt-fly');
  assert.equal(r('cable reverse flys')?.key, 'cable-rear-delt-fly', 'plurals fold through the tokenizer');
  assert.ok(HIDDEN_EXERCISE_IDS.has('cable-reverse-fly'), 'the duplicate must stay hidden');
  assert.ok(!HIDDEN_EXERCISE_IDS.has('cable-rear-delt-fly'), 'the kept row must stay visible');
});

test('casing, plurals and punctuation do not change the answer', () => {
  for (const variant of ['Pec Deck', 'pec-deck', 'PEC DECK', 'peckdek', 'Pec Dec']) {
    assert.equal(r(variant)?.key, 'pec-deck-fly', `"${variant}"`);
  }
});

/*
 * ══ A FACT IS NOT A CONVENTION ══
 */

test('a synonym is reported as exact; a convention admits a choice was made', () => {
  assert.equal(r('Military press')?.byPreference, false, 'military press IS the overhead press');
  assert.equal(r('Squats')?.byPreference, true, 'nobody wrote "back" — the app picked it');
  assert.equal(r('Leg curls')?.byPreference, true, 'lying vs seated was chosen on their behalf');
});

test('the athlete is shown the catalogue name, never the alias they typed', () => {
  assert.equal(r('peckdek')?.name, 'Pec Deck Fly');
  assert.equal(r('deads')?.name, 'Barbell Deadlift');
});

/*
 * ══ WHAT STILL ABSTAINS ══
 *
 * Adding aliases must not quietly turn the matcher into a guesser. Genuine ambiguity still keeps what
 * the athlete wrote, which always works.
 */

test('a real ambiguity still resolves to nothing', () => {
  // "Lunges" spans walking, reverse, lateral and curtsy — four movements and no default.
  for (const ambiguous of ['Lunges', 'Lunge', 'Press', 'Rows', 'Curls', 'Flys']) {
    assert.equal(r(ambiguous), null, `"${ambiguous}" should have kept what the athlete wrote`);
  }
});

test('nonsense still matches nothing', () => {
  for (const junk of ['Zercher Wall Ball Complex', 'asdfgh', 'Coach Special', '???', '']) {
    assert.equal(r(junk), null, `"${junk}" should not have matched`);
  }
});

test('an exact catalogue name always beats the alias file', () => {
  // The ordering guarantee, stated as behaviour: "Calf Raise" is a real entry and must win outright.
  assert.equal(r('Calf Raise')?.key, 'calf-raise');
  assert.equal(r('Barbell Bench Press')?.key, 'barbell-bench-press');
  assert.equal(r('Front Squat')?.name, 'Barbell Front Squat', 'a squat variant is never the back squat');
});

test('naming equipment yourself is still honoured over any convention', () => {
  assert.match(r('Dumbbell Shrug')?.name ?? '', /Dumbbell Shrug/);
  assert.match(r('Front Squat')?.name ?? '', /Front Squat/);
});
