/**
 * QA holt-19 — "What should I train?" ignored today's program session, and "A program or a week" would
 * not build a single week while a program ran.
 *
 * The offer and the chips are pure and tested directly; the two places the sheet uses them are read from
 * its source, the way `chat-sheet-stale.test.mjs` does, because the sheet has no render harness.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { programSessionOffer, SOMETHING_ELSE_TODAY, JUST_A_WEEK, fromOpener, nextQuestion } from '../chat-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const sheet = readFileSync(path.join(here, '../../../components/forge/CoachChatSheet.tsx'), 'utf8');

test('the offer names the session and the program, and carries the program to train', () => {
  const [line, chips] = programSessionOffer('p-1', 'Stronglifts 5x5', 'Workout A');
  assert.equal(line.kind, 'holt');
  assert.match(line.text, /Workout A/);
  assert.match(line.text, /Stronglifts 5x5/);
  assert.equal(chips.kind, 'chips');
  assert.deepEqual(chips.chips.map((c) => c.label), ['Train Workout A', SOMETHING_ELSE_TODAY]);
  assert.equal(chips.chips[0].trainsProgram, 'p-1');
  assert.equal(chips.chips[1].trainsProgram, undefined, 'something else builds the day, it launches nothing');
});

test('neither new chip is an opener, so each falls through to the request already under way', () => {
  assert.equal(fromOpener(SOMETHING_ELSE_TODAY), null);
  assert.equal(fromOpener(JUST_A_WEEK), null);
});

test('a single week skips the length question — the chip answers it', () => {
  assert.equal(nextQuestion({ experience: { lifting: 'intermediate', running: 'intermediate' } }, 'program')?.id, 'goal');
  const afterGoal = { experience: { lifting: 'intermediate', running: 'intermediate' }, goal: 'muscle' };
  assert.equal(nextQuestion(afterGoal, 'program')?.id, 'size', 'control: a block asks how long');
  assert.notEqual(nextQuestion({ ...afterGoal, weeks: 1 }, 'program')?.id, 'size');
});

test('the sheet: the day door offers the program session; the running-program question lets a week through', () => {
  assert.match(sheet, /opener\.mode === 'day' && \(await offerProgramSession\(\)\)\) return;/);
  assert.match(sheet, /if \(request && isOneWeek\(request\)\) return true;/);
  assert.match(sheet, /\{ label: JUST_A_WEEK, patch: \{ weeks: 1 \} \}/);
  // every caller hands the guard its request, or a typed "build me a week" would still be refused
  assert.equal((sheet.match(/guardActiveProgram\(\)/g) ?? []).length, 0);
  assert.ok((sheet.match(/guardActiveProgram\(request\)/g) ?? []).length >= 3);
  assert.match(sheet, /if \(chip\.trainsProgram\) \{[\s\S]{0,300}writeWorkoutLaunch\(\{ programId \}\)/);
});
