import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { STARTER_TEMPLATES, getStarterTemplate, starterSummary } from '../index.ts';
import { HIDDEN_EXERCISE_IDS } from '../../../exercise-picker/catalog-core.ts';

/**
 * THE GUARD THAT STOPS A TYPO REACHING AN ATHLETE AS A LIFT WITH NO DETAIL PAGE.
 *
 * Starter templates are the only content in the app that names catalogue exercises by hand. Everything
 * else picks them — the Exercise Picker, the builders, the program importer all hand back an id that
 * came out of the catalogue in the first place, so they cannot name one that does not exist. These six
 * definitions can, and a bad key survives tsc, lint and every other test in the repo: it is a string,
 * and it is a perfectly good string.
 *
 * It fails at exactly one moment — a brand-new athlete taps the first thing Forge ever offered them.
 */

const CATALOG = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/domain/exercise-relationships/source/exercises.json'), 'utf8'),
);
const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

test('every catalogKey resolves in the real exercise catalogue', () => {
  const missing = [];
  for (const t of STARTER_TEMPLATES) {
    for (const e of t.exercises) {
      if (!BY_ID.has(e.catalogKey)) missing.push(`${t.id} → ${e.catalogKey}`);
    }
  }
  assert.deepEqual(missing, [], `these keys are not in exercises.json: ${missing.join(', ')}`);
});

test('no starter names an exercise the picker hides', () => {
  // Offering a lift the athlete then cannot find, substitute or favourite would be a dead end the
  // moment they tried to change it.
  const hidden = [];
  for (const t of STARTER_TEMPLATES) {
    for (const e of t.exercises) {
      if (HIDDEN_EXERCISE_IDS.has(e.catalogKey)) hidden.push(`${t.id} → ${e.catalogKey}`);
    }
  }
  assert.deepEqual(hidden, [], `hidden exercises cannot be prescribed: ${hidden.join(', ')}`);
});

test('the displayed name matches the catalogue name', () => {
  // The name is snapshotted into the athlete's row on adopt, so a drifted label becomes permanent on
  // their template rather than being corrected by the next read.
  const wrong = [];
  for (const t of STARTER_TEMPLATES) {
    for (const e of t.exercises) {
      const real = BY_ID.get(e.catalogKey);
      if (real && real.name !== e.name) wrong.push(`${e.catalogKey}: "${e.name}" vs "${real.name}"`);
    }
  }
  assert.deepEqual(wrong, [], `names have drifted from the catalogue: ${wrong.join(', ')}`);
});

test('sets and reps are positive whole numbers', () => {
  for (const t of STARTER_TEMPLATES) {
    for (const e of t.exercises) {
      assert.ok(Number.isInteger(e.sets) && e.sets > 0, `${t.id} → ${e.catalogKey} has sets=${e.sets}`);
      assert.ok(Number.isInteger(e.targetReps) && e.targetReps > 0, `${t.id} → ${e.catalogKey} has reps=${e.targetReps}`);
    }
  }
});

test('every row carries a real section, and none is a cardio block', () => {
  for (const t of STARTER_TEMPLATES) {
    for (const e of t.exercises) {
      assert.ok(['warmup', 'main', 'cooldown'].includes(e.section), `${t.id} → ${e.catalogKey} section=${e.section}`);
      // A cardio row needs targetMi/targetDurationSec, which none of these set. If a starter ever
      // wants a conditioning finisher it has to carry those, and this is where that gets caught.
      assert.equal(e.kind, 'strength', `${t.id} → ${e.catalogKey} is 'cardio' without cardio targets`);
    }
  }
});

test('every template has a main block — a warm-up on its own is not a session', () => {
  for (const t of STARTER_TEMPLATES) {
    assert.ok(t.exercises.some((e) => e.section === 'main'), `${t.id} has no main work`);
  }
});

test('ids are unique and stable-looking', () => {
  const ids = STARTER_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'two starters share an id — they would collide on adopt');
  for (const id of ids) {
    // The id becomes `source_definition_id`, is written into athlete rows, and is what the partial
    // unique index dedupes on. It must never be prettified after the fact.
    assert.match(id, /^[a-z0-9-]+$/, `${id} is not a stable slug`);
  }
});

test('every template has a name and a blurb', () => {
  for (const t of STARTER_TEMPLATES) {
    assert.ok(t.name.trim().length > 0 && t.name.length <= 60, `${t.id} name is unusable`);
    assert.ok(t.blurb.trim().length > 0, `${t.id} has no blurb — the shelf card would be blank`);
  }
});

test('getStarterTemplate finds by id and returns null otherwise', () => {
  assert.equal(getStarterTemplate('push-day')?.name, 'Push Day');
  assert.equal(getStarterTemplate('no-such-thing'), null);
});

test('starterSummary reads like templateSummary', () => {
  assert.equal(starterSummary(getStarterTemplate('push-day')), '6 lifts · 18 sets');
  assert.equal(starterSummary({ exercises: [{ sets: 1 }] }), '1 lift · 1 set');
});
