/**
 * thin-day.test.mjs — ⚠ **"I tried having him build a home body weight workout and it came up with one
 * thing."** (PO, 2026-08-14)
 *
 * ══ WHAT WAS ACTUALLY WRONG ══
 *
 * Not the engine's choice of movements. **There is not a single vertical or horizontal pull in the
 * 733-exercise catalogue that needs no equipment at all** — 0 of 31 and 0 of 57 — so a bodyweight pull
 * day genuinely cannot be built. What was wrong is that the day builder handed back the remainder and
 * the sheet rendered it as a workout: a *pull* day came back as one Plank, and a beginner with a bad
 * lower back got "Walking Lunge, Dead Bug".
 *
 * The old guard was `main.length === 0`. Zero was handled; one and two were shipped.
 *
 * ══ WHY THE THRESHOLD IS THREE, MEASURED RATHER THAN CHOSEN ══
 *
 * A guard that refuses is only safe if it separates the broken cases from the good ones with room to
 * spare. Swept over 11 focuses × 5 goals × 4 session lengths × 3 levels × 4 limitation sets:
 *
 *   full gym          20 / 2,640 fall under three — and ALL 20 are the same case, a shoulders focus
 *                     from someone who said their shoulders are what to work around.
 *   bodyweight     1,220 / 2,640.
 *
 * So at a full gym it fires only where Holt should be refusing anyway, and it never fires on a session
 * anyone would call complete. Those two facts are asserted below, not left in a commit message.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/thin-day.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { buildDayWorkout, whyThin, MIN_DAY_MOVEMENTS } from '../day.ts';
import { thinDayFor } from '../chat-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

const req = (over = {}) => ({
  focus: { kind: 'split', split: 'full_body' },
  goal: 'muscle',
  sessionMinutes: 45,
  experience: 'intermediate',
  environment: 'full_gym',
  ownedEquipment: [],
  limitations: [],
  ...over,
});

const build = (over) => buildDayWorkout(req(over), POOL, canDoExercise).day.main.length;
const diagnose = (over) => whyThin(req(over), build(over), POOL, canDoExercise);

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ THE REPORT
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a bodyweight pull day is refused, not shipped as one Plank', () => {
  const over = { focus: { kind: 'split', split: 'pull' }, environment: 'bodyweight' };
  assert.ok(build(over) < MIN_DAY_MOVEMENTS, 'precondition: this is the session the PO was handed');
  assert.equal(diagnose(over), 'gear', 'and the honest reason is that there is nothing to pull on');
});

test('⚠ back and biceps, bodyweight, comes back with nothing at all', () => {
  const over = { focus: { kind: 'body_parts', parts: ['back', 'biceps'] }, environment: 'bodyweight' };
  assert.equal(build(over), 0);
  assert.equal(diagnose(over), 'gear');
});

test('the catalogue really has no equipment-free pull — this is the engine being right', () => {
  // If this ever stops being true the refusal above becomes wrong, and it should fail loudly here
  // rather than start refusing a session it could now build.
  const free = POOL.filter((e) => canDoExercise(e, []));
  const pulls = free.filter((e) => e.pattern === 'Vertical Pull' || e.pattern === 'Horizontal Pull');
  assert.equal(pulls.length, 0, `the catalogue now has ${pulls.length} equipment-free pulls — revisit the refusal`);
  assert.ok(free.length > 100, 'and there is still plenty that needs nothing at all');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE GUARD SEPARATES — it must not refuse a session anyone would call complete
// ─────────────────────────────────────────────────────────────────────────────

const FOCI = [
  ['full_body', { kind: 'split', split: 'full_body' }],
  ['push', { kind: 'split', split: 'push' }],
  ['pull', { kind: 'split', split: 'pull' }],
  ['legs', { kind: 'split', split: 'legs' }],
  ['upper', { kind: 'split', split: 'upper' }],
  ['lower', { kind: 'split', split: 'lower' }],
  ['chest+tri', { kind: 'body_parts', parts: ['chest', 'triceps'] }],
  ['back+bi', { kind: 'body_parts', parts: ['back', 'biceps'] }],
  ['shoulders', { kind: 'body_parts', parts: ['shoulders'] }],
  ['core', { kind: 'body_parts', parts: ['core'] }],
];

test('⚠ at a full gym with nothing to work around, NOTHING is refused', () => {
  // The half of the guard that matters most. A threshold that quietly starts refusing gym sessions
  // would be a far worse bug than the one it was written to fix.
  const refused = [];
  for (const [label, focus] of FOCI)
    for (const goal of ['strength', 'muscle', 'conditioning', 'weight_loss', 'mobility'])
      for (const sessionMinutes of [30, 45, 60, 75])
        for (const experience of ['beginner', 'intermediate', 'advanced']) {
          const over = { focus, goal, sessionMinutes, experience };
          if (build(over) < MIN_DAY_MOVEMENTS) refused.push(`${label}/${goal}/${sessionMinutes}/${experience}`);
        }
  assert.deepEqual(refused, [], 'the guard fired on a full-gym session with no limitations');
});

test('⚠ NOTHING is refused at a full gym any more, including the case that used to be', () => {
  /*
   * ⚠ THIS TEST INVERTED ON 2026-08-17, AND THE INVERSION IS THE POINT.
   *
   * It used to read "the only full-gym refusal is asking for the thing you said to work around", and the
   * measured case was a BEGINNER with a shoulders focus and a shoulders limitation. That refusal was
   * never about the shoulder: the same request from an intermediate built five movements and always had.
   * The beginner was refused because `difficultyRank` barred every `Intermediate`-tagged movement and
   * 590 of the catalogue's 733 records carry that tag — so the guard was firing on a starved filter and
   * reading as a coaching decision. `STRETCH_CEILING` removed the starvation; the beginner now gets the
   * same five movements the intermediate always did.
   *
   * Re-swept afterwards: 0 of 3,000 full-gym combinations fall under the floor.
   */
  const refused = [];
  for (const [label, focus] of FOCI)
    for (const experience of ['beginner', 'intermediate', 'advanced'])
      for (const limitations of [[], ['shoulders'], ['knees'], ['lower_back'], ['shoulders', 'lower_back']]) {
        const over = { focus, experience, limitations };
        if (build(over) < MIN_DAY_MOVEMENTS) refused.push(`${label}/${experience}/${limitations.join('+') || 'none'}`);
      }
  assert.deepEqual(refused, [], 'a full gym can always fill a session — refusing one is the guard misfiring');
});

