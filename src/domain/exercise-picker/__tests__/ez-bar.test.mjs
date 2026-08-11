import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildPickerDb } from '../catalog-core.ts';
import { matchesSearch, rankFor } from '../search-core.ts';
import { canDoExercise, EQUIP_UNLOCK, NEEDS_BENCH, requirementFor } from '../../home-gym/equipment.ts';

/**
 * The EZ-bar family, and the lie it was added to stop telling.
 *
 * ══ WHAT WAS WRONG ══
 *
 * PO review: *"There are no easy bar workouts in the exercise list. Why?"*
 *
 * There were none — not one of the 797 records named an EZ bar, and no alias mentioned one, so typing
 * "ez bar curl" into the picker returned nothing. Every specialty bar had been folded into `barbell`.
 *
 * The half that made it a BUG rather than a gap: the Home Gym editor has always offered "EZ-curl bar"
 * as a thing you own, and `EQUIP_UNLOCK.barbell` listed `ezbar` — so ticking it told the app you could
 * Back Squat and Deadlift. The checkbox either had to unlock something real or stop claiming.
 *
 * These guard the shape of the fix, not the exact roster: a thirteenth EZ movement is welcome and none
 * of this should fail because of it.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'exercise-relationships', 'source');
const load = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));

const exercises = load('exercises.json');
const equipment = load('equipment.json');
const DB = buildPickerDb({
  exercises,
  exerciseMuscles: load('exercise_muscles.json'),
  muscles: load('muscles.json'),
  equipment,
});

const ez = DB.filter((x) => x.equipId === 'ez_bar');

test('the EZ bar is its own implement, not a kind of barbell', () => {
  const item = equipment.find((e) => e.id === 'ez_bar');
  assert.ok(item, 'equipment.json must carry an ez_bar record or the rows have no equipment name');
  assert.equal(item.category, 'Free Weight', 'it groups with the free weights in the filter');
  // A curl bar is a home-gym staple and a commercial-gym fixture; it is not outdoor or hotel gear.
  assert.deepEqual(item.environments, ['Commercial Gym', 'Home Gym']);
});

test('every EZ movement is REACHABLE — in the visible catalogue, not merely in the file', () => {
  // The distinction this repo keeps relearning: `exercises.json` holds more than the app shows
  // (`HIDDEN_EXERCISE_IDS`), so counting the file would pass rows nobody can open.
  assert.ok(ez.length >= 12, `only ${ez.length} EZ movements are visible`);
  for (const x of ez) {
    assert.ok(x.muscleIds.length > 0, `${x.name} has no muscles — it would vanish from every muscle filter`);
    assert.ok(x.equip === 'EZ-Curl Bar', `${x.name} shows "${x.equip}" as its equipment`);
    assert.ok(['PUSH', 'PULL'].includes(x.cat), `${x.name} landed in ${x.cat}, which is not an arm category`);
  }
});

test('typing "ez" finds the EZ bar first, and nothing else outranks it', () => {
  // "ez" is a substring of "Trapezius", so ~65 trap movements are eligible. Eligibility is not the
  // ranking, and the athlete sees the ranking.
  for (const q of ['ez', 'ez curl', 'ez bar curl']) {
    const top = DB.filter((x) => matchesSearch(x, q))
      .map((x) => ({ x, r: rankFor(x.name, q) }))
      .sort((a, b) => a.r - b.r || a.x.name.localeCompare(b.x.name))[0];
    assert.ok(top, `"${q}" found nothing at all`);
    assert.equal(top.x.equipId, 'ez_bar', `"${q}" put ${top.x.name} above every EZ movement`);
  }
});

test('the wrist curl exists at all now — the catalogue had none, on any implement', () => {
  const wrist = DB.filter((x) => /wrist curl/i.test(x.name));
  assert.ok(wrist.length >= 2, 'both the wrist curl and its reverse should be reachable');
  for (const w of wrist) assert.ok(w.muscleIds.includes('forearms'), `${w.name} must train the forearms`);
});

// ── the checkbox stops lying ─────────────────────────────────────────────────

test('owning ONLY a curl bar does not unlock the squat rack', () => {
  const owned = ['ezbar'];
  const squat = { key: 'barbell-back-squat', equipId: 'barbell' };
  const dead = { key: 'barbell-deadlift', equipId: 'barbell' };
  assert.equal(canDoExercise(squat, owned), false, 'you cannot back squat with an EZ bar');
  assert.equal(canDoExercise(dead, owned), false, 'nor deadlift with one');
  assert.ok(!EQUIP_UNLOCK.barbell.includes('ezbar'), 'ezbar must not unlock the barbell catalogue');
});

test('owning a curl bar unlocks the curl bar', () => {
  const owned = ['ezbar'];
  const standing = ez.filter((x) => !NEEDS_BENCH.has(x.key));
  assert.ok(standing.length >= 9, 'most EZ work is standing and needs no furniture');
  for (const x of standing) {
    assert.equal(canDoExercise({ key: x.key, equipId: x.equipId }, owned), true, `${x.name} should be trainable`);
  }
});

test('the three EZ movements done over a pad need the pad', () => {
  // Same rule the dumbbell preacher and skull crusher already follow: a bench is an AND, not an OR.
  for (const key of ['ez-bar-preacher-curl', 'ez-bar-spider-curl', 'ez-bar-skull-crusher']) {
    assert.ok(NEEDS_BENCH.has(key), `${key} is performed over a bench`);
    assert.equal(canDoExercise({ key, equipId: 'ez_bar' }, ['ezbar']), false, 'a bar alone is not enough');
    assert.equal(canDoExercise({ key, equipId: 'ez_bar' }, ['ezbar', 'bench']), true, 'a bar and a bench is');
    const req = requirementFor({ key, equipId: 'ez_bar' });
    assert.ok(!Array.isArray(req), 'it must be an AND-of-ORs, which a bare list cannot express');
  }
});

test('a barbell owner is unaffected — this took nothing away', () => {
  const owned = ['barbell', 'plates', 'rack', 'bench'];
  assert.equal(canDoExercise({ key: 'barbell-back-squat', equipId: 'barbell' }, owned), true);
  assert.equal(canDoExercise({ key: 'barbell-bench-press', equipId: 'barbell' }, owned), true);
  // ...and they are correctly NOT handed EZ work they have no bar for.
  assert.equal(canDoExercise({ key: 'ez-bar-biceps-curl', equipId: 'ez_bar' }, owned), false);
});

// ── the append did not disturb the file it appended to ───────────────────────

test('every EZ row joins an existing family where one exists', () => {
  // Family membership is what the relationship generator reads. Joining "Biceps Curl" rather than
  // inventing "EZ-Bar Biceps Curl" is what gives these rows alternatives and substitutions for free.
  const families = new Map();
  for (const e of exercises) {
    const list = families.get(e.family) ?? [];
    list.push(e.id);
    families.set(e.family, list);
  }
  const rows = exercises.filter((e) => e.equipmentId === 'ez_bar');
  const lonely = rows.filter((e) => families.get(e.family).length === 1).map((e) => e.id);
  // The two wrist curls are alone because the movement did not exist before them. Nothing else may be.
  assert.deepEqual(lonely.sort(), ['ez-bar-reverse-wrist-curl', 'ez-bar-wrist-curl']);
});

test('the EZ rows carry the same field set as every other record', () => {
  const shape = Object.keys(exercises[0]).sort();
  for (const e of exercises.filter((x) => x.equipmentId === 'ez_bar')) {
    assert.deepEqual(Object.keys(e).sort(), shape, `${e.id} has a different field set from the catalogue`);
    assert.equal(e.modality, 'Strength');
    assert.ok(['Beginner', 'Intermediate', 'Advanced'].includes(e.difficulty));
  }
});
