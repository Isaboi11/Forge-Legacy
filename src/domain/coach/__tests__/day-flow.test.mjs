/**
 * day-flow.test.mjs — "what should I train today" is one session, not a one-week program.
 *
 * ══ THE BUG ══
 *
 * The day route walked the whole block questionnaire. It asked what the athlete was training FOR and how
 * many days a week they could train — neither of which has anything to do with a single session — and
 * then never asked the only question that mattered. The focus was hardcoded to `full_body`, so a PO who
 * came in wanting back and biceps was handed a full-body workout.
 *
 * ⚠ `day.ts` HAD SUPPORTED MUSCLE GROUPS THE WHOLE TIME. `BODY_PART_MUSCLES` even carries a comment
 * explaining why biceps and triceps are separate chips — "nobody trains arms, they train back and
 * biceps". The capability was built, documented, and never wired to a question.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/day-flow.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { buildDayWorkout, BODY_PART_MUSCLES } from '../day.ts';
import { nextQuestion, readyToBuild } from '../chat-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

/** Walk the day questionnaire, answering with the first chip each time. */
function walkDay(start = {}) {
  let state = { ...start };
  const asked = [];
  for (let i = 0; i < 12; i++) {
    const q = nextQuestion(state, 'day');
    if (!q) return { asked, state };
    asked.push(q.id);
    state = { ...state, ...q.chips[0].patch };
  }
  throw new Error(`the day questionnaire never finished: ${asked.join(', ')}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IT ASKS, AND WHAT IT MUST NOT
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the first thing it asks is what the session is for', () => {
  const q = nextQuestion({}, 'day');
  assert.equal(q.id, 'day_focus');
});

test('⚠ a single day never asks program questions', () => {
  const { asked } = walkDay();
  for (const irrelevant of ['goal', 'days', 'race_distance', 'race_when', 'race_base']) {
    assert.ok(!asked.includes(irrelevant), `a one-off session asked "${irrelevant}" — ${asked.join(', ')}`);
  }
});

test('it asks the things a session genuinely needs, and then stops', () => {
  const { asked, state } = walkDay();
  assert.deepEqual(asked, ['day_focus', 'time', 'where', 'experience', 'limits']);
  assert.ok(readyToBuild(state, 'day'), 'answering every question must be enough to build');
});

test('a remembered skill level is one fewer question', () => {
  // The PO's ask: answer it once, never again.
  const { asked } = walkDay({ experience: { lifting: 'advanced', running: 'advanced' } });
  assert.ok(!asked.includes('experience'), 'it asked for a skill level it had already been told');
});

test('the program flow is untouched by any of this', () => {
  assert.equal(nextQuestion({}, 'program').id, 'goal');
  assert.equal(nextQuestion({}).id, 'goal', 'program is still the default');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ THE COMPLAINT ITSELF
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ "Back & Biceps" builds a back and biceps session, not a full body one', () => {
  const chip = nextQuestion({}, 'day').chips.find((c) => /back/i.test(c.label) && /biceps/i.test(c.label));
  assert.ok(chip, 'the athlete cannot ask for back and biceps at all');
  assert.deepEqual(chip.patch.dayFocus, { kind: 'body_parts', parts: ['back', 'biceps'] });

  const { day } = buildDayWorkout(
    {
      focus: chip.patch.dayFocus,
      sessionMinutes: 60,
      experience: 'intermediate',
      environment: 'full_gym',
      ownedEquipment: [],
      limitations: [],
    },
    POOL,
    canDoExercise,
  );

  assert.ok(day.main.length > 0, 'it produced nothing');

  /* Every prescribed movement must actually train one of the muscles that were asked for. A session that
     merely AVOIDS legs is not the same as a session that trains back and biceps. */
  const wanted = new Set([...BODY_PART_MUSCLES.back, ...BODY_PART_MUSCLES.biceps]);
  const byKey = new Map(POOL.map((e) => [e.key, e]));
  for (const row of day.main) {
    const ex = byKey.get(row.catalogKey);
    assert.ok(ex, `${row.name} is not in the catalogue`);
    /* ⚠ `muscleIds`, NOT `muscles`. The catalogue carries both — ids ('lats') and display names
       ('Latissimus Dorsi') — and `BODY_PART_MUSCLES` is keyed on ids. Comparing against the display
       names failed on Barbell Bent-Over Row, which is about as back-and-biceps as a movement gets. */
    assert.ok(
      (ex.muscleIds ?? []).some((m) => wanted.has(m)),
      `${row.name} trains ${(ex.muscles ?? []).join(', ')} — none of it is back or biceps`,
    );
  }
});

test('every focus chip builds something real', () => {
  // A chip that produces an empty session is a dead end the athlete cannot recover from.
  for (const chip of nextQuestion({}, 'day').chips) {
    const { day } = buildDayWorkout(
      {
        focus: chip.patch.dayFocus,
        sessionMinutes: 45,
        experience: 'beginner',
        environment: 'full_gym',
        ownedEquipment: [],
        limitations: [],
      },
      POOL,
      canDoExercise,
    );
    assert.ok(day.main.length > 0, `"${chip.label}" builds an empty session`);
  }
});

test('the focus offers both splits and muscle pairs, because they are different questions', () => {
  // "Pull" and "Back & Biceps" are not redundant — one is a movement pattern split, the other names the
  // muscles — and an athlete thinking "back and biceps day" should not have to know we call it Pull.
  const chips = nextQuestion({}, 'day').chips;
  assert.ok(chips.some((c) => c.patch.dayFocus.kind === 'split'));
  assert.ok(chips.some((c) => c.patch.dayFocus.kind === 'body_parts'));
});
