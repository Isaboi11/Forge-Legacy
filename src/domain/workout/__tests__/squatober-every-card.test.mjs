import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * EVERY SQUATOBER CARD THE PO HAS SENT (2026-09-27 → 09-28) — one sweep, with the app's REAL catalogue matcher.
 *
 * PO: "I don't know why we keep having to fix things. You should be able to encompass and easily do all of these."
 * Each new card had been checked on its own numbers only, so a card written a new way could come out subtly wrong
 * somewhere nobody asserted. These are the rules EVERY card must meet — a new card is added to this list and must
 * pass all of them before it is called working.
 */

const { readWrittenWorkout, writtenToTemplate, roundTrips, checkBeforePosting } = await import('../written-workout.ts');
const { prescribedSets, hasPrescription, maxKeyOf } = await import('../template-prescription.ts');
const { resolveExerciseName } = await import('../../exercise-picker/data.ts');
const { LB_RULES } = await import('../../program/percent-max.ts');
const W3 = await import('./fixtures/squatober-2024-week3.mjs');
const W2 = await import('./fixtures/squatober-2024-week2.mjs');
const S11 = await import('./fixtures/squatober-2025.mjs');

/* The first five 2024 cards live in written-workout.test.mjs, exactly as sent. */
const src = readFileSync(new URL('./written-workout.test.mjs', import.meta.url), 'utf8');
const S10 = Object.fromEntries(['DAY1', 'DAY2', 'DAY3', 'DAY4', 'DAY7'].map((k) => [`2024 ${k}`, new RegExp(`const ${k} = \`([^\`]*)\``).exec(src)[1]]));

const CARDS = {
  ...S10,
  ...Object.fromEntries(Object.entries(W2).map(([k, v]) => [`2024 ${k}`, v])),
  ...Object.fromEntries(Object.entries(W3).map(([k, v]) => [`2024 ${k}`, v])),
  ...Object.fromEntries(Object.entries(S11).map(([k, v]) => [`2025 ${k}`, v])),
};

/* Lifts the cards leave to the athlete — "125 reps of Triceps" — which no library entry can be. */
const OPEN = new Set(['Triceps', 'Biceps']);
const resolveKey = (n) => resolveExerciseName(n)?.key;
const LOAD = { maxes: { 'barbell-back-squat': 315, 'barbell-bench-press': 225, 'barbell-deadlift': 405 }, unit: 'lb', rules: LB_RULES };

test('the sweep covers every card sent', () => {
  assert.equal(Object.keys(CARDS).length, 19);
});

for (const [name, text] of Object.entries(CARDS)) {
  test(`${name}: reads clean, names clean, notes clean, every % has a weight, edits exactly`, () => {
    const w = readWrittenWorkout(text);
    const rows = writtenToTemplate(w, resolveKey);
    assert.deepEqual(w.unread, [], 'every line was read');
    if (/rest|relaxation|machine/i.test(w.name)) {
      assert.equal(rows.length, 0, 'a rest day has no lifts');
      return;
    }
    assert.ok(rows.length > 0, 'it has lifts');
    rows.forEach((r, i) => {
      const e = w.exercises[i];
      assert.doesNotMatch(r.name, /[/:"\d*]|\bmission\b|\boption\b/i, `name "${r.name}"`);
      if (!OPEN.has(r.name)) assert.ok(r.catalogKey, `"${r.name}" matches the exercise library`);
      assert.ok(r.sets >= 1, `"${r.name}" has sets`);
      if (r.coachNote) {
        assert.doesNotMatch(r.coachNote, /^[\s,;:*.·-]|[*·]\s*$/, `note "${r.coachNote}"`);
        assert.doesNotMatch(r.coachNote, /\b\d+\s*sets\s+of\s+\d+\s*reps\b(?!.*(?:option|discretion|as possible))/i, `"${r.name}" note repeats its own prescription: "${r.coachNote}"`);
        assert.doesNotMatch(r.coachNote, /\b\d{2,3}\s*LBS\b/i, 'no author scores');
      }
      if (hasPrescription(r) && maxKeyOf(r) && LOAD.maxes[maxKeyOf(r)]) {
        const sets = prescribedSets(r, LOAD);
        assert.ok(sets.every((s) => s.targetWeight > 0), `"${r.name}" (${e.section}) has a gray weight on every set`);
        assert.equal(sets.length, r.repScheme?.length || r.sets, `"${r.name}" sets`);
      }
    });
    const checks = checkBeforePosting(w, rows).filter((c) => ![...OPEN].some((o) => c.includes(`“${o}”`)));
    assert.deepEqual(checks, [], 'nothing for the poster to fix');
    assert.ok(roundTrips({ name: w.name, how: w.how, after: w.after, rows }, resolveKey), 'reopens for editing exactly');
  });
}
