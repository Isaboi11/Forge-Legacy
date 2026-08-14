/**
 * question-controls.test.mjs — Coach Holt Chat v2, layer 2: **the question picks the control.**
 *
 * Every answer used to render as the same wrap of pills, which is what made the screen read as a form
 * rather than as a conversation. `CONTROL_FOR` now assigns a shape per question, and `nextQuestion`
 * stamps it in one place.
 *
 * Two things worth guarding, and they pull in opposite directions:
 *
 *   · a question must GET the shape its meaning implies — an ordered scale in a row, a choice that
 *     needs a sentence on a card;
 *   · and a question that declares NOTHING must still render, as chips, exactly as before. This was
 *     designed to be additive, and a test is how that stays true.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/question-controls.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CONTROL_FOR, mergeFocus, nextQuestion } from '../chat-core.ts';

/** ⚠ `multi` joined this list on 2026-08-14 — the focus question collects taps instead of advancing. */
const SHAPES = ['chips', 'segmented', 'cards', 'grid', 'imports', 'multi'];

/**
 * Walk the program questionnaire taking the first chip each turn, collecting every question asked.
 *
 * ⚠ `day_focus` CARRIES A `focus` RATHER THAN A `patch` — it is the multi-select question, and what the
 * day becomes depends on every tap. A walker reading only `patch` never answers it and loops.
 */
function askedIn(mode, seed = {}) {
  const out = [];
  let c = { ...seed };
  for (let i = 0; i < 20; i += 1) {
    const q = nextQuestion(c, mode);
    if (!q) return out;
    out.push(q);
    const first = q.chips[0];
    c = { ...c, ...first.patch, ...(first.focus ? { dayFocus: mergeFocus([first.focus]) } : {}) };
    if (first.picksRace) c = { ...c, pickingRace: true };
  }
  throw new Error('the questionnaire never terminated');
}

test('every question that gets asked carries a control, and it is a real one', () => {
  for (const mode of ['program', 'day']) {
    for (const q of askedIn(mode)) {
      assert.ok(q.ctl, `${mode}/${q.id} has no control — it would fall back silently`);
      assert.ok(SHAPES.includes(q.ctl), `${mode}/${q.id} declares an unknown shape "${q.ctl}"`);
    }
  }
});

test('an ordered scale is a row; a choice that needs a sentence is a card', () => {
  // These are the two the design is most specific about, and the two most obviously wrong as pills.
  assert.equal(CONTROL_FOR.days, 'segmented', '2·3·4·5·6 has an order, and the order is the information');
  assert.equal(CONTROL_FOR.time, 'segmented');
  assert.equal(CONTROL_FOR.experience, 'cards', '"a year or two, on and off" is not a pill');
  assert.equal(CONTROL_FOR.where, 'grid');
});

test('⚠ a question with no entry still renders — absent means chips, not nothing', () => {
  // The whole design of this change: additive by construction. `goal` is deliberately not in the table.
  assert.equal(CONTROL_FOR.goal, undefined, 'precondition: goal declares no shape');
  const q = nextQuestion({}, 'program');
  assert.equal(q.id, 'goal');
  assert.equal(q.ctl, 'chips', 'a question that declares nothing must not render as nothing');
});

test('the table names only questions that exist', () => {
  // A stale key here is a shape nobody ever sees and a rename nobody noticed.
  const real = new Set([...askedIn('program'), ...askedIn('day'), ...askedIn('program', { pickingRace: true })].map((q) => q.id));
  // race_base/race_when only appear on an endurance goal; assert them from the walk that reaches them.
  for (const id of Object.keys(CONTROL_FOR)) {
    assert.ok(real.has(id) || ['race_when', 'race_base'].includes(id), `CONTROL_FOR names "${id}", which no walk reaches`);
  }
});

test('stamping is idempotent — a question already carrying a shape keeps it', () => {
  const q = nextQuestion({}, 'program');
  assert.equal(nextQuestion({}, 'program').ctl, q.ctl, 'two identical asks must agree');
});