test('⚠ a limitation is still told apart from the gear, in a room where it actually bites', () => {
  // The case above moved out of the full gym rather than disappearing: dumbbells alone, shoulders focus,
  // shoulders to work around. Measured — 120 of 3,000 dumbbell-only combinations, every one of them this.
  const over = {
    focus: { kind: 'body_parts', parts: ['shoulders'] },
    environment: 'home',
    ownedEquipment: ['dumbbells'],
    limitations: ['shoulders'],
  };
  assert.ok(build(over) < MIN_DAY_MOVEMENTS, 'precondition: this is the measured case');
  assert.notEqual(diagnose(over), 'unknown', 'Holt must be able to name a lever the athlete can pull');
});

test('a well-kitted home gym builds every focus a real gym does', () => {
  const owned = ['dumbbells', 'bench', 'pullup', 'bands'];
  const refused = [];
  for (const [label, focus] of FOCI) {
    if (build({ focus, environment: 'home', ownedEquipment: owned }) < MIN_DAY_MOVEMENTS) refused.push(label);
  }
  // Shoulders is the one that genuinely needs more than this; it is allowed to be refused, and Holt
  // says why. Everything else must build.
  assert.deepEqual(refused.filter((r) => r !== 'shoulders'), []);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE DIAGNOSIS IS RE-RUN, NOT INFERRED
// ─────────────────────────────────────────────────────────────────────────────

test('a complete session is never diagnosed at all', () => {
  assert.equal(whyThin(req(), build({}), POOL, canDoExercise), null);
  assert.equal(diagnose({ focus: { kind: 'split', split: 'legs' }, environment: 'bodyweight' }), null, 'legs work fine on a floor');
});

test('⚠ gear and limitation are told apart, because the fix Holt offers depends on which', () => {
  /*
   * The reason this is answered by re-running rather than by reading the request: an empty home gym AND
   * a stated limitation is a real combination, and "they picked bodyweight so it must be the gear"
   * would send that athlete to the Home Gym screen to fix something equipment cannot fix.
   */
  const shoulders = { kind: 'body_parts', parts: ['shoulders'] };
  assert.equal(diagnose({ focus: shoulders, environment: 'bodyweight' }), 'gear');
  // A full gym plus a shoulder to work around now BUILDS (see above), so the limitation-only case has to
  // be asked in a room where the limitation is what is actually biting.
  assert.equal(
    diagnose({ focus: shoulders, environment: 'home', ownedEquipment: ['dumbbells'], limitations: ['shoulders'] }),
    'both',
    'dumbbells alone AND a bad shoulder: both levers genuinely help, and saying so beats picking one',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT HE SAYS
// ─────────────────────────────────────────────────────────────────────────────

test('every refusal carries a real way out', () => {
  for (const reason of ['gear', 'limits', 'both', 'unknown']) {
    const out = thinDayFor(reason);
    assert.ok(out.text.length > 60, `${reason} is answered too thinly to be worth reading`);
    assert.ok(out.chips.length > 0, `${reason} refuses with nothing to do about it`);
    assert.doesNotMatch(out.text, /!/, 'Holt does not exclaim');
  }
});

test('only the equipment refusals offer the Home Gym, and they all do', () => {
  const opensGym = (r) => thinDayFor(r).chips.some((c) => c.goTo === '/home-gym');
  assert.ok(opensGym('gear'));
  assert.ok(opensGym('both'));
  assert.ok(!opensGym('limits'), 'equipment cannot fix a limitation — that would be a dead end with a chevron');
  assert.ok(!opensGym('unknown'));
});

test('⚠ he never offers to train through the thing you told him to avoid', () => {
  /*
   * The one offer this surface must never make. Anything medical stops flat here, and "shall we ignore
   * your shoulder for today?" is the single failure on this screen with a cost outside the app.
   */
  for (const reason of ['gear', 'limits', 'both', 'unknown']) {
    for (const chip of thinDayFor(reason).chips) {
      assert.ok(!('limitations' in chip.patch), `${reason} offers to drop a limitation: "${chip.label}"`);
      assert.doesNotMatch(chip.label, /ignore|anyway|through it|push through/i, `"${chip.label}" invites training through it`);
    }
  }
});

test('"Train something else" actually re-asks what today is for', () => {
  // `undefined` rather than a delete, because the patch is SPREAD over the constraints — a missing key
  // would leave the old focus in place and Holt would rebuild the exact session he just refused.
  const chip = thinDayFor('gear').chips.find((c) => /something else/i.test(c.label));
  assert.ok(chip, 'there is no way to pick a different focus');
  assert.ok('dayFocus' in chip.patch, 'the patch must NAME dayFocus to clear it, not simply omit it');
  assert.equal(chip.patch.dayFocus, undefined);
  assert.equal({ dayFocus: { kind: 'split', split: 'pull' }, ...chip.patch }.dayFocus, undefined, 'spreading it must clear the focus');
});
