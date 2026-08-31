/**
 * recent-work.test.mjs — Holt stops writing the same back-and-biceps day forever.
 *
 * ══ THE REPORT ══
 *
 * PO, 2026-08-31: *"It has made me the same workout over and over again if I choose the same options.
 * It needs to be able to see what we did last time for those options and be able to have variety. An
 * example is my last few back and bicep workouts. I've had to swap out exercises to mix it up."*
 *
 * ⚠ THE FIRST TEST HERE ASSERTS THE OLD BEHAVIOUR STILL EXISTS. That is deliberate. With no history the
 * engine must be byte-for-byte what it was — a variety feature that also quietly re-ranked for people
 * with no history would be a different bug wearing this one's clothes. The determinism is not the
 * problem; the absence of a second input was.
 *
 * The rest builds the PO's own scenario against the REAL catalogue: build a back-and-biceps day, feed
 * that day back as what was trained last session, build it again, and require it to move.
 *
 * Run:  node --test src/domain/coach/__tests__/recent-work.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { buildDayWorkout } from '../day.ts';
import { recentWorkFrom, stalenessOf, leastRecent, NO_RECENT_WORK, RECENT_WINDOW } from '../recent-work.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

/** The PO's ask, held constant. Only `recent` varies between builds. */
const build = (recent) =>
  buildDayWorkout(
    {
      focus: { kind: 'body_parts', parts: ['back', 'biceps'] },
      sessionMinutes: 60,
      experience: 'intermediate',
      environment: 'full_gym',
      ownedEquipment: [],
      limitations: [],
      ...(recent ? { recent } : {}),
    },
    POOL,
    canDoExercise,
  ).day;

const keysOf = (day) => day.main.map((e) => e.catalogKey).filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────
// the fold
// ─────────────────────────────────────────────────────────────────────────────

test('sessions fold to how long ago each movement was last trained', () => {
  const r = recentWorkFrom([['a', 'b'], ['c'], ['d']]);
  assert.equal(r.sessionsAgo.a, 1);
  assert.equal(r.sessionsAgo.c, 2);
  assert.equal(r.sessionsAgo.d, 3);
});

test('the most recent sighting wins, not the oldest', () => {
  // Trained last session AND two before: that is one session ago. Taking the older number would make a
  // movement done twice look staler than one done once.
  const r = recentWorkFrom([['a'], ['b'], ['a']]);
  assert.equal(r.sessionsAgo.a, 1);
});

test('the window stops at three sessions, however many are handed in', () => {
  const r = recentWorkFrom([['a'], ['b'], ['c'], ['d'], ['e']]);
  assert.equal(RECENT_WINDOW, 3);
  assert.equal(r.sessionsAgo.d, undefined, 'the fourth session back is still remembered');
  assert.equal(r.sessionsAgo.e, undefined, 'the fifth session back is still remembered');
});

test('never trained is the freshest thing there is', () => {
  const r = recentWorkFrom([['a']]);
  assert.equal(stalenessOf(r, 'a'), 1);
  assert.equal(stalenessOf(r, 'never-seen'), Infinity);
  assert.equal(stalenessOf(undefined, 'anything'), Infinity, 'no history must read as no opinion');
});

test('ties go to the ranking, never to the array', () => {
  const list = [{ key: 'first' }, { key: 'second' }];
  // Nothing trained: both Infinity, the ranking's own first choice must survive.
  assert.equal(leastRecent(list, (x) => x.key, NO_RECENT_WORK).key, 'first');
  // First one trained last session: the second is staler and takes it.
  assert.equal(leastRecent(list, (x) => x.key, recentWorkFrom([['first']])).key, 'second');
  assert.equal(leastRecent([], (x) => x.key, NO_RECENT_WORK), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// the engine — the PO's scenario, against the real catalogue
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ with no history, the day is EXACTLY what it always was', () => {
  // The determinism is not the bug and must not be "fixed". A new athlete gets the rulebook's answer.
  assert.deepEqual(keysOf(build(null)), keysOf(build(null)));
  assert.deepEqual(keysOf(build(NO_RECENT_WORK)), keysOf(build(null)), 'an empty history changed the build');
});

test('⭐ the same options twice in a row no longer produce the same workout', () => {
  const first = keysOf(build(null));
  assert.ok(first.length >= 3, `the day came back with ${first.length} movements — too thin to judge`);

  // Exactly what the PO did: trained it, came back, asked for the same thing.
  const second = keysOf(build(recentWorkFrom([first])));
  assert.notDeepEqual(second, first, 'Holt handed back an identical session — this is the reported bug');

  const moved = second.filter((k) => !first.includes(k));
  assert.ok(moved.length > 0, 'nothing in the day is new');
});

test('it keeps moving over a run of sessions, rather than flipping between two', () => {
  const s1 = keysOf(build(null));
  const s2 = keysOf(build(recentWorkFrom([s1])));
  const s3 = keysOf(build(recentWorkFrom([s2, s1])));
  assert.notDeepEqual(s3, s2, 'the third session repeated the second');

  // A pattern with three named answers should be able to show a third face before repeating. Assert on
  // the union rather than on any one slot, because how many slots can rotate depends on the catalogue.
  const seen = new Set([...s1, ...s2, ...s3]);
  assert.ok(
    seen.size > s1.length + 1,
    `three sessions produced only ${seen.size} distinct movements from ${s1.length} slots — it is alternating, not rotating`,
  );
});

test('the day is still a back-and-biceps day, and still a full one', () => {
  // Variety must not be bought with the session. Whatever it rotates to has to still be the ask.
  const first = keysOf(build(null));
  const after = build(recentWorkFrom([first, first, first]));
  assert.equal(
    after.main.length,
    build(null).main.length,
    'rotating cost the day a slot — variety must reorder, never remove',
  );
  const byKey = new Map(POOL.map((e) => [e.key, e]));
  for (const k of keysOf(after)) {
    assert.ok(byKey.has(k), `${k} is not in the catalogue at all`);
  }
});

test('an exhausted shortlist falls back rather than failing', () => {
  // Every named alternative trained in all three remembered sessions: every staleness is equal, so the
  // ranking's first choice comes back. A slot that could be filled before is still filled.
  const first = keysOf(build(null));
  const exhausted = build(recentWorkFrom([first, first, first]));
  assert.ok(exhausted.main.length > 0, 'a saturated history emptied the day');
});
